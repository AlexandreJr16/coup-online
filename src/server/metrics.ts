// Medição (F7/R7): linhas de log JSON, uma por evento, sem banco e sem arquivo. Dá para
// contar revanches por sala depois com `grep '"evt":"rematch_request"'` no log do servidor.
// As funções de montagem são PURAS; quem escreve é um logger injetável (padrão: console.log).
//
// ATENÇÃO ao analisar: o contador `match` vive no estado da sala. Se a sala for apagada (todo
// mundo saiu / abandono) e recriada com o MESMO código, o log recomeça em `match: 1`. Para
// separar análises, trate cada `match_start` com `match: 1` como o início de uma sala nova,
// em vez de agrupar só por roomId.

export type MetricsEntry =
  | {
      evt: "match_start";
      ts: string;
      roomId: string;
      match: number; // nº da partida na sala
      players: number;
    }
  | {
      evt: "match_end";
      ts: string;
      roomId: string;
      match: number;
      players: number;
      winnerId: string | null; // só o id: o apelido de amigo não precisa ir para o log do Render
      durationMs: number;
    }
  | {
      evt: "rematch_request";
      ts: string;
      roomId: string;
      match: number; // nº da partida que a revanche abre
      rematches: number; // revanches pedidas na sala até agora (= match - 1)
      players: number;
    };

export type MetricsLogger = (entry: MetricsEntry) => void;

/** Padrão: UMA linha JSON no stdout. */
export const consoleMetrics: MetricsLogger = (entry) => console.log(JSON.stringify(entry));

const iso = (nowMs: number) => new Date(nowMs).toISOString();

export function matchStartEntry(a: { roomId: string; match: number; players: number; nowMs: number }): MetricsEntry {
  return { evt: "match_start", ts: iso(a.nowMs), roomId: a.roomId, match: a.match, players: a.players };
}

export function matchEndEntry(a: {
  roomId: string;
  match: number;
  players: number;
  winnerId: string | null;
  startedAtMs: number | null;
  nowMs: number;
}): MetricsEntry {
  return {
    evt: "match_end",
    ts: iso(a.nowMs),
    roomId: a.roomId,
    match: a.match,
    players: a.players,
    winnerId: a.winnerId,
    durationMs: a.startedAtMs === null ? 0 : Math.max(0, a.nowMs - a.startedAtMs),
  };
}

export function rematchEntry(a: { roomId: string; match: number; players: number; nowMs: number }): MetricsEntry {
  return {
    evt: "rematch_request",
    ts: iso(a.nowMs),
    roomId: a.roomId,
    match: a.match,
    rematches: Math.max(0, a.match - 1),
    players: a.players,
  };
}
