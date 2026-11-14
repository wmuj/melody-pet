const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { zipSync } = require('fflate');
const { CompanionStore } = require('../dist-electron/companion.js');
const { todayCounts, emptyMemory } = require('../dist-electron/companion-state.js');
const { DialogueDeck } = require('../dist-electron/dialogue.js');
const { readCodexPet } = require('../dist-electron/codex-packs.js');
const { canSyncLyrics } = require('../dist-electron/media-state.js');
const { parseLrc } = require('../dist-electron/lyrics.js');

function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'melody-companion-test-'));
  t.after(() => {
    const resolved = path.resolve(dir);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert(path.basename(resolved).startsWith('melody-companion-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return dir;
}

test('real interaction counts survive restart, roll over by local day, and clear without inventing history', t => {
  const dir = temporary(t);
  const at = new Date(2026, 10, 13, 23, 59).getTime();
  let store = new CompanionStore(dir, at);
  assert.equal(store.get().firstAt, null);
  store.record('tap', { zone: 'tail' }, at);
  store.record('feed', {}, at + 1000);
  store = new CompanionStore(dir, at + 2000);
  assert.equal(store.get().totals.tap, 1);
  assert.equal(store.get().events[0].zone, 'tail');
  assert.equal(todayCounts(store.get(), at).feed, 1);
  const tomorrow = new Date(2026, 10, 14, 0, 1).getTime();
  assert.equal(todayCounts(store.get(), tomorrow).feed, 0);
  store.record('talk', {}, tomorrow);
  assert.equal(store.get().days.length, 2);
  store.clear(tomorrow + 1);
  const restored = new CompanionStore(dir, tomorrow + 2).get();
  assert.equal(restored.firstAt, null);
  assert.equal(restored.events.length, 0);
  assert.equal(restored.totals.feed, 0);
});

test('music memories require continuous playback observations, not titles, pauses or stale snapshots', t => {
  const store = new CompanionStore(temporary(t), 100000);
  const media = { event: 'state', hasSession: true, status: 'Playing', title: '真实测试曲', artist: '测试', appId: 'player' };
  assert.equal(store.observeMedia({ ...media, hasSession: false }, true, 100000), null);
  assert.equal(store.observeMedia(media, true, 110000), null);
  assert.equal(store.observeMedia(media, true, 120000), null, 'a ten-second gap is not continuous observation');
  for (let i = 1; i < 10; i++) assert.equal(store.observeMedia(media, true, 120000 + i * 1000), null);
  assert.equal(store.observeMedia(media, true, 130000).totals.listen, 1);
  assert.equal(store.observeMedia(media, true, 131000), null);
  store.observeMedia({ ...media, status: 'Paused' }, true, 132000);
  store.observeMedia({ ...media, title: '另一首' }, false, 133000);
  assert.equal(store.get().totals.listen, 1);
});

test('12 recent local responses avoid repeats; tiny custom corpora rotate and memories only cite recorded facts', () => {
  for (const context of [{ reason: 'tap' }, { reason: 'tap', zone: 'body' }, { reason: 'tap', zone: 'tail' }, { reason: 'tap', rapid: true }, { reason: 'feed' }, { reason: 'feed', full: true }]) {
    const deck = new DialogueDeck(() => 0);
    const lines = Array.from({ length: 13 }, () => deck.pick({ isPlaying: false, affection: 30, ...context }));
    assert.equal(new Set(lines).size, 13);
  }
  const tiny = new DialogueDeck(() => 0);
  assert.deepEqual(Array.from({ length: 5 }, () => tiny.choose(['你好', '在呢'])), ['你好', '在呢', '你好', '在呢', '你好']);
  const deck = new DialogueDeck(() => 0);
  const context = { reason: 'talk', isPlaying: false, affection: 100, memory: emptyMemory() };
  const lines = Array.from({ length: 30 }, () => deck.pick(context));
  assert(!lines.some(line => /今天喂过|听过的|收到你 \d+ 次/.test(line)));
});

test('zero timelines never show fake synchronized lyrics and credit lines are excluded', () => {
  assert.equal(canSyncLyrics({ event: 'state', hasSession: true, status: 'Playing', positionMs: 0, durationMs: 0 }), false);
  assert.equal(canSyncLyrics({ event: 'state', hasSession: true, positionMs: 0, durationMs: 210000 }), true);
  assert.equal(canSyncLyrics({ event: 'state', hasSession: true, positionMs: 500000, durationMs: 210000 }), false);
  assert.deepEqual(parseLrc('[00:00.00]作词 : 郭顶\n[00:01.00]作曲：郭顶\n[00:03.50]第一句歌词\n[00:10.10][00:20.10]第二句歌词'), [
    { timeMs: 3500, text: '第一句歌词' }, { timeMs: 10100, text: '第二句歌词' }, { timeMs: 20100, text: '第二句歌词' },
  ]);
});

test('Codex V2 JSON and nested ZIP imports use original atlas, reject escapes and mismatched versions', t => {
  const dir = temporary(t);
  const image = fs.readFileSync(path.join(__dirname, '../src/assets/whale-girl/spritesheet.webp'));
  const manifest = { displayName: '鲸娘', spritesheetPath: 'spritesheet.webp', spriteVersionNumber: 2 };
  fs.writeFileSync(path.join(dir, 'spritesheet.webp'), image);
  fs.writeFileSync(path.join(dir, 'pet.json'), JSON.stringify(manifest));
  const fromJson = readCodexPet(path.join(dir, 'pet.json'));
  assert.equal(fromJson.version, 2);
  assert.deepEqual(Buffer.from(fromJson.image), image);
  fs.writeFileSync(path.join(dir, 'pet.zip'), zipSync({ 'whale/pet.json': Buffer.from(JSON.stringify(manifest)), 'whale/spritesheet.webp': image, 'whale/README.md': Buffer.from('source notice') }));
  assert.equal(readCodexPet(path.join(dir, 'pet.zip')).notices[0].name, 'README.md');
  fs.writeFileSync(path.join(dir, 'pet.json'), JSON.stringify({ ...manifest, spritesheetPath: '../private.webp' }));
  assert.throws(() => readCodexPet(path.join(dir, 'pet.json')), /路径/);
  fs.writeFileSync(path.join(dir, 'pet.json'), JSON.stringify({ ...manifest, spriteVersionNumber: 1 }));
  assert.throws(() => readCodexPet(path.join(dir, 'pet.json')), /1536×1872/);
  fs.writeFileSync(path.join(dir, 'unsafe.zip'), zipSync({ '../pet.json': Buffer.from(JSON.stringify(manifest)) }));
  assert.throws(() => readCodexPet(path.join(dir, 'unsafe.zip')), /路径/);
});
