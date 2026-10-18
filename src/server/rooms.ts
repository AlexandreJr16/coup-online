// Store de salas em memória + funções puras de manipulação.
// Sem transporte (Socket.IO) aqui de propósito: fácil de testar.
//
// Identidade: o jogador tem um `id` ESTÁVEL (vai na view e na engine) e um `token`
// SECRETO (só ele conhece). O socket.id muda a cada reconexão e não é identidade.
// Quem volta com o token (ou, se perdeu, pelo nome de um assento ausente) retoma
// o mesmo assento — sem login, como manda o AGENTS.md.

import { randomBytes, randomUUID } from "node:crypto";

import { emptyScoreboard, type Scoreboard } from "../lib/game/scoreboard";
import type { GameState } from "../types/game";
import type { Player, Role, Room } from "../types/socket";

export const MAX_PLAYERS = 6;

// Sala no servidor = lobby (Room) + estado de jogo + handles de timer. Tudo isso
// é server-only; o cliente recebe só a view filtrada (game_state).
export interface ServerRoom extends Room {
  // Quem só assiste, por ordem de chegada. Fica SEPARADO de `players` de propósito:
  // `players[0]` é o host, o limite de 6 e a revanche contam só jogadores. Spectators
  // entram na partida via promoteSpectators (início de partida ou revanche).
  spectators: Player[];
  game: GameState | null;
  timer: NodeJS.Timeout | null;
  // Relógio da fase atual: `timerSeq` = GameState.phaseSeq para o qual o timer foi
  // armado (só rearma quando a fase/janela muda); `timerEndsAt` = epoch ms do fim.
  timerSeq: number | null;
  timerEndsAt: number | null;
  tokens: Map<string, string>; // token (segredo) → playerId (jogador OU espectador)
  autoPass: Set<string>; // jogadores com "passar automático" ligado
  graceTimers: Map<string, NodeJS.Timeout>; // lobby: remoção pendente após desconexão
  cleanupTimer: NodeJS.Timeout | null; // sala sem ninguém online: apagar depois
  // Placar da noite (vitórias, partidas e prêmios acumulados). Em memória: nasce com a sala e
  // some com ela (deleteRoom). Chaveado por playerId estável, então espectador que vira
  // jogador (mesmo id) mantém o histórico.
  scoreboard: Scoreboard;
  // Identidades "aposentadas" que TÊM linha no placar: token (segredo) → playerId antigo.
  // Quem é removido por removePlayer/dropIdentity (ex.: caiu e outro pediu revanche) perde o
  // assento, mas se voltar com o MESMO token reaproveita o MESMO id, então o placar segue com
  // 1 linha por pessoa. Casa só por token: quem só repete o nome NÃO herda o histórico.
  // Morre junto com a sala (deleteRoom); só guarda quem pontuou, então é pequeno.
  retiredTokens: Map<string, string>;
  // Medição: epoch ms em que a partida atual começou, e qual partida (matchNumber) já foi
  // somada ao placar (evita contar duas vezes o mesmo fim de partida).
  matchStartedAt: number | null;
  scoredMatch: number;
}

export type JoinResult =
  | { ok: true; room: ServerRoom; player: Player; token: string; reconnected: boolean; role: Role }
  | { ok: false; error: string };

const rooms = new Map<string, ServerRoom>();

const ROOM_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I/O/0/1 (ambíguos)
const ROOM_ID_LENGTH = 5;

function randomRoomId(): string {
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ROOM_ID_ALPHABET[Math.floor(Math.random() * ROOM_ID_ALPHABET.length)];
  }
  return id;
}

/** Gera um roomId único, sem criar a sala ainda. */
export function generateRoomId(): string {
  let id = randomRoomId();
  while (rooms.has(id)) id = randomRoomId();
  return id;
}

/** Token secreto do assento (uso interno do servidor; nunca vai em views). */
export function tokenOfPlayer(room: ServerRoom, playerId: string): string | undefined {
  for (const [token, id] of room.tokens) if (id === playerId) return token;
  return undefined;
}

/**
 * Entra numa sala (criando-a se não existir). Ordem de decisão:
 *  1. token válido desta sala → retoma o assento (de jogador ou de espectador);
 *  2. nome de um assento AUSENTE → retoma (perdeu o token, ex.: fechou a aba);
 *  3. partida em andamento OU sala cheia → entra como ESPECTADOR (vira jogador na
 *     próxima partida, por ordem de chegada);
 *  4. lobby com vaga → novo jogador (até MAX_PLAYERS).
 */
export function joinRoom(roomId: string, name: string, token?: string): JoinResult {
  const existing = rooms.get(roomId);

  if (existing && token) {
    const id = existing.tokens.get(token);
    const player = id ? existing.players.find((p) => p.id === id) : undefined;
    if (player) {
      player.connected = true;
      return { ok: true, room: existing, player, token, reconnected: true, role: "player" };
    }
    const spectator = id ? existing.spectators.find((p) => p.id === id) : undefined;
    if (spectator) {
      spectator.connected = true;
      return { ok: true, room: existing, player: spectator, token, reconnected: true, role: "spectator" };
    }
  }

  // Token de quem foi removido mas já pontuou: volta com o MESMO id (ver retiredTokens).
  const reusedId = existing && token ? existing.retiredTokens.get(token) : undefined;
  if (existing && token && reusedId) existing.retiredTokens.delete(token);

  if (existing) {
    const wanted = name.trim().toLowerCase();
    const isGhost = (p: Player) => !reusedId && !p.connected && p.name.toLowerCase() === wanted;
    const ghost = existing.players.find(isGhost);
    const ghostToken = ghost ? tokenOfPlayer(existing, ghost.id) : undefined;
    if (ghost && ghostToken) {
      ghost.connected = true;
      return { ok: true, room: existing, player: ghost, token: ghostToken, reconnected: true, role: "player" };
    }
    const specGhost = existing.spectators.find(isGhost);
    const specToken = specGhost ? tokenOfPlayer(existing, specGhost.id) : undefined;
    if (specGhost && specToken) {
      specGhost.connected = true;
      return { ok: true, room: existing, player: specGhost, token: specToken, reconnected: true, role: "spectator" };
    }
    if (existing.game || existing.players.length >= MAX_PLAYERS) {
      const spectator: Player = { id: reusedId ?? randomUUID(), name: name.trim(), connected: true };
      const specNewToken = reusedId && token ? token : randomBytes(16).toString("hex");
      existing.spectators.push(spectator);
      existing.tokens.set(specNewToken, spectator.id);
      return { ok: true, room: existing, player: spectator, token: specNewToken, reconnected: false, role: "spectator" };
    }
  }

  const room: ServerRoom =
    existing ?? {
      id: roomId,
      players: [],
      spectators: [],
      game: null,
      timer: null,
      timerSeq: null,
      timerEndsAt: null,
      tokens: new Map(),
      autoPass: new Set(),
      graceTimers: new Map(),
      cleanupTimer: null,
      scoreboard: emptyScoreboard(),
      retiredTokens: new Map(),
      matchStartedAt: null,
      scoredMatch: 0,
    };
  rooms.set(roomId, room);

  const player: Player = { id: reusedId ?? randomUUID(), name: name.trim(), connected: true };
  const newToken = reusedId && token ? token : randomBytes(16).toString("hex");
  room.players.push(player);
  room.tokens.set(newToken, player.id);
  return { ok: true, room, player, token: newToken, reconnected: false, role: "player" };
}

export function isSpectator(room: ServerRoom, id: string): boolean {
  return room.spectators.some((p) => p.id === id);
}

// Esquece a identidade de alguém que saiu de vez: token, "passar automático" e graça.
function dropIdentity(room: ServerRoom, id: string): void {
  const scored = id in room.scoreboard.entries;
  for (const [token, owner] of room.tokens) {
    if (owner !== id) continue;
    room.tokens.delete(token);
    if (scored) room.retiredTokens.set(token, id); // volta com o token = mesma linha do placar
  }
  room.autoPass.delete(id);
  const grace = room.graceTimers.get(id);
  if (grace) clearTimeout(grace);
  room.graceTimers.delete(id);
}

/** Marca o jogador (ou espectador) como ausente (não remove o assento). */
export function markDisconnected(roomId: string, playerId: string): ServerRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const who =
    room.players.find((p) => p.id === playerId) ?? room.spectators.find((p) => p.id === playerId);
  if (who) who.connected = false;
  return room;
}

/** Tira um espectador da sala (saiu, ou caiu e não voltou). Nunca apaga a sala. */
export function removeSpectator(roomId: string, id: string): ServerRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.spectators = room.spectators.filter((p) => p.id !== id);
  dropIdentity(room, id);
  return room;
}

/**
 * Passa espectadores CONECTADOS para a lista de jogadores, por ordem de chegada, até
 * MAX_PLAYERS. Quem não cabe segue como espectador; quem está desconectado é descartado.
 * O token do espectador continua valendo (o id é o mesmo): ele vira jogador sem reentrar.
 * Retorna quem foi promovido.
 */
export function promoteSpectators(room: ServerRoom): Player[] {
  const promoted: Player[] = [];
  const staying: Player[] = [];
  for (const s of room.spectators) {
    if (!s.connected) dropIdentity(room, s.id);
    else if (room.players.length < MAX_PLAYERS) {
      room.players.push(s);
      promoted.push(s);
    } else staying.push(s);
  }
  room.spectators = staying;
  return promoted;
}

/**
 * Remove o assento de vez (saída voluntária; lobby). Apaga a sala se ficar vazia.
 * Retorna a sala atualizada, ou null se a sala foi removida/não existia.
 * Obs: NÃO mexe em room.game — a engine mantém a própria lista de jogadores;
 * remover um assento no meio da partida corromperia os índices.
 */
export function removePlayer(roomId: string, playerId: string): ServerRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.players = room.players.filter((p) => p.id !== playerId);
  dropIdentity(room, playerId);
  if (room.players.length === 0) {
    // Sem jogadores, mas com espectadores online: eles assumem a sala em vez de perdê-la.
    promoteSpectators(room);
    if (room.players.length === 0) {
      deleteRoom(roomId);
      return null;
    }
  }
  return room;
}

/** Algum JOGADOR online? Espectadores não contam: não seguram o relógio nem a sala. */
export function anyConnected(room: ServerRoom): boolean {
  return room.players.some((p) => p.connected);
}

/** Apaga a sala e solta todos os timers dela. */
export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.timer) clearTimeout(room.timer);
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  for (const t of room.graceTimers.values()) clearTimeout(t);
  rooms.delete(roomId);
}

export function getRoom(roomId: string): ServerRoom | undefined {
  return rooms.get(roomId);
}
