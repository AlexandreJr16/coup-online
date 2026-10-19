// Gerador procedural das FICHAS (P07 / PLANO_V3 B3): pixel art determinística, só com a paleta
// mestra (tools/art/palette.json), reaproveitando a infra de tools/art/fx (Tela, apelidos, fonte).
//
//   npx tsx tools/art/fichas.ts                       # grava public/art/imperio/fichas/**
//   npx tsx tools/art/fichas.ts --out /tmp/f --folha /tmp/contato.png --zoom 3
//
// Saída (pixels inteiros, alfa só 0 ou 255, contorno de 1 px em "tinta"):
//   fichas/<n>/<a|b|c>.png          n = 1..10, 32x26      a arrumada, b torta, c espalhada
//   fichas/monte/<11-15|16-25|26+>/<a|b>.png              montes do Erário (tamanho cresce com a faixa)
//   fichas/bau/<vazio|11-15|16-25|26+>.png, 30x26         baú que enche
// Não há `.sm.png`: os sprites já são pequenos (a base é 32x26) e o CSS amplia por inteiros.
// Seed fixa: a única aleatoriedade é `mulberry32` com semente derivada de (quantidade, variante).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { mulberry32, Tela } from "./fx/canvas";
import { larguraTexto, texto } from "./fx/fonte";

export const VARIANTES = ["a", "b", "c"] as const;
export type NomeVariante = (typeof VARIANTES)[number];
export const MAX_FICHAS = 10;
export const FAIXAS_MONTE = ["11-15", "16-25", "26+"] as const;
export const NIVEIS_BAU = ["vazio", "11-15", "16-25", "26+"] as const;
export const VARIANTES_MONTE = ["a", "b"] as const;

/** Tela útil dos sprites de 1 a 10 (sem contorno); com contorno ficam 32x26. */
const W = 30;
const H = 24;
const BASE_Y = 17;
const LARGURA_FICHA = 10;
const PASSO = 3; // cada ficha empilhada sobe 3 px: a sombra da de cima cobre o topo da de baixo

const LEGENDA = { h: "ouroClaro", g: "ouro", d: "ouroEscuro", r: "lacre" } as const;

// ── Peças de uma ficha ──────────────────────────────────────────────────────────────────────
/** De lado (empilhada): topo claro, friso lacre, corpo, sombra. Pontas aparadas dão o cilindro. */
const LADO = Tela.deBitmap([".hhhhhhhh.", "ggrrggrrgg", "gggggggggg", ".dddddddd."], LEGENDA);
/** Deitada, vista de cima (face à mostra), com o selo de ouro ou de lacre no meio. */
const DEITADA_OURO = Tela.deBitmap(["..hhhhhh..", "hhhhhhhhhh", "ggghhhhggg", "gggggggggg", "..dddddd.."], LEGENDA);
const DEITADA_LACRE = Tela.deBitmap(["..hhhhhh..", "hhhhhhhhhh", "gggrrrrggg", "gggggggggg", "..dddddd.."], LEGENDA);
/** Em pé, de frente (para a variante espalhada): borda, anel e selo lacre. */
const DE_FRENTE = Tela.deBitmap(
  [
    "..hhhhh..",
    ".hgggggg.",
    "hggrrrggd",
    "hgrhhhrgd",
    "hgrhhhrgd",
    "hgrhhhrgd",
    "hggrrrggd",
    ".gggggdd.",
    "..ddddd..",
  ],
  LEGENDA,
);

function pilha(t: Tela, x: number, baseY: number, qtd: number, desvio: (i: number) => number): void {
  for (let i = 0; i < qtd; i++) t.carimbar(LADO, x + desvio(i), baseY - PASSO * i);
}

function dividir(n: number, maxPorColuna: number): number[] {
  return n <= maxPorColuna ? [n] : [maxPorColuna, n - maxPorColuna];
}

/** Posição x inicial de `k` colunas lado a lado (10 px de ficha + 3 de vão), centradas na tela de largura `w`. */
function xInicial(k: number, w: number): number {
  return Math.floor((w - (k * LARGURA_FICHA + (k - 1) * 3)) / 2);
}

// ── Variante A: arrumada ────────────────────────────────────────────────────────────────────
function arrumada(n: number): Tela {
  const t = new Tela(W, H);
  const cols = dividir(n, 5);
  const x0 = xInicial(cols.length, W);
  cols.forEach((c, i) => pilha(t, x0 + i * (LARGURA_FICHA + 3), BASE_Y, c, () => 0));
  return t;
}

// ── Variante B: torta (colunas que se inclinam + uma ficha deitada na frente) ────────────────
function torta(n: number): Tela {
  const t = new Tela(W, H);
  const dir = n % 2 === 0 ? 1 : -1; // inclina para um lado ou para o outro conforme a quantidade
  const naPilha = n - 1; // uma das fichas é a deitada
  const cols = naPilha > 0 ? dividir(naPilha, 6) : [];
  const x0 = xInicial(Math.max(cols.length, 1), W);
  // inclinação em degraus: 0,0,1,1,2,2 (quase reta embaixo, tombando no alto) e um tremor curto
  const tremor = [0, 1, 0, -1, 1, 0];
  cols.forEach((c, i) => {
    const sinal = i === 0 ? dir : -dir;
    pilha(t, x0 + i * (LARGURA_FICHA + 3), BASE_Y, c, (k) =>
      sinal * Math.floor(k / 2) + (k > 0 ? tremor[(k + n) % tremor.length] : 0),
    );
  });
  const meio = x0 + Math.floor((cols.length * LARGURA_FICHA + (cols.length - 1) * 3) / 2);
  const xf = naPilha === 0 ? 10 : Math.max(0, Math.min(W - LARGURA_FICHA, meio - 5 + dir * 4));
  t.carimbar(n % 2 === 0 ? DEITADA_LACRE : DEITADA_OURO, xf, naPilha === 0 ? 17 : 18);
  return t;
}

// ── Variante C: espalhada (deitadas sobre a mesa, algumas em pé, desvio fixo por posição) ────
/** Linhas de base (y de baixo) e colunas: 3+2+3+2 fichas, de frente para o fundo, em xadrez. */
const SLOTS_C: ReadonlyArray<readonly [x: number, base: number]> = [
  [10, 24], [0, 24], [20, 24], // frente
  [5, 19], [16, 19], // segunda fileira, deslocada
  [10, 14], [0, 14], [20, 14], // terceira
  [5, 9], [16, 9], // fundo
];

function espalhada(n: number): Tela {
  const t = new Tela(W, H);
  const rnd = mulberry32(7000 + n * 31);
  // fichas em pé (de frente) só quando há espaço em volta: variam a cara do monte pequeno
  const emPe = (i: number): boolean => (n === 1 && i === 0) || (n <= 3 && i === 1) || (n === 5 && i === 4);
  const itens = SLOTS_C.slice(0, n).map(([x, base], i) => {
    const frente = emPe(i);
    const larg = frente ? 9 : LARGURA_FICHA;
    const alt = frente ? 9 : 5;
    const jx = Math.floor(rnd() * 3) - 1; // -1..1
    const jy = Math.floor(rnd() * 3) - 1; // -1..1
    return {
      x: Math.max(0, Math.min(W - larg, x + jx)),
      y: Math.max(0, Math.min(H - alt, base - alt + jy)),
      frente,
      lacre: (i * 7 + n) % 3 === 1,
      base: base + jy,
    };
  });
  itens.sort((a, b) => a.base - b.base || a.x - b.x); // o de trás primeiro
  for (const f of itens) t.carimbar(f.frente ? DE_FRENTE : f.lacre ? DEITADA_LACRE : DEITADA_OURO, f.x, f.y);
  return t;
}

/** Sprite de `n` fichas (1..10) na variante `v` (0 a, 1 b, 2 c), com contorno: 32x26. */
export function telaFichas(n: number, v: 0 | 1 | 2): Tela {
  if (!Number.isInteger(n) || n < 1 || n > MAX_FICHAS) throw new RangeError(`quantidade fora de 1..${MAX_FICHAS}: ${n}`);
  const base = v === 0 ? arrumada(n) : v === 1 ? torta(n) : espalhada(n);
  return base.contorno("tinta");
}

// ── Montes do Erário (11+) ──────────────────────────────────────────────────────────────────
type NivelMonte = 1 | 2 | 3;
/** Alturas (em fichas) das colunas, da esquerda para a direita; a variante b muda forma e inclinação. */
const MONTES: Record<NivelMonte, [number[], number[]]> = {
  1: [[2, 4, 5, 2], [3, 5, 3, 2]],
  2: [[2, 4, 6, 5, 3], [3, 5, 4, 6, 2]],
  3: [[2, 4, 6, 8, 7, 5, 3], [3, 5, 7, 9, 6, 4, 2]],
};

export function telaMonte(nivel: NivelMonte, v: 0 | 1): Tela {
  const alturas = MONTES[nivel][v];
  const maior = Math.max(...alturas);
  const baseY = PASSO * (maior - 1) + 1;
  const w = (alturas.length - 1) * 8 + LARGURA_FICHA + 2;
  const h = baseY + 8;
  const t = new Tela(w, h);
  const rnd = mulberry32(9100 + nivel * 17 + v * 5);
  // colunas baixas primeiro (ficam atrás), as altas por cima; b ganha pequeno tremor por coluna
  [...alturas.keys()]
    .sort((a, b) => alturas[a] - alturas[b] || a - b)
    .forEach((i) => {
      const tremor = v === 1 ? Math.floor(rnd() * 3) - 1 : 0;
      pilha(t, 1 + i * 8, baseY, alturas[i], (k) => (v === 1 && k >= 3 ? tremor : 0));
    });
  // fichas caídas na frente: quanto maior o monte, mais espalhadas
  const frente: Array<readonly [number, boolean]> = [
    [1, false],
    [w - LARGURA_FICHA - 1, true],
    [Math.floor(w / 2) - 5, false],
  ];
  const quantas = nivel === 1 ? (v === 0 ? 0 : 1) : nivel === 2 ? 2 : 3;
  frente.slice(0, quantas).forEach(([x, lacre], i) => {
    t.carimbar(lacre ? DEITADA_LACRE : DEITADA_OURO, x, baseY + (i === 2 ? 3 : 2));
  });
  return t.contorno("tinta");
}

// ── Baú que enche ───────────────────────────────────────────────────────────────────────────
const LEG_BAU = { x: "couro", w: "marromMedio", v: "marrom", m: "cinza", p: "prata", k: "marromEscuro", h: "ouroClaro", g: "ouro", d: "ouroEscuro" } as const;

function retBau(t: Tela, x: number, y: number, w: number, h: number, cor: keyof typeof LEG_BAU): void {
  t.retangulo(x, y, w, h, LEG_BAU[cor]);
}

/** Monte de ouro em degraus: cada linha é [y, x0, x1]; a de cima ganha o brilho. */
function montinho(t: Tela, linhas: ReadonlyArray<readonly [number, number, number]>): void {
  linhas.forEach(([y, x0, x1], i) => t.retangulo(x0, y, x1 - x0 + 1, 1, i === 0 ? "ouroClaro" : "ouro"));
}

export function telaBau(nivel: 0 | 1 | 2 | 3): Tela {
  const t = new Tela(28, 24);
  // tampa aberta, atrás: aro claro em cima e madeira escura
  retBau(t, 3, 1, 22, 8, "v");
  retBau(t, 3, 1, 22, 1, "x");
  retBau(t, 3, 1, 1, 8, "x");
  // interior escuro
  retBau(t, 3, 9, 22, 3, "k");
  // ouro conforme o nível: cheio até a boca, monte médio, monte que passa da tampa
  if (nivel >= 1) {
    retBau(t, 4, 9, 20, 1, "h");
    retBau(t, 4, 10, 20, 1, "g");
    retBau(t, 4, 11, 20, 1, "d");
    montinho(t, [[8, 8, 19]]);
  }
  if (nivel >= 2) {
    montinho(t, [[6, 10, 17], [7, 7, 20], [8, 5, 22]]);
  }
  if (nivel >= 3) {
    montinho(t, [[2, 12, 15], [3, 10, 17], [4, 8, 19], [5, 6, 21], [6, 5, 22], [7, 4, 23], [8, 4, 23]]);
  }
  // corpo da frente: borda clara em cima, madeira, base escura, ferragens e fecho de ouro
  retBau(t, 1, 12, 26, 10, "w");
  retBau(t, 1, 12, 26, 1, "x");
  retBau(t, 1, 21, 26, 1, "v");
  for (const x of [5, 21]) {
    retBau(t, x, 12, 2, 10, "m");
    retBau(t, x, 12, 1, 10, "p");
  }
  retBau(t, 13, 14, 2, 2, "g");
  retBau(t, 13, 16, 2, 2, "d");
  t.set(13, 14, "ouroClaro");
  // transbordando: fichas soltas caídas na frente do baú
  if (nivel >= 3) {
    t.carimbar(DEITADA_OURO, 16, 19);
    t.carimbar(DEITADA_LACRE, 0, 18);
  }
  return t.contorno("tinta");
}

// ── Conjunto, gravação e folha de contato ───────────────────────────────────────────────────
export interface ArquivoFicha {
  /** relativo a `public/art/imperio/fichas/` */
  caminho: string;
  tela: Tela;
}

export function gerarFichas(): ArquivoFicha[] {
  const saida: ArquivoFicha[] = [];
  for (let n = 1; n <= MAX_FICHAS; n++) {
    VARIANTES.forEach((nome, v) => saida.push({ caminho: `${n}/${nome}.png`, tela: telaFichas(n, v as 0 | 1 | 2) }));
  }
  FAIXAS_MONTE.forEach((faixa, i) => {
    VARIANTES_MONTE.forEach((nome, v) => saida.push({ caminho: `monte/${faixa}/${nome}.png`, tela: telaMonte((i + 1) as NivelMonte, v as 0 | 1) }));
  });
  NIVEIS_BAU.forEach((nivel, i) => saida.push({ caminho: `bau/${nivel}.png`, tela: telaBau(i as 0 | 1 | 2 | 3) }));
  return saida;
}

export function gravarFichas(raiz: string, arquivos: readonly ArquivoFicha[] = gerarFichas()): string[] {
  for (const a of arquivos) {
    const destino = join(raiz, a.caminho);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, a.tela.png());
  }
  return arquivos.map((a) => a.caminho);
}

/** Folha de contato (sobre fundo de mesa): colunas 1..10 x variantes A/B/C, depois montes e baús. */
export function folhaDeFichas(): Tela {
  const PAD = 3;
  const CEL_W = 34;
  const CEL_H = 28;
  const pecas = new Map(gerarFichas().map((a) => [a.caminho, a.tela]));
  const margemX = 10;
  const topo = 9;
  const larguraTotal = margemX + MAX_FICHAS * CEL_W + PAD;
  const montes = FAIXAS_MONTE.flatMap((f) => VARIANTES_MONTE.map((v) => ({ rotulo: `${f} ${v.toUpperCase()}`, tela: pecas.get(`monte/${f}/${v}.png`) as Tela })));
  const baus = NIVEIS_BAU.map((n) => ({ rotulo: n, tela: pecas.get(`bau/${n}.png`) as Tela }));
  const linhaExtra = (itens: ReadonlyArray<{ rotulo: string; tela: Tela }>): { w: number; h: number } => ({
    w: itens.reduce((s, i) => s + Math.max(i.tela.w, larguraTexto(i.rotulo)) + 6, 0),
    h: Math.max(...itens.map((i) => i.tela.h)) + 9,
  });
  const lm = linhaExtra(montes);
  const lb = linhaExtra(baus);
  const alturaTotal = topo + 3 * CEL_H + PAD + lm.h + PAD + lb.h + PAD;
  const folha = new Tela(Math.max(larguraTotal, lm.w + PAD, lb.w + PAD), alturaTotal);
  // fundo de mesa (verde-floresta liso), para ver a legibilidade como no jogo
  folha.retangulo(0, 0, folha.w, folha.h, "florestaEscuro");
  for (let n = 1; n <= MAX_FICHAS; n++) {
    const rot = String(n);
    texto(folha, rot, margemX + (n - 1) * CEL_W + Math.floor((CEL_W - larguraTexto(rot)) / 2), 1, "creme");
    VARIANTES.forEach((v, i) => folha.carimbar(pecas.get(`${n}/${v}.png`) as Tela, margemX + (n - 1) * CEL_W + 1, topo + i * CEL_H));
  }
  VARIANTES.forEach((v, i) => texto(folha, v.toUpperCase(), 2, topo + i * CEL_H + 10, "ouroClaro"));
  const desenhar = (itens: ReadonlyArray<{ rotulo: string; tela: Tela }>, y0: number): void => {
    let x = PAD;
    for (const it of itens) {
      const w = Math.max(it.tela.w, larguraTexto(it.rotulo));
      texto(folha, it.rotulo, x, y0, "creme");
      folha.carimbar(it.tela, x + Math.floor((w - it.tela.w) / 2), y0 + 9);
      x += w + 6;
    }
  };
  desenhar(montes, topo + 3 * CEL_H + PAD);
  desenhar(baus, topo + 3 * CEL_H + PAD + lm.h + PAD);
  return folha;
}

function main(): void {
  const args = process.argv.slice(2);
  const flag = (n: string): string | undefined => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : undefined);
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const saida = resolve(flag("out") ?? join(raiz, "public", "art", "imperio", "fichas"));
  const escritos = gravarFichas(saida);
  console.log(`${escritos.length} PNG(s) em ${saida}`);
  const folha = flag("folha");
  if (folha) {
    const destino = resolve(folha);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, folhaDeFichas().pngAmpliado(Number(flag("zoom") ?? "4")));
    console.log(`folha de contato: ${destino}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
