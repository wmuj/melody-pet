import { useCallback, useEffect, useState } from 'react';

export type SnackId = 'fish' | 'mochi' | 'boba' | 'pudding' | 'cake' | 'sushi';
export type ToyId = 'bubbles' | 'yarn' | 'wand' | 'musicbox';
export type HatId = 'none' | 'ribbon' | 'crown' | 'beret' | 'headphone' | 'sakura' | 'sunglasses' | 'halo';
export type NeckId = 'none' | 'scarf' | 'bell' | 'bib' | 'bowtie' | 'bag';
export type NestId = 'cushion' | 'shell' | 'vinyl' | 'tatami' | 'cloud' | 'none';
export type RoomBgId = 'sunny' | 'starry' | 'ocean' | 'sakura';
export type RoomPropId = 'speaker' | 'plant' | 'lamp' | 'plush';

export interface SnackItem {
  id: SnackId;
  name: string;
  emoji: string;
  cost: number;
  satiety: number;
  mood: number;
  desc: string;
  line: string;
  color: string;
}

export interface ToyItem {
  id: ToyId;
  name: string;
  emoji: string;
  cost: number;
  mood: number;
  desc: string;
  line: string;
}

export interface OutfitItem<T extends string> {
  id: T;
  name: string;
  emoji: string;
  cost: number;
  desc: string;
  badge?: string;
}

export interface RoomBgItem {
  id: RoomBgId;
  name: string;
  emoji: string;
  desc: string;
}

export interface RoomPropItem {
  id: RoomPropId;
  name: string;
  emoji: string;
  desc: string;
}

export interface DailyProgress {
  date: string;
  touchCount: number;
  feedCount: number;
  playCount: number;
  FocusDoneCount: number;
  rewardClaimed: boolean;
}

export interface PetCareState {
  version: 1;
  satiety: number;
  mood: number;
  coins: number;
  selectedSnackId: SnackId;
  selectedToyId: ToyId;
  hatId: HatId;
  neckId: NeckId;
  nestId: NestId;
  roomBgId: RoomBgId;
  roomProps: RoomPropId[];
  unlockedIds: string[];
  totalFedCount: number;
  totalPlayCount: number;
  hatOffsetY: number;
  outfitScale: number;
  drinkReminder: boolean;
  focusEndAt: number | null;
  focusMinutes: number;
  daily: DailyProgress;
  lastUpdatedAt: number;
  lastSnackEvent?: {
    id: string;
    snackId: SnackId;
    at: number;
  };
  lastToyEvent?: {
    id: string;
    toyId: ToyId;
    at: number;
  };
}

export const SNACK_ITEMS: SnackItem[] = [
  {
    id: 'fish',
    name: '酥脆小鱼干',
    emoji: '🐟',
    cost: 0,
    satiety: 14,
    mood: 8,
    desc: '随时无限供应的招牌零嘴',
    line: '咔嚓咔嚓～酥脆的小鱼干，开心得尾巴都摇起来啦！',
    color: '#f29f4b',
  },
  {
    id: 'mochi',
    name: '草莓雪媚娘',
    emoji: '🍓',
    cost: 8,
    satiety: 18,
    mood: 14,
    desc: '软糯糯的奶油草莓团子',
    line: '一口咬开软乎乎的草莓雪媚娘，甜到心里冒泡啦～',
    color: '#f4799b',
  },
  {
    id: 'boba',
    name: '黑糖波霸奶茶',
    emoji: '🧋',
    cost: 10,
    satiety: 16,
    mood: 18,
    desc: 'Q弹珍珠配浓郁鲜牛乳',
    line: '吨吨吨吸一口黑糖珍珠，今天也是元气满满的一天！',
    color: '#c98860',
  },
  {
    id: 'pudding',
    name: '焦糖海盐布丁',
    emoji: '🍮',
    cost: 12,
    satiety: 20,
    mood: 16,
    desc: 'duang~晃悠悠的治愈甜品',
    line: '焦糖布丁在勺子上晃呀晃，入口即化太幸福啦！',
    color: '#e8a849',
  },
  {
    id: 'cake',
    name: '蜂蜜芝士蛋糕',
    emoji: '🍰',
    cost: 15,
    satiety: 24,
    mood: 20,
    desc: '香甜绵密的下午茶首选',
    line: '绵密芝士加上清甜蜂蜜，好吃得原地转圈圈！',
    color: '#f0b85c',
  },
  {
    id: 'sushi',
    name: '极上三文鱼拼盘',
    emoji: '🍣',
    cost: 20,
    satiety: 32,
    mood: 25,
    desc: '超丰盛的豪华海鲜大餐',
    line: '哇！是超豪华的三文鱼大餐，要给你一个大大的贴贴！',
    color: '#ef765b',
  },
];

export const TOY_ITEMS: ToyItem[] = [
  {
    id: 'bubbles',
    name: '七彩吹泡泡机',
    emoji: '🫧',
    cost: 0,
    mood: 15,
    desc: '漫天飘起晶莹剔透的彩虹泡泡',
    line: '哇～好多亮晶晶的彩色泡泡，戳破一个还有小星星呢！',
  },
  {
    id: 'yarn',
    name: '软萌毛线球',
    emoji: '🧶',
    cost: 0,
    mood: 16,
    desc: '骨碌碌弹跳翻滚的暖绒线团',
    line: '毛线球滚过来啦！看我一个飞扑把它抱住～',
  },
  {
    id: 'wand',
    name: '星光仙女逗猫棒',
    emoji: '🎐',
    cost: 12,
    mood: 22,
    desc: '轻轻挥动洒下璀璨金色星尘',
    line: '叮铃铃～星光棒一晃，眼神都跟着亮晶晶地转圈圈啦！',
  },
  {
    id: 'musicbox',
    name: '飘雪八音水晶球',
    emoji: '🔮',
    cost: 16,
    mood: 25,
    desc: '飘舞着浪漫雪花与发光音符',
    line: '水晶球里的雪花和音符都在跳舞，好想一直和你待在一起。',
  },
];

export const HAT_ITEMS: OutfitItem<HatId>[] = [
  { id: 'none', name: '不戴头饰', emoji: '🌿', cost: 0, desc: '保持原本清爽可爱的模样' },
  { id: 'ribbon', name: '丝绒红蝴蝶结', emoji: '🎀', cost: 0, desc: '甜美乖巧的波点蝴蝶结', badge: '默认赠送' },
  { id: 'crown', name: '星光迷你皇冠', emoji: '👑', cost: 0, desc: '亮晶晶的小小皇室加冕', badge: '默认赠送' },
  { id: 'beret', name: '奶油画家贝雷帽', emoji: '🎨', cost: 25, desc: '软糯暖杏色，文艺气息拉满' },
  { id: 'headphone', name: '律动猫耳耳机', emoji: '🎧', cost: 30, desc: '听歌时耳机会随节拍闪烁微光', badge: '音乐联动' },
  { id: 'sakura', name: '春日粉樱发簪', emoji: '🌸', cost: 25, desc: '簪着粉嫩樱花，温柔又治愈' },
  { id: 'sunglasses', name: '复古甜酷墨镜', emoji: '😎', cost: 30, desc: '戴上就是桌面上最靓的仔' },
  { id: 'halo', name: '音符天使光环', emoji: '✨', cost: 35, desc: '头顶悬浮发光的金色音符环' },
];

export const NECK_ITEMS: OutfitItem<NeckId>[] = [
  { id: 'none', name: '不戴颈饰', emoji: '🌿', cost: 0, desc: '轻装上阵，自在散步' },
  { id: 'scarf', name: '暖绒红格围巾', emoji: '🧣', cost: 0, desc: '软绵绵的温暖格纹小围巾', badge: '默认赠送' },
  { id: 'bell', name: '招财金铃铛', emoji: '🔔', cost: 0, desc: '跑动时仿佛有清脆叮当声', badge: '默认赠送' },
  { id: 'bib', name: '草莓蕾丝围兜', emoji: '🍰', cost: 20, desc: '吃零食绝不弄脏毛发的乖巧围兜' },
  { id: 'bowtie', name: '星空丝绸领结', emoji: '🦋', cost: 25, desc: '参加音乐会必备的优雅小领结' },
  { id: 'bag', name: '小黄鸭斜挎包', emoji: '🎒', cost: 30, desc: '装满小鱼干与宝藏的随身小包' },
];

export const NEST_ITEMS: OutfitItem<NestId>[] = [
  { id: 'cushion', name: '奶油云朵软垫', emoji: '🛋️', cost: 0, desc: '蓬松暖绒圆垫，配一颗小星星靠枕', badge: '默认小窝' },
  { id: 'shell', name: '珍珠贝壳海景窝', emoji: '🐚', cost: 0, desc: '粉蓝渐变贝壳垫与莹润小珍珠', badge: '默认赠送' },
  { id: 'vinyl', name: '复古黑胶音乐毯', emoji: '💿', cost: 25, desc: '听歌时黑胶纹路与小音箱一起律动', badge: '音乐联动' },
  { id: 'tatami', name: '森系抹茶榻榻米', emoji: '🍵', cost: 30, desc: '清新蔺草席垫，配一盏温热抹茶' },
  { id: 'cloud', name: '星月棉花糖云窝', emoji: '☁️', cost: 35, desc: '软绵绵的浮空云朵与金色弯月' },
  { id: 'none', name: '隐藏桌面底座', emoji: '✨', cost: 0, desc: '不在桌面显示小窝，保持极简透明' },
];

export const ROOM_BG_ITEMS: RoomBgItem[] = [
  { id: 'sunny', name: '奶油暖阳午后', emoji: '☀️', desc: '洒满金色阳光的木地板与温暖窗景' },
  { id: 'starry', name: '静谧星夜阁楼', emoji: '🌙', desc: '深邃夜空、弯月繁星与暖黄串灯' },
  { id: 'ocean', name: '深海玻璃花房', emoji: '🫧', desc: '蔚蓝水波光影与漂浮的梦幻泡泡' },
  { id: 'sakura', name: '樱吹雪小露台', emoji: '🌸', desc: '柔粉春日晚霞与漫天飞舞的樱瓣' },
];

export const ROOM_PROP_ITEMS: RoomPropItem[] = [
  { id: 'speaker', name: '复古留声机', emoji: '📻', desc: '播放音乐时飘出灵动音符' },
  { id: 'plant', name: '龟背竹盆栽', emoji: '🪴', desc: '在窗边添一抹生机勃勃的绿意' },
  { id: 'lamp', name: '奶油蘑菇灯', emoji: '🏮', desc: '散发温暖柔和的橘黄氛围光' },
  { id: 'plush', name: '焦糖泰迪熊', emoji: '🧸', desc: '安静坐在地毯旁陪伴的小伙伴' },
];

const STORAGE_KEY = 'melody-pet-care-v1';
const CHANNEL_NAME = 'melody-pet-care-sync';

const DEFAULT_UNLOCKED = [
  'hat:none', 'hat:ribbon', 'hat:crown',
  'neck:none', 'neck:scarf', 'neck:bell',
  'nest:cushion', 'nest:shell', 'nest:none',
];

function todayStr(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function emptyDaily(now = Date.now()): DailyProgress {
  return {
    date: todayStr(now),
    touchCount: 0,
    feedCount: 0,
    playCount: 0,
    FocusDoneCount: 0,
    rewardClaimed: false,
  };
}

export const DEFAULT_CARE_STATE: PetCareState = {
  version: 1,
  satiety: 86,
  mood: 92,
  coins: 150,
  selectedSnackId: 'fish',
  selectedToyId: 'bubbles',
  hatId: 'ribbon',
  neckId: 'scarf',
  nestId: 'cushion',
  roomBgId: 'sunny',
  roomProps: ['speaker', 'plant', 'lamp', 'plush'],
  unlockedIds: DEFAULT_UNLOCKED,
  totalFedCount: 0,
  totalPlayCount: 0,
  hatOffsetY: 0,
  outfitScale: 1,
  drinkReminder: true,
  focusEndAt: null,
  focusMinutes: 25,
  daily: emptyDaily(),
  lastUpdatedAt: Date.now(),
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function sanitizeCareState(raw: unknown): PetCareState {
  const now = Date.now();
  const today = todayStr(now);
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CARE_STATE, daily: emptyDaily(now), lastUpdatedAt: now };
  const obj = raw as Record<string, unknown>;
  const lastAt = typeof obj.lastUpdatedAt === 'number' && Number.isFinite(obj.lastUpdatedAt) ? obj.lastUpdatedAt : now;
  const elapsedHours = Math.max(0, Math.min(24, (now - lastAt) / 3600000));
  const rawSatiety = typeof obj.satiety === 'number' && Number.isFinite(obj.satiety) ? obj.satiety : DEFAULT_CARE_STATE.satiety;
  const rawMood = typeof obj.mood === 'number' && Number.isFinite(obj.mood) ? obj.mood : DEFAULT_CARE_STATE.mood;
  const satiety = elapsedHours > 0.25 ? Math.max(45, clamp(rawSatiety - elapsedHours * 4, 45, 100)) : clamp(rawSatiety, 35, 100);
  const mood = elapsedHours > 0.25 ? Math.max(55, clamp(rawMood - elapsedHours * 2, 55, 100)) : clamp(rawMood, 40, 100);

  const validSnacks = SNACK_ITEMS.map(s => s.id);
  const validToys = TOY_ITEMS.map(t => t.id);
  const validHats = HAT_ITEMS.map(h => h.id);
  const validNecks = NECK_ITEMS.map(n => n.id);
  const validNests = NEST_ITEMS.map(n => n.id);
  const validRoomBgs = ROOM_BG_ITEMS.map(r => r.id);
  const validProps = ROOM_PROP_ITEMS.map(p => p.id);

  const unlockedSet = new Set<string>(DEFAULT_UNLOCKED);
  if (Array.isArray(obj.unlockedIds)) {
    for (const id of obj.unlockedIds) {
      if (typeof id === 'string') unlockedSet.add(id);
    }
  }

  const roomProps = Array.isArray(obj.roomProps)
    ? (obj.roomProps.filter(p => validProps.includes(p as RoomPropId)) as RoomPropId[])
    : DEFAULT_CARE_STATE.roomProps;

  let daily = emptyDaily(now);
  if (obj.daily && typeof obj.daily === 'object') {
    const d = obj.daily as Record<string, unknown>;
    if (d.date === today) {
      daily = {
        date: today,
        touchCount: typeof d.touchCount === 'number' ? clamp(d.touchCount, 0, 9999) : 0,
        feedCount: typeof d.feedCount === 'number' ? clamp(d.feedCount, 0, 9999) : 0,
        playCount: typeof d.playCount === 'number' ? clamp(d.playCount, 0, 9999) : 0,
        FocusDoneCount: typeof d.FocusDoneCount === 'number' ? clamp(d.FocusDoneCount, 0, 9999) : 0,
        rewardClaimed: Boolean(d.rewardClaimed),
      };
    }
  }

  let lastSnackEvent: PetCareState['lastSnackEvent'] | undefined;
  if (obj.lastSnackEvent && typeof obj.lastSnackEvent === 'object') {
    const ev = obj.lastSnackEvent as Record<string, unknown>;
    if (typeof ev.id === 'string' && validSnacks.includes(ev.snackId as SnackId) && typeof ev.at === 'number') {
      lastSnackEvent = { id: ev.id, snackId: ev.snackId as SnackId, at: ev.at };
    }
  }

  let lastToyEvent: PetCareState['lastToyEvent'] | undefined;
  if (obj.lastToyEvent && typeof obj.lastToyEvent === 'object') {
    const ev = obj.lastToyEvent as Record<string, unknown>;
    if (typeof ev.id === 'string' && validToys.includes(ev.toyId as ToyId) && typeof ev.at === 'number') {
      lastToyEvent = { id: ev.id, toyId: ev.toyId as ToyId, at: ev.at };
    }
  }

  const rawScale = typeof obj.outfitScale === 'number' && Number.isFinite(obj.outfitScale) ? obj.outfitScale : 1;
  const outfitScale = Math.round(Math.max(0.75, Math.min(1.35, rawScale)) * 100) / 100;

  return {
    version: 1,
    satiety,
    mood,
    coins: typeof obj.coins === 'number' && Number.isFinite(obj.coins) ? clamp(obj.coins, 0, 99999) : DEFAULT_CARE_STATE.coins,
    selectedSnackId: validSnacks.includes(obj.selectedSnackId as SnackId) ? (obj.selectedSnackId as SnackId) : 'fish',
    selectedToyId: validToys.includes(obj.selectedToyId as ToyId) ? (obj.selectedToyId as ToyId) : 'bubbles',
    hatId: validHats.includes(obj.hatId as HatId) ? (obj.hatId as HatId) : 'ribbon',
    neckId: validNecks.includes(obj.neckId as NeckId) ? (obj.neckId as NeckId) : 'scarf',
    nestId: validNests.includes(obj.nestId as NestId) ? (obj.nestId as NestId) : 'cushion',
    roomBgId: validRoomBgs.includes(obj.roomBgId as RoomBgId) ? (obj.roomBgId as RoomBgId) : 'sunny',
    roomProps,
    unlockedIds: Array.from(unlockedSet),
    totalFedCount: typeof obj.totalFedCount === 'number' && Number.isFinite(obj.totalFedCount) ? clamp(obj.totalFedCount, 0, 999999) : 0,
    totalPlayCount: typeof obj.totalPlayCount === 'number' && Number.isFinite(obj.totalPlayCount) ? clamp(obj.totalPlayCount, 0, 999999) : 0,
    hatOffsetY: typeof obj.hatOffsetY === 'number' && Number.isFinite(obj.hatOffsetY) ? clamp(obj.hatOffsetY, -30, 30) : 0,
    outfitScale,
    drinkReminder: typeof obj.drinkReminder === 'boolean' ? obj.drinkReminder : true,
    focusEndAt: typeof obj.focusEndAt === 'number' && Number.isFinite(obj.focusEndAt) && obj.focusEndAt > now ? obj.focusEndAt : null,
    focusMinutes: typeof obj.focusMinutes === 'number' && [15, 25, 45].includes(obj.focusMinutes) ? obj.focusMinutes : 25,
    daily,
    lastUpdatedAt: now,
    lastSnackEvent,
    lastToyEvent,
  };
}

export function loadCareState(): PetCareState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CARE_STATE, daily: emptyDaily(), lastUpdatedAt: Date.now() };
    return sanitizeCareState(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CARE_STATE, daily: emptyDaily(), lastUpdatedAt: Date.now() };
  }
}

let sharedChannel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!sharedChannel) {
    try {
      sharedChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      sharedChannel = null;
    }
  }
  return sharedChannel;
}

const localListeners = new Set<(next: PetCareState) => void>();

export function saveCareState(updater: Partial<PetCareState> | ((prev: PetCareState) => PetCareState)): PetCareState {
  const current = loadCareState();
  const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  const next = sanitizeCareState({ ...updated, lastUpdatedAt: Date.now() });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  localListeners.forEach(fn => fn(next));
  try {
    getChannel()?.postMessage(next);
  } catch {
    // ignore broadcast errors
  }
  return next;
}

export function computePetLevel(care: PetCareState, affection = 30) {
  const exp = Math.max(0, affection) + care.totalFedCount * 4 + care.totalPlayCount * 4 + care.unlockedIds.length * 3;
  const tiers = [
    { level: 1, title: '软萌初遇幼崽', badge: '🌱', min: 0, next: 60 },
    { level: 2, title: '听歌小同桌', badge: '🎵', min: 60, next: 130 },
    { level: 3, title: '甜品鉴赏家', badge: '🍓', min: 130, next: 220 },
    { level: 4, title: '元气治愈甜心', badge: '✨', min: 220, next: 350 },
    { level: 5, title: '旋律小主理人', badge: '👑', min: 350, next: 520 },
    { level: 6, title: '传说星海伴侣', badge: '🌟', min: 520, next: 999 },
  ];
  const current = [...tiers].reverse().find(t => exp >= t.min) || tiers[0];
  const progress = Math.min(100, Math.round(((exp - current.min) / Math.max(1, current.next - current.min)) * 100));
  return { ...current, exp, progress };
}

export function usePetCare() {
  const [care, setCare] = useState<PetCareState>(() => loadCareState());

  useEffect(() => {
    const onLocal = (next: PetCareState) => setCare(next);
    localListeners.add(onLocal);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          setCare(sanitizeCareState(JSON.parse(event.newValue)));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = (event) => {
          if (event.data) setCare(sanitizeCareState(event.data));
        };
      } catch {
        bc = null;
      }
    }

    return () => {
      localListeners.delete(onLocal);
      window.removeEventListener('storage', onStorage);
      bc?.close();
    };
  }, []);

  const updateCare = useCallback((updater: Partial<PetCareState> | ((prev: PetCareState) => PetCareState)) => {
    return saveCareState(updater);
  }, []);

  const feedSnack = useCallback((snackId?: SnackId): { ok: boolean; snack: SnackItem; reason?: string } => {
    const current = loadCareState();
    const targetId = snackId || current.selectedSnackId || 'fish';
    const snack = SNACK_ITEMS.find(s => s.id === targetId) || SNACK_ITEMS[0];
    if (current.lastSnackEvent && Date.now() - current.lastSnackEvent.at < 450) {
      const recent = SNACK_ITEMS.find(s => s.id === current.lastSnackEvent?.snackId) || snack;
      return { ok: true, snack: recent };
    }
    const finalSnack = current.coins >= snack.cost ? snack : SNACK_ITEMS[0];
    const usedFallback = finalSnack.id !== snack.id;

    saveCareState(prev => ({
      ...prev,
      selectedSnackId: targetId,
      coins: Math.max(0, prev.coins - finalSnack.cost + 3),
      satiety: clamp(prev.satiety + finalSnack.satiety, 35, 100),
      mood: clamp(prev.mood + finalSnack.mood, 40, 100),
      totalFedCount: prev.totalFedCount + 1,
      daily: {
        ...prev.daily,
        feedCount: prev.daily.feedCount + 1,
      },
      lastSnackEvent: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        snackId: finalSnack.id,
        at: Date.now(),
      },
    }));

    return {
      ok: true,
      snack: finalSnack,
      reason: usedFallback ? `音符币不足，先喂了一份免费的「${finalSnack.name}」～` : undefined,
    };
  }, []);

  const playWithToy = useCallback((toyId?: ToyId): { ok: boolean; toy: ToyItem; reason?: string } => {
    const current = loadCareState();
    const targetId = toyId || current.selectedToyId || 'bubbles';
    const toy = TOY_ITEMS.find(t => t.id === targetId) || TOY_ITEMS[0];
    if (current.lastToyEvent && Date.now() - current.lastToyEvent.at < 450) {
      const recent = TOY_ITEMS.find(t => t.id === current.lastToyEvent?.toyId) || toy;
      return { ok: true, toy: recent };
    }
    const finalToy = current.coins >= toy.cost ? toy : TOY_ITEMS[0];
    const usedFallback = finalToy.id !== toy.id;

    saveCareState(prev => ({
      ...prev,
      selectedToyId: targetId,
      coins: Math.max(0, prev.coins - finalToy.cost + 4),
      mood: clamp(prev.mood + finalToy.mood, 40, 100),
      satiety: clamp(prev.satiety - 2, 45, 100),
      totalPlayCount: prev.totalPlayCount + 1,
      daily: {
        ...prev.daily,
        playCount: prev.daily.playCount + 1,
      },
      lastToyEvent: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        toyId: finalToy.id,
        at: Date.now(),
      },
    }));

    return {
      ok: true,
      toy: finalToy,
      reason: usedFallback ? `音符币不足，先拿免费的「${finalToy.name}」陪它玩啦～` : undefined,
    };
  }, []);

  const equipOrUnlock = useCallback((category: 'hat' | 'neck' | 'nest', itemId: string, cost: number): { ok: boolean; message: string } => {
    const key = `${category}:${itemId}`;
    const current = loadCareState();
    const isUnlocked = cost === 0 || current.unlockedIds.includes(key);
    if (!isUnlocked && current.coins < cost) {
      return { ok: false, message: `还需要 ${cost - current.coins} 枚音符币才能解锁哦，多摸摸或听会儿歌吧～` };
    }
    saveCareState(prev => {
      const unlocked = new Set(prev.unlockedIds);
      unlocked.add(key);
      return {
        ...prev,
        coins: isUnlocked ? prev.coins : Math.max(0, prev.coins - cost),
        unlockedIds: Array.from(unlocked),
        ...(category === 'hat' ? { hatId: itemId as HatId } : {}),
        ...(category === 'neck' ? { neckId: itemId as NeckId } : {}),
        ...(category === 'nest' ? { nestId: itemId as NestId } : {}),
      };
    });
    return { ok: true, message: isUnlocked ? '已穿戴好啦！' : '解锁成功并穿戴好啦！' };
  }, []);

  const toggleRoomProp = useCallback((propId: RoomPropId) => {
    saveCareState(prev => {
      const exists = prev.roomProps.includes(propId);
      return {
        ...prev,
        roomProps: exists ? prev.roomProps.filter(p => p !== propId) : [...prev.roomProps, propId],
      };
    });
  }, []);

  const rewardInteraction = useCallback((kind: 'tap' | 'talk' | 'run' | 'listen') => {
    const coinBonus = kind === 'listen' ? 5 : kind === 'run' ? 4 : 2;
    const moodBonus = kind === 'listen' ? 4 : 3;
    saveCareState(prev => ({
      ...prev,
      coins: clamp(prev.coins + coinBonus, 0, 99999),
      mood: clamp(prev.mood + moodBonus, 40, 100),
      daily: {
        ...prev.daily,
        touchCount: kind === 'tap' || kind === 'talk' ? prev.daily.touchCount + 1 : prev.daily.touchCount,
        playCount: kind === 'run' ? prev.daily.playCount + 1 : prev.daily.playCount,
      },
    }));
  }, []);

  const claimDailyReward = useCallback((): { ok: boolean; message: string } => {
    const current = loadCareState();
    const d = current.daily;
    if (d.rewardClaimed) return { ok: false, message: '今天的心愿礼盒已经领过啦，明天再来吧～' };
    if (d.touchCount < 2 || d.feedCount < 1 || d.playCount < 1) {
      return { ok: false, message: '先完成今天的小心愿（摸摸 2 次、喂食 1 次、陪玩 1 次），就能拆礼盒啦！' };
    }
    saveCareState(prev => ({
      ...prev,
      coins: clamp(prev.coins + 60, 0, 99999),
      mood: 100,
      daily: { ...prev.daily, rewardClaimed: true },
    }));
    return { ok: true, message: '🎁 拆开今日小确幸礼盒！获得 +60 枚音符糖币，心情值拉满！' };
  }, []);

  const startFocusTimer = useCallback((minutes: number) => {
    saveCareState(prev => ({
      ...prev,
      focusMinutes: minutes,
      focusEndAt: Date.now() + minutes * 60000,
    }));
  }, []);

  const cancelFocusTimer = useCallback(() => {
    saveCareState(prev => ({ ...prev, focusEndAt: null }));
  }, []);

  const completeFocusTimer = useCallback(() => {
    saveCareState(prev => ({
      ...prev,
      focusEndAt: null,
      coins: clamp(prev.coins + 35, 0, 99999),
      mood: clamp(prev.mood + 15, 40, 100),
      daily: { ...prev.daily, FocusDoneCount: prev.daily.FocusDoneCount + 1 },
    }));
  }, []);

  const playRockPaperScissors = useCallback((userChoice: 'rock' | 'scissors' | 'paper'): { outcome: 'win' | 'draw' | 'lose'; message: string; coinDelta: number } => {
    const moves: ('rock' | 'scissors' | 'paper')[] = ['rock', 'scissors', 'paper'];
    const labels: Record<'rock' | 'scissors' | 'paper', string> = { rock: '✊ 石头', scissors: '✌️ 剪刀', paper: '🖐️ 布' };
    const petChoice = moves[Math.floor(Math.random() * moves.length)];
    const outcome: 'win' | 'draw' | 'lose' =
      userChoice === petChoice ? 'draw'
      : (userChoice === 'rock' && petChoice === 'scissors') || (userChoice === 'scissors' && petChoice === 'paper') || (userChoice === 'paper' && petChoice === 'rock')
        ? 'win' : 'lose';
    const coinDelta = outcome === 'win' ? 15 : outcome === 'draw' ? 5 : 3;
    const moodDelta = outcome === 'win' ? 8 : 4;
    saveCareState(prev => ({
      ...prev,
      coins: clamp(prev.coins + coinDelta, 0, 99999),
      mood: clamp(prev.mood + moodDelta, 40, 100),
      totalPlayCount: prev.totalPlayCount + 1,
      daily: { ...prev.daily, playCount: prev.daily.playCount + 1 },
    }));
    const msg = outcome === 'win'
      ? `🎉 你出${labels[userChoice]}，伙伴出${labels[petChoice]}！你赢啦，奖励 +${coinDelta} 音符币！`
      : outcome === 'draw'
        ? `🤝 默契满分！两边都出了${labels[userChoice]}，平局奖励 +${coinDelta} 音符币～`
        : `😸 伙伴出了${labels[petChoice]}小胜一局！送你 +${coinDelta} 枚安慰糖币～`;
    return { outcome, message: msg, coinDelta };
  }, []);

  const spinLuckyGacha = useCallback((): { ok: boolean; message: string } => {
    const current = loadCareState();
    if (current.coins < 30) {
      return { ok: false, message: '扭蛋机每次需要 30 枚音符币，先和伙伴猜拳或摸摸它攒点糖币吧～' };
    }
    const candidates: { key: string; category: 'hat' | 'neck' | 'nest'; id: string; name: string; emoji: string }[] = [];
    for (const h of HAT_ITEMS) if (h.cost > 0 && !current.unlockedIds.includes(`hat:${h.id}`)) candidates.push({ key: `hat:${h.id}`, category: 'hat', id: h.id, name: h.name, emoji: h.emoji });
    for (const n of NECK_ITEMS) if (n.cost > 0 && !current.unlockedIds.includes(`neck:${n.id}`)) candidates.push({ key: `neck:${n.id}`, category: 'neck', id: n.id, name: n.name, emoji: n.emoji });
    for (const s of NEST_ITEMS) if (s.cost > 0 && !current.unlockedIds.includes(`nest:${s.id}`)) candidates.push({ key: `nest:${s.id}`, category: 'nest', id: s.id, name: s.name, emoji: s.emoji });

    if (candidates.length > 0 && Math.random() < 0.72) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      saveCareState(prev => {
        const unlocked = new Set(prev.unlockedIds);
        unlocked.add(pick.key);
        return {
          ...prev,
          coins: Math.max(0, prev.coins - 30),
          mood: 100,
          unlockedIds: Array.from(unlocked),
          ...(pick.category === 'hat' ? { hatId: pick.id as HatId } : {}),
          ...(pick.category === 'neck' ? { neckId: pick.id as NeckId } : {}),
          ...(pick.category === 'nest' ? { nestId: pick.id as NestId } : {}),
        };
      });
      return { ok: true, message: `🎊 欧气爆发！扭蛋抽中了「${pick.emoji} ${pick.name}」并已自动为您换上！` };
    }
    const jackpot = 45 + Math.floor(Math.random() * 44);
    saveCareState(prev => ({
      ...prev,
      coins: clamp(prev.coins - 30 + jackpot, 0, 99999),
      mood: 100,
    }));
    return { ok: true, message: `✨ 扭出闪耀糖果福袋！获得 ${jackpot} 枚音符糖币（净赚 +${jackpot - 30} 币），心情值满格！` };
  }, []);

  return {
    care,
    updateCare,
    feedSnack,
    playWithToy,
    equipOrUnlock,
    toggleRoomProp,
    rewardInteraction,
    claimDailyReward,
    startFocusTimer,
    cancelFocusTimer,
    completeFocusTimer,
    playRockPaperScissors,
    spinLuckyGacha,
  };
}

export function careStatusSummary(care: PetCareState): string {
  if (care.focusEndAt && care.focusEndAt > Date.now()) return '🍅 正在安静陪你专注中';
  if (care.satiety >= 85 && care.mood >= 88) return '吃饱喝足 · 幸福冒泡';
  if (care.satiety < 60) return '肚肚微饿 · 想吃小零嘴';
  if (care.mood >= 80) return '心情明朗 · 摇尾巴中';
  return '安静陪伴 · 求摸摸头';
}
