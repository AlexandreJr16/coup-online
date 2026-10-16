// Testes do conteúdo da colinha (função pura). Rodar: npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { CARDS } from "@/src/lib/game/cards";
import { buildCheatSheet, RULES_SUMMARY } from "./cheatsheet";
import { ACTION_META } from "./helpers";

const sheet = buildCheatSheet();
const byId = Object.fromEntries(sheet.characters.map((c) => [c.id, c]));
const byAction = Object.fromEntries(
  [...sheet.generalActions, ...sheet.characters.flatMap((c) => (c.acao ? [c.acao] : []))].map((a) => [a.action, a]),
);

test("colinha: todo personagem do catálogo aparece, na ordem e com o nome temático", () => {
  assert.deepEqual(
    sheet.characters.map((c) => c.id),
    CARDS.map((c) => c.id),
  );
  assert.deepEqual(
    sheet.characters.map((c) => c.nome),
    CARDS.map((c) => c.nome),
  );
  // Nomes originais (do Coup físico) não podem vazar para a UI do jogo.
  const texto = JSON.stringify(sheet);
  for (const original of ["Duque", "Capitão", "Condessa", "Embaixador", "Inquisidor", "Assassino"]) {
    assert.ok(!texto.includes(original), `nome original "${original}" na colinha`);
  }
});

test("colinha: toda ação do jogo aparece exatamente uma vez, com efeito e rótulo do ACTION_META", () => {
  const todas = [...sheet.generalActions, ...sheet.characters.flatMap((c) => (c.acao ? [c.acao] : []))];
  assert.deepEqual(
    todas.map((a) => a.action).sort(),
    Object.keys(ACTION_META).sort(),
  );
  for (const a of todas) {
    assert.equal(a.label, ACTION_META[a.action].label);
    assert.ok(a.efeito.length > 5, `${a.action} sem efeito`);
  }
});

test("colinha: custos vêm do ACTION_META (Assassinar 3, Golpe 7, o resto sem custo)", () => {
  assert.equal(byAction.assassinar.custo, 3);
  assert.equal(byAction.golpe.custo, 7);
  for (const a of ["renda", "ajuda_externa", "taxas", "extorquir", "trocar"] as const) {
    assert.equal(byAction[a].custo, null, a);
  }
});

test("colinha: só ações de personagem são contestáveis (Renda, Ajuda Externa e Golpe não)", () => {
  assert.equal(byAction.renda.contestavel, false);
  assert.equal(byAction.ajuda_externa.contestavel, false);
  assert.equal(byAction.golpe.contestavel, false);
  for (const a of ["taxas", "assassinar", "extorquir", "trocar"] as const) {
    assert.equal(byAction[a].contestavel, true, a);
  }
});

test("colinha: bloqueios batem com o catálogo e com a regra de quem pode bloquear", () => {
  // Ajuda Externa: qualquer um pode bloquear, com o Barão do Café.
  assert.deepEqual(
    byAction.ajuda_externa.bloqueadaPor.map((b) => [b.characterId, b.quem]),
    [["duque", "qualquer"]],
  );
  // Assassinar: só a vítima, com a Benzedeira.
  assert.deepEqual(
    byAction.assassinar.bloqueadaPor.map((b) => [b.characterId, b.quem]),
    [["condessa", "vitima"]],
  );
  // Extorquir: só a vítima, com Coronel ou Regatão.
  assert.deepEqual(
    byAction.extorquir.bloqueadaPor.map((b) => b.characterId).sort(),
    ["capitao", "embaixador"],
  );
  assert.ok(byAction.extorquir.bloqueadaPor.every((b) => b.quem === "vitima"));
  // Ações sem bloqueio.
  for (const a of ["renda", "golpe", "taxas", "trocar"] as const) {
    assert.deepEqual(byAction[a].bloqueadaPor, [], a);
  }
});

test("colinha: o que cada personagem bloqueia é o espelho de 'bloqueada por'", () => {
  // Para cada (personagem, ação que ele bloqueia) existe o par inverso na ação.
  for (const c of sheet.characters) {
    for (const b of c.bloqueia) {
      const doLado = byAction[b.action].bloqueadaPor.find((x) => x.characterId === c.id);
      assert.ok(doLado, `${c.id} bloqueia ${b.action}, mas a ação não lista o personagem`);
      assert.equal(doLado.quem, b.quem);
    }
  }
  // E o contrário: tudo que uma ação lista como bloqueador consta no personagem.
  for (const a of Object.values(byAction)) {
    for (const b of a.bloqueadaPor) {
      assert.ok(
        byId[b.characterId].bloqueia.some((x) => x.action === a.action),
        `${a.action} lista ${b.characterId}, que não a bloqueia`,
      );
    }
  }
});

test("colinha: Benzedeira não tem ação própria, só bloqueia", () => {
  assert.equal(byId.condessa.acao, null);
  assert.deepEqual(byId.condessa.bloqueia.map((b) => b.action), ["assassinar"]);
});

test("colinha: resumo das regras menciona Golpe obrigatório com 10+ moedas e contestação", () => {
  assert.deepEqual(sheet.rules, [...RULES_SUMMARY]);
  const texto = sheet.rules.join(" ");
  assert.match(texto, /10 ou mais moedas/);
  assert.match(texto, /Golpe de Estado/);
  assert.match(texto, /contest/i);
  assert.match(texto, /bloque/i);
});
