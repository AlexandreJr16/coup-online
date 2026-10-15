// Store de salas em memória + funções puras de manipulação.
// Sem transporte (Socket.IO) aqui de propósito: fácil de testar.
//
// Identidade: o jogador tem um `id` ESTÁVEL (vai na view e na engine) e um `token`
// SECRETO (só ele conhece). O socket.id muda a cada reconexão e não é identidade.
// Quem volta com o token (ou, se perdeu, pelo nome de um assento ausente) retoma
// o mesmo assento — sem login, como manda o AGENTS.md.

import { randomBytes, randomUUID } from "node:crypto";

import type { GameState } from "../types/game";
import type { Player, Room } from "../types/socket";

export const MAX_PLAYERS = 6;

// Sala no servidor = lobby (Room) + estado de jogo + handles de timer. Tudo isso
// é server-only; o cliente recebe só a view filtrada (game_state).
export interface ServerRoom extends Room {
  game: GameState | null;
  timer: NodeJS.Timeout | null;
  // Relógio da fase atual: `timerSeq` = GameState.phaseSeq para o qual o timer foi
  // armado (só rearma quando a fase/janela muda); `timerEndsAt` = epoch ms do fim.
  timerSeq: number | null;
  timerEndsAt: number | null;
  tokens: Map<string, string>; // token (segredo) → playerId
  graceTimers: Map<string, NodeJS.Timeout>; // lobby: remoção pendente após desconexão
  cleanupTimer: NodeJS.Timeout | null; // sala sem ninguém online: apagar depois
}

export type JoinResult =
  | { ok: true; room: ServerRoom; player: Player; token: string; reconnected: boolean }
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
 *  1. token válido desta sala → retoma o assento;
 *  2. nome de um assento AUSENTE → retoma (perdeu o token, ex.: fechou a aba);
 *  3. partida em andamento → recusa (só volta quem já jogava);
 *  4. lobby → novo jogador (até MAX_PLAYERS).
 */
export function joinRoom(roomId: string, name: string, token?: string): JoinResult {
  const existing = rooms.get(roomId);

  if (existing && token) {
    const playerId = existing.tokens.get(token);
    const player = playerId ? existing.players.find((p) => p.id === playerId) : undefined;
    if (player) {
      player.connected = true;
      return { ok: true, room: existing, player, token, reconnected: true };
    }
  }

  if (existing) {
    const wanted = name.trim().toLowerCase();
    const ghost = existing.players.find((p) => !p.connected && p.name.toLowerCase() === wanted);
    const ghostToken = ghost ? tokenOfPlayer(existing, ghost.id) : undefined;
    if (ghost && ghostToken) {
      ghost.connected = true;
      return { ok: true, room: existing, player: ghost, token: ghostToken, reconnected: true };
    }
    if (existing.game) {
      return { ok: false, error: "Partida em andamento. Só quem já estava jogando pode voltar." };
    }
    if (existing.players.length >= MAX_PLAYERS) {
      return { ok: false, error: `Sala cheia (máximo ${MAX_PLAYERS} jogadores).` };
    }
  }

  const room: ServerRoom =
    existing ?? {
      id: roomId,
      players: [],
      game: null,
      timer: null,
      timerSeq: null,
      timerEndsAt: null,
      tokens: new Map(),
      graceTimers: new Map(),
      cleanupTimer: null,
    };
  rooms.set(roomId, room);

  const player: Player = { id: randomUUID(), name: name.trim(), connected: true };
  const newToken = randomBytes(16).toString("hex");
  room.players.push(player);
  room.tokens.set(newToken, player.id);
  return { ok: true, room, player, token: newToken, reconnected: false };
}

/** Marca o jogador como ausente (não remove o assento). */
export function markDisconnected(roomId: string, playerId: string): ServerRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const player = room.players.find((p) => p.id === playerId);
  if (player) player.connected = false;
  return room;
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
  for (const [token, id] of room.tokens) if (id === playerId) room.tokens.delete(token);
  const grace = room.graceTimers.get(playerId);
  if (grace) clearTimeout(grace);
  room.graceTimers.delete(playerId);
  if (room.players.length === 0) {
    deleteRoom(roomId);
    return null;
  }
  return room;
}

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
