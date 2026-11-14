import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { readCodexPet } from './codex-packs';
import type { PetActionKey, PetPackAsset, PetPack, ImportPackInput } from './shared';
export type { ImportPackInput } from './shared';

const VIDEO_EXTS = new Set(['.webm', '.mp4', '.mov', '.m4v']);
const IMAGE_EXTS = new Set(['.gif', '.png', '.webp', '.apng', '.jpg', '.jpeg']);

export class PetPackStore {
  private packsDir: string;

  constructor(userDataDir: string) {
    this.packsDir = path.join(userDataDir, 'pet-packs');
    fs.mkdirSync(this.packsDir, { recursive: true });
  }

  getPacksDir(): string {
    return this.packsDir;
  }

  listPacks(): PetPack[] {
    if (!fs.existsSync(this.packsDir)) return [];
    const entries = fs.readdirSync(this.packsDir, { withFileTypes: true });
    const packs: PetPack[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(this.packsDir, entry.name, 'pack.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PetPack;
        packs.push(raw);
      } catch {
        // skip corrupted pack
      }
    }
    packs.sort((a, b) => b.createdAt - a.createdAt);
    return packs;
  }

  importPack(input: ImportPackInput): PetPack {
    if (!input || typeof input.name !== 'string' || !input.files || typeof input.files !== 'object') throw new Error('形象包信息不完整');
    const allowed = new Set(['idle', 'playing', 'chorus', 'tap', 'drag', 'sleep', 'happy', 'walk']);
    const id = 'pack_' + crypto.randomBytes(6).toString('hex');
    const dir = path.join(this.packsDir, id);
    fs.mkdirSync(dir, { recursive: true });

    const assets: Partial<Record<PetActionKey, PetPackAsset>> = {};
    const entries = Object.entries(input.files) as Array<[PetActionKey, string | undefined]>;

    for (const [action, srcPath] of entries) {
      if (!allowed.has(action) || typeof srcPath !== 'string' || !srcPath || !fs.existsSync(srcPath)) continue;
      const ext = path.extname(srcPath).toLowerCase();
      const kind: 'video' | 'image' | null = VIDEO_EXTS.has(ext) ? 'video' : IMAGE_EXTS.has(ext) ? 'image' : null;
      if (!kind) continue;

      const destName = `${action}${ext}`;
      const destPath = path.join(dir, destName);
      fs.copyFileSync(srcPath, destPath);
      assets[action] = {
        url: `petpack://${id}/${destName}`,
        kind,
        fileName: path.basename(srcPath),
      };
    }

    if (Object.keys(assets).length === 0) {
      fs.rmSync(dir, { recursive: true, force: true });
      throw new Error('没有找到支持的素材文件（支持 WebM / MP4 / GIF / PNG / WebP）');
    }

    const pack: PetPack = {
      id,
      name: input.name.trim().slice(0, 40) || '自定义桌宠',
      createdAt: Date.now(),
      assets,
      corpus: input.corpus?.filter((s) => s.trim().length > 0),
    };

    fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify(pack, null, 2), 'utf-8');
    return pack;
  }

  importCodexPet(file: string): PetPack {
    const input = readCodexPet(file);
    const id = 'pack_' + crypto.randomBytes(6).toString('hex');
    const dir = path.join(this.packsDir, id);
    fs.mkdirSync(dir, { recursive: true });
    const imageName = `spritesheet${input.imageExt}`;
    fs.writeFileSync(path.join(dir, imageName), input.image);
    fs.writeFileSync(path.join(dir, 'original-pet.json'), input.manifest, 'utf8');
    input.notices.forEach((notice, i) => fs.writeFileSync(path.join(dir, `source-${i}-${notice.name}`), notice.content));
    const pack: PetPack = { id, name: input.name, description: input.description, createdAt: Date.now(), assets: {},
      spritesheet: { url: `petpack://${id}/${imageName}`, version: input.version } };
    fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify(pack, null, 2), 'utf8');
    return pack;
  }

  deletePack(id: string): boolean {
    if (!/^pack_[a-f0-9]+$/i.test(id)) return false;
    const dir = path.join(this.packsDir, id);
    if (!fs.existsSync(dir)) return false;
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  }

  resolveAssetFile(packId: string, fileName: string): string | null {
    if (!/^pack_[a-f0-9]+$/i.test(packId)) return null;
    const safeFile = path.basename(fileName);
    const full = path.join(this.packsDir, packId, safeFile);
    if (!fs.existsSync(full)) return null;
    return full;
  }
}
