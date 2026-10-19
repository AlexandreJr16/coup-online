// Renderiza uma grade de caracteres (bitmaps.ts) como SVG de retângulos, com bordas nítidas.
// `px` é o tamanho de cada pixel de arte em unidades `u` (padrão 2: inteiro em 1280 e 1920).
import type { CSSProperties } from "react";

import { dimensoes, VAZIO, type Grade, type Paleta } from "./bitmaps";
import { U } from "../escalaMesa";

interface Corrida {
  x: number;
  y: number;
  w: number;
  cor: string;
}

function corridas(rows: Grade, paleta: Paleta): Corrida[] {
  const saida: Corrida[] = [];
  rows.forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      const ch = linha[x];
      if (ch === VAZIO || !paleta[ch]) {
        x++;
        continue;
      }
      let fim = x;
      while (fim + 1 < linha.length && linha[fim + 1] === ch) fim++;
      saida.push({ x, y, w: fim - x + 1, cor: paleta[ch] });
      x = fim + 1;
    }
  });
  return saida;
}

export default function Pix({
  rows,
  paleta,
  px = 2,
  rotulo,
  className,
  style,
  testid,
}: {
  rows: Grade;
  paleta: Paleta;
  px?: number;
  rotulo?: string; // sem rótulo o sprite é decorativo (aria-hidden)
  className?: string;
  style?: CSSProperties;
  testid?: string;
}) {
  const { w, h } = dimensoes(rows);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      shapeRendering="crispEdges"
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      className={className}
      data-testid={testid}
      style={{ width: U(w * px), height: U(h * px), display: "block", flex: "none", ...style }}
    >
      {corridas(rows, paleta).map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={c.w} height={1} fill={c.cor} />
      ))}
    </svg>
  );
}
