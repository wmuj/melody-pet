import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { AudioFrame, PetActionKey, PetPack, PetPackAsset } from '../types';
import type { PetRendererHandle } from './ProceduralPetCanvas';

interface Props {
  pack: PetPack;
  action: PetActionKey;
  width: number;
  height: number;
  audioFrameRef: React.MutableRefObject<AudioFrame>;
}

/**
 * Dual-slot zero-flicker transparent WebM / GIF / Image player inspired by NetEase's VideoSlotPool + BlobCache.
 * Pre-decodes the next video slot in hidden state until first frame is ready via requestVideoFrameCallback/loadeddata,
 * then swaps visibility atomically with zero blank frame!
 */
export const VideoPackRenderer = forwardRef<PetRendererHandle, Props>(({ pack, action, width, height, audioFrameRef }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const blobCacheRef = useRef<Map<string, string>>(new Map());
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const standbyVideoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentUrlRef = useRef<string>('');
  const switchSeqRef = useRef(0);

  const pickAsset = (act: PetActionKey): PetPackAsset | null => {
    const order: PetActionKey[] = [act, act === 'chorus' ? 'playing' : 'idle', 'playing', 'idle', 'happy', 'tap', 'drag', 'sleep'];
    for (const k of order) {
      if (pack.assets[k]) return pack.assets[k]!;
    }
    const first = Object.values(pack.assets)[0];
    return first || null;
  };

  const asset = pickAsset(action);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [beatScale, setBeatScale] = useState(1);

  useEffect(() => {
    if (!hitCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 120;
      c.height = 120;
      hitCanvasRef.current = c;
    }
  }, []);

  // Audio-reactive spectrum ring + subtle beat bounce for custom video/GIF packs
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const audio = audioFrameRef.current;
      const scaleTarget = audio.active ? 1 + audio.beatPulse * 0.075 : 1;
      setBeatScale((prev) => prev + (scaleTarget - prev) * 0.35);

      const sc = spectrumCanvasRef.current;
      if (sc) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const tw = Math.round(width * dpr);
        const th = Math.round(height * dpr);
        if (sc.width !== tw || sc.height !== th) {
          sc.width = tw;
          sc.height = th;
        }
        const ctx = sc.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, width, height);
          if (audio.active) {
            const cx = width * 0.5;
            const cy = height * 0.54;
            const ringR = Math.min(width, height) * 0.36;
            const bars = audio.bins.length;
            for (let i = 0; i < bars; i++) {
              const ang = (i / bars) * Math.PI * 2 - Math.PI / 2;
              const amp = audio.bins[i] || 0.05;
              const len = 4 + amp * 16;
              ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 90, 130, 0.72)' : 'rgba(76, 201, 240, 0.72)';
              ctx.lineWidth = 2.5;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(ang) * ringR, cy + Math.sin(ang) * ringR);
              ctx.lineTo(cx + Math.cos(ang) * (ringR + len), cy + Math.sin(ang) * (ringR + len));
              ctx.stroke();
            }
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height, audioFrameRef]);

  const resolveBlobUrl = async (url: string): Promise<string> => {
    const cached = blobCacheRef.current.get(url);
    if (cached) return cached;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      blobCacheRef.current.set(url, objUrl);
      return objUrl;
    } catch {
      return url;
    }
  };

  useEffect(() => {
    return () => {
      for (const u of blobCacheRef.current.values()) {
        URL.revokeObjectURL(u);
      }
      blobCacheRef.current.clear();
    };
  }, [pack.id]);

  useEffect(() => {
    if (!asset) return;
    if (asset.url === currentUrlRef.current) return;
    currentUrlRef.current = asset.url;

    const seq = ++switchSeqRef.current;

    if (asset.kind === 'image') {
      if (activeVideoRef.current) activeVideoRef.current.style.visibility = 'hidden';
      if (standbyVideoRef.current) standbyVideoRef.current.style.visibility = 'hidden';
      resolveBlobUrl(asset.url).then((src) => {
        if (switchSeqRef.current === seq) setImageSrc(src);
      });
      return;
    }

    setImageSrc('');
    const standby = standbyVideoRef.current;
    const active = activeVideoRef.current;
    if (!standby || !active) return;

    resolveBlobUrl(asset.url).then((src) => {
      if (switchSeqRef.current !== seq) return;
      standby.style.visibility = 'hidden';
      standby.style.zIndex = '0';
      standby.src = src;
      standby.loop = true;
      standby.muted = true;
      standby.playsInline = true;

      const commitSwap = () => {
        if (switchSeqRef.current !== seq) return;
        standby.style.visibility = 'visible';
        standby.style.zIndex = '2';
        active.style.visibility = 'hidden';
        active.style.zIndex = '0';
        try {
          active.pause();
        } catch {
          // ignore
        }
        // Swap slot roles
        activeVideoRef.current = standby;
        standbyVideoRef.current = active;
      };

      standby.play().catch(() => {});
      const vWithCb = standby as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      };
      if (typeof vWithCb.requestVideoFrameCallback === 'function') {
        vWithCb.requestVideoFrameCallback(commitSwap);
      } else {
        standby.addEventListener('loadeddata', commitSwap, { once: true });
      }
    });
  }, [asset?.url, asset?.kind]);

  useImperativeHandle(ref, () => ({
    isOpaqueAt: (clientX: number, clientY: number) => {
      const wrap = containerRef.current;
      const hc = hitCanvasRef.current;
      if (!wrap || !hc) return false;
      const rect = wrap.getBoundingClientRect();
      const relX = (clientX - rect.left) / rect.width;
      const relY = (clientY - rect.top) / rect.height;
      if (relX < 0 || relY < 0 || relX >= 1 || relY >= 1) return false;

      const mediaEl: HTMLVideoElement | HTMLImageElement | null =
        asset?.kind === 'image' ? imgRef.current : activeVideoRef.current;
      if (!mediaEl) return false;

      const ctx = hc.getContext('2d', { willReadFrequently: true });
      if (!ctx) return false;
      try {
        ctx.clearRect(0, 0, hc.width, hc.height);
        ctx.drawImage(mediaEl, 0, 0, hc.width, hc.height);
        const px = Math.min(hc.width - 1, Math.max(0, Math.floor(relX * hc.width)));
        const py = Math.min(hc.height - 1, Math.max(0, Math.floor(relY * hc.height)));
        const alpha = ctx.getImageData(px, py, 1, 1).data[3];
        return alpha > 12;
      } catch {
        // Fallback bounding box if media not ready yet
        return relX > 0.15 && relX < 0.85 && relY > 0.15 && relY < 0.9;
      }
    },
    triggerReaction: () => {
      setBeatScale(1.09);
    },
  }));

  const boxSize = Math.round(Math.min(width, height) * 0.78);

  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={spectrumCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '54%',
          width: `${boxSize}px`,
          height: `${boxSize}px`,
          transform: `translate(-50%, -50%) scale(${beatScale.toFixed(3)})`,
          transition: 'transform 60ms linear',
          pointerEvents: 'none',
        }}
      >
        <video
          ref={activeVideoRef}
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            visibility: 'hidden',
            zIndex: 0,
          }}
        />
        <video
          ref={standbyVideoRef}
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            visibility: 'hidden',
            zIndex: 0,
          }}
        />
        {imageSrc && (
          <img
            ref={imgRef}
            src={imageSrc}
            alt={pack.name}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        )}
      </div>
    </div>
  );
});
