// Hold da view (VIDA_E_BLEFE 5.6; achado da revisão de P14): o cliente recebe a view JÁ com
// o desfecho (legenda, mustRevealPlayerId, stats, carta revelada...). Enquanto uma cena que
// "segura o desfecho" não chega ao veredito, a UI usa a view ANTERIOR (a efetiva). É só
// apresentação: o servidor e os relógios não mudam. A view anterior é pública por definição.
//
// Contrato (quem faz o quê), ligado aos eventos da fila:
//  - ao receber a cena com `segurarDesfechoAte`: `criarHold(cena.id, viewAnterior, matchNumber, agora)`
//    (o hold já vale enquanto a cena ESPERA na fila, para o desfecho não aparecer antes);
//  - no evento `iniciar`: `iniciarHold(holds, cenaId, agora, segurarDesfechoAte)`;
//  - nos eventos `terminar`, `instantanea` e `saltar`: `liberarHold(holds, cenaId)`;
//  - ao reiniciar (revanche), aba oculta ou reconexão: `liberarHolds()`.
import type { PublicView } from "./publica";
import { DURACAO_TETO_MS } from "./types";

export interface Hold {
  cenaId: string;
  matchNumber: number; // um hold nunca vale em outra partida
  antes: PublicView; // o que continua sendo exibido
  criadoEm: number;
  ate: number | null; // null = a cena ainda não começou
}

/** Quanto um hold pode esperar a cena começar (uma cena travada não prende a UI). */
export const HOLD_ESPERA_MAX_MS = 6000;

export function criarHold(cenaId: string, antes: PublicView, matchNumber: number, agora: number): Hold {
  return { cenaId, antes, matchNumber, criadoEm: agora, ate: null };
}

/** A cena começou: o hold vale até o veredito (com teto absoluto). Duração inválida = não segura. */
export function iniciarHold(holds: readonly Hold[], cenaId: string, agora: number, segurarMs: number): Hold[] {
  const dur = Number.isFinite(segurarMs) ? Math.max(0, Math.min(segurarMs, DURACAO_TETO_MS)) : 0;
  return holds.map((h) => (h.cenaId === cenaId ? { ...h, ate: agora + dur } : h));
}

const ativo = (h: Hold, real: PublicView, agora: number): boolean =>
  h.matchNumber === real.matchNumber && // revanche: hold da partida anterior é ignorado
  agora >= h.criadoEm && // relógio incoerente (outro relógio, ou voltou): ignora em vez de prender
  (h.ate === null ? agora < h.criadoEm + HOLD_ESPERA_MAX_MS : agora < h.ate);

/** View exibida: a do hold mais antigo ainda ativo; sem hold ativo, a real. */
export function viewEfetiva(real: PublicView, holds: readonly Hold[], agora: number): PublicView {
  return holds.find((h) => ativo(h, real, agora))?.antes ?? real;
}

/** Remove holds vencidos ou de outra partida (chamar a cada tick). */
export function podarHolds(holds: readonly Hold[], real: PublicView, agora: number): Hold[] {
  return holds.filter((h) => ativo(h, real, agora));
}

/** A cena terminou, foi descartada ou pulada: libera o hold dela. */
export function liberarHold(holds: readonly Hold[], cenaId: string): Hold[] {
  return holds.filter((h) => h.cenaId !== cenaId);
}

/** Revanche, aba oculta ou reconexão: libera tudo e mostra a view real. */
export function liberarHolds(): Hold[] {
  return [];
}
