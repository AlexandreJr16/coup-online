// Fichas como IMAGEM (PLACEHOLDER de mockup). Funções puras: variante por hash estável,
// faixas do Erário e sprites montados em grade de caracteres (ver bitmaps.ts).
// A arte final (30 sprites + 6 montes) sai de tools/art/fichas.ts; `varianteFicha` é o
// protótipo do `chipSprite(count, playerId)` do plano (B3), com teste em fichas.test.ts.

import {
  colar,
  comContorno,
  disco,
  paraGrade,
  tela,
  type Grade,
  type Paleta,
  PAL,
} from "./bitmaps";

export type Variante = 0 | 1 | 2;
export const NOMES_VARIANTE = ["A · arrumada", "B · torta", "C · espalhada"] as const;
export const MAX_FICHAS = 10;

/** FNV-1a de 32 bits: estável entre execuções e entre clientes. */
export function hashFicha(idJogador: string, quantidade: number): number {
  let h = 0x811c9dc5;
  for (const ch of `${idJogador}:${quantidade}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Opção 1 do DEC-24 (recomendada): a variante depende só de (jogador, quantidade). */
export function varianteFicha(idJogador: string, quantidade: number): Variante {
  return (hashFicha(idJogador, quantidade) % 3) as Variante;
}

/** Opção 2 do DEC-24: a variante troca a cada mudança de quantidade (anda A, B, C, A...). */
export function varianteTroca(mudancas: number): Variante {
  return (((mudancas % 3) + 3) % 3) as Variante;
}

/** 0 = vazio (até 10), 1 = 11-15, 2 = 16-25, 3 = 26+. Usada pelo monte e pelo baú do Erário. */
export type NivelErario = 0 | 1 | 2 | 3;
export function nivelErario(quantidade: number): NivelErario {
  if (quantidade >= 26) return 3;
  if (quantidade >= 16) return 2;
  if (quantidade >= 11) return 1;
  return 0;
}
export const ROTULO_FAIXA: Record<NivelErario, string> = { 0: "0-10", 1: "11-15", 2: "16-25", 3: "26+" };

export type FaixaBaralho = "cheio" | "medio" | "pouco" | "ultima" | "vazio";
export function faixaBaralho(cartas: number): FaixaBaralho {
  if (cartas <= 0) return "vazio";
  if (cartas === 1) return "ultima";
  if (cartas <= 8) return "pouco";
  if (cartas <= 15) return "medio";
  return "cheio";
}

// ── Peças ────────────────────────────────────────────────────────────────────
/** Ficha de lado (pilha). h = face de cima, r = friso lacre, d = sombra. */
const LADO: Grade = ["hhhhhhhhhh", "ggrrggrrgg", "gggggggggg", "dddddddddd"];
/** Ficha deitada, vista de cima (face à mostra). */
const DEITADA_OURO: Grade = ["..hhhhhh..", "hhhhhhhhhh", "ggghhhhggg", "gggggggggg", "..dddddd.."];
const DEITADA_LACRE: Grade = ["..hhhhhh..", "hhhhhhhhhh", "gggrrrrggg", "gggggggggg", "..dddddd.."];

export const PAL_FICHA: Paleta = {
  o: PAL.contorno,
  h: PAL.ouroClaro,
  g: PAL.ouro,
  d: PAL.ouroEscuro,
  r: PAL.lacre,
};
/** Ficha apagada (DEC-22, opção B: 0 fichas mostra uma ficha esmaecida). */
export const PAL_FICHA_APAGADA: Paleta = { o: "#3a3540", h: "#6b6470", g: "#4a4450", d: "#3a3540", r: "#4a4450" };

const LARGURA_FICHA = 10;
const ALTURA_PASSO = 3; // cada ficha empilhada sobe 3 pixels (a sombra da de cima cobre o topo da de baixo)

function pilha(t: ReturnType<typeof tela>, x: number, baseY: number, qtd: number, desvios: number[]): void {
  for (let i = 0; i < qtd; i++) colar(t, LADO, x + (desvios[i % desvios.length] ?? 0), baseY - ALTURA_PASSO * i);
}

function dividir(n: number, maxPorColuna: number): number[] {
  return n <= maxPorColuna ? [n] : [maxPorColuna, n - maxPorColuna];
}

const W = 30;
const H = 24;
const BASE_Y = 17;

/** Posições (x, y) das fichas deitadas da variante C; qualquer prefixo parece espalhado. */
const SLOTS_ESPALHADA: ReadonlyArray<readonly [number, number]> = [
  [10, 18], [1, 18], [19, 18], [5, 13], [15, 13], [10, 8], [1, 8], [19, 8], [10, 3], [10, 13],
];

/** Sprite de `n` fichas (1..10) na variante `v`. Sempre com contorno; tamanho fixo (32x26). */
export function spriteFichas(n: number, v: Variante): Grade {
  const qtd = Math.max(1, Math.min(MAX_FICHAS, Math.floor(n)));
  const t = tela(W, H);
  if (v === 0) {
    // A · arrumada: colunas retas de até 5
    const cols = dividir(qtd, 5);
    const larg = cols.length * LARGURA_FICHA + (cols.length - 1) * 3;
    const x0 = Math.floor((W - larg) / 2);
    cols.forEach((c, i) => pilha(t, x0 + i * (LARGURA_FICHA + 3), BASE_Y, c, [0]));
  } else if (v === 1) {
    // B · torta: colunas tortas de até 6 e uma ficha deitada na frente
    const naPilha = qtd - 1; // uma das fichas é a deitada
    const cols = dividir(naPilha, 6);
    const larg = cols.length * LARGURA_FICHA + (cols.length - 1) * 3;
    const x0 = Math.floor((W - larg) / 2);
    const base = [0, 1, -1, 1, 0, -1];
    const desvios = base.map((_, i) => base[(i + qtd) % base.length]); // gira por quantidade
    cols.forEach((c, i) => {
      if (c > 0) pilha(t, x0 + i * (LARGURA_FICHA + 3), BASE_Y, c, desvios);
    });
    const xf = qtd === 1 ? 10 : Math.min(W - LARGURA_FICHA, x0 + Math.floor(larg / 2) - 3);
    colar(t, qtd % 2 === 0 ? DEITADA_LACRE : DEITADA_OURO, xf, qtd === 1 ? 17 : 18);
  } else {
    // C · espalhada: fichas deitadas com pequeno desvio fixo por posição
    const lista = SLOTS_ESPALHADA.slice(0, qtd).map(([x, y], i) => {
      const jx = ((i * 7 + qtd * 3) % 3) - 1;
      const jy = (i * 5 + qtd) % 2;
      return { x: Math.max(0, Math.min(W - LARGURA_FICHA, x + jx)), y: y + jy, lacre: i % 3 === 1 };
    });
    lista.sort((a, b) => a.y - b.y || a.x - b.x);
    lista.forEach((f) => colar(t, f.lacre ? DEITADA_LACRE : DEITADA_OURO, f.x, f.y));
  }
  return comContorno(paraGrade(t));
}

/** Ficha apagada isolada (DEC-22 B). */
export function spriteFichaApagada(): Grade {
  const t = tela(W, H);
  colar(t, DEITADA_OURO, 10, 18);
  return comContorno(paraGrade(t));
}

// ── Montes (11+) ──────────────────────────────────────────────────────────────
const ALTURAS_MONTE: Record<1 | 2 | 3, [number[], number[]]> = {
  1: [[2, 4, 5, 3], [3, 5, 3, 2]],
  2: [[3, 5, 7, 6, 4], [2, 4, 6, 7, 5, 3]],
  3: [[3, 5, 7, 9, 8, 6, 4, 2], [2, 4, 6, 8, 9, 7, 5, 3]],
};

export function spriteMonte(nivel: 1 | 2 | 3, v: 0 | 1): Grade {
  const alturas = ALTURAS_MONTE[nivel][v];
  const maior = Math.max(...alturas);
  const baseY = ALTURA_PASSO * (maior - 1) + 1;
  const w = (alturas.length - 1) * 8 + LARGURA_FICHA;
  const h = baseY + 7;
  const t = tela(w, h);
  [...alturas.keys()]
    .sort((a, b) => alturas[a] - alturas[b] || a - b)
    .forEach((i) => pilha(t, i * 8, baseY, alturas[i], [0]));
  if (nivel >= 2) colar(t, DEITADA_OURO, 0, baseY + 1);
  if (nivel === 3) {
    colar(t, DEITADA_LACRE, w - LARGURA_FICHA, baseY + 1);
    colar(t, DEITADA_OURO, Math.floor(w / 2) - 5, baseY + 2);
  }
  return comContorno(paraGrade(t));
}

// ── Baú / cofre que enche por faixa ─────────────────────────────────────────────
export const PAL_BAU: Paleta = {
  o: PAL.contorno,
  w: PAL.madeira,
  v: PAL.madeiraEscura,
  x: PAL.madeiraClara,
  m: PAL.cinza,
  k: "#1c120c",
  h: PAL.ouroClaro,
  g: PAL.ouro,
  d: PAL.ouroEscuro,
};

export function spriteBau(nivel: NivelErario): Grade {
  const t = tela(28, 24);
  // tampa aberta, atrás
  colar(t, Array.from({ length: 8 }, (_, i) => (i === 0 ? "x".repeat(22) : "v".repeat(22))), 3, 1);
  // interior escuro
  colar(t, ["k".repeat(22), "k".repeat(22), "k".repeat(22)], 3, 9);
  // ouro conforme o nível
  if (nivel >= 1) colar(t, ["g".repeat(20), "d".repeat(20)], 4, 10);
  if (nivel >= 2) {
    colar(t, ["h".repeat(18), "g".repeat(18), "g".repeat(18)], 5, 7);
    colar(t, disco(4, "g").slice(0, 4), 9, 5);
  }
  if (nivel >= 3) {
    colar(t, ["h".repeat(12), "g".repeat(14), "g".repeat(16)], 7, 4);
    colar(t, disco(3, "h").slice(0, 4), 11, 1);
    colar(t, ["ggg", "ddd"], 1, 12); // transborda pela frente
    colar(t, ["ggg", "ddd"], 24, 12);
  }
  // corpo da frente
  colar(t, Array.from({ length: 10 }, (_, i) => (i === 0 ? "x".repeat(26) : i === 9 ? "v".repeat(26) : "w".repeat(26))), 1, 12);
  colar(t, Array.from({ length: 10 }, () => "mm"), 5, 12);
  colar(t, Array.from({ length: 10 }, () => "mm"), 21, 12);
  colar(t, ["gg", "gg", "dd", "dd"], 13, 14);
  return comContorno(paraGrade(t));
}
