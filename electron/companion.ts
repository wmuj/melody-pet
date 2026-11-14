import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { CompanionCounts, CompanionEvent, CompanionEventKind, CompanionMemory, PetTouchZone, SmtcState } from './shared';
import { EMPTY_COUNTS, emptyMemory, localDay } from './companion-state';
export { EMPTY_COUNTS, emptyMemory, localDay, todayCounts, relationship } from './companion-state';

const KINDS: CompanionEventKind[] = ['tap', 'feed', 'talk', 'run', 'listen'];
function counts(raw: unknown): CompanionCounts {
  const input = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const next = EMPTY_COUNTS();
  for (const kind of KINDS) if (typeof input[kind] === 'number' && Number.isFinite(input[kind])) next[kind] = Math.min(1e9, Math.max(0, Math.floor(input[kind] as number)));
  return next;
}
function cleanString(value: unknown, max: number) { return typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : ''; }

/** Stores only events from this application's interactions and confirmed media observations. */
export class CompanionStore {
  private value: CompanionMemory;
  private file: string;
  private observing = { key: '', since: 0, lastAt: 0 };
  private rememberedTrack = '';

  constructor(dataDir: string, now = Date.now()) {
    this.file = path.join(dataDir, 'companion-memory.json');
    this.value = emptyMemory(now);
    if (!fs.existsSync(this.file)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (raw?.version !== 1 || !Array.isArray(raw.events) || !Array.isArray(raw.days)) throw new Error('Invalid memory');
      const events: CompanionEvent[] = raw.events.filter((e: CompanionEvent) => e && KINDS.includes(e.kind) && Number.isFinite(e.at) && e.at > 0).slice(-240).map((e: CompanionEvent) => ({
        id: cleanString(e.id, 80) || crypto.randomUUID(), kind: e.kind, at: e.at,
        ...(['head', 'body', 'tail'].includes(e.zone || '') ? { zone: e.zone } : {}),
        ...(e.kind === 'listen' ? { title: cleanString(e.title, 120), artist: cleanString(e.artist, 80) } : {}),
      }));
      this.value = { version: 1, since: Number.isFinite(raw.since) ? raw.since : now,
        firstAt: Number.isFinite(raw.firstAt) && raw.firstAt > 0 ? raw.firstAt : null,
        totals: counts(raw.totals), events,
        days: raw.days.filter((d: { date?: unknown }) => d && typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date)).slice(-90).map((d: { date: string; counts: unknown }) => ({ date: d.date, counts: counts(d.counts) })),
      };
    } catch {
      // Keep the unreadable original available for recovery instead of overwriting it.
      fs.copyFileSync(this.file, `${this.file}.unreadable-${now}`);
    }
  }

  get(): CompanionMemory { return structuredClone(this.value); }
  private commit(next: CompanionMemory) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
    this.value = next;
    return this.get();
  }
  clear(now = Date.now()) {
    const next = this.commit(emptyMemory(now));
    this.observing = { key: '', since: 0, lastAt: 0 };
    this.rememberedTrack = '';
    return next;
  }
  recentCount(kind: CompanionEventKind, withinMs: number, now = Date.now()) {
    return this.value.events.filter(e => e.kind === kind && now >= e.at && now - e.at < withinMs).length;
  }
  record(kind: CompanionEventKind, detail: { zone?: PetTouchZone; title?: string; artist?: string } = {}, now = Date.now()) {
    const next = this.get();
    const entry: CompanionEvent = { id: crypto.randomUUID(), kind, at: now };
    if (kind === 'tap' && detail.zone) entry.zone = detail.zone;
    if (kind === 'listen') { entry.title = cleanString(detail.title, 120); entry.artist = cleanString(detail.artist, 80); }
    next.firstAt ??= now;
    next.totals[kind] = Math.min(1e9, next.totals[kind] + 1);
    const date = localDay(now);
    let day = next.days.find(d => d.date === date);
    if (!day) { day = { date, counts: EMPTY_COUNTS() }; next.days.push(day); }
    day.counts[kind]++;
    next.days = next.days.slice(-90);
    next.events.push(entry);
    next.events = next.events.slice(-240);
    return this.commit(next);
  }
  /** Ten seconds of uninterrupted, recent SMTC observations; renderer guesses never enter here. */
  observeMedia(state: SmtcState, awake: boolean, now = Date.now()): CompanionMemory | null {
    const title = cleanString(state.title, 120);
    if (!awake || !state.hasSession || state.status !== 'Playing' || !title) {
      this.observing = { key: '', since: 0, lastAt: 0 };
      return null;
    }
    const key = JSON.stringify([state.appId || '', title, state.artist || '']);
    if (this.observing.key !== key || now - this.observing.lastAt > 5000 || now < this.observing.lastAt) this.observing = { key, since: now, lastAt: now };
    this.observing.lastAt = now;
    if (now - this.observing.since < 10000 || key === this.rememberedTrack) return null;
    const result = this.record('listen', { title, artist: state.artist }, now);
    this.rememberedTrack = key;
    return result;
  }
}
