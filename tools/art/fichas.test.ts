// Testes do gerador de fichas (P07.S1): determinismo, paleta mestra, dimensões e inventário.
// Rodar: node --import tsx --test tools/art/fichas.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { HEX } from "./fx/paleta";
import { lerPngBuffer } from "./fx/lerpng";
import { FAIXAS_MONTE, folhaDeFichas, gerarFichas, gravarFichas, MAX_FICHAS, NIVEIS_BAU, telaBau, telaFichas, telaMonte, VARIANTES } from "./fichas";

const todas = gerarFichas();
const porCaminho = new Map(todas.map((a) => [a.caminho, a.tela]));
const tela = (c: string) => porCaminho.get(c) as NonNullable<ReturnType<typeof porCaminho.get>>;

test("inventário: 30 sprites + 6 montes + 4 baús = 40 arquivos, com os nomes do contrato", () => {
  assert.equal(todas.length, 40);
  const esperados = new Set<string>();
  for (let n = 1; n <= MAX_FICHAS; n++) for (const v of ["a", "b", "c"]) esperados.add(`${n}/${v}.png`);
  for (const f of ["11-15", "16-25", "26+"]) for (const v of ["a", "b"]) esperados.add(`monte/${f}/${v}.png`);
  for (const n of ["vazio", "11-15", "16-25", "26+"]) esperados.add(`bau/${n}.png`);
  assert.deepEqual(new Set(todas.map((a) => a.caminho)), esperados);
  assert.equal(new Set(todas.map((a) => a.caminho)).size, 40, "caminhos únicos");
  assert.deepEqual([...VARIANTES], ["a", "b", "c"]);
  assert.deepEqual([...FAIXAS_MONTE], ["11-15", "16-25", "26+"]);
  assert.deepEqual([...NIVEIS_BAU], ["vazio", "11-15", "16-25", "26+"]);
});

test("determinismo: dois runs geram exatamente os mesmos bytes", () => {
  const b = gerarFichas();
  assert.equal(b.length, todas.length);
  todas.forEach((a, i) => {
    assert.equal(a.caminho, b[i].caminho);
    assert.ok(a.tela.png().equals(b[i].tela.png()), `bytes diferentes em ${a.caminho}`);
  });
});

test("determinismo: gravar duas vezes em disco produz arquivos idênticos e a árvore esperada", () => {
  const d1 = mkdtempSync(join(tmpdir(), "fichas-a-"));
  const d2 = mkdtempSync(join(tmpdir(), "fichas-b-"));
  try {
    const c1 = gravarFichas(d1);
    const c2 = gravarFichas(d2, gerarFichas());
    assert.deepEqual(c1, c2);
    for (const c of c1) {
      assert.ok(readFileSync(join(d1, c)).equals(readFileSync(join(d2, c))), c);
      assert.equal(readFileSync(join(d1, c)).subarray(1, 4).toString("ascii"), "PNG");
    }
    assert.equal(readdirSync(join(d1, "bau")).length, 4);
    assert.equal(statSync(join(d1, "monte", "26+")).isDirectory(), true);
  } finally {
    rmSync(d1, { recursive: true, force: true });
    rmSync(d2, { recursive: true, force: true });
  }
});

test("a arte versionada em public/art/imperio/fichas é a que o gerador produz hoje (nada velho nem editado à mão sem querer)", () => {
  const raiz = join(process.cwd(), "public", "art", "imperio", "fichas");
  for (const a of todas) {
    assert.ok(readFileSync(join(raiz, a.caminho)).equals(a.tela.png()), `${a.caminho} difere do gerador: rode npx tsx tools/art/fichas.ts`);
  }
});

test("paleta: todo pixel é transparente ou cor EXATA da paleta mestra, alfa só 0 ou 255, nenhum quadro vazio", () => {
  const rgbs = new Set(HEX.map((h) => h.slice(1)));
  for (const a of todas) {
    const { w, h, rgba } = lerPngBuffer(a.tela.png());
    assert.deepEqual([w, h], [a.tela.w, a.tela.h]);
    let opacos = 0;
    for (let k = 0; k < w * h; k++) {
      const alfa = rgba[k * 4 + 3];
      assert.ok(alfa === 0 || alfa === 255, `${a.caminho}: alfa ${alfa}`);
      if (alfa === 0) continue;
      opacos++;
      const hex = [0, 1, 2].map((c) => rgba[k * 4 + c].toString(16).padStart(2, "0")).join("");
      assert.ok(rgbs.has(hex), `${a.caminho}: cor #${hex} fora da paleta`);
    }
    assert.ok(opacos > 20, `${a.caminho}: quase vazio`);
  }
});

test("dimensões: de 1 a 10 todos têm 32x26 (a mesma caixa para o CSS); baús 30x26", () => {
  for (let n = 1; n <= MAX_FICHAS; n++) {
    for (const v of VARIANTES) assert.deepEqual([tela(`${n}/${v}.png`).w, tela(`${n}/${v}.png`).h], [32, 26], `${n}/${v}`);
  }
  for (const n of NIVEIS_BAU) assert.deepEqual([tela(`bau/${n}.png`).w, tela(`bau/${n}.png`).h], [30, 26], `bau/${n}`);
});

test("dimensões: as duas variantes do monte têm o tamanho da faixa, e o monte cresce com a faixa", () => {
  const larg = FAIXAS_MONTE.map((f) => tela(`monte/${f}/a.png`).w);
  const alt = FAIXAS_MONTE.map((f) => tela(`monte/${f}/a.png`).h);
  assert.ok(larg[0] < larg[1] && larg[1] < larg[2], `larguras ${larg}`);
  assert.ok(alt[0] < alt[1] && alt[1] < alt[2], `alturas ${alt}`);
  for (const f of FAIXAS_MONTE) {
    // a variante b tem outra forma, mas cabe numa caixa da mesma ordem de grandeza
    assert.ok(Math.abs(tela(`monte/${f}/a.png`).w - tela(`monte/${f}/b.png`).w) <= 4, f);
  }
});

test("o conteúdo cresce com a quantidade: mais fichas, mais pixels opacos (variantes a e b)", () => {
  for (const v of ["a", "b"] as const) {
    for (let n = 2; n <= MAX_FICHAS; n++) {
      assert.ok(tela(`${n}/${v}.png`).opacos() > tela(`${n - 1}/${v}.png`).opacos(), `${v}: ${n} não tem mais pixels que ${n - 1}`);
    }
  }
});

test("variantes diferentes da mesma quantidade DIFEREM (nada de ctrl+c ctrl+v)", () => {
  for (let n = 1; n <= MAX_FICHAS; n++) {
    const [a, b, c] = VARIANTES.map((v) => tela(`${n}/${v}.png`));
    assert.ok(!a.igual(b), `${n}: a == b`);
    assert.ok(!a.igual(c), `${n}: a == c`);
    assert.ok(!b.igual(c), `${n}: b == c`);
  }
  for (const f of FAIXAS_MONTE) assert.ok(!tela(`monte/${f}/a.png`).igual(tela(`monte/${f}/b.png`)), `monte ${f}`);
});

test("quantidades diferentes nunca produzem o mesmo quadro (mesma variante)", () => {
  for (const v of VARIANTES) {
    const vistos = new Set<string>();
    for (let n = 1; n <= MAX_FICHAS; n++) vistos.add(tela(`${n}/${v}.png`).png().toString("hex"));
    assert.equal(vistos.size, MAX_FICHAS, `variante ${v}`);
  }
});

test("baús: os 4 níveis são todos diferentes e o ouro aumenta a cada nível", () => {
  const baus = NIVEIS_BAU.map((n) => tela(`bau/${n}.png`));
  for (let i = 1; i < baus.length; i++) assert.ok(baus[i].opacos() >= baus[i - 1].opacos() && !baus[i].igual(baus[i - 1]), `nível ${i}`);
  const ouro = (t: (typeof baus)[number]): number => {
    const i = HEX.indexOf("#d9a028");
    let n = 0;
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) if (t.get(x, y) === i) n++;
    return n;
  };
  const ouros = baus.map(ouro);
  assert.ok(ouros[0] === 0 || ouros[0] < ouros[1], `ouro por nível: ${ouros}`);
  assert.ok(ouros[1] < ouros[2] && ouros[2] < ouros[3], `ouro por nível: ${ouros}`);
});

test("entradas inválidas são recusadas (0, 11 e fracionário não têm sprite de 1 a 10)", () => {
  assert.throws(() => telaFichas(0, 0), RangeError);
  assert.throws(() => telaFichas(11, 0), RangeError);
  assert.throws(() => telaFichas(2.5, 1), RangeError);
});

test("as funções de tela são puras: chamar de novo devolve a mesma imagem", () => {
  assert.ok(telaFichas(7, 2).igual(telaFichas(7, 2)));
  assert.ok(telaMonte(3, 1).igual(telaMonte(3, 1)));
  assert.ok(telaBau(2).igual(telaBau(2)));
});

test("folha de contato: monta sem erro e usa só a paleta", () => {
  const f = folhaDeFichas();
  assert.ok(f.w > 300 && f.h > 150);
  for (const i of f.coresUsadas()) assert.ok(i >= 0 && i < HEX.length);
});
