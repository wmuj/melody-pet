import { screen, type BrowserWindow } from 'electron';
import type { MotionState, PetSettings } from './shared';
import { STAGE_SIZE } from './shared';

/** One horizontal step, reflected inside the current monitor's working area. */
export function walkStep(x: number, direction: -1 | 1, distance: number, left: number, right: number) {
  if (right <= left) return { x: left, direction };
  let next = x + direction * distance;
  let facing = direction;
  if (next >= right) { next = right; facing = -1; }
  if (next <= left) { next = left; facing = 1; }
  return { x: next, direction: facing as -1 | 1 };
}

export class RoamingController {
  private timer: NodeJS.Timeout;
  private reasons = new Set<string>();
  private state: MotionState = { moving: false, direction: -1, pace: 'walk' };
  private nextAt = Date.now() + 12000;
  private until = 0;
  private lastTick = Date.now();
  private x = 0;
  private pendingRun = false;
  private startedAt = 0;

  constructor(private win: BrowserWindow, private settings: () => PetSettings,
    private changed: (state: MotionState) => void, private moved: () => void) {
    this.timer = setInterval(() => this.tick(), 32);
  }

  private publish(patch: Partial<MotionState>) {
    const next = { ...this.state, ...patch };
    if (JSON.stringify(next) !== JSON.stringify(this.state)) { this.state = next; this.changed(next); }
  }

  pause(reason: string, paused: boolean) {
    if (paused) {
      if (this.reasons.has(reason)) return;
      if (['sleep', 'hidden', 'drag', 'reaction'].includes(reason)) this.pendingRun = false;
      this.reasons.add(reason);
      this.stop();
    } else if (this.reasons.delete(reason)) this.nextAt = Date.now() + (this.pendingRun ? 280 : 1400);
  }

  stop() {
    this.publish({ moving: false });
    this.until = 0;
    this.nextAt = Date.now() + 16000 + Math.random() * 12000;
  }

  settingsChanged() {
    if (!this.settings().roamEnabled) { this.pendingRun = false; this.stop(); }
    else this.nextAt = Date.now() + 2500;
  }

  runNow() { this.stop(); this.pendingRun = true; this.nextAt = Date.now() + 240; }

  private tick() {
    const now = Date.now();
    const dt = Math.min(0.08, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (this.win.isDestroyed()) return;
    if (!this.win.isVisible() || this.reasons.size) return;
    const settings = this.settings();
    if (!this.state.moving) {
      if (now < this.nextAt || (!this.pendingRun && !settings.roamEnabled)) return;
      const b = this.win.getBounds();
      const area = screen.getDisplayMatching(b).workArea;
      this.x = b.x;
      this.startedAt = now;
      this.until = now + (this.pendingRun ? 5600 : 4500 + Math.random() * 3500);
      this.publish({ moving: true, pace: this.pendingRun ? 'run' : 'walk',
        direction: b.x + b.width / 2 > area.x + area.width / 2 ? -1 : 1 });
      this.pendingRun = false;
    }
    if (now >= this.until) { this.stop(); return; }
    const b = this.win.getBounds();
    const area = screen.getDisplayMatching(b).workArea;
    const ramp = Math.min(1, (now - this.startedAt) / 400, (this.until - now) / 500);
    const speed = (this.state.pace === 'run' ? 170 : { slow: 38, normal: 65, lively: 98 }[settings.roamSpeed]) * (b.width / 340) * Math.max(0.08, ramp);
    const step = walkStep(this.x, this.state.direction, speed * dt, area.x + 6, area.x + area.width - b.width - 6);
    this.x = step.x;
    this.publish({ direction: step.direction });
    const dim = STAGE_SIZE[settings.size];
    this.win.setBounds({ x: Math.round(this.x), y: b.y, width: dim.w, height: dim.h });
    this.moved();
  }

  dispose() { clearInterval(this.timer); this.pendingRun = false; }
}
