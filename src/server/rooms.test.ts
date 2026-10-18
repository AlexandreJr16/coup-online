// Testes do store de salas (identidade estável, reconexão, limites).
// Rodar: npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  anyConnected,
  deleteRoom,
  getRoom,
  joinRoom,
  markDisconnected,
  isSpectator,
  MAX_PLAYERS,
  promoteSpectators,
  removePlayer,
  removeSpectator,
} from "./rooms";
import type { GameState } from "../types/game";

let n = 0;
const uid = () => `T${(n++).toString().padStart(4, "0")}`;

function join(roomId: string, name: string, token?: string) {
  const r = joinRoom(roomId, name, token);
  if (!r.ok) throw new Error(`join falhou: ${r.error}`);
  return r;
}

test("novo jogador recebe id estável e token secreto distintos", () => {
  const room = uid();
  const a = join(room, "Ana");
  const b = join(room, "Bia");
  assert.notEqual(a.player.id, b.player.id);
  assert.notEqual(a.token, b.token);
  assert.equal(a.token.length, 32); // 16 bytes em hex
  assert.equal(a.reconnected, false);
  assert.deepEqual(getRoom(room)!.players.map((p) => p.name), ["Ana", "Bia"]);
  deleteRoom(room);
});

test("token do jogador devolve o MESMO assento (reconexão) e marca conectado", () => {
  const room = uid();
  const a = join(room, "Ana");
  join(room, "Bia");
  markDisconnected(room, a.player.id);
  assert.equal(getRoom(room)!.players[0].connected, false);

  const again = join(room, "qualquer nome", a.token);
  assert.equal(again.reconnected, true);
  assert.equal(again.player.id, a.player.id);
  assert.equal(again.player.name, "Ana"); // o nome do assento não muda
  assert.equal(getRoom(room)!.players.length, 2); // não duplicou
  assert.equal(getRoom(room)!.players[0].connected, true);
  deleteRoom(room);
});

test("token inválido ou de outra sala não dá assento", () => {
  const roomA = uid();
  const roomB = uid();
  const a = join(roomA, "Ana");
  const b = joinRoom(roomB, "Intruso", a.token); // token de outra sala
  assert.equal(b.ok, true);
  assert.equal(b.ok && b.reconnected, false); // entrou como jogador novo
  assert.equal(getRoom(roomB)!.players.length, 1);
  deleteRoom(roomA);
  deleteRoom(roomB);
});

test("sem token, reivindica assento ausente pelo nome (ignora maiúsculas)", () => {
  const room = uid();
  const a = join(room, "Ana");
  join(room, "Bia");
  markDisconnected(room, a.player.id);
  const claim = join(room, "ANA");
  assert.equal(claim.reconnected, true);
  assert.equal(claim.player.id, a.player.id);
  assert.equal(claim.token, a.token); // recebe o token do assento
  deleteRoom(room);
});

test("não reivindica assento de quem está conectado", () => {
  const room = uid();
  join(room, "Ana");
  const dup = join(room, "Ana"); // mesmo nome, mas a Ana original está online
  assert.equal(dup.reconnected, false);
  assert.equal(getRoom(room)!.players.length, 2);
  deleteRoom(room);
});

test("com partida em andamento, quem já jogava volta ao assento e o estranho entra como espectador", () => {
  const room = uid();
  const a = join(room, "Ana");
  join(room, "Bia");
  getRoom(room)!.game = {} as GameState; // basta ser não-nulo
  const stranger = join(room, "Caio");
  assert.equal(stranger.role, "spectator");
  assert.equal(stranger.reconnected, false);
  markDisconnected(room, a.player.id);
  const back = join(room, "Ana", a.token);
  assert.equal(back.reconnected, true);
  assert.equal(back.role, "player");
  // o espectador não virou jogador: a lista de jogadores (host, limite) segue intacta
  assert.deepEqual(getRoom(room)!.players.map((p) => p.name), ["Ana", "Bia"]);
  assert.deepEqual(getRoom(room)!.spectators.map((p) => p.name), ["Caio"]);
  deleteRoom(room);
});

test("sala cheia (6): o sétimo entra como espectador, não é recusado", () => {
  const room = uid();
  for (let i = 0; i < MAX_PLAYERS; i++) join(room, `J${i}`);
  const extra = join(room, "Sobrando");
  assert.equal(extra.role, "spectator");
  assert.equal(getRoom(room)!.players.length, MAX_PLAYERS);
  assert.equal(getRoom(room)!.spectators.length, 1);
  deleteRoom(room);
});

test("jogador novo no lobby com vaga continua sendo jogador (role=player)", () => {
  const room = uid();
  assert.equal(join(room, "Ana").role, "player");
  assert.equal(join(room, "Bia").role, "player");
  assert.equal(getRoom(room)!.spectators.length, 0);
  deleteRoom(room);
});

test("espectador tem id e token próprios e a reconexão por token mantém o papel", () => {
  const room = uid();
  const a = join(room, "Ana");
  getRoom(room)!.game = {} as GameState;
  const s = join(room, "Vigia");
  assert.notEqual(s.player.id, a.player.id);
  assert.notEqual(s.token, a.token);
  assert.equal(s.token.length, 32);
  assert.ok(isSpectator(getRoom(room)!, s.player.id));
  assert.ok(!isSpectator(getRoom(room)!, a.player.id));

  markDisconnected(room, s.player.id);
  assert.equal(getRoom(room)!.spectators[0].connected, false);
  const again = join(room, "outro nome", s.token);
  assert.equal(again.reconnected, true);
  assert.equal(again.role, "spectator");
  assert.equal(again.player.id, s.player.id);
  assert.equal(getRoom(room)!.spectators.length, 1); // não duplicou
  assert.equal(getRoom(room)!.spectators[0].connected, true);
  deleteRoom(room);
});

test("espectador ausente é reivindicado pelo nome (perdeu o token)", () => {
  const room = uid();
  join(room, "Ana");
  getRoom(room)!.game = {} as GameState;
  const s = join(room, "Vigia");
  markDisconnected(room, s.player.id);
  const claim = join(room, "VIGIA");
  assert.equal(claim.reconnected, true);
  assert.equal(claim.role, "spectator");
  assert.equal(claim.token, s.token);
  deleteRoom(room);
});

test("espectador não conta como 'alguém online' (não segura relógio nem sala)", () => {
  const room = uid();
  const a = join(room, "Ana");
  getRoom(room)!.game = {} as GameState;
  join(room, "Vigia");
  const r = getRoom(room)!;
  assert.equal(anyConnected(r), true);
  markDisconnected(room, a.player.id);
  assert.equal(anyConnected(r), false, "só o espectador está online: não vale");
  deleteRoom(room);
});

test("removeSpectator tira o espectador e o token; nunca apaga a sala", () => {
  const room = uid();
  join(room, "Ana");
  getRoom(room)!.game = {} as GameState;
  const s = join(room, "Vigia");
  removeSpectator(room, s.player.id);
  assert.equal(getRoom(room)!.spectators.length, 0);
  assert.ok(getRoom(room), "a sala continua");
  // o token antigo não vale mais: entra como espectador novo
  const again = join(room, "Vigia", s.token);
  assert.equal(again.reconnected, false);
  deleteRoom(room);
});

test("promoteSpectators: por ordem de chegada, até 6 jogadores; quem sobra segue espectador", () => {
  const room = uid();
  for (let i = 0; i < 5; i++) join(room, `J${i}`); // 5 jogadores
  getRoom(room)!.game = {} as GameState;
  const x = join(room, "X");
  const y = join(room, "Y");
  const z = join(room, "Z");
  const r = getRoom(room)!;
  const promoted = promoteSpectators(r);
  assert.deepEqual(promoted.map((p) => p.name), ["X"], "só cabe 1: o primeiro a chegar");
  assert.equal(r.players.length, MAX_PLAYERS);
  assert.deepEqual(r.players.map((p) => p.name).slice(-1), ["X"]);
  assert.deepEqual(r.spectators.map((p) => p.name), ["Y", "Z"]);
  // o token do promovido continua valendo e agora dá assento de jogador
  const back = join(room, "qualquer", x.token);
  assert.equal(back.reconnected, true);
  assert.equal(back.role, "player");
  assert.equal(back.player.id, x.player.id);
  void y;
  void z;
  deleteRoom(room);
});

test("promoteSpectators: descarta desconectados e promove os conectados que couberem", () => {
  const room = uid();
  join(room, "Ana");
  getRoom(room)!.game = {} as GameState;
  const a = join(room, "A");
  const b = join(room, "B");
  const c = join(room, "C");
  markDisconnected(room, b.player.id);
  const r = getRoom(room)!;
  const promoted = promoteSpectators(r);
  assert.deepEqual(promoted.map((p) => p.name), ["A", "C"]);
  assert.deepEqual(r.players.map((p) => p.name), ["Ana", "A", "C"]);
  assert.equal(r.spectators.length, 0, "o desconectado foi descartado");
  // o token do descartado não vale mais
  assert.equal(join(room, "B2", b.token).reconnected, false);
  void a;
  void c;
  deleteRoom(room);
});

test("removePlayer: sem jogadores, espectador ONLINE assume a sala; sem ninguém, a sala some", () => {
  const room = uid();
  const a = join(room, "Ana");
  getRoom(room)!.game = {} as GameState;
  const v = join(room, "Vigia");
  removePlayer(room, a.player.id);
  const r = getRoom(room);
  assert.ok(r, "a sala sobreviveu graças ao espectador");
  assert.deepEqual(r!.players.map((p) => p.name), ["Vigia"]);
  assert.equal(r!.spectators.length, 0);
  removePlayer(room, v.player.id);
  assert.equal(getRoom(room), undefined, "sem ninguém, a sala é apagada");

  // espectador DESCONECTADO não segura a sala
  const room2 = uid();
  const b = join(room2, "Bia");
  getRoom(room2)!.game = {} as GameState;
  const w = join(room2, "Vigia2");
  markDisconnected(room2, w.player.id);
  removePlayer(room2, b.player.id);
  assert.equal(getRoom(room2), undefined);
});

test("removePlayer tira o assento e o token; sala vazia é apagada", () => {
  const room = uid();
  const a = join(room, "Ana");
  const b = join(room, "Bia");
  removePlayer(room, a.player.id);
  assert.deepEqual(getRoom(room)!.players.map((p) => p.name), ["Bia"]);
  // o token da Ana não vale mais: entra como jogadora nova
  const again = join(room, "Ana", a.token);
  assert.equal(again.reconnected, false);
  removePlayer(room, b.player.id);
  removePlayer(room, again.player.id);
  assert.equal(getRoom(room), undefined);
});

test("anyConnected reflete quem está online", () => {
  const room = uid();
  const a = join(room, "Ana");
  const r = getRoom(room)!;
  assert.equal(anyConnected(r), true);
  markDisconnected(room, a.player.id);
  assert.equal(anyConnected(r), false);
  deleteRoom(room);
});

test("placar da noite: sala nasce com placar vazio e o apaga junto com ela (sala nova = do zero)", () => {
  const room = uid();
  join(room, "Ana");
  const r = getRoom(room)!;
  assert.equal(r.scoreboard.matches, 0);
  assert.deepEqual(r.scoreboard.entries, {});
  r.scoreboard = { matches: 3, lastWinnerId: "x", entries: {} };
  deleteRoom(room);
  join(room, "Bia");
  assert.equal(getRoom(room)!.scoreboard.matches, 0);
  deleteRoom(room);
});

test("placar da noite: espectador promovido mantém o id (e portanto o histórico)", () => {
  const room = uid();
  join(room, "Ana");
  const g = getRoom(room)!;
  g.game = {} as GameState; // partida em andamento: o próximo entra como espectador
  const s = join(room, "Caio");
  assert.equal(s.role, "spectator");
  promoteSpectators(g);
  assert.equal(g.players.find((p) => p.name === "Caio")!.id, s.player.id);
  deleteRoom(room);
});
