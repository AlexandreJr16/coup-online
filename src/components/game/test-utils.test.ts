import { test } from "node:test";
import assert from "node:assert/strict";
import { viewForPlayer } from "@/src/lib/game/engine";
import type { GameState } from "@/src/types/game";
import { challengePair, makeView, playersN, seededRng, withHand, withPending } from "./test-utils";

const total = (s: GameState) => s.deck.length + s.players.reduce((n, p) => n + p.cards.length, 0);

test("makeView: contrato base (3 jogadores, tesouro 44, p1 na vez)", () => {
  const v = makeView();
  assert.equal(v.players.length, 3);
  assert.equal(v.treasury, 44);
  assert.equal(v.currentPlayerId, "p1");
  assert.equal(v.lastChallenge, null);
});

test("playersN: cria p1..pN com mão oculta", () => {
  const ps = playersN(5);
  assert.deepEqual(ps.map((p) => p.id), ["p1", "p2", "p3", "p4", "p5"]);
  assert.ok(ps.every((p) => p.cards.every((c) => c.character === null && !c.revealed)));
});

test("withHand: troca só a mão do jogador indicado", () => {
  const v = withHand(makeView(), "p2", ["condessa", "capitao"]);
  assert.deepEqual(v.players[1].cards.map((c) => c.character), ["condessa", "capitao"]);
  assert.deepEqual(v.players[0].cards.map((c) => c.character), ["duque", "assassino"]);
});

test("withPending: abre janela de reação global com padrões", () => {
  const v = withPending(makeView(), { actorId: "p1", action: "taxas", claimedCharacter: "duque" });
  assert.equal(v.phase, "janela_reacao_global");
  assert.deepEqual(v.pending?.passedIds, []);
  assert.equal(v.pending?.block, null);
});

test("seededRng: mesma seed, mesma sequência; seeds diferentes divergem", () => {
  const a = seededRng(3), b = seededRng(3), c = seededRng(4);
  const xs = [a(), a(), a()], ys = [b(), b(), b()], zs = [c(), c(), c()];
  assert.deepEqual(xs, ys);
  assert.notDeepEqual(xs, zs);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
});

test("challengePair: só a mão de p1 difere; o veredito e os campos derivados vêm da engine", () => {
  const { pre, truth, bluff } = challengePair();
  assert.equal(truth.lastChallenge?.accusedHadCard, true);
  assert.equal(bluff.lastChallenge?.accusedHadCard, false);
  assert.equal(truth.lastChallenge?.n, bluff.lastChallenge?.n);
  assert.equal(total(pre), 25);
  assert.equal(total(truth), 25);
  assert.equal(total(bluff), 25);
  // blefe: quem perde influência é p1 (tem 2 cartas, escolhe); verdade: é p2.
  assert.equal(bluff.mustRevealPlayerId, "p1");
  assert.equal(truth.mustRevealPlayerId, "p2");
  assert.equal(bluff.phase, "aguardando_revelacao");
  assert.equal(truth.phase, "aguardando_revelacao");
});

test("challengePair: determinístico (mesma seed, mesmo resultado)", () => {
  assert.deepEqual(challengePair({ seed: 11 }), challengePair({ seed: 11 }));
});

test("challengePair: o terceiro observador (p3) não vê as cartas de p1 em nenhum dos casos", () => {
  const { truth, bluff } = challengePair();
  for (const s of [truth, bluff]) {
    const view = viewForPlayer(s, "p3");
    const p1 = view.players.find((p) => p.id === "p1")!;
    assert.ok(p1.cards.every((c) => c.revealed || c.character === null));
  }
});
