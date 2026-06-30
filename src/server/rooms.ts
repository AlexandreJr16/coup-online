// Store de salas em memória + funções puras de manipulação.
// Sem transporte (Socket.IO) aqui de propósito: fácil de testar.

import type { GameState } from "../types/game";
import type { Player, Room } from "../types/socket";

// Sala no servidor = lobby (Room) + estado de jogo + handle do timer da janela.
// game/timer são server-only; o cliente recebe só a view filtrada (game_state).
export interface ServerRoom extends Room {
  game: GameState | null;
  timer: NodeJS.Timeout | null;
}

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

/** Cria a sala se não existir e adiciona o jogador. Retorna a sala. */
export function joinRoom(roomId: string, player: Player): ServerRoom {
  let room = rooms.get(roomId);
  if (!room) {
    room = { id: roomId, players: [], game: null, timer: null };
    rooms.set(roomId, room);
  }
  // Evita duplicar o mesmo socket (ex: reconexão/strict mode).
  if (!room.players.some((p) => p.id === player.id)) {
    room.players.push(player);
  }
  return room;
}

/**
 * Remove o jogador de uma sala. Apaga a sala se ficar vazia.
 * Retorna a sala atualizada, ou null se a sala foi removida/não existia.
 * Obs: NÃO mexe em room.game — a engine mantém a própria lista de jogadores;
 * remover um assento no meio da partida corromperia os índices.
 */
export function leaveRoom(roomId: string, playerId: string): ServerRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.players = room.players.filter((p) => p.id !== playerId);
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return null;
  }
  return room;
}

export function getRoom(roomId: string): ServerRoom | undefined {
  return rooms.get(roomId);
}
