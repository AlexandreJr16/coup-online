// Testes (retroativos) dos helpers puros da UI do jogo.
// Rodar: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  actionBlockedReason,
  artUrl,
  avatarColor,
  avatarInitials,
  backUrl,
  basicSealState,
  AVATARS,
  assignAvatars,
  avatarUrl,
  ICONS_AVAILABLE,
  type IconName,
  iconUrl,
  CHAR_SHORT,
  CHARACTER_ACTION,
  isBluff,
  legalBlockChars,
  myFaceDownChars,
  reactionOptions,
  reactorIds,
  requiredCharacter,
  seatLayout,
  seatStyle,
} from "./helpers";
import { U } from "./escalaMesa";
import { makeView, player } from "./test-utils";

// ── Assentos ─────────────────────────────────────────────────────────────────
test("seatLayout: 2 a 6 jogadores, o assento 0 (você) é sempre embaixo-centro", () => {
  for (let n = 2; n <= 6; n++) {
    const l = seatLayout(n);
    assert.equal(l.length, n, `n=${n}`);
    assert.deepEqual(l[0], { x: 50, anchor: "bottom" });
  }
});

test("seatLayout: nenhum par de assentos ocupa a mesma posição", () => {
  for (let n = 2; n <= 6; n++) {
    const keys = seatLayout(n).map((p) => `${p.x}|${p.anchor}`);
    assert.equal(new Set(keys).size, n, `posições repetidas com ${n} jogadores`);
  }
});

test("regressão (E2E 6 jogadores 1280×720): não empilha dois assentos na mesma lateral pelo meio", () => {
  // Cada assento tem ~180px de altura; dois em 33%/67% de uma mesa de ~500px se sobrepunham.
  for (let n = 2; n <= 6; n++) {
    const meio = seatLayout(n).filter((p) => p.anchor === "mid" || p.anchor === "midLow" || p.anchor === "midHigh");
    const porLado = new Map<number, number>();
    for (const p of meio) porLado.set(p.x, (porLado.get(p.x) ?? 0) + 1);
    for (const [x, qtd] of porLado) assert.ok(qtd <= 1, `n=${n}: ${qtd} assentos empilhados em x=${x}%`);
  }
});

test("seatLayout: fora do intervalo cai no extremo mais próximo (não quebra)", () => {
  assert.equal(seatLayout(1).length, 2);
  assert.equal(seatLayout(9).length, 6);
});

test("seatStyle: ancora pelas bordas (nunca por % calculado que possa cortar)", () => {
  assert.equal(seatStyle({ x: 50, anchor: "bottom" }).bottom, U(12));
  assert.equal(seatStyle({ x: 50, anchor: "top" }).top, U(14));
  assert.equal(seatStyle({ x: 9, anchor: "mid" }).top, "50%");
  assert.equal(seatStyle({ x: 9, anchor: "midLow" }).left, "9%");
});

// ── Cartas e blefe ───────────────────────────────────────────────────────────
test("myFaceDownChars: só as minhas cartas ainda ocultas", () => {
  const v = makeView({
    players: [
      player("p1", { hand: ["duque", "assassino"], cards: [
        { character: "duque", revealed: false },
        { character: "assassino", revealed: true },
      ] }),
      player("p2"),
    ],
  });
  assert.deepEqual(myFaceDownChars(v, "p1"), ["duque"]);
  assert.deepEqual(myFaceDownChars(v, "ninguem"), []);
});

test("isBluff: ação que exige personagem que não tenho; ações gerais nunca são blefe", () => {
  const v = makeView(); // p1 tem duque e assassino
  assert.equal(isBluff(v, "p1", "taxas"), false); // duque
  assert.equal(isBluff(v, "p1", "assassinar"), false); // assassino
  assert.equal(isBluff(v, "p1", "extorquir"), true); // capitão: não tem
  assert.equal(isBluff(v, "p1", "trocar"), true);
  assert.equal(isBluff(v, "p1", "renda"), false);
  assert.equal(isBluff(v, "p1", "golpe"), false);
});

test("catálogo: cada ação de personagem exige o personagem certo", () => {
  assert.equal(requiredCharacter("taxas"), "duque");
  assert.equal(requiredCharacter("assassinar"), "assassino");
  assert.equal(requiredCharacter("extorquir"), "capitao");
  assert.equal(requiredCharacter("trocar"), "embaixador");
  assert.equal(requiredCharacter("renda"), null);
  assert.equal(CHARACTER_ACTION.condessa, null); // a Benzedeira só reage
});

test("CHAR_SHORT: nome curto cabe na carta (Barão), os demais usam o nome inteiro", () => {
  assert.equal(CHAR_SHORT.duque, "Barão");
  assert.equal(CHAR_SHORT.assassino, "Capoeira");
});

// ── Regras de bloqueio na UI ─────────────────────────────────────────────────
test("legalBlockChars: Ajuda Externa qualquer um (Duque); assassinato/extorsão só a vítima", () => {
  assert.deepEqual(legalBlockChars("ajuda_externa", null, "p3"), ["duque"]);
  assert.deepEqual(legalBlockChars("assassinar", "p2", "p2"), ["condessa"]);
  assert.deepEqual(legalBlockChars("assassinar", "p2", "p3"), []);
  assert.deepEqual(legalBlockChars("extorquir", "p2", "p2").sort(), ["capitao", "embaixador"]);
  assert.deepEqual(legalBlockChars("taxas", null, "p2"), []);
});

test("reactorIds: vivos exceto o ator; na janela de bloqueio, exceto o bloqueador", () => {
  const players = [player("p1"), player("p2"), player("p3", { eliminated: true }), player("p4")];
  const acao = makeView({
    phase: "janela_reacao_global",
    players,
    pending: { action: "taxas", actorId: "p1", targetId: null, claimedCharacter: "duque", block: null, passedIds: [] },
  });
  assert.deepEqual(reactorIds(acao), ["p2", "p4"]);
  const bloqueio = makeView({
    phase: "janela_contestar_bloqueio",
    players,
    pending: {
      action: "ajuda_externa", actorId: "p1", targetId: null, claimedCharacter: null,
      block: { blockerId: "p2", character: "duque" }, passedIds: [],
    },
  });
  assert.deepEqual(reactorIds(bloqueio), ["p1", "p4"]); // o ator PODE contestar o bloqueio
  assert.deepEqual(reactorIds(makeView()), []); // sem janela
});

// ── Moedas ───────────────────────────────────────────────────────────────────
test("actionBlockedReason: custo, golpe obrigatório e ações livres", () => {
  assert.equal(actionBlockedReason(2, "renda"), null);
  assert.match(actionBlockedReason(2, "assassinar")!, /custa 3/);
  assert.equal(actionBlockedReason(3, "assassinar"), null);
  assert.match(actionBlockedReason(6, "golpe")!, /custa 7/);
  assert.equal(actionBlockedReason(7, "golpe"), null);
  assert.match(actionBlockedReason(10, "renda")!, /só o Golpe/); // 10+ moedas
  assert.equal(actionBlockedReason(10, "golpe"), null);
});

// ── Arte ─────────────────────────────────────────────────────────────────────
test("artUrl: expressão sem arquivo cai na neutra; tamanhos sm/lg; sem arte = null", () => {
  assert.equal(artUrl("duque", "neutro", "lg"), "/art/imperio/duque/neutro.png");
  assert.equal(artUrl("duque", "neutro", "sm"), "/art/imperio/duque/neutro.sm.png");
  assert.equal(artUrl("duque", "blefe", "lg"), "/art/imperio/duque/neutro.png"); // fallback
  assert.equal(artUrl("assassino", "atingido", "lg"), "/art/imperio/assassino/atingido.png"); // tem própria
});

test("backUrl: verso por tamanho", () => {
  assert.equal(backUrl("lg"), "/art/imperio/verso.png");
  assert.equal(backUrl("sm"), "/art/imperio/verso.sm.png");
});

// ── Avatar ───────────────────────────────────────────────────────────────────
test("avatarInitials: 1 palavra = 2 letras; 2+ palavras = iniciais; vazio = ?", () => {
  assert.equal(avatarInitials("alexandre"), "AL");
  assert.equal(avatarInitials("Ana Lima"), "AL");
  assert.equal(avatarInitials("  "), "?");
});

test("avatarColor: determinística por nome", () => {
  assert.equal(avatarColor("Ana"), avatarColor("Ana"));
  assert.notEqual(avatarColor("Ana"), avatarColor("Bia"));
  assert.match(avatarColor("Ana"), /^hsl\(\d+ 60% 45%\)$/);
});

// ── Selos de ação (4.2) ──────────────────────────────────────────────────────
test("basicSealState: fora da vez apaga; sem moedas trava; 10+ só libera o Golpe", () => {
  assert.equal(basicSealState(5, "renda", false), "off"); // não é a vez
  assert.equal(basicSealState(2, "renda", true), "ready");
  assert.equal(basicSealState(2, "ajuda_externa", true), "ready");
  assert.equal(basicSealState(2, "golpe", true), "locked"); // custa 7
  assert.equal(basicSealState(7, "golpe", true), "ready");
  assert.equal(basicSealState(10, "golpe", true), "mandatory"); // golpe obrigatório
  assert.equal(basicSealState(10, "renda", true), "locked");
  assert.equal(basicSealState(12, "ajuda_externa", true), "locked");
});

test("assignAvatars: sem repetição, determinístico e todos os arquivos existem", () => {
  const ids = ["a1", "b2", "c3", "d4", "e5", "f6"];
  const a = assignAvatars(ids);
  assert.equal(new Set(a).size, ids.length);
  assert.deepEqual(a, assignAvatars(ids));
  assert.equal(new Set(assignAvatars(Array.from({ length: 12 }, (_, i) => `p${i}`))).size, 12);
  assert.deepEqual(assignAvatars([]), []);
  for (const slug of AVATARS) {
    assert.ok(existsSync(join(process.cwd(), "public", avatarUrl(slug))), `faltando arquivo: ${slug}`);
  }
});

test("iconUrl: sm/lg e ícone sem arquivo devolve null (o selo cai no emoji)", () => {
  assert.equal(iconUrl("renda", "sm"), "/art/imperio/icones/renda.sm.png");
  assert.equal(iconUrl("renda", "lg"), "/art/imperio/icones/renda.png");
  assert.equal(iconUrl("contestar", "sm"), "/art/imperio/icones/contestar.sm.png"); // arte procedural (P05)
  assert.equal(iconUrl("sem_arte" as IconName, "sm"), null); // fora de ICONS_AVAILABLE
});

test("guarda: todo ícone declarado em ICONS_AVAILABLE existe em public/art (nos 2 tamanhos)", () => {
  for (const name of ICONS_AVAILABLE) {
    for (const size of ["sm", "lg"] as const) {
      const url = iconUrl(name, size)!;
      assert.ok(existsSync(join(process.cwd(), "public", url)), `faltando arquivo: ${url}`);
    }
  }
});

// ── O que posso fazer na janela (bandeja + atalhos) ──────────────────────────
test("reactionOptions: sem janela nada; ator não reage; alvo bloqueia; quem passou não age", () => {
  const players = [player("p1"), player("p2"), player("p3")];
  assert.equal(reactionOptions(makeView({ players }), "p2").canReact, false);

  const acao = (action: "assassinar" | "taxas" | "ajuda_externa", extra = {}) =>
    makeView({
      phase: action === "assassinar" ? "janela_reacao_vitima" : "janela_reacao_global",
      players,
      pending: {
        action, actorId: "p1", targetId: action === "assassinar" ? "p2" : null,
        claimedCharacter: action === "ajuda_externa" ? null : action === "taxas" ? "duque" : "assassino",
        block: null, passedIds: [], ...extra,
      },
    });

  assert.equal(reactionOptions(acao("taxas"), "p1").canReact, false); // ator
  const taxas = reactionOptions(acao("taxas"), "p2");
  assert.deepEqual([taxas.canReact, taxas.canChallenge, taxas.blocks], [true, true, []]);

  const assassinato = reactionOptions(acao("assassinar"), "p2"); // alvo
  assert.deepEqual(assassinato.blocks, ["condessa"]);
  assert.deepEqual(reactionOptions(acao("assassinar"), "p3").blocks, []); // não é o alvo

  const ajuda = reactionOptions(acao("ajuda_externa"), "p3");
  assert.equal(ajuda.canChallenge, false); // Ajuda Externa não alega personagem
  assert.deepEqual(ajuda.blocks, ["duque"]);

  assert.equal(reactionOptions(acao("taxas", { passedIds: ["p2"] }), "p2").passed, true);
});

test("reactionOptions: na janela do bloqueio só dá para contestar (e o ator pode)", () => {
  const players = [player("p1"), player("p2"), player("p3")];
  const v = makeView({
    phase: "janela_contestar_bloqueio",
    players,
    pending: {
      action: "ajuda_externa", actorId: "p1", targetId: null, claimedCharacter: null,
      block: { blockerId: "p2", character: "duque" }, passedIds: [],
    },
  });
  const ator = reactionOptions(v, "p1");
  assert.deepEqual([ator.canReact, ator.canChallenge, ator.blocks], [true, true, []]);
  assert.equal(reactionOptions(v, "p2").canReact, false); // o bloqueador não contesta o próprio bloqueio
});

// ── Anel de tempo da carta jogada (4.3) ──────────────────────────────────────
import { RING_PERIMETER, ringOffset } from "./ClaimCard";

test("ringOffset: cheio = 0, vazio = perímetro, limitado a 0–100%", () => {
  assert.equal(ringOffset(100), 0);
  assert.equal(ringOffset(0), RING_PERIMETER);
  assert.equal(Math.round(ringOffset(50)), Math.round(RING_PERIMETER / 2));
  assert.equal(ringOffset(250), 0); // acima de 100 não passa do cheio
  assert.equal(ringOffset(-5), RING_PERIMETER);
});

// ── Voos de moeda (4.4) ──────────────────────────────────────────────────────
import { MAX_FLYING_COINS, planCoinFlights } from "./motion";

test("planCoinFlights: ganhar vem do Erário; perder vai para o Erário", () => {
  assert.deepEqual(planCoinFlights({ p1: 3 }), [{ from: "erario", to: "p1", count: 3 }]);
  assert.deepEqual(planCoinFlights({ p1: -7 }), [{ from: "p1", to: "erario", count: MAX_FLYING_COINS }]); // limitado
});

test("planCoinFlights: roubo (soma zero, um perde e um ganha) voa direto entre os jogadores", () => {
  assert.deepEqual(planCoinFlights({ p1: 2, p2: -2 }), [{ from: "p2", to: "p1", count: 2 }]);
  // vítima só tinha 1 moeda: leva 1
  assert.deepEqual(planCoinFlights({ p1: 1, p2: -1 }), [{ from: "p2", to: "p1", count: 1 }]);
});

test("planCoinFlights: assassinato devolvido/eliminação (vários perdendo) vai tudo ao Erário", () => {
  const f = planCoinFlights({ p1: 3, p2: -4 }); // soma ≠ 0: Erário absorve
  assert.deepEqual(f.sort((a, b) => a.to.localeCompare(b.to)), [
    { from: "p2", to: "erario", count: 4 },
    { from: "erario", to: "p1", count: 3 },
  ]);
});

test("planCoinFlights: sem variação não há voo", () => {
  assert.deepEqual(planCoinFlights({}), []);
  assert.deepEqual(planCoinFlights({ p1: 0 }), []);
});

// ── Inclinação 3D (4.9) ──────────────────────────────────────────────────────
import { tiltFromPointer } from "./motion";

test("tiltFromPointer: centro = 0; bordas = ±máximo; fora da carta é limitado", () => {
  assert.deepEqual(tiltFromPointer(44, 62, 88, 124), { rx: -0, ry: 0 });
  const dir = tiltFromPointer(88, 62, 88, 124, 9);
  assert.equal(dir.ry, 9); // mouse na borda direita: vira para a direita
  assert.equal(tiltFromPointer(0, 62, 88, 124, 9).ry, -9);
  assert.equal(tiltFromPointer(44, 0, 88, 124, 9).rx, 9); // topo: rotateX positivo
  assert.equal(tiltFromPointer(44, 124, 88, 124, 9).rx, -9);
  assert.equal(tiltFromPointer(500, -500, 88, 124, 9).ry, 9); // limitado
});
