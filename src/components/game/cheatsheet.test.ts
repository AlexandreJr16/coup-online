// Testes do conteúdo da colinha (função pura). Rodar: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { CARDS } from "@/src/lib/game/cards";
import { buildCheatSheet, RULES_CARD, RULES_SUMMARY, type RegraCurta } from "./cheatsheet";
import { ACTION_META, ICONS_AVAILABLE } from "./helpers";

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

// ── Regras curtas da peça (RULES_CARD, P22.S3) ───────────────────────────────
// Cada regra cita fatos conferíveis; os números são lidos do game-rules.md, a fonte da verdade.
const REGRAS_MD = readFileSync(fileURLToPath(new URL("../../../game-rules.md", import.meta.url)), "utf8");
const regra = (id: RegraCurta["id"]) => RULES_CARD.find((r) => r.id === id)!.texto;
const numeroNoMd = (re: RegExp, o: string) => {
  const m = REGRAS_MD.match(re);
  assert.ok(m, `game-rules.md não bate com ${o}`);
  return m[1];
};

test("RULES_CARD: no máximo 5 regras, ~60 palavras, ids únicos, ícone existente e sem emoji", () => {
  assert.ok(RULES_CARD.length >= 1 && RULES_CARD.length <= 5, `${RULES_CARD.length} regras`);
  assert.equal(new Set(RULES_CARD.map((r) => r.id)).size, RULES_CARD.length);
  const palavras = RULES_CARD.flatMap((r) => r.texto.split(/\s+/)).length;
  assert.ok(palavras <= 75, `${palavras} palavras (alvo ~60)`);
  for (const r of RULES_CARD) {
    assert.ok(ICONS_AVAILABLE.includes(r.icone), `${r.id}: ícone ${r.icone} sem arquivo`);
    assert.ok(r.texto.length <= 90, `${r.id}: longa demais para uma linha (${r.texto.length})`);
    assert.equal(r.texto.match(/\p{Extended_Pictographic}/u), null, `${r.id}: emoji no texto`);
  }
});

test("RULES_CARD cita fatos do game-rules.md: renda +1, ajuda externa +2, golpe 7 e obrigatório com 10+", () => {
  const renda = numeroNoMd(/\|\s*Renda\s*\|\s*\+(\d+) moeda/, "Renda");
  const ajuda = numeroNoMd(/\|\s*Ajuda Externa\s*\|\s*\+(\d+) moedas/, "Ajuda Externa");
  const golpe = numeroNoMd(/\|\s*Golpe de Estado\s*\|\s*Paga (\d+) moedas/, "Golpe de Estado");
  const limite = numeroNoMd(/(\d+) ou mais moedas, é OBRIGADO/, "Golpe obrigatório");
  assert.match(regra("moedas"), new RegExp(`Renda dá \\+${renda} moeda`));
  assert.match(regra("moedas"), new RegExp(`Ajuda Externa dá \\+${ajuda}`));
  assert.match(regra("golpe"), new RegExp(`Golpe de Estado custa ${golpe}\\b`));
  assert.match(regra("golpe"), new RegExp(`${limite} ou mais moedas, é obrigatório`));
  // E o catálogo concorda com o documento (nenhum número solto no texto).
  assert.equal(ACTION_META.renda.efeito.includes(renda), true);
  assert.equal(ACTION_META.ajuda_externa.efeito.includes(ajuda), true);
  assert.equal(ACTION_META.golpe.coinCost, Number(golpe));
});

test("RULES_CARD cita fatos do game-rules.md: 2 influências/2 moedas, exílio, contestação e passar", () => {
  const [, cartas, moedas] = REGRAS_MD.match(/Cada jogador começa com (\d+) cartas viradas para baixo e (\d+) moedas/) ?? [];
  assert.ok(cartas && moedas, "game-rules.md: preparação não encontrada");
  assert.match(regra("comeco"), new RegExp(`${moedas} moedas e ${cartas} influências`));
  assert.match(REGRAS_MD, /exilado/);
  assert.match(regra("comeco"), /exilado/);
  // Contestação: nas duas pontas do documento quem erra "perde 1 influência".
  assert.match(REGRAS_MD, /contestante perde 1 influência/);
  assert.match(REGRAS_MD, /contestado perde 1 influência/);
  assert.match(regra("contestar"), /contestar/);
  assert.match(regra("contestar"), /perde 1 influência/);
  // Passar é final; estouro do tempo é decidido pelo jogo (servidor).
  assert.match(REGRAS_MD, /Passar é final/);
  assert.match(regra("passar"), /Passar é final/);
  assert.match(REGRAS_MD, /### Quando o tempo estoura/);
  assert.match(regra("passar"), /tempo estoura/);
});

test("RULES_CARD não toca no resumo longo: buildCheatSheet() segue devolvendo RULES_SUMMARY", () => {
  assert.deepEqual(buildCheatSheet().rules, [...RULES_SUMMARY]);
  assert.notDeepEqual(RULES_CARD.map((r) => r.texto), [...RULES_SUMMARY]);
});
