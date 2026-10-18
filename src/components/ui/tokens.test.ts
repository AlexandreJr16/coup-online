// Guarda do CSS do kit: não há jsdom nem navegador nos testes unitários, então estas checagens
// leem os arquivos e travam o contrato (paleta fiel, A e B completos, kit sem cor fixa).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { FONTES_PREF } from "../../lib/aparencia";

const ler = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const globais = ler("../../../app/globals.css");
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const modulo = ler("./ui.module.css");
const paleta = JSON.parse(ler("../../../tools/art/palette.json")) as { colors: string[] };

/** Corpo do primeiro bloco cujo seletor (texto exato) é `seletor`. */
function bloco(css: string, seletor: string): string {
  const ini = css.indexOf(`${seletor} {`);
  assert.ok(ini >= 0, `bloco nao encontrado: ${seletor}`);
  const abre = css.indexOf("{", ini);
  return css.slice(abre + 1, css.indexOf("}", abre));
}

function definidas(corpo: string, prefixo: string): string[] {
  return [...corpo.matchAll(new RegExp(`(--${prefixo}[\\w-]*)\\s*:`, "g"))].map((m) => m[1]).sort();
}

describe("tokens do kit em globals.css", () => {
  it("a paleta --p-* tem exatamente as 38 cores de tools/art/palette.json", () => {
    const hex = [...globais.matchAll(/--p-[\w-]+:\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => m[1].toLowerCase());
    assert.equal(hex.length, 38);
    assert.deepEqual([...hex].sort(), paleta.colors.map((c) => c.toLowerCase()).sort());
  });

  it("estilo A (padrao) e B definem exatamente o mesmo conjunto de --k-*", () => {
    const a = definidas(bloco(globais, ':root,\n:root[data-estilo="A"]'), "k-");
    const b = definidas(bloco(globais, ':root[data-estilo="B"]'), "k-");
    assert.ok(a.length > 20);
    assert.deepEqual(b, a);
  });

  it("o estilo A tambem vale quando o atributo nao existe (seletor :root puro)", () => {
    assert.match(globais, /:root,\n:root\[data-estilo="A"\]\s*\{/);
  });

  it("cada fonte tem seu bloco data-fonte com --fonte-ui e --fe; a padrao vale sem atributo", () => {
    for (const f of FONTES_PREF) {
      const corpo = bloco(globais, f === "pixelify" ? ':root,\n:root[data-fonte="pixelify"]' : `:root[data-fonte="${f}"]`);
      assert.match(corpo, /--fonte-ui:\s*var\(--font-/, f);
      assert.match(corpo, /--fe:\s*[\d.]+;/, f);
    }
  });

  it("os tokens nao usam gradiente, blur nem glow", () => {
    const kit = semComentarios(globais.slice(globais.lastIndexOf("/*", globais.indexOf("Kit de UI pixel (P04/P27)"))));
    assert.ok(kit.length > 500);
    assert.doesNotMatch(kit, /gradient|blur|rgba?\(|border-radius/);
  });
});

describe("ui.module.css", () => {
  it("usa so variaveis do tema: nenhuma cor fixa (hex, rgb, hsl, nome)", () => {
    const css = semComentarios(modulo);
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
    assert.doesNotMatch(css, /\b(rgba?|hsla?|oklch|color-mix)\(/);
  });

  it("sem gradiente, sem blur, sem border-radius (linguagem pixel)", () => {
    const css = semComentarios(modulo);
    assert.doesNotMatch(css, /gradient|blur\(|border-radius:\s*(?![\s0])|filter:\s*(?!\s|drop-shadow)/);
  });

  it("todo var(--k-*) e var(--p-*) usado existe nos tokens (e --k-* no estilo B tambem)", () => {
    const usados = new Set([...modulo.matchAll(/var\((--[kp]-[\w-]+)\)/g)].map((m) => m[1]));
    const k = new Set(definidas(bloco(globais, ':root[data-estilo="B"]'), "k-"));
    const p = new Set(definidas(globais, "p-"));
    for (const v of usados) {
      assert.ok(v.startsWith("--k-") ? k.has(v) : p.has(v), `${v} nao definido`);
    }
    assert.ok(usados.size > 15);
  });

  it("drop-shadow do painel nao tem blur (terceiro valor e 0)", () => {
    const usos = [...semComentarios(modulo).matchAll(/drop-shadow\((.*)\);/g)];
    assert.ok(usos.length > 0);
    for (const m of usos) {
      const partes = m[1].replace(/var\([^)]*\)/g, "V").split(/\s+/);
      assert.equal(partes[2], "0", m[0]); // x y BLUR cor
    }
  });

  it("alvos de clique: botao e botao de icone garantem 44px", () => {
    assert.match(bloco(modulo, ".btn"), /min-height:\s*max\(44px,/);
    const icone = bloco(modulo, ".btnIcone");
    assert.match(icone, /width:\s*max\(44px,/);
    assert.match(icone, /height:\s*max\(44px,/);
  });

  it("as classes que os componentes importam existem no modulo", () => {
    for (const c of ["bitmap", "panel", "panelBorda", "panelFace", "panelTitulo", "btn", "perigo", "forcaHover",
      "forcaPressionado", "btnIcone", "tag", "tagOuro", "tagPerigo", "tagBloqueio", "tagFora", "tagBlefe",
      "recurso", "recursoTopo", "recursoNumero", "recursoTrilho", "segmento", "segmentoCheio", "logo",
      "logoImg", "iconeImg", "cheio", "campoRotulo", "campoInput", "leitura", "quadroEscuro", "hud", "hudEsq",
      "hudCentro", "hudDir", "sala", "salaCodigo", "modalFundo", "modalCaixa", "modalTopo", "modalTitulo",
      "grupo", "grupoRotulo", "opcoes", "opcaoFonte", "nota"]) {
      assert.match(modulo, new RegExp(`\\.${c}\\b`), c);
    }
  });
});
