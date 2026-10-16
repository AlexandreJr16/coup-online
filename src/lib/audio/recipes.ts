// Receitas dos efeitos sonoros (síntese Web Audio, sem arquivo). Dados puros: cada som é
// uma lista de vozes com frequência, duração e ganho — dá para testar sem navegador e
// renderizar offline para medir pico/duração (não dá para "ouvir" em teste, então medimos).
export type Wave = "sine" | "square" | "sawtooth" | "triangle" | "noise";

export interface Voice {
  wave: Wave;
  f0: number; // frequência inicial (Hz); ignorado em ruído, exceto como centro do filtro
  f1?: number; // final (rampa exponencial)
  t: number; // início (s)
  d: number; // duração (s)
  g: number; // ganho de pico (0–1)
  lp?: number; // passa-baixa (Hz)
  hp?: number; // passa-alta (Hz)
}

export type SfxName =
  | "moeda" | "carta_vira" | "lacre" | "contestar" | "verdade" | "blefe"
  | "eliminado" | "vitoria" | "tick" | "vez" | "passar" | "erro" | "distribuir";

const N = (hz: number, semitones: number) => hz * Math.pow(2, semitones / 12);

export const SFX: Record<SfxName, Voice[]> = {
  moeda: [
    { wave: "square", f0: 988, t: 0, d: 0.07, g: 0.22, lp: 5000 },
    { wave: "square", f0: 1319, t: 0.06, d: 0.16, g: 0.2, lp: 5000 },
  ],
  carta_vira: [{ wave: "noise", f0: 2400, t: 0, d: 0.12, g: 0.3, hp: 900, lp: 5200 }],
  distribuir: [
    { wave: "noise", f0: 3000, t: 0, d: 0.06, g: 0.22, hp: 1200, lp: 6000 },
    { wave: "triangle", f0: 520, f1: 380, t: 0, d: 0.08, g: 0.1 },
  ],
  lacre: [
    { wave: "sine", f0: 110, f1: 45, t: 0, d: 0.28, g: 0.6 },
    { wave: "noise", f0: 600, t: 0, d: 0.1, g: 0.25, lp: 1400 },
  ],
  contestar: [
    { wave: "sawtooth", f0: 330, f1: 660, t: 0, d: 0.22, g: 0.18, lp: 3200 },
    { wave: "sawtooth", f0: 495, f1: 990, t: 0.12, d: 0.26, g: 0.16, lp: 3200 },
  ],
  verdade: [220, 277, 330, 440].map((f, i) => ({ wave: "triangle" as Wave, f0: f, t: i * 0.08, d: 0.3, g: 0.2 })),
  blefe: [
    { wave: "sawtooth", f0: 330, f1: 110, t: 0, d: 0.42, g: 0.2, lp: 1800 },
    { wave: "square", f0: 70, t: 0.05, d: 0.3, g: 0.12, lp: 400 },
  ],
  eliminado: [
    { wave: "triangle", f0: 440, f1: 90, t: 0, d: 0.7, g: 0.3 },
    { wave: "noise", f0: 500, t: 0, d: 0.4, g: 0.12, lp: 900 },
  ],
  vitoria: [N(262, 0), N(262, 4), N(262, 7), N(262, 12), N(262, 16)].map((f, i) => ({
    wave: "square" as Wave, f0: f, t: i * 0.11, d: i === 4 ? 0.7 : 0.22, g: 0.16, lp: 4200,
  })),
  tick: [{ wave: "square", f0: 1800, t: 0, d: 0.03, g: 0.12, lp: 4000 }],
  vez: [{ wave: "sine", f0: 880, t: 0, d: 0.35, g: 0.18 }, { wave: "sine", f0: 1320, t: 0.04, d: 0.3, g: 0.08 }],
  passar: [{ wave: "noise", f0: 1800, t: 0, d: 0.06, g: 0.14, hp: 800, lp: 3000 }],
  erro: [{ wave: "square", f0: 160, f1: 110, t: 0, d: 0.18, g: 0.16, lp: 900 }],
};

export const sfxDuration = (name: SfxName): number =>
  Math.max(...SFX[name].map((v) => v.t + v.d));

// ── Trilha procedural (choro/modinha de salão, lá menor, 96 bpm) ─────────────
export interface MusicNote {
  beat: number; // posição no compasso de 8 compassos (em tempos)
  dur: number; // em tempos
  midi: number;
  part: "baixo" | "melodia";
}

export const MUSIC_BPM = 96;
export const MUSIC_BEATS = 32; // 8 compassos de 4 tempos

const BASS = [45, 52, 45, 52, 48, 55, 48, 55, 41, 48, 41, 48, 43, 50, 43, 50]; // A2 E3 A2 E3 | C3 G3 ...
const MEL_A = [69, 72, 76, 74, 72, 69, 67, 69]; // frase 1 (colcheias)
const MEL_B = [65, 69, 72, 71, 69, 65, 64, 67];

export function musicPattern(): MusicNote[] {
  const notes: MusicNote[] = [];
  BASS.forEach((midi, i) => notes.push({ beat: i * 2, dur: 1.6, midi, part: "baixo" }));
  for (let bar = 0; bar < 8; bar++) {
    const phrase = bar % 4 < 2 ? MEL_A : MEL_B;
    phrase.forEach((midi, i) => {
      if ((bar + i) % 3 === 2) return; // pausas para sincopar
      notes.push({ beat: bar * 4 + i * 0.5, dur: 0.45, midi, part: "melodia" });
    });
  }
  return notes.sort((a, b) => a.beat - b.beat);
}

export const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
