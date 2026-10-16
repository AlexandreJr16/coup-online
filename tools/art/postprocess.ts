// Pós-processo de arte gerada por IA → pixel art do jogo (ROADMAP Fase 2).
// Pipeline: remove fundo liso (flood fill pelas bordas) → recorta → reduz para o
// tamanho-alvo → quantiza na paleta mestra → alfa binário → PNG.
//
// Uso:
//   npx tsx tools/art/postprocess.ts <entrada.png> <saida.png> \
//     [--size 44x62] [--kernel nearest|lanczos3] [--tol 48] [--bg auto|#rrggbb] \
//     [--preview 4] [--margin 2] [--grid 8]
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import sharp from "sharp";

type RGB = [number, number, number];

interface Options {
  size: [number, number];
  kernel: "nearest" | "lanczos3" | "mitchell";
  tol: number;
  bg: "auto" | RGB;
  preview: number;
  margin: number;
  grid: number; // 0 = desligado; N = reduzir por blocos de N px (ver main)
}

function parseHex(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Cor inválida: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function loadPalette(): RGB[] {
  const file = resolve(import.meta.dirname, "palette.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as { colors: string[] };
  return data.colors.map(parseHex);
}

function parseArgs(argv: string[]): { input: string; output: string; opts: Options } {
  const positional: string[] = [];
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) flags.set(a.slice(2), argv[++i] ?? "");
    else positional.push(a);
  }
  if (positional.length < 2) {
    throw new Error("Uso: postprocess.ts <entrada.png> <saida.png> [--size 44x62] [--kernel nearest|lanczos3]");
  }
  const [w, h] = (flags.get("size") ?? "44x62").split("x").map(Number);
  const kernel = (flags.get("kernel") ?? "nearest") as Options["kernel"];
  if (!["nearest", "lanczos3", "mitchell"].includes(kernel)) throw new Error(`kernel inválido: ${kernel}`);
  const bgFlag = flags.get("bg") ?? "auto";
  return {
    input: positional[0],
    output: positional[1],
    opts: {
      size: [w, h],
      kernel,
      tol: Number(flags.get("tol") ?? 48),
      bg: bgFlag === "auto" ? "auto" : parseHex(bgFlag),
      preview: Number(flags.get("preview") ?? 0),
      margin: Number(flags.get("margin") ?? 2),
      grid: Number(flags.get("grid") ?? 0),
    },
  };
}

// Distância "redmean": usada só na detecção de fundo (rápida, tolerância em escala RGB).
function dist(a: RGB, b: RGB): number {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

// CIELAB (D65): distância perceptual para a quantização. Com redmean, tons marrons
// escuros da pele caíam no vermelho do lenço e o rosto ganhava manchas vermelhas.
function toLab([r8, g8, b8]: RGB): RGB {
  const lin = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = lin(r8), g = lin(g8), b = lin(b8);
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const fy = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const fz = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function nearest(c: RGB, palette: RGB[], paletteLab: RGB[]): RGB {
  const l = toLab(c);
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < paletteLab.length; i++) {
    const p = paletteLab[i];
    const d = (l[0] - p[0]) ** 2 + (l[1] - p[1]) ** 2 + (l[2] - p[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return palette[bestIdx];
}

// Cor de fundo = a cor MAIS FREQUENTE em toda a borda da imagem (agrupada em
// baldes de 16 níveis por canal). A média dos cantos falhava nos bustos: os cantos
// de baixo são roupa, e a "média" virava um cinza que não existe na imagem.
function detectBackground(buf: Buffer, w: number, h: number): RGB {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  const add = (x: number, y: number): void => {
    const i = (y * w + x) * 4;
    const key = ((buf[i] >> 4) << 8) | ((buf[i + 1] >> 4) << 4) | (buf[i + 2] >> 4);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += buf[i]; e.g += buf[i + 1]; e.b += buf[i + 2];
    buckets.set(key, e);
  };
  for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { add(0, y); add(w - 1, y); }
  let best = { n: 0, r: 0, g: 0, b: 0 };
  for (const e of buckets.values()) if (e.n > best.n) best = e;
  return [best.r / best.n, best.g / best.n, best.b / best.n];
}

// Flood fill a partir das bordas: só apaga fundo conectado à borda (não fura o personagem).
function removeBackground(buf: Buffer, w: number, h: number, bg: RGB, tol: number): void {
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (seen[idx]) return;
    const i = idx * 4;
    if (dist([buf[i], buf[i + 1], buf[i + 2]], bg) > tol) return;
    seen[idx] = 1;
    stack.push(idx);
  };
  // Sementes só no topo e nos lados: os retratos são bustos CORTADOS embaixo, então o
  // sujeito toca a borda inferior. Semear dali apagava roupa branca (camisa, faixa)
  // que tem a mesma cor do fundo.
  for (let x = 0; x < w; x++) push(x, 0);
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const idx = stack.pop() as number;
    buf[idx * 4 + 3] = 0;
    const x = idx % w;
    const y = (idx - x) / w;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
}

function opaqueBounds(buf: Buffer, w: number, h: number): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (buf[(y * w + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

async function main(): Promise<void> {
  const { input, output, opts } = parseArgs(process.argv.slice(2));
  const palette = loadPalette();
  const paletteLab = palette.map(toLab);

  const [tw, th] = opts.size;

  // --grid N: o pixel-art-xl gera blocos de N×N px (704px/8 = 88 colunas). Reduzir por
  // bloco inteiro preserva os pixels originais; recortar pelo contorno e reescalar com
  // fator fracionário destrói essa grade e mistura cores (pele virava laranja).
  let pipeline = sharp(input).ensureAlpha();
  if (opts.grid > 1) {
    const meta = await sharp(input).metadata();
    pipeline = pipeline.resize(
      Math.round((meta.width ?? 0) / opts.grid),
      Math.round((meta.height ?? 0) / opts.grid),
      { kernel: "nearest" },
    );
  }
  const src = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = src.info;
  const buf = Buffer.from(src.data);

  const bg = opts.bg === "auto" ? detectBackground(buf, w, h) : opts.bg;
  removeBackground(buf, w, h, bg, opts.tol);

  let left = 0, top = 0, cropW = w, cropH = h;
  if (opts.grid > 1) {
    // Grade nativa: mantém a largura inteira e corta embaixo para a proporção do alvo.
    cropH = Math.min(h, Math.round((w * th) / tw));
  } else {
    const box = opaqueBounds(buf, w, h);
    if (!box) throw new Error("Nada sobrou após remover o fundo (tente --tol menor ou --bg explícito).");
    const m = opts.margin;
    left = Math.max(0, box.x0 - m);
    top = Math.max(0, box.y0 - m);
    cropW = Math.min(w, box.x1 + m + 1) - left;
    cropH = Math.min(h, box.y1 + m + 1) - top;
  }

  const resized = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width: cropW, height: cropH })
    .resize(tw, th, { fit: "contain", kernel: opts.kernel, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(resized.data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 128) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      continue;
    }
    const [r, g, b] = nearest([out[i], out[i + 1], out[i + 2]], palette, paletteLab);
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
  }

  const png = sharp(out, { raw: { width: tw, height: th, channels: 4 } });
  await png.clone().png().toFile(output);
  if (opts.preview > 1) {
    const prev = output.replace(/\.png$/i, `.x${opts.preview}.png`);
    await png.clone().resize(tw * opts.preview, th * opts.preview, { kernel: "nearest" }).png().toFile(prev);
  }
  console.log(`ok ${output} (${tw}x${th}, paleta ${palette.length} cores, fundo ${bg.map(Math.round).join(",")})`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
