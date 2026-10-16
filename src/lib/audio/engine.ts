// Motor de áudio: um AudioContext só, criado no 1º gesto do usuário (política de autoplay),
// com cadeia mestre (ganho → compressor) para nunca estourar. Efeitos vêm de recipes.ts;
// a trilha é agendada com lookahead. Preferências (mudo/volume) ficam no localStorage.
import { MUSIC_BEATS, MUSIC_BPM, midiToHz, musicPattern, SFX, type SfxName, type Voice } from "./recipes";

const KEY = "coup:audio";

export interface AudioPrefs {
  muted: boolean;
  volume: number; // 0–1
  music: boolean;
}

export function readPrefs(): AudioPrefs {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<AudioPrefs>;
    return { muted: j.muted ?? false, volume: Math.min(1, Math.max(0, j.volume ?? 0.7)), music: j.music ?? true };
  } catch {
    return { muted: false, volume: 0.7, music: true };
  }
}

export function savePrefs(p: AudioPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sem storage: vale só nesta sessão */
  }
  window.dispatchEvent(new Event("coup:audio"));
}

export function subscribePrefs(cb: () => void): () => void {
  window.addEventListener("coup:audio", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("coup:audio", cb);
    window.removeEventListener("storage", cb);
  };
}

/** Toca uma voz da receita em `ctx`, ligada a `dest`, começando em `when` (s do contexto). */
export function playVoice(ctx: BaseAudioContext, dest: AudioNode, v: Voice, when: number): void {
  const start = when + v.t;
  const end = start + v.d;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.linearRampToValueAtTime(v.g, start + Math.min(0.006, v.d / 3));
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  let node: AudioNode;
  let stop: () => void;
  if (v.wave === "noise") {
    const len = Math.max(1, Math.floor(ctx.sampleRate * v.d));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.start(start);
    node = src;
    stop = () => src.stop(end);
  } else {
    const osc = ctx.createOscillator();
    osc.type = v.wave;
    osc.frequency.setValueAtTime(v.f0, start);
    if (v.f1) osc.frequency.exponentialRampToValueAtTime(v.f1, end);
    osc.start(start);
    node = osc;
    stop = () => osc.stop(end + 0.02);
  }
  let tail: AudioNode = node;
  if (v.hp) {
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = v.hp;
    tail.connect(f);
    tail = f;
  }
  if (v.lp) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = v.lp;
    tail.connect(f);
    tail = f;
  }
  tail.connect(env);
  env.connect(dest);
  stop();
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private cursor = 0; // posição na trilha (em tempos)
  prefs: AudioPrefs = readPrefs();

  /** Cria/retoma o contexto. Chamar de dentro de um gesto do usuário. */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      const comp = this.ctx.createDynamicsCompressor();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35; // a trilha fica bem abaixo dos efeitos
      this.musicGain.connect(this.master);
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this.applyPrefs();
    }
    void this.ctx.resume();
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === "running";
  }

  setPrefs(p: AudioPrefs): void {
    this.prefs = p;
    this.applyPrefs();
  }

  private applyPrefs(): void {
    if (this.master) this.master.gain.value = this.prefs.muted ? 0 : 0.5 * this.prefs.volume;
    if (this.prefs.music && !this.prefs.muted) this.startMusic();
    else this.stopMusic();
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.master || this.prefs.muted) return;
    const when = this.ctx.currentTime + 0.01;
    for (const v of SFX[name]) playVoice(this.ctx, this.master, v, when);
  }

  private startMusic(): void {
    if (!this.ctx || this.musicTimer) return;
    this.nextBeatTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 120);
  }

  private stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  // Agenda as notas dos próximos ~0,5s (lookahead) e avança o cursor da trilha em loop.
  private scheduleMusic(): void {
    if (!this.ctx || !this.musicGain) return;
    const spb = 60 / MUSIC_BPM;
    const horizon = this.ctx.currentTime + 0.5;
    const pattern = musicPattern();
    while (this.nextBeatTime < horizon) {
      const beat = this.cursor;
      for (const n of pattern.filter((x) => x.beat === beat)) {
        const v: Voice = {
          wave: n.part === "baixo" ? "triangle" : "square",
          f0: midiToHz(n.midi),
          t: 0,
          d: n.dur * spb,
          g: n.part === "baixo" ? 0.5 : 0.18,
          lp: n.part === "baixo" ? 700 : 2400,
        };
        playVoice(this.ctx, this.musicGain, v, this.nextBeatTime);
      }
      this.cursor = (this.cursor + 0.5) % MUSIC_BEATS;
      this.nextBeatTime += spb / 2;
    }
  }
}

let engine: AudioEngine | null = null;
export function getAudio(): AudioEngine {
  engine ??= new AudioEngine();
  return engine;
}
