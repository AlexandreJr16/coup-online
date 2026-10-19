// Leitor de PNG mínimo (8 bits, RGB ou RGBA, sem entrelaçamento), só `node:zlib`. Serve para
// o gerador reaproveitar um ícone já existente (ex.: a máscara) como molde de uma animação.
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

export interface PngLido {
  w: number;
  h: number;
  rgba: Uint8Array;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function lerPngBuffer(buf: Buffer): PngLido {
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("não é PNG");
  let pos = 8;
  let w = 0;
  let h = 0;
  let tipoCor = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const tipo = buf.subarray(pos + 4, pos + 8).toString("ascii");
    const dados = buf.subarray(pos + 8, pos + 8 + len);
    if (tipo === "IHDR") {
      w = dados.readUInt32BE(0);
      h = dados.readUInt32BE(4);
      if (dados[8] !== 8) throw new Error("só PNG de 8 bits");
      tipoCor = dados[9];
      if (dados[12] !== 0) throw new Error("PNG entrelaçado não suportado");
      if (tipoCor !== 2 && tipoCor !== 6) throw new Error(`tipo de cor ${tipoCor} não suportado (só RGB/RGBA)`);
    } else if (tipo === "IDAT") idat.push(dados);
    else if (tipo === "IEND") break;
    pos += 12 + len;
  }
  const canais = tipoCor === 6 ? 4 : 3;
  const bruto = inflateSync(Buffer.concat(idat));
  const stride = w * canais;
  const cru = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const filtro = bruto[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = bruto[y * (stride + 1) + 1 + x];
      const a = x >= canais ? cru[y * stride + x - canais] : 0;
      const b = y > 0 ? cru[(y - 1) * stride + x] : 0;
      const c = x >= canais && y > 0 ? cru[(y - 1) * stride + x - canais] : 0;
      const pred = filtro === 0 ? 0 : filtro === 1 ? a : filtro === 2 ? b : filtro === 3 ? (a + b) >> 1 : paeth(a, b, c);
      cru[y * stride + x] = (v + pred) & 255;
    }
  }
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = cru[i * canais];
    rgba[i * 4 + 1] = cru[i * canais + 1];
    rgba[i * 4 + 2] = cru[i * canais + 2];
    rgba[i * 4 + 3] = canais === 4 ? cru[i * canais + 3] : 255;
  }
  return { w, h, rgba };
}

export function lerPng(caminho: string): PngLido {
  return lerPngBuffer(readFileSync(caminho));
}
