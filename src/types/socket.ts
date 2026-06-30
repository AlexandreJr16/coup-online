// Tipos compartilhados entre servidor e client para os eventos Socket.IO.
// Mantém o "contrato" num só lugar.
//
// Convenção: eventos de LOBBY usam colon (room:*, do scaffold). Eventos de JOGO
// usam snake_case (agents.md). O servidor injeta o playerId (= socket.id) nos
// eventos de jogo; o cliente nunca o envia.

import type { ActionType, Character, GameConfig, GameView } from "./game";

export interface Player {
  id: string; // socket.id
  name: string;
}

export interface Room {
  id: string;
  players: Player[];
}

// Respostas de ack (callback) usadas em create/join.
export interface CreateRoomAck {
  roomId: string;
}

export type JoinRoomAck =
  | { ok: true; players: Player[] }
  | { ok: false; error: string };

// Ack genérico dos eventos de jogo: erro de regra volta privado a quem agiu.
export type GameActionAck = { ok: true } | { ok: false; error: string };

// Eventos enviados pelo servidor para o client.
export interface ServerToClientEvents {
  "room:players": (players: Player[]) => void;
  // Estado do jogo já FILTRADO para este socket (nunca vaza cartas alheias).
  game_state: (view: GameView) => void;
}

// Eventos enviados pelo client para o servidor.
export interface ClientToServerEvents {
  "room:create": (cb: (ack: CreateRoomAck) => void) => void;
  "room:join": (
    payload: { roomId: string; name: string },
    cb: (ack: JoinRoomAck) => void,
  ) => void;

  // Jogo (host inicia; demais reagem). playerId é o socket.id, posto no servidor.
  game_start: (
    payload: { config?: Partial<GameConfig> },
    cb: (ack: GameActionAck) => void,
  ) => void;
  game_action: (
    payload: { action: ActionType; targetId?: string },
    cb: (ack: GameActionAck) => void,
  ) => void;
  game_block: (
    payload: { character: Character },
    cb: (ack: GameActionAck) => void,
  ) => void;
  game_challenge: (cb: (ack: GameActionAck) => void) => void;
  game_reveal: (
    payload: { cardIndex: number },
    cb: (ack: GameActionAck) => void,
  ) => void;
  game_exchange: (
    payload: { keep: Character[] },
    cb: (ack: GameActionAck) => void,
  ) => void;
}
