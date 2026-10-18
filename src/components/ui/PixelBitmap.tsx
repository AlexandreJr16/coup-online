// Bitmap em SVG de <rect>: a base de PixelIcon e Logo. Tamanho em unidades `--u` do kit,
// então acompanha a escala do tema. Server component (sem estado).
import type { CSSProperties } from "react";
import { retangulosDoBitmap, validarBitmap } from "./icones";
import s from "./ui.module.css";

export function PixelBitmap({
  linhas,
  cores,
  celula = 1,
  titulo,
  testId,
}: {
  linhas: readonly string[];
  /** caractere do bitmap -> cor CSS (ex.: "currentColor" ou "var(--k-logo-1)") */
  cores: Readonly<Record<string, string>>;
  /** lado de cada pixel do bitmap, em unidades `--u` */
  celula?: number;
  /** vira role="img" + aria-label; sem título o SVG é decorativo (aria-hidden) */
  titulo?: string;
  testId?: string;
}) {
  const { largura, altura } = validarBitmap(linhas);
  const estilo: CSSProperties = {
    width: `calc(var(--u) * ${largura * celula})`,
    height: `calc(var(--u) * ${altura * celula})`,
  };
  return (
    <svg
      className={s.bitmap}
      style={estilo}
      viewBox={`0 0 ${largura} ${altura}`}
      shapeRendering="crispEdges"
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      data-testid={testId}
    >
      {retangulosDoBitmap(linhas, Object.keys(cores)).map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.largura} height={1} fill={cores[r.cor]} />
      ))}
    </svg>
  );
}
