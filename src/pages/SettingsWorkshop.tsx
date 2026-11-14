import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Check, ChevronRight, Fish, Footprints, Heart, House, MessageCircle, Moon, Music2, PackageOpen, Pause, Plus, Settings2, Sun, Trash2, Upload, Volume2, X, Cat } from 'lucide-react';
import './SettingsWorkshop.css';
import { WhalePetCanvas } from '../pet/WhalePetCanvas';
import { SpritePetCanvas } from '../pet/SpritePetCanvas';
import { LINGMA_PREVIEW, LINGMA_SPRITE } from '../pet/lingma';
import { HDWhaleGirlCanvas, HD_WHALE_PREVIEW } from '../pet/HDWhaleGirlCanvas';
import { CompanionJournal } from './CompanionJournal';
import { emptyMemory, relationship } from '../../electron/companion-state';
import { canSyncLyrics } from '../../electron/media-state';
import { ProceduralPetCanvas, type PetRendererHandle } from '../pet/ProceduralPetCanvas';
import { VideoPackRenderer } from '../pet/VideoPackRenderer';
import { usePetCare } from '../pet/careSystem';
import { PetNestCanvas, PetOutfitCanvas } from '../pet/PetCareOverlay';
import { PetCareStudio, RoomDecorBackdrop } from './PetCareStudio';
import type { AudioFrame, MotionState, PetActionKey, PetCommand, PetPack, PetSettings, PetThemePreset, SpeechState, VoiceInfo, SmtcState } from '../types';

const TABS = [
  { id: 'home', label: '相处日常', icon: House },
  { id: 'memory', label: '相处日记', icon: BookOpen },
  { id: 'sound', label: '声音与听歌', icon: Volume2 },
  { id: 'look', label: '外观与桌面', icon: Settings2 },
  { id: 'packs', label: '伙伴库', icon: PackageOpen },
] as const;
const THEMES: { id: PetThemePreset; name: string; note: string; color: string }[] = [
  { id: 'whalegirl', name: 'DeepSeek 鲸娘', note: '圆圆脸、蓝色长发与鲸尾', color: '#91bef8' },
  { id: 'lingma', name: '灵码小狐狸', note: '奶白毛色、青蓝眼睛与尾尖', color: '#53a5bd' },
  { id: 'whale', name: '泡泡小鲸鱼', note: '蓝蓝的，圆圆的', color: '#91bef8' },
  { id: 'nyan', name: '奶油猫', note: '软乎乎的老朋友', color: '#efdbc4' },
  { id: 'cyber', name: '电音喵', note: '戴上耳机就出发', color: '#687694' },
  { id: 'mochi', name: '桃子团', note: '一团粉色好心情', color: '#efb9ca' },
];
const SLOTS: { key: PetActionKey; label: string }[] = [
  { key: 'idle', label: '待机' }, { key: 'walk', label: '跑动' }, { key: 'playing', label: '听歌' },
  { key: 'happy', label: '吃饱开心' }, { key: 'tap', label: '摸摸' }, { key: 'drag', label: '被拎起来' }, { key: 'sleep', label: '睡觉' }, { key: 'chorus', label: '强节奏' },
];

function WhaleMark({ size = 28 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 40 36" fill="none" aria-hidden="true">
    <path d="M28 20c4 0 4-6 9-7 1 4-1 8-5 9-2 9-11 13-21 10C-1 27 0 14 6 8c10-9 27-1 22 12Z" fill="currentColor" />
    <path d="M5 23c6-4 13 5 23 0-3 8-19 11-23 0Z" fill="#e8f3ff" /><circle cx="10" cy="17" r="1.5" fill="#254770" /><circle cx="20" cy="17" r="1.5" fill="#254770" />
    <path d="M13 22q2 2 4 0" stroke="#254770" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M15 7q-1-6-5-4m5 4q2-7 5-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>;
}

function SpriteAvatar({ url, size = 42 }: { url: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 192, 208, 0, 0, canvas.width, canvas.height);
    };
    img.src = url;
    return () => { alive = false; };
  }, [url]);
  return <canvas ref={ref} className="sprite-avatar-thumb" width={size} height={Math.round(size * 208 / 192)} aria-hidden="true" />;
}

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return <div className="setting-row"><div className="setting-label"><span>{label}</span>{hint && <small>{hint}</small>}</div>
    <button type="button" className="switch" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={onChange}><span /></button>
  </div>;
}

export const SettingsWorkshop: React.FC = () => {
  const [settings, setSettings] = useState<PetSettings | null>(null);
  const [packs, setPacks] = useState<PetPack[]>([]);
  const [tab, setTab] = useState<typeof TABS[number]['id']>('home');
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [speech, setSpeech] = useState<SpeechState>({ status: 'idle' });
  const [motion, setMotion] = useState<MotionState>({ moving: false, direction: -1, pace: 'walk' });
  const [previewAction, setPreviewAction] = useState<PetActionKey>('idle');
  const [responseText, setResponseText] = useState('');
  const [memory, setMemory] = useState(emptyMemory);
  const [media, setMedia] = useState<SmtcState>({ event: 'state' });
  const [name, setName] = useState('');
  const [packName, setPackName] = useState('');
  const [files, setFiles] = useState<Partial<Record<PetActionKey, string>>>({});
  const [corpus, setCorpus] = useState('');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [pendingDelete, setPendingDelete] = useState('');
  const { care, updateCare, feedSnack, playWithToy, equipOrUnlock, toggleRoomProp, claimDailyReward, startFocusTimer, cancelFocusTimer, playRockPaperScissors, spinLuckyGacha } = usePetCare();
  const renderer = useRef<PetRendererHandle | null>(null);
  const timer = useRef(0);
  const saveTimer = useRef(0);
  const saveRequest = useRef(0);
  const captionTimer = useRef(0);
  const audio = useRef<AudioFrame>({ active: false, bass: 0, mid: 0, treble: 0, beatPulse: 0, energy: 0, bins: [] });
  const cursor = useRef({ dx: 0, dy: 0 });
  const tilt = useRef(0);

  useEffect(() => {
    document.body.classList.add('settings-mode');
    const api = window.melodyPet;
    let mounted = true;
    void api.getSettings().then(next => { if (mounted) { setSettings(next); setName(next.petName); } })
      .catch(() => { if (mounted) setError('小屋暂时没有打开，请重试。'); });
    void api.listPacks().then(list => { if (mounted) setPacks(list); });
    void api.getVoices().then(list => { if (mounted) setVoices(list); }).catch(() => {}).finally(() => { if (mounted) setVoicesLoading(false); });
    void api.getSpeechState().then(state => { if (mounted) setSpeech(state); });
    void api.getCompanionMemory().then(value => { if (mounted) setMemory(value); });
    void api.getSmtcState().then(value => { if (mounted) setMedia(value); });
    const unsub = [api.onSettingsChanged(setSettings), api.onPacksChanged(setPacks), api.onSpeechState(setSpeech), api.onMotionChanged(setMotion),
      api.onSmtcState(setMedia),
      api.onCompanionMemory(value => { setMemory(value); if (!value.firstAt) setResponseText(''); }),
      api.onPetResponse(response => {
        renderer.current?.triggerReaction(response.reaction);
        setPreviewAction(response.reaction === 'feed' ? 'happy' : 'tap');
        setResponseText(response.text);
        window.clearTimeout(timer.current); window.clearTimeout(captionTimer.current);
        timer.current = window.setTimeout(() => setPreviewAction('idle'), response.duration);
        captionTimer.current = window.setTimeout(() => setResponseText(''), 6000);
      }),
      api.onMenuAction(action => {
        if (action === 'sleep') { window.clearTimeout(timer.current); setResponseText(''); setPreviewAction('sleep'); }
        else if (action === 'wake' || action === 'run' || action === 'talk') {
          renderer.current?.cancelReaction?.();
          window.clearTimeout(timer.current); setResponseText(''); setPreviewAction('idle');
          if (action === 'wake') renderer.current?.triggerReaction('wake');
        }
      }),
    ];
    return () => { mounted = false; unsub.forEach(fn => fn()); window.clearTimeout(timer.current); window.clearTimeout(saveTimer.current); window.clearTimeout(captionTimer.current); document.body.classList.remove('settings-mode'); };
  }, []);

  const update = async (patch: Partial<PetSettings>) => {
    const request = ++saveRequest.current;
    window.clearTimeout(saveTimer.current);
    setError(''); setSaveState('saving');
    try {
      const next = await window.melodyPet.saveSettings(patch);
      if (request !== saveRequest.current) return true;
      setSettings(next);
      saveTimer.current = window.setTimeout(() => setSaveState('saved'), 350);
      return true;
    } catch {
      if (request !== saveRequest.current) return false;
      setSaveState('error'); setError('没能保存这次设置，请再试一次。');
      return false;
    }
  };

  const act = (action: PetCommand) => {
    window.melodyPet.petAction(action);
  };

  const pickFile = async (key: PetActionKey) => {
    try {
      const selected = await window.melodyPet.selectMediaFile();
      if (selected) setFiles(previous => ({ ...previous, [key]: selected }));
    } catch { setError('文件选择没有完成，请再试一次。'); }
  };

  const importPack = async () => {
    if (!Object.values(files).some(Boolean)) { setError('先选一个待机素材，就可以带新伙伴回家。'); return; }
    setImporting(true); setError(''); setMessage('');
    try {
      const pack = await window.melodyPet.importPack({ name: packName.trim() || '我的小伙伴', files, corpus: corpus.split(/\r?\n/).map(s => s.trim()).filter(Boolean) });
      if (!await update({ activePackId: pack.id })) return;
      setFiles({}); setPackName(''); setCorpus(''); setMessage(`「${pack.name}」已经来到桌面上了。`);
    } catch { setError('导入失败。请确认素材还在原来的位置，并使用支持的格式。'); }
    finally { setImporting(false); }
  };

  const importCodex = async () => {
    setImporting(true); setError(''); setMessage('');
    try {
      const pack = await window.melodyPet.importCodexPet();
      if (!pack) return;
      const image = new Image(); image.src = pack.spritesheet!.url;
      try { await image.decode(); } catch {
        await window.melodyPet.deletePack(pack.id);
        throw new Error('图集无法解码，请重新下载完整的宠物包。');
      }
      if (!await update({ activePackId: pack.id })) return;
      setMessage(`「${pack.name}」已经来到桌面，会跟着一起跑啦。`);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': Error: /, '') : '导入没有完成，请重新选择宠物包。');
    } finally { setImporting(false); }
  };

  if (!settings) return <div className="workshop-loading" role={error ? 'alert' : 'status'}><WhaleMark size={40} /><p>{error || '正在打开小屋…'}</p>{error && <button className="button button-primary" onClick={() => window.location.reload()}>重新打开</button>}</div>;
  const activePack = packs.find(p => p.id === settings.activePackId);
  const activeSprite = activePack?.spritesheet ?? (!activePack && settings.theme === 'lingma' ? LINGMA_SPRITE : undefined);
  const effectiveAction = previewAction !== 'idle' ? previewAction : motion.moving ? 'walk' : media.status === 'Playing' ? 'playing' : 'idle';
  const voiceLabel = (voice: VoiceInfo) => {
    const known: Record<string, string> = { Yaoyao: '瑶瑶', Huihui: '慧慧', Kangkang: '康康' };
    const nickname = Object.entries(known).find(([key]) => voice.name.includes(key))?.[1];
    return nickname ? `${nickname} · 中文${voice.name.includes('Desktop') ? '（桌面）' : ''}` : `${voice.name.replace(/^Microsoft /, '')} · ${voice.lang}`;
  };
  const section = (title: string, sub: string) => <div className="panel-heading"><h2>{title}</h2><p>{sub}</p></div>;
  const selectedTheme = THEMES.find(theme => theme.id === settings.theme)!;

  const companionPreview = <aside className={`companion-card is-room-${care.roomBgId}`} aria-label="伙伴预览">
        <RoomDecorBackdrop care={care} isPlaying={media.status === 'Playing'} affection={settings.affection} />
        <div className="companion-topline"><span><span className={`online-dot ${previewAction === 'sleep' ? 'is-sleeping' : ''}`} />{previewAction === 'sleep' ? '休息中' : '在你身边'}</span><span className="companion-bond">{relationship(memory)}</span></div>
        <div className="preview-caption" aria-live="polite">{speech.status === 'speaking' ? speech.text : previewAction === 'sleep' ? '我眯一会儿，醒了再陪你。' : responseText || (motion.moving ? '小跑一下，马上回来。' : '今天，也想和你待在一起。')}</div>
        <button className="preview-pet" aria-label="摸摸伙伴" title="点一下，摸摸头" onClick={() => act('tap')}
          onPointerLeave={() => { cursor.current = { dx: 0, dy: 0 }; }}
          onPointerMove={event => { const r = event.currentTarget.getBoundingClientRect(); cursor.current = { dx: (event.clientX - r.left - r.width / 2) * 3, dy: (event.clientY - r.top - r.height / 2) * 3 }; }}>
          <PetNestCanvas preview width={286} height={316} action={effectiveAction} motion={motion} theme={settings.theme} activePackId={settings.activePackId} care={care} audioFrameRef={audio} dragTiltRef={tilt} />
          {!activePack && settings.theme === 'whalegirl' ? <HDWhaleGirlCanvas ref={renderer} preview width={286} height={316}
              action={effectiveAction} speaking={speech.status === 'speaking'} motion={motion} audioFrameRef={audio} cursorOffsetRef={cursor} dragTiltRef={tilt} />
            : activeSprite ? <SpritePetCanvas ref={renderer} preview width={286} height={316} {...activeSprite}
              action={effectiveAction} speaking={speech.status === 'speaking'} motion={motion} audioFrameRef={audio} cursorOffsetRef={cursor} dragTiltRef={tilt} />
            : activePack ? <VideoPackRenderer ref={renderer} pack={activePack} action={effectiveAction} width={286} height={316} audioFrameRef={audio} />
            : settings.theme === 'whale' ? <WhalePetCanvas ref={renderer} width={286} height={316} action={effectiveAction} speaking={speech.status === 'speaking'} motion={motion} audioFrameRef={audio} cursorOffsetRef={cursor} dragTiltRef={tilt} />
            : <ProceduralPetCanvas ref={renderer} width={286} height={316} theme={settings.theme as 'nyan' | 'cyber' | 'mochi'} action={effectiveAction} snapEdge="none" audioFrameRef={audio} cursorOffsetRef={cursor} dragTiltRef={tilt} />}
          <PetOutfitCanvas preview width={286} height={316} action={effectiveAction} motion={motion} theme={settings.theme} activePackId={settings.activePackId} care={care} audioFrameRef={audio} dragTiltRef={tilt} />
        </button>
        <div className="companion-name"><h2>{activePack?.name || settings.petName}</h2><span>{speech.status === 'speaking' ? '正在和你说话' : previewAction === 'sleep' ? '正在做一个小小的梦' : motion.moving ? '正在桌面上小跑' : activePack ? '你的桌面伙伴' : selectedTheme.name}</span></div>
        <div className="preview-actions">
          <button onClick={() => act('tap')}><Heart size={18} /><span>摸摸</span></button>
          <button onClick={() => act('feed')}><Fish size={18} /><span>喂食</span></button>
          <button onClick={() => act('talk')}><MessageCircle size={18} /><span>说句话</span></button>
          <button onClick={() => act('run')}><Footprints size={18} /><span>跑一圈</span></button>
        </div>
        <div className="affection-summary"><div><Heart size={13} /><span>亲密度</span><strong data-testid="affection">{settings.affection}</strong></div><div className="affection-track"><span style={{ width: `${Math.min(100, settings.affection / 2)}%` }} /></div><p>每一点熟悉，都慢慢积攒。</p></div>
      </aside>;

  return <main className="workshop-shell">
    <aside className="workshop-sidebar" aria-label="小屋导航">
      <div className="brand"><div className="brand-mark"><WhaleMark size={26} /></div><div><h1 title={settings.petName}>{settings.petName}</h1><p>你的桌面伙伴</p></div></div>
      <div className="sidebar-label">小屋</div>
      <nav className="workshop-tabs" aria-label="小屋设置" role="tablist" aria-orientation="vertical">{TABS.map(item => {
        const Icon = item.icon;
        return <button key={item.id} role="tab" aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} id={`tab-${item.id}`} tabIndex={tab === item.id ? 0 : -1}
          onKeyDown={event => {
            if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const current = TABS.findIndex(value => value.id === item.id);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + TABS.length) % TABS.length;
            setTab(TABS[next].id); setError(''); setMessage('');
            document.getElementById(`tab-${TABS[next].id}`)?.focus();
          }}
          onClick={() => { setTab(item.id); setError(''); setMessage(''); }}><Icon size={17} /><span>{item.label}</span></button>;
      })}</nav>
      <div className="sidebar-bottom"><button className="find-companion" onClick={() => window.melodyPet.showPet()}>找到桌面伙伴<ArrowUpRight size={15} /></button>
        <div className="local-status"><span className="online-dot" /><span>本机保存</span><span>v1.4</span></div>
      </div>
    </aside>
    <div className="workshop-content">
      <header className="workshop-header"><div className="page-location"><span>小屋</span><ChevronRight size={13} /><span>{TABS.find(item => item.id === tab)?.label}</span></div>
        <div className={`save-status ${saveState === 'error' ? 'is-error' : ''}`} role="status">{saveState === 'saved' ? <Check size={13} /> : <span className="save-dot" />}{saveState === 'saved' ? '已自动保存' : saveState === 'saving' ? '正在保存…' : '保存失败'}</div>
      </header>
      {error && <div className="inline-message is-error" role="alert">{error}</div>}
      {message && <div className="inline-message" role="status"><Check size={14} />{message}</div>}
      <div className="workshop-grid">
      <section className="workshop-panel">
        <div className="panel-scroll" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} key={tab}>
          {tab === 'home' && <>
            {section('温馨养成小窝。', '喂一点甜品零嘴，换一身可爱新衣，布置属于你们的小角落。')}
            <PetCareStudio
              care={care}
              affection={settings.affection}
              onFeedSnack={snackId => {
                const res = feedSnack(snackId);
                act('feed');
                setResponseText(res.snack.line);
                return res;
              }}
              onPlayToy={toyId => {
                const res = playWithToy(toyId);
                renderer.current?.triggerReaction('wave');
                setPreviewAction('tap');
                setResponseText(res.toy.line);
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(() => setPreviewAction('idle'), 2000);
                return res;
              }}
              onEquipOrUnlock={equipOrUnlock}
              onSelectRoomBg={roomBgId => updateCare({ roomBgId })}
              onToggleRoomProp={toggleRoomProp}
              onAdjustOutfit={patch => updateCare(patch)}
              onClaimDaily={claimDailyReward}
              onStartFocus={startFocusTimer}
              onCancelFocus={cancelFocusTimer}
              onToggleDrinkReminder={() => updateCare({ drinkReminder: !care.drinkReminder })}
              onPlayRPS={choice => {
                const res = playRockPaperScissors(choice);
                renderer.current?.triggerReaction('wave');
                setPreviewAction(res.outcome === 'win' ? 'happy' : 'tap');
                setResponseText(res.message);
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(() => setPreviewAction('idle'), 2000);
                return res;
              }}
              onSpinGacha={() => {
                const res = spinLuckyGacha();
                if (res.ok) {
                  renderer.current?.triggerReaction('tap');
                  setPreviewAction('happy');
                  setResponseText(res.message);
                  window.clearTimeout(timer.current);
                  timer.current = window.setTimeout(() => setPreviewAction('idle'), 2200);
                }
                return res;
              }}
            />
            <h3 className="group-heading first-group">伙伴名片与日常习惯</h3>
            <div className="name-row"><div><label htmlFor="pet-name">伙伴昵称</label><span>怎么称呼这位小伙伴</span></div><input id="pet-name" value={name} maxLength={12} onChange={event => setName(event.target.value)} onBlur={() => { if (name.trim()) void update({ petName: name.trim() }); else setName(settings.petName); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></div>
            <div className="setting-group">
              <Toggle label="自由散步" hint="走一会儿，歇一会儿；鼠标靠近就停下。" checked={settings.roamEnabled} onChange={() => void update({ roamEnabled: !settings.roamEnabled })} />
              <div className="setting-subrow"><span>散步节奏</span><div className="segmented">{([{ id: 'slow', label: '慢悠悠' }, { id: 'normal', label: '轻快小步' }, { id: 'lively', label: '活力满满' }] as const).map(option => <button key={option.id} aria-pressed={settings.roamSpeed === option.id} onClick={() => void update({ roamSpeed: option.id })}>{option.label}</button>)}</div></div>
              <Toggle label="偶尔冒个泡" hint="隔几分钟说句小话，默认只显示气泡。" checked={settings.autoGreet} onChange={() => void update({ autoGreet: !settings.autoGreet })} />
            </div>
            <div className="nap-note"><div className="nap-icon"><Moon size={19} /></div><div><h3>留一点安静的时间</h3><p>没有听歌或互动两分钟，就会打个小盹。</p></div></div>
            <div className="rest-actions"><button className="button button-soft" onClick={() => act('sleep')}><Moon size={15} />睡个小觉</button><button className="button button-text" onClick={() => act('wake')}><Sun size={15} />起床啦</button></div>
            <div className="little-tip"><span>试一试</span>摸摸头，或者按住身体，带她换个位置。</div>
          </>}
          {tab === 'memory' && <CompanionJournal memory={memory} name={settings.petName} care={care} affection={settings.affection} packsCount={packs.length + 6} />}
          {tab === 'sound' && <>
            {section('听见她的小小回应。', '一句招呼，一首歌，陪你度过这一刻。')}
            <Toggle label="让伙伴出声" hint="使用电脑里的本地声音，无需登录。" checked={settings.voiceEnabled} onChange={() => void update({ voiceEnabled: !settings.voiceEnabled })} />
            <label className="field-label" htmlFor="pet-voice">声音</label>
            <select id="pet-voice" value={settings.voiceId} disabled={voicesLoading} onChange={event => void update({ voiceId: event.target.value })}>
              <option value="auto">自动选择 · 中文优先</option>{voices.map(voice => <option key={voice.id} value={voice.id}>{voiceLabel(voice)}</option>)}
            </select>
            {voicesLoading ? <p className="field-hint">正在找本机可用的声音…</p> : !voices.length ? <p className="field-error">没有找到可用声音。请检查 Windows 中文语音包，然后重启桌宠。</p> : <p className="field-hint">已找到 {voices.filter(v => /^zh/i.test(v.lang)).length} 个中文声音。</p>}
            <div className="slider-row"><label htmlFor="pet-volume">音量</label><input id="pet-volume" type="range" min="0" max="100" step="5" value={settings.voiceVolume} onChange={event => void update({ voiceVolume: Number(event.target.value) })} /><output htmlFor="pet-volume">{settings.voiceVolume}%</output></div>
            <div className="voice-bottom-row"><label htmlFor="pet-rate">语速<select id="pet-rate" value={settings.voiceRate} onChange={event => void update({ voiceRate: Number(event.target.value) })}>{[-3, -2, -1, 0, 1, 2, 3, 4].map(rate => <option key={rate} value={rate}>{rate === 0 ? '自然' : rate === 1 ? '轻快' : rate < 0 ? `慢 ${Math.abs(rate)} 档` : `快 ${rate} 档`}</option>)}</select></label>
              <button className="button button-primary" disabled={!settings.voiceEnabled || !voices.length || settings.voiceVolume === 0} onClick={() => {
                if (speech.status === 'speaking') window.melodyPet.stopSpeaking();
                else void window.melodyPet.speak(`你好呀，我是${settings.petName}。今天也想陪你听歌，和你一起度过。`).then(result => { if (result.error) setError(result.error); }).catch(() => setError('暂时没能开始试听，请再试一次。'));
              }}>{speech.status === 'speaking' ? <Pause size={15} /> : <Volume2 size={15} />}{speech.status === 'speaking' ? '停止说话' : '听听我的声音'}</button>
            </div>
            {speech.status === 'error' && <p role="alert" className="field-error">{speech.error}</p>}
            <Toggle label="主动冒泡时也出声" hint="关掉时，定时问候只显示文字。" checked={settings.voiceAutoGreet} onChange={() => void update({ voiceAutoGreet: !settings.voiceAutoGreet })} />
            <h3 className="group-heading"><Music2 size={15} />一起听歌</h3>
            <p className="media-status"><Music2 size={15} /><span>{media.hasSession ? `${media.status === 'Playing' ? '正在播放' : '已连接播放器'} · ${media.title || '未提供歌名'}` : '等你放一首喜欢的歌'}<small>{media.hasSession ? !canSyncLyrics(media) ? '播放器没有提供有效进度，暂不显示同步歌词。' : media.artist || '会跟着歌曲一起摇摆。' : '打开支持系统媒体控制的播放器后，会自动连接。'}</small></span></p>
            <Toggle label="跟着音乐摇尾巴" hint="有系统声音时随节奏动起来。" checked={settings.audioReactive} onChange={() => void update({ audioReactive: !settings.audioReactive })} />
            <Toggle label="显示同步歌词" hint="歌词由在线服务匹配，部分歌曲可能没有。" checked={settings.showLyrics} onChange={() => void update({ showLyrics: !settings.showLyrics })} />
            <Toggle label="显示迷你播放条" checked={settings.showPlaybar} onChange={() => void update({ showPlaybar: !settings.showPlaybar })} />
          </>}
          {tab === 'look' && <>
            {section('在桌面，留一个位置。', '喜欢的模样，舒服的大小，刚好的距离。')}
            <div className="theme-grid">{THEMES.map(theme => <button key={theme.id} className={`theme-choice ${theme.id === 'whalegirl' ? 'is-whalegirl' : theme.id === 'lingma' ? 'is-lingma' : ''} ${settings.activePackId === 'builtin' && settings.theme === theme.id ? 'is-selected' : ''}`} aria-pressed={settings.activePackId === 'builtin' && settings.theme === theme.id} onClick={() => void update({ activePackId: 'builtin', theme: theme.id })}>
              <span className="theme-symbol" style={{ color: theme.color }}>{theme.id === 'whalegirl' ? <img className="theme-hd-icon" src={HD_WHALE_PREVIEW} alt="" /> : theme.id === 'lingma' ? <img className="theme-lingma-icon" src={LINGMA_PREVIEW} alt="" /> : theme.id === 'whale' ? <WhaleMark size={36} /> : <Cat size={30} />}</span><span><strong>{theme.name}</strong><small>{theme.note}</small></span>{settings.activePackId === 'builtin' && settings.theme === theme.id && <Check size={14} />}</button>)}</div>
            {packs.length > 0 && <>
              <h3 className="group-heading"><PackageOpen size={15} />Codex Pets 精选动态萌宠（{packs.length} 款）</h3>
              <div className="theme-grid">{packs.map(pack => <button key={pack.id} className={`theme-choice ${settings.activePackId === pack.id ? 'is-selected' : ''}`} aria-pressed={settings.activePackId === pack.id} onClick={() => void update({ activePackId: pack.id })}>
                <span className="theme-symbol">{pack.spritesheet ? <SpriteAvatar url={pack.spritesheet.url} size={44} /> : <Fish size={28} />}</span><span><strong>{pack.name}</strong><small>{pack.description ? pack.description.replace(/^来自 codex-pets\.net 的 V2 11动作全套精灵：/, '') : 'Codex V2 11动作全图集'}</small></span>{settings.activePackId === pack.id && <Check size={14} />}</button>)}</div>
            </>}
            <details className="asset-credits"><summary>这位鲸娘从哪里来</summary><p>形象来自 fornarwhal / deepseek-whale-girl-icon，所列署名为上善无形、ZipZipPipe、QYQCAMIAO。互动姿态来自 GarfieldZhung / DeepSeek-Whale-Girl。均为非官方社区二创，完整来源与使用条件保留在项目说明中。</p></details>
            <div className="size-row"><span>伙伴大小</span><div className="segmented">{([{ id: 'small', label: '小小只' }, { id: 'medium', label: '刚刚好' }, { id: 'large', label: '大抱抱' }] as const).map(option => <button key={option.id} aria-pressed={settings.size === option.id} onClick={() => void update({ size: option.id })}>{option.label}</button>)}</div></div>
            <Toggle label="始终陪在最上层" checked={settings.topmost} onChange={() => void update({ topmost: !settings.topmost })} />
            <Toggle label="全屏时安静躲开" hint="游戏和全屏视频时隐藏，退出全屏后回来。" checked={settings.hideInFullscreen} onChange={() => void update({ hideInFullscreen: !settings.hideInFullscreen })} />
            <Toggle label="拖到边缘时靠好" checked={settings.snapToEdge} onChange={() => void update({ snapToEdge: !settings.snapToEdge })} />
            <Toggle label="开机自动陪伴" hint="登录 Windows 时自动在桌面角落等你。" checked={Boolean(settings.autoStart)} onChange={() => void update({ autoStart: !settings.autoStart })} />
            <Toggle label="启用老板键 (Alt+Q)" hint="随时按 Alt+Q 一秒隐藏或唤回桌宠，开会投屏更安心。" checked={settings.bossKeyEnabled !== false} onChange={() => void update({ bossKeyEnabled: settings.bossKeyEnabled === false })} />
            <button className="button button-text recovery-button" onClick={() => window.melodyPet.showPet()}>让伙伴回到视野里<ChevronRight size={14} /></button>
          </>}
          {tab === 'packs' && <>
            {section('遇见下一位小伙伴。', '收藏喜欢的模样，让桌面多一点新鲜感。')}
            <div className="pack-list" aria-label="内置伙伴">
              <div className="pack-row">
                <div className="pack-icon lingma-pack-icon"><img src={LINGMA_PREVIEW} alt="" /></div>
                <div><strong>灵码小狐狸</strong><small>从你的 Codex 来，继续陪你创作。</small></div>
                <button className="button button-soft compact" aria-label="使用灵码小狐狸" aria-pressed={settings.activePackId === 'builtin' && settings.theme === 'lingma'} onClick={() => void update({ activePackId: 'builtin', theme: 'lingma' })}>{settings.activePackId === 'builtin' && settings.theme === 'lingma' ? '使用中' : '使用'}</button>
              </div>
            </div>
            <div className="codex-import"><div className="import-symbol"><PackageOpen size={24} /></div><div><h3>从 Codex Pets 带回来</h3><p>选择下载的 ZIP，或解压后的 pet.json，即可导入完整动作。</p></div><div className="codex-import-actions"><button className="button button-primary" disabled={importing} onClick={() => void importCodex()}><Upload size={15} />{importing ? '正在导入…' : '导入 Codex 宠物'}</button><button className="button button-text" onClick={() => window.melodyPet.openPetGallery()}>逛逛素材库<ArrowUpRight size={14} /></button></div></div>
            {packs.length ? <div className="pack-list">{packs.map(pack => <div className="pack-row" key={pack.id}>
              <div className="pack-icon">{pack.spritesheet ? <SpriteAvatar url={pack.spritesheet.url} size={40} /> : <Fish size={20} />}</div><div><strong>{pack.name}</strong><small>{pack.description ? pack.description.replace(/^来自 codex-pets\.net 的 V2 11动作全套精灵：/, '') : pack.spritesheet ? `Codex V${pack.spritesheet.version} 动画图集` : `${Object.keys(pack.assets).length} 个动作`}</small></div>
              <button className="button button-soft compact" onClick={() => void update({ activePackId: pack.id })}>{settings.activePackId === pack.id ? '使用中' : '使用'}</button>
              {pendingDelete === pack.id ? <div className="delete-confirm"><button onClick={() => { void window.melodyPet.deletePack(pack.id).then(() => setPendingDelete('')); }}>确认移除</button><button aria-label="取消移除" onClick={() => setPendingDelete('')}><X size={13} /></button></div>
                : <button className="icon-button" aria-label={`移除${pack.name}`} title="移除伙伴" onClick={() => setPendingDelete(pack.id)}><Trash2 size={14} /></button>}
            </div>)}</div> : <div className="packs-empty"><div><Plus size={20} /></div><p>还可以带更多伙伴回家。<small>支持透明 WebM、GIF、PNG、WebP。</small></p></div>}
            <h3 className="group-heading">用自己的素材</h3><p className="field-hint">一张透明图片，或者一段透明动画，也能成为伙伴。</p>
            <label className="field-label" htmlFor="pack-name">伙伴名字</label><input id="pack-name" value={packName} maxLength={40} onChange={event => setPackName(event.target.value)} placeholder="给新伙伴起个名字" />
            <button className={`asset-picker ${files.idle ? 'has-file' : ''}`} onClick={() => void pickFile('idle')}><span><Upload size={18} /><strong>{files.idle ? files.idle.split(/[/\\]/).pop() : '选择待机素材'}</strong></span><small>{files.idle ? '点这里可以重新选择' : '先选一个文件，就能动起来。'}</small></button>
            <details className="extra-assets"><summary>更多动作与台词<span>可选</span></summary><div className="asset-slots">{SLOTS.slice(1).map(slot => <button className={files[slot.key] ? 'has-file' : ''} key={slot.key} onClick={() => void pickFile(slot.key)}><span>{slot.label}{files[slot.key] ? <Check size={12} /> : <Plus size={12} />}</span><small>{files[slot.key]?.split(/[/\\]/).pop() || '选择素材'}</small></button>)}</div><label className="field-label" htmlFor="pack-corpus">它的小台词，每行一句</label><textarea id="pack-corpus" rows={3} value={corpus} maxLength={2000} onChange={event => setCorpus(event.target.value)} placeholder="今天也在认真陪你。" /></details>
            <div className="import-footer"><button className="button button-primary import-button" disabled={importing || !Object.values(files).some(Boolean)} onClick={() => void importPack()}>{importing ? '正在搬进小屋…' : '导入并使用'}<ChevronRight size={15} /></button>
            <p className="field-hint">素材会复制到小屋，原文件仍留在原来的位置。</p></div>
          </>}
        </div>
      </section>
      {companionPreview}
      </div>
      <footer className="workshop-footer"><span>一点陪伴，慢慢熟悉。</span><span>右键桌面伙伴，随时回到小屋</span></footer>
    </div>
  </main>;
};
