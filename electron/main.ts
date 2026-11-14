import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  protocol,
  screen,
  session,
  shell,
  Tray,
} from 'electron';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import zlib from 'zlib';
import { pathToFileURL } from 'url';
import { fetchSyncedLyrics } from './lyrics';
import { ImportPackInput, PetPackStore } from './packs';
import { DEFAULT_SETTINGS, STAGE_SIZE as SIZE_MAP, sanitizeSettings } from './shared';
import type { PetSettings, PetBounds, PetCommand, PetInteraction, SmtcState, PetTouchZone, PetResponse } from './shared';
import { RoamingController } from './roaming';
import { SpeechService } from './speech';
import { CompanionStore } from './companion';
import { DialogueDeck, dialogueMascot } from './dialogue';

// QA uses a separate profile so tests never overwrite a person's pet or imported assets.
const isolatedData = process.env.MELODY_PET_DATA_DIR || process.argv.find(arg => arg.startsWith('--pet-data-dir='))?.slice('--pet-data-dir='.length);
if (isolatedData && path.isAbsolute(isolatedData)) app.setPath('userData', isolatedData);
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'petpack',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

let petWin: BrowserWindow | null = null;
let settingsWin: BrowserWindow | null = null;
let tray: Tray | null = null;
let smtcProc: ChildProcessWithoutNullStreams | null = null;
let packStore: PetPackStore;
let companion: CompanionStore;
const dialogue = new DialogueDeck();
let petSleeping = false;
let motionWasMoving = false;
let settings: PetSettings = { ...DEFAULT_SETTINGS };
let settingsFile = '';
let lastFullscreenHidden = false;
let manualHidden = false;
let currentSnapEdge = 'none';
let inertiaTimer: NodeJS.Timeout | null = null;
let settleInertia: ((value: PetBounds | null) => void) | null = null;
let roaming: RoamingController | null = null;
let cursorTimer: NodeJS.Timeout | null = null;
let currentSmtc: SmtcState = { event: 'state' };
let quitting = false;
let bridgeRestartTimer: NodeJS.Timeout | null = null;
const speech = new SpeechService((state) => {
  roaming?.pause('speaking', state.status === 'speaking');
  broadcast('speech:changed', state);
});

function broadcast(channel: string, payload: unknown) {
  for (const win of [petWin, settingsWin]) {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

function stopInertia() {
  if (inertiaTimer) clearInterval(inertiaTimer);
  inertiaTimer = null;
  settleInertia?.(null);
  settleInertia = null;
  roaming?.pause('inertia', false);
}

function movePet(x: number, y: number) {
  if (!petWin || petWin.isDestroyed()) return;
  const dim = SIZE_MAP[settings.size];
  // setPosition reuses rounded native sizes and grows a non-resizable window at 150% DPI.
  petWin.setBounds({ x: Math.round(x), y: Math.round(y), width: dim.w, height: dim.h });
}

function syncPetVisibility() {
  if (!petWin || petWin.isDestroyed()) return;
  lastFullscreenHidden = Boolean(settings.hideInFullscreen && currentSmtc.fullscreen);
  const hidden = manualHidden || lastFullscreenHidden;
  roaming?.pause('hidden', hidden);
  if (hidden && petWin.isVisible()) { petWin.hide(); speech.stop(); }
  else if (!hidden && !petWin.isVisible()) petWin.showInactive();
}

function showPet() {
  manualHidden = false;
  if (petWin && !petWin.isDestroyed()) {
    const b = petWin.getBounds();
    const safe = clampAndSnapBounds(b.x, b.y, b.width, b.height, false);
    movePet(safe.x, safe.y);
    broadcastBounds();
  }
  syncPetVisibility();
}

function petAction(action: PetCommand) {
  if (!['tap', 'feed', 'talk', 'run', 'sleep', 'wake'].includes(action)) return;
  if (action === 'sleep') { petSleeping = true; stopInertia(); roaming?.pause('sleep', true); speech.stop(); }
  if (action !== 'sleep') roaming?.pause('sleep', false);
  if (action === 'run') speech.stop();
  broadcast('pet:menuAction', action);
  if (action === 'run') { showPet(); roaming?.runNow(); }
}

function getAppUrl(hash = ''): string {
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
    // Prefer built dist if Vite dev server isn't used
    const distHtml = path.join(__dirname, '..', 'dist', 'index.html');
    if (process.env.VITE_DEV_SERVER_URL) {
      return hash ? `${devUrl}#${hash}` : devUrl;
    }
    if (fs.existsSync(distHtml)) {
      return `${pathToFileURL(distHtml).href}${hash ? `#${hash}` : ''}`;
    }
    return hash ? `${devUrl}#${hash}` : devUrl;
  }
  const distHtml = path.join(__dirname, '..', 'dist', 'index.html');
  return `${pathToFileURL(distHtml).href}${hash ? `#${hash}` : ''}`;
}

function loadSettings(): PetSettings {
  settingsFile = path.join(app.getPath('userData'), 'melody-pet-settings.json');
  try {
    if (fs.existsSync(settingsFile)) {
      const parsed = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      if (!parsed.version || parsed.version < 2) {
        const backup = settingsFile + '.v1-backup';
        if (!fs.existsSync(backup)) fs.copyFileSync(settingsFile, backup);
        if (!parsed.activePackId || parsed.activePackId === 'builtin') parsed.theme = 'whale';
      }
      if (!parsed.version || parsed.version < 3) {
        const backup = settingsFile + '.v2-backup';
        if (!fs.existsSync(backup)) fs.copyFileSync(settingsFile, backup);
        if ((!parsed.activePackId || parsed.activePackId === 'builtin') && (!parsed.theme || parsed.theme === 'whale')) parsed.theme = 'whalegirl';
      }
      return sanitizeSettings(parsed);
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

function persistSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
    const pending = settingsFile + '.tmp';
    fs.writeFileSync(pending, JSON.stringify(settings, null, 2), 'utf-8');
    fs.renameSync(pending, settingsFile);
  } catch {
    // ignore
  }
}

function broadcastSettings() {
  broadcast('settings:changed', settings);
}

function broadcastBounds() {
  if (!petWin || petWin.isDestroyed()) return;
  const b = petWin.getBounds();
  petWin.webContents.send('pet:bounds', { ...b, snapEdge: currentSnapEdge });
}

function clampAndSnapBounds(x: number, y: number, width: number, height: number, snap: boolean): { x: number; y: number; snapEdge: string } {
  const centerPt = { x: Math.round(x + width / 2), y: Math.round(y + height / 2) };
  const display = screen.getDisplayNearestPoint(centerPt);
  const wa = display.workArea;

  // Keep the bubble and controls on-screen, including after a monitor is unplugged.
  const minX = wa.x;
  const maxX = Math.max(minX, wa.x + wa.width - width);
  const minY = wa.y;
  const maxY = Math.max(minY, wa.y + wa.height - height);

  let nx = Math.max(minX, Math.min(maxX, Math.round(x)));
  let ny = Math.max(minY, Math.min(maxY, Math.round(y)));
  let snapEdge = 'none';

  if (snap) {
    const snapDist = 26;
    if (Math.abs(nx - wa.x) <= snapDist) {
      nx = minX;
      snapEdge = 'left';
    } else if (Math.abs(nx + width - (wa.x + wa.width)) <= snapDist) {
      nx = maxX;
      snapEdge = 'right';
    }
    if (Math.abs(ny + height - (wa.y + wa.height)) <= snapDist) {
      ny = maxY;
      snapEdge = snapEdge === 'none' ? 'bottom' : snapEdge;
    } else if (Math.abs(ny - wa.y) <= snapDist) {
      ny = minY;
      snapEdge = snapEdge === 'none' ? 'top' : snapEdge;
    }
  }

  return { x: nx, y: ny, snapEdge };
}

function createTrayIcon(): Electron.NativeImage {
  const supplied = nativeImage.createFromPath(path.join(app.getAppPath(), 'native', 'whale-girl-icon.png'));
  if (!supplied.isEmpty()) return supplied.resize({ width: 32, height: 32 });
  // Generate a small blue whale PNG so the tray matches the desktop companion.
  const size = 32;
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = (x - 12.5) / 11.5;
      const dy = (y - 17.5) / 10.5;
      const inHead = dx * dx + dy * dy <= 1.0;
      const inTail = (x >= 21 && x <= 28 && y >= 18 && y <= 23 && y >= 39 - x)
        || (Math.pow((x - 27) / 3.2, 2) + Math.pow((y - 15) / 5, 2) <= 1)
        || (Math.pow((x - 29) / 3, 2) + Math.pow((y - 19) / 2.8, 2) <= 1);
      const spout = (x >= 11 && x <= 13 && y >= 3 && y <= 9) || (x >= 8 && x <= 15 && y === 3);
      const isEye = ((x - 8) * (x - 8) + (y - 16) * (y - 16) <= 1.4) || ((x - 16) * (x - 16) + (y - 16) * (y - 16) <= 1.4);

      if (inHead || inTail || spout) {
        if (isEye) {
          raw[idx] = 28;
          raw[idx + 1] = 32;
          raw[idx + 2] = 48;
          raw[idx + 3] = 255;
        } else {
          const belly = inHead && y > 21 + Math.sin(x / 5) * 1.5;
          const t = Math.min(1, y / 31);
          raw[idx] = belly ? 231 : Math.round(151 - t * 68);
          raw[idx + 1] = belly ? 243 : Math.round(207 - t * 49);
          raw[idx + 2] = belly ? 255 : 246;
          raw[idx + 3] = 255;
        }
      } else {
        raw[idx + 3] = 0;
      }
    }
  }

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([t, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcBuf), 0);
    return Buffer.concat([len, t, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return nativeImage.createFromBuffer(png);
}

function createPetWindow() {
  const dim = SIZE_MAP[settings.size] || SIZE_MAP.medium;
  const primary = screen.getPrimaryDisplay().workArea;
  const startX = typeof settings.x === 'number' ? settings.x : primary.x + primary.width - dim.w - 30;
  const startY = typeof settings.y === 'number' ? settings.y : primary.y + primary.height - dim.h - 20;
  const clamped = clampAndSnapBounds(startX, startY, dim.w, dim.h, settings.snapToEdge);
  currentSnapEdge = clamped.snapEdge;

  petWin = new BrowserWindow({
    width: dim.w,
    height: dim.h,
    x: clamped.x,
    y: clamped.y,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    alwaysOnTop: settings.topmost,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  if (settings.topmost) {
    petWin.setAlwaysOnTop(true, 'screen-saver');
  }
  petWin.setIgnoreMouseEvents(true, { forward: true });

  petWin.loadURL(getAppUrl('pet'));
  petWin.once('ready-to-show', () => { movePet(clamped.x, clamped.y); syncPetVisibility(); broadcastBounds(); });
  petWin.webContents.on('did-finish-load', () => broadcastBounds());
  roaming = new RoamingController(petWin, () => settings,
    state => {
      if (state.moving && !motionWasMoving && state.pace === 'run') {
        try { broadcast('companion:changed', companion.record('run')); } catch { console.warn('[MelodyPet] Could not save run memory'); }
      }
      motionWasMoving = state.moving;
      broadcast('pet:motion', state);
    }, () => { currentSnapEdge = 'none'; broadcastBounds(); });
  cursorTimer = setInterval(() => {
    if (petWin && !petWin.isDestroyed() && petWin.isVisible()) {
      petWin.webContents.send('pet:cursor', screen.getCursorScreenPoint());
    }
  }, 50);

  petWin.on('closed', () => {
    roaming?.dispose();
    roaming = null;
    if (cursorTimer) clearInterval(cursorTimer);
    petWin = null;
  });
}

function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }

  settingsWin = new BrowserWindow({
    width: 1000,
    height: 760,
    minWidth: 820,
    minHeight: 640,
    title: '泡泡的小屋 · 桌面伙伴',
    autoHideMenuBar: true,
    backgroundColor: '#f3f7fd',
    icon: createTrayIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWin.loadURL(getAppUrl('settings'));
  settingsWin.on('closed', () => {
    settingsWin = null;
  });
}

function startSmtcBridge() {
  const candidates = [
    path.join(app.getAppPath(), 'native', 'bin', 'smtc-bridge.exe'),
    path.join(__dirname, '..', 'native', 'bin', 'smtc-bridge.exe'),
    path.join(process.resourcesPath || '', 'native', 'bin', 'smtc-bridge.exe'),
  ];
  const exePath = candidates.find((p) => p && fs.existsSync(p));
  if (!exePath) {
    console.warn('[MelodyPet] smtc-bridge.exe not found');
    return;
  }

  smtcProc = spawn(exePath, [String(process.pid)], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  smtcProc.stderr.resume();
  smtcProc.stdin.on('error', () => {});
  smtcProc.on('error', (err) => console.warn('[MelodyPet] media bridge:', err.message));

  const rl = readline.createInterface({ input: smtcProc.stdout });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line.replace(/^\uFEFF/, ''));
      if (msg.event === 'state') {
        const cursor = screen.getCursorScreenPoint();
        currentSmtc = { ...msg, cursorX: cursor.x, cursorY: cursor.y };
        syncPetVisibility();
        try {
          const memory = companion.observeMedia(currentSmtc, !petSleeping && !manualHidden && !lastFullscreenHidden);
          if (memory) broadcast('companion:changed', memory);
        } catch { console.warn('[MelodyPet] Could not save listening memory'); }
        broadcast('smtc:state', currentSmtc);
      }
    } catch {
      // ignore parse glitches
    }
  });

  smtcProc.on('exit', () => {
    smtcProc = null;
    if (!quitting) bridgeRestartTimer = setTimeout(startSmtcBridge, 4000);
  });
}

function sendSmtcCommand(cmd: string, appId?: string) {
  if (!smtcProc || smtcProc.killed || !smtcProc.stdin.writable) return;
  try {
    smtcProc.stdin.write(JSON.stringify({ cmd, appId }) + '\n');
  } catch {
    // ignore
  }
}

function showPetContextMenu() {
  if (!petWin) return;
  roaming?.pause('menu', true);
  const menu = Menu.buildFromTemplate([
    { label: `${settings.petName} · 桌面伙伴`, enabled: false },
    { label: '说句话', click: () => petAction('talk') },
    { label: '跑一圈', click: () => petAction('run') },
    { label: '摸摸头', click: () => petAction('tap') },
    { label: '喂小鱼干', click: () => petAction('feed') },
    { label: '睡个小觉', click: () => petAction('sleep') },
    { label: '起床啦', click: () => petAction('wake') },
    { type: 'separator' },
    { label: '🎵 唤起音乐播放器', click: () => petWin?.webContents.send('pet:menuAction', 'activateApp') },
    { type: 'separator' },
    {
      label: '泡泡的小屋 · 设置与换装',
      click: () => openSettingsWindow(),
    },
    {
      label: '📏 宠物大小',
      submenu: [
        {
          label: '小号 (精致)',
          type: 'radio',
          checked: settings.size === 'small',
          click: () => applySettingsPatch({ size: 'small' }),
        },
        {
          label: '中号 (默认)',
          type: 'radio',
          checked: settings.size === 'medium',
          click: () => applySettingsPatch({ size: 'medium' }),
        },
        {
          label: '大号',
          type: 'radio',
          checked: settings.size === 'large',
          click: () => applySettingsPatch({ size: 'large' }),
        },
      ],
    },
    {
      label: '🎭 切换内置主题',
      submenu: [
        { label: '大肥鱼 · 蓝发鲸娘', type: 'radio',
          checked: settings.activePackId === 'builtin' && settings.theme === 'whalegirl',
          click: () => applySettingsPatch({ activePackId: 'builtin', theme: 'whalegirl' }) },
        { label: '灵码 · 奶白小狐狸', type: 'radio',
          checked: settings.activePackId === 'builtin' && settings.theme === 'lingma',
          click: () => applySettingsPatch({ activePackId: 'builtin', theme: 'lingma' }) },
        { label: '泡泡 · 蓝色小鲸鱼', type: 'radio',
          checked: settings.activePackId === 'builtin' && settings.theme === 'whale',
          click: () => applySettingsPatch({ activePackId: 'builtin', theme: 'whale' }) },
        {
          label: '奶白黑耳·音律猫娘',
          type: 'radio',
          checked: settings.activePackId === 'builtin' && settings.theme === 'nyan',
          click: () => applySettingsPatch({ activePackId: 'builtin', theme: 'nyan' }),
        },
        {
          label: '赛博霓虹·电音喵',
          type: 'radio',
          checked: settings.activePackId === 'builtin' && settings.theme === 'cyber',
          click: () => applySettingsPatch({ activePackId: 'builtin', theme: 'cyber' }),
        },
        {
          label: '樱粉麻薯·软萌团子',
          type: 'radio',
          checked: settings.activePackId === 'builtin' && settings.theme === 'mochi',
          click: () => applySettingsPatch({ activePackId: 'builtin', theme: 'mochi' }),
        },
      ],
    },
    ...(packStore && packStore.listPacks().length > 0 ? [{
      label: `🐾 切换 Codex 萌宠 (${packStore.listPacks().length} 款)`,
      submenu: packStore.listPacks().map(pack => ({
        label: pack.name,
        type: 'radio' as const,
        checked: settings.activePackId === pack.id,
        click: () => applySettingsPatch({ activePackId: pack.id }),
      })),
    }] : []),
    { type: 'separator' },
    { label: '中文出声', type: 'checkbox', checked: settings.voiceEnabled,
      click: item => applySettingsPatch({ voiceEnabled: item.checked }) },
    { label: '自由散步', type: 'checkbox', checked: settings.roamEnabled,
      click: item => applySettingsPatch({ roamEnabled: item.checked }) },
    {
      label: '显示歌词气泡',
      type: 'checkbox',
      checked: settings.showLyrics,
      click: (item) => applySettingsPatch({ showLyrics: item.checked }),
    },
    {
      label: '音频实时踩点律动',
      type: 'checkbox',
      checked: settings.audioReactive,
      click: (item) => applySettingsPatch({ audioReactive: item.checked }),
    },
    {
      label: '主动冒泡聊天',
      type: 'checkbox',
      checked: settings.autoGreet,
      click: (item) => applySettingsPatch({ autoGreet: item.checked }),
    },
    {
      label: '窗口置顶',
      type: 'checkbox',
      checked: settings.topmost,
      click: (item) => applySettingsPatch({ topmost: item.checked }),
    },
    {
      label: '全屏自动隐藏',
      type: 'checkbox',
      checked: settings.hideInFullscreen,
      click: (item) => applySettingsPatch({ hideInFullscreen: item.checked }),
    },
    {
      label: '开机自动陪伴',
      type: 'checkbox',
      checked: Boolean(settings.autoStart),
      click: (item) => applySettingsPatch({ autoStart: item.checked }),
    },
    {
      label: '启用老板键 (Alt+Q)',
      type: 'checkbox',
      checked: settings.bossKeyEnabled !== false,
      click: (item) => applySettingsPatch({ bossKeyEnabled: item.checked }),
    },
    { type: 'separator' },
    {
      label: '隐藏桌宠 (Alt+Q 或托盘恢复)',
      click: () => {
        manualHidden = true;
        syncPetVisibility();
      },
    },
    {
      label: '退出音律桌宠',
      click: () => app.quit(),
    },
  ]);

  menu.popup({ window: petWin, callback: () => roaming?.pause('menu', false) });
}

function syncSystemIntegrations() {
  if (isolatedData) return;
  try {
    app.setLoginItemSettings({ openAtLogin: Boolean(settings.autoStart) });
  } catch {
    // ignore in unsupported environments
  }
  try {
    globalShortcut.unregister('Alt+Q');
    if (settings.bossKeyEnabled !== false) {
      globalShortcut.register('Alt+Q', () => {
        if (manualHidden) showPet();
        else {
          manualHidden = true;
          syncPetVisibility();
        }
      });
    }
  } catch {
    // ignore shortcut conflict
  }
}

function applySettingsPatch(patch: Partial<PetSettings>): PetSettings {
  if (!patch || typeof patch !== 'object') return settings;
  const prevSize = settings.size;
  settings = sanitizeSettings(patch, settings);
  if (patch.roamEnabled !== undefined || patch.roamSpeed !== undefined) roaming?.settingsChanged();
  if (patch.voiceEnabled === false || patch.voiceVolume === 0) speech.stop();
  if (patch.autoStart !== undefined || patch.bossKeyEnabled !== undefined) syncSystemIntegrations();
  persistSettings();

  if (petWin && !petWin.isDestroyed()) {
    if (patch.topmost !== undefined) {
      petWin.setAlwaysOnTop(settings.topmost, settings.topmost ? 'screen-saver' : 'normal');
    }
    if (patch.size && patch.size !== prevSize) {
      stopInertia();
      roaming?.stop();
      const dim = SIZE_MAP[settings.size] || SIZE_MAP.medium;
      const oldB = petWin.getBounds();
      const cx = oldB.x + oldB.width / 2;
      const cy = oldB.y + oldB.height / 2;
      const snapped = clampAndSnapBounds(cx - dim.w / 2, cy - dim.h / 2, dim.w, dim.h, settings.snapToEdge);
      currentSnapEdge = snapped.snapEdge;
      petWin.setBounds({ x: snapped.x, y: snapped.y, width: dim.w, height: dim.h });
      settings.x = snapped.x;
      settings.y = snapped.y;
      persistSettings();
      broadcastBounds();
    }
  }

  syncPetVisibility();
  broadcastSettings();
  return settings;
}

function setupTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('泡泡 · 会说话的桌面伙伴');
  tray.on('double-click', () => {
    showPet();
  });
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示桌宠',
        click: () => {
          showPet();
        },
      },
      {
        label: '隐藏桌宠',
        click: () => {
          manualHidden = true;
          syncPetVisibility();
        },
      },
      { label: '打开泡泡的小屋', click: () => openSettingsWindow() },
      { label: '跑一圈', click: () => petAction('run') },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() },
    ]),
  );
}

function setupIpc() {
  ipcMain.on('pet:setIgnoreMouse', (_e, ignore: boolean) => {
    if (!petWin || petWin.isDestroyed()) return;
    if (ignore) {
      petWin.setIgnoreMouseEvents(true, { forward: true });
    } else {
      petWin.setIgnoreMouseEvents(false);
    }
  });

  ipcMain.handle('pet:getBounds', () => {
    if (!petWin || petWin.isDestroyed()) return { x: 0, y: 0, width: 340, height: 370 };
    return petWin.getBounds();
  });

  ipcMain.handle('pet:beginDrag', () => {
    stopInertia();
    roaming?.pause('drag', true);
    return petWin?.getBounds() || { x: 0, y: 0, width: 340, height: 370 };
  });

  ipcMain.on('pet:interaction', (_e, state: PetInteraction) => {
    if (!state || typeof state !== 'object') return;
    roaming?.pause('hover', Boolean(state.hovered));
    roaming?.pause('drag', Boolean(state.dragging));
    roaming?.pause('sleep', Boolean(state.sleeping));
    roaming?.pause('reaction', Boolean(state.reacting));
    petSleeping = Boolean(state.sleeping);
  });
  ipcMain.on('pet:action', (_e, action: PetCommand) => petAction(action));
  ipcMain.handle('pet:affection', (_e, amount: number) => {
    const delta = amount === 5 ? 5 : 1;
    return applySettingsPatch({ affection: Math.min(999, settings.affection + delta) });
  });
  ipcMain.handle('speech:voices', () => speech.getVoices());
  ipcMain.handle('companion:get', () => companion.get());
  ipcMain.handle('companion:clear', () => {
    const memory = companion.clear();
    dialogue.reset();
    speech.stop();
    broadcast('companion:changed', memory);
    return memory;
  });
  ipcMain.handle('companion:interact', (_e, input: { kind: 'tap' | 'feed' | 'talk'; zone?: PetTouchZone }): PetResponse => {
    if (!input || !['tap', 'feed', 'talk'].includes(input.kind)) throw new Error('不支持的互动');
    const { kind } = input;
    const zone: PetTouchZone = input.zone === 'tail' || input.zone === 'body' ? input.zone : 'head';
    const full = kind === 'feed' && companion.recentCount('feed', 120000) >= 3;
    const memory = full ? companion.get() : companion.record(kind, { zone });
    if (!full && kind !== 'talk') applySettingsPatch({ affection: settings.affection + (kind === 'feed' ? 5 : 1) });
    const rapid = kind === 'tap' && companion.recentCount('tap', 8000) >= 5;
    const customCorpus = packStore.listPacks().find(p => p.id === settings.activePackId)?.corpus;
    const text = dialogue.pick({ reason: kind, name: settings.petName, affection: settings.affection, mascot: dialogueMascot(settings),
      isPlaying: currentSmtc.status === 'Playing', full, rapid, zone, memory, customCorpus });
    const response: PetResponse = { text, memory,
      reaction: kind === 'talk' ? 'wave' : full ? 'full' : kind === 'feed' ? 'feed' : zone === 'tail' ? 'tail' : rapid || zone === 'body' ? 'tickle' : 'tap',
      duration: kind === 'feed' && !full ? 2600 : kind === 'talk' ? 1400 : 1900 };
    broadcast('companion:changed', memory);
    broadcast('pet:response', response);
    return response;
  });
  ipcMain.handle('speech:state', () => speech.getState());
  ipcMain.handle('speech:speak', (_e, text: string) => {
    if (manualHidden || lastFullscreenHidden) return { ok: false };
    return speech.speak(text, settings);
  });
  ipcMain.on('speech:stop', () => speech.stop());
  ipcMain.handle('smtc:get', () => currentSmtc);

  ipcMain.on('pet:setPosition', (_e, { x, y }: { x: number; y: number }) => {
    if (!petWin || petWin.isDestroyed()) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    stopInertia();
    movePet(x, y);
    currentSnapEdge = 'none';
    broadcastBounds();
  });

  ipcMain.handle('pet:finishDrag', (_e, { vx, vy }: { vx: number; vy: number }) => {
    if (!petWin || petWin.isDestroyed()) return null;
    stopInertia();
    roaming?.pause('drag', false);

    const b = petWin.getBounds();
    let curX = b.x;
    let curY = b.y;
    let velX = Math.max(-28, Math.min(28, vx || 0));
    let velY = Math.max(-28, Math.min(28, vy || 0));

    const speed = Math.hypot(velX, velY);
    if (speed < 2.2) {
      const snapped = clampAndSnapBounds(curX, curY, b.width, b.height, settings.snapToEdge);
      currentSnapEdge = snapped.snapEdge;
      movePet(snapped.x, snapped.y);
      settings.x = snapped.x;
      settings.y = snapped.y;
      persistSettings();
      broadcastBounds();
      return { ...b, x: snapped.x, y: snapped.y, snapEdge: currentSnapEdge };
    }

    roaming?.pause('inertia', true);
    return new Promise<PetBounds | null>((resolve) => {
      settleInertia = resolve;
      let step = 0;
      inertiaTimer = setInterval(() => {
        if (!petWin || petWin.isDestroyed()) {
          if (inertiaTimer) clearInterval(inertiaTimer);
          inertiaTimer = null;
          settleInertia = null;
          roaming?.pause('inertia', false);
          resolve(null);
          return;
        }
        step++;
        curX += velX;
        curY += velY;
        velX *= 0.84;
        velY *= 0.84;

        const clamped = clampAndSnapBounds(curX, curY, b.width, b.height, false);
        if (clamped.x !== Math.round(curX)) velX *= -0.35;
        if (clamped.y !== Math.round(curY)) velY *= -0.35;
        curX = clamped.x;
        curY = clamped.y;

        movePet(curX, curY);
        broadcastBounds();

        if (step >= 18 || Math.hypot(velX, velY) < 0.7) {
          if (inertiaTimer) clearInterval(inertiaTimer);
          inertiaTimer = null;
          settleInertia = null;
          roaming?.pause('inertia', false);
          const finalSnap = clampAndSnapBounds(curX, curY, b.width, b.height, settings.snapToEdge);
          currentSnapEdge = finalSnap.snapEdge;
          movePet(finalSnap.x, finalSnap.y);
          settings.x = finalSnap.x;
          settings.y = finalSnap.y;
          persistSettings();
          broadcastBounds();
          resolve({ ...b, x: finalSnap.x, y: finalSnap.y, snapEdge: currentSnapEdge });
        }
      }, 16);
    });
  });

  ipcMain.on('smtc:command', (_e, { cmd, appId }: { cmd: string; appId?: string }) => {
    sendSmtcCommand(cmd, appId);
  });

  ipcMain.handle('lyrics:fetch', (_e, { title, artist }: { title: string; artist: string }) => {
    return fetchSyncedLyrics(title, artist);
  });

  ipcMain.handle('settings:get', () => settings);
  ipcMain.handle('settings:save', (_e, patch: Partial<PetSettings>) => applySettingsPatch(patch));

  ipcMain.on('pet:popupMenu', () => showPetContextMenu());
  ipcMain.on('settings:open', () => openSettingsWindow());
  ipcMain.on('pet:hide', () => {
    manualHidden = true;
    syncPetVisibility();
  });
  ipcMain.on('pet:show', showPet);
  ipcMain.on('app:quit', () => app.quit());

  ipcMain.handle('packs:selectFile', async () => {
    const targetWin = settingsWin && !settingsWin.isDestroyed() ? settingsWin : petWin;
    const res = await dialog.showOpenDialog(targetWin || undefined!, {
      title: '选择透明 WebM / GIF / 图片素材',
      properties: ['openFile'],
      filters: [
        { name: '动画/视频素材', extensions: ['webm', 'mp4', 'gif', 'png', 'webp', 'apng'] },
      ],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('packs:list', () => packStore.listPacks());
  ipcMain.on('pets:gallery', () => { void shell.openExternal('https://codex-pets.net/'); });
  ipcMain.handle('packs:importCodex', async () => {
    const targetWin = settingsWin && !settingsWin.isDestroyed() ? settingsWin : petWin;
    const choice = await dialog.showOpenDialog(targetWin || undefined!, {
      title: '选择 Codex Pets 的 ZIP 或 pet.json', properties: ['openFile'],
      filters: [{ name: 'Codex 宠物包', extensions: ['zip', 'json'] }],
    });
    if (choice.canceled || !choice.filePaths.length) return null;
    const pack = packStore.importCodexPet(choice.filePaths[0]);
    broadcast('packs:changed', packStore.listPacks());
    return pack;
  });
  ipcMain.handle('packs:import', (_e, input: ImportPackInput) => {
    const pack = packStore.importPack(input);
    const packs = packStore.listPacks();
    petWin?.webContents.send('packs:changed', packs);
    settingsWin?.webContents.send('packs:changed', packs);
    return pack;
  });
  ipcMain.handle('packs:delete', (_e, id: string) => {
    const ok = packStore.deletePack(id);
    if (ok && settings.activePackId === id) {
      applySettingsPatch({ activePackId: 'builtin' });
    }
    const packs = packStore.listPacks();
    petWin?.webContents.send('packs:changed', packs);
    settingsWin?.webContents.send('packs:changed', packs);
    return ok;
  });
}

app.whenReady().then(() => {
  if (!hasInstanceLock) return;
  packStore = new PetPackStore(app.getPath('userData'));
  if (!isolatedData) {
    const seedCandidates = [
      path.join(app.getAppPath(), 'references', 'curated-pet-packs'),
      path.join(process.resourcesPath, 'references', 'curated-pet-packs'),
    ];
    const seedDir = seedCandidates.find(p => fs.existsSync(p));
    if (seedDir) {
      for (const entry of fs.readdirSync(seedDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^pack_[a-f0-9]+$/i.test(entry.name)) continue;
        const dst = path.join(packStore.getPacksDir(), entry.name);
        const srcManifest = path.join(seedDir, entry.name, 'pack.json');
        const dstManifest = path.join(dst, 'pack.json');
        if (!fs.existsSync(dstManifest)) {
          fs.cpSync(path.join(seedDir, entry.name), dst, { recursive: true });
        } else if (fs.existsSync(srcManifest)) {
          fs.copyFileSync(srcManifest, dstManifest);
        }
      }
    }
  }
  companion = new CompanionStore(app.getPath('userData'));
  settings = loadSettings();
  persistSettings();
  syncSystemIntegrations();
  const voiceCandidates = [
    path.join(app.getAppPath(), 'native', 'bin', 'voice-bridge.exe'),
    path.join(process.resourcesPath, 'native', 'bin', 'voice-bridge.exe'),
  ];
  const voiceExe = voiceCandidates.find(p => fs.existsSync(p));
  if (voiceExe) speech.start(voiceExe);

  // Serve imported pet pack media files via petpack://<packId>/<fileName> with range/stream support
  protocol.handle('petpack', (request) => {
    try {
      const u = new URL(request.url);
      const packId = u.hostname;
      const fileName = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
      const full = packStore.resolveAssetFile(packId, fileName);
      if (!full) return new Response('Not found', { status: 404 });

      const stat = fs.statSync(full);
      const ext = path.extname(full).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.webm': 'video/webm',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.gif': 'image/gif',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';
      const rangeHeader = request.headers.get('range');
      if (rangeHeader) {
        const m = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
        if (m) {
          const start = parseInt(m[1], 10);
          const end = m[2] ? Math.min(parseInt(m[2], 10), stat.size - 1) : stat.size - 1;
          if (start >= stat.size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
          const chunk = fs.readFileSync(full).subarray(start, end + 1);
          return new Response(chunk, {
            status: 206,
            headers: {
              'Content-Type': contentType,
              'Content-Range': `bytes ${start}-${end}/${stat.size}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(chunk.length),
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      const buf = fs.readFileSync(full);
      return new Response(buf, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(buf.length),
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch {
      return new Response('Error', { status: 500 });
    }
  });

  // Enable system-wide loopback audio capture for real-time audio spectrum & beat detection!
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      callback({ video: sources[0], audio: 'loopback' });
    } catch {
      callback({});
    }
  });

  setupIpc();
  setupTray();
  createPetWindow();
  startSmtcBridge();
  if (process.argv.includes('--settings')) openSettingsWindow();
  screen.on('display-removed', showPet);
  screen.on('display-metrics-changed', () => {
    stopInertia();
    if (petWin && !petWin.isDestroyed()) {
      const b = petWin.getBounds();
      const safe = clampAndSnapBounds(b.x, b.y, b.width, b.height, false);
      movePet(safe.x, safe.y);
      broadcastBounds();
    }
  });
});

app.on('second-instance', () => { showPet(); openSettingsWindow(); });

app.on('window-all-closed', () => {
  // Keep alive in tray unless explicitly quit
});

app.on('before-quit', () => {
  quitting = true;
  try { globalShortcut.unregisterAll(); } catch {}
  if (petWin && !petWin.isDestroyed() && settingsFile) {
    const b = petWin.getBounds();
    settings.x = b.x;
    settings.y = b.y;
    persistSettings();
  }
  stopInertia();
  roaming?.dispose();
  if (cursorTimer) clearInterval(cursorTimer);
  if (bridgeRestartTimer) clearTimeout(bridgeRestartTimer);
  speech.dispose();
  if (smtcProc && !smtcProc.killed) {
    smtcProc.kill();
  }
});
