// Testes de F5 (revanche / config) e F6 (contestação pública).
// Rodar: npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { applyEvent, createGame, viewForPlayer } from "./engine";
import { CONFIG_SPEC } from "./config";
import type { Rng } from "./deck";
import type { Character, GameEvent, GameState } from "../../types/game";

function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const RNG = seeded(99);
const P = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));

function setHand(s: GameState, id: string, chars: [Character, Character]): void {
  s.players.find((x) => x.id === id)!.cards = [
    { character: chars[0], revealed: false },
    { character: chars[1], revealed: false },
  ];
}
function run(s: GameState, ...events: GameEvent[]): GameState {
  let st = s;
  for (const e of events) {
    const r = applyEvent(st, e, RNG);
    assert.equal(r.error, null, `evento inválido: ${JSON.stringify(e)} → ${r.error}`);
    st = r.state;
  }
  return st;
}

// ── F5: revanche ─────────────────────────────────────────────────────────────
test("createGame: 'vencedor começa' define quem abre a nova partida", () => {
  const s = createGame(P(4), {}, RNG, { firstPlayerId: "p3" });
  assert.equal(s.order[s.currentPlayerIndex], "p3");
  assert.equal(viewForPlayer(s, "p1").currentPlayerId, "p3");
  assert.deepEqual(s.order, ["p1", "p2", "p3", "p4"]); // mesa não muda de lugar
});

test("createGame: primeiro jogador inexistente cai no primeiro da lista", () => {
  const s = createGame(P(3), {}, RNG, { firstPlayerId: "ghost" });
  assert.equal(s.order[s.currentPlayerIndex], "p1");
});

test("matchNumber: 1 por padrão, configurável e exposto na view", () => {
  assert.equal(createGame(P(2), {}, RNG).matchNumber, 1);
  const s = createGame(P(2), {}, RNG, { matchNumber: 3 });
  assert.equal(s.matchNumber, 3);
  assert.equal(viewForPlayer(s, "p1").matchNumber, 3);
});

test("a nova partida recomeça do zero (2 moedas, 2 cartas ocultas, baralho cheio)", () => {
  const s = createGame(P(3), {}, RNG, { firstPlayerId: "p2" });
  assert.ok(s.players.every((p) => p.coins === 2 && p.cards.every((c) => !c.revealed)));
  assert.equal(s.deck.length, 25 - 6);
  assert.equal(s.winnerId, null);
  assert.equal(s.phase, "aguardando_acao");
});

// ── F5: config com fonte única ───────────────────────────────────────────────
test("CONFIG_SPEC descreve todos os timers e a engine respeita padrão e limites", () => {
  const keys = Object.keys(CONFIG_SPEC);
  assert.deepEqual(keys.sort(), [
    "challengeBlockTime",
    "choiceTime",
    "globalReactionTime",
    "targetReactionTime",
    "turnTime",
  ]);
  const def = createGame(P(2), {}, RNG).config;
  const low = createGame(P(2), Object.fromEntries(keys.map((k) => [k, -5])), RNG).config;
  const high = createGame(P(2), Object.fromEntries(keys.map((k) => [k, 99999])), RNG).config;
  for (const k of keys as Array<keyof typeof CONFIG_SPEC>) {
    assert.equal(def[k], CONFIG_SPEC[k].def, `padrão de ${k}`);
    assert.equal(low[k], CONFIG_SPEC[k].min, `mínimo de ${k}`);
    assert.equal(high[k], CONFIG_SPEC[k].max, `máximo de ${k}`);
  }
});

test("config ignora valores não numéricos (NaN/string) e usa o padrão", () => {
  const s = createGame(P(2), { turnTime: Number.NaN, choiceTime: "abc" as unknown as number }, RNG);
  assert.equal(s.config.turnTime, CONFIG_SPEC.turnTime.def);
  assert.equal(s.config.choiceTime, CONFIG_SPEC.choiceTime.def);
});

// ── F6: contestação pública ──────────────────────────────────────────────────
test("lastChallenge: contestado TEM a carta → accusedHadCard = true", () => {
  let s = createGame(P(3), {}, RNG);
  assert.equal(s.lastChallenge, null);
  setHand(s, "p1", ["duque", "condessa"]);
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  s = run(s, { type: "challenge", playerId: "p2" });
  assert.deepEqual(
    { ...s.lastChallenge!, n: 0 },
    { n: 0, challengerId: "p2", accusedId: "p1", claimed: "duque", accusedHadCard: true, kind: "action" },
  );
  assert.equal(s.lastChallenge!.n, 1);
});

test("lastChallenge: blefe desmascarado → accusedHadCard = false", () => {
  let s = createGame(P(3), {}, RNG);
  setHand(s, "p1", ["condessa", "condessa"]);
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  s = run(s, { type: "challenge", playerId: "p3" });
  assert.equal(s.lastChallenge!.accusedHadCard, false);
  assert.equal(s.lastChallenge!.challengerId, "p3");
});

test("lastChallenge: contestação de BLOQUEIO registra o bloqueador como acusado", () => {
  let s = createGame(P(3), {}, RNG);
  setHand(s, "p2", ["capitao", "capitao"]); // blefa Duque
  s = run(s, { type: "action", playerId: "p1", action: "ajuda_externa" });
  s = run(s, { type: "block", playerId: "p2", character: "duque" });
  s = run(s, { type: "challenge", playerId: "p1" });
  assert.equal(s.lastChallenge!.kind, "block");
  assert.equal(s.lastChallenge!.accusedId, "p2");
  assert.equal(s.lastChallenge!.claimed, "duque");
  assert.equal(s.lastChallenge!.accusedHadCard, false);
});

test("lastChallenge.n sobe a cada contestação e a view o expõe (público)", () => {
  let s = createGame(P(3), {}, RNG);
  setHand(s, "p1", ["duque", "duque"]);
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  s = run(s, { type: "challenge", playerId: "p2" });
  const n1 = s.lastChallenge!.n;
  // p2 perdeu a contestação: escolhe a carta a revelar, o turno passa
  if (s.phase === "aguardando_revelacao") s = run(s, { type: "reveal", playerId: "p2", cardIndex: 0 });
  s = run(s, { type: "action", playerId: "p2", action: "renda" });
  s = run(s, { type: "action", playerId: "p3", action: "renda" });
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  s = run(s, { type: "challenge", playerId: "p3" });
  assert.equal(s.lastChallenge!.n, n1 + 1);
  assert.equal(viewForPlayer(s, "p2").lastChallenge!.n, n1 + 1);
});

test("timeout/passar NÃO contam como contestação", () => {
  let s = createGame(P(3), {}, RNG);
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  s = run(s, { type: "pass", playerId: "p2" }, { type: "pass", playerId: "p3" });
  assert.equal(s.lastChallenge, null);
});
