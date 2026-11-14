import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

const MAX_ARCHIVE = 32 * 1024 * 1024;
const MAX_IMAGE = 24 * 1024 * 1024;
export interface CodexPetInput {
  name: string; description: string; version: 1 | 2; image: Uint8Array;
  imageExt: '.png' | '.webp'; manifest: string; notices: { name: string; content: Uint8Array }[];
}
function dimensions(bytes: Uint8Array) {
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (data.length >= 33 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && data.toString('ascii', 12, 16) === 'IHDR') return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), ext: '.png' as const };
  if (data.length >= 30 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    const type = data.toString('ascii', 12, 16);
    if (type === 'VP8X') return { width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3), ext: '.webp' as const };
    if (type === 'VP8L' && data[20] === 0x2f) {
      const bits = data.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, ext: '.webp' as const };
    }
    if (type === 'VP8 ' && data[23] === 0x9d && data[24] === 0x01 && data[25] === 0x2a) return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff, ext: '.webp' as const };
  }
  throw new Error('图集需要是可读取的 PNG 或 WebP 图片。');
}
function parseManifest(text: string) {
  if (Buffer.byteLength(text) > 64 * 1024) throw new Error('pet.json 太大了，请选择原始宠物包。');
  let raw;
  try { raw = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('pet.json 不是有效的 JSON 文件。'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('宠物信息不完整。');
  const sprite = raw.spritesheetPath;
  if (typeof sprite !== 'string' || !sprite || sprite.includes('\\') || sprite.includes('\0') || path.posix.isAbsolute(sprite) || sprite.includes(':') || sprite.split('/').includes('..')) throw new Error('图集路径必须位于宠物包内。');
  const version = raw.spriteVersionNumber ?? 1;
  if (version !== 1 && version !== 2) throw new Error('目前支持 Codex Pets V1 和 V2 素材。');
  const name = typeof raw.displayName === 'string' ? raw.displayName.trim().slice(0, 40) : '';
  return { name: name || '新来的小伙伴', description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 300) : '', sprite, version: version as 1 | 2 };
}
export function readCodexPet(file: string): CodexPetInput {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > MAX_ARCHIVE) throw new Error('请选择小于 32 MB 的 ZIP 或 pet.json 文件。');
  let manifest = '';
  let image: Uint8Array;
  const notices: CodexPetInput['notices'] = [];
  if (path.extname(file).toLowerCase() === '.zip') {
    let expanded = 0;
    let entries = 0;
    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(fs.readFileSync(file), { filter(entry) {
        entries++;
        if (entries > 150 || entry.name.includes('\\') || entry.name.includes(':') || entry.name.includes('\0') || path.posix.isAbsolute(entry.name) || entry.name.split('/').includes('..')) throw new Error('包内路径不安全。');
        const wanted = /(?:pet\.json|\.(?:png|webp|md|txt)|(?:^|\/)LICENSE)$/i.test(entry.name);
        if (wanted) {
          expanded += entry.originalSize;
          if (entry.originalSize > MAX_IMAGE || expanded > 40 * 1024 * 1024) throw new Error('解压后的素材太大了。');
        }
        return wanted;
      } });
    } catch { throw new Error('ZIP 无法读取，或包内文件超出大小／路径限制。'); }
    const manifests = Object.keys(files).filter(name => path.posix.basename(name) === 'pet.json');
    if (manifests.length !== 1) throw new Error('请一次选择一个包含 pet.json 的宠物包。');
    manifest = Buffer.from(files[manifests[0]]).toString('utf8');
    const parsed = parseManifest(manifest);
    const target = path.posix.join(path.posix.dirname(manifests[0]), parsed.sprite);
    image = files[target];
    if (!image) throw new Error('包内找不到 pet.json 指定的图集。');
    for (const [name, content] of Object.entries(files)) {
      if (/(?:\.md|\.txt|(?:^|\/)LICENSE)$/i.test(name) && content.length <= 128 * 1024 && notices.length < 12) notices.push({ name: path.posix.basename(name), content });
    }
  } else if (path.extname(file).toLowerCase() === '.json') {
    if (stat.size > 64 * 1024) throw new Error('pet.json 太大了。');
    manifest = fs.readFileSync(file, 'utf8');
    const parsed = parseManifest(manifest);
    const folder = fs.realpathSync(path.dirname(file));
    let target;
    try { target = fs.realpathSync(path.resolve(folder, parsed.sprite)); } catch { throw new Error('找不到图集。请先解压整个宠物包，再选择 pet.json。'); }
    if (!target.toLowerCase().startsWith((folder + path.sep).toLowerCase())) throw new Error('图集必须与 pet.json 位于同一个宠物文件夹内。');
    const imageStat = fs.statSync(target);
    if (!imageStat.isFile() || imageStat.size > MAX_IMAGE) throw new Error('图集需要小于 24 MB。');
    image = fs.readFileSync(target);
    for (const name of ['LICENSE', 'LICENSE.txt', 'README.md', 'THIRD_PARTY_NOTICES.md']) {
      const notice = path.join(folder, name);
      if (fs.existsSync(notice) && fs.statSync(notice).size < 128 * 1024) notices.push({ name, content: fs.readFileSync(notice) });
    }
  } else throw new Error('请选择 ZIP 压缩包或 pet.json 文件。');
  const parsed = parseManifest(manifest);
  const size = dimensions(image);
  const height = parsed.version === 2 ? 2288 : 1872;
  if (size.width !== 1536 || size.height !== height) throw new Error(`V${parsed.version} 图集应为 1536×${height}，这个文件是 ${size.width}×${size.height}。`);
  return { name: parsed.name, description: parsed.description, version: parsed.version, image, imageExt: size.ext, manifest, notices };
}
