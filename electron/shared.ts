export type PetSizePreset = 'small' | 'medium' | 'large';
export type PetThemePreset = 'whalegirl' | 'lingma' | 'whale' | 'nyan' | 'cyber' | 'mochi';
export type PetActionKey = 'idle' | 'playing' | 'chorus' | 'tap' | 'drag' | 'sleep' | 'happy' | 'walk';
export type PetCommand = 'tap' | 'feed' | 'talk' | 'run' | 'sleep' | 'wake';
export type RoamSpeed = 'slow' | 'normal' | 'lively';
export type PetTouchZone = 'head' | 'body' | 'tail';
export type PetReactionKey = 'tap' | 'feed' | 'beat' | 'tickle' | 'tail' | 'full' | 'land' | 'wake' | 'wave';

export interface PetSettings {
  version: number;
  petName: string;
  size: PetSizePreset;
  theme: PetThemePreset;
  activePackId: string;
  topmost: boolean;
  showLyrics: boolean;
  showPlaybar: boolean;
  autoGreet: boolean;
  hideInFullscreen: boolean;
  audioReactive: boolean;
  snapToEdge: boolean;
  affection: number;
  roamEnabled: boolean;
  roamSpeed: RoamSpeed;
  voiceEnabled: boolean;
  voiceId: string;
  voiceVolume: number;
  voiceRate: number;
  voiceAutoGreet: boolean;
  autoStart?: boolean;
  bossKeyEnabled?: boolean;
  x?: number;
  y?: number;
}

export const DEFAULT_SETTINGS: PetSettings = {
  version: 3, petName: '泡泡', size: 'medium', theme: 'whalegirl', activePackId: 'builtin',
  topmost: true, showLyrics: true, showPlaybar: true, autoGreet: true,
  hideInFullscreen: true, audioReactive: true, snapToEdge: true, affection: 30,
  roamEnabled: true, roamSpeed: 'normal', voiceEnabled: true, voiceId: 'auto',
  voiceVolume: 65, voiceRate: 1, voiceAutoGreet: false, autoStart: false, bossKeyEnabled: true,
};

export const STAGE_SIZE: Record<PetSizePreset, { w: number; h: number }> = {
  small: { w: 280, h: 360 }, medium: { w: 340, h: 430 }, large: { w: 420, h: 510 },
};

/** Persist only known, valid settings; keep existing preferences when adding new fields. */
export function sanitizeSettings(input: unknown, base: PetSettings = DEFAULT_SETTINGS): PetSettings {
  const next = { ...base };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return next;
  const raw = input as Record<string, unknown>;
  const bools = ['topmost', 'showLyrics', 'showPlaybar', 'autoGreet', 'hideInFullscreen',
    'audioReactive', 'snapToEdge', 'roamEnabled', 'voiceEnabled', 'voiceAutoGreet', 'autoStart', 'bossKeyEnabled'] as const;
  for (const key of bools) if (typeof raw[key] === 'boolean') next[key] = raw[key] as boolean;
  if (['small', 'medium', 'large'].includes(String(raw.size))) next.size = raw.size as PetSizePreset;
  if (['whalegirl', 'lingma', 'whale', 'nyan', 'cyber', 'mochi'].includes(String(raw.theme))) next.theme = raw.theme as PetThemePreset;
  if (['slow', 'normal', 'lively'].includes(String(raw.roamSpeed))) next.roamSpeed = raw.roamSpeed as RoamSpeed;
  if (typeof raw.petName === 'string' && raw.petName.trim()) next.petName = raw.petName.trim().slice(0, 12);
  if (typeof raw.activePackId === 'string' && /^(builtin|pack_[a-f0-9]+)$/.test(raw.activePackId)) next.activePackId = raw.activePackId;
  if (typeof raw.voiceId === 'string' && raw.voiceId.length <= 150) next.voiceId = raw.voiceId || 'auto';
  for (const [key, min, max] of [['affection', 0, 999], ['voiceVolume', 0, 100], ['voiceRate', -3, 4]] as const) {
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) next[key] = Math.round(Math.max(min, Math.min(max, raw[key] as number)));
  }
  for (const key of ['x', 'y'] as const) if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) next[key] = Math.round(raw[key] as number);
  next.version = 3;
  return next;
}

export interface PetPackAsset { url: string; kind: 'video' | 'image'; fileName: string }
export interface PetPack {
  id: string; name: string; author?: string; createdAt: number;
  assets: Partial<Record<PetActionKey, PetPackAsset>>; corpus?: string[];
  spritesheet?: { url: string; version: 1 | 2 };
  description?: string;
}
export interface ImportPackInput { name: string; files: Partial<Record<PetActionKey, string>>; corpus?: string[] }
export interface SmtcState {
  event: 'state'; cursorX?: number; cursorY?: number; fullscreen?: boolean; hasSession?: boolean;
  appId?: string; status?: string; positionMs?: number; durationMs?: number;
  title?: string; artist?: string; album?: string; thumbnail?: string | null;
}
export interface LyricLine { timeMs: number; text: string; trans?: string }
export interface AudioFrame {
  active: boolean; bass: number; mid: number; treble: number; beatPulse: number; energy: number; bins: number[];
}
export interface PetBounds { x: number; y: number; width: number; height: number; snapEdge?: string }
export interface MotionState { moving: boolean; direction: -1 | 1; pace: 'walk' | 'run' }
export interface VoiceInfo { id: string; name: string; lang: string; gender: string }
export interface SpeechState { status: 'idle' | 'speaking' | 'error'; text?: string; id?: string; error?: string }
export interface SpeechResult { ok: boolean; error?: string }
export interface PetInteraction { hovered: boolean; dragging: boolean; sleeping: boolean; reacting?: boolean }

export type CompanionEventKind = 'tap' | 'feed' | 'talk' | 'run' | 'listen';
export type CompanionCounts = Record<CompanionEventKind, number>;
export interface CompanionEvent {
  id: string; kind: CompanionEventKind; at: number; zone?: PetTouchZone; title?: string; artist?: string;
}
export interface CompanionMemory {
  version: 1; since: number; firstAt: number | null; totals: CompanionCounts;
  days: { date: string; counts: CompanionCounts }[];
  events: CompanionEvent[];
}
export interface PetResponse {
  text: string; reaction: PetReactionKey; duration: number; memory: CompanionMemory;
}

export interface MelodyPetApi {
  setIgnoreMouseEvents: (ignore: boolean) => void;
  getBounds: () => Promise<PetBounds>;
  setPosition: (x: number, y: number) => void;
  beginDrag: () => Promise<PetBounds>;
  finishDrag: (vx: number, vy: number) => Promise<PetBounds | null>;
  onBoundsChanged: (cb: (b: PetBounds) => void) => () => void;
  onCursorPosition: (cb: (p: { x: number; y: number }) => void) => () => void;
  getSmtcState: () => Promise<SmtcState>;
  onSmtcState: (cb: (s: SmtcState) => void) => () => void;
  sendSmtcCommand: (cmd: 'toggle' | 'play' | 'pause' | 'next' | 'prev' | 'activateApp' | 'poll', appId?: string) => void;
  fetchLyrics: (title: string, artist: string) => Promise<LyricLine[]>;
  getSettings: () => Promise<PetSettings>;
  saveSettings: (patch: Partial<PetSettings>) => Promise<PetSettings>;
  addAffection: (amount: number) => Promise<PetSettings>;
  onSettingsChanged: (cb: (s: PetSettings) => void) => () => void;
  popupMenu: (x: number, y: number) => void;
  onMenuAction: (cb: (action: string) => void) => () => void;
  petAction: (action: PetCommand) => void;
  setInteraction: (state: PetInteraction) => void;
  onMotionChanged: (cb: (s: MotionState) => void) => () => void;
  openSettingsWindow: () => void;
  showPet: () => void;
  hidePet: () => void;
  quitApp: () => void;
  selectMediaFile: () => Promise<string | null>;
  listPacks: () => Promise<PetPack[]>;
  importPack: (input: ImportPackInput) => Promise<PetPack>;
  deletePack: (id: string) => Promise<boolean>;
  onPacksChanged: (cb: (packs: PetPack[]) => void) => () => void;
  importCodexPet: () => Promise<PetPack | null>;
  openPetGallery: () => void;
  getCompanionMemory: () => Promise<CompanionMemory>;
  clearCompanionMemory: () => Promise<CompanionMemory>;
  interact: (kind: 'tap' | 'feed' | 'talk', zone?: PetTouchZone) => Promise<PetResponse>;
  onCompanionMemory: (cb: (memory: CompanionMemory) => void) => () => void;
  onPetResponse: (cb: (response: PetResponse) => void) => () => void;
  getVoices: () => Promise<VoiceInfo[]>;
  speak: (text: string) => Promise<SpeechResult>;
  stopSpeaking: () => void;
  getSpeechState: () => Promise<SpeechState>;
  onSpeechState: (cb: (s: SpeechState) => void) => () => void;
}
