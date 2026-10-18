// Peças de desenho compartilhadas pelos grupos (rachaduras, estilhaços, padrões de pontilhado).
import { Tela, type Ponto } from "../canvas";
import type { Cor } from "../paleta";

/** Moldura do retrato: 64x92 (o overlay cobre o retrato; a borda de 3 px é do CSS). */
export const MOLDURA = { w: 64, h: 92 } as const;
/** Carta grande (retrato do personagem) e carta pequena (.sm). */
export const CARTA = { w: 88, h: 124 } as const;
export const CARTA_SM = { w: 40, h: 56 } as const;

/** Rachadura: realce claro 1 px deslocado e miolo escuro por cima (fica um fio de luz na borda). */
export function trinca(t: Tela, pts: readonly Ponto[], espessura: 1 | 2, claro: Cor = "creme", escuro: Cor = "tinta"): void {
  if (espessura === 2) t.polilinha(pts.map(([x, y]) => [x - 1, y - 1] as const), claro, 1);
  t.polilinha(pts, escuro, espessura);
}

/** Pontilhado: devolve `true` nos pixels que ficam (densidades 1/4, 1/2, 3/4). */
export function padrao(densidade: 0.25 | 0.5 | 0.75, x: number, y: number): boolean {
  if (densidade === 0.5) return (x + y) % 2 === 0;
  if (densidade === 0.75) return !(x % 2 === 1 && y % 2 === 1);
  return x % 2 === 0 && y % 2 === 0;
}

/** Preenche o polígono com a cor, mas só nos pixels que o padrão de pontilhado deixa. */
export function poligonoPontilhado(t: Tela, pts: readonly Ponto[], cor: Cor, densidade: 0.25 | 0.5 | 0.75): void {
  const m = new Tela(t.w, t.h);
  m.poligono(pts, cor);
  const d = new Tela(t.w, t.h);
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const v = m.get(x, y);
      if (v !== null && padrao(densidade, x, y)) d.set(x, y, v);
    }
  }
  t.carimbar(d, 0, 0);
}

/** Cópia do polígono deslocada por (dx,dy). */
export function mover(pts: readonly Ponto[], dx: number, dy: number): Ponto[] {
  return pts.map(([x, y]) => [x + dx, y + dy] as const);
}

export function centro(pts: readonly Ponto[]): Ponto {
  const n = pts.length;
  return [Math.round(pts.reduce((s, p) => s + p[0], 0) / n), Math.round(pts.reduce((s, p) => s + p[1], 0) / n)];
}

/** Trecho inicial (fração `f` do comprimento) de uma polilinha, com vértices inteiros. */
export function trechoInicial(pts: readonly Ponto[], f: number): Ponto[] {
  const comp = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = comp.reduce((s, c) => s + c, 0);
  let resto = total * Math.max(0, Math.min(1, f));
  const saida: Ponto[] = [pts[0]];
  for (let i = 0; i < comp.length; i++) {
    if (resto >= comp[i]) {
      saida.push(pts[i + 1]);
      resto -= comp[i];
      continue;
    }
    const k = comp[i] === 0 ? 0 : resto / comp[i];
    saida.push([Math.round(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k), Math.round(pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k)]);
    break;
  }
  return saida;
}
