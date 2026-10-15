// Custom server: HTTP + Next.js request handler + Socket.IO no mesmo servidor.
// Doc base: node_modules/next/dist/docs/01-app/02-guides/custom-server.md
// Rodado via `tsx` (ver scripts no package.json). Não passa pelo compiler do Next.

import { createServer } from "node:http";
import next from "next";
import { Server, type Socket } from "socket.io";

import {
  applyEvent,
  createGame,
  currentTimer,
  decisionPlayerId,
  viewForPlayer,
} from "./src/lib/game/engine";
import {
  anyConnected,
  deleteRoom,
  generateRoomId,
  getRoom,
  joinRoom,
  markDisconnected,
  removePlayer,
  tokenOfPlayer,
  type ServerRoom,
} from "./src/server/rooms";
import type { GameEvent, GameState } from "./src/types/game";
import type {
  ClientToServerEvents,
  GameActionAck,
  ServerToClientEvents,
} from "./src/types/socket";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const NAME_MAX = 20;
const ROOM_ID_MAX = 10;
// Lobby: quem cai tem esse tempo para voltar antes de perder o assento (F5, wifi).
const LOBBY_GRACE_MS = 20_000;
// Sala sem ninguém online é apagada depois disso (estado só em memória).
const ABANDON_MS = 10 * 60_000;
// Em partida, se a mesa espera por alguém ausente, o relógio dele encurta para isso.
const ABSENT_DECIDER_SECONDS = 5;

// Dados que guardamos por socket. A identidade é o playerId ESTÁVEL (não o socket.id).
interface SocketData {
  roomId?: string;
  playerId?: string;
}

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

// Canal privado do jogador: sobrevive à troca de socket (reconexão).
const playerChannel = (playerId: string) => `p:${playerId}`;

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer);

  // ── Estado de jogo → clientes ─────────────────────────────────────────────
  // Tempo que falta da fase atual, segundo o relógio do servidor (vai na view).
  function timerRemainingMs(room: ServerRoom): number | undefined {
    return room.timerEndsAt === null ? undefined : Math.max(0, room.timerEndsAt - Date.now());
  }

  // Envia a cada jogador SÓ a sua view (servidor filtra as cartas alheias).
  function broadcastState(room: ServerRoom): void {
    if (!room.game) return;
    const remaining = timerRemainingMs(room);
    for (const p of room.game.players) {
      io.to(playerChannel(p.id)).emit("game_state", viewForPlayer(room.game, p.id, remaining));
    }
  }

  function broadcastPlayers(room: ServerRoom): void {
    io.to(room.id).emit("room:players", room.players);
  }

  function isConnected(room: ServerRoom, playerId: string): boolean {
    return room.players.find((p) => p.id === playerId)?.connected ?? false;
  }

  // ── Timers ────────────────────────────────────────────────────────────────
  function clearTimer(room: ServerRoom): void {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
    room.timerSeq = null;
    room.timerEndsAt = null;
  }

  // A engine não conta tempo: o servidor arma o timeout da fase atual e, ao
  // estourar, injeta { type: "timeout" }. O timer só é REARMADO quando uma
  // fase/janela nova abre (phaseSeq mudou): um "Passar" que não fecha a janela
  // deixa o relógio correndo, em vez de reiniciá-lo. Sem ninguém online, pausa.
  function rearmTimer(room: ServerRoom): void {
    if (!room.game) return;
    const timer = currentTimer(room.game);
    if (!timer || !anyConnected(room)) return clearTimer(room);
    if (room.timer && room.timerSeq === room.game.phaseSeq) return; // mesma janela
    clearTimer(room); // mata o timer obsoleto da janela anterior

    // Mesa esperando alguém ausente: não faz todo mundo aguardar o tempo cheio.
    const decider = decisionPlayerId(room.game);
    const absent = decider !== null && !isConnected(room, decider);
    const seconds = absent ? Math.min(timer.seconds, ABSENT_DECIDER_SECONDS) : timer.seconds;

    room.timerSeq = room.game.phaseSeq;
    room.timerEndsAt = Date.now() + seconds * 1000;
    room.timer = setTimeout(() => {
      room.timer = null;
      if (!room.game) return;
      const result = applyEvent(room.game, { type: "timeout" });
      if (result.error) return; // fase já mudou: ignora
      commit(room, result.state);
    }, seconds * 1000);
  }

  // Persiste o novo estado, atualiza o relógio e propaga a view a cada jogador.
  // Rearmar ANTES de transmitir: a view precisa do tempo restante da fase nova.
  function commit(room: ServerRoom, state: GameState): void {
    room.game = state;
    rearmTimer(room);
    broadcastState(room);
  }

  // Alguém entrou/saiu da mesa: reconsidera o relógio (se a mesa espera por essa
  // pessoa, ou se voltou/ficou vazia) e reenvia a view com o tempo atualizado.
  function presenceChanged(room: ServerRoom, playerId: string): void {
    if (!room.game) return;
    if (decisionPlayerId(room.game) === playerId || !anyConnected(room) || !room.timer) {
      clearTimer(room);
      rearmTimer(room);
    }
    broadcastState(room);
  }

  // ── Presença: sair, cair, voltar ──────────────────────────────────────────
  function scheduleCleanup(room: ServerRoom): void {
    if (room.cleanupTimer) return;
    room.cleanupTimer = setTimeout(() => deleteRoom(room.id), ABANDON_MS);
  }

  // Lobby: quem caiu perde o assento se não voltar dentro da graça.
  function scheduleGrace(room: ServerRoom, playerId: string): void {
    const t = setTimeout(() => {
      room.graceTimers.delete(playerId);
      const p = room.players.find((x) => x.id === playerId);
      if (room.game || !p || p.connected) return;
      const updated = removePlayer(room.id, playerId);
      if (updated) broadcastPlayers(updated);
    }, LOBBY_GRACE_MS);
    room.graceTimers.set(playerId, t);
  }

  function applyAbsence(room: ServerRoom, playerId: string, voluntary: boolean): void {
    if (!room.game && voluntary) {
      // Saiu de propósito do lobby: libera o assento na hora.
      const updated = removePlayer(room.id, playerId);
      if (updated) broadcastPlayers(updated);
      return;
    }
    markDisconnected(room.id, playerId);
    broadcastPlayers(room);
    if (!room.game) scheduleGrace(room, playerId);
    else presenceChanged(room, playerId);
    if (!anyConnected(room)) scheduleCleanup(room);
  }

  // Solta este socket do jogador/sala. Só marca ausência se o jogador não tiver
  // outra conexão viva (ex.: já reconectou antes do disconnect antigo chegar).
  function detach(socket: AppSocket, voluntary: boolean): void {
    const { roomId, playerId } = socket.data;
    if (!roomId || !playerId) return;
    socket.data.roomId = undefined;
    socket.data.playerId = undefined;
    socket.leave(roomId);
    socket.leave(playerChannel(playerId));
    const room = getRoom(roomId);
    if (!room) return;
    void io
      .in(playerChannel(playerId))
      .fetchSockets()
      .then((rest) => {
        if (rest.length === 0) applyAbsence(room, playerId, voluntary);
      });
  }

  io.on("connection", (socket) => {
    // Aplica um evento de jogo: injeta o playerId do socket, valida na engine,
    // responde o ack e propaga o novo estado + timer.
    function handleGameEvent(
      cb: (ack: GameActionAck) => void,
      makeEvent: (playerId: string) => GameEvent,
    ): void {
      const { roomId, playerId } = socket.data;
      const room = roomId ? getRoom(roomId) : undefined;
      if (!room || !room.game || !playerId) {
        return cb({ ok: false, error: "Partida não encontrada." });
      }
      const result = applyEvent(room.game, makeEvent(playerId));
      if (result.error) return cb({ ok: false, error: result.error });
      cb({ ok: true });
      commit(room, result.state);
    }

    // Gera um roomId novo sem armazenar a sala (criação acontece no join).
    socket.on("room:create", (cb) => {
      cb({ roomId: generateRoomId() });
    });

    socket.on("room:join", (payload, cb) => {
      // Valida o payload (vem da rede: pode não ter o formato esperado).
      const roomId = typeof payload?.roomId === "string" ? payload.roomId.trim().toUpperCase() : "";
      const name = typeof payload?.name === "string" ? payload.name.trim() : "";
      const token = typeof payload?.token === "string" ? payload.token : undefined;
      if (!name) return cb({ ok: false, error: "Nome obrigatório." });
      if (name.length > NAME_MAX) return cb({ ok: false, error: `Nome longo demais (máx. ${NAME_MAX}).` });
      if (!roomId || roomId.length > ROOM_ID_MAX) {
        return cb({ ok: false, error: "Código da sala inválido." });
      }

      // Mesmo socket pedindo join de novo na mesma sala (ex.: React StrictMode, que
      // roda o effect duas vezes antes do 1º ack chegar): é o mesmo jogador.
      let effectiveToken = token;
      const { roomId: curRoom, playerId: curPlayer } = socket.data;
      if (curRoom && curRoom !== roomId) detach(socket, true); // trocou de sala
      else if (curRoom === roomId && curPlayer && !effectiveToken) {
        const cur = getRoom(roomId);
        effectiveToken = cur ? tokenOfPlayer(cur, curPlayer) : undefined;
      }

      const result = joinRoom(roomId, name, effectiveToken);
      if (!result.ok) return cb({ ok: false, error: result.error });
      const { room, player } = result;

      // Voltou: cancela remoção pendente e o descarte da sala abandonada.
      const grace = room.graceTimers.get(player.id);
      if (grace) clearTimeout(grace);
      room.graceTimers.delete(player.id);
      if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
        room.cleanupTimer = null;
      }

      socket.data.roomId = room.id;
      socket.data.playerId = player.id;
      void socket.join(room.id);
      void socket.join(playerChannel(player.id));

      cb({ ok: true, players: room.players, you: { id: player.id, token: result.token } });
      // Avisa todos na sala (inclusive quem entrou) a lista atualizada.
      broadcastPlayers(room);
      // Voltou com partida em andamento: reanima o relógio e manda o estado atual.
      if (room.game) presenceChanged(room, player.id);
    });

    socket.on("room:leave", () => detach(socket, true));

    // ── Jogo ────────────────────────────────────────────────────────────────
    socket.on("game_start", ({ config }, cb) => {
      const { roomId, playerId } = socket.data;
      const room = roomId ? getRoom(roomId) : undefined;
      if (!room) return cb({ ok: false, error: "Sala não encontrada." });
      if (room.players[0]?.id !== playerId) {
        return cb({ ok: false, error: "Só o host pode iniciar a partida." });
      }
      if (room.game) return cb({ ok: false, error: "Partida já iniciada." });
      // Quem está ausente (na graça do lobby) fica de fora da partida.
      for (const p of room.players.filter((x) => !x.connected)) removePlayer(room.id, p.id);
      if (room.players.length < 2) return cb({ ok: false, error: "Mínimo de 2 jogadores." });
      let game: GameState;
      try {
        game = createGame(
          room.players.map((p) => ({ id: p.id, name: p.name })),
          config ?? {},
        );
      } catch (e) {
        return cb({
          ok: false,
          error: e instanceof Error ? e.message : "Erro ao iniciar.",
        });
      }
      cb({ ok: true });
      broadcastPlayers(room);
      commit(room, game);
    });

    socket.on("game_action", ({ action, targetId }, cb) =>
      handleGameEvent(cb, (id) => ({ type: "action", playerId: id, action, targetId })),
    );
    socket.on("game_block", ({ character }, cb) =>
      handleGameEvent(cb, (id) => ({ type: "block", playerId: id, character })),
    );
    socket.on("game_challenge", (cb) =>
      handleGameEvent(cb, (id) => ({ type: "challenge", playerId: id })),
    );
    socket.on("game_pass", (cb) =>
      handleGameEvent(cb, (id) => ({ type: "pass", playerId: id })),
    );
    socket.on("game_reveal", ({ cardIndex }, cb) =>
      handleGameEvent(cb, (id) => ({ type: "reveal", playerId: id, cardIndex })),
    );
    socket.on("game_exchange", ({ keep }, cb) =>
      handleGameEvent(cb, (id) => ({ type: "exchange_choose", playerId: id, keep })),
    );

    socket.on("disconnect", () => detach(socket, false));
  });

  httpServer.listen(port, () => {
    console.log(
      `> Server pronto em http://localhost:${port} (${dev ? "dev" : process.env.NODE_ENV})`,
    );
  });
});
