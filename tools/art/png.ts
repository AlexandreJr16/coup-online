// Codificador PNG mínimo (RGBA 8 bits) sem dependências: só `node:zlib`. Usado pelos
// geradores procedurais de arte pixel (ícones de UI, fichas, efeitos).
import { crc32, deflateSync } from "node:zlib";

export type Rgba = readonly [number, number, number, number];

function chunk(tipo: string, dados: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo) >>> 0);
  return Buffer.concat([len, corpo, crc]);
}

/** `rgba` tem w*h*4 bytes, linha a linha. */
export function encodePng(w: number, h: number, rgba: Uint8Array): Buffer {
  if (rgba.length !== w * h * 4) throw new Error(`rgba tem ${rgba.length} bytes, esperado ${w * h * 4}`);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 6; // RGBA
  const linhas = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    linhas[y * (w * 4 + 1)] = 0; // filtro "nenhum"
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(linhas, y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(linhas)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Bitmap em texto: cada caractere é uma chave da paleta ("." = transparente). */
export function gridParaRgba(grid: readonly string[], paleta: Readonly<Record<string, Rgba>>): { w: number; h: number; rgba: Uint8Array } {
  const h = grid.length;
  const w = Math.max(...grid.map((l) => l.length));
  const rgba = new Uint8Array(w * h * 4);
  grid.forEach((linha, y) => {
    for (let x = 0; x < w; x++) {
      const ch = linha[x] ?? ".";
      const cor = ch === "." ? ([0, 0, 0, 0] as const) : paleta[ch];
      if (!cor) throw new Error(`caractere "${ch}" sem cor na paleta (linha ${y}, coluna ${x})`);
      rgba.set(cor, (y * w + x) * 4);
    }
  });
  return { w, h, rgba };
}

/** Amplia por vizinho mais próximo (pixel art nítida), fator inteiro. */
export function escalar(rgba: Uint8Array, w: number, h: number, k: number): { w: number; h: number; rgba: Uint8Array } {
  if (!Number.isInteger(k) || k < 1) throw new Error("fator de escala precisa ser inteiro >= 1");
  const out = new Uint8Array(w * k * h * k * 4);
  for (let y = 0; y < h * k; y++) {
    for (let x = 0; x < w * k; x++) {
      const o = ((Math.floor(y / k)) * w + Math.floor(x / k)) * 4;
      out.set(rgba.subarray(o, o + 4), (y * w * k + x) * 4);
    }
  }
  return { w: w * k, h: h * k, rgba: out };
}

/** "#rrggbb" ou "#rrggbbaa" -> Rgba. */
export function hexParaRgba(hex: string): Rgba {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) throw new Error(`cor inválida: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, m[2] ? parseInt(m[2], 16) : 255];
}
