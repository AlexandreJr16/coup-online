// Testes da trilha de fluidez (ROADMAP F1–F3): "Passar", timeouts de turno/
// revelação/troca e sequência de fase (para o servidor não reiniciar o timer).
// Rodar: npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  applyEvent,
  autoPassTargets,
  createGame,
  currentTimer,
  decisionPlayerId,
  viewForPlayer,
} from "./engine";
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
const RNG = seeded(7);

function newGame(n = 3): GameState {
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));
  return createGame(players, {}, RNG);
}
function setHand(s: GameState, id: string, chars: [Character, Character]): void {
  const p = s.players.find((x) => x.id === id)!;
  p.cards = [
    { character: chars[0], revealed: false },
    { character: chars[1], revealed: false },
  ];
}
function setCoins(s: GameState, id: string, coins: number): void {
  s.players.find((x) => x.id === id)!.coins = coins;
}
const coins = (s: GameState, id: string) => s.players.find((x) => x.id === id)!.coins;
const influence = (s: GameState, id: string) =>
  s.players.find((x) => x.id === id)!.cards.filter((c) => !c.revealed).length;

function run(s: GameState, ...events: GameEvent[]): GameState {
  let st = s;
  for (const e of events) {
    const r = applyEvent(st, e, RNG);
    assert.equal(r.error, null, `evento inválido: ${JSON.stringify(e)} → ${r.error}`);
    st = r.state;
  }
  return st;
}
function fails(s: GameState, e: GameEvent): string {
  const r = applyEvent(s, e, RNG);
  assert.notEqual(r.error, null, `esperava erro em ${JSON.stringify(e)}`);
  return r.error!;
}

// ── F1: Passar ───────────────────────────────────────────────────────────────
test("Passar: janela global fecha quando TODOS os elegíveis passam", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  s = run(s, { type: "pass", playerId: "p2" });
  assert.equal(s.phase, "janela_reacao_global"); // falta o p3
  assert.deepEqual(s.pending!.passedIds, ["p2"]);
  s = run(s, { type: "pass", playerId: "p3" });
  assert.equal(s.phase, "aguardando_acao"); // ação prosseguiu
  assert.equal(coins(s, "p1"), 5); // 2 + 3
  assert.equal(viewForPlayer(s, "p2").currentPlayerId, "p2");
});

test("Passar: o ator não pode passar; passar duas vezes e fora de janela dão erro", () => {
  let s = newGame(3);
  fails(s, { type: "pass", playerId: "p2" }); // aguardando_acao: sem janela
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  fails(s, { type: "pass", playerId: "p1" }); // ator
  s = run(s, { type: "pass", playerId: "p2" });
  fails(s, { type: "pass", playerId: "p2" }); // já passou
});

test("Passar: quem passou não pode mais contestar nem bloquear na janela", () => {
  let s = newGame(3);
  setHand(s, "p1", ["capitao", "capitao"]); // blefa Duque
  s = run(s, { type: "action", playerId: "p1", action: "ajuda_externa" });
  s = run(s, { type: "pass", playerId: "p2" });
  fails(s, { type: "block", playerId: "p2", character: "duque" });
  s = run(s, { type: "block", playerId: "p3", character: "duque" }); // p3 ainda pode
  assert.equal(s.phase, "janela_contestar_bloqueio");
});

test("Passar: janela da vítima só fecha quando vítima E demais passam (assassinar)", () => {
  let s = newGame(3);
  setCoins(s, "p1", 3);
  s = run(s, { type: "action", playerId: "p1", action: "assassinar", targetId: "p2" });
  s = run(s, { type: "pass", playerId: "p2" });
  assert.equal(s.phase, "janela_reacao_vitima"); // p3 ainda pode contestar
  s = run(s, { type: "pass", playerId: "p3" });
  assert.equal(s.phase, "aguardando_revelacao"); // assassinato prossegue
  assert.equal(s.mustRevealPlayerId, "p2");
});

test("Passar: com 2 jogadores, a vítima passar fecha na hora", () => {
  let s = newGame(2);
  s = run(s, { type: "action", playerId: "p1", action: "extorquir", targetId: "p2" });
  s = run(s, { type: "pass", playerId: "p2" });
  assert.equal(s.phase, "aguardando_acao");
  assert.equal(coins(s, "p1"), 4); // roubou 2
  assert.equal(coins(s, "p2"), 0);
});

test("Passar: janela de contestar bloqueio — todos (menos o bloqueador) passando = bloqueio vale", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "ajuda_externa" });
  s = run(s, { type: "pass", playerId: "p3" });
  s = run(s, { type: "block", playerId: "p2", character: "duque" });
  assert.equal(s.phase, "janela_contestar_bloqueio");
  assert.deepEqual(s.pending!.passedIds, []); // a lista zera ao abrir a nova janela
  fails(s, { type: "pass", playerId: "p2" }); // o bloqueador não passa
  s = run(s, { type: "pass", playerId: "p1" }); // o ator PODE contestar o bloqueio
  assert.equal(s.phase, "janela_contestar_bloqueio");
  s = run(s, { type: "pass", playerId: "p3" });
  assert.equal(s.phase, "aguardando_acao");
  assert.equal(coins(s, "p1"), 2); // ação bloqueada: sem +2
});

test("Passar: eliminados não contam como elegíveis", () => {
  let s = newGame(3);
  s.players.find((p) => p.id === "p3")!.cards = [
    { character: "duque", revealed: true },
    { character: "duque", revealed: true },
  ];
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  s = run(s, { type: "pass", playerId: "p2" }); // p3 está fora: só p2 era elegível
  assert.equal(s.phase, "aguardando_acao");
});

test("view expõe quem já passou (informação pública)", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  s = run(s, { type: "pass", playerId: "p2" });
  assert.deepEqual(viewForPlayer(s, "p3").pending!.passedIds, ["p2"]);
});

// ── F3: sequência de fase (servidor só rearma o timer quando a fase muda) ─────
test("phaseSeq muda ao abrir nova fase e NÃO muda em um Passar que não fecha", () => {
  let s = newGame(3);
  const seq0 = s.phaseSeq;
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  const seq1 = s.phaseSeq;
  assert.notEqual(seq1, seq0);
  s = run(s, { type: "pass", playerId: "p2" });
  assert.equal(s.phaseSeq, seq1); // mesma janela: timer não reinicia
  s = run(s, { type: "pass", playerId: "p3" });
  assert.notEqual(s.phaseSeq, seq1);
});

test("phaseSeq muda em duas revelações seguidas (jogadores diferentes, mesma fase)", () => {
  let s = newGame(3);
  setHand(s, "p1", ["assassino", "duque"]);
  setCoins(s, "p1", 3);
  s = run(s, { type: "action", playerId: "p1", action: "assassinar", targetId: "p2" });
  s = run(s, { type: "challenge", playerId: "p3" }); // p1 TEM o assassino → p3 perde 1
  assert.equal(s.phase, "aguardando_revelacao");
  assert.equal(s.mustRevealPlayerId, "p3");
  const seq = s.phaseSeq;
  s = run(s, { type: "reveal", playerId: "p3", cardIndex: 0 });
  assert.equal(s.phase, "aguardando_revelacao"); // agora o assassinato: p2 revela
  assert.equal(s.mustRevealPlayerId, "p2");
  assert.notEqual(s.phaseSeq, seq); // timer do p2 deve ser novo
});

// ── F2: timeouts de turno / revelação / troca ────────────────────────────────
test("config: turnTime e choiceTime têm padrão e são limitados", () => {
  const a = createGame([{ id: "a", name: "A" }, { id: "b", name: "B" }], {}, RNG);
  assert.equal(a.config.turnTime, 45);
  assert.equal(a.config.choiceTime, 30);
  const b = createGame([{ id: "a", name: "A" }, { id: "b", name: "B" }], { turnTime: 1, choiceTime: 999 }, RNG);
  assert.equal(b.config.turnTime, 15);
  assert.equal(b.config.choiceTime, 120);
});

test("currentTimer cobre aguardando_acao, revelacao e troca", () => {
  const s = newGame(3);
  assert.deepEqual(currentTimer(s), { phase: "aguardando_acao", seconds: 45 });
  s.phase = "aguardando_revelacao";
  assert.equal(currentTimer(s)!.seconds, 30);
  s.phase = "aguardando_troca";
  assert.equal(currentTimer(s)!.seconds, 30);
  s.phase = "fim_de_jogo";
  assert.equal(currentTimer(s), null);
});

test("timeout no turno: joga Renda automaticamente e passa a vez", () => {
  let s = newGame(3);
  s = run(s, { type: "timeout" });
  assert.equal(coins(s, "p1"), 3);
  assert.equal(s.phase, "aguardando_acao");
  assert.equal(viewForPlayer(s, "p2").currentPlayerId, "p2");
});

test("timeout no turno com 10+ moedas: dá o Golpe obrigatório em um oponente vivo", () => {
  let s = newGame(3);
  setCoins(s, "p1", 10);
  s = run(s, { type: "timeout" });
  assert.equal(coins(s, "p1"), 3);
  assert.equal(s.phase, "aguardando_revelacao");
  assert.notEqual(s.mustRevealPlayerId, "p1");
});

test("timeout na revelação: vira uma carta ainda oculta do jogador", () => {
  let s = newGame(3);
  setCoins(s, "p1", 7);
  s = run(s, { type: "action", playerId: "p1", action: "golpe", targetId: "p2" });
  assert.equal(s.phase, "aguardando_revelacao");
  s = run(s, { type: "timeout" });
  assert.equal(influence(s, "p2"), 1);
  assert.equal(s.phase, "aguardando_acao");
});

test("timeout na troca: mantém as próprias cartas (troca neutra)", () => {
  let s = newGame(3);
  setHand(s, "p1", ["duque", "condessa"]);
  s = run(s, { type: "action", playerId: "p1", action: "trocar" });
  s = run(s, { type: "pass", playerId: "p2" }, { type: "pass", playerId: "p3" });
  assert.equal(s.phase, "aguardando_troca");
  s = run(s, { type: "timeout" });
  const hand = s.players.find((p) => p.id === "p1")!.cards.map((c) => c.character);
  assert.deepEqual(hand, ["duque", "condessa"]);
  assert.equal(s.phase, "aguardando_acao");
});

test("timeout em fim_de_jogo é inválido", () => {
  const s = newGame(2);
  s.phase = "fim_de_jogo";
  fails(s, { type: "timeout" });
});

// ── F4: de quem a mesa está esperando ────────────────────────────────────────
test("decisionPlayerId: turno, revelação e troca; null nas janelas de reação", () => {
  let s = newGame(3);
  assert.equal(decisionPlayerId(s), "p1"); // turno
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  assert.equal(decisionPlayerId(s), null); // janela de reação
  s = run(s, { type: "pass", playerId: "p2" }, { type: "pass", playerId: "p3" });
  assert.equal(decisionPlayerId(s), "p2");
  setCoins(s, "p2", 7);
  s = run(s, { type: "action", playerId: "p2", action: "golpe", targetId: "p3" });
  assert.equal(s.phase, "aguardando_revelacao");
  assert.equal(decisionPlayerId(s), "p3"); // quem deve revelar
  s.phase = "fim_de_jogo";
  assert.equal(decisionPlayerId(s), null);
});

// ── F3: view traz o tempo restante vindo do servidor ─────────────────────────
test("view.timer usa o tempo restante informado pelo servidor", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "taxas" });
  const v = viewForPlayer(s, "p2", 2300);
  assert.equal(v.timer!.remainingMs, 2300);
  assert.equal(v.timer!.seconds, 5);
  assert.equal(viewForPlayer(s, "p2").timer!.remainingMs, 5000); // sem info → janela cheia
});

// ── 4.7: passar automático ───────────────────────────────────────────────────
test("autoPassTargets: só quem ligou, pode reagir e não é parte envolvida", () => {
  let s = newGame(4);
  setCoins(s, "p1", 3);
  s = run(s, { type: "action", playerId: "p1", action: "assassinar", targetId: "p2" });
  const todos = new Set(["p1", "p2", "p3", "p4"]);
  // p1 é o ator (não reage), p2 é o ALVO (quer decidir) → só p3 e p4 passam sozinhos.
  assert.deepEqual(autoPassTargets(s, todos), ["p3", "p4"]);
  assert.deepEqual(autoPassTargets(s, new Set(["p3"])), ["p3"]); // quem não ligou fica de fora
  assert.deepEqual(autoPassTargets(s, new Set()), []);
});

test("autoPassTargets: já passou não repete; na janela do bloqueio o ator não passa sozinho", () => {
  let s = newGame(3);
  s = run(s, { type: "action", playerId: "p1", action: "ajuda_externa" });
  s = run(s, { type: "block", playerId: "p2", character: "duque" });
  assert.equal(s.phase, "janela_contestar_bloqueio");
  const todos = new Set(["p1", "p2", "p3"]);
  // p2 bloqueou (excluído) e p1 é o ator: foi a ação dele que travou → só p3.
  assert.deepEqual(autoPassTargets(s, todos), ["p3"]);
  s = run(s, { type: "pass", playerId: "p3" });
  assert.deepEqual(autoPassTargets(s, todos), []);
});

test("autoPassTargets: fora de janela não há ninguém", () => {
  assert.deepEqual(autoPassTargets(newGame(3), new Set(["p1", "p2", "p3"])), []);
});
