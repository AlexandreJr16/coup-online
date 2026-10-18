import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEvent, createGame, viewForPlayer } from "@/src/lib/game/engine";
import type { Character, GameState } from "@/src/types/game";
import { challengePair, makeView, seededRng } from "../test-utils";
import { contarCausas, directScene, MAX_CAUSAS_POR_TRANSICAO, type ConstrutorDeCena } from "./director";
import { deriveEvents } from "../events";
import { assertNoLeak } from "./leak";
import { toPublicView, type PublicView } from "./publica";
import { beat, cena } from "./test-cena";

const pub = (over = {}) => toPublicView(makeView(over));
const lanca = (erros: string[]) => { throw new Error(erros.join("; ")); };

// Construtor de exemplo (declaração): usa só dado público.
const declaracao: ConstrutorDeCena = (prev, cur) =>
  cur.pending && !prev.pending
    ? [cena({ id: `decl#${cur.pending.actorId}`, prioridade: 1, beats: [beat(0, 300, { param: { ator: cur.pending.actorId } }), beat(300, 100, { final: true })] })]
    : [];

const PEND = { action: "taxas", actorId: "p1", targetId: null, claimedCharacter: "duque", block: null, passedIds: [] } as const;

test("directScene: sem view anterior (baseline) não há cena, sem replay", () => {
  assert.deepEqual(directScene(null, pub(), [declaracao]), []);
});

test("directScene: revanche (outra partida) descarta cenas", () => {
  assert.deepEqual(directScene(pub({ matchNumber: 1 }), pub({ matchNumber: 2, pending: PEND }), [declaracao]), []);
});

test("directScene: gera a cena quando o construtor dispara", () => {
  const r = directScene(pub(), pub({ pending: PEND }), [declaracao], lanca);
  assert.deepEqual(r.map((c) => c.id), ["decl#p1"]);
});

test("directScene: salto grande (muitas CAUSAS numa transição) vai ao estado final", () => {
  const prev = pub();
  const cur = pub({ pending: { ...PEND, block: { blockerId: "p2", character: "duque" } } });
  cur.players[0].cards[0] = { revealed: true, character: "condessa" };
  cur.players[1].cards[0] = { revealed: true, character: "capitao" };
  cur.players[2].eliminated = true;
  cur.winnerId = "p1";
  const sempre: ConstrutorDeCena = () => [cena({ id: "x" })];
  assert.deepEqual(directScene(prev, cur, [sempre]), []);
  assert.ok(MAX_CAUSAS_POR_TRANSICAO >= 3);
});

test("directScene: cena inválida é descartada e reportada (a UI não cai); em dev o aoErro lança", () => {
  const ruim: ConstrutorDeCena = () => [cena({ id: "ruim", duracaoMax: 100, beats: [beat(0, 500)] }), cena({ id: "boa" })];
  const msgs: string[][] = [];
  const r = directScene(pub(), pub({ pending: PEND }), [ruim], (e) => msgs.push(e));
  assert.deepEqual(r.map((c) => c.id), ["boa"]);
  assert.equal(msgs.length, 1);
  assert.throws(() => directScene(pub(), pub({ pending: PEND }), [ruim], lanca), /ruim/);
});

test("directScene: id duplicado no mesmo lote é reportado (a segunda é descartada)", () => {
  const dup: ConstrutorDeCena = () => [cena({ id: "igual" }), cena({ id: "igual" })];
  const msgs: string[][] = [];
  const r = directScene(pub(), pub({ pending: PEND }), [dup], (e) => msgs.push(e));
  assert.equal(r.length, 1);
  assert.ok(msgs[0].some((m) => /duplicado/.test(m)));
});

test("directScene: ordena por prioridade (maior primeiro)", () => {
  const dois: ConstrutorDeCena = () => [cena({ id: "baixa", prioridade: 1 }), cena({ id: "alta", prioridade: 3, duracaoMax: 1000 })];
  assert.deepEqual(directScene(pub(), pub({ pending: PEND }), [dois]).map((c) => c.id), ["alta", "baixa"]);
});

test("directScene: o tsc impede passar GameView cru", () => {
  // @ts-expect-error GameView cru não é PublicView
  directScene(null, makeView(), []);
});

// ── Propriedade de vazamento ──
const prevDoPar = () => {
  const pre = createGame([{ id: "p1", name: "Ana" }, { id: "p2", name: "Bia" }, { id: "p3", name: "Caio" }], {}, seededRng(7), { firstPlayerId: "p1" });
  return toPublicView(viewForPlayer(pre, "p1"));
};

test("VAZAMENTO: declaração é idêntica para verdade e blefe (diretor real, view crua)", () => {
  const { afterAction } = challengePair();
  const prev = prevDoPar();
  const a = viewForPlayer(afterAction.truth, "p1");
  const b = viewForPlayer(afterAction.bluff, "p1");
  assertNoLeak((v) => directScene(prev, v as unknown as PublicView, [declaracao]), a, b);
});

test("VAZAMENTO MUTANTE: um construtor que lê a mão do observador é reprovado quando recebe a view crua", () => {
  const { afterAction } = challengePair();
  const espiao: ConstrutorDeCena = (_p, cur) => [
    cena({ id: "espiao", beats: [beat(0, cur.players[0].cards[0].character === "duque" ? 300 : 400, { final: true })] }),
  ];
  const a = viewForPlayer(afterAction.truth, "p1");
  const b = viewForPlayer(afterAction.bluff, "p1");
  // chamado direto (sem a reprojeção do diretor), o harness enxerga o vazamento
  assert.throws(() => assertNoLeak((v) => espiao(prevDoPar(), v as unknown as PublicView), a, b), /VAZAMENTO/);
});

test("DEFESA EM PROFUNDIDADE: o diretor reprojeta, então um `as PublicView` errado não entrega a mão", () => {
  const { afterAction } = challengePair();
  const espiao: ConstrutorDeCena = (_p, cur) => [
    cena({ id: "espiao", beats: [beat(0, cur.players[0].cards[0].character === "duque" ? 300 : 400, { final: true })] }),
  ];
  const a = viewForPlayer(afterAction.truth, "p1");
  const b = viewForPlayer(afterAction.bluff, "p1");
  assertNoLeak((v) => directScene(prevDoPar(), v as unknown as PublicView, [espiao]), a, b);
});

// ── G1 (achado BLOQUEIA da auditoria): a guarda de salto não pode variar com o veredito ──
const mao = (s: GameState, id: string, cartas: [Character, Character], reveladas: [boolean, boolean] = [false, false]) => {
  const p = s.players.find((x) => x.id === id)!;
  p.cards = [{ character: cartas[0], revealed: reveladas[0] }, { character: cartas[1], revealed: reveladas[1] }];
};

/** Fim de partida: p3 fora, p2 só com 1 carta contesta as Taxas de p1. Verdade: p2 perde a última carta e p1 vence. */
function parFimDeJogo(): { prev: PublicView; truth: GameState; bluff: GameState } {
  const base = createGame([{ id: "p1", name: "Ana" }, { id: "p2", name: "Bia" }, { id: "p3", name: "Caio" }], {}, seededRng(3), { firstPlayerId: "p1" });
  const run = (hand1: [Character, Character]): { prev: PublicView; fim: GameState } => {
    const s = structuredClone(base);
    mao(s, "p1", hand1);
    mao(s, "p2", ["capitao", "assassino"], [true, false]);
    mao(s, "p3", ["condessa", "condessa"], [true, true]);
    const a = applyEvent(s, { type: "action", playerId: "p1", action: "taxas" }, seededRng(3));
    assert.equal(a.error, null);
    const c = applyEvent(a.state, { type: "challenge", playerId: "p2" }, seededRng(3));
    assert.equal(c.error, null);
    return { prev: toPublicView(viewForPlayer(a.state, "p3")), fim: c.state };
  };
  const t = run(["duque", "embaixador"]);
  const b = run(["embaixador", "condessa"]);
  assert.deepEqual(t.prev, b.prev); // o par só difere no oculto até aqui
  return { prev: t.prev, truth: t.fim, bluff: b.fim };
}

const dueloExemplo: ConstrutorDeCena = (prev, cur) =>
  cur.lastChallenge && cur.lastChallenge.n !== (prev.lastChallenge?.n ?? 0)
    ? [cena({ id: `duelo#${cur.lastChallenge.n}`, prioridade: 3, duracaoMax: 2600, segurarDesfechoAte: 1900,
        beats: [beat(0, 1900, { pulavel: true }), beat(1900, 700, { final: true, pulavel: true })] })]
    : [];

test("G1: no fim de partida o diretor produz as MESMAS cenas para verdade e blefe, para todo observador", () => {
  const { prev, truth, bluff } = parFimDeJogo();
  assert.equal(truth.winnerId, "p1"); // verdade: p2 perde a última carta e p1 vence
  assert.equal(bluff.winnerId, null); // blefe: p1 perde uma carta, a partida segue
  for (const obs of ["p1", "p2", "p3", "__espectador__"]) {
    const t = directScene(prev, toPublicView(viewForPlayer(truth, obs)), [dueloExemplo], lanca);
    const b = directScene(prev, toPublicView(viewForPlayer(bluff, obs)), [dueloExemplo], lanca);
    assert.deepEqual(t, b, `observador ${obs}`);
    assert.deepEqual(t.map((c) => c.id), ["duelo#1"], `observador ${obs}`);
  }
});

test("G1: contarCausas junta a contestação e as consequências em UMA causa", () => {
  const { prev, truth, bluff } = parFimDeJogo();
  const n = (fim: GameState) => contarCausas(deriveEvents(prev, toPublicView(viewForPlayer(fim, "p3")), (() => { let i = 0; return () => ++i; })()));
  assert.equal(n(truth), 1);
  assert.equal(n(bluff), 1);
});
