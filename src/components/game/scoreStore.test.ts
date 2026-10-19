// Testes do scoreStore: guarda o último room:score, avisa quem ouve e ignora lixo.
// O socket é trocado por um emissor falso; o hook real (useScore.ts) só liga o socket a isto.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import type { ScorePayload } from "../../types/socket";
import { assinarPlacar, limparPlacar, ligarPlacar, placarAtual, publicarPlacar } from "./scoreStore";

const payload = (matches: number): ScorePayload => ({
  matches,
  lastWinnerId: "p1",
  rows: [{ id: "p1", name: "Ana", wins: matches, played: matches }],
  titles: [],
});

beforeEach(() => limparPlacar());

test("começa sem placar (null) e guarda o último recebido", () => {
  assert.equal(placarAtual(), null);
  publicarPlacar(payload(1));
  publicarPlacar(payload(2));
  assert.equal(placarAtual()?.matches, 2);
});

test("avisa quem assina a cada placar novo e para depois de cancelar", () => {
  let avisos = 0;
  const cancelar = assinarPlacar(() => avisos++);
  publicarPlacar(payload(1));
  publicarPlacar(payload(2));
  assert.equal(avisos, 2);
  cancelar();
  publicarPlacar(payload(3));
  assert.equal(avisos, 2);
});

test("payload inválido é descartado e o placar anterior fica", () => {
  publicarPlacar(payload(1));
  publicarPlacar(null);
  publicarPlacar({ matches: "x" });
  publicarPlacar(undefined);
  assert.equal(placarAtual()?.matches, 1);
});

test("limparPlacar esquece o placar e avisa (só se havia algo)", () => {
  let avisos = 0;
  assinarPlacar(() => avisos++);
  limparPlacar();
  assert.equal(avisos, 0);
  publicarPlacar(payload(1));
  limparPlacar();
  assert.equal(placarAtual(), null);
  assert.equal(avisos, 2);
});

test("ligarPlacar: o evento room:score do socket vira placar; desligar para de ouvir", () => {
  const sock = new EventEmitter();
  const desligar = ligarPlacar({
    on: (ev, f) => sock.on(ev, f),
    off: (ev, f) => sock.off(ev, f),
  });
  assert.equal(sock.listenerCount("room:score"), 1);
  sock.emit("room:score", payload(3));
  assert.equal(placarAtual()?.matches, 3);
  desligar();
  assert.equal(sock.listenerCount("room:score"), 0);
  sock.emit("room:score", payload(9));
  assert.equal(placarAtual()?.matches, 3);
});
