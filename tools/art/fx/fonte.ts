// Micro-fonte bitmap 5x7 (maiúsculas, dígitos e alguns sinais), com acentos do português
// (Á Ã Â É Ê Í Ó Ô Õ Ú Ç). Desenhada à mão aqui: o gerador não depende de fonte do sistema,
// então o PNG sai igual em qualquer máquina. Letras minúsculas viram maiúsculas.
import { Tela } from "./canvas";
import type { Cor } from "./paleta";

export const LARGURA_GLIFO = 5;
export const ALTURA_GLIFO = 7;
/** Linhas livres que o acento agudo/til/circunflexo ocupa ACIMA do glifo (y-2 e y-1). */
export const ALTURA_ACENTO = 2;
/** Linhas que a cedilha ocupa ABAIXO do glifo (y+7 e y+8). */
export const ALTURA_CEDILHA = 2;

const G: Record<string, readonly string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#.#.#", "#..##", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "$": ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "_": [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
};

/** Acentos acima do glifo (2 linhas) e cedilha abaixo (2 linhas). */
const ACENTO_AGUDO = ["...#.", "..#.."] as const;
const ACENTO_CIRCUNFLEXO = ["..#..", ".#.#."] as const;
const ACENTO_TIL = [".##.#", "#.##."] as const;
const CEDILHA = ["..#..", ".##.."] as const;

const LARGURA_ESPACO = 3;

/** Caracteres que a fonte sabe desenhar (maiúsculas, dígitos, sinais, espaço e os acentuados). */
export const CARACTERES_SUPORTADOS: readonly string[] = [...Object.keys(G), " ", ..."ÁÃÂÉÊÍÓÔÕÚÇ"];

interface Decomposto {
  base: string;
  marca: "" | "́" | "̂" | "̃" | "̧";
}

function decompor(ch: string): Decomposto {
  const [base, marca = ""] = ch.toUpperCase().normalize("NFD");
  return { base, marca: marca as Decomposto["marca"] };
}

function glifoDe(base: string, ch: string): readonly string[] {
  const g = G[base];
  if (!g) throw new Error(`a micro-fonte não tem o caractere "${ch}"`);
  return g;
}

/** Largura em pixels do texto (sem a sobra do espaçamento final). */
export function larguraTexto(texto: string, escala = 1): number {
  if (!Number.isInteger(escala) || escala < 1) throw new RangeError("escala precisa ser inteiro >= 1");
  const cs = [...texto];
  if (cs.length === 0) return 0;
  const total = cs.reduce((s, ch, i) => s + (ch === " " ? LARGURA_ESPACO : LARGURA_GLIFO) + (i < cs.length - 1 ? 1 : 0), 0);
  return total * escala;
}

export interface OpcoesTexto {
  escala?: number;
  /** Cor da sombra deslocada 1 px (em pixels do texto ampliado: `escala`) para baixo e à direita. */
  sombra?: Cor;
}

/**
 * Desenha `texto` com o canto superior esquerdo do glifo (sem acento) em (x, y).
 * Acentos ocupam `ALTURA_ACENTO * escala` linhas acima de y; cedilha, abaixo da base.
 */
export function texto(tela: Tela, str: string, x: number, y: number, cor: Cor, opcoes: OpcoesTexto = {}): void {
  const k = opcoes.escala ?? 1;
  if (!Number.isInteger(k) || k < 1) throw new RangeError("escala precisa ser inteiro >= 1");
  const pintar = (ox: number, oy: number, c: Cor): void => {
    let cx = x + ox;
    for (const ch of str) {
      if (ch === " ") {
        cx += (LARGURA_ESPACO + 1) * k;
        continue;
      }
      const { base, marca } = decompor(ch);
      const g = glifoDe(base, ch);
      const bloco = (gx: number, gy: number): void => tela.retangulo(cx + gx * k, y + oy + gy * k, k, k, c);
      g.forEach((linha, gy) => [...linha].forEach((v, gx) => v === "#" && bloco(gx, gy)));
      const marcas: readonly string[] =
        marca === "́" ? ACENTO_AGUDO : marca === "̂" ? ACENTO_CIRCUNFLEXO : marca === "̃" ? ACENTO_TIL : marca === "̧" ? CEDILHA : [];
      const acima = marca === "̧" ? 0 : ALTURA_ACENTO;
      marcas.forEach((linha, gy) =>
        [...linha].forEach((v, gx) => v === "#" && bloco(gx, marca === "̧" ? ALTURA_GLIFO + gy : gy - acima)),
      );
      cx += (LARGURA_GLIFO + 1) * k;
    }
  };
  if (opcoes.sombra !== undefined) pintar(k, k, opcoes.sombra);
  pintar(0, 0, cor);
}
