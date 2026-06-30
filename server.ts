// Custom server: HTTP + Next.js request handler + Socket.IO no mesmo servidor.
// Doc base: node_modules/next/dist/docs/01-app/02-guides/custom-server.md
// Rodado via `tsx` (ver scripts no package.json). Não passa pelo compiler do Next.

import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

import {
  applyEvent,
  createGame,
  currentTimer,
  viewForPlayer,
} from "./src/lib/game/engine";
import {
  generateRoomId,
  getRoom,
  joinRoom,
  leaveRoom,
  type ServerRoom,
} from "./src/server/rooms";
import type { GameEvent } from "./src/types/game";
import type {
  ClientToServerEvents,
  GameActionAck,
  Player,
  ServerToClientEvents,
} from "./src/types/socket";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// Dados que guardamos por socket para fazer cleanup no disconnect.
interface SocketData {
  roomId?: string;
  player?: Player;
}

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

  // Envia a cada jogador SÓ a sua view (servidor filtra as cartas alheias).
  function broadcastState(room: ServerRoom): void {
    if (!room.game) return;
    for (const p of room.game.players) {
      io.to(p.id).emit("game_state", viewForPlayer(room.game, p.id));
    }
  }

  function clearTimer(room: ServerRoom): void {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
  }

  // A engine não conta tempo: o servidor arma o timeout da janela atual e, ao
  // estourar, injeta { type: "timeout" }. clearTimer antes de rearmar mata o
  // timer obsoleto quando uma reação muda o estado antes do prazo.
  function rearmTimer(room: ServerRoom): void {
    clearTimer(room);
    if (!room.game) return;
    const timer = currentTimer(room.game);
    if (!timer) return;
    room.timer = setTimeout(() => {
      room.timer = null;
      if (!room.game) return;
      const result = applyEvent(room.game, { type: "timeout" });
      if (result.error) return; // janela já fechou: ignora
      room.game = result.state;
      broadcastState(room);
      rearmTimer(room);
    }, timer.seconds * 1000);
  }

  io.on("connection", (socket) => {
    // Aplica um evento de jogo: injeta o socket.id como playerId, valida na
    // engine, persiste, responde o ack e propaga o novo estado + timer.
    function handleGameEvent(
      cb: (ack: GameActionAck) => void,
      makeEvent: (playerId: string) => GameEvent,
    ): void {
      const { roomId } = socket.data;
      const room = roomId ? getRoom(roomId) : undefined;
      if (!room || !room.game) {
        return cb({ ok: false, error: "Partida não encontrada." });
      }
      const result = applyEvent(room.game, makeEvent(socket.id));
      if (result.error) return cb({ ok: false, error: result.error });
      room.game = result.state;
      cb({ ok: true });
      broadcastState(room);
      rearmTimer(room);
    }

    // Gera um roomId novo sem armazenar a sala (criação acontece no join).
    socket.on("room:create", (cb) => {
      cb({ roomId: generateRoomId() });
    });

    socket.on("room:join", ({ roomId, name }, cb) => {
      const trimmed = name.trim();
      const id = roomId.trim().toUpperCase();
      if (!trimmed) return cb({ ok: false, error: "Nome obrigatório." });
      if (!id) return cb({ ok: false, error: "Código da sala obrigatório." });

      const player: Player = { id: socket.id, name: trimmed };
      const room = joinRoom(id, player);

      socket.data.roomId = id;
      socket.data.player = player;
      socket.join(id);

      cb({ ok: true, players: room.players });
      // Avisa todos na sala (inclusive quem entrou) a lista atualizada.
      io.to(id).emit("room:players", room.players);
      // Entrou (ou voltou) com partida em andamento: manda o estado atual.
      if (room.game) socket.emit("game_state", viewForPlayer(room.game, socket.id));
    });

    // ── Jogo ────────────────────────────────────────────────────────────────
    socket.on("game_start", ({ config }, cb) => {
      const { roomId } = socket.data;
      const room = roomId ? getRoom(roomId) : undefined;
      if (!room) return cb({ ok: false, error: "Sala não encontrada." });
      if (room.players[0]?.id !== socket.id) {
        return cb({ ok: false, error: "Só o host pode iniciar a partida." });
      }
      if (room.players.length < 2) {
        return cb({ ok: false, error: "Mínimo de 2 jogadores." });
      }
      if (room.game) return cb({ ok: false, error: "Partida já iniciada." });
      try {
        room.game = createGame(
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
      broadcastState(room);
      rearmTimer(room);
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
    socket.on("game_reveal", ({ cardIndex }, cb) =>
      handleGameEvent(cb, (id) => ({ type: "reveal", playerId: id, cardIndex })),
    );
    socket.on("game_exchange", ({ keep }, cb) =>
      handleGameEvent(cb, (id) => ({ type: "exchange_choose", playerId: id, keep })),
    );

    socket.on("disconnect", () => {
      const { roomId } = socket.data;
      if (!roomId) return;
      const before = getRoom(roomId);
      const room = leaveRoom(roomId, socket.id);
      if (!room) {
        if (before) clearTimer(before); // sala esvaziou: solta o timer
        return;
      }
      io.to(roomId).emit("room:players", room.players);
    });
  });

  httpServer.listen(port, () => {
    console.log(
      `> Server pronto em http://localhost:${port} (${dev ? "dev" : process.env.NODE_ENV})`,
    );
  });
});
