// Testes do placar da noite na tela de fim de partida (lógica pura). Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import type { ScorePayload } from "../../types/socket";
import { ICONS_AVAILABLE, iconUrl } from "./helpers";
import {
  LIMITE_LINHAS,
  juntarNomes,
  lerPlacar,
  resumoLinha,
  rotuloPartidas,
  vezes,
  visaoDoPlacar,
} from "./placar";

const placar = (over: Partial<ScorePayload> = {}): ScorePayload => ({
  matches: 4,
  lastWinnerId: "p1",
  rows: [
    { id: "p1", name: "Ana", wins: 2, played: 4 },
    { id: "p2", name: "Bia", wins: 2, played: 4 },
    { id: "p3", name: "Caio", wins: 0, played: 3 },
  ],
  titles: [
    { id: "mentiroso", titulo: "Mentiroso da noite", count: 2, leaders: [{ id: "p3", name: "Caio" }] },
    { id: "ricaco", titulo: "Ricaço da noite", count: 1, leaders: [{ id: "p1", name: "Ana" }, { id: "p2", name: "Bia" }] },
  ],
  ...over,
});
const ctx = (over: Partial<Parameters<typeof visaoDoPlacar>[1]> = {}) => ({
  matchNumber: 4,
  playerIds: ["p1", "p2", "p3"],
  avatares: { p1: "dama_corte", p2: "doceira", p3: "ator" },
  ...over,
});

test("placar ausente, vazio, inválido ou antigo não mostra nada (null)", () => {
  assert.equal(visaoDoPlacar(null, ctx()), null);
  assert.equal(visaoDoPlacar(undefined, ctx()), null);
  assert.equal(visaoDoPlacar("lixo", ctx()), null);
  assert.equal(visaoDoPlacar({ matches: 1, rows: "x" }, ctx()), null);
  assert.equal(visaoDoPlacar(placar({ rows: [] }), ctx()), null);
  // O game_state final chega ANTES do room:score: o que está na memória ainda é da partida 3.
  assert.equal(visaoDoPlacar(placar({ matches: 3 }), ctx({ matchNumber: 4 })), null);
  assert.ok(visaoDoPlacar(placar({ matches: 4 }), ctx({ matchNumber: 4 })));
  assert.ok(visaoDoPlacar(placar({ matches: 5 }), ctx({ matchNumber: 4 })));
});

test("linhas: ordenadas por vitórias, empate divide a liderança, avatar é o da mesa", () => {
  const v = visaoDoPlacar(placar(), ctx())!;
  assert.deepEqual(v.linhas.map((l) => l.id), ["p1", "p2", "p3"]);
  assert.deepEqual(v.linhas.map((l) => l.lider), [true, true, false]);
  assert.deepEqual(v.linhas.map((l) => l.ultimoVencedor), [true, false, false]);
  assert.deepEqual(v.linhas.map((l) => l.avatar), ["dama_corte", "doceira", "ator"]);
  assert.equal(v.partidas, 4);
  assert.equal(v.rotulo, "4 partidas nesta sala");
});

test("ordena mesmo que o servidor mande fora de ordem (vitórias, menos partidas, nome)", () => {
  const v = visaoDoPlacar(
    placar({
      rows: [
        { id: "p3", name: "Caio", wins: 1, played: 4 },
        { id: "p2", name: "Bia", wins: 3, played: 4 },
        { id: "p1", name: "Ana", wins: 1, played: 2 },
      ],
    }),
    ctx(),
  )!;
  assert.deepEqual(v.linhas.map((l) => l.id), ["p2", "p1", "p3"]);
  assert.deepEqual(v.linhas.map((l) => l.lider), [true, false, false]);
});

test("ninguém é líder com 0 vitórias (primeira partida sem vencedor)", () => {
  const v = visaoDoPlacar(
    placar({ matches: 1, lastWinnerId: null, rows: [{ id: "p1", name: "Ana", wins: 0, played: 1 }], titles: [] }),
    ctx({ matchNumber: 1 }),
  )!;
  assert.equal(v.linhas[0].lider, false);
  assert.equal(v.linhas[0].ultimoVencedor, false);
  assert.equal(v.rotulo, "1 partida nesta sala");
});

test("quem saiu da sala fica sem avatar e não tira lugar de quem está na mesa", () => {
  const rows = [
    ...Array.from({ length: 5 }, (_, i) => ({ id: `x${i}`, name: `Saiu${i}`, wins: 9 - i, played: 9 })), // vitoriosos que saíram
    { id: "p1", name: "Ana", wins: 0, played: 1 },
    { id: "p2", name: "Bia", wins: 0, played: 1 },
  ];
  const v = visaoDoPlacar(placar({ rows }), ctx({ playerIds: ["p1", "p2"], avatares: { p1: "dama_corte", p2: "doceira" } }))!;
  assert.equal(v.linhas.length, LIMITE_LINHAS);
  assert.ok(v.linhas.some((l) => l.id === "p1" && l.naMesa && l.avatar === "dama_corte"));
  assert.ok(v.linhas.some((l) => l.id === "p2" && l.naMesa));
  assert.equal(v.linhas.filter((l) => !l.naMesa).every((l) => l.avatar === null), true);
  assert.equal(v.ocultas, rows.length - LIMITE_LINHAS);
  // continua ordenado por vitórias
  const wins = v.linhas.map((l) => l.wins);
  assert.deepEqual(wins, [...wins].sort((a, b) => b - a));
});

test("títulos da noite: ícone do prêmio (arquivo existe), nomes juntos e contagem", () => {
  const v = visaoDoPlacar(placar(), ctx())!;
  assert.deepEqual(v.titulos.map((t) => t.id), ["mentiroso", "ricaco"]);
  assert.deepEqual(v.titulos.map((t) => t.quem), ["Caio", "Ana e Bia"]);
  assert.deepEqual(v.titulos.map((t) => t.detalhe), ["2 vezes", "1 vez"]);
  for (const t of v.titulos) {
    assert.ok(ICONS_AVAILABLE.includes(t.icone), t.icone);
    assert.ok(existsSync(join(process.cwd(), "public", iconUrl(t.icone, "sm")!)), t.icone);
  }
});

test("sem títulos: lista vazia (a tela esconde a seção)", () => {
  assert.deepEqual(visaoDoPlacar(placar({ titles: [] }), ctx())!.titulos, []);
});

test("lerPlacar: payload com lixo é recusado; título malformado é descartado sem derrubar o resto", () => {
  assert.equal(lerPlacar({ matches: -1, rows: [] }), null);
  assert.equal(lerPlacar({ matches: 1, rows: [{ id: "a", name: "A", wins: "3", played: 1 }] }), null);
  const ok = lerPlacar({
    matches: 2,
    lastWinnerId: 7,
    rows: [{ id: "a", name: "A", wins: 1, played: 2 }],
    titles: [
      { id: "inventado", titulo: "X", count: 1, leaders: [{ id: "a", name: "A" }] },
      { id: "carrasco", titulo: "Carrasco da noite", count: 1, leaders: [] },
      { id: "carrasco", titulo: "Carrasco da noite", count: 1, leaders: [{ id: "a", name: "A" }] },
    ],
  })!;
  assert.equal(ok.lastWinnerId, null);
  assert.deepEqual(ok.titles.map((t) => t.id), ["carrasco"]);
  assert.deepEqual(lerPlacar({ matches: 0, rows: [] }), { matches: 0, lastWinnerId: null, rows: [], titles: [] });
});

test("textos: plural, nomes e resumo da linha", () => {
  assert.equal(rotuloPartidas(1), "1 partida nesta sala");
  assert.equal(rotuloPartidas(3), "3 partidas nesta sala");
  assert.equal(vezes(1), "1 vez");
  assert.equal(vezes(2), "2 vezes");
  assert.equal(juntarNomes([]), "");
  assert.equal(juntarNomes(["Ana"]), "Ana");
  assert.equal(juntarNomes(["Ana", "Bia"]), "Ana e Bia");
  assert.equal(juntarNomes(["Ana", "Bia", "Caio"]), "Ana, Bia e Caio");
  assert.equal(resumoLinha(1, 1), "1 vitória em 1 partida");
  assert.equal(resumoLinha(0, 3), "0 vitórias em 3 partidas");
});
