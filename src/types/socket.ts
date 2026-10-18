// Tipos compartilhados entre servidor e client para os eventos Socket.IO.
// Mantém o "contrato" num só lugar.
//
// Convenção: eventos de LOBBY usam colon (room:*, do scaffold). Eventos de JOGO
// usam snake_case (agents.md). O servidor injeta o playerId (= socket.id) nos
// eventos de jogo; o cliente nunca o envia.

import type { ActionType, Character, GameConfig, GameView } from "./game";

export interface Player {
  id: string; // id ESTÁVEL do jogador (não é o socket.id; sobrevive à reconexão)
  name: string;
  connected: boolean; // false = ausente (caiu/fechou a aba); o assento continua dele
}

export interface Room {
  id: string;
  players: Player[];
}

// Papel de quem está na sala: joga, ou só assiste (entrou com a partida em andamento ou
// com a sala cheia) e vira jogador na próxima partida. Espectador nunca recebe cartas.
export type Role = "player" | "spectator";

// Respostas de ack (callback) usadas em create/join.
export interface CreateRoomAck {
  roomId: string;
}

// `you` = identidade do jogador nesta sala. O `token` é SECRETO (guardado só no
// cliente dele, em sessionStorage) e permite voltar ao mesmo assento depois de F5
// ou queda de rede. O `id` é público (aparece nas views).
export type JoinRoomAck =
  | { ok: true; role: Role; players: Player[]; spectators: Player[]; you: { id: string; token: string } }
  | { ok: false; error: string };

// Ack genérico dos eventos de jogo: erro de regra volta privado a quem agiu.
export type GameActionAck = { ok: true } | { ok: false; error: string };

// ── Placar da noite (room:score) ─────────────────────────────────────────────
// Só números e nomes públicos: NUNCA carrega carta (nem oculta, nem revelada).
export interface ScoreRow {
  id: string; // playerId estável
  name: string;
  wins: number;
  played: number; // partidas terminadas em que esteve na mesa
}

// Quem lidera um título acumulado na sala ("Mentiroso da noite"). Empate divide o título.
export interface TitleLeader {
  id: "mentiroso" | "desconfiado" | "olho_de_lince" | "carrasco" | "ricaco";
  titulo: string;
  count: number; // quantas partidas essa(s) pessoa(s) levou o prêmio
  leaders: Array<{ id: string; name: string }>;
}

export interface ScorePayload {
  matches: number; // partidas terminadas na sala
  lastWinnerId: string | null; // vencedor da última partida (null = nenhuma ou sem vencedor)
  rows: ScoreRow[]; // ordenado: mais vitórias primeiro
  titles: TitleLeader[];
}

// Eventos enviados pelo servidor para o client.
export interface ServerToClientEvents {
  // Placar da noite: ao terminar cada partida (para a sala) e ao entrar/reconectar (para quem entrou).
  "room:score": (score: ScorePayload) => void;
  "room:players": (players: Player[]) => void;
  // Quem está assistindo (nunca é jogador da partida em curso).
  "room:spectators": (spectators: Player[]) => void;
  // Estado do jogo já FILTRADO para este socket (nunca vaza cartas alheias).
  game_state: (view: GameView) => void;
}

// Eventos enviados pelo client para o servidor.
export interface ClientToServerEvents {
  "room:create": (cb: (ack: CreateRoomAck) => void) => void;
  "room:join": (
    payload: { roomId: string; name: string; token?: string },
    cb: (ack: JoinRoomAck) => void,
  ) => void;
  // Saída voluntária (botão Sair): no lobby libera o assento na hora.
  "room:leave": () => void;

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
  // Revanche (depois de fim_de_jogo): mesma sala, mesmos timers; o vencedor começa.
  game_rematch: (cb: (ack: GameActionAck) => void) => void;
  // Liga/desliga o "passar automático": o servidor passa por você nas janelas em que você
  // não é parte envolvida (não é o alvo; nem o ator quando contestam um bloqueio).
  game_autopass: (payload: { enabled: boolean }, cb: (ack: GameActionAck) => void) => void;
  // "Deixo passar": não bloqueio nem contesto. Fecha a janela antes do timer
  // quando todos os elegíveis passam.
  game_pass: (cb: (ack: GameActionAck) => void) => void;
  game_reveal: (
    payload: { cardIndex: number },
    cb: (ack: GameActionAck) => void,
  ) => void;
  game_exchange: (
    payload: { keep: Character[] },
    cb: (ack: GameActionAck) => void,
  ) => void;
}
