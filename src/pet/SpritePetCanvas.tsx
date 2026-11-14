import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { animationFrame, lookFrame, SPRITE_WIDTH, SPRITE_HEIGHT } from '../../electron/sprite-animation';
import type { AudioFrame, MotionState, PetActionKey, PetReactionKey } from '../types';
import type { PetRendererHandle } from './ProceduralPetCanvas';

export interface SpritePetProps {
  width: number; height: number; url: string; version: 1 | 2; action: PetActionKey;
  motion: MotionState; speaking: boolean;
  audioFrameRef: React.MutableRefObject<AudioFrame>;
  cursorOffsetRef: React.MutableRefObject<{ dx: number; dy: number }>;
  dragTiltRef: React.MutableRefObject<number>;
  preview?: boolean;
  followCursor?: boolean;
  sleepFrame?: { row: number; frame: number };
  speakingRow?: number;
  ariaLabel?: string;
}
interface Particle { x: number; y: number; age: number; vx: number; kind: 'heart' | 'crumb' }
const DURATIONS: Partial<Record<PetReactionKey, number>> = { feed: 2600, land: 700, wake: 1500, wave: 1400 };

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 12, size / 12);
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-15, -3, -7, -13, 0, -6); ctx.bezierCurveTo(7, -13, 15, -3, 0, 6);
  ctx.fillStyle = '#ec9eb9'; ctx.fill(); ctx.restore();
}
function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.25); ctx.scale(scale, scale);
  ctx.fillStyle = '#e5ac67'; ctx.strokeStyle = '#bd8550'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(21, -8); ctx.lineTo(21, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#715647'; ctx.beginPath(); ctx.arc(-6, -1, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

/** Codex V1/V2 atlas player. The atlas, not a mirrored still image, supplies the gait. */
export const SpritePetCanvas = forwardRef<PetRendererHandle, SpritePetProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const live = useRef(props); live.current = props;
  const reaction = useRef({ kind: '' as PetReactionKey | '', start: 0, until: 0 });
  const particles = useRef<Particle[]>([]);
  const placement = useRef({ x: 0, y: 0, width: 1, height: 1 });
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    isOpaqueAt(x, y) {
      const mask = maskRef.current; const canvas = canvasRef.current;
      if (!mask || !canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const px = Math.floor((x - rect.left) * mask.width / rect.width);
      const py = Math.floor((y - rect.top) * mask.height / rect.height);
      if (px < 0 || py < 0 || px >= mask.width || py >= mask.height) return false;
      try {
        return (mask.getContext('2d', { willReadFrequently: true })?.getImageData(px, py, 1, 1).data[3] || 0) > 48;
      } catch {
        const p = placement.current;
        const lx = x - rect.left;
        const ly = y - rect.top;
        return lx >= p.x + p.width * 0.15 && lx <= p.x + p.width * 0.85 && ly >= p.y + p.height * 0.12 && ly <= p.y + p.height * 0.94;
      }
    },
    touchZoneAt(x, y) {
      const rect = canvasRef.current?.getBoundingClientRect();
      const p = placement.current;
      const nx = (x - (rect?.left || 0) - p.x) / p.width;
      const ny = (y - (rect?.top || 0) - p.y) / p.height;
      return nx > .72 && ny > .4 ? 'tail' : ny < .5 ? 'head' : 'body';
    },
    triggerReaction(kind) {
      const now = performance.now();
      reaction.current = { kind, start: now, until: now + (DURATIONS[kind] || 1900) };
      if (['tap', 'tickle', 'tail', 'feed'].includes(kind)) {
        for (let i = 0; i < 5; i++) particles.current.push({ x: (Math.random() - .5) * 70, y: -85 - Math.random() * 20, age: 0, vx: (Math.random() - .5) * 15, kind: kind === 'feed' ? 'crumb' : 'heart' });
        particles.current = particles.current.slice(-24);
      }
    },
    cancelReaction() { reaction.current.until = 0; particles.current = []; },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const mask = document.createElement('canvas'); maskRef.current = mask;
    const hit = mask.getContext('2d', { willReadFrequently: true })!;
    const atlas = new Image(); atlas.decoding = 'async'; atlas.crossOrigin = 'anonymous';
    let disposed = false; let loaded = false; let raf = 0; let last = 0;
    let stateStart = performance.now(); let stateKey = ''; let previousAction = live.current.action;
    let lastMoving = false; let brakeAt = -1000; let lastBeat = -1000;
    let tilt = 0; let hop = 0;
    setFailed(false);
    atlas.onload = () => {
      if (disposed) return;
      loaded = atlas.naturalWidth === 1536 && atlas.naturalHeight === (live.current.version === 2 ? 2288 : 1872);
      setFailed(!loaded);
    };
    atlas.onerror = () => { if (!disposed) setFailed(true); };
    atlas.src = props.url;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (now - last < 32 || document.visibilityState === 'hidden' || !loaded) return;
      const dt = Math.min(.08, (now - (last || now)) / 1000); last = now;
      const p = live.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(p.width * dpr) || canvas.height !== Math.round(p.height * dpr)) {
        canvas.width = mask.width = Math.round(p.width * dpr);
        canvas.height = mask.height = Math.round(p.height * dpr);
      }
      for (const surface of [ctx, hit]) { surface.setTransform(dpr, 0, 0, dpr, 0, 0); surface.clearRect(0, 0, p.width, p.height); }
      const sleep = p.action === 'sleep'; const dragged = p.action === 'drag';
      const moving = p.motion.moving && !sleep && !dragged;
      if (previousAction === 'sleep' && !sleep && now >= reaction.current.until) reaction.current = { kind: 'wake', start: now, until: now + 1500 };
      if (sleep || dragged) reaction.current.until = 0;
      previousAction = p.action;
      if (lastMoving && !moving) brakeAt = now;
      lastMoving = moving;
      const r = reaction.current; const reacting = now < r.until;
      const age = now - r.start;
      const cursor = p.cursorOffsetRef.current;
      const audio = p.audioFrameRef.current;
      if (!sleep && !dragged && audio.active && audio.beatPulse > .55 && now - lastBeat > 360) lastBeat = now;
      let row = 0; let fixedFrame: number | undefined; let loop = true; let interval = 280;
      if (sleep) { row = p.sleepFrame?.row ?? 6; fixedFrame = p.sleepFrame?.frame; interval = 230; loop = false; }
      else if (dragged) { row = 5; fixedFrame = 0; }
      else if (reacting && r.kind === 'wake') { row = 6; fixedFrame = Math.max(0, 5 - Math.floor(age / 210)); }
      else if (reacting && r.kind === 'feed') { row = 0; fixedFrame = 0; }
      else if (reacting && ['tap', 'wave'].includes(r.kind)) { row = 3; interval = 230; }
      else if (reacting && ['tickle', 'tail', 'full'].includes(r.kind)) { row = 4; interval = 250; loop = false; }
      else if (moving) { row = p.motion.direction === 1 ? 1 : 2; interval = p.motion.pace === 'run' ? 90 : 135; }
      else if (p.speaking && p.speakingRow !== undefined) { row = p.speakingRow; interval = 220; }
      else if (p.action === 'playing' && audio.active && now - lastBeat < 600) { row = 8; fixedFrame = animationFrame(8, now - lastBeat, 100, false); }
      // Only opt in for an atlas whose full set of look frames has been checked.
      else if (p.followCursor && p.version === 2 && !reducedMotion.matches && Math.hypot(cursor.dx, cursor.dy) > 55 && Math.hypot(cursor.dx, cursor.dy) < 600) {
        const look = lookFrame(cursor.dx, cursor.dy); row = look.row; fixedFrame = look.frame;
      }
      const key = `${row}:${reacting ? r.start : 0}`;
      if (key !== stateKey) { stateKey = key; stateStart = now; }
      const frame = fixedFrame ?? (reducedMotion.matches && !moving && !sleep && !reacting ? 0 : animationFrame(row, now - stateStart, interval, loop));
      canvas.dataset.spriteRow = String(row); canvas.dataset.spriteFrame = String(frame);
      canvas.dataset.reaction = reacting ? r.kind : '';
      canvas.dataset.speaking = String(p.speaking && !sleep);
      canvas.dataset.renderMode = 'imported-sprite';
      const scale = p.preview ? Math.min(p.width * .98 / SPRITE_WIDTH, p.height * .86 / SPRITE_HEIGHT) : p.width / 340 * 1.08;
      const w = SPRITE_WIDTH * scale; const h = SPRITE_HEIGHT * scale;
      const ground = p.height * (p.preview ? .94 : .75);
      const cx = p.width / 2;
      const attention = !sleep && !reacting && !reducedMotion.matches ? Math.max(-.016, Math.min(.016, cursor.dx / 18000)) : 0;
      const targetTilt = dragged ? p.dragTiltRef.current : moving ? p.motion.direction * .025 : reacting && r.kind === 'tickle' ? Math.sin(age * .025) * .045 : attention;
      tilt += (targetTilt - tilt) * Math.min(1, dt * 13);
      const beatHop = !sleep && audio.active ? audio.beatPulse * 3 : 0;
      const targetHop = dragged ? 6 : !reducedMotion.matches && !sleep ? Math.sin(now * .0025) * 1.3 + beatHop : 0;
      hop += (targetHop - hop) * Math.min(1, dt * 10);
      const landingAge = reacting && r.kind === 'land' ? age : now - brakeAt;
      const settle = landingAge >= 0 && landingAge < 650 ? Math.sin(landingAge / 65) * Math.exp(-landingAge / 170) * .065 : 0;
      const chew = reacting && r.kind === 'feed' && age > 750 && age < 1700 ? Math.sin(age * .032) * .012 : 0;
      const breathe = sleep ? Math.sin(now * .002) * .006 : 0;
      placement.current = { x: cx - w / 2, y: ground - h, width: w, height: h };
      if (!dragged) {
        ctx.fillStyle = '#3655821a'; ctx.beginPath(); ctx.ellipse(cx, ground - 2, w * .29, 5 * scale, 0, 0, Math.PI * 2); ctx.fill();
      }
      for (const surface of [ctx, hit]) {
        surface.save(); surface.translate(cx, ground - hop); surface.rotate(tilt);
        surface.scale(1 + settle + chew, 1 - settle - chew + breathe);
        surface.drawImage(atlas, frame * SPRITE_WIDTH, row * SPRITE_HEIGHT, SPRITE_WIDTH, SPRITE_HEIGHT, -w / 2, -h, w, h);
        surface.restore();
      }
      if (reacting && r.kind === 'feed' && age < 900) {
        const t = Math.min(1, age / 900); const ease = 1 - Math.pow(1 - t, 3);
        drawFish(ctx, cx + (95 - 110 * ease) * scale, ground - h * .61 - Math.sin(t * Math.PI) * 20 * scale, scale * (t > .82 ? (1 - t) / .18 : 1));
      }
      particles.current = particles.current.filter(s => s.age < 1.6);
      for (const s of particles.current) {
        s.age += dt; s.x += s.vx * dt; s.y -= 24 * dt;
        ctx.globalAlpha = Math.min(1, (1.6 - s.age) * 2);
        if (s.kind === 'heart') drawHeart(ctx, cx + s.x * scale, ground - h * .48 + s.y * scale, 8 * scale);
        else if (age > 850) { ctx.fillStyle = '#e5ac67'; ctx.fillRect(cx + s.x * scale * .45, ground - h * .52 + (s.age - .5) * 18, 2.5, 2.5); }
      }
      ctx.globalAlpha = 1;
      if (sleep && now - stateStart > 1300) {
        ctx.fillStyle = '#799ac7'; ctx.font = '600 15px Segoe UI'; ctx.fillText('z', cx + w * .31, ground - h * .64 - Math.sin(now * .0015) * 3);
      }
    };
    raf = requestAnimationFrame(render);
    return () => { disposed = true; cancelAnimationFrame(raf); maskRef.current = null; };
  }, [props.url]);

  return <><canvas ref={canvasRef} className="pet-canvas" aria-label={props.ariaLabel || '动画伙伴'} style={{ width: props.width, height: props.height }} />
    {failed && <span className="sprite-load-error" role="alert">这个图集没能打开，请重新导入完整的宠物包。</span>}</>;
});
