// Grupo DUELO (VIDA_E_BLEFE 7.3): faixa VS (2 quadros), gota de suor (3) e mão apontando (2).
import { Tela } from "../canvas";
import { texto } from "../fonte";
import type { Peca } from "../peca";

// ── Faixa VS ────────────────────────────────────────────────────────────────────────────────
const VS_W = 104;
const VS_H = 44;

/** Fita: corpo lacre com luz em cima e sombra embaixo, caudas de andorinha mais escuras atrás. */
function fita(t: Tela, w: number, h: number, escala: 3 | 4): void {
  const cx = VS_W / 2;
  const cy = VS_H / 2 - 2;
  const cauda = Math.floor(h / 3) + 2;
  const x0 = cx - w / 2;
  const y0 = cy - Math.floor(h / 2);
  const bx = x0 + cauda;
  const bw = w - 2 * cauda;
  const ty = y0 + 4;
  // caudas (atrás, 4 px mais baixas) com o corte em V
  t.retangulo(x0, ty, cauda + 4, h, "vinho");
  t.retangulo(x0 + w - cauda - 4, ty, cauda + 4, h, "vinho");
  const meio = ty + Math.floor(h / 2);
  t.poligono([[x0 - 1, ty - 1], [x0 + cauda - 1, meio], [x0 - 1, ty + h]], null);
  t.poligono([[x0 + w, ty - 1], [x0 + w - cauda, meio], [x0 + w, ty + h]], null);
  // dobras (sombra triangular onde a cauda encosta no corpo)
  t.poligono([[bx, y0 + h], [bx + 4, y0 + h], [bx, y0 + h + 4]], "uva");
  t.poligono([[bx + bw - 1, y0 + h], [bx + bw - 5, y0 + h], [bx + bw - 1, y0 + h + 4]], "uva");
  // corpo
  t.retangulo(bx, y0, bw, h, "lacre");
  t.retangulo(bx, y0, bw, 2, "vermelho");
  t.retangulo(bx, y0 + h - 2, bw, 2, "vinho");
  t.retangulo(bx, y0 + 3, bw, 1, "ouroEscuro");
  t.retangulo(bx, y0 + h - 4, bw, 1, "ouroEscuro");
  const tw = 2 * 6 * escala - escala;
  texto(t, "VS", Math.floor((VS_W - tw) / 2), y0 + Math.floor((h - 7 * escala) / 2), "ouroClaro", { escala, sombra: "tinta" });
}

function faixaVs(): Tela[] {
  // Quadro 1: o tranco (fita maior, raios e faíscas). Quadro 2: assentada.
  const q1 = new Tela(VS_W, VS_H);
  fita(q1, 96, 34, 4);
  const cx = VS_W / 2;
  for (const s of [-1, 1] as const) {
    const bx = cx + s * 50;
    q1.linha(bx, 8, bx + s * 4, 2, "ouroClaro");
    q1.linha(bx + s * 1, 18, bx + s * 7, 16, "branco");
    q1.linha(bx, 28, bx + s * 4, 34, "ouroClaro");
  }
  const q2 = new Tela(VS_W, VS_H);
  fita(q2, 88, 30, 3);
  return [q1.contornoNoLugar("tinta"), q2.contornoNoLugar("tinta")];
}

// ── Gota de suor ────────────────────────────────────────────────────────────────────────────
const SUOR_W = 11;
const SUOR_H = 24;

/** Gota: ponta em cima, barriga redonda; luz no alto-esquerda, sombra embaixo-direita. */
function gota(t: Tela, cx: number, topo: number, altura: number): void {
  const R = Math.max(1, Math.floor((altura - 1) / 3));
  const cy = topo + altura - 1 - R;
  t.poligono([[cx, topo], [cx - R, cy], [cx + R + 1, cy]], "ciano");
  t.elipse(cx, cy, R, R, "ciano");
  if (R >= 2) {
    t.elipse(cx + 1, cy + 1, R - 1, R - 1, "azul");
    t.elipse(cx, cy, R - 1, R - 1, "ciano");
    t.set(cx - R + 1, cy - 1, "gelo");
    t.set(cx - R + 1, cy, "gelo");
    t.set(cx - R + 2, cy - 2, "gelo");
  } else {
    t.set(cx, cy, "gelo");
  }
}

function gotaSuor(): Tela[] {
  const f = (cx: number, topo: number, altura: number, extra?: (t: Tela) => void): Tela => {
    const t = new Tela(SUOR_W, SUOR_H);
    gota(t, cx, topo, altura);
    extra?.(t);
    return t.contornoNoLugar("marinho");
  };
  return [
    f(5, 3, 7), // nasce na testa
    f(5, 8, 11), // cresce e escorre
    f(5, 14, 9, (t) => {
      // cai e se desfaz: pingos soltos acima
      t.set(5, 9, "gelo");
      t.set(5, 11, "ciano");
    }),
  ];
}

// ── Mão apontando ───────────────────────────────────────────────────────────────────────────
const MAO_W = 44;
const MAO_H = 22;

/** Mão de lado com o indicador esticado para a direita; `dx` empurra a mão (o "pontapé"). */
function mao(dx: number): Tela {
  const m = new Tela(MAO_W, MAO_H);
  const X = (x: number): number => x + dx;
  // punho (manga + palma)
  m.retangulo(X(0), 4, 6, 15, "creme");
  m.retangulo(X(4), 4, 1, 15, "lacre");
  m.retangulo(X(6), 5, 11, 14, "pele");
  // polegar por cima, apoiado
  m.retangulo(X(8), 2, 9, 4, "pele");
  m.set(X(16), 2, null);
  // dedos: indicador esticado e três recolhidos, cada vez mais curtos
  m.retangulo(X(17), 6, 18, 4, "pele");
  m.set(X(34), 6, null);
  m.set(X(34), 9, null);
  m.retangulo(X(17), 11, 10, 3, "pele");
  m.retangulo(X(17), 15, 9, 3, "pele");
  m.retangulo(X(17), 19, 7, 2, "pele");
  const c = m.contornoNoLugar("tinta");
  // luz em cima do indicador e sombra embaixo de cada dedo; separações entre dedos
  c.retangulo(X(18), 7, 15, 1, "peleClara");
  c.retangulo(X(17), 10, 17, 1, "peleEscura");
  c.retangulo(X(17), 14, 10, 1, "peleEscura");
  c.retangulo(X(17), 18, 9, 1, "peleEscura");
  c.retangulo(X(7), 17, 10, 1, "peleEscura");
  for (const y of [11, 15, 19]) c.set(X(17), y, "peleEscura");
  c.retangulo(X(0), 4, 4, 1, "branco");
  return c;
}

function maoApontando(): Tela[] {
  const q1 = mao(0);
  const q2 = mao(4);
  // Pontos de ênfase na frente da ponta (só no quadro 2).
  q2.linha(43, 4, 43, 2, "ouroClaro");
  q2.linha(41, 11, 43, 12, "ouroClaro");
  return [q1, q2];
}

export function gerarDuelo(): Peca[] {
  return [
    { grupo: "duelo", nome: "faixa-vs", quadros: faixaVs(), uso: "7.3: faixa 'VS' entre os duelistas, 104x44, 2 quadros (tranco, assentada). Centralizar na mesa." },
    { grupo: "duelo", nome: "gota-suor", quadros: gotaSuor(), uso: "7.3: gota na testa de cada duelista, 11x24, 3 quadros (nasce, escorre, cai). Posicionar por proporção da moldura (~72% x, 22% y)." },
    { grupo: "duelo", nome: "mao-apontando", quadros: maoApontando(), uso: "7.3: mão que aponta do contestador ao acusado (aponta para a direita; espelhar no CSS para a esquerda), 44x22, 2 quadros." },
  ];
}
