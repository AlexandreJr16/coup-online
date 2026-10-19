import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { encodePng } from "../png";
import { Tela } from "./canvas";
import { CARACTERES_SUPORTADOS, larguraTexto, texto } from "./fonte";
import { arquivosDe, gerarGrupo, gerarTudo, GRUPOS, gravar } from "./gerar";
import { lerPngBuffer } from "./lerpng";
import { APELIDOS, HEX, indiceDe } from "./paleta";
import { folhaDeContato, tira } from "./sheet";

/** Inventário (VIDA_E_BLEFE 13): "grupo/nome" -> quadros e dimensões esperadas. */
const ESPERADO: Record<string, { quadros: number; w: number; h: number; sm?: { w: number; h: number } }> = {
  "dano/rachadura": { quadros: 1, w: 64, h: 92 },
  "dano/curativo": { quadros: 1, w: 64, h: 92 },
  "dano/hematoma": { quadros: 1, w: 64, h: 92 },
  "dano/estilhacos": { quadros: 4, w: 64, h: 92 },
  "carta/rachadura": { quadros: 3, w: 88, h: 124, sm: { w: 40, h: 56 } },
  "carta/mascara-estilhacando": { quadros: 4, w: 88, h: 80, sm: { w: 44, h: 40 } },
  "carta/carimbo-verdade": { quadros: 1, w: 96, h: 28, sm: { w: 49, h: 15 } },
  "carta/carimbo-blefe": { quadros: 1, w: 84, h: 28, sm: { w: 43, h: 15 } },
  "carta/carimbo-exilado": { quadros: 1, w: 96, h: 28, sm: { w: 49, h: 15 } },
  "duelo/faixa-vs": { quadros: 2, w: 104, h: 44 },
  "duelo/gota-suor": { quadros: 3, w: 11, h: 24 },
  "duelo/mao-apontando": { quadros: 2, w: 44, h: 22 },
};

const todas = gerarTudo();

// ── Determinismo ────────────────────────────────────────────────────────────────────────────
test("determinismo: dois runs completos geram exatamente os mesmos bytes", () => {
  const a = arquivosDe(todas);
  const b = arquivosDe(gerarTudo());
  assert.equal(a.length, b.length);
  a.forEach((arq, i) => {
    assert.equal(arq.caminho, b[i].caminho);
    assert.ok(arq.bytes.equals(b[i].bytes), `bytes diferentes em ${arq.caminho}`);
  });
});

test("determinismo: gravar duas vezes em disco produz arquivos idênticos", () => {
  const d1 = mkdtempSync(join(tmpdir(), "fx-a-"));
  const d2 = mkdtempSync(join(tmpdir(), "fx-b-"));
  try {
    const c1 = gravar(d1, todas);
    const c2 = gravar(d2, gerarTudo());
    assert.deepEqual(c1, c2);
    for (const c of c1) assert.ok(readFileSync(join(d1, c)).equals(readFileSync(join(d2, c))), c);
  } finally {
    rmSync(d1, { recursive: true, force: true });
    rmSync(d2, { recursive: true, force: true });
  }
});

// ── Paleta ──────────────────────────────────────────────────────────────────────────────────
test("paleta: todos os apelidos apontam para cores da paleta mestra", () => {
  for (const [nome, i] of Object.entries(APELIDOS)) {
    assert.ok(i >= 0 && i < HEX.length, nome);
    assert.equal(indiceDe(nome), i);
  }
  assert.equal(indiceDe(HEX[7]), 7);
  assert.equal(indiceDe(5), 5);
});

test("paleta: apelido desconhecido, hex fora da paleta e índice inválido são recusados", () => {
  assert.throws(() => indiceDe("rosa-choque"), /desconhecido/);
  assert.throws(() => indiceDe("#123456"), /não está na paleta/);
  assert.throws(() => indiceDe(HEX.length), RangeError);
  assert.throws(() => indiceDe(1.5), RangeError);
  assert.throws(() => indiceDe(-1), RangeError);
});

test("saída: todo pixel dos PNGs gravados é transparente ou cor EXATA da paleta mestra (alfa 0/255)", () => {
  const rgbs = new Set(HEX.map((h) => h.slice(1)));
  for (const arq of arquivosDe(todas)) {
    const { w, h, rgba } = lerPngBuffer(arq.bytes);
    let opacos = 0;
    for (let k = 0; k < w * h; k++) {
      const a = rgba[k * 4 + 3];
      assert.ok(a === 0 || a === 255, `${arq.caminho}: alfa ${a}`);
      if (a === 0) continue;
      opacos++;
      const hex = [0, 1, 2].map((c) => rgba[k * 4 + c].toString(16).padStart(2, "0")).join("");
      assert.ok(rgbs.has(hex), `${arq.caminho}: cor #${hex} fora da paleta`);
    }
    assert.ok(opacos > 0, `${arq.caminho}: quadro vazio`);
  }
});

// ── Inventário: quadros e dimensões ─────────────────────────────────────────────────────────
test("inventário: toda peça esperada existe, e só elas, com a quantidade de quadros do inventário", () => {
  const achadas = Object.fromEntries(todas.map((p) => [`${p.grupo}/${p.nome}`, p]));
  assert.deepEqual(Object.keys(achadas).sort(), Object.keys(ESPERADO).sort());
  for (const [id, e] of Object.entries(ESPERADO)) assert.equal(achadas[id].quadros.length, e.quadros, `${id}: quadros`);
});

test("dimensões: todos os quadros de uma peça têm o tamanho esperado (e .sm, quando existe)", () => {
  for (const p of todas) {
    const id = `${p.grupo}/${p.nome}`;
    const e = ESPERADO[id];
    p.quadros.forEach((q, i) => assert.deepEqual([q.w, q.h], [e.w, e.h], `${id} quadro ${i + 1}`));
    if (e.sm) {
      assert.equal(p.sm?.length, e.quadros, `${id}: sm precisa ter a mesma quantidade de quadros`);
      p.sm?.forEach((q, i) => assert.deepEqual([q.w, q.h], [e.sm?.w, e.sm?.h], `${id} sm ${i + 1}`));
    } else assert.equal(p.sm, undefined, `${id}: não deveria ter .sm`);
  }
});

test("dimensões: camadas de dano cobrem exatamente a moldura 64x92", () => {
  for (const p of gerarGrupo("dano")) for (const q of p.quadros) assert.deepEqual([q.w, q.h], [64, 92]);
});

test("animações: quadros consecutivos são diferentes entre si (nenhum quadro repetido por engano)", () => {
  for (const p of todas) {
    for (const lista of [p.quadros, p.sm ?? []]) {
      for (let i = 1; i < lista.length; i++) assert.ok(!lista[i].igual(lista[i - 1]), `${p.grupo}/${p.nome}: quadro ${i} == ${i + 1}`);
    }
  }
});

test("arquivos: caminhos <grupo>/<nome>/<quadro>.png (1..N) e .sm.png; contagem por grupo", () => {
  const arqs = arquivosDe(todas);
  const caminhos = new Set(arqs.map((a) => a.caminho));
  assert.equal(caminhos.size, arqs.length, "caminhos únicos");
  for (const c of caminhos) assert.match(c, /^(dano|carta|duelo)\/[a-z-]+\/\d+(\.sm)?\.png$/);
  assert.ok(caminhos.has("dano/estilhacos/4.png"));
  assert.ok(!caminhos.has("dano/estilhacos/5.png"));
  const porGrupo = (g: string): number => arqs.filter((a) => a.caminho.startsWith(`${g}/`)).length;
  assert.equal(porGrupo("dano"), 7);
  assert.equal(porGrupo("carta"), 3 + 3 + 4 + 4 + 3 + 3);
  assert.equal(porGrupo("duelo"), 7);
});

test("gravar: escreve os PNGs numa pasta nova com assinatura PNG válida", () => {
  const d = mkdtempSync(join(tmpdir(), "fx-g-"));
  try {
    const escritos = gravar(d, gerarGrupo("duelo"));
    assert.equal(escritos.length, 7);
    assert.deepEqual(readdirSync(join(d, "duelo")).sort(), ["faixa-vs", "gota-suor", "mao-apontando"]);
    for (const c of escritos) {
      assert.ok(statSync(join(d, c)).size > 50);
      assert.deepEqual([...readFileSync(join(d, c)).subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
    }
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("gerarGrupo: grupo desconhecido falha dizendo quais existem", () => {
  assert.throws(() => gerarGrupo("bloqueio"), /dano, carta, duelo/);
  assert.deepEqual(Object.keys(GRUPOS), ["dano", "carta", "duelo"]);
});

// ── Canvas ──────────────────────────────────────────────────────────────────────────────────
test("canvas: set/get só aceitam coordenadas inteiras dentro dos limites", () => {
  const t = new Tela(4, 3);
  t.set(0, 0, "ouro");
  t.set(3, 2, 5);
  assert.equal(t.get(0, 0), indiceDe("ouro"));
  assert.equal(t.get(1, 1), null);
  assert.throws(() => t.set(4, 0, "ouro"), /fora da tela/);
  assert.throws(() => t.set(0, 3, "ouro"), /fora da tela/);
  assert.throws(() => t.set(-1, 0, "ouro"), /fora da tela/);
  assert.throws(() => t.set(0.5, 0, "ouro"), /inteiro/);
  assert.throws(() => t.set(0, 1.25, "ouro"), /inteiro/);
  assert.throws(() => t.set(Number.NaN, 0, "ouro"), /inteiro/);
  assert.throws(() => t.get(0, 3), /fora da tela/);
  assert.throws(() => t.get(0.1, 0), /inteiro/);
  assert.throws(() => t.set(0, 0, "azul-bebe"), /desconhecido/);
});

test("canvas: dimensões precisam ser inteiras e positivas", () => {
  assert.throws(() => new Tela(0, 3), RangeError);
  assert.throws(() => new Tela(2.5, 3), RangeError);
  assert.throws(() => new Tela(3, -1), RangeError);
});

test("canvas: primitivas recusam argumentos fracionários e recortam o que sai da tela", () => {
  const t = new Tela(6, 6);
  assert.throws(() => t.linha(0.5, 0, 3, 3, "ouro"), /inteiro/);
  assert.throws(() => t.retangulo(0, 0, 2.5, 2, "ouro"), /inteiro/);
  assert.throws(() => t.elipse(2, 2, 1.5, 1, "ouro"), /inteiro/);
  assert.throws(() => t.poligono([[0, 0], [3.5, 0], [0, 3]], "ouro"), /inteiro/);
  assert.throws(() => t.carimbar(new Tela(1, 1), 0.2, 0), /inteiro/);
  assert.throws(() => t.deslocar(1.5, 0), /inteiro/);
  assert.throws(() => t.ampliar(1.5), /inteiro/);
  t.linha(-5, 3, 20, 3, "ouro"); // sai pelos dois lados: recorta
  t.retangulo(4, 4, 10, 10, "ouro");
  assert.equal(t.get(0, 3), indiceDe("ouro"));
  assert.equal(t.get(5, 5), indiceDe("ouro"));
});

test("canvas: linha, retângulo (cheio e oco), elipse, polígono e carimbar desenham o esperado", () => {
  const t = new Tela(8, 8);
  t.linha(0, 0, 7, 7, "ouro");
  assert.equal(t.get(3, 3), indiceDe("ouro"));
  assert.equal(t.opacos(), 8);
  const r = new Tela(5, 5);
  r.retangulo(0, 0, 5, 5, "lacre", false);
  assert.equal(r.opacos(), 16);
  assert.equal(r.get(2, 2), null);
  const e = new Tela(9, 9);
  e.elipse(4, 4, 3, 3, "azul");
  assert.equal(e.get(4, 4), indiceDe("azul"));
  assert.equal(e.get(0, 0), null);
  const p = new Tela(6, 6);
  p.poligono([[0, 0], [5, 0], [5, 5], [0, 5]], "verde");
  assert.equal(p.opacos(), 25);
  const base = new Tela(4, 4);
  base.retangulo(0, 0, 4, 4, "tinta");
  const sprite = Tela.deBitmap(["x.", ".x"], { x: "ouro" });
  base.carimbar(sprite, 1, 1);
  assert.equal(base.get(1, 1), indiceDe("ouro"));
  assert.equal(base.get(2, 1), indiceDe("tinta"), "transparente do sprite não apaga");
});

test("canvas: espelhar, deslocar, ampliar e contorno", () => {
  const t = Tela.deBitmap(["x..", "..."], { x: "ouro" });
  assert.equal(t.espelhar().get(2, 0), indiceDe("ouro"));
  assert.equal(t.espelhar(false).get(0, 1), indiceDe("ouro"));
  assert.equal(t.deslocar(1, 1).get(1, 1), indiceDe("ouro"));
  assert.equal(t.deslocar(-1, 0).opacos(), 0, "o que sai da tela se perde");
  const a = t.ampliar(3);
  assert.deepEqual([a.w, a.h], [9, 6]);
  assert.equal(a.opacos(), 9);
  const c = Tela.deBitmap(["x"], { x: "ouro" }).contorno("tinta");
  assert.deepEqual([c.w, c.h], [3, 3]);
  assert.equal(c.opacos(), 5);
  assert.equal(c.get(1, 1), indiceDe("ouro"));
});

test("canvas: deBitmap recusa caractere sem cor na legenda", () => {
  assert.throws(() => Tela.deBitmap(["xy"], { x: "ouro" }), /sem cor/);
});

test("canvas: deRgba quantiza para a cor mais próxima da paleta e ignora alfa baixo", () => {
  const rgba = new Uint8Array([255, 250, 240, 255, 1, 2, 3, 255, 200, 0, 0, 10]);
  const t = Tela.deRgba(3, 1, rgba);
  assert.equal(t.get(0, 0), indiceDe("branco"));
  assert.equal(t.get(1, 0), indiceDe("tinta"));
  assert.equal(t.get(2, 0), null);
});

test("lerPng: lê de volta o que encodePng escreveu", () => {
  const rgba = new Uint8Array([10, 20, 30, 255, 0, 0, 0, 0, 1, 2, 3, 255, 9, 8, 7, 255]);
  const r = lerPngBuffer(encodePng(2, 2, rgba));
  assert.deepEqual([r.w, r.h], [2, 2]);
  assert.deepEqual([...r.rgba], [...rgba]);
  assert.throws(() => lerPngBuffer(Buffer.from("nao e png")), /não é PNG/);
});

// ── Micro-fonte ─────────────────────────────────────────────────────────────────────────────
test("fonte: glifo 5x7, largura do texto e escala", () => {
  assert.equal(larguraTexto(""), 0);
  assert.equal(larguraTexto("A"), 5);
  assert.equal(larguraTexto("AB"), 11);
  assert.equal(larguraTexto("A B"), 5 + 1 + 3 + 1 + 5);
  assert.equal(larguraTexto("AB", 2), 22);
  assert.throws(() => larguraTexto("A", 1.5), RangeError);
  const t = new Tela(7, 9);
  texto(t, "I", 1, 1, "ouro");
  assert.equal(t.get(3, 1), indiceDe("ouro"));
  assert.equal(t.get(3, 7), indiceDe("ouro"));
  assert.equal(t.get(1, 8), null, "o glifo tem 7 linhas");
});

test("fonte: acentos (Á Ã Ê Ç) desenham marcas extras, minúsculas viram maiúsculas, caractere ausente falha", () => {
  const desenho = (s: string): Tela => {
    const t = new Tela(20, 14);
    texto(t, s, 2, 3, "ouro");
    return t;
  };
  const a = desenho("A");
  for (const acentuado of ["Á", "Ã", "Â", "Ç"]) {
    const letra = acentuado === "Ç" ? "C" : "A";
    assert.ok(desenho(acentuado).opacos() > desenho(letra).opacos(), acentuado);
  }
  assert.equal(desenho("Á").get(5, 1), indiceDe("ouro"), "agudo fica acima do glifo (y-2)");
  assert.equal(desenho("Á").get(4, 2), indiceDe("ouro"), "agudo fica acima do glifo (y-1)");
  assert.equal(desenho("Ç").get(4, 10), indiceDe("ouro"), "cedilha fica abaixo da base (y+7)");
  assert.ok(desenho("a").igual(a), "minúscula = maiúscula");
  assert.throws(() => texto(new Tela(20, 14), "@", 0, 3, "ouro"), /não tem o caractere/);
  for (const ch of "VERDADE BLEFE! EXILADO CONTESTADO BLOQUEIO VS") assert.ok(CARACTERES_SUPORTADOS.includes(ch), ch);
});

test("fonte: sombra aparece deslocada e a cor da letra fica por cima", () => {
  const t = new Tela(10, 12);
  texto(t, "I", 0, 0, "ouro", { sombra: "tinta" });
  assert.equal(t.get(2, 0), indiceDe("ouro"));
  assert.equal(t.get(3, 1), indiceDe("tinta"));
});

test("carimbos: o texto aparece de verdade (cores da letra presentes) e cada um tem sua cor de borda", () => {
  const por = Object.fromEntries(todas.map((p) => [p.nome, p]));
  assert.ok(por["carimbo-verdade"].quadros[0].coresUsadas().includes(indiceDe("ouroClaro")));
  assert.ok(por["carimbo-blefe"].quadros[0].coresUsadas().includes(indiceDe("vermelho")));
  assert.ok(por["carimbo-exilado"].quadros[0].coresUsadas().includes(indiceDe("prata")));
  assert.ok(!por["carimbo-verdade"].quadros[0].igual(por["carimbo-exilado"].quadros[0]));
});

// ── Folha de contato ────────────────────────────────────────────────────────────────────────
test("sheet: tira soma larguras e espaços; folha de contato usa só a paleta e cabe todas as peças", () => {
  const a = new Tela(3, 2);
  const b = new Tela(5, 4);
  const t = tira([a, b], 2);
  assert.deepEqual([t.w, t.h], [10, 4]);
  assert.throws(() => tira([]), /sem quadros/);
  const folha = folhaDeContato(todas);
  assert.ok(folha.w > 100 && folha.h > 100);
  assert.ok(folha.coresUsadas().every((i) => i < HEX.length));
  const png = lerPngBuffer(folha.png());
  assert.deepEqual([png.w, png.h], [folha.w, folha.h]);
});
