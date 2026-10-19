// Utilitários de pixel art do mockup do dock: sprites desenhados como retângulos (SVG),
// texturas em ladrilho (madeira, veludo, couro) e formas "serrilhadas" via clip-path.
// Tudo estático e sem dependências. Cada pasta de mockup tem a sua cópia (restrição do P03).
import type { CSSProperties, ReactNode } from "react";

export type Palette = Record<string, string>;

/** Desenha um sprite: cada caractere de `rows` é um pixel ('.' = transparente). */
export function Sprite({
  rows,
  palette,
  px,
  label,
  style,
}: {
  rows: readonly string[];
  palette: Palette;
  px: number;
  label?: string;
  style?: CSSProperties;
}) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const rects: ReactNode[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      const fill = palette[ch];
      if (ch !== "." && fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={fill} />);
      x += run;
    }
  });
  return (
    <svg
      width={w * px}
      height={h * px}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: "block", flex: "none", ...style }}
    >
      {rects}
    </svg>
  );
}

// ── Texturas em ladrilho ────────────────────────────────────────────────────
// Gerador pseudoaleatório fixo (mesma textura em toda renderização, servidor e cliente).
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Converte uma grade de caracteres num `url(data:image/svg+xml...)` para `background`. */
export function tileUrl(rows: readonly string[], palette: Palette): string {
  const w = rows[0].length;
  const parts: string[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      parts.push(`<rect x='${x}' y='${y}' width='${run}' height='1' fill='${palette[ch]}'/>`);
      x += run;
    }
  });
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${rows.length}' viewBox='0 0 ${w} ${rows.length}' shape-rendering='crispEdges'>${parts.join("")}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Madeira: tábuas horizontais com veios curtos. `a` base, `b` clara, `c` escura, `d` fresta. */
function woodRows(w: number, h: number, seed: number, plank: number): string[] {
  const rnd = lcg(seed);
  const grid: string[][] = [];
  for (let y = 0; y < h; y++) {
    const seam = y % plank === plank - 1;
    const hi = y % plank === 0;
    grid.push(Array.from({ length: w }, () => (seam ? "d" : hi ? "b" : "a")));
  }
  for (let n = 0; n < (w * h) / 9; n++) {
    const y = Math.floor(rnd() * h);
    if (y % plank === plank - 1) continue;
    const x = Math.floor(rnd() * w);
    const len = 2 + Math.floor(rnd() * 5);
    const ch = rnd() < 0.6 ? "c" : "b";
    for (let i = 0; i < len; i++) grid[y][(x + i) % w] = ch;
  }
  return grid.map((r) => r.join(""));
}
const WOOD_PALETTE: Palette = { a: "#7a4a25", b: "#8c5a2e", c: "#6a3e1e", d: "#3f2210" };
export const WOOD = tileUrl(woodRows(48, 24, 7, 8), WOOD_PALETTE);
// Madeira mais escura (cavalete, sob as peças)
const WOOD_DARK_PALETTE: Palette = { a: "#5e3619", b: "#6e4421", c: "#4f2e14", d: "#2e190b" };
export const WOOD_DARK = tileUrl(woodRows(48, 24, 11, 8), WOOD_DARK_PALETTE);

/** Veludo da mesa: verde profundo com pontinhos de trama. */
function felt(w: number, h: number, seed: number): string[] {
  const rnd = lcg(seed);
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => {
      const r = rnd();
      return r < 0.08 ? "b" : r < 0.16 ? "c" : "a";
    }).join(""),
  );
}
export const FELT = tileUrl(felt(24, 24, 3), { a: "#173f30", b: "#1d4b39", c: "#133528" });

/** Couro: granulado vinho-escuro. */
function leather(w: number, h: number, seed: number): string[] {
  const rnd = lcg(seed);
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => {
      const r = rnd();
      return r < 0.1 ? "b" : r < 0.22 ? "c" : "a";
    }).join(""),
  );
}
export const LEATHER = tileUrl(leather(20, 20, 5), { a: "#5a2a1e", b: "#6d3a28", c: "#46201a" });
export const LEATHER_INNER = tileUrl(leather(20, 20, 9), { a: "#2a1a1c", b: "#33201f", c: "#211416" });

// ── Formas serrilhadas (clip-path) ──────────────────────────────────────────
/** Retângulo com cantos "cortados" em degrau de `n` px (efeito pixel). */
export function notch(n: number): string {
  return `polygon(${n}px 0, calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n}px, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, ${n}px calc(100% - ${n}px), 0 calc(100% - ${n}px), 0 ${n}px, ${n}px ${n}px)`;
}

/** Elipse quantizada em degraus de `q` px (largura `w`, altura `h`). */
export function ellipseClip(w: number, h: number, q: number): string {
  const rows = Math.round(h / q);
  const rx = w / 2;
  const ry = h / 2;
  const right: string[] = [];
  const left: string[] = [];
  for (let i = 0; i < rows; i++) {
    const yc = (i + 0.5) * q - ry;
    const hw = Math.round((rx * Math.sqrt(Math.max(0, 1 - (yc * yc) / (ry * ry)))) / q) * q;
    right.push(`${rx + hw}px ${i * q}px`, `${rx + hw}px ${(i + 1) * q}px`);
    left.unshift(`${rx - hw}px ${i * q}px`, `${rx - hw}px ${(i + 1) * q}px`);
  }
  return `polygon(${[...right, ...left].join(",")})`;
}

/** Círculo quantizado em degraus de `q` px (diâmetro `d`). */
export function discClip(d: number, q: number): string {
  return ellipseClip(d, d, q);
}

/** Ficha redonda em camadas: contorno, aro e face (todas serrilhadas). */
export function Disc({
  d,
  outline,
  ring,
  face,
  children,
  style,
}: {
  d: number;
  outline: string;
  ring: string;
  face: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const layer = (inset: number, bg: string): CSSProperties => ({
    position: "absolute",
    inset,
    background: bg,
    clipPath: discClip(d - inset * 2, 4),
  });
  return (
    <div style={{ position: "relative", width: d, height: d, flex: "none", ...style }}>
      <div style={layer(0, outline)} />
      <div style={layer(4, ring)} />
      <div style={layer(8, face)} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
    </div>
  );
}

/** Placa retangular de cantos cortados com contorno, face e friso de luz. */
export function Plate({
  w,
  h,
  outline,
  face,
  light,
  shade,
  children,
  style,
  padding = "0 14px",
}: {
  w: number;
  h: number;
  outline: string;
  face: string;
  light: string;
  shade: string;
  children?: ReactNode;
  style?: CSSProperties;
  padding?: string;
}) {
  const clip = (n: number) => notch(n);
  return (
    <div style={{ position: "relative", width: w, height: h, flex: "none", ...style }}>
      <div style={{ position: "absolute", inset: 0, background: outline, clipPath: clip(4) }} />
      <div style={{ position: "absolute", inset: 4, background: face, clipPath: clip(4) }} />
      <div style={{ position: "absolute", left: 8, right: 8, top: 4, height: 4, background: light }} />
      <div style={{ position: "absolute", left: 8, right: 8, bottom: 4, height: 4, background: shade }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 10, padding }}>{children}</div>
    </div>
  );
}

// ── Sprites avulsos ─────────────────────────────────────────────────────────
// Ponto de exclamação do selo Contestar (o ícone de contestar ainda não existe no pipeline).
export const EXCLAMA_ROWS = [
  "..oooooo..",
  ".orrrrrro.",
  ".orhrrrro.",
  ".orhrrrro.",
  ".orhrrrro.",
  ".orrrrrro.",
  "..orrrro..",
  "..orrrro..",
  "...orro...",
  "...orro...",
  "....oo....",
  "..........",
  "...oooo...",
  "..orrrro..",
  "..orhrro..",
  "...oooo...",
] as const;
export const EXCLAMA_PAL: Palette = { o: "#3a0a08", r: "#e5483b", h: "#ffb09c" };

// Ampulheta (espera)
export const AMPULHETA_ROWS = [
  ".oooooooooo.",
  ".oyyyyyyyyo.",
  "..oyyyyyyo..",
  "...oyyyyo...",
  "....oyyo....",
  ".....oo.....",
  ".....oo.....",
  "....oqqo....",
  "...oqqqqo...",
  "..oqqqqqqo..",
  ".oqqqqqqqqo.",
  ".oooooooooo.",
] as const;
export const AMPULHETA_PAL: Palette = { o: "#2a1a0c", y: "#f0d27a", q: "#d9a028" };

// Moeda pequena (pilha de moedas dos assentos)
export const MOEDA_ROWS = [
  "..oooo..",
  ".oyyyyo.",
  "oyyhhyyo",
  "oyhyyyyo",
  "oyhyyyyo",
  "oyyyyqyo",
  ".oqqqqo.",
  "..oooo..",
] as const;
export const MOEDA_PAL: Palette = { o: "#4a2f08", y: "#f0b429", h: "#ffe9a0", q: "#c98a10" };

/** Interruptor pixel (trilho + botão). */
export function switchRows(on: boolean): string[] {
  const w = 16;
  const rows: string[] = [];
  const edge = ".oooooooooooooo.";
  rows.push(edge);
  for (let y = 0; y < 6; y++) {
    const cells: string[] = Array.from({ length: w }, (_, x) => (x === 0 || x === w - 1 ? "o" : on ? "g" : "t"));
    const k0 = on ? w - 7 : 2;
    if (y >= 1 && y <= 4) for (let i = 0; i < 4; i++) cells[k0 + i] = "k";
    if (y === 1) for (let i = 0; i < 4; i++) cells[k0 + i] = "j";
    rows.push(cells.join(""));
  }
  rows.push(edge);
  return rows;
}
export const SWITCH_PAL: Palette = { o: "#140c08", t: "#4a3d36", g: "#d9a028", k: "#e8dcc0", j: "#fff6dc" };

/** Imagem pixel art (sem suavização). */
export function PxImg({
  src,
  w,
  h,
  alt = "",
  style,
}: {
  src: string;
  w: number;
  h: number;
  alt?: string;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={w}
      height={h}
      draggable={false}
      style={{ width: w, height: h, imageRendering: "pixelated", display: "block", flex: "none", ...style }}
    />
  );
}
