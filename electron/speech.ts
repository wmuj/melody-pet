import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import readline from 'readline';
import type { PetSettings, SpeechResult, SpeechState, VoiceInfo } from './shared';

export function pickVoice(voices: VoiceInfo[], requested: string): VoiceInfo | undefined {
  return voices.find(v => v.id === requested)
    || voices.find(v => /^zh/i.test(v.lang) && /yaoyao/i.test(v.name))
    || voices.find(v => /^zh/i.test(v.lang) && v.gender === 'Female')
    || voices.find(v => /^zh/i.test(v.lang))
    || voices[0];
}

export class SpeechService {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private voices: VoiceInfo[] = [];
  private current: SpeechState = { status: 'idle' };
  private ready: Promise<void> = Promise.resolve();
  private seq = 0;
  private stopped = false;
  private watchdog: NodeJS.Timeout | null = null;

  constructor(private onState: (state: SpeechState) => void) {}

  start(exe: string) {
    this.stopped = false;
    this.ready = new Promise<void>((resolve) => {
      let settled = false;
      const done = () => { if (!settled) { settled = true; clearTimeout(timeout); resolve(); } };
      const timeout = setTimeout(() => {
        this.setState({ status: 'error', error: '中文语音启动超时，请重新打开桌宠。' });
        done();
      }, 10000);
      const proc = spawn(exe, [], { stdio: 'pipe', windowsHide: true });
      this.proc = proc;
      proc.stderr.resume();
      // Prevent EPIPE from terminating the app if the native engine exits mid-sentence.
      proc.stdin.on('error', () => {});
      const rl = readline.createInterface({ input: proc.stdout });
      rl.on('line', line => {
        try {
          const msg = JSON.parse(line.replace(/^\uFEFF/, ''));
          if (msg.type === 'ready') {
            this.voices = Array.isArray(msg.voices) ? msg.voices : [];
            done();
          } else if (msg.type === 'error' && !msg.id) {
            this.setState({ status: 'error', error: '本机语音未能启动，请检查 Windows 语音设置。' });
            done();
          } else if (msg.id && msg.id === this.current.id) {
            if (msg.type === 'start') this.setState({ ...this.current, status: 'speaking' });
            if (msg.type === 'end' || msg.type === 'error') {
              this.clearWatchdog();
              this.setState(msg.error
                ? { status: 'error', error: '这次没能读出来，换一个声音再试试。' }
                : { status: 'idle' });
            }
          }
        } catch { /* Ignore an incomplete native log line. */ }
      });
      proc.on('error', () => {
        this.setState({ status: 'error', error: '找不到语音组件，请重新编译语音助手。' });
        done();
      });
      proc.on('exit', () => {
        rl.close();
        this.proc = null;
        this.voices = [];
        this.clearWatchdog();
        if (!this.stopped) this.setState({ status: 'error', error: '语音组件已停止，重启桌宠可以重试。' });
        done();
      });
    });
  }

  private setState(state: SpeechState) { this.current = state; this.onState(state); }
  private clearWatchdog() { if (this.watchdog) clearTimeout(this.watchdog); this.watchdog = null; }
  getState() { return this.current; }
  async getVoices() { await this.ready; return this.voices; }

  async speak(raw: string, settings: PetSettings): Promise<SpeechResult> {
    const request = ++this.seq;
    await this.ready;
    if (request !== this.seq) return { ok: false };
    if (!settings.voiceEnabled || settings.voiceVolume === 0) return { ok: false };
    const text = typeof raw === 'string' ? raw.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 300) : '';
    if (!text) return { ok: false };
    const voice = pickVoice(this.voices, settings.voiceId);
    if (!this.proc?.stdin.writable || !voice) return { ok: false, error: '还没有可用的本机声音，请检查声音设置。' };
    const id = String(request);
    this.clearWatchdog();
    this.setState({ status: 'idle', text, id });
    this.proc.stdin.write(JSON.stringify({ cmd: 'speak', id, text, voiceId: voice.id, volume: settings.voiceVolume, rate: settings.voiceRate }) + '\n');
    this.watchdog = setTimeout(() => {
      if (this.current.id !== id) return;
      this.stop();
      this.setState({ status: 'error', error: '这句话读得太久了，已经停下。可以再试一次。' });
    }, 45000);
    return { ok: true };
  }

  stop() {
    this.seq++;
    this.clearWatchdog();
    if (this.proc?.stdin.writable) this.proc.stdin.write('{"cmd":"stop"}\n');
    this.setState({ status: 'idle' });
  }

  dispose() { this.stopped = true; this.stop(); this.proc?.stdin.end(); this.proc?.kill(); this.proc = null; }
}
