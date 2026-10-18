// Lógica de Socket.IO do jogo (salas, presença, timers, eventos). Separada do
// server.ts para poder ser testada em INTEGRAÇÃO com um http.Server simples, sem Next.

import type { Server, Socket } from "socket.io";

import {
  applyEvent,
  autoPassTargets,
  createGame,
  currentTimer,
  decisionPlayerId,
  viewForPlayer,
} from "../lib/game/engine";
import {
  anyConnected,
  deleteRoom,
  generateRoomId,
  getRoom,
  isSpectator,
  joinRoom,
  markDisconnected,
  promoteSpectators,
  removePlayer,
  removeSpectator,
  tokenOfPlayer,
  type ServerRoom,
} from "./rooms";
import { recordMatch, toScorePayload } from "../lib/game/scoreboard";
import {
  consoleMetrics,
  matchEndEntry,
  matchStartEntry,
  rematchEntry,
  type MetricsLogger,
} from "./metrics";
import type { GameEvent, GameState } from "../types/game";
import type {
  ClientToServerEvents,
  GameActionAck,
  ServerToClientEvents,
} from "../types/socket";

const NAME_MAX = 20;
const ROOM_ID_MAX = 10;
// Lobby: quem cai tem esse tempo para voltar antes de perder o assento (F5, wifi).
const LOBBY_GRACE_MS = 20_000;
// Sala sem ninguém online é apagada depois disso (estado só em memória).
const ABANDON_MS = 10 * 60_000;
// Em partida, se a mesa espera por alguém ausente, o relógio dele encurta para isso.
const ABSENT_DECIDER_SECONDS = 5;
// Espectador que caiu tem esse tempo para voltar (F5) antes de sair da lista.
const SPECTATOR_GRACE_MS = 20_000;
// "Quem está olhando" da view do espectador: nunca coincide com um jogador, então a engine
// esconde TODAS as cartas ocultas e a escolha da Troca (viewForPlayer só revela ao dono).
const SPECTATOR_VIEWER_ID = "__espectador__";
const NO_SPECTATOR_PLAY = "Espectadores não jogam: você entra na próxima partida.";

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

export type GameIO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export interface SocketOptions {
  // Multiplica TODOS os tempos do servidor (timers de fase, graça do lobby, descarte
  // de sala). 1 em produção; os testes usam um valor pequeno para não esperar segundos.
  timeScale?: number;
  // Destino das linhas de medição (JSON). Padrão: console.log; os testes injetam um coletor.
  log?: MetricsLogger;
  // Relógio (epoch ms). Padrão Date.now; injetável para testar a duração da partida.
  now?: () => number;
}

export function attachGameSocket(io: GameIO, opts: SocketOptions = {}): void {
  const scale = opts.timeScale ?? 1;
  const log = opts.log ?? consoleMetrics;
  const now = opts.now ?? Date.now;

  // ── Placar da noite e medição ─────────────────────────────────────────────
  // Só números e nomes públicos: nenhuma carta no payload de room:score.
  function sendScore(room: ServerRoom, to: { emit: (ev: "room:score", p: ReturnType<typeof toScorePayload>) => unknown }): void {
    to.emit("room:score", toScorePayload(room.scoreboard));
  }

  function markMatchStarted(room: ServerRoom, game: GameState): void {
    room.matchStartedAt = now();
    log(matchStartEntry({ roomId: room.id, match: game.matchNumber, players: game.players.length, nowMs: room.matchStartedAt }));
  }

  // Fim de partida (uma vez só por matchNumber): soma ao placar, loga e avisa a sala.
  function noteMatchEnd(room: ServerRoom): void {
    const g = room.game;
    if (!g || g.phase !== "fim_de_jogo" || room.scoredMatch === g.matchNumber) return;
    room.scoredMatch = g.matchNumber;
    const t = now();
    room.scoreboard = recordMatch(room.scoreboard, {
      winnerId: g.winnerId,
      players: g.players.map((p) => ({ id: p.id, name: p.name })),
      stats: g.stats,
    });
    log(
      matchEndEntry({
        roomId: room.id,
        match: g.matchNumber,
        players: g.players.length,
        winnerId: g.winnerId,
        winnerName: g.players.find((p) => p.id === g.winnerId)?.name ?? null,
        startedAtMs: room.matchStartedAt,
        nowMs: t,
      }),
    );
    sendScore(room, io.to(room.id));
  }


  // ── Estado de jogo → clientes ─────────────────────────────────────────────
  // Tempo que falta da fase atual, segundo o relógio do servidor (vai na view).
  function timerRemainingMs(room: ServerRoom): number | undefined {
    return room.timerEndsAt === null ? undefined : Math.max(0, room.timerEndsAt - Date.now());
  }

  // Envia a cada jogador SÓ a sua view (servidor filtra as cartas alheias). Espectadores
  // recebem a view pública (sem nenhuma carta oculta), igual para todos eles.
  function broadcastState(room: ServerRoom): void {
    if (!room.game) return;
    const remaining = timerRemainingMs(room);
    for (const p of room.game.players) {
      io.to(playerChannel(p.id)).emit("game_state", viewForPlayer(room.game, p.id, remaining));
    }
    for (const sp of room.spectators) sendSpectatorState(room, sp.id, remaining);
  }

  function sendSpectatorState(room: ServerRoom, spectatorId: string, remaining = timerRemainingMs(room)): void {
    if (!room.game) return;
    io.to(playerChannel(spectatorId)).emit(
      "game_state",
      viewForPlayer(room.game, SPECTATOR_VIEWER_ID, remaining),
    );
  }

  // Lista de jogadores e de espectadores, para todos na sala.
  function broadcastPlayers(room: ServerRoom): void {
    io.to(room.id).emit("room:players", room.players);
    io.to(room.id).emit("room:spectators", room.spectators);
  }

  // Abriu vaga no lobby: espectadores online sobem, por ordem de chegada.
  function seatFreed(room: ServerRoom): void {
    if (room.game) return;
    promoteSpectators(room);
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
    room.timerEndsAt = Date.now() + seconds * 1000 * scale;
    room.timer = setTimeout(() => {
      room.timer = null;
      if (!room.game) return;
      const result = applyEvent(room.game, { type: "timeout" });
      if (result.error) return; // fase já mudou: ignora
      commit(room, result.state);
    }, seconds * 1000 * scale);
  }

  // Persiste o novo estado, atualiza o relógio e propaga a view a cada jogador.
  // Rearmar ANTES de transmitir: a view precisa do tempo restante da fase nova.
  // Aplica os "passar automático" até não sobrar nenhum (fechar uma janela pode abrir outra).
  function settle(room: ServerRoom, state: GameState): GameState {
    let s = state;
    for (let i = 0; i < 40; i++) {
      const [id] = autoPassTargets(s, room.autoPass);
      if (!id) break;
      const r = applyEvent(s, { type: "pass", playerId: id });
      if (r.error) break;
      s = r.state;
    }
    return s;
  }

  function commit(room: ServerRoom, state: GameState): void {
    room.game = settle(room, state);
    noteMatchEnd(room);
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
    room.cleanupTimer = setTimeout(() => deleteRoom(room.id), ABANDON_MS * scale);
  }

  // Lobby: quem caiu perde o assento se não voltar dentro da graça.
  function scheduleGrace(room: ServerRoom, playerId: string): void {
    const t = setTimeout(() => {
      room.graceTimers.delete(playerId);
      const p = room.players.find((x) => x.id === playerId);
      if (room.game || !p || p.connected) return;
      const updated = removePlayer(room.id, playerId);
      if (updated) {
        seatFreed(updated);
        broadcastPlayers(updated);
      }
    }, LOBBY_GRACE_MS * scale);
    room.graceTimers.set(playerId, t);
  }

  // Espectador que sai ou cai: não mexe em relógio, host nem descarte da sala.
  function applySpectatorAbsence(room: ServerRoom, id: string, voluntary: boolean): void {
    if (voluntary) {
      removeSpectator(room.id, id);
      broadcastPlayers(room);
      return;
    }
    markDisconnected(room.id, id);
    broadcastPlayers(room);
    const t = setTimeout(() => {
      room.graceTimers.delete(id);
      const sp = room.spectators.find((x) => x.id === id);
      if (!sp || sp.connected) return;
      removeSpectator(room.id, id);
      broadcastPlayers(room);
    }, SPECTATOR_GRACE_MS * scale);
    room.graceTimers.set(id, t);
  }

  function applyAbsence(room: ServerRoom, playerId: string, voluntary: boolean): void {
    if (isSpectator(room, playerId)) return applySpectatorAbsence(room, playerId, voluntary);
    if (!room.game && voluntary) {
      // Saiu de propósito do lobby: libera o assento na hora (e quem espera sobe).
      const updated = removePlayer(room.id, playerId);
      if (updated) {
        seatFreed(updated);
        broadcastPlayers(updated);
      }
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
      if (isSpectator(room, playerId)) return cb({ ok: false, error: NO_SPECTATOR_PLAY });
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
      const { room, player, role } = result;

      // Voltou: cancela remoção pendente. O descarte da sala abandonada só é cancelado por
      // um JOGADOR: espectador não mantém a sala viva.
      const grace = room.graceTimers.get(player.id);
      if (grace) clearTimeout(grace);
      room.graceTimers.delete(player.id);
      if (role === "player" && room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
        room.cleanupTimer = null;
      }

      socket.data.roomId = room.id;
      socket.data.playerId = player.id;
      void socket.join(room.id);
      void socket.join(playerChannel(player.id));

      cb({
        ok: true,
        role,
        players: room.players,
        spectators: room.spectators,
        you: { id: player.id, token: result.token },
      });
      // Avisa todos na sala (inclusive quem entrou) a lista atualizada.
      broadcastPlayers(room);
      sendScore(room, socket); // quem entra/reconecta já recebe o placar da noite
      if (room.game) {
        // Jogador que voltou: reanima o relógio e manda o estado. Espectador: só a view pública.
        if (role === "player") presenceChanged(room, player.id);
        else sendSpectatorState(room, player.id);
      }
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
      promoteSpectators(room); // sala que estava cheia e abriu vaga: quem espera entra
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
      markMatchStarted(room, game);
      commit(room, game);
    });

    // Revanche: nova partida com os mesmos jogadores (só quem está online) e os
    // mesmos timers; o vencedor abre. Qualquer jogador da partida pode pedir.
    socket.on("game_rematch", (cb) => {
      const { roomId, playerId } = socket.data;
      const room = roomId ? getRoom(roomId) : undefined;
      const prev = room?.game;
      if (!room || !prev || !playerId) return cb({ ok: false, error: "Partida não encontrada." });
      if (prev.phase !== "fim_de_jogo") return cb({ ok: false, error: "A partida ainda não terminou." });
      if (!prev.players.some((p) => p.id === playerId)) {
        return cb({ ok: false, error: "Só quem jogou pode pedir revanche." });
      }
      for (const p of room.players.filter((x) => !x.connected)) removePlayer(room.id, p.id);
      // Espectadores online viram jogadores da nova partida (ordem de chegada, até 6).
      promoteSpectators(room);
      if (room.players.length < 2) return cb({ ok: false, error: "Mínimo de 2 jogadores." });
      let game: GameState;
      try {
        game = createGame(
          room.players.map((p) => ({ id: p.id, name: p.name })),
          prev.config,
          undefined,
          { firstPlayerId: prev.winnerId ?? undefined, matchNumber: prev.matchNumber + 1 },
        );
      } catch (e) {
        return cb({ ok: false, error: e instanceof Error ? e.message : "Erro ao iniciar a revanche." });
      }
      cb({ ok: true });
      broadcastPlayers(room);
      log(rematchEntry({ roomId: room.id, match: game.matchNumber, players: game.players.length, nowMs: now() }));
      markMatchStarted(room, game);
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
    socket.on("game_autopass", (payload, cb) => {
      const { roomId, playerId } = socket.data;
      const room = roomId ? getRoom(roomId) : undefined;
      if (!room || !playerId) return cb({ ok: false, error: "Sala não encontrada." });
      if (isSpectator(room, playerId)) return cb({ ok: false, error: NO_SPECTATOR_PLAY });
      if (typeof payload?.enabled !== "boolean") return cb({ ok: false, error: "Valor inválido." });
      if (payload.enabled) room.autoPass.add(playerId);
      else room.autoPass.delete(playerId);
      cb({ ok: true });
      // Ligou no meio de uma janela aberta? Já vale agora.
      if (room.game) commit(room, room.game);
    });

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
}
