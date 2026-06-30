// Testes da engine do Coup (node:test, sem dependências novas).
// Rodar: npm test
//
// Estratégia: monto o jogo com createGame e depois SOBRESCREVO mãos/moedas para
// montar cenários determinísticos — o GameState é um objeto simples e o teste é
// dono dele. O RNG só importa em troca/replace de carta; uso uma seed fixa.

import { test } from "node:test";
import assert from "node:assert/strict";

import { applyEvent, createGame, currentTimer, viewForPlayer } from "./engine";
import type { Rng } from "./deck";
import type { Character, GameEvent, GameState } from "../../types/game";

// RNG determinístico (mulberry32).
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
const RNG = seeded(42);

function newGame(n = 3): GameState {
  const players = Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `P${i + 1}`,
  }));
  return createGame(players, {}, RNG);
}

function setHand(
  s: GameState,
  id: string,
  chars: [Character, Character],
  revealed: [boolean, boolean] = [false, false],
): void {
  const p = s.players.find((x) => x.id === id)!;
  p.cards = [
    { character: chars[0], revealed: revealed[0] },
    { character: chars[1], revealed: revealed[1] },
  ];
}

function setCoins(s: GameState, id: string, coins: number): void {
  s.players.find((x) => x.id === id)!.coins = coins;
}

function coins(s: GameState, id: string): number {
  return s.players.find((x) => x.id === id)!.coins;
}

function influence(s: GameState, id: string): number {
  return s.players.find((x) => x.id === id)!.cards.filter((c) => !c.revealed).length;
}

// Aplica eventos em sequência, exigindo que todos sejam válidos.
function run(s: GameState, ...events: GameEvent[]): GameState {
  let st = s;
  for (const e of events) {
    const r = applyEvent(st, e, RNG);
    assert.equal(r.error, null, `evento inesperadamente inválido: ${JSON.stringify(e)} → ${r.error}`);
    st = r.state;
  }
  return st;
}

// ── Setup ────────────────────────────────────────────────────────────────────
test("createGame distribui 2 cartas e 2 moedas; baralho = 25 - 2n", () => {
  const s = newGame(3);
  assert.equal(s.phase, "aguardando_acao");
  assert.equal(s.players.length, 3);
  for (const p of s.players) {
    assert.equal(p.coins, 2);
    assert.equal(p.cards.length, 2);
    assert.ok(p.cards.every((c) => !c.revealed));
  }
  assert.equal(s.deck.length, 25 - 6);
  assert.equal(s.treasury, 50 - 6);
});

test("createGame rejeita < 2 e > 6 jogadores", () => {
  assert.throws(() => createGame([{ id: "a", name: "A" }], {}, RNG));
  assert.throws(() =>
    createGame(
      Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `${i}` })),
      {},
      RNG,
    ),
  );
});

// ── Ações imediatas ───────────────────────────────────────────────────────────
test("Renda: +1 moeda e passa o turno", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "renda" });
  assert.equal(coins(s, "p1"), 3);
  assert.equal(s.order[s.currentPlayerIndex], "p2");
});

test("Golpe: paga 7, alvo com 2 cartas vira aguardando_revelacao", () => {
  let s = newGame(2);
  setCoins(s, "p1", 7);
  s = run(s, { type: "action", playerId: "p1", action: "golpe", targetId: "p2" });
  assert.equal(coins(s, "p1"), 0);
  assert.equal(s.phase, "aguardando_revelacao");
  assert.equal(s.mustRevealPlayerId, "p2");
  // p2 revela → fim de jogo (só p1 com influência)
  s = run(s, { type: "reveal", playerId: "p2", cardIndex: 0 });
  assert.equal(influence(s, "p2"), 1);
  assert.equal(s.phase, "aguardando_acao"); // 2 jogadores, ambos vivos
  assert.equal(s.order[s.currentPlayerIndex], "p2");
});

test("Obrigatoriedade de Golpe com 10+ moedas", () => {
  let s = newGame(3);
  setCoins(s, "p1", 10);
  const bad = applyEvent(s, { type: "action", playerId: "p1", action: "renda" }, RNG);
  assert.match(bad.error ?? "", /Golpe/);
  // golpe é aceito
  s = run(s, { type: "action", playerId: "p1", action: "golpe", targetId: "p2" });
  assert.equal(coins(s, "p1"), 3);
});

test("não é o seu turno → erro", () => {
  const s = newGame(3);
  const r = applyEvent(s, { type: "action", playerId: "p2", action: "renda" }, RNG);
  assert.match(r.error ?? "", /turno/);
});

// ── Ações globais ─────────────────────────────────────────────────────────────
test("Ajuda Externa: timeout → +2", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "ajuda_externa" });
  assert.equal(s.phase, "janela_reacao_global");
  assert.equal(currentTimer(s)?.seconds, 5);
  s = run(s, { type: "timeout" });
  assert.equal(coins(s, "p1"), 4);
});

test("Ajuda Externa bloqueada por Duque (timeout no bloqueio) → sem +2", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "ajuda_externa" });
  s = run(s, { type: "block", playerId: "p2", character: "duque" });
  assert.equal(s.phase, "janela_contestar_bloqueio");
  s = run(s, { type: "timeout" }); // ninguém contesta o bloqueio
  assert.equal(coins(s, "p1"), 2); // não ganhou nada
  assert.equal(s.order[s.currentPlayerIndex], "p2");
});

test("Ajuda Externa não pode ser contestada (ação geral)", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "ajuda_externa" });
  const r = applyEvent(s, { type: "challenge", playerId: "p2" }, RNG);
  assert.match(r.error ?? "", /não pode ser contestada/);
});

test("Taxas contestada e ator TEM Duque: contestante perde 1, ator +3", () => {
  let s = newGame(3);
  setHand(s, "p1", ["duque", "assassino"]);
  setHand(s, "p2", ["capitao", "condessa"]);
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  s = run(s, { type: "challenge", playerId: "p2" });
  // p2 tinha 2 cartas → precisa revelar
  assert.equal(s.phase, "aguardando_revelacao");
  assert.equal(s.mustRevealPlayerId, "p2");
  s = run(s, { type: "reveal", playerId: "p2", cardIndex: 0 });
  assert.equal(influence(s, "p2"), 1); // perdeu a contestação
  assert.equal(coins(s, "p1"), 5); // ação prosseguiu: +3
  assert.equal(influence(s, "p1"), 2); // ator manteve influência (trocou carta)
});

test("Taxas contestada e ator NÃO tem Duque (blefe): ator perde 1, sem +3", () => {
  let s = newGame(3);
  setHand(s, "p1", ["capitao", "assassino"]);
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  s = run(s, { type: "challenge", playerId: "p2" });
  assert.equal(s.mustRevealPlayerId, "p1"); // ator perde
  s = run(s, { type: "reveal", playerId: "p1", cardIndex: 0 });
  assert.equal(influence(s, "p1"), 1);
  assert.equal(coins(s, "p1"), 2); // não ganhou nada
});

// ── Ações targeted ────────────────────────────────────────────────────────────
test("Extorquir: timeout → rouba 2 (ou 1 se vítima só tem 1)", () => {
  let s = newGame(3);
  setCoins(s, "p2", 1);
  s = run(s, { type: "action", playerId: "p1", action: "extorquir", targetId: "p2" });
  assert.equal(s.phase, "janela_reacao_vitima");
  assert.equal(currentTimer(s)?.seconds, 15);
  s = run(s, { type: "timeout" });
  assert.equal(coins(s, "p2"), 0); // tinha 1 → leva 1
  assert.equal(coins(s, "p1"), 3); // 2 + 1
});

test("Extorquir bloqueado por Embaixador (vítima)", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "extorquir", targetId: "p2" });
  s = run(s, { type: "block", playerId: "p2", character: "embaixador" });
  s = run(s, { type: "timeout" }); // bloqueio não contestado
  assert.equal(coins(s, "p2"), 2); // nada roubado
});

test("Extorquir: terceiro não pode bloquear (só a vítima)", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "extorquir", targetId: "p2" });
  const r = applyEvent(s, { type: "block", playerId: "p3", character: "capitao" }, RNG);
  assert.match(r.error ?? "", /inválido/);
});

// ── Assassino: caso especial das moedas + perigo duplo ────────────────────────
test("Assassinar paga 3 na hora; bloqueio bem-sucedido NÃO devolve as moedas", () => {
  let s = newGame(3);
  setCoins(s, "p1", 3);
  s = run(s, { type: "action", playerId: "p1", action: "assassinar", targetId: "p2" });
  assert.equal(coins(s, "p1"), 0); // pagou na declaração
  s = run(s, { type: "block", playerId: "p2", character: "condessa" });
  s = run(s, { type: "timeout" }); // bloqueio não contestado → sucesso
  assert.equal(coins(s, "p1"), 0); // moedas NÃO devolvidas
  assert.equal(influence(s, "p2"), 2); // não morreu
});

test("Assassinar contestado e ator NÃO tem Assassino: 3 moedas devolvidas", () => {
  let s = newGame(3);
  setHand(s, "p1", ["duque", "capitao"]);
  setCoins(s, "p1", 3);
  s = run(s, { type: "action", playerId: "p1", action: "assassinar", targetId: "p2" });
  s = run(s, { type: "challenge", playerId: "p3" });
  assert.equal(s.mustRevealPlayerId, "p1");
  s = run(s, { type: "reveal", playerId: "p1", cardIndex: 0 });
  assert.equal(coins(s, "p1"), 3); // devolvidas (ação falhou por blefe)
  assert.equal(influence(s, "p2"), 2); // vítima intacta
});

test("Perigo duplo (1): vítima contesta o Assassino e perde → -2 → eliminada", () => {
  let s = newGame(3);
  setHand(s, "p1", ["assassino", "duque"]); // ator TEM Assassino
  setHand(s, "p2", ["capitao", "condessa"]); // vítima, 2 cartas
  setCoins(s, "p1", 3);
  s = run(s, { type: "action", playerId: "p1", action: "assassinar", targetId: "p2" });
  // a própria vítima contesta
  s = run(s, { type: "challenge", playerId: "p2" });
  // perde 1 pela contestação (2 cartas → escolhe)
  assert.equal(s.mustRevealPlayerId, "p2");
  s = run(s, { type: "reveal", playerId: "p2", cardIndex: 0 });
  // assassinato prossegue → perde a última (auto) → eliminada
  assert.equal(influence(s, "p2"), 0);
  assert.equal(s.players.find((p) => p.id === "p2")!.coins, 0); // devolveu moedas
});

test("Perigo duplo (2): vítima blefa Condessa, é contestada → -2 → eliminada", () => {
  let s = newGame(3);
  setHand(s, "p1", ["assassino", "duque"]);
  setHand(s, "p2", ["capitao", "embaixador"]); // sem Condessa
  setCoins(s, "p1", 3);
  s = run(s, { type: "action", playerId: "p1", action: "assassinar", targetId: "p2" });
  s = run(s, { type: "block", playerId: "p2", character: "condessa" }); // blefe
  s = run(s, { type: "challenge", playerId: "p1" }); // ator contesta o bloqueio
  // p2 perde 1 pelo blefe (2 cartas → escolhe)
  assert.equal(s.mustRevealPlayerId, "p2");
  s = run(s, { type: "reveal", playerId: "p2", cardIndex: 0 });
  // assassinato prossegue → perde a última → eliminada
  assert.equal(influence(s, "p2"), 0);
});

test("Condessa verdadeira bloqueia assassinato; contestação do bloqueio falha", () => {
  let s = newGame(3);
  setHand(s, "p2", ["condessa", "capitao"]); // bloqueio legítimo
  setCoins(s, "p1", 3);
  s = run(s, { type: "action", playerId: "p1", action: "assassinar", targetId: "p2" });
  s = run(s, { type: "block", playerId: "p2", character: "condessa" });
  s = run(s, { type: "challenge", playerId: "p1" }); // ator contesta e erra
  assert.equal(s.mustRevealPlayerId, "p1"); // contestante perde
  s = run(s, { type: "reveal", playerId: "p1", cardIndex: 0 });
  assert.equal(influence(s, "p2"), 2); // vítima intacta
  assert.equal(coins(s, "p1"), 0); // moedas do assassino não voltam
});

// ── Trocar (Embaixador) ───────────────────────────────────────────────────────
test("Trocar: pool = face-down + 2; mantém keepCount; baralho preservado", () => {
  let s = newGame(3);
  setHand(s, "p1", ["duque", "assassino"]);
  const deckBefore = s.deck.length;
  s = run(s, { type: "action", playerId: "p1", action: "trocar" });
  s = run(s, { type: "timeout" }); // ninguém contesta
  assert.equal(s.phase, "aguardando_troca");
  assert.equal(s.exchange?.keepCount, 2);
  assert.equal(s.exchange?.pool.length, 4);
  const keep = s.exchange!.pool.slice(0, 2);
  s = run(s, { type: "exchange_choose", playerId: "p1", keep });
  assert.equal(influence(s, "p1"), 2);
  assert.equal(s.deck.length, deckBefore); // saca 2, devolve 2
  assert.equal(s.order[s.currentPlayerIndex], "p2");
});

// ── Vitória ───────────────────────────────────────────────────────────────────
test("fim_de_jogo quando sobra 1 com influência", () => {
  let s = newGame(2);
  setHand(s, "p2", ["capitao", "duque"], [false, true]); // p2 com 1 influência
  setCoins(s, "p1", 7);
  s = run(s, { type: "action", playerId: "p1", action: "golpe", targetId: "p2" });
  // p2 tinha 1 carta face-down → auto-revela → eliminado
  assert.equal(s.phase, "fim_de_jogo");
  assert.equal(s.winnerId, "p1");
});

// ── View: não vaza cartas alheias ─────────────────────────────────────────────
test("viewForPlayer esconde cartas face-down dos outros e o baralho", () => {
  const s = newGame(3);
  const view = viewForPlayer(s, "p1");
  const me = view.players.find((p) => p.id === "p1")!;
  const other = view.players.find((p) => p.id === "p2")!;
  assert.ok(me.cards.every((c) => c.character !== null)); // vejo as minhas
  assert.ok(other.cards.every((c) => c.character === null)); // não vejo as dele
  assert.equal(view.deckCount, 25 - 6);
  assert.ok(!("deck" in view)); // sem o array do baralho
});

test("viewForPlayer: pool de troca só aparece para o ator", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "trocar" });
  s = run(s, { type: "timeout" });
  assert.ok(viewForPlayer(s, "p1").exchange !== null);
  assert.equal(viewForPlayer(s, "p2").exchange, null);
});
