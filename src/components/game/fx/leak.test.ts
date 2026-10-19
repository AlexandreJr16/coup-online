import { test } from "node:test";
import assert from "node:assert/strict";
import type { GameView } from "@/src/types/game";
import { challengePair, makeView, withHand } from "../test-utils";
import { viewForPlayer } from "@/src/lib/game/engine";
import { assertNoLeak, toPublicView, type PublicView } from "./leak";

const base = (): GameView => ({ ...makeView(), exchange: { pool: ["duque", "capitao"] } });

test("toPublicView: zera a mão do observador e o pool da troca", () => {
  const pub = toPublicView(base());
  assert.ok(pub.players.every((p) => p.cards.every((c) => c.character === null)));
  assert.equal(pub.exchange, null);
});

test("toPublicView: carta revelada continua pública", () => {
  const v = base();
  v.players[1] = { ...v.players[1], cards: [{ revealed: true, character: "condessa" }, { revealed: false, character: null }] };
  const pub = toPublicView(v);
  assert.deepEqual(pub.players[1].cards, [{ revealed: true, character: "condessa" }, { revealed: false, character: null }]);
});

test("toPublicView: não altera nenhum campo público nem muta a entrada", () => {
  const v = base();
  const snapshot = structuredClone(v);
  const pub = toPublicView(v);
  assert.deepEqual(v, snapshot);
  const semOculto = (x: GameView): GameView => ({ ...x, players: [], exchange: null });
  assert.deepEqual(semOculto(pub), semOculto(v));
  assert.deepEqual(pub.players.map((p) => [p.id, p.name, p.coins, p.eliminated]), v.players.map((p) => [p.id, p.name, p.coins, p.eliminated]));
});

test("toPublicView: idempotente", () => {
  const once = toPublicView(base());
  assert.deepEqual(toPublicView(once), once);
});

test("toPublicView: views que diferem só na mão do observador viram iguais", () => {
  const a = withHand(base(), "p1", ["duque", "assassino"]);
  const b = withHand(base(), "p1", ["condessa", "capitao"]);
  assert.notDeepEqual(a, b);
  assert.deepEqual(toPublicView(a), toPublicView(b));
});

test("PublicView: o tsc impede passar GameView cru onde se espera PublicView", () => {
  const takesPublic = (v: PublicView): PublicView => v;
  // @ts-expect-error GameView cru não é PublicView
  takesPublic(base());
  takesPublic(toPublicView(base()));
});

// ── assertNoLeak: funções boas passam, mutantes que leem o oculto são reprovados ──
const handA = (): GameView => withHand(base(), "p1", ["duque", "assassino"]);
const handB = (): GameView => withHand(base(), "p1", ["condessa", "capitao"]);

test("assertNoLeak: função que usa só dado público passa", () => {
  assertNoLeak((v) => ({ vez: v.currentPlayerId, moedas: v.players.map((p) => p.coins) }), handA(), handB());
});

test("assertNoLeak: função que usa a projeção pública passa", () => {
  assertNoLeak((v) => toPublicView(v).players.map((p) => p.cards.length), handA(), handB());
});

test("assertNoLeak MUTANTE: lê a mão do observador -> reprovado", () => {
  const mutante = (v: GameView) => v.players[0].cards[0].character;
  assert.throws(() => assertNoLeak(mutante, handA(), handB()), /VAZAMENTO/);
});

test("assertNoLeak MUTANTE: só confere se a mão tem um duque (booleano) -> reprovado", () => {
  const mutante = (v: GameView) => v.players[0].cards.some((c) => c.character === "duque");
  assert.throws(() => assertNoLeak(mutante, handA(), handB()), /VAZAMENTO/);
});

test("assertNoLeak MUTANTE: lê o pool da troca -> reprovado", () => {
  const a = base();
  const b = { ...base(), exchange: { pool: ["embaixador" as const] } };
  const mutante = (v: GameView) => v.exchange?.pool.length ?? 0;
  assert.throws(() => assertNoLeak(mutante, a, b), /VAZAMENTO/);
});

test("assertNoLeak MUTANTE: depende da ORDEM/forma do oculto (null vs undefined) -> reprovado", () => {
  const a = handA();
  const b = handA();
  b.players[0] = { ...b.players[0], cards: [{ revealed: false, character: "duque" }, { revealed: false, character: null }] };
  const mutante = (v: GameView) => v.players[0].cards.filter((c) => c.character !== null).length;
  assert.throws(() => assertNoLeak(mutante, a, b), /VAZAMENTO/);
});

test("assertNoLeak: pré-condição, views idênticas = teste vácuo -> erro", () => {
  assert.throws(() => assertNoLeak((v) => v.treasury, base(), base()), /vácuo/);
});

test("assertNoLeak: pré-condição, views que diferem em dado PÚBLICO -> erro", () => {
  const a = handA();
  const b = { ...handB(), treasury: 1 };
  assert.throws(() => assertNoLeak((v) => v.treasury, a, b), /dado PÚBLICO/);
});

test("assertNoLeak: view de um observador vs mão trocada vinda da engine", () => {
  // p3 observa a contestação; só a mão (oculta) de p3 muda entre as duas views.
  const { truth } = challengePair();
  const a = viewForPlayer(truth, "p3");
  const b = withHand(a, "p3", ["embaixador", "embaixador"]);
  if (JSON.stringify(a) === JSON.stringify(b)) b.players[2].cards[0] = { revealed: false, character: "condessa" };
  assertNoLeak((v) => ({ vez: v.currentPlayerId, desafio: v.lastChallenge, fase: v.phase }), a, b);
});

// ── Mutantes achados na auditoria independente (P02.S3, ciclo 1) ──
test("assertNoLeak MUTANTE: lê o exchange.pool mesmo com par que só difere na mão -> reprovado", () => {
  const mutante = (v: GameView) => v.exchange?.pool ?? null;
  assert.throws(() => assertNoLeak(mutante, handA(), handB()), /VAZAMENTO/);
});

test("assertNoLeak MUTANTE: lê o slot 1 quando o par só difere no slot 0 -> reprovado", () => {
  const a = handA();
  const b = withHand(base(), "p1", ["condessa", "assassino"]);
  const mutante = (v: GameView) => v.players[0].cards[0].character;
  assert.throws(() => assertNoLeak(mutante, a, b), /VAZAMENTO/);
  const mutante1 = (v: GameView) => v.players[0].cards[1].character;
  assert.throws(() => assertNoLeak(mutante1, a, b), /VAZAMENTO/);
});

test("assertNoLeak MUTANTE: par só muda exchange (pool vs null) e f lê a mão -> reprovado", () => {
  const a = base();
  const b = { ...base(), exchange: null };
  const mutante = (v: GameView) => v.players[0].cards.length + (v.exchange ? 1 : 0);
  assert.throws(() => assertNoLeak(mutante, a, b), /VAZAMENTO/);
});

test("assertNoLeak MUTANTE: a ORDEM das chaves da saída depende do oculto -> reprovado", () => {
  const mutante = (v: GameView) =>
    v.players[0].cards[0].character === "duque" ? { x: 1, y: 2 } : { y: 2, x: 1 };
  assert.throws(() => assertNoLeak(mutante, handA(), handB()), /VAZAMENTO/);
});

test("assertNoLeak: saídas que não são dado simples são recusadas (Set, Map, classe, closure, gerador)", () => {
  const formas: Array<(v: GameView) => unknown> = [
    (v) => new Set([v.players[0].cards[0].character]),
    (v) => new Map([["k", v.players[0].cards[0].character]]),
    () => new (class Segredo { #s = 1; })(),
    () => () => 1,
    function* () { yield 1; },
  ];
  for (const f of formas) assert.throws(() => assertNoLeak(f, handA(), handB()), /dado simples/);
});

test("assertNoLeak: propriedade não enumerável na saída é recusada", () => {
  const f = (v: GameView) => {
    const o = {};
    Object.defineProperty(o, "segredo", { value: v.players[0].cards[0].character, enumerable: false });
    return o;
  };
  assert.throws(() => assertNoLeak(f, handA(), handB()), /dado simples/);
});

test("assertNoLeak MUTANTE: grava o oculto num objeto compartilhado entre a e b -> reprovado", () => {
  const memoria: { visto?: unknown } = {};
  const f = (v: GameView) => {
    try { (v as { config: { visto?: unknown } }).config.visto = v.players[0].cards[0].character; } catch { /* congelado */ }
    return { visto: memoria.visto ?? null };
  };
  assert.doesNotThrow(() => assertNoLeak(f, handA(), handB()));
  const g = (v: GameView) => { (v.config as { x?: number }).x = 1; return {}; };
  assert.throws(() => assertNoLeak(g, handA(), handB()), /f lançou/);
});

test("toPublicView: descarta chaves extras nos três níveis (falha fechado)", () => {
  const v = base() as GameView & { deck?: string[] };
  v.deck = ["duque"];
  (v.players[0] as unknown as { handHash: string }).handHash = "x";
  (v.players[0].cards[0] as unknown as { dica: string }).dica = "y";
  const pub = toPublicView(v) as unknown as Record<string, unknown>;
  assert.equal("deck" in pub, false);
  assert.equal("handHash" in (pub.players as Array<Record<string, unknown>>)[0], false);
  assert.equal("dica" in ((pub.players as Array<{ cards: Array<Record<string, unknown>> }>)[0].cards[0]), false);
});

// ── Mutantes do ciclo 2 da auditoria ──
const reprova = (f: (v: GameView) => unknown, re: RegExp = /VAZAMENTO|dado simples|f lançou/) =>
  assert.throws(() => assertNoLeak(f, handA(), handB()), re);

test("assertNoLeak MUTANTE: reage só a certa carta (includes embaixador / dupla) -> reprovado", () => {
  const todas = (v: GameView) => v.players[0].cards.map((c) => c.character);
  reprova((v) => ({ x: todas(v).includes("embaixador") }), /VAZAMENTO/);
  reprova((v) => ({ x: todas(v)[0] === todas(v)[1] }), /VAZAMENTO/);
});

test("assertNoLeak: canais por forma da saída são recusados (-0, esparso, array com extra, toJSON, subclasse, Proxy, protótipo nulo)", () => {
  const sinais = (v: GameView) => ({ z: v.players[0].cards[0].character === "duque" ? -0 : 0 });
  reprova(sinais, /dado simples/);
  reprova((v) => { const a = [1, 2, v.treasury]; delete a[1]; return { a }; }, /dado simples/);
  reprova((v) => ({ a: Object.assign([1], { carta: v.players[0].cards[0].character }) }), /dado simples/);
  reprova((v) => ({ a: Object.assign([v.players[0].cards[0].character], { toJSON: () => [] }) }), /dado simples/);
  class Sub extends Array {}
  reprova(() => ({ a: Sub.from([1]) }), /dado simples/);
  reprova(() => new Proxy({ a: 1 }, {}), /dado simples/);
  reprova(() => Object.create(null), /dado simples/);
});

test("assertNoLeak MUTANTE: exceção que depende do oculto é reportada como falha de f", () => {
  reprova((v) => { if (v.players[0].cards[0].character === "duque") throw new Error("boom"); return {}; }, /f lançou/);
});

test("toPublicView: campos extras aninhados em pending, lastChallenge, timer, config e stats são descartados", () => {
  const v = makeView({
    pending: { action: "taxas", actorId: "p1", targetId: null, claimedCharacter: "duque", block: { blockerId: "p2", character: "duque" }, passedIds: [] },
    lastChallenge: { n: 1, challengerId: "p2", accusedId: "p1", claimed: "duque", accusedHadCard: true, kind: "action" },
    stats: { p1: { challengesMade: 0, challengesRight: 0, bluffsCaught: 0, blocks: 0, kills: 0, maxCoins: 2, influenceLost: 0 } },
  });
  const sujar = (o: object) => Object.assign(o, { mao: ["duque"] });
  sujar(v.pending!); sujar(v.pending!.block!); sujar(v.lastChallenge!); sujar(v.timer!); sujar(v.config); sujar(v.stats.p1);
  const pub = toPublicView(v);
  for (const o of [pub.pending!, pub.pending!.block!, pub.lastChallenge!, pub.timer!, pub.config, pub.stats.p1]) {
    assert.equal("mao" in o, false);
  }
});

test("harness: funções legítimas do jogo (status e contador de eventos) passam sem falso positivo", () => {
  const { afterAction } = challengePair();
  const a = viewForPlayer(afterAction.truth, "p1");
  const b = viewForPlayer(afterAction.bluff, "p1");
  assertNoLeak((v) => ({ vez: v.currentPlayerId, pend: v.pending, jogadores: v.players.map((p) => p.cards.length) }), a, b);
});
