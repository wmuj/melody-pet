const test = require('node:test');
const assert = require('node:assert/strict');
const { DialogueDeck, dialogueMascot } = require('../dist-electron/dialogue.js');

test('Lingma responds as a fox while preserving song titles, nicknames and imported dialogue', () => {
  const base = { isPlaying: false, affection: 30, mascot: 'lingma', name: '灵码' };
  for (const context of [
    { reason: 'tap' }, { reason: 'tap', zone: 'body' }, { reason: 'tap', zone: 'tail' },
    { reason: 'tap', rapid: true }, { reason: 'feed', full: true }, { reason: 'talk' },
    { reason: 'wake' }, { reason: 'greet', memory: { firstAt: 1, days: [] } },
    { reason: 'idle', now: new Date(2026, 10, 13, 9).getTime() }, { reason: 'song', songTitle: '晚风' },
  ]) {
    const deck = new DialogueDeck(() => 0);
    const lines = Array.from({ length: 30 }, () => deck.pick({ ...base, ...context }));
    assert(!lines.some(line => /小鲸鱼|大肥鱼|鲸鱼尾巴|头饰|小裙子|裙摆/.test(line)), JSON.stringify(context));
  }
  const songDeck = new DialogueDeck(() => 0);
  const songs = Array.from({ length: 6 }, () => songDeck.pick({ ...base, reason: 'song', songTitle: '小鲸鱼和大肥鱼' }));
  assert(songs.every(line => line.includes('《小鲸鱼和大肥鱼》')));
  assert(new DialogueDeck(() => 0).pick({ ...base, reason: 'talk', name: '小鲸鱼' }).startsWith('我是小鲸鱼，'));
  const custom = '小鲸鱼今天的快乐，到账啦。';
  assert.equal(new DialogueDeck().pick({ ...base, reason: 'talk', customCorpus: [custom] }), custom);
  assert.equal(dialogueMascot({ theme: 'lingma', activePackId: 'builtin' }), 'lingma');
  assert.equal(dialogueMascot({ theme: 'lingma', activePackId: 'pack_abcdef' }), undefined);
});
