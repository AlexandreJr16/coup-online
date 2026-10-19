// Construtores de Beat/Cena para os testes do motor de cenas.
import type { Beat, Cena } from "./types";

export const beat = (em: number, dur: number, over: Partial<Beat> = {}): Beat => ({
  em, dur, alvo: { tipo: "centro" }, efeito: "vinheta", ...over,
});

export const cena = (over: Partial<Cena> = {}): Cena => ({
  id: "t#1", prioridade: 1, duracaoMax: 1000, beats: [beat(0, 500), beat(500, 400, { final: true })], ...over,
});
