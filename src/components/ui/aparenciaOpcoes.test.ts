import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { APARENCIA_PADRAO, DOCKS_PREF, ESTILOS_PREF, FONTES_PREF } from "../../lib/aparencia";
import {
  AMOSTRA_FONTE,
  descreverPainel,
  DOCKS_COM_VISUAL,
  escolhaDoPainel,
  GRUPOS_DO_PAINEL,
  ROTULO_DO_GRUPO,
} from "./aparenciaOpcoes";

const globais = readFileSync(fileURLToPath(new URL("../../../app/globals.css", import.meta.url)), "utf8");

describe("descreverPainel", () => {
  it("lista todas as opcoes de cada grupo, na ordem das preferencias", () => {
    const d = descreverPainel(APARENCIA_PADRAO);
    assert.deepEqual(d.fonte.map((o) => o.valor), [...FONTES_PREF]);
    assert.deepEqual(d.estilo.map((o) => o.valor), [...ESTILOS_PREF]);
    assert.deepEqual(d.dock.map((o) => o.valor), [...DOCKS_PREF]);
    assert.equal(d.fonte.length, 4);
    assert.equal(d.estilo.length, 2);
    assert.equal(d.dock.length, 3);
  });

  it("marca exatamente uma opcao selecionada por grupo: a atual", () => {
    const d = descreverPainel({ fonte: "vt323", estilo: "B", dock: "bandeja" });
    for (const grupo of [d.fonte, d.estilo, d.dock]) assert.equal(grupo.filter((o) => o.selecionada).length, 1);
    assert.equal(d.fonte.find((o) => o.selecionada)?.valor, "vt323");
    assert.equal(d.estilo.find((o) => o.selecionada)?.valor, "B");
    assert.equal(d.dock.find((o) => o.selecionada)?.valor, "bandeja");
  });

  it("o padrao aparece como selecionado e a fonte padrao e a unica marcada como 'padrao'", () => {
    const d = descreverPainel(APARENCIA_PADRAO);
    assert.equal(d.fonte.find((o) => o.selecionada)?.valor, "pixelify");
    assert.deepEqual(d.fonte.filter((o) => o.padrao).map((o) => o.valor), ["pixelify"]);
  });

  it("so as docks sem visual ainda mostram 'em breve'; fontes e estilos nunca", () => {
    const d = descreverPainel(APARENCIA_PADRAO);
    assert.deepEqual(d.dock.filter((o) => !o.emBreve).map((o) => o.valor), [...DOCKS_COM_VISUAL]);
    assert.deepEqual(d.dock.filter((o) => o.emBreve).map((o) => o.valor), ["cavalete", "bandeja"]);
    assert.ok([...d.fonte, ...d.estilo].every((o) => !o.emBreve));
  });

  it("estilo A e B tem nome com a letra e a descricao do kit", () => {
    const d = descreverPainel(APARENCIA_PADRAO);
    assert.match(d.estilo[0].nome, /^A: .*madeira/i);
    assert.match(d.estilo[1].nome, /^B: .*pergaminho/i);
  });

  it("a amostra de fonte e a frase combinada", () => {
    assert.equal(AMOSTRA_FONTE, "Barão do Café, ação");
  });

  it("todo grupo tem rotulo", () => {
    for (const g of GRUPOS_DO_PAINEL) assert.ok(ROTULO_DO_GRUPO[g].length > 0, g);
  });
});

describe("fontes do painel x app/globals.css", () => {
  /** Corpo do bloco `data-fonte` da fonte (a padrao tambem vale em `:root` puro). */
  function corpoDaFonte(f: string): string {
    const sel = f === "pixelify" ? ':root,\n:root[data-fonte="pixelify"] {' : `:root[data-fonte="${f}"] {`;
    const ini = globais.indexOf(sel);
    assert.ok(ini >= 0, `bloco da fonte ${f}`);
    return globais.slice(globais.indexOf("{", ini) + 1, globais.indexOf("}", ini));
  }

  it("familia e escala de cada opcao sao exatamente --fonte-ui e --fe do CSS", () => {
    for (const o of descreverPainel(APARENCIA_PADRAO).fonte) {
      const corpo = corpoDaFonte(o.valor);
      const familia = corpo.match(/--fonte-ui:\s*([^;]+);/)?.[1].trim();
      const fe = Number(corpo.match(/--fe:\s*([\d.]+);/)?.[1]);
      assert.equal(o.familia, familia, `${o.valor}: familia`);
      assert.equal(o.escala, fe, `${o.valor}: escala`);
    }
  });
});

describe("escolhaDoPainel", () => {
  const atual = APARENCIA_PADRAO; // pixelify / A / mesa

  it("devolve so o campo do grupo escolhido", () => {
    assert.deepEqual(escolhaDoPainel(atual, "fonte", "vt323"), { fonte: "vt323" });
    assert.deepEqual(escolhaDoPainel(atual, "estilo", "B"), { estilo: "B" });
    assert.deepEqual(escolhaDoPainel(atual, "dock", "cavalete"), { dock: "cavalete" });
  });

  it("valor desconhecido (ou herdado do prototipo) nao grava nada", () => {
    assert.equal(escolhaDoPainel(atual, "fonte", "comic-sans"), null);
    assert.equal(escolhaDoPainel(atual, "estilo", "C"), null);
    assert.equal(escolhaDoPainel(atual, "dock", "toString"), null);
    assert.equal(escolhaDoPainel(atual, "dock", ""), null);
  });

  it("escolher o que ja esta ativo nao grava nada", () => {
    assert.equal(escolhaDoPainel(atual, "fonte", "pixelify"), null);
    assert.equal(escolhaDoPainel(atual, "estilo", "A"), null);
    assert.equal(escolhaDoPainel(atual, "dock", "mesa"), null);
  });

  it("valor de outro grupo nao vale (ex.: estilo 'A' no grupo da fonte)", () => {
    assert.equal(escolhaDoPainel(atual, "fonte", "A"), null);
    assert.equal(escolhaDoPainel(atual, "dock", "vt323"), null);
  });
});
