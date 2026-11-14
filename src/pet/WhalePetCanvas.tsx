import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { AudioFrame, MotionState, PetActionKey } from '../types';
import type { PetRendererHandle } from './ProceduralPetCanvas';

interface Props {
  width: number;
  height: number;
  action: PetActionKey;
  speaking: boolean;
  motion: MotionState;
  audioFrameRef: React.MutableRefObject<AudioFrame>;
  cursorOffsetRef: React.MutableRefObject<{ dx: number; dy: number }>;
  dragTiltRef: React.MutableRefObject<number>;
}

interface Sparkle { x: number; y: number; vx: number; vy: number; age: number; life: number; kind: 'heart' | 'bubble' | 'note' }

const BODY = new Path2D('M -75 8 C -89 -42 -52 -78 -5 -76 C 39 -80 73 -48 75 -6 C 80 34 56 69 12 73 C -35 81 -78 60 -75 8 Z');
const TAIL = new Path2D('M 54 18 C 74 26 89 17 98 3 C 89 -7 88 -24 98 -35 C 117 -30 122 -13 116 0 C 130 -10 143 -5 149 7 C 138 25 120 27 108 18 C 95 48 78 53 55 46 Z');
const BELLY = new Path2D('M -80 22 C -51 6 -23 25 0 37 C 25 54 55 45 79 17 L 90 90 L -90 90 Z');
const FIN = new Path2D('M -12 -9 C -25 -1 -23 23 -11 30 C 2 31 19 13 14 -3 C 11 -12 -3 -16 -12 -9 Z');

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rotation = 0) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fill();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 14, size / 14);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-17, -5, -8, -16, 0, -8);
  ctx.bezierCurveTo(8, -16, 17, -5, 0, 5);
  ctx.fillStyle = '#f28daf';
  ctx.fill();
  ctx.restore();
}

/** An original little whale, drawn as an articulated character rather than a looping movie. */
export const WhalePetCanvas = forwardRef<PetRendererHandle, Props>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const live = useRef(props);
  live.current = props;
  const particles = useRef<Sparkle[]>([]);
  const reaction = useRef({ kind: '', until: 0 });
  const eyes = useRef({ x: 0, y: 0 });
  const blinking = useRef({ next: performance.now() + 2300, until: 0 });

  useImperativeHandle(ref, () => ({
    isOpaqueAt(x, y) {
      const canvas = canvasRef.current;
      const mask = maskRef.current;
      if (!canvas || !mask) return false;
      const rect = canvas.getBoundingClientRect();
      const px = Math.floor((x - rect.left) * mask.width / rect.width);
      const py = Math.floor((y - rect.top) * mask.height / rect.height);
      if (px < 0 || py < 0 || px >= mask.width || py >= mask.height) return false;
      return (mask.getContext('2d', { willReadFrequently: true })?.getImageData(px, py, 1, 1).data[3] || 0) > 100;
    },
    triggerReaction(kind) {
      reaction.current = { kind, until: performance.now() + 1500 };
      for (let i = 0; i < 7; i++) particles.current.push({
        x: (Math.random() - 0.5) * 90, y: -25 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 32, vy: -25 - Math.random() * 36,
        age: 0, life: 1 + Math.random() * 0.7, kind: i % 3 === 0 ? 'bubble' : 'heart',
      });
    },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const mask = document.createElement('canvas');
    maskRef.current = mask;
    const ctx = canvas.getContext('2d')!;
    const hit = mask.getContext('2d', { willReadFrequently: true })!;
    let raf = 0;
    let last = 0;
    let lastNote = 0;

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (now - last < 16 || document.visibilityState === 'hidden') return;
      const dt = Math.min(0.06, (now - (last || now)) / 1000);
      last = now;
      const p = live.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const pixelW = Math.round(p.width * dpr);
      const pixelH = Math.round(p.height * dpr);
      if (canvas.width !== pixelW || canvas.height !== pixelH) {
        canvas.width = mask.width = pixelW;
        canvas.height = mask.height = pixelH;
      }
      for (const surface of [ctx, hit]) {
        surface.setTransform(dpr, 0, 0, dpr, 0, 0);
        surface.clearRect(0, 0, p.width, p.height);
      }

      const audio = p.audioFrameRef.current;
      const sleep = p.action === 'sleep';
      const dragged = p.action === 'drag';
      const moving = p.motion.moving && !dragged && !sleep;
      const playing = p.action === 'playing' || p.action === 'chorus';
      const happy = p.action === 'tap' || p.action === 'happy' || now < reaction.current.until;
      const scale = p.width / 340;
      const direction = p.motion.direction === 1 ? -1 : 1;
      const phase = now * (p.motion.pace === 'run' ? 0.019 : 0.012);
      const breath = Math.sin(now * (sleep ? 0.0018 : 0.0027));
      const hop = moving ? Math.abs(Math.sin(phase)) * (p.motion.pace === 'run' ? 13 : 7) : 0;
      const joy = happy ? Math.abs(Math.sin(now * 0.011)) * 5 : 0;
      const bounce = dragged ? 0 : hop + joy + audio.beatPulse * 8;
      const cx = p.width * 0.5;
      const cy = p.height * 0.565 + (sleep ? 11 : 0);
      const tilt = dragged ? p.dragTiltRef.current : moving ? Math.sin(phase) * 0.048 : Math.sin(now * 0.0021) * 0.02;
      const eyeTarget = p.cursorOffsetRef.current;
      eyes.current.x += (Math.max(-3.5, Math.min(3.5, eyeTarget.dx / 150)) - eyes.current.x) * 0.085;
      eyes.current.y += (Math.max(-2.5, Math.min(2.5, eyeTarget.dy / 170)) - eyes.current.y) * 0.085;
      if (now >= blinking.current.next) {
        blinking.current.until = now + 145;
        blinking.current.next = now + 2600 + Math.random() * 3200;
      }

      // A soft shadow and decorative bubbles must never intercept desktop clicks.
      if (!dragged) ellipse(ctx, cx + 4 * scale, cy + 78 * scale, (63 - bounce * 0.7) * scale, 7 * scale, 'rgba(39, 82, 137, 0.13)');
      if (moving) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#a4c9f1';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const trailing = p.motion.direction === 1 ? -1 : 1;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + trailing * (98 + i * 9) * scale, cy + (34 + i * 8) * scale);
          ctx.lineTo(cx + trailing * (111 + i * 11) * scale, cy + (34 + i * 8) * scale);
          ctx.stroke();
        }
        ctx.restore();
      }

      const bodyTransform = (surface: CanvasRenderingContext2D) => {
        surface.save();
        surface.translate(cx, cy - bounce * scale);
        surface.rotate(tilt);
        const squash = moving ? Math.cos(phase * 2) * 0.025 : breath * 0.012;
        surface.scale(scale * direction * (1 + squash), scale * (1 - squash + (dragged ? 0.05 : 0)));
        surface.lineCap = 'round';
        surface.lineJoin = 'round';
      };

      for (const surface of [ctx, hit]) {
        const silhouette = surface === hit;
        bodyTransform(surface);
        surface.save();
        surface.translate(60, 20);
        surface.rotate(Math.sin(now * (moving ? 0.018 : 0.005)) * (moving ? 0.19 : 0.085));
        surface.translate(-60, -20);
        surface.fillStyle = silhouette ? '#fff' : '#639fef';
        surface.fill(TAIL);
        if (!silhouette) { surface.strokeStyle = '#3c78c6'; surface.lineWidth = 2; surface.stroke(TAIL); }
        surface.restore();

        if (silhouette) surface.fillStyle = '#fff';
        else {
          const skin = surface.createLinearGradient(-62, -66, 60, 63);
          skin.addColorStop(0, '#9dd4ff');
          skin.addColorStop(0.35, '#77b8fb');
          skin.addColorStop(0.75, '#5498ed');
          skin.addColorStop(1, '#4387df');
          surface.fillStyle = skin;
        }
        surface.fill(BODY);
        if (!silhouette) {
          surface.save();
          surface.clip(BODY);
          const belly = surface.createLinearGradient(-20, 21, 5, 77);
          belly.addColorStop(0, '#fbfdff');
          belly.addColorStop(1, '#d9ebff');
          surface.fillStyle = belly;
          surface.fill(BELLY);
          surface.restore();
          surface.strokeStyle = '#477fc7';
          surface.lineWidth = 2.1;
          surface.stroke(BODY);
          ellipse(surface, -38, -47, 23, 8, 'rgba(232, 249, 255, 0.48)', -0.42);
          ellipse(surface, -63, -28, 4, 6, 'rgba(245, 252, 255, 0.60)', 0.45);
        }

        // Little paddles double as feet when the whale waddles across the desktop.
        for (const side of [-1, 1]) {
          surface.save();
          surface.translate(side === -1 ? -46 : 45, 45);
          surface.rotate(side * 0.3 + (moving ? Math.sin(phase + (side === -1 ? 0 : Math.PI)) * 0.56 : dragged ? Math.sin(now * 0.016) * 0.5 : breath * 0.06));
          surface.scale(side === -1 ? 0.81 : 0.94, 0.84);
          surface.fillStyle = silhouette ? '#fff' : side === -1 ? '#77b6f7' : '#65a4ef';
          surface.fill(FIN);
          if (!silhouette) { surface.strokeStyle = '#4d85ca'; surface.lineWidth = 2; surface.stroke(FIN); }
          surface.restore();
        }

        if (!silhouette) {
          // A tiny water tuft makes the silhouette readable as a whale even at small size.
          if (!sleep) {
            surface.strokeStyle = '#9bd8ff';
            surface.lineWidth = 4;
            surface.beginPath();
            surface.moveTo(-3, -77);
            surface.quadraticCurveTo(-8, -96 - breath * 2, -18, -88);
            surface.moveTo(-3, -77);
            surface.quadraticCurveTo(5, -101 + breath * 2, 12, -90);
            surface.stroke();
            ellipse(surface, -20, -88, 4, 3, '#bce8ff', 0.4);
            ellipse(surface, 13, -90, 3.5, 3, '#bce8ff', -0.4);
          }

          // Warm blush, tiny glossy eyes, and a mouth animated only while speech is active.
          ellipse(surface, -62, 15, 10, 5.3, happy ? '#f8a9c0' : '#f2b4ca', -0.1);
          ellipse(surface, 13, 18, 10, 5.3, happy ? '#f8a9c0' : '#f2b4ca', 0.1);
          for (const eyeX of [-47, -5]) {
            const ex = eyeX + eyes.current.x * direction;
            const ey = -2 + eyes.current.y;
            if (sleep || happy || now < blinking.current.until) {
              surface.strokeStyle = '#234776';
              surface.lineWidth = 3.5;
              surface.beginPath();
              surface.moveTo(ex - 5.5, ey + (happy ? 2 : 0));
              surface.quadraticCurveTo(ex, ey + (happy ? -6 : 6), ex + 5.5, ey + (happy ? 2 : 0));
              surface.stroke();
            } else {
              ellipse(surface, ex, ey, dragged ? 8 : 6.8, dragged ? 11 : 9.5, '#204473');
              ellipse(surface, ex - 1.9, ey - 3.2, 2.8, 3.2, '#fff');
              ellipse(surface, ex + 2.1, ey + 4.1, 1.3, 1.5, '#abd7ff');
            }
          }
          const mouthY = 16;
          if (p.speaking || dragged || happy) {
            const openness = p.speaking ? 4.5 + Math.abs(Math.sin(now * 0.023) * Math.cos(now * 0.007)) * 6 : dragged ? 7 : 6;
            ellipse(surface, -25, mouthY + 3, happy ? 8 : 5.2, openness, '#34547d');
            ellipse(surface, -25, mouthY + 3 + openness * 0.48, happy ? 5 : 3.3, openness * 0.32, '#f4a7b7');
          } else {
            surface.strokeStyle = '#34547d';
            surface.lineWidth = 2.7;
            surface.beginPath();
            surface.moveTo(-32, mouthY);
            surface.quadraticCurveTo(-25, mouthY + (sleep ? 3 : 8), -18, mouthY);
            surface.stroke();
          }

          if (playing) {
            surface.strokeStyle = '#637cd0';
            surface.lineWidth = 7;
            surface.beginPath();
            surface.ellipse(-7, -5, 73, 74, 0, Math.PI * 1.03, Math.PI * 1.99);
            surface.stroke();
            for (const x of [-78, 60]) {
              surface.fillStyle = '#6a86d9';
              surface.beginPath(); surface.roundRect(x - 7, -10, 15, 31, 7); surface.fill();
              surface.fillStyle = '#cadbff';
              surface.beginPath(); surface.roundRect(x - 3, -4, 5, 19, 2); surface.fill();
            }
          }
        }
        surface.restore();
      }

      if ((playing || sleep) && now - lastNote > (sleep ? 1900 : 1300)) {
        lastNote = now;
        particles.current.push({ x: 40 + Math.random() * 20, y: -57, vx: 12, vy: -22, age: 0, life: 2.1, kind: 'note' });
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      particles.current = particles.current.filter(s => s.age < s.life);
      for (const s of particles.current) {
        s.age += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        ctx.globalAlpha = Math.min(1, (s.life - s.age) * 2);
        if (s.kind === 'heart') heart(ctx, s.x, s.y, 10);
        else if (s.kind === 'bubble') {
          ctx.strokeStyle = '#a5d8fb'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(s.x, s.y, 4 + s.age, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.fillStyle = sleep ? '#7795be' : '#729de4';
          ctx.font = `600 ${sleep ? 15 + s.age * 3 : 21}px "Segoe UI", sans-serif`;
          ctx.fillText(sleep ? 'z' : '♪', s.x, s.y);
        }
      }
      ctx.restore();
    };
    raf = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(raf); maskRef.current = null; };
  }, []);

  return <canvas ref={canvasRef} aria-label="圆滚滚的蓝色小鲸鱼" className="pet-canvas" style={{ width: props.width, height: props.height }} />;
});
