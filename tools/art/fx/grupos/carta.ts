// Grupo CARTA (VIDA_E_BLEFE 7.4, 7.5, 8.1, 8.2): rachadura da carta (3 quadros), máscara
// estilhaçando (4 quadros) e os carimbos VERDADE / BLEFE! / EXILADO, escritos com a micro-fonte
// bitmap (sem fonte do sistema). Tudo transparente; o que tem versão pequena sai também em `.sm`.
import { join } from "node:path";

import { mulberry32, Tela, type Ponto } from "../canvas";
import { larguraTexto, texto } from "../fonte";
import { lerPng } from "../lerpng";
import type { Cor } from "../paleta";
import type { Peca } from "../peca";
import { CARTA, CARTA_SM, trechoInicial, trinca } from "./comum";

const ICONES = join(import.meta.dirname, "..", "..", "..", "..", "public", "art", "imperio", "icones");

// ── Rachadura da carta ──────────────────────────────────────────────────────────────────────
// Coordenadas normalizadas (0..1) sobre a carta; servem para qualquer tamanho.
const PRINCIPAL: readonly Ponto[] = [[0.82, 0], [0.74, 0.12], [0.78, 0.22], [0.63, 0.31], [0.6, 0.43], [0.45, 0.52], [0.4, 0.64], [0.26, 0.72], [0.22, 0.83], [0.1, 0.92]];
const RAMO_A: readonly Ponto[] = [[0.63, 0.31], [0.5, 0.27], [0.42, 0.19]];
const RAMO_B: readonly Ponto[] = [[0.45, 0.52], [0.58, 0.58], [0.67, 0.7]];
const RAMO_C: readonly Ponto[] = [[0.26, 0.72], [0.38, 0.8], [0.36, 0.93]];
const SECUNDARIA: readonly Ponto[] = [[1, 0.36], [0.88, 0.42], [0.82, 0.5]];

function px(p: Ponto, w: number, h: number): Ponto {
  return [Math.round(p[0] * (w - 1)), Math.round(p[1] * (h - 1))];
}

function rachaduraCarta(w: number, h: number, esp: 1 | 2): Tela[] {
  const P = (pts: readonly Ponto[]): Ponto[] => pts.map((p) => px(p, w, h));
  const q1 = new Tela(w, h);
  trinca(q1, trechoInicial(P(PRINCIPAL), 0.36), esp);
  const q2 = new Tela(w, h);
  trinca(q2, trechoInicial(P(PRINCIPAL), 0.78), esp);
  trinca(q2, trechoInicial(P(RAMO_A), 1), esp);
  trinca(q2, trechoInicial(P(RAMO_B), 0.6), esp);
  const q3 = new Tela(w, h);
  for (const r of [PRINCIPAL, RAMO_A, RAMO_B, RAMO_C, SECUNDARIA]) trinca(q3, P(r), esp);
  // Lascas: pequenos vãos escuros ao longo da rachadura principal (a carta "abre").
  const lasca = (n: number, tam: number): void => {
    const [x, y] = px(n === 0 ? PRINCIPAL[3] : PRINCIPAL[5], w, h);
    q3.poligono([[x, y], [x + tam, y + 1], [x + 1, y + tam + 1]], "tinta");
  };
  lasca(0, esp === 2 ? 3 : 2);
  lasca(1, esp === 2 ? 3 : 2);
  return [q1, q2, q3];
}

// ── Máscara estilhaçando ────────────────────────────────────────────────────────────────────
function ruido(x: number, y: number): number {
  let h = Math.imul(x + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function faisca(t: Tela, x: number, y: number): void {
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (t.dentro(x + dx, y + dy)) t.set(x + dx, y + dy, dx === 0 && dy === 0 ? "branco" : "ouroClaro");
  }
}

/**
 * Fatia o ícone da máscara (já existente) em cacos (Voronoi com seed fixa e borda irregular) e
 * espalha os cacos em 4 quadros: rachada, abrindo, voando, sumindo (pontilhado).
 */
function mascaraEstilhacando(arquivo: string, lado: number, canvasW: number, canvasH: number, n: number, seed: number): Tela[] {
  const png = lerPng(join(ICONES, arquivo));
  if (png.w !== lado || png.h !== lado) throw new Error(`${arquivo}: esperado ${lado}x${lado}, veio ${png.w}x${png.h}`);
  const icone = Tela.deRgba(png.w, png.h, png.rgba);
  const ox = Math.floor((canvasW - lado) / 2);
  const oy = Math.floor((canvasH - lado) / 2);
  const rnd = mulberry32(seed);
  const esc = lado / 64;

  // Sementes dentro da máscara, com afastamento mínimo.
  const opacos: Ponto[] = [];
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) if (icone.get(x, y) !== null) opacos.push([x, y]);
  const sementes: Ponto[] = [];
  const minimo = lado * 0.17;
  for (let tentativa = 0; sementes.length < n && tentativa < 5000; tentativa++) {
    const p = opacos[Math.floor(rnd() * opacos.length)];
    if (sementes.every((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) >= minimo)) sementes.push(p);
  }
  const dono = new Int16Array(lado * lado).fill(-1);
  for (const [x, y] of opacos) {
    let melhor = 0;
    let dist = Infinity;
    sementes.forEach((s, i) => {
      const d = Math.hypot(s[0] - x, s[1] - y) + (ruido(x, y) - 0.5) * lado * 0.09;
      if (d < dist) {
        dist = d;
        melhor = i;
      }
    });
    dono[y * lado + x] = melhor;
  }
  // Centróide de cada caco e direção (do centro da máscara para fora).
  const soma = sementes.map(() => ({ x: 0, y: 0, n: 0 }));
  for (const [x, y] of opacos) {
    const s = soma[dono[y * lado + x]];
    s.x += x;
    s.y += y;
    s.n++;
  }
  const dirs = soma.map((s, i) => {
    const cx = s.n ? s.x / s.n : sementes[i][0];
    const cy = s.n ? s.y / s.n : sementes[i][1];
    const vx = cx - lado / 2;
    const vy = cy - lado / 2;
    const m = Math.hypot(vx, vy) || 1;
    return { ux: vx / m, uy: vy / m, vel: 0.75 + rnd() * 0.5 };
  });
  // Pixels de fratura: vizinho à direita/abaixo pertence a outro caco.
  const fratura = (x: number, y: number): boolean => {
    const d = dono[y * lado + x];
    const dr = x + 1 < lado ? dono[y * lado + x + 1] : -1;
    const db = y + 1 < lado ? dono[(y + 1) * lado + x] : -1;
    return (dr !== -1 && dr !== d) || (db !== -1 && db !== d);
  };

  const quadro = (mag: number, gravidade: number, densidade: number | null, vincos: boolean): Tela => {
    const t = new Tela(canvasW, canvasH);
    // Pintar na ordem dos cacos mantém o resultado determinístico.
    for (let i = 0; i < sementes.length; i++) {
      const d = dirs[i];
      const dx = Math.round(d.ux * mag * d.vel * esc);
      const dy = Math.round(d.uy * mag * d.vel * esc + gravidade * d.vel * esc);
      for (const [x, y] of opacos) {
        if (dono[y * lado + x] !== i) continue;
        if (densidade !== null && !((x + y * 2 + i) % 4 < densidade * 4)) continue;
        const nx = ox + x + dx;
        const ny = oy + y + dy;
        if (!t.dentro(nx, ny)) continue;
        t.set(nx, ny, vincos && fratura(x, y) ? "tinta" : (icone.get(x, y) as number));
      }
    }
    return t;
  };
  const alvos = opacos.filter(([x, y]) => fratura(x, y));
  const faiscas = (t: Tela, k: number, mag: number): void => {
    const r = mulberry32(seed + 1000 + k);
    for (let i = 0; i < 5 && alvos.length; i++) {
      const [x, y] = alvos[Math.floor(r() * alvos.length)];
      const vx = x - lado / 2;
      const vy = y - lado / 2;
      const m = Math.hypot(vx, vy) || 1;
      const fx = ox + x + Math.round((vx / m) * mag * esc);
      const fy = oy + y + Math.round((vy / m) * mag * esc);
      if (t.dentro(fx, fy)) faisca(t, fx, fy);
    }
  };
  const q1 = quadro(0, 0, null, true);
  faiscas(q1, 1, 0);
  const q2 = quadro(5, 0, null, false);
  faiscas(q2, 2, 6);
  const q3 = quadro(14, 6, null, false);
  faiscas(q3, 3, 14);
  const q4 = quadro(24, 20, 0.5, false);
  faiscas(q4, 4, 22);
  return [q1, q2, q3, q4];
}

// ── Carimbos ────────────────────────────────────────────────────────────────────────────────
interface CoresCarimbo {
  fundo: Cor;
  borda: Cor;
  letra: Cor;
}

/** Placa de carimbo com o texto na micro-fonte; `k` = escala do texto (2 grande, 1 pequeno). */
function carimbo(str: string, cores: CoresCarimbo, k: 1 | 2, seed: number): Tela {
  const borda = k;
  const pad = 2 * k;
  const w = larguraTexto(str, k) + 2 * (borda + pad) + 2;
  const h = 7 * k + 2 * (borda + pad) + 2;
  const t = new Tela(w, h);
  t.retangulo(0, 0, w, h, "tinta");
  t.retangulo(1, 1, w - 2, h - 2, cores.borda);
  t.retangulo(1 + borda, 1 + borda, w - 2 - 2 * borda, h - 2 - 2 * borda, cores.fundo);
  // Cantos chanfrados (1 px): carimbo de borracha, não retângulo duro.
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]] as const) t.set(x, y, null);
  for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]] as const) t.set(x, y, "tinta");
  texto(t, str, 1 + borda + pad, 1 + borda + pad, cores.letra, { escala: k });
  // Tinta falhada: alguns pixels de letra/borda voltam ao fundo.
  const rnd = mulberry32(seed);
  const falha = k === 2 ? 0.07 : 0.04;
  const letra = t.copia();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const v = letra.get(x, y);
      if (v === null || v === 0) continue;
      if (rnd() < falha) t.set(x, y, cores.fundo);
    }
  }
  return t;
}

const VERDADE: CoresCarimbo = { fundo: "marromEscuro", borda: "ouro", letra: "ouroClaro" };
const BLEFE: CoresCarimbo = { fundo: "vinho", borda: "vermelho", letra: "creme" };
const EXILADO: CoresCarimbo = { fundo: "noite", borda: "prata", letra: "creme" };

export function gerarCarta(): Peca[] {
  const par = (nome: string, str: string, cores: CoresCarimbo, seed: number, uso: string): Peca => ({
    grupo: "carta",
    nome,
    quadros: [carimbo(str, cores, 2, seed)],
    sm: [carimbo(str, cores, 1, seed)],
    uso,
  });
  return [
    {
      grupo: "carta",
      nome: "rachadura",
      quadros: rachaduraCarta(CARTA.w, CARTA.h, 2),
      sm: rachaduraCarta(CARTA_SM.w, CARTA_SM.h, 1),
      uso: "8.1: overlay da carta (88x124 / .sm 40x56), 3 quadros em ~300 ms; o último fica na carta revelada.",
    },
    {
      grupo: "carta",
      nome: "mascara-estilhacando",
      quadros: mascaraEstilhacando("mascara.png", 64, 88, 80, 12, 7),
      sm: mascaraEstilhacando("mascara.sm.png", 32, 44, 40, 7, 11),
      uso: "7.4: sobre a carta no veredito de blefe; 4 quadros em ~300 ms, centrada na carta (a tela é maior que o ícone para os cacos voarem).",
    },
    par("carimbo-verdade", "VERDADE", VERDADE, 21, "7.5: carimbo dourado sobre a carta provada. Centralizar; girar poucos graus no CSS."),
    par("carimbo-blefe", "BLEFE!", BLEFE, 22, "7.4: carimbo vermelho no veredito de blefe."),
    par("carimbo-exilado", "EXILADO", EXILADO, 23, "8.2: carimbo cinza sobre o retrato do exilado (beat de 600 ms)."),
  ];
}
