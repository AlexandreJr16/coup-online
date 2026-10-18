import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

import { ICONS_AVAILABLE } from "../../src/components/game/helpers";
import {
  ARQ_FAVICON,
  ARQ_LOGO,
  BASE_ICONE,
  bitmapFavicon,
  bitmapIcone,
  bitmapLogo,
  centralizar,
  contornar,
  FATOR_LG,
  FATOR_SM,
  folhaDeContato,
  gerarTudo,
  PASTA_ICONES,
  validarBitmap,
} from "./ui-icons";
import { COROA_LOGO, FONTE, ICONES, LEGENDA, MIOLO, ORDEM_ICONES } from "./ui-bitmaps";

const RAIZ = process.cwd();
const paleta: { colors: string[] } = JSON.parse(readFileSync(join(RAIZ, "tools/art/palette.json"), "utf8"));

/** Lê largura/altura do IHDR de um PNG. */
function dims(b: Buffer): { w: number; h: number } {
  assert.equal(b.subarray(12, 16).toString("ascii"), "IHDR");
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

test("determinismo: gerar duas vezes dá exatamente os mesmos bytes", () => {
  const a = gerarTudo();
  const b = gerarTudo();
  assert.equal(a.length, b.length);
  a.forEach((arq, i) => {
    assert.equal(arq.caminho, b[i].caminho);
    assert.ok(arq.bytes.equals(b[i].bytes), `bytes diferentes em ${arq.caminho}`);
  });
  assert.ok(folhaDeContato().equals(folhaDeContato()));
});

test("paleta: a legenda usa só cores da paleta mestra (palette.json) e sem caractere repetido", () => {
  const mestra = new Set(paleta.colors.map((c) => c.toLowerCase()));
  for (const [ch, hex] of Object.entries(LEGENDA)) {
    assert.ok(mestra.has(hex.toLowerCase()), `"${ch}" = ${hex} não está em palette.json`);
  }
  assert.equal(new Set(Object.values(LEGENDA).map((h) => h.toLowerCase())).size, Object.keys(LEGENDA).length, "cor repetida na legenda");
  assert.equal(LEGENDA["."], undefined, "'.' é transparente e não pode ter cor");
});

test("paleta: todo bitmap (ícones, coroa do logo, fonte) só usa '.' ou caracteres da legenda", () => {
  const confere = (nome: string, linhas: readonly string[]) => {
    for (const l of linhas) for (const ch of l) assert.ok(ch === "." || ch in LEGENDA, `${nome}: "${ch}" fora da legenda`);
  };
  for (const [nome, def] of Object.entries(ICONES)) {
    validarBitmap(nome, def.rows); // largura regular
    confere(nome, def.rows);
    assert.ok(def.rows.length <= MIOLO && def.rows[0].length <= MIOLO, `${nome} maior que o miolo ${MIOLO}x${MIOLO}`);
  }
  validarBitmap("coroa_logo", COROA_LOGO);
  confere("coroa_logo", COROA_LOGO);
  for (const [c, g] of Object.entries(FONTE)) {
    validarBitmap(`fonte ${c}`, g.map((l) => l.replaceAll("#", "Y")));
    assert.match(g.join(""), /^[.#]+$/);
  }
  // o resultado final (com contorno, sombra, fundo) também fica na legenda
  for (const nome of ORDEM_ICONES) confere(nome, bitmapIcone(nome));
  confere("logo", bitmapLogo());
  confere("favicon", bitmapFavicon());
});

test("todo ícone listado em ORDEM_ICONES tem definição e vice-versa (nada órfão)", () => {
  assert.deepEqual([...ORDEM_ICONES].sort(), Object.keys(ICONES).sort());
  assert.equal(new Set(ORDEM_ICONES).size, ORDEM_ICONES.length);
});

test("arquivos prometidos: ícones (.png e .sm.png), logo (2) e favicon existem em disco", () => {
  const prometidos = gerarTudo().map((a) => a.caminho);
  assert.equal(prometidos.length, ORDEM_ICONES.length * 2 + 2 + 1);
  for (const c of prometidos) assert.ok(existsSync(join(RAIZ, c)), `faltando: ${c} (rode npx tsx tools/art/ui-icons.ts)`);
});

test("arquivos em disco estão atualizados: iguais, byte a byte, ao que o gerador produz hoje", () => {
  for (const a of gerarTudo()) {
    assert.ok(readFileSync(join(RAIZ, a.caminho)).equals(a.bytes), `${a.caminho} desatualizado (rode npx tsx tools/art/ui-icons.ts)`);
  }
});

test("dimensões: .sm = base x2 e .png = base x4 (ícones 32/64, mesmo padrão dos ícones de ação)", () => {
  assert.equal(BASE_ICONE, 16);
  for (const nome of ORDEM_ICONES) {
    const base = bitmapIcone(nome);
    assert.equal(base.length, BASE_ICONE, `${nome}: altura da base`);
    assert.ok(base.every((l) => l.length === BASE_ICONE), `${nome}: largura da base`);
    const sm = dims(readFileSync(join(RAIZ, PASTA_ICONES, `${nome}.sm.png`)));
    const lg = dims(readFileSync(join(RAIZ, PASTA_ICONES, `${nome}.png`)));
    assert.deepEqual(sm, { w: BASE_ICONE * FATOR_SM, h: BASE_ICONE * FATOR_SM }, `${nome}.sm.png`);
    assert.deepEqual(lg, { w: BASE_ICONE * FATOR_LG, h: BASE_ICONE * FATOR_LG }, `${nome}.png`);
  }
  const logo = bitmapLogo();
  const lw = logo[0].length;
  assert.deepEqual(dims(readFileSync(join(RAIZ, `${ARQ_LOGO}.sm.png`))), { w: lw * FATOR_SM, h: logo.length * FATOR_SM });
  assert.deepEqual(dims(readFileSync(join(RAIZ, `${ARQ_LOGO}.png`))), { w: lw * FATOR_LG, h: logo.length * FATOR_LG });
  assert.ok(logo.length * FATOR_SM >= 36 && logo.length * FATOR_SM <= 48, "logo .sm deve ter ~40 px de altura");
  assert.deepEqual(dims(readFileSync(join(RAIZ, ARQ_FAVICON))), { w: 64, h: 64 }); // 16 x 4
});

test("pixels dos PNGs gerados só têm cores da paleta mestra (ou transparência total)", () => {
  const mestra = new Set(paleta.colors.map((c) => c.toLowerCase()));
  for (const a of gerarTudo()) {
    // decodifica via zlib: pula assinatura, lê IDAT
    const b = a.bytes;
    const { w, h } = dims(b);
    let off = 8;
    const idat: Buffer[] = [];
    while (off < b.length) {
      const len = b.readUInt32BE(off);
      const tipo = b.subarray(off + 4, off + 8).toString("ascii");
      if (tipo === "IDAT") idat.push(b.subarray(off + 8, off + 8 + len));
      off += 12 + len;
    }
    const cru = inflateSync(Buffer.concat(idat));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = y * (w * 4 + 1) + 1 + x * 4;
        const [r, g, bl, al] = [cru[o], cru[o + 1], cru[o + 2], cru[o + 3]];
        if (al === 0) continue;
        assert.equal(al, 255, `${a.caminho}: alfa parcial em (${x},${y})`);
        const hex = "#" + [r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("");
        assert.ok(mestra.has(hex), `${a.caminho}: ${hex} fora da paleta em (${x},${y})`);
      }
    }
  }
});

test("centralizar e contornar: miolo vai ao centro e o contorno cresce a tela em 2 px", () => {
  assert.deepEqual(centralizar(["Y"], 3, 3), ["...", ".Y.", "..."]);
  assert.throws(() => centralizar(["YY"], 1, 1), /não cabe/);
  assert.deepEqual(contornar(["Y"], 4), [".t.", "tYt", ".t."]);
  assert.deepEqual(contornar(["Y"], 8), ["ttt", "tYt", "ttt"]);
});

test("validarBitmap recusa linha irregular e caractere fora da legenda", () => {
  assert.throws(() => validarBitmap("x", ["YY", "Y"]), /colunas/);
  assert.throws(() => validarBitmap("x", ["?"]), /fora da legenda/);
});

test("ICONS_AVAILABLE não aponta para arquivo inexistente e cobre toda a arte de UI gerada", () => {
  for (const nome of ICONS_AVAILABLE) {
    for (const sufixo of ["", ".sm"]) {
      const f = join(RAIZ, "public/art/imperio/icones", `${nome}${sufixo}.png`);
      assert.ok(existsSync(f), `ICONS_AVAILABLE lista "${nome}" mas falta ${f}`);
    }
  }
  const disponiveis = new Set<string>(ICONS_AVAILABLE);
  for (const nome of ORDEM_ICONES) assert.ok(disponiveis.has(nome), `"${nome}" foi gerado mas não está em ICONS_AVAILABLE`);
});
