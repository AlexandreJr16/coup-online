// Memória do último `room:score` recebido. Vive FORA do React de propósito: o servidor manda o
// placar logo depois do `game_state` final (e ao entrar/reconectar), e o painel de fim de
// partida só monta quando o estado final chega; um listener dentro do painel perderia o evento.
// Sem socket aqui (testável): `useScore.ts` liga o socket real a `ligarPlacar`.
import type { ScorePayload } from "../../types/socket";
import { lerPlacar } from "./placar";

type Ouvinte = () => void;

let atual: ScorePayload | null = null;
const ouvintes = new Set<Ouvinte>();

export function placarAtual(): ScorePayload | null {
  return atual;
}

/** Guarda um placar (payload inválido é descartado e o anterior fica) e avisa quem ouve. */
export function publicarPlacar(raw: unknown): void {
  const lido = lerPlacar(raw);
  if (!lido) return;
  atual = lido;
  ouvintes.forEach((f) => f());
}

/** Esquece o placar (ex.: o socket caiu e a sala pode ser outra quando voltar). */
export function limparPlacar(): void {
  if (atual === null) return;
  atual = null;
  ouvintes.forEach((f) => f());
}

export function assinarPlacar(f: Ouvinte): () => void {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

/** Só o que precisamos de um socket: ouvir `room:score`. Devolve a função que desliga. */
export interface FonteDePlacar {
  on(evento: "room:score", f: (p: ScorePayload) => void): unknown;
  off(evento: "room:score", f: (p: ScorePayload) => void): unknown;
}

export function ligarPlacar(fonte: FonteDePlacar): () => void {
  const aoReceber = (p: ScorePayload) => publicarPlacar(p);
  fonte.on("room:score", aoReceber);
  return () => {
    fonte.off("room:score", aoReceber);
  };
}
