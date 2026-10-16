// Testes (TDD, passo 4.8) das estatísticas de partida e dos prêmios.
// Rodar: npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { applyEvent, createGame, viewForPlayer } from "./engine";
import { computeAwards } from "./awards";
import type { Rng } from "./deck";
import type { Character, GameEvent, GameState, PlayerStats } from "../../types/game";

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
const RNG = seeded(11);
const newGame = (n = 3): GameState =>
  createGame(Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` })), {}, RNG);
const setHand = (s: GameState, id: string, c: [Character, Character]) => {
  s.players.find((x) => x.id === id)!.cards = [
    { character: c[0], revealed: false },
    { character: c[1], revealed: false },
  ];
};
const setCoins = (s: GameState, id: string, n: number) => (s.players.find((x) => x.id === id)!.coins = n);
function run(s: GameState, ...events: GameEvent[]): GameState {
  let st = s;
  for (const e of events) {
    const r = applyEvent(st, e, RNG);
    assert.equal(r.error, null, `${JSON.stringify(e)} → ${r.error}`);
    st = r.state;
  }
  return st;
}
const zero: PlayerStats = { challengesMade: 0, challengesRight: 0, bluffsCaught: 0, blocks: 0, kills: 0, maxCoins: 2, influenceLost: 0 };

// ── Estatísticas ─────────────────────────────────────────────────────────────
test("stats: começam zeradas para todos (maxCoins = moedas iniciais)", () => {
  const s = newGame(3);
  for (const id of ["p1", "p2", "p3"]) assert.deepEqual(s.stats[id], zero);
});

test("stats: contestar com razão conta acerto e pega o blefe do acusado", () => {
  let s = newGame(3);
  setHand(s, "p1", ["condessa", "condessa"]); // blefa Duque
  s = run(s, { type: "action", playerId: "p1", action: "taxas" }, { type: "challenge", playerId: "p2" });
  assert.equal(s.stats.p2.challengesMade, 1);
  assert.equal(s.stats.p2.challengesRight, 1);
  assert.equal(s.stats.p1.bluffsCaught, 1);
  assert.equal(s.phase, "aguardando_revelacao"); // p1 tem 2 cartas: escolhe qual perde
  assert.equal(s.stats.p1.influenceLost, 0);
  s = run(s, { type: "reveal", playerId: "p1", cardIndex: 0 });
  assert.equal(s.stats.p1.influenceLost, 1);
});

test("stats: contestar errado conta tentativa sem acerto; o acusado não é pego", () => {
  let s = newGame(3);
  setHand(s, "p1", ["duque", "condessa"]);
  s = run(s, { type: "action", playerId: "p1", action: "taxas" }, { type: "challenge", playerId: "p3" });
  assert.equal(s.stats.p3.challengesMade, 1);
  assert.equal(s.stats.p3.challengesRight, 0);
  assert.equal(s.stats.p1.bluffsCaught, 0);
});

test("stats: bloqueio conta para o bloqueador", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "ajuda_externa" }, { type: "block", playerId: "p2", character: "duque" });
  assert.equal(s.stats.p2.blocks, 1);
});

test("stats: golpe e assassinato bem-sucedido contam como 'kills' do autor", () => {
  let s = newGame(3);
  setCoins(s, "p1", 7);
  s = run(s, { type: "action", playerId: "p1", action: "golpe", targetId: "p2" });
  assert.equal(s.stats.p1.kills, 1);
  assert.equal(s.stats.p2.influenceLost, 0); // ainda vai escolher a carta (pausa de revelação)
  s = run(s, { type: "reveal", playerId: "p2", cardIndex: 0 });
  assert.equal(s.stats.p2.influenceLost, 1);

  // assassinato que prossegue (todos passam)
  setCoins(s, "p2", 3);
  s = run(s, { type: "action", playerId: "p2", action: "assassinar", targetId: "p3" }, { type: "pass", playerId: "p1" }, { type: "pass", playerId: "p3" });
  assert.equal(s.stats.p2.kills, 1);
});

test("stats: assassinato BLOQUEADO não conta como kill", () => {
  let s = newGame(3);
  setCoins(s, "p1", 3);
  s = run(s, { type: "action", playerId: "p1", action: "assassinar", targetId: "p2" }, { type: "block", playerId: "p2", character: "condessa" }, { type: "pass", playerId: "p1" }, { type: "pass", playerId: "p3" });
  assert.equal(s.stats.p1.kills, 0);
});

test("stats: maxCoins guarda o recorde de moedas ao longo da partida", () => {
  let s = newGame(2);
  setCoins(s, "p1", 6);
  s = run(s, { type: "action", playerId: "p1", action: "renda" }); // 7
  setCoins(s, "p2", 3);
  s = run(s, { type: "action", playerId: "p2", action: "renda" });
  setCoins(s, "p1", 1); // gastou
  s = run(s, { type: "action", playerId: "p1", action: "renda" });
  assert.equal(s.stats.p1.maxCoins, 7);
});

test("stats são públicas: aparecem na view de qualquer jogador", () => {
  const s = newGame(3);
  assert.deepEqual(viewForPlayer(s, "p2").stats.p1, zero);
});

// ── Prêmios (função pura) ────────────────────────────────────────────────────
const st = (over: Partial<PlayerStats>): PlayerStats => ({ ...zero, ...over });
const names = { p1: "Ana", p2: "Bia", p3: "Caio" };

test("prêmios: Mentiroso, Desconfiado, Carrasco e Ricaço vão para quem mais fez", () => {
  const awards = computeAwards(
    { p1: st({ bluffsCaught: 2, maxCoins: 9 }), p2: st({ challengesMade: 3, challengesRight: 1, kills: 1 }), p3: st({ challengesMade: 1, kills: 2 }) },
    names,
  );
  const by = Object.fromEntries(awards.map((a) => [a.id, a.names]));
  assert.deepEqual(by.mentiroso, ["Ana"]);
  assert.deepEqual(by.desconfiado, ["Bia"]);
  assert.deepEqual(by.carrasco, ["Caio"]);
  assert.deepEqual(by.ricaco, ["Ana"]);
});

test("prêmios: sem ocorrência não há prêmio; ricaço exige 8+ moedas", () => {
  assert.deepEqual(computeAwards({ p1: st({}), p2: st({}) }, names), []);
  assert.equal(computeAwards({ p1: st({ maxCoins: 7 }) }, names).some((a) => a.id === "ricaco"), false);
  assert.equal(computeAwards({ p1: st({ maxCoins: 8 }) }, names).some((a) => a.id === "ricaco"), true);
});

test("prêmios: empate divide o prêmio entre todos os empatados", () => {
  const a = computeAwards({ p1: st({ bluffsCaught: 2 }), p2: st({ bluffsCaught: 2 }), p3: st({ bluffsCaught: 1 }) }, names);
  assert.deepEqual(a.find((x) => x.id === "mentiroso")!.names.sort(), ["Ana", "Bia"]);
});

test("prêmios: Olho de lince exige 2+ contestações e mede a taxa de acerto", () => {
  const a = computeAwards(
    { p1: st({ challengesMade: 1, challengesRight: 1 }), p2: st({ challengesMade: 4, challengesRight: 3 }), p3: st({ challengesMade: 2, challengesRight: 1 }) },
    names,
  );
  assert.deepEqual(a.find((x) => x.id === "olho_de_lince")!.names, ["Bia"]); // 75% (p1 tem só 1 tentativa)
});

test("prêmios: ignora jogadores sem nome conhecido (saíram da sala)", () => {
  const a = computeAwards({ p1: st({ bluffsCaught: 3 }), fantasma: st({ bluffsCaught: 9 }) }, names);
  assert.deepEqual(a.find((x) => x.id === "mentiroso")!.names, ["Ana"]);
});
