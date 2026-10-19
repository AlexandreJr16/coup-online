// Placar da noite (F1) e títulos acumulados (F3): funções PURAS sobre um Scoreboard que
// vive na sala (em memória; some junto com ela). Nada aqui toca em cartas: só ids, nomes,
// contagem de vitórias e de prêmios (computeAwards). Imutável: devolve um placar novo.
import type { PlayerStats } from "../../types/game";
import type { ScorePayload, ScoreRow, TitleLeader } from "../../types/socket";
import { computeAwards, type Award } from "./awards";

type AwardId = Award["id"];

// Ordem fixa = ordem em que os títulos aparecem no payload.
const TITLES: Array<{ id: AwardId; titulo: string }> = [
  { id: "mentiroso", titulo: "Mentiroso da noite" },
  { id: "desconfiado", titulo: "Maior desconfiado da noite" },
  { id: "olho_de_lince", titulo: "Olho de lince da noite" },
  { id: "carrasco", titulo: "Carrasco da noite" },
  { id: "ricaco", titulo: "Ricaço da noite" },
];

export interface ScoreEntry {
  id: string;
  name: string;
  wins: number;
  played: number;
  awards: Partial<Record<AwardId, number>>; // partidas em que levou cada prêmio
}

export interface Scoreboard {
  matches: number;
  lastWinnerId: string | null;
  entries: Record<string, ScoreEntry>; // por playerId
}

export interface FinishedMatch {
  winnerId: string | null;
  players: Array<{ id: string; name: string }>; // quem estava na mesa
  stats: Record<string, PlayerStats>;
}

export function emptyScoreboard(): Scoreboard {
  return { matches: 0, lastWinnerId: null, entries: {} };
}

/** Soma uma partida terminada ao placar (vitória, partidas jogadas e prêmios). */
export function recordMatch(board: Scoreboard, match: FinishedMatch): Scoreboard {
  const entries: Record<string, ScoreEntry> = {};
  for (const [id, e] of Object.entries(board.entries)) entries[id] = { ...e, awards: { ...e.awards } };

  for (const p of match.players) {
    const e = entries[p.id] ?? { id: p.id, name: p.name, wins: 0, played: 0, awards: {} };
    e.name = p.name; // o nome mais recente vale
    e.played += 1;
    if (p.id === match.winnerId) e.wins += 1;
    entries[p.id] = e;
  }

  // computeAwards devolve NOMES; passando id→id, ele devolve os ids (e ignora quem não jogou).
  const ids = Object.fromEntries(match.players.map((p) => [p.id, p.id]));
  for (const award of computeAwards(match.stats, ids)) {
    for (const id of award.names) {
      const e = entries[id];
      if (e) e.awards[award.id] = (e.awards[award.id] ?? 0) + 1;
    }
  }

  return { matches: board.matches + 1, lastWinnerId: match.winnerId, entries };
}

/** Quem lidera cada título acumulado (empate divide; título sem ninguém não aparece). */
export function computeTitles(board: Scoreboard): TitleLeader[] {
  const all = Object.values(board.entries);
  const out: TitleLeader[] = [];
  for (const { id, titulo } of TITLES) {
    const max = Math.max(0, ...all.map((e) => e.awards[id] ?? 0));
    if (max < 1) continue;
    const leaders = all
      .filter((e) => (e.awards[id] ?? 0) === max)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => ({ id: e.id, name: e.name }));
    out.push({ id, titulo, count: max, leaders });
  }
  return out;
}

/** O que vai para os clientes em `room:score`: nenhum campo de carta. */
export function toScorePayload(board: Scoreboard): ScorePayload {
  const rows: ScoreRow[] = Object.values(board.entries)
    .map(({ id, name, wins, played }) => ({ id, name, wins, played }))
    .sort((a, b) => b.wins - a.wins || a.played - b.played || a.name.localeCompare(b.name));
  return {
    matches: board.matches,
    lastWinnerId: board.lastWinnerId,
    rows,
    titles: computeTitles(board),
  };
}
