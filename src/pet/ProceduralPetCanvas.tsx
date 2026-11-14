import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { AudioFrame, PetActionKey, PetThemePreset, PetReactionKey, PetTouchZone } from '../types';

export interface PetRendererHandle {
  isOpaqueAt: (clientX: number, clientY: number) => boolean;
  triggerReaction: (kind: PetReactionKey) => void;
  cancelReaction?: () => void;
  touchZoneAt?: (clientX: number, clientY: number) => PetTouchZone;
}

interface Props {
  width: number;
  height: number;
  theme: Exclude<PetThemePreset, 'whale' | 'whalegirl' | 'lingma'>;
  action: PetActionKey;
  snapEdge: string;
  audioFrameRef: React.MutableRefObject<AudioFrame>;
  cursorOffsetRef: React.MutableRefObject<{ dx: number; dy: number }>;
  dragTiltRef: React.MutableRefObject<number>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

const PALETTES: Record<
  Exclude<PetThemePreset, 'whale' | 'whalegirl' | 'lingma'>,
  {
    fur: string;
    furShadow: string;
    earOuter: string;
    earInner: string;
    belly: string;
    eye: string;
    blush: string;
    accent: string;
    accent2: string;
    outline: string;
    glow: string;
  }
> = {
  nyan: {
    fur: '#fffaf4',
    furShadow: '#f1e5d8',
    earOuter: '#2d3142',
    earInner: '#ff9ebb',
    belly: '#ffffff',
    eye: '#25293a',
    blush: 'rgba(255, 130, 160, 0.55)',
    accent: '#ff4d6d',
    accent2: '#4cc9f0',
    outline: '#2b2d42',
    glow: 'rgba(255, 110, 150, 0.45)',
  },
  cyber: {
    fur: '#22263d',
    furShadow: '#181b2e',
    earOuter: '#141726',
    earInner: '#00f5d4',
    belly: '#2f3554',
    eye: '#00f5d4',
    blush: 'rgba(247, 37, 133, 0.55)',
    accent: '#00f5d4',
    accent2: '#f72585',
    outline: '#72efdd',
    glow: 'rgba(0, 245, 212, 0.45)',
  },
  mochi: {
    fur: '#ffe5ec',
    furShadow: '#ffc2d1',
    earOuter: '#ff8fab',
    earInner: '#fff0f3',
    belly: '#fff8fa',
    eye: '#4a2c38',
    blush: 'rgba(255, 92, 138, 0.5)',
    accent: '#ff758f',
    accent2: '#ffd166',
    outline: '#6d3b4d',
    glow: 'rgba(255, 143, 171, 0.5)',
  },
};

export const ProceduralPetCanvas = forwardRef<PetRendererHandle, Props>(
  ({ width, height, theme, action, snapEdge, audioFrameRef, cursorOffsetRef, dragTiltRef }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const propsRef = useRef({ width, height, theme, action, snapEdge });
    propsRef.current = { width, height, theme, action, snapEdge };

    const reactionRef = useRef<{ type: 'tap' | 'feed' | null; until: number }>({ type: null, until: 0 });
    const eyeLerpRef = useRef({ x: 0, y: 0 });
    const blinkRef = useRef({ nextAt: performance.now() + 2600, closingUntil: 0 });
    const bounceVelRef = useRef(0);
    const bouncePosRef = useRef(0);
    const earWiggleRef = useRef(0);
    const lastNoteAtRef = useRef(0);

    const spawnParticles = (kind: 'tap' | 'feed' | 'note' | 'sleep') => {
      const { width: w, height: h, theme: th } = propsRef.current;
      const pal = PALETTES[th];
      const cx = w * 0.5;
      const cy = h * 0.48;
      if (kind === 'tap' || kind === 'feed') {
        const icons = kind === 'feed' ? ['🐟', '♥', '✦'] : ['♥', '✦', '♪'];
        for (let i = 0; i < 5; i++) {
          particlesRef.current.push({
            x: cx + (Math.random() - 0.5) * 54,
            y: cy - 22 + (Math.random() - 0.5) * 18,
            vx: (Math.random() - 0.5) * 1.4,
            vy: -1.1 - Math.random() * 1.1,
            life: 0,
            maxLife: 45 + Math.random() * 20,
            text: icons[i % icons.length],
            color: i % 2 === 0 ? pal.accent : pal.accent2,
            size: 13 + Math.random() * 5,
          });
        }
      } else if (kind === 'note') {
        const notes = ['♪', '♫', '♬'];
        particlesRef.current.push({
          x: cx + (Math.random() > 0.5 ? 1 : -1) * (38 + Math.random() * 18),
          y: cy - 18,
          vx: (Math.random() - 0.5) * 0.9,
          vy: -0.95 - Math.random() * 0.6,
          life: 0,
          maxLife: 56,
          text: notes[Math.floor(Math.random() * notes.length)],
          color: Math.random() > 0.5 ? pal.accent : pal.accent2,
          size: 14,
        });
      } else if (kind === 'sleep') {
        particlesRef.current.push({
          x: cx + 26,
          y: cy - 26,
          vx: 0.35,
          vy: -0.65,
          life: 0,
          maxLife: 70,
          text: 'Z',
          color: '#a8b2d1',
          size: 13,
        });
      }
    };

    useImperativeHandle(ref, () => ({
      isOpaqueAt: (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;
        if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) return false;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return false;
        const px = Math.floor(relX * canvas.width / rect.width);
        const py = Math.floor(relY * canvas.height / rect.height);
        // Sample a 5x5 neighborhood for forgiving hit-testing around outlines
        const sx = Math.max(0, px - 2);
        const sy = Math.max(0, py - 2);
        const sw = Math.min(5, canvas.width - sx);
        const sh = Math.min(5, canvas.height - sy);
        if (sw <= 0 || sh <= 0) return false;
        const data = ctx.getImageData(sx, sy, sw, sh).data;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 14) return true;
        }
        return false;
      },
      triggerReaction: (kind) => {
        if (kind === 'tap' || kind === 'feed') {
          reactionRef.current = { type: kind, until: performance.now() + 1400 };
          bounceVelRef.current = -4.2;
          earWiggleRef.current = 1;
          spawnParticles(kind);
        } else if (kind === 'beat') {
          bounceVelRef.current = -2.4;
          earWiggleRef.current = 0.7;
        }
      },
    }));

    useEffect(() => {
      let raf = 0;

      const render = (now: number) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          raf = requestAnimationFrame(render);
          return;
        }
        const { width: w, height: h, theme: th, action: act, snapEdge: edge } = propsRef.current;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const targetW = Math.round(w * dpr);
        const targetH = Math.round(h * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          raf = requestAnimationFrame(render);
          return;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const pal = PALETTES[th];
        const audio = audioFrameRef.current;
        const isPlaying = act === 'playing' || act === 'chorus' || audio.active;
        const isSleeping = act === 'sleep';
        const isDragging = act === 'drag';
        const reacting = reactionRef.current.until > now ? reactionRef.current.type : null;

        // Spring physics for beat bounce & tap hop
        if (audio.beatPulse > 0.62 && now - lastNoteAtRef.current > 420) {
          lastNoteAtRef.current = now;
          spawnParticles('note');
          earWiggleRef.current = Math.min(1, earWiggleRef.current + 0.45);
        }
        if (isSleeping && now - lastNoteAtRef.current > 1250) {
          lastNoteAtRef.current = now;
          spawnParticles('sleep');
        }

        const springForce = -0.18 * bouncePosRef.current;
        bounceVelRef.current = (bounceVelRef.current + springForce) * 0.78;
        bouncePosRef.current += bounceVelRef.current;
        earWiggleRef.current *= 0.9;

        // Lerp eye gaze toward global cursor
        const rawDx = cursorOffsetRef.current.dx;
        const rawDy = cursorOffsetRef.current.dy;
        const maxLook = 5.2;
        const targetEx = Math.max(-maxLook, Math.min(maxLook, rawDx * 0.018));
        const targetEy = Math.max(-maxLook * 0.7, Math.min(maxLook * 0.7, rawDy * 0.018));
        eyeLerpRef.current.x += (targetEx - eyeLerpRef.current.x) * 0.16;
        eyeLerpRef.current.y += (targetEy - eyeLerpRef.current.y) * 0.16;

        // Natural blinking
        if (now >= blinkRef.current.nextAt) {
          blinkRef.current.closingUntil = now + 130;
          blinkRef.current.nextAt = now + 2600 + Math.random() * 2200;
        }
        const isBlinking = now < blinkRef.current.closingUntil;

        const scale = Math.min(w, h) / 170;
        const cx = w * 0.5;
        const cy = h * 0.57;

        const breath = isSleeping ? Math.sin(now * 0.0022) * 1.8 : Math.sin(now * 0.0036) * 2.2;
        const beatHop = audio.active ? -audio.beatPulse * 8.5 * scale : 0;
        const swayX = isPlaying && !isDragging ? Math.sin(now * 0.0048) * 3.5 * scale : 0;
        const edgePeekTilt = edge === 'left' ? 0.09 : edge === 'right' ? -0.09 : 0;
        const tilt = isDragging ? dragTiltRef.current : (isPlaying ? Math.sin(now * 0.0048) * 0.055 : 0) + edgePeekTilt;

        // 1. Radial Audio Spectrum Halo behind pet
        if (isPlaying || audio.energy > 0.02) {
          const ringR = 54 * scale;
          ctx.save();
          ctx.translate(cx + swayX, cy - 8 * scale + beatHop * 0.5);
          const grad = ctx.createRadialGradient(0, 0, ringR * 0.4, 0, 0, ringR * 1.45);
          grad.addColorStop(0, pal.glow);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, ringR * 1.45, 0, Math.PI * 2);
          ctx.fill();

          const bars = audio.bins.length;
          for (let i = 0; i < bars; i++) {
            const angle = (i / bars) * Math.PI * 2 - Math.PI / 2 + now * 0.0005;
            const amp = audio.bins[i] || 0.08;
            const barLen = (4 + amp * 20) * scale;
            const x1 = Math.cos(angle) * ringR;
            const y1 = Math.sin(angle) * ringR;
            const x2 = Math.cos(angle) * (ringR + barLen);
            const y2 = Math.sin(angle) * (ringR + barLen);
            ctx.strokeStyle = i % 2 === 0 ? pal.accent : pal.accent2;
            ctx.lineWidth = Math.max(2, 2.8 * scale);
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.42 + amp * 0.55;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          ctx.restore();
        }

        // 2. Soft ground shadow (hidden while dragging high)
        if (!isDragging) {
          ctx.save();
          ctx.fillStyle = 'rgba(15, 18, 30, 0.22)';
          const shadowScale = Math.max(0.7, 1 - Math.abs(beatHop) / 40);
          ctx.beginPath();
          ctx.ellipse(cx + swayX, cy + 44 * scale, 34 * scale * shadowScale, 8 * scale * shadowScale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 3. Pet Body & Head Transform
        ctx.save();
        ctx.translate(cx + swayX, cy + bouncePosRef.current + beatHop + (isSleeping ? 8 * scale : 0));
        ctx.rotate(tilt);

        const squashX = 1 + (audio.beatPulse * 0.06) - (isDragging ? 0.05 : 0);
        const squashY = 1 - (audio.beatPulse * 0.05) + (isDragging ? 0.07 : 0);
        ctx.scale(scale * squashX, scale * squashY);

        // Tail (animated sine wave)
        ctx.save();
        const tailWave = Math.sin(now * (isPlaying ? 0.009 : 0.004)) * 12;
        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(24, 24);
        ctx.bezierCurveTo(44, 22 + tailWave * 0.4, 52, 4 + tailWave, 42, -8 + tailWave * 0.8);
        ctx.stroke();

        ctx.strokeStyle = pal.earOuter;
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.moveTo(24, 24);
        ctx.bezierCurveTo(44, 22 + tailWave * 0.4, 52, 4 + tailWave, 42, -8 + tailWave * 0.8);
        ctx.stroke();
        ctx.restore();

        // Chubby sitting body
        ctx.fillStyle = pal.fur;
        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(0, 20 + breath * 0.35, 29, 25 - breath * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Belly patch
        ctx.fillStyle = pal.belly;
        ctx.beginPath();
        ctx.ellipse(0, 23 + breath * 0.3, 17, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Collar & glowing bell / music gem
        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 4, 21, 0.24 * Math.PI, 0.76 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = pal.accent2;
        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 12, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Paws
        const leftPawY = isDragging ? 26 + Math.sin(now * 0.015) * 5 : isPlaying ? 15 - Math.abs(Math.sin(now * 0.008)) * 5 : 23;
        const rightPawY = isDragging ? 26 - Math.sin(now * 0.015) * 5 : isPlaying ? 15 - Math.abs(Math.cos(now * 0.008)) * 5 : 23;
        for (const [px, py] of [[-18, leftPawY], [18, rightPawY]]) {
          ctx.fillStyle = pal.fur;
          ctx.strokeStyle = pal.outline;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.ellipse(px, py, 7.5, 6.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Head group (follows cursor subtly)
        ctx.save();
        ctx.translate(eyeLerpRef.current.x * 0.55, -18 + breath * 0.5 + eyeLerpRef.current.y * 0.45);

        // Ears (wiggle on beat / tap)
        const earRot = Math.sin(now * 0.018) * 0.14 * earWiggleRef.current + (isPlaying ? audio.bass * 0.1 : 0);
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(side * 24, -22);
          ctx.rotate(side * (0.28 + earRot));
          ctx.fillStyle = pal.earOuter;
          ctx.strokeStyle = pal.outline;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(-12, 8);
          ctx.quadraticCurveTo(0, -24, 12, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = pal.earInner;
          ctx.beginPath();
          ctx.moveTo(-6.5, 5);
          ctx.quadraticCurveTo(0, -13, 6.5, 5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Head silhouette
        ctx.fillStyle = pal.fur;
        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 36, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Forehead cute stripes
        ctx.strokeStyle = pal.earOuter;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        for (const sx of [-6, 0, 6]) {
          ctx.beginPath();
          ctx.moveTo(sx, -27);
          ctx.lineTo(sx, -20);
          ctx.stroke();
        }

        // DJ Headphones when listening to music!
        if (isPlaying) {
          ctx.save();
          ctx.strokeStyle = pal.accent2;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, -2, 37.5, Math.PI * 1.07, Math.PI * 1.93);
          ctx.stroke();

          for (const side of [-1, 1]) {
            ctx.fillStyle = '#202436';
            ctx.strokeStyle = pal.accent;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.roundRect(side * 36 - 5.5, -10, 11, 20, 5);
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        }

        // Blush cheeks
        ctx.fillStyle = pal.blush;
        ctx.beginPath();
        ctx.ellipse(-20, 7, 6.5, 3.6, 0, 0, Math.PI * 2);
        ctx.ellipse(20, 7, 6.5, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const happyEyes = reacting === 'tap' || reacting === 'feed' || act === 'chorus';
        for (const side of [-1, 1]) {
          const ex = side * 14 + eyeLerpRef.current.x * 0.45;
          const ey = -1 + eyeLerpRef.current.y * 0.45;

          if (isSleeping) {
            ctx.strokeStyle = pal.outline;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(ex, ey + 2, 5.5, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();
          } else if (happyEyes) {
            ctx.strokeStyle = pal.outline;
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.arc(ex, ey + 2, 5.8, 1.15 * Math.PI, 1.85 * Math.PI);
            ctx.stroke();
          } else if (isBlinking) {
            ctx.strokeStyle = pal.outline;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(ex - 5.5, ey);
            ctx.lineTo(ex + 5.5, ey);
            ctx.stroke();
          } else {
            // Expressive glossy eye
            ctx.fillStyle = pal.eye;
            ctx.beginPath();
            ctx.ellipse(ex, ey, 5.6, 6.8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Catchlights
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ex - 1.8 + eyeLerpRef.current.x * 0.18, ey - 2.2 + eyeLerpRef.current.y * 0.18, 2.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(ex + 1.8, ey + 2.1, 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Nose & Mouth
        ctx.fillStyle = pal.earInner;
        ctx.beginPath();
        ctx.ellipse(0, 4.5, 2.4, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = pal.outline;
        ctx.lineWidth = 2.1;
        ctx.lineCap = 'round';
        if (isDragging) {
          // Surprised 'o' mouth
          ctx.fillStyle = '#ff758f';
          ctx.beginPath();
          ctx.arc(0, 10, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (happyEyes || isPlaying) {
          // Singing / happy 'w' smile
          ctx.beginPath();
          ctx.arc(-3.5, 8, 3.5, 0.05 * Math.PI, 0.95 * Math.PI);
          ctx.arc(3.5, 8, 3.5, 0.05 * Math.PI, 0.95 * Math.PI);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(-4, 8.5);
          ctx.quadraticCurveTo(0, 11, 4, 8.5);
          ctx.stroke();
        }

        ctx.restore(); // end head
        ctx.restore(); // end body

        // 4. Floating Particles (notes, hearts, Zzz)
        const nextParticles: Particle[] = [];
        for (const p of particlesRef.current) {
          p.life += 1;
          if (p.life >= p.maxLife) continue;
          p.x += p.vx;
          p.y += p.vy;
          const alpha = 1 - p.life / p.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.font = `bold ${Math.round(p.size)}px "Segoe UI Emoji", "Microsoft YaHei", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(p.text, p.x, p.y);
          ctx.restore();
          nextParticles.push(p);
        }
        particlesRef.current = nextParticles;

        raf = requestAnimationFrame(render);
      };

      raf = requestAnimationFrame(render);
      return () => cancelAnimationFrame(raf);
    }, [audioFrameRef, cursorOffsetRef, dragTiltRef]);

    return (
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    );
  },
);
