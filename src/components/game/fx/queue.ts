// Fila de cenas (VIDA_E_BLEFE 12): prioridade, coalescência, teto de 2 cenas visíveis,
// pular e descarte por aba oculta. Reducer PURO: o tempo entra como argumento (ms).
//
// Contrato de ids: o id da cena é ÚNICO por partida (ex.: `duelo#${lastChallenge.n}`); a fila
// ignora um id já visto até `reiniciar`. Quem não tem contador natural deve compor o id com
// algo que cresça (a view não traz número de turno).
import { duracaoDaCena, ehPulavel, saltoDePular } from "./cena";
import { PULAR_CARIMBO_MS, type Cena } from "./types";

export const MAX_VISIVEIS = 2;
const ENCURTAR_MS = 120; // quanto sobra a uma cena menor durante/antes de um drama alto

interface Ativa {
  cena: Cena;
  inicio: number;
  fim: number; // instante absoluto em que sai
  pulada: boolean;
}

export interface FilaState {
  ativas: Ativa[];
  pendentes: Cena[];
  vistas: string[]; // ids já aceitos (evita repetir a mesma cena)
}

export type FilaEvento =
  | { tipo: "iniciar"; cena: Cena }
  | { tipo: "terminar"; cenaId: string }
  | { tipo: "instantanea"; cena: Cena } // vira estado final sem animar (descartada pela fila)
  | { tipo: "saltar"; cenaId: string; paraMs: number }; // executor salta a cena para este instante

export interface FilaResultado {
  state: FilaState;
  eventos: FilaEvento[];
}

export const filaVazia = (): FilaState => ({ ativas: [], pendentes: [], vistas: [] });

const temPrio3 = (ativas: Ativa[]) => ativas.some((a) => a.cena.prioridade === 3);

/** Promove pendentes enquanto houver vaga. Prioridade maior primeiro; empate por chegada. */
function promover(state: FilaState, now: number, eventos: FilaEvento[]): FilaState {
  let { ativas } = state;
  const pendentes = [...state.pendentes].sort((a, b) => b.prioridade - a.prioridade); // estável
  const sobra: Cena[] = [];
  for (const c of pendentes) {
    const prio3Rodando = temPrio3(ativas);
    if (c.prioridade === 3 && prio3Rodando) {
      sobra.push(c); // só um drama alto por vez; o segundo toca inteiro depois
      continue;
    }
    if (ativas.length >= MAX_VISIVEIS) {
      // um drama alto toma o lugar de uma cena menor (a mais antiga); as outras esperam
      const menor = c.prioridade === 3 ? ativas.find((a) => a.cena.prioridade <= 1) : undefined;
      if (!menor) {
        sobra.push(c);
        continue;
      }
      ativas = ativas.filter((a) => a !== menor);
      eventos.push({ tipo: "terminar", cenaId: menor.cena.id });
    }
    if (c.prioridade === 3) {
      ativas = ativas.map((a) => (a.cena.prioridade <= 1 ? { ...a, fim: Math.min(a.fim, now + ENCURTAR_MS) } : a));
    }
    const dur = duracaoDaCena(c);
    // cena menor que chega DURANTE um drama alto também sai logo
    const fim = c.prioridade <= 1 && prio3Rodando ? now + Math.min(dur, ENCURTAR_MS) : now + dur;
    ativas = [...ativas, { cena: c, inicio: now, fim, pulada: false }];
    eventos.push({ tipo: "iniciar", cena: c });
  }
  return { ...state, ativas, pendentes: sobra };
}

/**
 * Entrada de cenas novas. `oculta` = aba em segundo plano: nada anima, tudo vira estado final.
 * Regras: prio 0 não espera (descartada se não couber); prio 1 coalesce (espera só a de maior
 * prioridade, empate: a mais recente); prio 2 e 3 esperam em fila.
 */
export function enfileirar(state: FilaState, cenas: readonly Cena[], now: number, oculta = false): FilaResultado {
  const eventos: FilaEvento[] = [];
  let s: FilaState = { ...state, vistas: [...state.vistas] };
  for (const c of cenas) {
    if (s.vistas.includes(c.id)) continue;
    s.vistas = [...s.vistas, c.id];
    if (oculta) {
      eventos.push({ tipo: "instantanea", cena: c });
      continue;
    }
    if (c.prioridade === 0 && (s.ativas.length >= MAX_VISIVEIS || temPrio3(s.ativas))) {
      eventos.push({ tipo: "instantanea", cena: c });
      continue;
    }
    if (c.prioridade <= 1) {
      // coalescência: entre as menores que esperam e a nova, fica a de maior prioridade (empate: a nova)
      const menores = s.pendentes.filter((p) => p.prioridade <= 1);
      const melhor = menores.reduce<Cena>((m, p) => (p.prioridade > m.prioridade ? p : m), c);
      const descartadas = [...menores, c].filter((x) => x !== melhor);
      descartadas.forEach((d) => eventos.push({ tipo: "instantanea", cena: d }));
      s = { ...s, pendentes: [...s.pendentes.filter((p) => p.prioridade > 1), melhor] };
      continue;
    }
    s = { ...s, pendentes: [...s.pendentes, c] };
  }
  if (oculta) return { state: { ...s, ativas: [], pendentes: [] }, eventos: [...encerrarTudo(state), ...eventos] };
  s = promover(s, now, eventos);
  return { state: s, eventos };
}

/** Eventos para tudo que estava ativo ou esperando virar estado final. */
function encerrarTudo(state: FilaState): FilaEvento[] {
  return [
    ...state.ativas.map((a): FilaEvento => ({ tipo: "terminar", cenaId: a.cena.id })),
    ...state.pendentes.map((cena): FilaEvento => ({ tipo: "instantanea", cena })),
  ];
}

/** Avança o relógio: encerra o que acabou e promove pendentes. */
export function avancar(state: FilaState, now: number): FilaResultado {
  const eventos: FilaEvento[] = [];
  const acabadas = state.ativas.filter((a) => now >= a.fim);
  acabadas.forEach((a) => eventos.push({ tipo: "terminar", cenaId: a.cena.id }));
  const s = promover({ ...state, ativas: state.ativas.filter((a) => now < a.fim) }, now, eventos);
  return { state: s, eventos };
}

/** Pular (clique, Espaço, Esc): salta as cenas ativas PULÁVEIS ao beat final e mostra o carimbo por 400 ms. */
export function pular(state: FilaState, now: number): FilaResultado {
  const eventos: FilaEvento[] = [];
  const ativas = state.ativas.map((a) => {
    if (a.pulada || !ehPulavel(a.cena)) return a;
    const alvo = saltoDePular(a.cena);
    if (now - a.inicio >= alvo) return a; // já passou do beat final: segue normal
    eventos.push({ tipo: "saltar", cenaId: a.cena.id, paraMs: alvo });
    return { ...a, pulada: true, fim: Math.min(a.fim, now + PULAR_CARIMBO_MS) };
  });
  return { state: { ...state, ativas }, eventos };
}

/** Revanche / saída da mesa: limpa tudo (nada atrasado toca na próxima partida). */
export function reiniciar(state: FilaState): FilaResultado {
  return { state: filaVazia(), eventos: encerrarTudo(state) };
}
