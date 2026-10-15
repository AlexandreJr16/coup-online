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
  MAX_PLAYERS,
  removePlayer,
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

test("com partida em andamento, só volta quem já jogava", () => {
  const room = uid();
  const a = join(room, "Ana");
  join(room, "Bia");
  getRoom(room)!.game = {} as GameState; // basta ser não-nulo
  const stranger = joinRoom(room, "Caio");
  assert.equal(stranger.ok, false);
  markDisconnected(room, a.player.id);
  const back = join(room, "Ana", a.token);
  assert.equal(back.reconnected, true);
  deleteRoom(room);
});

test("sala cheia (6) recusa o sétimo", () => {
  const room = uid();
  for (let i = 0; i < MAX_PLAYERS; i++) join(room, `J${i}`);
  const extra = joinRoom(room, "Sobrando");
  assert.equal(extra.ok, false);
  deleteRoom(room);
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
