// Arte de UI procedural e determinística (P05): ícones, logo e favicon.
// Sem IA de imagem e sem GPU: os bitmaps (strings, 1 caractere = 1 cor da paleta mestra)
// vivem em ui-bitmaps.ts; aqui eles ganham contorno automático, são ampliados por
// vizinho mais próximo e gravados com o codificador de tools/art/png.ts.
//
//   npx tsx tools/art/ui-icons.ts                  # regrava public/art/imperio/** e app/icon.png
//   npx tsx tools/art/ui-icons.ts --contato FOLHA  # além disso, grava uma folha de contato PNG
//
// Não há semente: não existe aleatoriedade. A mesma entrada gera os mesmos bytes.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { encodePng, escalar, gridParaRgba, hexParaRgba, type Rgba } from "./png";
import { COROA_LOGO, DIGITOS, FONTE, ICONES, LEGENDA, MIOLO, ORDEM_ICONES } from "./ui-bitmaps";

/** Fator de ampliação: `.sm.png` = base x2 (32 px) e `.png` = base x4 (64 px), como os ícones de ação. */
export const FATOR_SM = 2;
export const FATOR_LG = 4;
/** Lado da base dos ícones (miolo + 1 px de contorno de cada lado). */
export const BASE_ICONE = MIOLO + 2;

export const PASTA_ICONES = "public/art/imperio/icones";
export const ARQ_LOGO = "public/art/imperio/logo";
export const ARQ_FAVICON = "app/icon.png";

export type Bitmap = readonly string[];

export interface Arquivo {
  /** caminho relativo à raiz do repositório */
  caminho: string;
  bytes: Buffer;
}

const PALETA: Readonly<Record<string, Rgba>> = Object.fromEntries(
  Object.entries(LEGENDA).map(([ch, hex]) => [ch, hexParaRgba(hex)]),
);

// ── Operações sobre bitmaps de texto ────────────────────────────────────────
function larguraDe(b: Bitmap): number {
  return Math.max(0, ...b.map((l) => l.length));
}

/** Centraliza `b` numa tela `w`x`h` transparente (a sobra ímpar vai para baixo/direita). */
export function centralizar(b: Bitmap, w: number, h: number): string[] {
  const bw = larguraDe(b);
  if (bw > w || b.length > h) throw new Error(`bitmap ${bw}x${b.length} não cabe em ${w}x${h}`);
  const ox = Math.floor((w - bw) / 2);
  const oy = Math.floor((h - b.length) / 2);
  return Array.from({ length: h }, (_, y) => {
    const linha = b[y - oy];
    return Array.from({ length: w }, (_, x) => {
      const ch = linha?.[x - ox];
      return ch === undefined ? "." : ch;
    }).join("");
  });
}

/** Acrescenta 1 px de `cor` em volta das formas (vizinhança 4 ou 8) e cresce a tela em 2 px. */
export function contornar(b: Bitmap, viz: 4 | 8 = 4, cor = "t"): string[] {
  const w = larguraDe(b) + 2;
  const h = b.length + 2;
  const cheio = (x: number, y: number): boolean => {
    const ch = b[y - 1]?.[x - 1];
    return ch !== undefined && ch !== ".";
  };
  const dirs = viz === 4 ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      if (cheio(x, y)) return b[y - 1][x - 1];
      return dirs.some(([dx, dy]) => cheio(x + dx, y + dy)) ? cor : ".";
    }).join(""),
  );
}

/** Sombra projetada: pixels vazios cobertos pelo bitmap deslocado (dx, dy). */
function comSombra(b: Bitmap, dx: number, dy: number, cor: string): string[] {
  const w = larguraDe(b) + Math.abs(dx);
  const h = b.length + Math.abs(dy);
  const ox = dx < 0 ? -dx : 0;
  const oy = dy < 0 ? -dy : 0;
  const cheio = (x: number, y: number, ex: number, ey: number): boolean => {
    const ch = b[y - ey]?.[x - ex];
    return ch !== undefined && ch !== ".";
  };
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      if (cheio(x, y, ox, oy)) return b[y - oy][x - ox];
      return cheio(x, y, ox + dx, oy + dy) ? cor : ".";
    }).join(""),
  );
}

export function validarBitmap(nome: string, b: Bitmap): void {
  const w = b[0]?.length ?? 0;
  if (w === 0) throw new Error(`${nome}: bitmap vazio`);
  b.forEach((l, y) => {
    if (l.length !== w) throw new Error(`${nome}: linha ${y} tem ${l.length} colunas, esperado ${w}`);
    for (const ch of l) {
      if (ch !== "." && !(ch in LEGENDA)) throw new Error(`${nome}: caractere "${ch}" fora da legenda (linha ${y})`);
    }
  });
}

// ── Peças ───────────────────────────────────────────────────────────────────
/** Ícone final 16x16: miolo centralizado em 14x14 + contorno tinta automático. */
export function bitmapIcone(nome: string): string[] {
  const def = ICONES[nome];
  if (!def) throw new Error(`ícone desconhecido: ${nome}`);
  validarBitmap(nome, def.rows);
  return contornar(centralizar(def.rows, MIOLO, MIOLO), def.contorno ?? 4);
}

/** Largura de uma palavra na fonte do logo, com 1 px entre letras. */
function palavra(texto: string, alturaMin = 0): string[] {
  const glifos = [...texto].map((c) => {
    const g = FONTE[c];
    if (!g) throw new Error(`fonte do logo sem o glifo "${c}"`);
    return g;
  });
  const altura = Math.max(alturaMin, ...glifos.map((g) => g.length));
  const linhas: string[] = Array.from({ length: altura }, () => "");
  glifos.forEach((g, i) => {
    const w = larguraDe(g);
    const topo = altura - g.length; // glifos de 7 linhas ficam alinhados à base (acento sobe)
    for (let y = 0; y < altura; y++) {
      const l = g[y - topo];
      linhas[y] += (i > 0 ? "." : "") + (l ?? ".".repeat(w));
    }
  });
  return linhas;
}

/** Cor da face das letras por linha: ouro claro no topo, bronze na base (7 linhas de letra). */
const FACE_LETRA = ["Y", "Y", "Y", "O", "O", "O", "O"];

function pintarPalavra(m: string[]): string[] {
  const topo = m.length - FACE_LETRA.length; // linhas acima das letras (acento)
  return m.map((l, y) => [...l].map((c) => (c === "." ? "." : y < topo ? "Y" : FACE_LETRA[y - topo])).join(""));
}

/** Logo COUP IMPÉRIO: coroa centralizada sobre a palavra, sombra vinho e contorno tinta. */
export function bitmapLogo(): string[] {
  const t1 = pintarPalavra(palavra("COUP", 8));
  const t2 = pintarPalavra(palavra("IMPÉRIO", 8));
  const texto = t1.map((l, y) => l + "..." + t2[y]);
  const coroa = COROA_LOGO;
  const w = larguraDe(texto);
  const cw = larguraDe(coroa);
  const ox = Math.floor((w - cw) / 2);
  const linhas: string[] = [];
  for (const l of coroa) linhas.push(".".repeat(ox) + l + ".".repeat(w - ox - cw));
  linhas.push(".".repeat(w));
  linhas.push(...texto);
  validarBitmap("logo", linhas);
  return contornar(comSombra(linhas, 0, 1, "B"), 4);
}

/** Favicon 16x16: coroa dourada sobre quadrado ameixa de cantos cortados. */
export function bitmapFavicon(): string[] {
  const n = 16;
  const coroa = centralizar(ICONES.coroa.rows, n, n);
  return Array.from({ length: n }, (_, y) =>
    Array.from({ length: n }, (_, x) => {
      const canto = (x === 0 || x === n - 1) && (y === 0 || y === n - 1);
      if (canto) return ".";
      const ch = coroa[y][x];
      if (ch !== ".") return ch;
      const borda = x === 0 || y === 0 || x === n - 1 || y === n - 1;
      return borda ? "m" : "n";
    }).join(""),
  );
}

// ── Saída ───────────────────────────────────────────────────────────────────
function pngDe(b: Bitmap, fator: number): Buffer {
  const { w, h, rgba } = gridParaRgba(b, PALETA);
  const e = escalar(rgba, w, h, fator);
  return encodePng(e.w, e.h, e.rgba);
}

/** Gera todos os arquivos prometidos, sem tocar no disco (usado pelo teste e pela CLI). */
export function gerarTudo(): Arquivo[] {
  const out: Arquivo[] = [];
  for (const nome of ORDEM_ICONES) {
    const b = bitmapIcone(nome);
    out.push({ caminho: `${PASTA_ICONES}/${nome}.png`, bytes: pngDe(b, FATOR_LG) });
    out.push({ caminho: `${PASTA_ICONES}/${nome}.sm.png`, bytes: pngDe(b, FATOR_SM) });
  }
  const logo = bitmapLogo();
  out.push({ caminho: `${ARQ_LOGO}.png`, bytes: pngDe(logo, FATOR_LG) });
  out.push({ caminho: `${ARQ_LOGO}.sm.png`, bytes: pngDe(logo, FATOR_SM) });
  out.push({ caminho: ARQ_FAVICON, bytes: pngDe(bitmapFavicon(), FATOR_LG) });
  return out;
}

// ── Folha de contato (fora do repositório) ──────────────────────────────────
class Tela {
  readonly rgba: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.rgba = new Uint8Array(w * h * 4);
  }
  retangulo(x0: number, y0: number, w: number, h: number, cor: Rgba): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.rgba.set(cor, (y * this.w + x) * 4);
  }
  /** Cola um bitmap de texto (já com fator aplicado) na posição dada. */
  bitmap(b: Bitmap, x0: number, y0: number, fator: number): void {
    const { w, h, rgba } = gridParaRgba(b, PALETA);
    const e = escalar(rgba, w, h, fator);
    for (let y = 0; y < e.h; y++) {
      for (let x = 0; x < e.w; x++) {
        const o = (y * e.w + x) * 4;
        if (e.rgba[o + 3] === 0) continue;
        this.rgba.set(e.rgba.subarray(o, o + 4), ((y0 + y) * this.w + x0 + x) * 4);
      }
    }
  }
  numero(n: number, x0: number, y0: number, cor: Rgba, k: number): void {
    let x = x0;
    for (const d of String(n)) {
      DIGITOS[d].forEach((l, y) => {
        [...l].forEach((c, xx) => {
          if (c === "#") this.retangulo(x + xx * k, y0 + y * k, k, k, cor);
        });
      });
      x += 4 * k;
    }
  }
}

export function folhaDeContato(): Buffer {
  const fundoPagina = PALETA.m;
  const escuro = PALETA.n;
  const claro = PALETA.c;
  const COLS = 6;
  const CW = 76;
  const CH = 138;
  const linhas = Math.ceil(ORDEM_ICONES.length / COLS);
  const baseLogo = bitmapLogo();
  const logoW = larguraDe(baseLogo);
  const secaoLogo = 20 + baseLogo.length * FATOR_LG + 16;
  const W = Math.max(COLS * CW + 8, logoW * FATOR_LG + 16);
  const H = linhas * CH + 8 + secaoLogo + 80;
  const t = new Tela(W, H);
  t.retangulo(0, 0, W, H, fundoPagina);

  ORDEM_ICONES.forEach((nome, i) => {
    const cx = 4 + (i % COLS) * CW;
    const cy = 4 + Math.floor(i / COLS) * CH;
    const b = bitmapIcone(nome);
    t.retangulo(cx, cy, CW - 4, 72, escuro);
    t.bitmap(b, cx + 4, cy + 4, FATOR_LG);
    t.retangulo(cx, cy + 76, 34, 34, escuro);
    t.bitmap(b, cx + 1, cy + 77, FATOR_SM);
    t.retangulo(cx + 38, cy + 76, 34, 34, claro);
    t.bitmap(b, cx + 39, cy + 77, FATOR_SM);
    t.numero(i + 1, cx + 2, cy + 116, PALETA.c, 3);
  });

  const y0 = linhas * CH + 8;
  t.retangulo(4, y0, logoW * FATOR_LG + 8, baseLogo.length * FATOR_LG + 8, escuro);
  t.bitmap(baseLogo, 8, y0 + 4, FATOR_LG);
  const y1 = y0 + baseLogo.length * FATOR_LG + 16;
  t.retangulo(4, y1, logoW * FATOR_SM + 8, baseLogo.length * FATOR_SM + 8, escuro);
  t.bitmap(baseLogo, 8, y1 + 4, FATOR_SM);
  const xs = 4 + logoW * FATOR_SM + 20;
  t.retangulo(xs, y1, logoW * FATOR_SM + 8, baseLogo.length * FATOR_SM + 8, claro);
  t.bitmap(baseLogo, xs + 4, y1 + 4, FATOR_SM);
  const fav = bitmapFavicon();
  const xf = xs + logoW * FATOR_SM + 24;
  t.retangulo(xf, y1, 72, 72, escuro);
  t.bitmap(fav, xf + 4, y1 + 4, FATOR_LG);
  t.bitmap(fav, xf + 80, y1 + 4, 1);
  t.bitmap(fav, xf + 80, y1 + 24, 2);

  const ampliada = escalar(t.rgba, t.w, t.h, 2);
  return encodePng(ampliada.w, ampliada.h, ampliada.rgba);
}

function main(): void {
  const raiz = process.cwd();
  const args = process.argv.slice(2);
  const arquivos = gerarTudo();
  for (const a of arquivos) {
    const destino = join(raiz, a.caminho);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, a.bytes);
  }
  console.log(`${arquivos.length} arquivos gravados (${ORDEM_ICONES.length} ícones x 2, logo x 2, favicon)`);
  const i = args.indexOf("--contato");
  if (i >= 0 && args[i + 1]) {
    mkdirSync(dirname(args[i + 1]), { recursive: true });
    writeFileSync(args[i + 1], folhaDeContato());
    console.log(`folha de contato: ${args[i + 1]}`);
  }
}

if (require.main === module) main();
