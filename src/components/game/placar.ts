// Placar da noite na tela de fim de partida: lógica PURA (sem React, sem socket). Recebe o
// payload de `room:score` (ou qualquer coisa, se o servidor ainda não mandou) e devolve só o
// que a tela precisa desenhar: linhas ordenadas, líder, títulos com ícone e o rótulo de rodapé.
// Nada aqui toca em cartas: o payload só tem ids, nomes e contagens.
import { ICONE_DO_PREMIO } from "../../lib/game/awards";
import type { ScorePayload, ScoreRow, TitleLeader } from "../../types/socket";
import type { IconName } from "./helpers";

/** Máximo de linhas no painel (a mesa tem até 6; sobra espaço para quem já saiu). */
export const LIMITE_LINHAS = 6;

export interface LinhaPlacar {
  id: string;
  name: string;
  wins: number;
  played: number;
  lider: boolean; // mais vitórias da noite (empate divide; ninguém é líder com 0 vitórias)
  ultimoVencedor: boolean; // ganhou a partida que acabou de terminar
  naMesa: boolean; // ainda está na partida atual
  avatar: string | null; // slug do retrato, o MESMO da mesa (só para quem está na mesa)
}

export interface TituloNoite {
  id: TitleLeader["id"];
  titulo: string; // "Mentiroso da noite"
  icone: IconName;
  quem: string; // "Ana e Bia"
  detalhe: string; // "2 vezes"
}

export interface VisaoPlacar {
  partidas: number;
  rotulo: string; // "4 partidas nesta sala"
  linhas: LinhaPlacar[];
  ocultas: number; // linhas que não couberam em LIMITE_LINHAS
  titulos: TituloNoite[];
}

export interface ContextoPlacar {
  matchNumber: number; // partida que acabou de terminar (view.matchNumber)
  playerIds: string[]; // jogadores da mesa, na ordem de view.players
  avatares: Record<string, string>; // playerId -> slug (assignAvatars)
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const ehInt = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Valida o formato de `room:score` (rede é fronteira). Inválido ou ausente vira null. */
export function lerPlacar(raw: unknown): ScorePayload | null {
  if (!ehObjeto(raw) || !ehInt(raw.matches) || !Array.isArray(raw.rows)) return null;
  const rows: ScoreRow[] = [];
  for (const r of raw.rows) {
    if (!ehObjeto(r) || typeof r.id !== "string" || typeof r.name !== "string" || !ehInt(r.wins) || !ehInt(r.played)) {
      return null;
    }
    rows.push({ id: r.id, name: r.name, wins: r.wins, played: r.played });
  }
  const titles: TitleLeader[] = [];
  if (Array.isArray(raw.titles)) {
    for (const t of raw.titles) {
      if (!ehObjeto(t) || typeof t.id !== "string" || !(t.id in ICONE_DO_PREMIO) || typeof t.titulo !== "string") continue;
      if (!ehInt(t.count) || !Array.isArray(t.leaders)) continue;
      const leaders = t.leaders.flatMap((l): Array<{ id: string; name: string }> =>
        ehObjeto(l) && typeof l.id === "string" && typeof l.name === "string" ? [{ id: l.id, name: l.name }] : [],
      );
      if (leaders.length === 0) continue;
      titles.push({ id: t.id as TitleLeader["id"], titulo: t.titulo, count: t.count, leaders });
    }
  }
  return {
    matches: raw.matches,
    lastWinnerId: typeof raw.lastWinnerId === "string" ? raw.lastWinnerId : null,
    rows,
    titles,
  };
}

/** "1 partida nesta sala" / "4 partidas nesta sala". */
export function rotuloPartidas(n: number): string {
  return `${n} ${n === 1 ? "partida" : "partidas"} nesta sala`;
}

/** "2 vezes" / "1 vez". */
export function vezes(n: number): string {
  return `${n} ${n === 1 ? "vez" : "vezes"}`;
}

/** "3 vitórias em 4 partidas" / "1 vitória em 1 partida". */
export function resumoLinha(wins: number, played: number): string {
  return `${wins} ${wins === 1 ? "vitória" : "vitórias"} em ${played} ${played === 1 ? "partida" : "partidas"}`;
}

/** "Ana", "Ana e Bia", "Ana, Bia e Caio". */
export function juntarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/** Mais vitórias primeiro; depois quem jogou menos; depois pelo nome. */
const porVitorias = (a: ScoreRow, b: ScoreRow) =>
  b.wins - a.wins || a.played - b.played || a.name.localeCompare(b.name);

/**
 * Tudo o que o painel de fim de partida mostra do placar, ou null quando não há o que mostrar:
 * payload ausente/inválido, placar sem linhas, ou placar ANTIGO (o `game_state` final chega
 * antes do `room:score`; até ele chegar o que está na memória é da partida anterior).
 */
export function visaoDoPlacar(raw: unknown, ctx: ContextoPlacar): VisaoPlacar | null {
  const score = lerPlacar(raw);
  if (!score || score.rows.length === 0) return null;
  if (score.matches < ctx.matchNumber) return null;

  const naMesa = new Set(ctx.playerIds);
  const ordenadas = [...score.rows].sort(porVitorias);
  // Quem está na mesa nunca fica de fora do corte; as vagas que sobram vão para quem já saiu.
  const dentro = ordenadas.filter((r) => naMesa.has(r.id)).slice(0, LIMITE_LINHAS);
  const fora = ordenadas.filter((r) => !naMesa.has(r.id)).slice(0, LIMITE_LINHAS - dentro.length);
  const escolhidas = [...dentro, ...fora].sort(porVitorias);

  const max = Math.max(0, ...score.rows.map((r) => r.wins));
  const linhas = escolhidas.map((r): LinhaPlacar => ({
    id: r.id,
    name: r.name,
    wins: r.wins,
    played: r.played,
    lider: max > 0 && r.wins === max,
    ultimoVencedor: r.id === score.lastWinnerId,
    naMesa: naMesa.has(r.id),
    avatar: ctx.avatares[r.id] ?? null,
  }));

  const titulos = score.titles.map((t): TituloNoite => ({
    id: t.id,
    titulo: t.titulo,
    icone: ICONE_DO_PREMIO[t.id],
    quem: juntarNomes(t.leaders.map((l) => l.name)),
    detalhe: vezes(t.count),
  }));

  return {
    partidas: score.matches,
    rotulo: rotuloPartidas(score.matches),
    linhas,
    ocultas: score.rows.length - linhas.length,
    titulos,
  };
}
