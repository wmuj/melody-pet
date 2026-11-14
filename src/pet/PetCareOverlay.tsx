import React, { useEffect, useRef } from 'react';
import type { AudioFrame, MotionState, PetActionKey, PetThemePreset } from '../types';
import type { HatId, NeckId, NestId, PetCareState, SnackId, ToyId } from './careSystem';

interface CareCanvasProps {
  width: number;
  height: number;
  action: PetActionKey;
  motion: MotionState;
  theme: PetThemePreset;
  activePackId: string;
  care: PetCareState;
  audioFrameRef: React.MutableRefObject<AudioFrame>;
  dragTiltRef: React.MutableRefObject<number>;
  preview?: boolean;
}

interface FloatingFx {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  kind: 'heart' | 'star' | 'bubble' | 'petal';
  color: string;
  size: number;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, rot = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const a2 = a1 + Math.PI / 5;
    if (i === 0) ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
    else ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    ctx.lineTo(Math.cos(a2) * (r * 0.46), Math.sin(a2) * (r * 0.46));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHeartShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 14, size / 14);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-15, -3, -7, -14, 0, -6);
  ctx.bezierCurveTo(7, -14, 15, -3, 0, 6);
  ctx.fill();
  ctx.restore();
}

function drawNest(
  ctx: CanvasRenderingContext2D,
  nestId: NestId,
  cx: number,
  groundY: number,
  scale: number,
  now: number,
  beat: number,
  isPlaying: boolean,
) {
  if (nestId === 'none') return;
  ctx.save();
  ctx.translate(cx, groundY);
  ctx.scale(scale, scale);

  if (nestId === 'cushion') {
    // 奶油云朵软垫：柔和阴影 + 双层圆垫 + 缝线 + 星星小抱枕
    ctx.fillStyle = 'rgba(130, 88, 60, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 92, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createLinearGradient(0, -18, 0, 16);
    grad.addColorStop(0, '#fffaf2');
    grad.addColorStop(0.65, '#fce8d2');
    grad.addColorStop(1, '#ecc8a5');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#d9ae86';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 86, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 软垫内圈压线
    ctx.strokeStyle = 'rgba(212, 163, 115, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(0, -2, 68, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 边角小绒球
    for (const px of [-76, -42, 0, 42, 76]) {
      const py = Math.sqrt(Math.max(0, 1 - (px * px) / (82 * 82))) * 17 + 2;
      ctx.fillStyle = '#fff5e8';
      ctx.strokeStyle = '#dbb18a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(px, py, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 左侧小星星靠枕
    drawStar(ctx, -64, -7 + Math.sin(now * 0.002) * 1.2, 13, '#ffd166', -0.22);
    drawStar(ctx, -64, -7 + Math.sin(now * 0.002) * 1.2, 7, '#fff3b0', -0.22);
  } else if (nestId === 'shell') {
    // 珍珠贝壳海景窝
    ctx.fillStyle = 'rgba(72, 128, 178, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 94, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    const shellGrad = ctx.createLinearGradient(-80, -18, 80, 16);
    shellGrad.addColorStop(0, '#ffe3ee');
    shellGrad.addColorStop(0.5, '#f3e8ff');
    shellGrad.addColorStop(1, '#d8f1ff');
    ctx.fillStyle = shellGrad;
    ctx.strokeStyle = '#c4b5e6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 88, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 贝壳扇形纹理
    ctx.strokeStyle = 'rgba(180, 162, 219, 0.5)';
    ctx.lineWidth = 1.3;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 8, 16);
      ctx.quadraticCurveTo(i * 18, 0, i * 23, -15);
      ctx.stroke();
    }

    // 发光小珍珠
    const pearlGlow = ctx.createRadialGradient(-65, -5, 1, -65, -5, 10);
    pearlGlow.addColorStop(0, '#ffffff');
    pearlGlow.addColorStop(0.7, '#ffeef7');
    pearlGlow.addColorStop(1, '#e0c8f0');
    ctx.fillStyle = pearlGlow;
    ctx.beginPath();
    ctx.arc(-65, -4, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // 右侧珊瑚小海星
    drawStar(ctx, 68, -3, 10, '#ff8fa3', 0.35);
  } else if (nestId === 'vinyl') {
    // 复古黑胶音乐毯 + 迷你律动音箱
    ctx.fillStyle = 'rgba(35, 28, 46, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 94, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    const pulse = isPlaying ? 1 + beat * 0.035 : 1;
    ctx.save();
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#2d2938';
    ctx.strokeStyle = '#f4a261';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 88, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 黑胶唱纹
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.1;
    for (const rx of [72, 56, 40]) {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, rx * 0.23, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 唱片中心暖橘圆标
    ctx.fillStyle = '#e76f51';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8f0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 右侧迷你复古木质小音箱
    const spkBounce = isPlaying ? Math.abs(Math.sin(now * 0.008)) * 2.5 + beat * 3 : 0;
    ctx.save();
    ctx.translate(72, -12 - spkBounce);
    ctx.fillStyle = '#c97c4b';
    ctx.strokeStyle = '#7f4826';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, -12, -10, 24, 20, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3d2c24';
    ctx.beginPath();
    ctx.arc(-4, 0, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4d35e';
    ctx.beginPath();
    ctx.arc(6, -3, 2, 0, Math.PI * 2);
    ctx.arc(6, 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (nestId === 'tatami') {
    // 森系抹茶榻榻米 + 迷你茶盏
    ctx.fillStyle = 'rgba(78, 108, 68, 0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 94, 21, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dce7c5';
    ctx.strokeStyle = '#588157';
    ctx.lineWidth = 3.5;
    drawRoundedRect(ctx, -86, -15, 172, 32, 12);
    ctx.fill();
    ctx.stroke();

    // 席面织纹
    ctx.strokeStyle = 'rgba(106, 153, 78, 0.25)';
    ctx.lineWidth = 1;
    for (let y = -9; y <= 11; y += 5) {
      ctx.beginPath();
      ctx.moveTo(-76, y);
      ctx.lineTo(76, y);
      ctx.stroke();
    }

    // 迷你热茶杯
    ctx.save();
    ctx.translate(68, -6);
    ctx.fillStyle = '#a3b18a';
    ctx.strokeStyle = '#3a5a40';
    ctx.lineWidth = 1.4;
    drawRoundedRect(ctx, -7, -6, 14, 13, 4);
    ctx.fill();
    ctx.stroke();
    // 袅袅茶烟
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.lineWidth = 1.3;
    const wisp = Math.sin(now * 0.004) * 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.quadraticCurveTo(wisp, -13, -wisp, -18);
    ctx.stroke();
    ctx.restore();
  } else if (nestId === 'cloud') {
    // 星月棉花糖云窝
    const floatY = Math.sin(now * 0.0025) * 2;
    ctx.translate(0, floatY);
    ctx.fillStyle = 'rgba(148, 125, 194, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 90, 19, 0, 0, Math.PI * 2);
    ctx.fill();

    const cloudGrad = ctx.createLinearGradient(0, -22, 0, 16);
    cloudGrad.addColorStop(0, '#ffffff');
    cloudGrad.addColorStop(0.7, '#fff5fb');
    cloudGrad.addColorStop(1, '#f3d9fa');
    ctx.fillStyle = cloudGrad;
    ctx.strokeStyle = '#e5c4f0';
    ctx.lineWidth = 1.8;

    const puffs = [
      { x: -62, y: 0, r: 17 },
      { x: -34, y: -4, r: 21 },
      { x: 0, y: -5, r: 23 },
      { x: 34, y: -4, r: 21 },
      { x: 62, y: 0, r: 17 },
    ];
    ctx.beginPath();
    for (const p of puffs) {
      ctx.moveTo(p.x + p.r, p.y);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    drawStar(ctx, -70, -4, 8, '#ffd166', now * 0.001);
    drawStar(ctx, 72, -2, 7, '#ff9ebb', -now * 0.001);
  }

  ctx.restore();
}

function drawHat(
  ctx: CanvasRenderingContext2D,
  hatId: HatId,
  x: number,
  y: number,
  scale: number,
  now: number,
  beat: number,
  isPlaying: boolean,
) {
  if (hatId === 'none') return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (hatId === 'ribbon') {
    // 丝绒红蝴蝶结
    ctx.rotate(-0.12);
    ctx.fillStyle = '#ff4d6d';
    ctx.strokeStyle = '#a4133c';
    ctx.lineWidth = 1.6;
    // 左翼
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-18, -14, -24, 10, 0, 5);
    ctx.fill();
    ctx.stroke();
    // 右翼
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(18, -14, 24, 10, 0, 5);
    ctx.fill();
    ctx.stroke();
    // 中心结
    ctx.fillStyle = '#ff758f';
    ctx.beginPath();
    ctx.arc(0, 2, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 白色波点
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(-10, -2, 1.8, 0, Math.PI * 2);
    ctx.arc(10, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (hatId === 'crown') {
    // 星光迷你皇冠
    ctx.rotate(0.06);
    const grad = ctx.createLinearGradient(0, -18, 0, 6);
    grad.addColorStop(0, '#ffe066');
    grad.addColorStop(1, '#f59f00');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.lineTo(-19, -12);
    ctx.lineTo(-8, -4);
    ctx.lineTo(0, -16);
    ctx.lineTo(8, -4);
    ctx.lineTo(19, -12);
    ctx.lineTo(16, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 宝石
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(0, -3, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4cc9f0';
    ctx.beginPath();
    ctx.arc(-9, -1, 2, 0, Math.PI * 2);
    ctx.arc(9, -1, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (hatId === 'beret') {
    // 奶油画家贝雷帽
    ctx.rotate(-0.14);
    ctx.fillStyle = '#f4a261';
    ctx.strokeStyle = '#9c4a1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 帽顶小揪揪
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(3, -15);
    ctx.stroke();
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.ellipse(-6, -3, 9, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (hatId === 'headphone') {
    // 霓虹律动猫耳耳机
    const glow = isPlaying ? 0.6 + beat * 0.4 : 0.25;
    ctx.strokeStyle = '#3b4254';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 14, 34, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(dir * 22, -6);
      ctx.rotate(dir * 0.28);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#3b4254';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-8, 6);
      ctx.lineTo(0, -9);
      ctx.lineTo(8, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 92, 148, ${0.55 + glow * 0.45})`;
      ctx.beginPath();
      ctx.moveTo(-4.5, 4);
      ctx.lineTo(0, -4.5);
      ctx.lineTo(4.5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (hatId === 'sakura') {
    // 春日粉樱发簪
    ctx.translate(14, 4);
    for (const [ox, oy, sc] of [[0, 0, 1], [-12, 5, 0.72]] as const) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(sc, sc);
      ctx.rotate(Math.sin(now * 0.002 + ox) * 0.08);
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 5);
        ctx.fillStyle = '#ffb3c6';
        ctx.strokeStyle = '#e06c88';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(0, -7, 4.5, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (hatId === 'sunglasses') {
    // 复古甜酷墨镜（下移到眼部位置）
    ctx.translate(0, 26);
    ctx.fillStyle = '#2b2d42';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.8;
    drawRoundedRect(ctx, -23, -6, 19, 12, 4);
    ctx.fill();
    ctx.stroke();
    drawRoundedRect(ctx, 4, -6, 19, 12, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -1);
    ctx.lineTo(4, -1);
    ctx.stroke();
    // 镜片高光
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-19, -3);
    ctx.lineTo(-14, 3);
    ctx.moveTo(8, -3);
    ctx.lineTo(13, 3);
    ctx.stroke();
  } else if (hatId === 'halo') {
    // 音符天使光环
    const floatY = Math.sin(now * 0.004) * 3;
    ctx.translate(0, -8 + floatY);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3.2;
    ctx.shadowColor = 'rgba(255, 209, 102, 0.85)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawStar(ctx, -24, 0, 5.5, '#fff3b0', now * 0.002);
    drawStar(ctx, 24, 0, 5.5, '#fff3b0', -now * 0.002);
  }

  ctx.restore();
}

function drawNeck(ctx: CanvasRenderingContext2D, neckId: NeckId, x: number, y: number, scale: number, now: number) {
  if (neckId === 'none') return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (neckId === 'scarf') {
    // 暖绒红格小围巾
    ctx.fillStyle = '#e63946';
    ctx.strokeStyle = '#9d0208';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, -22, -5, 44, 11, 5.5);
    ctx.fill();
    ctx.stroke();
    // 围巾垂尾
    ctx.beginPath();
    drawRoundedRect(ctx, 6, 2, 11, 18, 4);
    ctx.fill();
    ctx.stroke();
    // 暖白格纹条
    ctx.strokeStyle = 'rgba(255, 243, 224, 0.75)';
    ctx.lineWidth = 1.6;
    for (const sx of [-13, -3, 7, 15]) {
      ctx.beginPath();
      ctx.moveTo(sx, -4);
      ctx.lineTo(sx, 5);
      ctx.stroke();
    }
  } else if (neckId === 'bell') {
    // 招财金铃铛项圈
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, -1);
    ctx.quadraticCurveTo(0, 5, 18, -1);
    ctx.stroke();

    const swing = Math.sin(now * 0.005) * 0.12;
    ctx.rotate(swing);
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 6, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, 8, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, 4);
    ctx.lineTo(5, 4);
    ctx.stroke();
  } else if (neckId === 'bib') {
    // 草莓蕾丝小围兜
    ctx.fillStyle = '#fff5f8';
    ctx.strokeStyle = '#f48fb1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 2, 16, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawHeartShape(ctx, 0, 10, 8, '#ff4d6d');
  } else if (neckId === 'bowtie') {
    // 星空丝绸领结
    ctx.fillStyle = '#4361ee';
    ctx.strokeStyle = '#1d3557';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(-14, -5);
    ctx.lineTo(-14, 9);
    ctx.closePath();
    ctx.moveTo(0, 2);
    ctx.lineTo(14, -5);
    ctx.lineTo(14, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawStar(ctx, 0, 2, 4.8, '#ffd166');
  } else if (neckId === 'bag') {
    // 小黄鸭斜挎包
    ctx.strokeStyle = '#8d5524';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-16, -4);
    ctx.lineTo(18, 18);
    ctx.stroke();

    ctx.translate(18, 17);
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fb8500';
    ctx.beginPath();
    ctx.ellipse(0, 2, 3.8, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSnackIcon(ctx: CanvasRenderingContext2D, snackId: SnackId, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (snackId === 'mochi') {
    // 草莓雪媚娘
    ctx.fillStyle = '#fff5f7';
    ctx.strokeStyle = '#f48fb1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 4, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(0, -4, 6.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (snackId === 'boba') {
    // 黑糖珍珠奶茶
    ctx.fillStyle = '#f3d5b5';
    ctx.strokeStyle = '#8b5e3c';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, -9, -8, 18, 22, 4);
    ctx.fill();
    ctx.stroke();
    // 吸管
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(6, -17);
    ctx.stroke();
    // 珍珠
    ctx.fillStyle = '#3d2516';
    for (const [bx, by] of [[-4, 9], [1, 10], [5, 8], [-2, 5]] as const) {
      ctx.beginPath();
      ctx.arc(bx, by, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (snackId === 'pudding') {
    // 焦糖布丁
    ctx.fillStyle = '#ffe066';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-13, 10);
    ctx.lineTo(-9, -6);
    ctx.lineTo(9, -6);
    ctx.lineTo(13, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(0, -5, 9.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (snackId === 'cake') {
    // 蜂蜜芝士蛋糕
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#ca6702';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-14, 8);
    ctx.lineTo(0, -10);
    ctx.lineTo(14, 2);
    ctx.lineTo(14, 11);
    ctx.lineTo(-14, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(0, -9, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (snackId === 'sushi') {
    // 三文鱼握寿司
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.4;
    drawRoundedRect(ctx, -12, 0, 24, 11, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff7b54';
    drawRoundedRect(ctx, -14, -6, 28, 8, 4);
    ctx.fill();
  } else {
    // 黄金小鱼干
    ctx.fillStyle = '#f4a261';
    ctx.strokeStyle = '#9c4a1a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(19, -7);
    ctx.lineTo(19, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export const PetNestCanvas: React.FC<CareCanvasProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  live.current = props;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = 0;

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (now - last < 33 || document.visibilityState === 'hidden') return;
      last = now;
      const p = live.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(p.width * dpr) || canvas.height !== Math.round(p.height * dpr)) {
        canvas.width = Math.round(p.width * dpr);
        canvas.height = Math.round(p.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, p.width, p.height);

      if (p.care.nestId === 'none') return;
      const dragged = p.action === 'drag';
      const ground = p.height * (p.preview ? 0.905 : 0.755);
      const cx = p.width / 2;
      const baseScale = (p.width / 340) * (p.preview ? 1.02 : 0.96) * (dragged ? 0.88 : 1);
      const beat = p.audioFrameRef.current.active ? p.audioFrameRef.current.beatPulse : 0;

      ctx.globalAlpha = dragged ? 0.45 : 0.96;
      drawNest(ctx, p.care.nestId, cx, ground, baseScale, now, beat, p.action === 'playing');
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pet-care-nest-canvas"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: props.width, height: props.height, pointerEvents: 'none' }}
    />
  );
};

export const PetOutfitCanvas: React.FC<CareCanvasProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  live.current = props;
  const fxList = useRef<FloatingFx[]>([]);
  const lastSnackId = useRef<string>('');
  const lastToyId = useRef<string>('');
  const snackAnim = useRef<{ snackId: SnackId; start: number; until: number }>({ snackId: 'fish', start: 0, until: 0 });
  const toyAnim = useRef<{ toyId: ToyId; start: number; until: number }>({ toyId: 'bubbles', start: 0, until: 0 });

  useEffect(() => {
    const ev = props.care.lastSnackEvent;
    if (!ev || ev.id === lastSnackId.current || Date.now() - ev.at > 4000) return;
    lastSnackId.current = ev.id;
    const now = performance.now();
    snackAnim.current = { snackId: ev.snackId, start: now, until: now + 1800 };
    const colors = ['#ff5c8a', '#ffd166', '#ff9ebb', '#4cc9f0', '#f4a261'];
    for (let i = 0; i < 9; i++) {
      fxList.current.push({
        x: (Math.random() - 0.5) * 90,
        y: -75 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 24,
        vy: -26 - Math.random() * 18,
        age: 0,
        maxAge: 1.4 + Math.random() * 0.5,
        kind: i % 2 === 0 ? 'heart' : 'star',
        color: colors[i % colors.length],
        size: 8 + Math.random() * 5,
      });
    }
  }, [props.care.lastSnackEvent]);

  useEffect(() => {
    const ev = props.care.lastToyEvent;
    if (!ev || ev.id === lastToyId.current || Date.now() - ev.at > 4000) return;
    lastToyId.current = ev.id;
    const now = performance.now();
    toyAnim.current = { toyId: ev.toyId, start: now, until: now + 2400 };
    const colors = ['#72efdd', '#ff9ebb', '#ffd166', '#a2d2ff', '#cdb4db'];
    for (let i = 0; i < 12; i++) {
      fxList.current.push({
        x: (Math.random() - 0.5) * 110,
        y: -45 - Math.random() * 55,
        vx: (Math.random() - 0.5) * 28,
        vy: -28 - Math.random() * 22,
        age: 0,
        maxAge: 1.6 + Math.random() * 0.6,
        kind: ev.toyId === 'bubbles' ? 'bubble' : i % 2 === 0 ? 'star' : 'heart',
        color: colors[i % colors.length],
        size: 9 + Math.random() * 6,
      });
    }
  }, [props.care.lastToyEvent]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = 0;
    let bounce = 0;
    let tilt = 0;

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (now - last < 33 || document.visibilityState === 'hidden') return;
      const dt = Math.min(0.08, (now - (last || now)) / 1000);
      last = now;
      const p = live.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(p.width * dpr) || canvas.height !== Math.round(p.height * dpr)) {
        canvas.width = Math.round(p.width * dpr);
        canvas.height = Math.round(p.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, p.width, p.height);

      const sleep = p.action === 'sleep';
      const dragged = p.action === 'drag';
      const moving = p.motion.moving && !sleep && !dragged;
      const audio = p.audioFrameRef.current;
      const beat = !sleep && audio.active ? audio.beatPulse : 0;

      const phase = now * (p.motion.pace === 'run' ? 0.021 : 0.014);
      const targetBounce = dragged ? 8 : moving ? Math.abs(Math.sin(phase)) * 4 : Math.sin(now * 0.0025) * 1.2 + beat * 3;
      bounce += (targetBounce - bounce) * Math.min(1, dt * 13);

      const targetTilt = dragged ? p.dragTiltRef.current : moving ? p.motion.direction * 0.045 : sleep ? 0.06 : 0;
      tilt += (targetTilt - tilt) * Math.min(1, dt * 11);

      const cx = p.width / 2;
      const ground = p.height * (p.preview ? 0.91 : 0.75);
      const unit = (p.width / 340) * (p.preview ? 1.05 : 0.95);

      // 根据不同内置形象及用户微调参数计算头顶与脖颈锚点高度
      const isRoundWhale = p.activePackId === 'builtin' && p.theme === 'whale';
      const isLingmaOrSprite = p.activePackId !== 'builtin' || p.theme === 'lingma';
      const baseHeadY = isRoundWhale ? 132 : isLingmaOrSprite ? 168 : 182;
      const headOffsetY = (baseHeadY - (p.care.hatOffsetY || 0)) * unit;
      const neckOffsetY = (isRoundWhale ? 58 : isLingmaOrSprite ? 72 : 76) * unit;
      const itemScale = unit * (p.care.outfitScale || 1);

      ctx.save();
      ctx.translate(cx, ground - bounce);
      ctx.rotate(tilt);

      drawNeck(ctx, p.care.neckId, 0, -neckOffsetY, itemScale, now);
      drawHat(ctx, p.care.hatId, 0, -headOffsetY, itemScale, now, beat, p.action === 'playing');
      ctx.restore();

      // 陪玩小玩具特效动画
      const ta = toyAnim.current;
      if (now < ta.until) {
        const age = now - ta.start;
        const t = Math.min(1, age / 2200);
        if (ta.toyId === 'yarn') {
          const bx = cx + Math.sin(age * 0.006) * 58 * unit;
          const by = ground - 14 * unit - Math.abs(Math.sin(age * 0.011)) * 38 * unit;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(age * 0.012);
          ctx.scale(unit * 1.1, unit * 1.1);
          ctx.fillStyle = '#ff8fab';
          ctx.strokeStyle = '#c9184a';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#ffe5ec';
          ctx.beginPath();
          ctx.arc(-3, -2, 8, 0.2, 2.4);
          ctx.moveTo(-9, 5);
          ctx.quadraticCurveTo(0, -4, 9, 5);
          ctx.stroke();
          ctx.restore();
        } else if (ta.toyId === 'wand') {
          const wx = cx + 62 * unit + Math.sin(age * 0.01) * 18 * unit;
          const wy = ground - 135 * unit + Math.cos(age * 0.01) * 14 * unit;
          ctx.save();
          ctx.translate(wx, wy);
          ctx.rotate(-0.4 + Math.sin(age * 0.014) * 0.35);
          ctx.scale(unit, unit);
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 26);
          ctx.lineTo(0, 0);
          ctx.stroke();
          drawStar(ctx, 0, -4, 13, '#ffd166', age * 0.005);
          ctx.restore();
        } else if (ta.toyId === 'musicbox' && t < 0.9) {
          ctx.save();
          ctx.translate(cx - 66 * unit, ground - 22 * unit);
          ctx.scale(unit, unit);
          ctx.fillStyle = 'rgba(190, 235, 255, 0.55)';
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, -8, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#b45309';
          drawRoundedRect(ctx, -14, 5, 28, 8, 3);
          ctx.fill();
          drawStar(ctx, 0, -8, 7, '#ffd166', age * 0.004);
          ctx.restore();
        }
      }

      // 投喂专属零食飞入动画
      const sa = snackAnim.current;
      if (now < sa.until) {
        const age = now - sa.start;
        if (age < 920) {
          const t = Math.min(1, age / 920);
          const ease = 1 - Math.pow(1 - t, 3);
          const sx = cx + (92 - 92 * ease) * unit;
          const sy = ground - 115 * unit - Math.sin(t * Math.PI) * 26 * unit;
          const sc = unit * (t > 0.8 ? (1 - t) / 0.2 : 1.15);
          drawSnackIcon(ctx, sa.snackId, sx, sy, sc);
        }
      }

      // 飘浮爱心与星光粒子
      fxList.current = fxList.current.filter(item => item.age < item.maxAge);
      for (const fx of fxList.current) {
        fx.age += dt;
        fx.x += fx.vx * dt;
        fx.y += fx.vy * dt;
        const alpha = Math.max(0, Math.min(1, (fx.maxAge - fx.age) * 1.8));
        ctx.globalAlpha = alpha;
        if (fx.kind === 'heart') {
          drawHeartShape(ctx, cx + fx.x * unit, ground + fx.y * unit, fx.size * unit, fx.color);
        } else if (fx.kind === 'bubble') {
          ctx.save();
          ctx.translate(cx + fx.x * unit, ground + fx.y * unit);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
          ctx.strokeStyle = fx.color;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, fx.size * 0.7 * unit, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-fx.size * 0.22 * unit, -fx.size * 0.22 * unit, 1.8 * unit, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          drawStar(ctx, cx + fx.x * unit, ground + fx.y * unit, (fx.size * 0.65) * unit, fx.color, fx.age * 3);
        }
      }
      ctx.globalAlpha = 1;
    };

    function itemMaxAge(fx: FloatingFx) { return fx.maxAge; }
    void itemMaxAge;

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pet-care-outfit-canvas"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: props.width, height: props.height, pointerEvents: 'none', zIndex: 1 }}
    />
  );
};
