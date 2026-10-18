// Diretor de cena (VIDA_E_BLEFE 5.3): puro, sem DOM, sem relógio, sem aleatoriedade. Recebe
// a projeção pública (`PublicView`; o `tsc` barra o GameView cru) e a REPROJETA por dentro:
// um `as PublicView` errado no chamador não passa a mão crua aos construtores. Cada cena
// concreta é um construtor registrado (um por arquivo em fx/scenes/); aqui ficam as guardas.
import { deriveEvents, type DerivedEvents } from "../events";
import { validarCena } from "./cena";
import { toPublicView, type PublicView } from "./publica";
import type { Cena } from "./types";

export type ConstrutorDeCena = (prev: PublicView, cur: PublicView) => Cena[];

/** Mais CAUSAS que isso numa só transição = salto (reconexão, aba voltou): sem cenas. */
export const MAX_CAUSAS_POR_TRANSICAO = 3;

/**
 * Conta causas, não consequências. Uma contestação junta challenge + reveal + eliminate +
 * winner num evento só; contar as consequências faria a guarda variar com o veredito (um canal
 * de vazamento: com o blefe sobra 1 evento, com a verdade no fim de jogo sobram 4).
 */
export function contarCausas(d: DerivedEvents): number {
  const n = (k: string) => d.log.filter((l) => l.kind === k).length;
  const contestou = n("challenge") > 0;
  return n("action") + n("block") + (contestou ? 1 : 0) + (contestou ? 0 : n("reveal") + n("eliminate") + n("winner"));
}

/**
 * `aoErro`: recebe as mensagens de cena inválida. A cena inválida é DESCARTADA (a UI não pode
 * cair por causa de um construtor com bug, nem cair só em um dos ramos de verdade/blefe); em
 * dev/teste passe um `aoErro` que lança.
 */
export function directScene(
  prevIn: PublicView | null,
  curIn: PublicView,
  construtores: readonly ConstrutorDeCena[],
  aoErro?: (erros: string[]) => void,
): Cena[] {
  if (!prevIn) return []; // baseline: sem replay
  const prev = toPublicView(prevIn);
  const cur = toPublicView(curIn);
  if (prev.matchNumber !== cur.matchNumber) return []; // revanche: a fila é reiniciada
  let n = 0;
  const d = deriveEvents(prev, cur, () => ++n);
  if (contarCausas(d) > MAX_CAUSAS_POR_TRANSICAO) return []; // salto: vai ao estado final

  const geradas = construtores.flatMap((c) => c(prev, cur));
  const validas: Cena[] = [];
  const vistos = new Set<string>();
  const erros: string[] = [];
  for (const c of geradas) {
    const e = validarCena(c);
    if (vistos.has(c.id)) e.push(`${c.id}: id duplicado no mesmo lote`);
    vistos.add(c.id);
    if (e.length > 0) erros.push(...e);
    else validas.push(c);
  }
  if (erros.length > 0) aoErro?.(erros);
  return validas.sort((a, b) => b.prioridade - a.prioridade);
}
