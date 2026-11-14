import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fish, Heart, MessageCircle, Music2, Pause, Play, Settings2, SkipBack, SkipForward, Volume2, VolumeX, Footprints } from 'lucide-react';
import { LoopbackAudioAnalyzer } from '../audio/loopbackAudio';
import { pickContextualLine, resetContextualLines } from '../pet/corpus';
import { dialogueMascot } from '../../electron/dialogue';
import { ProceduralPetCanvas, type PetRendererHandle } from '../pet/ProceduralPetCanvas';
import { WhalePetCanvas } from '../pet/WhalePetCanvas';
import { SpritePetCanvas } from '../pet/SpritePetCanvas';
import { LINGMA_SPRITE } from '../pet/lingma';
import { HDWhaleGirlCanvas } from '../pet/HDWhaleGirlCanvas';
import { emptyMemory } from '../../electron/companion-state';
import { canSyncLyrics } from '../../electron/media-state';
import { VideoPackRenderer } from '../pet/VideoPackRenderer';
import { HAT_ITEMS, NECK_ITEMS, NEST_ITEMS, usePetCare, type SnackId, type ToyId } from '../pet/careSystem';
import { PetNestCanvas, PetOutfitCanvas } from '../pet/PetCareOverlay';
import { DesktopCareBar } from './PetCareStudio';
import { DEFAULT_SETTINGS, STAGE_SIZE } from '../types';
import type { AudioFrame, LyricLine, MotionState, PetActionKey, PetBounds, PetPack, PetSettings, SmtcState, SpeechState, PetReactionKey, PetTouchZone } from '../types';

const EMPTY_AUDIO: AudioFrame = { active: false, bass: 0, mid: 0, treble: 0, beatPulse: 0, energy: 0, bins: new Array(24).fill(0) };

export const PetStage: React.FC = () => {
  const [settings, setSettings] = useState<PetSettings>(DEFAULT_SETTINGS);
  const [packs, setPacks] = useState<PetPack[]>([]);
  const [smtc, setSmtc] = useState<SmtcState>({ event: 'state' });
  const [motion, setMotion] = useState<MotionState>({ moving: false, direction: -1, pace: 'walk' });
  const [speech, setSpeech] = useState<SpeechState>({ status: 'idle' });
  const [snapEdge, setSnapEdge] = useState('none');
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [reaction, setReaction] = useState<PetActionKey | null>(null);
  const [bubble, setBubble] = useState('');
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLyric, setCurrentLyric] = useState<LyricLine | null>(null);
  const [careOpen, setCareOpen] = useState(false);
  const { care, feedSnack, playWithToy, equipOrUnlock, rewardInteraction, completeFocusTimer } = usePetCare();
  const renderer = useRef<PetRendererHandle | null>(null);
  const audioFrame = useRef<AudioFrame>(EMPTY_AUDIO);
  const cursorOffset = useRef({ dx: 0, dy: 0 });
  const dragTilt = useRef(0);
  const bounds = useRef<PetBounds>({ x: 0, y: 0, width: 340, height: 370 });
  const live = useRef({ settings, smtc, packs, sleeping, motion });
  live.current = { settings, smtc, packs, sleeping, motion };
  const ignore = useRef<boolean | null>(null);
  const lastHit = useRef(0);
  const lastDomMove = useRef(0);
  const lastInteraction = useRef(Date.now());
  const lastManualInteraction = useRef(0);
  const manualSleep = useRef(false);
  const bubbleTimer = useRef(0);
  const reactionTimer = useRef(0);
  const singleClickTimer = useRef(0);
  const lastClick = useRef(0);
  const latestBubble = useRef('');
  const lastAnnouncedTrack = useRef('');
  const lastSongSpoken = useRef(0);
  const memory = useRef(emptyMemory());
  const interactionSequence = useRef(0);
  const voiceTimer = useRef(0);
  const dragSequence = useRef(0);
  const touchZone = useRef<PetTouchZone>('head');
  const positionSync = useRef({ position: 0, at: Date.now(), playing: false });
  const drag = useRef({ down: false, active: false, startX: 0, startY: 0, winX: 0, winY: 0, lastX: 0, lastY: 0, at: 0, vx: 0, vy: 0, pointerId: -1 });

  const showBubble = useCallback((text: string, duration = 4500) => {
    latestBubble.current = text;
    setBubble(text);
    window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => { setBubble(''); latestBubble.current = ''; }, duration);
  }, []);

  const say = useCallback((text: string, voiced = true, delay = 140) => {
    window.clearTimeout(voiceTimer.current);
    showBubble(text, Math.max(4500, text.length * 190));
    if (voiced && live.current.settings.voiceEnabled) {
      voiceTimer.current = window.setTimeout(() => {
        if (manualSleep.current || drag.current.active) return;
        void window.melodyPet.speak(text).then(result => {
          if (result.error) setSpeech({ status: 'error', error: result.error });
        }).catch(() => setSpeech({ status: 'error', error: '语音暂时不可用，可以在小屋里重试。' }));
      }, delay);
    }
  }, [showBubble]);

  const interrupt = useCallback(() => {
    interactionSequence.current++;
    window.clearTimeout(voiceTimer.current);
    window.clearTimeout(reactionTimer.current);
    renderer.current?.cancelReaction?.();
    setReaction(null);
    window.melodyPet.stopSpeaking();
  }, []);

  const performReaction = useCallback((kind: PetReactionKey, duration: number) => {
    renderer.current?.triggerReaction(kind);
    setReaction(kind === 'feed' ? 'happy' : 'tap');
    window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => setReaction(null), duration);
  }, []);

  const wake = useCallback(() => {
    manualSleep.current = false;
    lastInteraction.current = Date.now();
    setSleeping(false);
  }, []);

  const reactToPet = useCallback((kind: 'tap' | 'feed' | 'talk', zone: PetTouchZone = 'head', snackOverride?: SnackId) => {
    lastManualInteraction.current = Date.now();
    interrupt();
    const sequence = interactionSequence.current;
    wake();
    const snackResult = kind === 'feed' ? feedSnack(snackOverride) : null;
    if (kind !== 'feed') rewardInteraction(kind);
    void window.melodyPet.interact(kind, zone).then(response => {
      if (sequence !== interactionSequence.current) return;
      memory.current = response.memory;
      performReaction(response.reaction, response.duration);
      const customFeedLine = snackResult && response.reaction === 'feed' && snackOverride ? snackResult.snack.line : response.text;
      say(customFeedLine, true, response.reaction === 'feed' ? 650 : 160);
    }).catch(() => { if (sequence === interactionSequence.current) showBubble('这次相处记录没能存好，请稍后再试。'); });
  }, [say, wake, interrupt, performReaction, showBubble, feedSnack, rewardInteraction]);

  useEffect(() => {
    document.body.classList.add('pet-mode');
    const api = window.melodyPet;
    let mounted = true;
    void Promise.all([api.getSettings(), api.listPacks(), api.getBounds(), api.getSmtcState(), api.getSpeechState(), api.getCompanionMemory()]).then(([next, list, b, media, voice, history]) => {
      if (!mounted) return;
      setSettings(next); setPacks(list); bounds.current = b; setSmtc(media); setSpeech(voice);
      memory.current = history;
      showBubble(pickContextualLine({ name: next.petName, reason: 'greet', isPlaying: false, affection: next.affection, memory: history, mascot: dialogueMascot(next) }), 6200);
      renderer.current?.triggerReaction('wave');
    });
    const unsub = [
      api.onSettingsChanged(setSettings), api.onPacksChanged(setPacks),
      api.onBoundsChanged(b => { bounds.current = b; setSnapEdge(b.snapEdge || 'none'); }),
      api.onMotionChanged(setMotion),
      api.onCompanionMemory(history => {
        memory.current = history;
        if (!history.firstAt) {
          interrupt(); resetContextualLines(); window.clearTimeout(bubbleTimer.current);
          setBubble(''); latestBubble.current = '';
        }
      }),
      api.onSmtcState(state => {
        setSmtc(state);
        positionSync.current = { position: state.positionMs || 0, at: Date.now(), playing: state.status === 'Playing' };
        if (state.status === 'Playing' && !manualSleep.current) { lastInteraction.current = Date.now(); setSleeping(false); }
      }),
      api.onSpeechState(state => {
        setSpeech(state);
        if (state.status === 'speaking' && state.text) showBubble(state.text, 45000);
        else if (state.status === 'idle') {
          window.clearTimeout(bubbleTimer.current);
          bubbleTimer.current = window.setTimeout(() => { setBubble(''); latestBubble.current = ''; }, 2000);
        }
      }),
    ];
    return () => {
      mounted = false;
      unsub.forEach(fn => fn());
      document.body.classList.remove('pet-mode');
      [bubbleTimer, reactionTimer, singleClickTimer, voiceTimer].forEach(timer => window.clearTimeout(timer.current));
    };
  }, [showBubble, interrupt]);

  useEffect(() => window.melodyPet.onMenuAction(action => {
    lastManualInteraction.current = Date.now();
    if (action === 'tap' || action === 'feed' || action === 'talk') reactToPet(action);
    else if (action === 'activateApp') window.melodyPet.sendSmtcCommand('activateApp', live.current.smtc.appId);
    else if (action === 'run') { interrupt(); wake(); showBubble('准备好了，出发！', 2300); }
    else if (action === 'sleep') {
      interrupt(); window.clearTimeout(singleClickTimer.current);
      manualSleep.current = true; setSleeping(true); setReaction(null);
      showBubble('我眯一小会儿，醒了再陪你。', 3500);
    } else if (action === 'wake') {
      interrupt(); wake(); performReaction('wake', 1500);
      say(pickContextualLine({ reason: 'wake', isPlaying: false, affection: live.current.settings.affection, mascot: dialogueMascot(live.current.settings) }), true, 650);
    }
  }), [reactToPet, wake, say, showBubble, interrupt, performReaction]);

  useEffect(() => {
    window.melodyPet.setInteraction({ hovered, dragging, sleeping, reacting: Boolean(reaction) });
  }, [hovered, dragging, sleeping, reaction]);

  useEffect(() => {
    const analyzer = new LoopbackAudioAnalyzer();
    if (settings.audioReactive) void analyzer.start();
    let frame = 0;
    const sample = (now: number) => {
      audioFrame.current = analyzer.sample(now, positionSync.current.playing, settings.audioReactive);
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => { cancelAnimationFrame(frame); analyzer.dispose(); };
  }, [settings.audioReactive]);

  const hasTimeline = canSyncLyrics(smtc);
  // No valid player timeline means no synchronized lyric display, rather than a frozen first line.
  useEffect(() => {
    const title = smtc.title?.trim() || '';
    const artist = smtc.artist?.trim() || '';
    setLyrics([]); setCurrentLyric(null);
    if (!title || !settings.showLyrics || !hasTimeline) return;
    let cancelled = false;
    void window.melodyPet.fetchLyrics(title, artist).then(lines => {
      if (!cancelled) setLyrics(lines);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [smtc.title, smtc.artist, settings.showLyrics, hasTimeline]);

  useEffect(() => {
    if (!smtc.hasSession || smtc.status !== 'Playing' || !smtc.title || manualSleep.current) return;
    const key = `${smtc.title}|${smtc.artist || ''}`;
    if (lastAnnouncedTrack.current === key) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (manualSleep.current || drag.current.down || Date.now() - lastManualInteraction.current < 6000 || Date.now() - lastSongSpoken.current < 45000) return;
      void window.melodyPet.getSpeechState().then(current => {
        if (cancelled || current.status === 'speaking' || manualSleep.current || Date.now() - lastManualInteraction.current < 6000 || live.current.smtc.status !== 'Playing') return;
        lastAnnouncedTrack.current = key; lastSongSpoken.current = Date.now();
        say(pickContextualLine({ name: live.current.settings.petName, songTitle: smtc.title, isPlaying: true, affection: live.current.settings.affection, reason: 'song', mascot: dialogueMascot(live.current.settings) }));
      });
    }, 1700);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [smtc.title, smtc.artist, smtc.status, smtc.hasSession, say]);

  useEffect(() => {
    if (!settings.showLyrics || !lyrics.length || smtc.status !== 'Playing') { setCurrentLyric(null); return; }
    const tick = () => {
      const sync = positionSync.current;
      const time = sync.position + (sync.playing ? Date.now() - sync.at : 0);
      let active: LyricLine | null = null;
      for (const line of lyrics) { if (line.timeMs > time + 100) break; active = line; }
      setCurrentLyric(active);
    };
    tick();
    const timer = window.setInterval(tick, 150);
    return () => window.clearInterval(timer);
  }, [lyrics, settings.showLyrics, smtc.status]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (live.current.smtc.status !== 'Playing' && !drag.current.down && Date.now() - lastInteraction.current > 120000) setSleeping(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sleeping || manualSleep.current || !settings.roamEnabled) return;
    const timer = window.setTimeout(wake, 40000);
    return () => window.clearTimeout(timer);
  }, [sleeping, settings.roamEnabled, wake]);

  useEffect(() => {
    if (!settings.autoGreet) return;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        const current = live.current;
        if (!current.sleeping && !drag.current.down && Date.now() - lastInteraction.current > 20000) say(pickContextualLine({
          name: current.settings.petName, songTitle: current.smtc.title, isPlaying: current.smtc.status === 'Playing',
          affection: current.settings.affection, reason: 'idle', mascot: dialogueMascot(current.settings),
          customCorpus: packs.find(p => p.id === current.settings.activePackId)?.corpus,
        }), current.settings.voiceAutoGreet && new Date().getHours() >= 8 && new Date().getHours() < 23);
        schedule();
      }, 240000 + Math.random() * 180000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [settings.autoGreet, say]);

  const setClickThrough = useCallback((value: boolean) => {
    if (ignore.current !== value) { ignore.current = value; window.melodyPet.setIgnoreMouseEvents(value); }
  }, []);

  const isBodyOrAccessoryHit = useCallback((x: number, y: number) => {
    try {
      if (renderer.current?.isOpaqueAt(x, y)) return true;
    } catch {
      // fallback to core bounds if canvas is cross-origin tainted
    }
    const w = bounds.current.width || STAGE_SIZE[live.current.settings.size].w;
    const h = bounds.current.height || STAGE_SIZE[live.current.settings.size].h;
    const nx = x / w;
    const ny = y / h;
    if (nx >= 0.31 && nx <= 0.69 && ny >= 0.30 && ny <= 0.78) return true;
    if (care.nestId !== 'none' && nx >= 0.24 && nx <= 0.76 && ny >= 0.66 && ny <= 0.82) return true;
    return false;
  }, [care.nestId]);

  const checkHit = useCallback((x: number, y: number) => {
    if (drag.current.down) { setClickThrough(false); return; }
    const el = document.elementFromPoint(x, y);
    const dom = Boolean(el?.closest('[data-pet-interactive="true"]'));
    const body = isBodyOrAccessoryHit(x, y);
    if (dom || body) lastHit.current = performance.now();
    setHovered(dom || body || performance.now() - lastHit.current < 650);
    setClickThrough(!dom && !body);
  }, [setClickThrough, isBodyOrAccessoryHit]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      lastDomMove.current = performance.now();
      checkHit(event.clientX, event.clientY);
    };
    const unsub = window.melodyPet.onCursorPosition(point => {
      const b = bounds.current;
      cursorOffset.current = { dx: point.x - (b.x + b.width * 0.5), dy: point.y - (b.y + b.height * 0.56) };
      if (performance.now() - lastDomMove.current > 120) checkHit(point.x - b.x, point.y - b.y);
    });
    window.addEventListener('mousemove', onMove);
    return () => { unsub(); window.removeEventListener('mousemove', onMove); };
  }, [checkHit]);

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('[data-pet-interactive="true"]')) return;
    if (!isBodyOrAccessoryHit(event.clientX, event.clientY)) return;
    const b = bounds.current;
    lastManualInteraction.current = Date.now();
    touchZone.current = renderer.current?.touchZoneAt?.(event.clientX, event.clientY) || 'head';
    dragSequence.current++;
    wake();
    drag.current = { down: true, active: false, startX: event.screenX, startY: event.screenY,
      winX: b.x, winY: b.y, lastX: event.screenX, lastY: event.screenY, at: performance.now(), vx: 0, vy: 0, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    setClickThrough(false);
    void window.melodyPet.beginDrag().then(actual => {
      if (drag.current.down && !drag.current.active) { drag.current.winX = actual.x; drag.current.winY = actual.y; }
    });
  };

  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state.down) return;
    const dx = event.screenX - state.startX;
    const dy = event.screenY - state.startY;
    if (!state.active && Math.hypot(dx, dy) > 4) {
      interrupt();
      state.active = true; setDragging(true); window.clearTimeout(singleClickTimer.current);
    }
    if (!state.active) return;
    const now = performance.now();
    const dt = Math.max(8, now - state.at);
    state.vx = (event.screenX - state.lastX) * 16 / dt;
    state.vy = (event.screenY - state.lastY) * 16 / dt;
    state.lastX = event.screenX; state.lastY = event.screenY; state.at = now;
    dragTilt.current = Math.max(-0.22, Math.min(0.22, -state.vx * 0.013));
    window.melodyPet.setPosition(state.winX + dx, state.winY + dy);
  };

  const pointerUp = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const state = drag.current;
    if (!state.down) return;
    const wasDrag = state.active;
    state.down = false; state.active = false;
    if (event.currentTarget.hasPointerCapture(state.pointerId)) event.currentTarget.releasePointerCapture(state.pointerId);
    setDragging(false); dragTilt.current = 0;
    const recent = performance.now() - state.at < 100;
    const sequence = dragSequence.current;
    void window.melodyPet.finishDrag(wasDrag && recent ? state.vx : 0, wasDrag && recent ? state.vy : 0).then(finalBounds => {
      if (wasDrag && !cancelled && finalBounds && sequence === dragSequence.current && !manualSleep.current) performReaction('land', 650);
    });
    if (wasDrag || cancelled) { lastClick.current = 0; return; }
    const now = Date.now();
    if (now - lastClick.current < 280) {
      lastClick.current = 0; window.clearTimeout(singleClickTimer.current);
      window.melodyPet.sendSmtcCommand('activateApp', live.current.smtc.appId);
    } else {
      lastClick.current = now;
      const zone = touchZone.current;
      singleClickTimer.current = window.setTimeout(() => reactToPet('tap', zone), 280);
    }
  };

  const activePack = useMemo(() => packs.find(p => p.id === settings.activePackId), [packs, settings.activePackId]);
  const activeSprite = activePack?.spritesheet ?? (!activePack && settings.theme === 'lingma' ? LINGMA_SPRITE : undefined);
  const dim = STAGE_SIZE[settings.size];
  const isPlaying = smtc.status === 'Playing';
  const action: PetActionKey = dragging ? 'drag' : sleeping ? 'sleep' : reaction || (motion.moving ? 'walk' : isPlaying ? 'playing' : 'idle');
  const topText = bubble || (isPlaying && settings.showLyrics ? currentLyric?.text || '' : '');
  const showControls = hovered && !dragging;

  useEffect(() => {
    if (!showControls && careOpen) setCareOpen(false);
  }, [showControls, careOpen]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => rewardInteraction('listen'), 35000);
    return () => window.clearInterval(timer);
  }, [isPlaying, rewardInteraction]);

  useEffect(() => {
    if (!care.focusEndAt) return;
    const check = () => {
      if (care.focusEndAt && Date.now() >= care.focusEndAt) {
        completeFocusTimer();
        wake();
        performReaction('wave', 1800);
        say('太棒啦！专注时间圆满完成，快起来伸个懒腰喝口水，送你 35 枚音符糖币！', true, 200);
      }
    };
    const timer = window.setInterval(check, 1000);
    return () => window.clearInterval(timer);
  }, [care.focusEndAt, completeFocusTimer, wake, performReaction, say]);

  useEffect(() => {
    if (!care.drinkReminder) return;
    const timer = window.setInterval(() => {
      if (!live.current.sleeping && !drag.current.down) {
        showBubble('💧 已经认真忙了好一会儿啦，喝口温水、眨眨眼睛休息一下吧～', 5200);
      }
    }, 45 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [care.drinkReminder, showBubble]);

  const handlePlayToy = useCallback((toyId: ToyId) => {
    setCareOpen(false);
    wake();
    const res = playWithToy(toyId);
    performReaction('wave', 1900);
    say(res.toy.line, true, 180);
  }, [wake, playWithToy, performReaction, say]);

  const cycleQuickOutfit = useCallback(() => {
    const ownedHats = HAT_ITEMS.filter(h => h.cost === 0 || care.unlockedIds.includes(`hat:${h.id}`));
    const ownedNecks = NECK_ITEMS.filter(n => n.cost === 0 || care.unlockedIds.includes(`neck:${n.id}`));
    const nextHat = ownedHats[(ownedHats.findIndex(h => h.id === care.hatId) + 1) % ownedHats.length] || HAT_ITEMS[0];
    const nextNeck = ownedNecks[(ownedNecks.findIndex(n => n.id === care.neckId) + 1) % ownedNecks.length] || NECK_ITEMS[0];
    equipOrUnlock('hat', nextHat.id, 0);
    equipOrUnlock('neck', nextNeck.id, 0);
    showBubble(`换上「${nextHat.name}」和「${nextNeck.name}」啦，好看吗？`, 3200);
  }, [care.hatId, care.neckId, care.unlockedIds, equipOrUnlock, showBubble]);

  const cycleQuickNest = useCallback(() => {
    const ownedNests = NEST_ITEMS.filter(n => n.cost === 0 || care.unlockedIds.includes(`nest:${n.id}`));
    const nextNest = ownedNests[(ownedNests.findIndex(n => n.id === care.nestId) + 1) % ownedNests.length] || NEST_ITEMS[0];
    equipOrUnlock('nest', nextNest.id, 0);
    showBubble(nextNest.id === 'none' ? '把小窝先收起来，轻装待机～' : `换上了软乎乎的「${nextNest.name}」～`, 3200);
  }, [care.nestId, care.unlockedIds, equipOrUnlock, showBubble]);

  return <div className={`pet-stage ${dragging ? 'is-dragging' : ''}`} style={{ width: dim.w, height: dim.h }}
    data-action={action} data-moving={motion.moving} data-speaking={speech.status === 'speaking'}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => pointerUp(event)}
    onPointerCancel={event => pointerUp(event, true)}
    onContextMenu={event => { event.preventDefault(); window.melodyPet.popupMenu(event.clientX, event.clientY); }}>
    {topText && <div className={`pet-bubble ${bubble ? '' : 'is-lyric'}`} role="status" aria-live="polite">
      {bubble && <span className="bubble-speaker">{speech.status === 'speaking' ? <Volume2 size={11} /> : <span className="bubble-dot" />}{settings.petName}</span>}
      <div key={topText} className="bubble-copy">{topText}</div>
      {!bubble && currentLyric?.trans && <small>{currentLyric.trans}</small>}
    </div>}
    <div className="pet-renderer">
      <PetNestCanvas width={dim.w} height={dim.h} action={action} motion={motion} theme={settings.theme} activePackId={settings.activePackId} care={care} audioFrameRef={audioFrame} dragTiltRef={dragTilt} />
      {!activePack && settings.theme === 'whalegirl' ? <HDWhaleGirlCanvas ref={renderer} width={dim.w} height={dim.h} action={action}
          speaking={speech.status === 'speaking'} motion={motion} audioFrameRef={audioFrame} cursorOffsetRef={cursorOffset} dragTiltRef={dragTilt} />
        : activeSprite ? <SpritePetCanvas ref={renderer} width={dim.w} height={dim.h} {...activeSprite} action={action}
          speaking={speech.status === 'speaking'} motion={motion} audioFrameRef={audioFrame} cursorOffsetRef={cursorOffset} dragTiltRef={dragTilt} />
        : activePack ? <VideoPackRenderer ref={renderer} pack={activePack} action={action} width={dim.w} height={dim.h} audioFrameRef={audioFrame} />
        : settings.theme === 'whale' ? <WhalePetCanvas ref={renderer} width={dim.w} height={dim.h} action={action}
          speaking={speech.status === 'speaking'} motion={motion} audioFrameRef={audioFrame} cursorOffsetRef={cursorOffset} dragTiltRef={dragTilt} />
        : <ProceduralPetCanvas ref={renderer} width={dim.w} height={dim.h} theme={settings.theme as 'nyan' | 'cyber' | 'mochi'} action={action}
          snapEdge={snapEdge} audioFrameRef={audioFrame} cursorOffsetRef={cursorOffset} dragTiltRef={dragTilt} />}
      <PetOutfitCanvas width={dim.w} height={dim.h} action={action} motion={motion} theme={settings.theme} activePackId={settings.activePackId} care={care} audioFrameRef={audioFrame} dragTiltRef={dragTilt} />
    </div>
    <div className={`pet-controls ${showControls ? 'is-visible' : ''}`} data-pet-interactive="true" aria-hidden={!showControls}>
      <DesktopCareBar
        care={care}
        open={careOpen}
        onToggleOpen={() => setCareOpen(prev => !prev)}
        onFeedSnack={snackId => { setCareOpen(false); reactToPet('feed', 'head', snackId); }}
        onPlayToy={handlePlayToy}
        onQuickCycleOutfit={cycleQuickOutfit}
        onQuickCycleNest={cycleQuickNest}
      />
      <div className="pet-quick-actions">
        <button aria-label="喂小鱼干" title="喂小鱼干" onClick={() => reactToPet('feed')}><Fish size={17} /></button>
        <button aria-label="说句话" title="说句话" onClick={() => reactToPet('talk')}><MessageCircle size={17} /></button>
        <button aria-label="跑一圈" title="跑一圈" onClick={() => window.melodyPet.petAction('run')}><Footprints size={17} /></button>
        <button aria-label={settings.voiceEnabled ? '关闭声音' : '打开声音'} title={settings.voiceEnabled ? '关闭声音' : '打开声音'}
          onClick={() => void window.melodyPet.saveSettings({ voiceEnabled: !settings.voiceEnabled })}>{settings.voiceEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
        <button aria-label="打开泡泡的小屋" title="打开小屋" onClick={() => window.melodyPet.openSettingsWindow()}><Settings2 size={17} /></button>
      </div>
      {settings.showPlaybar && <div className="pet-music-strip">
        <div className="pet-song"><Music2 size={13} /><span title={smtc.title || ''}>{smtc.title || '放首歌，一起摇尾巴'}</span></div>
        <div className="pet-playback">
          <button aria-label="上一首" title="上一首" disabled={!smtc.hasSession} onClick={() => window.melodyPet.sendSmtcCommand('prev')}><SkipBack size={12} /></button>
          <button aria-label={isPlaying ? '暂停' : '播放'} title={isPlaying ? '暂停' : '播放'} disabled={!smtc.hasSession} onClick={() => window.melodyPet.sendSmtcCommand('toggle')}>{isPlaying ? <Pause size={13} /> : <Play size={13} />}</button>
          <button aria-label="下一首" title="下一首" disabled={!smtc.hasSession} onClick={() => window.melodyPet.sendSmtcCommand('next')}><SkipForward size={12} /></button>
        </div>
      </div>}
    </div>
  </div>;
};
