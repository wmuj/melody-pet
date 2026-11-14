const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeSettings, DEFAULT_SETTINGS } = require('../dist-electron/shared.js');
const { walkStep } = require('../dist-electron/roaming.js');
const { pickVoice } = require('../dist-electron/speech.js');

test('old settings acquire speech and roaming defaults without losing affection or a custom pack', () => {
  const restored = sanitizeSettings({ affection: 117, activePackId: 'pack_abcdef', x: -1530, y: 72, topmost: false });
  assert.equal(restored.affection, 117);
  assert.equal(restored.activePackId, 'pack_abcdef');
  assert.equal(restored.x, -1530);
  assert.equal(restored.topmost, false);
  assert.equal(restored.roamEnabled, true);
  assert.equal(restored.voiceEnabled, true);
});

test('corrupt settings cannot create NaN window coordinates or unsupported presets', () => {
  const restored = sanitizeSettings({ size: 'enormous', theme: null, voiceVolume: Infinity, voiceRate: 1000, x: NaN, y: '12', affection: -40, surprise: true });
  assert.equal(restored.size, 'medium');
  assert.equal(restored.theme, DEFAULT_SETTINGS.theme);
  assert.equal(restored.voiceVolume, DEFAULT_SETTINGS.voiceVolume);
  assert.equal(restored.voiceRate, 4);
  assert.equal(restored.affection, 0);
  assert.equal(restored.x, undefined);
  assert.equal(restored.y, undefined);
  assert.equal(restored.surprise, undefined);
});

test('walking reverses at either edge, including monitors left of the primary display', () => {
  assert.deepEqual(walkStep(-1810, -1, 50, -1820, -360), { x: -1820, direction: 1 });
  assert.deepEqual(walkStep(-370, 1, 50, -1820, -360), { x: -360, direction: -1 });
  assert.deepEqual(walkStep(125, 1, 200, 0, 0), { x: 0, direction: 1 });
  let point = { x: -1000, direction: 1 };
  for (let i = 0; i < 10000; i++) {
    point = walkStep(point.x, point.direction, 170 / 30, -1820, -360);
    assert(point.x >= -1820 && point.x <= -360);
  }
});

test('an unavailable saved voice falls back to Chinese instead of an arbitrary English voice', () => {
  const voices = [
    { id: 'en', name: 'Zira', lang: 'en-US', gender: 'Female' },
    { id: 'zh', name: 'Huihui Desktop', lang: 'zh-CN', gender: 'Female' },
  ];
  assert.equal(pickVoice(voices, 'removed').id, 'zh');
  assert.equal(pickVoice(voices, 'en').id, 'en');
  assert.equal(pickVoice([], 'auto'), undefined);
});
