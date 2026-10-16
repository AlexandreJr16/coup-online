// Mede cada efeito renderizando OFFLINE (OfflineAudioContext): pico, RMS e duração. É como
// "ouvimos" em teste: um som mudo, estourado (pico ≥ 1) ou longo demais é bug.
import { playVoice } from "./engine";
import { MUSIC_BPM, midiToHz, musicPattern, SFX, sfxDuration, type SfxName } from "./recipes";

export const MASTER_GAIN = 0.5 * 0.7; // igual ao do AudioEngine com volume padrão

export interface Measure {
  peak: number;
  rms: number;
  seconds: number;
  finite: boolean;
}

async function render(seconds: number, build: (ctx: OfflineAudioContext, dest: AudioNode) => void): Promise<Measure> {
  const sr = 44100;
  const ctx = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  build(ctx, master);
  const data = (await ctx.startRendering()).getChannelData(0);
  let peak = 0;
  let sum = 0;
  let finite = true;
  for (const x of data) {
    if (!Number.isFinite(x)) finite = false;
    peak = Math.max(peak, Math.abs(x));
    sum += x * x;
  }
  return { peak, rms: Math.sqrt(sum / data.length), seconds, finite };
}

export function measureSfx(name: SfxName): Promise<Measure> {
  const dur = sfxDuration(name) + 0.1;
  return render(dur, (ctx, dest) => SFX[name].forEach((v) => playVoice(ctx, dest, v, 0)));
}

/** Primeiros 2 compassos da trilha, com o mesmo ganho relativo do motor. */
export function measureMusic(): Promise<Measure> {
  const spb = 60 / MUSIC_BPM;
  return render(8 * spb, (ctx, dest) => {
    const g = ctx.createGain();
    g.gain.value = 0.35;
    g.connect(dest);
    for (const n of musicPattern().filter((x) => x.beat < 8)) {
      playVoice(
        ctx,
        g,
        { wave: n.part === "baixo" ? "triangle" : "square", f0: midiToHz(n.midi), t: 0, d: n.dur * spb, g: n.part === "baixo" ? 0.5 : 0.18, lp: n.part === "baixo" ? 700 : 2400 },
        n.beat * spb,
      );
    }
  });
}
