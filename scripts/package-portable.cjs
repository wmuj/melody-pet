const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const electronDist = path.join(rootDir, 'node_modules', 'electron', 'dist');
const outDir = path.join(rootDir, 'release', '泡泡桌面伙伴-Portable');
const appDir = path.join(outDir, 'resources', 'app');

console.log('📦 正在封装「泡泡桌面伙伴」免安装独立运行版...');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// 1. Copy Electron runtime
fs.cpSync(electronDist, outDir, { recursive: true });
const oldExe = path.join(outDir, 'electron.exe');
const newExe = path.join(outDir, '泡泡桌面伙伴.exe');
if (fs.existsSync(oldExe)) {
  fs.renameSync(oldExe, newExe);
}

// Remove default_app.asar if present
const defaultAsar = path.join(outDir, 'resources', 'default_app.asar');
if (fs.existsSync(defaultAsar)) {
  fs.rmSync(defaultAsar, { force: true });
}

// 2. Populate resources/app
fs.mkdirSync(appDir, { recursive: true });
for (const folder of ['dist', 'dist-electron', 'native', 'references']) {
  const src = path.join(rootDir, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(appDir, folder), { recursive: true });
  }
}

// Copy runtime dependency fflate
const fflateSrc = path.join(rootDir, 'node_modules', 'fflate');
if (fs.existsSync(fflateSrc)) {
  fs.cpSync(fflateSrc, path.join(appDir, 'node_modules', 'fflate'), { recursive: true });
}

// Write clean production package.json
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  main: pkg.main,
};
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(prodPkg, null, 2), 'utf8');

console.log(`✅ 免安装便携版已生成：${newExe}`);
