import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkPlano, parseDeps, parseIndexIds, parseRastreio, parseWaves } from "./plano-check";

const INDICE = "| A1 | x |\n| B1 | y |\n";
const RASTREIO = "| A1 | P01 Um | | | |\n| B1 | P02 Dois | | | |\n";
const MESTRE = [
  "## Grafo de dependências",
  "",
  "| Plano | Depende de |",
  "|---|---|",
  "| P01 | — |",
  "| P02 | P01 |",
  "",
  "## Ondas",
  "",
  "| Onda | Planos | Observação |",
  "|---|---|---|",
  "| 0 | P01 | a |",
  "| 1 | P02 | b |",
  "",
].join("\n");

const docs = { indice: INDICE, rastreio: RASTREIO, mestre: MESTRE };

test("plano-check: parsers básicos", () => {
  assert.deepEqual(parseIndexIds(INDICE), ["A1", "B1"]);
  assert.deepEqual([...parseRastreio(RASTREIO)], [["A1", ["P01"]], ["B1", ["P02"]]]);
  assert.deepEqual([...parseDeps(MESTRE, ["P01", "P02"])], [["P01", []], ["P02", ["P01"]]]);
  assert.deepEqual([...parseWaves(MESTRE)], [["P01", 0], ["P02", 1]]);
});

test("plano-check: documentos consistentes não geram problema", () => {
  assert.deepEqual(checkPlano(docs), []);
});

test("plano-check: ID do índice sem plano no rastreio", () => {
  const p = checkPlano({ ...docs, indice: INDICE + "| C1 | z |\n" });
  assert.deepEqual(p, ["ID sem plano no rastreio: C1"]);
});

test("plano-check: ID em dois planos no rastreio", () => {
  const p = checkPlano({ ...docs, rastreio: RASTREIO + "| A1 | P02 Dois | | | |\n" });
  assert.deepEqual(p, ["ID em mais de um plano no rastreio: A1 (P01, P02)"]);
});

test("plano-check: ID do rastreio inexistente no índice", () => {
  const p = checkPlano({ ...docs, rastreio: RASTREIO + "| D1 | P01 Um | | | |\n" });
  assert.deepEqual(p, ["ID do rastreio que não existe no índice: D1"]);
});

test("plano-check: ciclo de dependências", () => {
  const mestre = MESTRE.replace("| P01 | — |", "| P01 | P02 |");
  assert.ok(checkPlano({ ...docs, mestre }).some((x) => x.startsWith("ciclo: ")));
});

test("plano-check: dependência em onda posterior", () => {
  const mestre = MESTRE.replace("| P01 | — |", "| P01 | P02 |").replace("| P02 | P01 |", "| P02 | — |");
  assert.ok(checkPlano({ ...docs, mestre }).includes("onda inconsistente: P01 (onda 0) depende de P02 (onda 1)"));
});

test("plano-check: dependência igual na mesma onda é permitida", () => {
  const mestre = MESTRE.replace("| 1 | P02 | b |", "").replace("| 0 | P01 | a |", "| 0 | P01, P02 | a |");
  assert.deepEqual(checkPlano({ ...docs, mestre }), []);
});

test("plano-check: dependência de plano inexistente", () => {
  const mestre = MESTRE.replace("| P02 | P01 |", "| P02 | P09 |");
  assert.ok(checkPlano({ ...docs, mestre }).includes("P02 depende de plano inexistente: P09"));
});

test("plano-check: os documentos reais de docs/plano passam (80 IDs)", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  const indice = read("docs/IDEIAS_ANIMACAO_E_EXPERIENCIA.md");
  assert.equal(parseIndexIds(indice).length, 80);
  const problems = checkPlano({
    indice,
    rastreio: read("docs/plano/00-RASTREIO.md"),
    mestre: read("docs/plano/00-MESTRE.md"),
  });
  assert.deepEqual(problems, []);
});

test("plano-check: 'todos os planos Pxx a Pyy' não inclui o próprio plano (sem ciclo)", () => {
  const mestre = MESTRE.replace("| P02 | P01 |", "| P02 | todos os planos P01 a P02 |");
  assert.deepEqual([...parseDeps(mestre, ["P01", "P02"])].find(([p]) => p === "P02")?.[1], ["P01"]);
});
