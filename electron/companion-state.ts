import type { CompanionCounts, CompanionMemory } from './shared';

export const EMPTY_COUNTS = (): CompanionCounts => ({ tap: 0, feed: 0, talk: 0, run: 0, listen: 0 });
export function localDay(at = Date.now()) {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function emptyMemory(now = Date.now()): CompanionMemory {
  return { version: 1, since: now, firstAt: null, totals: EMPTY_COUNTS(), days: [], events: [] };
}
export function todayCounts(memory: CompanionMemory, now = Date.now()) {
  return memory.days.find(day => day.date === localDay(now))?.counts || EMPTY_COUNTS();
}
export function relationship(memory: CompanionMemory) {
  const shared = memory.totals.tap + memory.totals.feed + memory.totals.listen;
  return memory.days.length >= 7 && shared >= 60 ? '默契伙伴' : shared >= 12 ? '渐渐熟悉' : '初次相识';
}
