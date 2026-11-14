const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');
const { pickVoice } = require('../dist-electron/speech.js');

test('the native Chinese engine emits speech events and a non-silent playable PCM WAV', { timeout: 20000, skip: process.platform !== 'win32' }, async () => {
  const out = path.resolve(__dirname, '../artifacts/whale-qa');
  fs.mkdirSync(out, { recursive: true });
  const wavePath = path.join(out, 'voice-sample-' + Date.now() + '.wav');
  const child = spawn(path.resolve(__dirname, '../native/bin/voice-bridge.exe'), ['--wave', wavePath], { stdio: 'pipe', windowsHide: true });
  const events = [];
  let selected;
  try {
    await new Promise((resolve, reject) => {
      const watchdog = setTimeout(() => reject(new Error('Native speech did not complete')), 15000);
      const rl = readline.createInterface({ input: child.stdout });
      child.on('error', reject);
      child.on('exit', code => { clearTimeout(watchdog); rl.close(); code === 0 ? resolve() : reject(new Error('Voice helper exit: ' + code)); });
      child.stderr.resume();
      rl.on('line', line => {
        try {
          const msg = JSON.parse(line.replace(/^\uFEFF/, ''));
          events.push(msg);
          if (msg.type === 'ready') {
            selected = pickVoice(msg.voices, 'auto');
            assert(selected && /^zh/i.test(selected.lang), 'An installed Chinese voice is required for this Windows integration test');
            child.stdin.write(JSON.stringify({ cmd: 'speak', id: 'sample', text: '你好呀，我是泡泡。一只肚皮软软、会陪你听歌的小鲸鱼。', voiceId: selected.id, volume: 65, rate: 1 }) + '\n');
          } else if (msg.type === 'end' && msg.id === 'sample') child.stdin.end();
          else if (msg.type === 'error') reject(new Error(msg.error));
        } catch (error) { reject(error); }
      });
    });
  } finally { if (!child.killed) child.kill(); }
  assert(events.some(e => e.type === 'start' && e.id === 'sample'));
  assert(events.some(e => e.type === 'end' && !e.cancelled && !e.error));
  const wave = fs.readFileSync(wavePath);
  assert.equal(wave.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wave.toString('ascii', 8, 12), 'WAVE');
  let pcm, format;
  for (let offset = 12; offset + 8 <= wave.length;) {
    const type = wave.toString('ascii', offset, offset + 4);
    const length = wave.readUInt32LE(offset + 4);
    if (type === 'fmt ') format = { encoding: wave.readUInt16LE(offset + 8), channels: wave.readUInt16LE(offset + 10), sampleRate: wave.readUInt32LE(offset + 12), bits: wave.readUInt16LE(offset + 22) };
    if (type === 'data') pcm = wave.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length + (length % 2);
  }
  assert(format && pcm && pcm.length > 10000);
  assert.equal(format.encoding, 1);
  assert.equal(format.bits, 16);
  let sum = 0, peak = 0;
  for (let i = 0; i + 1 < pcm.length; i += 2) { const value = pcm.readInt16LE(i); sum += value * value; peak = Math.max(peak, Math.abs(value)); }
  const rms = Math.sqrt(sum / (pcm.length / 2)) / 32768;
  const duration = pcm.length / (format.sampleRate * format.channels * format.bits / 8);
  assert(rms > .003, 'Synthesized speech must not be silence');
  assert(duration > 2 && duration < 20, 'Expected a complete Chinese sentence');
  const report = { voice: selected.name, language: selected.lang, ...format, durationSeconds: duration, rms, peak, wavePath };
  fs.writeFileSync(path.join(out, 'native-speech.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
});
