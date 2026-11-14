import type { AudioFrame } from '../types';

const EMPTY_BINS = new Array<number>(24).fill(0);

export class LoopbackAudioAnalyzer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  private avgBass = 0.08;
  private beatPulse = 0;
  private lastBeatAt = 0;
  private starting = false;
  private disposed = false;
  private failed = false;

  async start(): Promise<boolean> {
    if (this.disposed || this.analyser || this.starting || this.failed) {
      return Boolean(this.analyser);
    }
    this.starting = true;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      });
      if (this.disposed) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      // Stop dummy video track immediately; keep only system loopback audio
      stream.getVideoTracks().forEach((t) => t.stop());
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        this.failed = true;
        return false;
      }

      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (this.disposed) {
        stream.getTracks().forEach(t => t.stop());
        await ctx.close();
        return false;
      }
      const source = ctx.createMediaStreamSource(new MediaStream(audioTracks));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);

      this.stream = stream;
      this.ctx = ctx;
      this.analyser = analyser;
      this.data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      return true;
    } catch {
      this.failed = true;
      return false;
    } finally {
      this.starting = false;
    }
  }

  sample(now: number, isPlayingFallback: boolean, enabled: boolean): AudioFrame {
    if (!enabled) {
      this.beatPulse *= 0.85;
      return {
        active: false,
        bass: 0,
        mid: 0,
        treble: 0,
        beatPulse: 0,
        energy: 0,
        bins: EMPTY_BINS,
      };
    }

    if (this.analyser && this.data) {
      this.analyser.getByteFrequencyData(this.data);
      const n = this.data.length; // 128 bins
      let bassSum = 0;
      for (let i = 1; i <= 7; i++) bassSum += this.data[i];
      const bass = bassSum / (7 * 255);

      let midSum = 0;
      for (let i = 8; i <= 32; i++) midSum += this.data[i];
      const mid = midSum / (25 * 255);

      let trebleSum = 0;
      for (let i = 33; i <= 80; i++) trebleSum += this.data[i];
      const treble = trebleSum / (48 * 255);

      const energy = bass * 0.5 + mid * 0.35 + treble * 0.15;

      // Adaptive kick/beat onset detector
      this.avgBass = this.avgBass * 0.92 + bass * 0.08;
      if (bass > 0.14 && bass > this.avgBass * 1.32 && now - this.lastBeatAt > 170) {
        this.beatPulse = Math.min(1, 0.55 + (bass - this.avgBass) * 2.2);
        this.lastBeatAt = now;
      } else {
        this.beatPulse *= 0.86;
      }

      const bins: number[] = [];
      for (let b = 0; b < 24; b++) {
        const idx = 1 + Math.floor((b / 24) * Math.min(68, n - 2));
        bins.push(Math.min(1, this.data[idx] / 225));
      }

      if (energy > 0.015) {
        return { active: true, bass, mid, treble, beatPulse: this.beatPulse, energy, bins };
      }
    }

    // Playback state can animate headphones, but is not evidence of an audio beat.

    this.beatPulse *= 0.85;
    return {
      active: false,
      bass: 0,
      mid: 0,
      treble: 0,
      beatPulse: this.beatPulse,
      energy: 0,
      bins: EMPTY_BINS,
    };
  }

  dispose() {
    this.disposed = true;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.stream = null;
    this.ctx = null;
    this.analyser = null;
  }
}
