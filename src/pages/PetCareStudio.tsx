import React, { useEffect, useState } from 'react';
import {
  HAT_ITEMS,
  NECK_ITEMS,
  NEST_ITEMS,
  ROOM_BG_ITEMS,
  ROOM_PROP_ITEMS,
  SNACK_ITEMS,
  TOY_ITEMS,
  careStatusSummary,
  computePetLevel,
  type PetCareState,
  type RoomPropId,
  type SnackId,
  type SnackItem,
  type ToyId,
  type ToyItem,
} from '../pet/careSystem';

interface StudioProps {
  care: PetCareState;
  affection?: number;
  onFeedSnack: (snackId: SnackId) => { ok: boolean; snack: SnackItem; reason?: string };
  onPlayToy: (toyId: ToyId) => { ok: boolean; toy: ToyItem; reason?: string };
  onEquipOrUnlock: (category: 'hat' | 'neck' | 'nest', itemId: string, cost: number) => { ok: boolean; message: string };
  onSelectRoomBg: (bgId: PetCareState['roomBgId']) => void;
  onToggleRoomProp: (propId: RoomPropId) => void;
  onAdjustOutfit: (patch: { hatOffsetY?: number; outfitScale?: number }) => void;
  onClaimDaily: () => { ok: boolean; message: string };
  onStartFocus: (minutes: number) => void;
  onCancelFocus: () => void;
  onToggleDrinkReminder: () => void;
  onPlayRPS?: (choice: 'rock' | 'scissors' | 'paper') => { outcome: 'win' | 'draw' | 'lose'; message: string; coinDelta: number };
  onSpinGacha?: () => { ok: boolean; message: string };
  onNotify?: (msg: string) => void;
}

export function formatFocusRemaining(endAt: number | null, now = Date.now()): string | null {
  if (!endAt || endAt <= now) return null;
  const totalSec = Math.max(0, Math.ceil((endAt - now) / 1000));
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export const PetCareStudio: React.FC<StudioProps> = ({
  care,
  affection = 30,
  onFeedSnack,
  onPlayToy,
  onEquipOrUnlock,
  onSelectRoomBg,
  onToggleRoomProp,
  onAdjustOutfit,
  onClaimDaily,
  onStartFocus,
  onCancelFocus,
  onToggleDrinkReminder,
  onPlayRPS,
  onSpinGacha,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'snacks' | 'outfits' | 'nest' | 'wishes'>('snacks');
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!care.focusEndAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [care.focusEndAt]);

  const showToast = (text: string) => {
    setToast(text);
    onNotify?.(text);
  };

  const levelInfo = computePetLevel(care, affection);
  const focusLeft = formatFocusRemaining(care.focusEndAt, now);
  const daily = care.daily;
  const quest1Done = daily.touchCount >= 2;
  const quest2Done = daily.feedCount >= 1;
  const quest3Done = daily.playCount >= 1;
  const allQuestsDone = quest1Done && quest2Done && quest3Done;

  return (
    <div className="care-studio-card" aria-label="宠物养成小窝">
      <div className="care-level-banner">
        <div className="level-badge-pill">
          <span className="level-glyph">{levelInfo.badge}</span>
          <div>
            <strong>Lv.{levelInfo.level} · {levelInfo.title}</strong>
            <small>陪伴成长值 {levelInfo.exp} · 距离下一阶还差 {Math.max(0, levelInfo.next - levelInfo.exp)}</small>
          </div>
        </div>
        <div className="care-coin-badge" title="听歌与日常互动都会自动掉落音符糖币">
          <span className="coin-icon">🪙</span>
          <div>
            <strong>{care.coins}</strong>
            <small>音符糖币</small>
          </div>
        </div>
      </div>

      <div className="care-status-header">
        <div className="care-vitals">
          <div className="vital-pill">
            <span className="vital-label">🍓 饱食度</span>
            <div className="vital-bar">
              <span className="vital-fill is-satiety" style={{ width: `${care.satiety}%` }} />
            </div>
            <strong>{care.satiety}%</strong>
          </div>
          <div className="vital-pill">
            <span className="vital-label">💛 心情值</span>
            <div className="vital-bar">
              <span className="vital-fill is-mood" style={{ width: `${care.mood}%` }} />
            </div>
            <strong>{care.mood}%</strong>
          </div>
        </div>
      </div>

      <div className="care-subtabs is-four" role="tablist" aria-label="养成玩法分类">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'snacks'}
          className={subTab === 'snacks' ? 'is-active' : ''}
          onClick={() => setSubTab('snacks')}
        >
          <span>🍰 投喂陪玩</span>
          <small>甜品与小玩具</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'outfits'}
          className={subTab === 'outfits' ? 'is-active' : ''}
          onClick={() => setSubTab('outfits')}
        >
          <span>🎀 换装衣橱</span>
          <small>头饰与微调</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'nest'}
          className={subTab === 'nest' ? 'is-active' : ''}
          onClick={() => setSubTab('nest')}
        >
          <span>🛋️ 打造小窝</span>
          <small>底座与房间</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'wishes'}
          className={subTab === 'wishes' ? 'is-active' : ''}
          onClick={() => setSubTab('wishes')}
        >
          <span>🎁 心愿专注</span>
          <small>{focusLeft ? `🍅 ${focusLeft}` : allQuestsDone && !daily.rewardClaimed ? '可领礼盒!' : '日常与番茄钟'}</small>
        </button>
      </div>

      {toast && <div className="care-mini-toast" role="status">{toast}</div>}

      {subTab === 'snacks' && (
        <div className="care-outfits-section">
          <h4 className="care-subtitle">🍰 治愈零食柜（投喂增加饱食度、心情与好感）</h4>
          <div className="care-grid snacks-grid">
            {SNACK_ITEMS.map(item => {
              const isSelected = care.selectedSnackId === item.id;
              return (
                <div key={item.id} className={`care-item-card ${isSelected ? 'is-equipped' : ''}`}>
                  <div className="care-item-top">
                    <span className="care-emoji">{item.emoji}</span>
                    <div className="care-item-title">
                      <strong>{item.name}</strong>
                      <small>{item.desc}</small>
                    </div>
                    <span className={`care-price-tag ${item.cost === 0 ? 'is-free' : ''}`}>
                      {item.cost === 0 ? '免费无限' : `🪙 ${item.cost}`}
                    </span>
                  </div>
                  <div className="care-item-bottom">
                    <span className="care-boost-tags">
                      <em>饱食 +{item.satiety}</em>
                      <em>心情 +{item.mood}</em>
                    </span>
                    <button
                      type="button"
                      className="care-action-btn"
                      onClick={() => {
                        const res = onFeedSnack(item.id);
                        showToast(res.reason || `投喂了「${res.snack.name}」：${res.snack.line}`);
                      }}
                    >
                      喂给它吃
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <h4 className="care-subtitle">🎾 趣味小玩具箱（逗它开心玩耍，触发桌面特效）</h4>
          <div className="care-grid snacks-grid">
            {TOY_ITEMS.map(toy => {
              const isSelected = care.selectedToyId === toy.id;
              return (
                <div key={toy.id} className={`care-item-card ${isSelected ? 'is-equipped' : ''}`}>
                  <div className="care-item-top">
                    <span className="care-emoji">{toy.emoji}</span>
                    <div className="care-item-title">
                      <strong>{toy.name}</strong>
                      <small>{toy.desc}</small>
                    </div>
                    <span className={`care-price-tag ${toy.cost === 0 ? 'is-free' : ''}`}>
                      {toy.cost === 0 ? '免费畅玩' : `🪙 ${toy.cost}`}
                    </span>
                  </div>
                  <div className="care-item-bottom">
                    <span className="care-boost-tags">
                      <em>心情 +{toy.mood}</em>
                      <em>回馈 +4币</em>
                    </span>
                    <button
                      type="button"
                      className="care-action-btn"
                      onClick={() => {
                        const res = onPlayToy(toy.id);
                        showToast(res.reason || `拿出「${res.toy.name}」：${res.toy.line}`);
                      }}
                    >
                      陪它玩耍
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'outfits' && (
        <div className="care-outfits-section">
          <h4 className="care-subtitle">👑 头饰与眼镜（跟随动作呼吸摆动）</h4>
          <div className="care-grid outfits-grid">
            {HAT_ITEMS.map(item => {
              const key = `hat:${item.id}`;
              const unlocked = item.cost === 0 || care.unlockedIds.includes(key);
              const equipped = care.hatId === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`care-choice-card ${equipped ? 'is-equipped' : ''}`}
                  onClick={() => {
                    const res = onEquipOrUnlock('hat', item.id, item.cost);
                    showToast(`「${item.name}」：${res.message}`);
                  }}
                >
                  <span className="care-emoji">{item.emoji}</span>
                  <div className="care-choice-info">
                    <strong>{item.name}</strong>
                    <small>{item.desc}</small>
                  </div>
                  <span className={`care-state-pill ${equipped ? 'is-on' : unlocked ? 'is-owned' : 'is-locked'}`}>
                    {equipped ? '佩戴中' : unlocked ? '穿戴' : `🪙 ${item.cost}`}
                  </span>
                </button>
              );
            })}
          </div>

          <h4 className="care-subtitle">🧣 颈饰与随身小包</h4>
          <div className="care-grid outfits-grid">
            {NECK_ITEMS.map(item => {
              const key = `neck:${item.id}`;
              const unlocked = item.cost === 0 || care.unlockedIds.includes(key);
              const equipped = care.neckId === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`care-choice-card ${equipped ? 'is-equipped' : ''}`}
                  onClick={() => {
                    const res = onEquipOrUnlock('neck', item.id, item.cost);
                    showToast(`「${item.name}」：${res.message}`);
                  }}
                >
                  <span className="care-emoji">{item.emoji}</span>
                  <div className="care-choice-info">
                    <strong>{item.name}</strong>
                    <small>{item.desc}</small>
                  </div>
                  <span className={`care-state-pill ${equipped ? 'is-on' : unlocked ? 'is-owned' : 'is-locked'}`}>
                    {equipped ? '佩戴中' : unlocked ? '穿戴' : `🪙 ${item.cost}`}
                  </span>
                </button>
              );
            })}
          </div>

          <h4 className="care-subtitle">📐 配饰佩戴位置与大小微调（适配任意自定义伙伴）</h4>
          <div className="care-adjust-box">
            <div className="care-adjust-row">
              <span>头饰高低 ({care.hatOffsetY > 0 ? `+${care.hatOffsetY}` : care.hatOffsetY}px)</span>
              <input
                type="range"
                min="-28"
                max="28"
                step="2"
                value={care.hatOffsetY}
                aria-label="头饰高低微调"
                onChange={e => onAdjustOutfit({ hatOffsetY: Number(e.target.value) })}
              />
            </div>
            <div className="care-adjust-row">
              <span>配饰大小 ({Math.round(care.outfitScale * 100)}%)</span>
              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={care.outfitScale}
                aria-label="配饰大小微调"
                onChange={e => onAdjustOutfit({ outfitScale: Number(e.target.value) })}
              />
              <button
                type="button"
                className="care-reset-btn"
                onClick={() => onAdjustOutfit({ hatOffsetY: 0, outfitScale: 1 })}
              >
                重置
              </button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'nest' && (
        <div className="care-outfits-section">
          <h4 className="care-subtitle">🛋️ 桌面随身小窝底座（直接显示在桌面脚下）</h4>
          <div className="care-grid outfits-grid">
            {NEST_ITEMS.map(item => {
              const key = `nest:${item.id}`;
              const unlocked = item.cost === 0 || care.unlockedIds.includes(key);
              const equipped = care.nestId === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`care-choice-card ${equipped ? 'is-equipped' : ''}`}
                  onClick={() => {
                    const res = onEquipOrUnlock('nest', item.id, item.cost);
                    showToast(`「${item.name}」：${res.message}`);
                  }}
                >
                  <span className="care-emoji">{item.emoji}</span>
                  <div className="care-choice-info">
                    <strong>{item.name}</strong>
                    <small>{item.desc}</small>
                  </div>
                  <span className={`care-state-pill ${equipped ? 'is-on' : unlocked ? 'is-owned' : 'is-locked'}`}>
                    {equipped ? '使用中' : unlocked ? '布置' : `🪙 ${item.cost}`}
                  </span>
                </button>
              );
            })}
          </div>

          <h4 className="care-subtitle">🪟 小屋窗景氛围（右侧房间背景）</h4>
          <div className="care-grid outfits-grid">
            {ROOM_BG_ITEMS.map(bg => {
              const active = care.roomBgId === bg.id;
              return (
                <button
                  type="button"
                  key={bg.id}
                  className={`care-choice-card ${active ? 'is-equipped' : ''}`}
                  onClick={() => {
                    onSelectRoomBg(bg.id);
                    showToast(`房间窗景已切换为「${bg.name}」`);
                  }}
                >
                  <span className="care-emoji">{bg.emoji}</span>
                  <div className="care-choice-info">
                    <strong>{bg.name}</strong>
                    <small>{bg.desc}</small>
                  </div>
                  <span className={`care-state-pill ${active ? 'is-on' : 'is-owned'}`}>
                    {active ? '当前窗景' : '切换'}
                  </span>
                </button>
              );
            })}
          </div>

          <h4 className="care-subtitle">🪴 房间温馨家具摆件（可多选组合）</h4>
          <div className="care-grid outfits-grid">
            {ROOM_PROP_ITEMS.map(prop => {
              const active = care.roomProps.includes(prop.id);
              return (
                <button
                  type="button"
                  key={prop.id}
                  className={`care-choice-card ${active ? 'is-equipped' : ''}`}
                  onClick={() => {
                    onToggleRoomProp(prop.id);
                    showToast(`${active ? '已收起' : '已摆放'}「${prop.name}」`);
                  }}
                >
                  <span className="care-emoji">{prop.emoji}</span>
                  <div className="care-choice-info">
                    <strong>{prop.name}</strong>
                    <small>{prop.desc}</small>
                  </div>
                  <span className={`care-state-pill ${active ? 'is-on' : 'is-owned'}`}>
                    {active ? '已摆放' : '摆放'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'wishes' && (
        <div className="care-outfits-section">
          <h4 className="care-subtitle">🎁 今日小确幸心愿单（完成 3 个小互动即可拆礼盒）</h4>
          <div className="care-quest-box">
            <div className="quest-list">
              <div className={`quest-row ${quest1Done ? 'is-done' : ''}`}>
                <span>{quest1Done ? '✅' : '🌱'} 摸摸头或和它说句话（{Math.min(2, daily.touchCount)} / 2）</span>
                <em>{quest1Done ? '已达成' : '进行中'}</em>
              </div>
              <div className={`quest-row ${quest2Done ? 'is-done' : ''}`}>
                <span>{quest2Done ? '✅' : '🍰'} 投喂 1 份美味零嘴（{Math.min(1, daily.feedCount)} / 1）</span>
                <em>{quest2Done ? '已达成' : '进行中'}</em>
              </div>
              <div className={`quest-row ${quest3Done ? 'is-done' : ''}`}>
                <span>{quest3Done ? '✅' : '🎾'} 陪玩玩具或跑一圈（{Math.min(1, daily.playCount)} / 1）</span>
                <em>{quest3Done ? '已达成' : '进行中'}</em>
              </div>
            </div>
            <button
              type="button"
              className="care-action-btn quest-claim-btn"
              disabled={daily.rewardClaimed}
              onClick={() => {
                const res = onClaimDaily();
                showToast(res.message);
              }}
            >
              {daily.rewardClaimed ? '🎉 今日心愿礼盒已领取' : '🎁 拆开今日礼盒 (+60 🪙)'}
            </button>
          </div>

          <h4 className="care-subtitle">🍅 陪伴专注小番茄钟（安静陪你学习工作，完成奖励 +35 🪙）</h4>
          <div className="care-focus-box">
            {focusLeft ? (
              <div className="focus-running-row">
                <div>
                  <strong>🍅 正在安静陪你专注中 · 剩余 {focusLeft}</strong>
                  <small>结束后伙伴会欢呼提醒你休息，并送上 35 枚音符糖币！</small>
                </div>
                <button type="button" className="care-reset-btn" onClick={() => { onCancelFocus(); showToast('已结束本次专注计时，休息一下吧～'); }}>
                  提前结束
                </button>
              </div>
            ) : (
              <div className="focus-preset-row">
                {[15, 25, 45].map(mins => (
                  <button
                    type="button"
                    key={mins}
                    className="care-choice-card focus-btn"
                    onClick={() => {
                      onStartFocus(mins);
                      showToast(`🍅 已开启 ${mins} 分钟陪伴专注，加油哦！`);
                    }}
                  >
                    <span className="care-emoji">🍅</span>
                    <div className="care-choice-info">
                      <strong>专注 {mins} 分钟</strong>
                      <small>{mins === 15 ? '轻度小冲刺' : mins === 25 ? '标准番茄钟' : '深度沉浸陪伴'}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="drink-reminder-row">
              <span>💧 贴心喝水与伸懒腰提醒（每 45 分钟温柔冒泡提醒一次）</span>
              <button
                type="button"
                className={`care-state-pill ${care.drinkReminder ? 'is-on' : 'is-owned'}`}
                onClick={() => {
                  onToggleDrinkReminder();
                  showToast(care.drinkReminder ? '已关闭定时喝水提醒' : '💧 已开启温柔喝水提醒');
                }}
              >
                {care.drinkReminder ? '已开启' : '已关闭'}
              </button>
            </div>
          </div>

          <h4 className="care-subtitle">🎲 快乐游艺机 · 和伙伴猜拳 & 幸运盲盒扭蛋</h4>
          <div className="care-quest-box">
            <div className="rps-game-row">
              <div className="care-choice-info">
                <strong>✊✌️🖐️ 石头剪刀布（免消耗 · 赢了 +15 🪙）</strong>
                <small>选一个出拳，不管输赢伙伴都会开心陪你玩并送出糖币奖励～</small>
              </div>
              <div className="rps-btn-group">
                {([
                  { id: 'rock', label: '✊ 石头' },
                  { id: 'scissors', label: '✌️ 剪刀' },
                  { id: 'paper', label: '🖐️ 布' },
                ] as const).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="care-action-btn rps-btn"
                    onClick={() => {
                      if (!onPlayRPS) return;
                      const res = onPlayRPS(item.id);
                      showToast(res.message);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="gacha-machine-row">
              <div className="care-choice-info">
                <strong>🎰 幸运盲盒扭蛋机（30 🪙 / 次）</strong>
                <small>高概率直接抽中未解锁的限定头饰、围巾或小窝，或爆出最高 88 🪙 糖果福袋！</small>
              </div>
              <button
                type="button"
                className="care-action-btn gacha-btn"
                onClick={() => {
                  if (!onSpinGacha) return;
                  const res = onSpinGacha();
                  showToast(res.message);
                }}
              >
                🎰 扭一发 (30 🪙)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const RoomDecorBackdrop: React.FC<{ care: PetCareState; isPlaying: boolean; affection?: number }> = ({ care, isPlaying, affection = 30 }) => {
  const lv = computePetLevel(care, affection);
  return (
    <div className={`room-decor-backdrop is-bg-${care.roomBgId}`} aria-hidden="true">
      <div className="room-window-frame">
        <div className="room-window-sky" />
        <div className="room-window-pane" />
      </div>
      <div className="room-floor-board" />
      {care.roomProps.includes('lamp') && (
        <div className="room-prop prop-lamp" title="奶油蘑菇小夜灯">
          <span className="lamp-glow" />
          <span className="prop-glyph">🏮</span>
        </div>
      )}
      {care.roomProps.includes('plant') && (
        <div className="room-prop prop-plant" title="治愈龟背竹盆栽">
          <span className="prop-glyph">🪴</span>
        </div>
      )}
      {care.roomProps.includes('speaker') && (
        <div className={`room-prop prop-speaker ${isPlaying ? 'is-playing' : ''}`} title="复古黑胶留声机">
          <span className="prop-glyph">📻</span>
          {isPlaying && <span className="speaker-note">♪</span>}
        </div>
      )}
      {care.roomProps.includes('plush') && (
        <div className="room-prop prop-plush" title="焦糖泰迪熊">
          <span className="prop-glyph">🧸</span>
        </div>
      )}
      <div className="room-status-ribbon">
        <span>{lv.badge} Lv.{lv.level}</span>
        <span>🍓 {care.satiety}%</span>
        <span>💛 {care.mood}%</span>
        <span>🪙 {care.coins}</span>
      </div>
      <div className="room-mood-tag">{careStatusSummary(care)}</div>
    </div>
  );
};

interface DesktopDrawerProps {
  care: PetCareState;
  open: boolean;
  onToggleOpen: () => void;
  onFeedSnack: (snackId: SnackId) => void;
  onPlayToy: (toyId: ToyId) => void;
  onQuickCycleOutfit: () => void;
  onQuickCycleNest: () => void;
}

export const DesktopCareBar: React.FC<DesktopDrawerProps> = ({
  care,
  open,
  onToggleOpen,
  onFeedSnack,
  onPlayToy,
  onQuickCycleOutfit,
  onQuickCycleNest,
}) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!care.focusEndAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [care.focusEndAt]);

  const currentSnack = SNACK_ITEMS.find(s => s.id === care.selectedSnackId) || SNACK_ITEMS[0];
  const focusLeft = formatFocusRemaining(care.focusEndAt, now);

  return (
    <div className="desktop-care-wrap" data-pet-interactive="true">
      {open && (
        <div className="desktop-care-popover" role="dialog" aria-label="快捷投喂与换装">
          <div className="desktop-care-popover-head">
            <span>🍓 饱食 {care.satiety}%</span>
            <span>💛 心情 {care.mood}%</span>
            <span>🪙 {care.coins}</span>
          </div>
          <div className="desktop-snack-row">
            {SNACK_ITEMS.map(item => (
              <button
                type="button"
                key={item.id}
                className={`desktop-snack-btn ${care.selectedSnackId === item.id ? 'is-selected' : ''}`}
                title={`投喂${item.name} (${item.cost === 0 ? '免费' : `${item.cost}币`})`}
                onClick={() => onFeedSnack(item.id)}
              >
                <span>{item.emoji}</span>
                <small>{item.name.slice(0, 2)}</small>
              </button>
            ))}
          </div>
          <div className="desktop-toy-row">
            {TOY_ITEMS.map(toy => (
              <button
                type="button"
                key={toy.id}
                className="desktop-toy-btn"
                title={`玩${toy.name}`}
                onClick={() => onPlayToy(toy.id)}
              >
                <span>{toy.emoji}</span>
                <small>{toy.name.slice(0, 3)}</small>
              </button>
            ))}
          </div>
          <div className="desktop-quick-switches">
            <button type="button" onClick={onQuickCycleOutfit} title="切换头饰与围巾搭配">
              🎀 换一身装扮
            </button>
            <button type="button" onClick={onQuickCycleNest} title="切换脚下的桌面小窝">
              🛋️ 换个小窝
            </button>
          </div>
        </div>
      )}
      <div className="desktop-care-pill">
        <button
          type="button"
          className={`care-pill-toggle ${open ? 'is-open' : ''}`}
          onClick={onToggleOpen}
          title="打开迷你零食柜、小玩具与换装抽屉"
        >
          <span>{focusLeft ? '🍅' : currentSnack.emoji}</span>
          <span>{focusLeft ? `专注 ${focusLeft}` : '养成小窝'}</span>
          <em>🪙 {care.coins}</em>
        </button>
      </div>
    </div>
  );
};
