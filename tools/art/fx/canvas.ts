// Tela de pixels pequena para o gerador de FX. Guarda ÍNDICES da paleta mestra (nunca RGB
// solto), então é impossível sair da paleta. Tudo em pixels inteiros:
//  - `set`/`get` são ESTRITOS: coordenada fracionária ou fora da tela lança erro;
//  - as primitivas (linha, retângulo, elipse, polígono, carimbar...) exigem argumentos
//    inteiros e RECORTAM em silêncio o que sair da tela (útil para estilhaços que viajam).
import { encodePng, escalar } from "../png";
import { indiceDe, RGBA, TRANSPARENTE, type Cor } from "./paleta";

export type Ponto = readonly [number, number];

function inteiro(n: number, rotulo: string): void {
  if (!Number.isInteger(n)) throw new RangeError(`${rotulo} precisa ser inteiro (recebeu ${n})`);
}

/** PRNG determinístico (mulberry32): mesma seed, mesma sequência, em qualquer máquina. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Tela {
  readonly w: number;
  readonly h: number;
  private readonly px: Uint8Array;

  constructor(w: number, h: number) {
    inteiro(w, "largura");
    inteiro(h, "altura");
    if (w < 1 || h < 1) throw new RangeError("a tela precisa ter ao menos 1x1");
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h).fill(TRANSPARENTE);
  }

  /** Bitmap em texto: cada caractere é uma chave de `legenda` ('.' = transparente). */
  static deBitmap(linhas: readonly string[], legenda: Readonly<Record<string, Cor>>): Tela {
    const w = Math.max(...linhas.map((l) => l.length));
    const t = new Tela(w, linhas.length);
    linhas.forEach((linha, y) => {
      for (let x = 0; x < linha.length; x++) {
        const ch = linha[x];
        if (ch === "." || ch === " ") continue;
        const cor = legenda[ch];
        if (cor === undefined) throw new Error(`caractere "${ch}" sem cor na legenda (linha ${y}, coluna ${x})`);
        t.set(x, y, cor);
      }
    });
    return t;
  }

  /** Importa RGBA quantizando cada pixel para a cor MAIS PRÓXIMA da paleta (alfa >= 128 vira opaco). */
  static deRgba(w: number, h: number, rgba: Uint8Array): Tela {
    const t = new Tela(w, h);
    for (let k = 0; k < w * h; k++) {
      if (rgba[k * 4 + 3] < 128) continue;
      let melhor = 0;
      let dist = Infinity;
      RGBA.forEach((c, i) => {
        const d = (c[0] - rgba[k * 4]) ** 2 + (c[1] - rgba[k * 4 + 1]) ** 2 + (c[2] - rgba[k * 4 + 2]) ** 2;
        if (d < dist) {
          dist = d;
          melhor = i;
        }
      });
      t.px[k] = melhor;
    }
    return t;
  }

  dentro(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Estrito: lança se (x,y) não for inteiro dentro da tela. `null` apaga o pixel. */
  set(x: number, y: number, cor: Cor | null): void {
    inteiro(x, "x");
    inteiro(y, "y");
    if (!this.dentro(x, y)) throw new RangeError(`(${x},${y}) fora da tela ${this.w}x${this.h}`);
    this.px[y * this.w + x] = cor === null ? TRANSPARENTE : indiceDe(cor);
  }

  /** Índice da paleta em (x,y), ou null se transparente. Estrito como `set`. */
  get(x: number, y: number): number | null {
    inteiro(x, "x");
    inteiro(y, "y");
    if (!this.dentro(x, y)) throw new RangeError(`(${x},${y}) fora da tela ${this.w}x${this.h}`);
    const v = this.px[y * this.w + x];
    return v === TRANSPARENTE ? null : v;
  }

  /** Pinta com recorte (uso interno das primitivas). */
  private ponto(x: number, y: number, i: number | null): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = i === null ? TRANSPARENTE : i;
  }

  copia(): Tela {
    const t = new Tela(this.w, this.h);
    t.px.set(this.px);
    return t;
  }

  limpar(): void {
    this.px.fill(TRANSPARENTE);
  }

  /** Segmento de Bresenham; `espessura` > 1 engrossa com um bloco quadrado (inteiro). */
  linha(x0: number, y0: number, x1: number, y1: number, cor: Cor | null, espessura = 1): void {
    [x0, y0, x1, y1, espessura].forEach((n) => inteiro(n, "argumento de linha"));
    if (espessura < 1) throw new RangeError("espessura mínima é 1");
    const i = cor === null ? null : indiceDe(cor);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      for (let oy = 0; oy < espessura; oy++) for (let ox = 0; ox < espessura; ox++) this.ponto(x + ox, y + oy, i);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** Sequência de segmentos ligando os pontos. */
  polilinha(pts: readonly Ponto[], cor: Cor | null, espessura = 1): void {
    for (let k = 0; k + 1 < pts.length; k++) this.linha(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], cor, espessura);
  }

  retangulo(x: number, y: number, w: number, h: number, cor: Cor | null, cheio = true): void {
    [x, y, w, h].forEach((n) => inteiro(n, "argumento de retângulo"));
    if (w < 1 || h < 1) return;
    const i = cor === null ? null : indiceDe(cor);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (cheio || xx === x || yy === y || xx === x + w - 1 || yy === y + h - 1) this.ponto(xx, yy, i);
      }
    }
  }

  /** Elipse de centro inteiro e raios inteiros (rx, ry >= 0). `cheio=false` desenha só o anel de 1 px. */
  elipse(cx: number, cy: number, rx: number, ry: number, cor: Cor | null, cheio = true): void {
    [cx, cy, rx, ry].forEach((n) => inteiro(n, "argumento de elipse"));
    if (rx < 0 || ry < 0) throw new RangeError("raio negativo");
    const i = cor === null ? null : indiceDe(cor);
    const dentroDe = (dx: number, dy: number, a: number, b: number): boolean =>
      (dx * dx) / ((a + 0.5) * (a + 0.5)) + (dy * dy) / ((b + 0.5) * (b + 0.5)) <= 1;
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        if (!dentroDe(dx, dy, rx, ry)) continue;
        if (!cheio && dentroDe(dx, dy, rx - 1, ry - 1) && rx > 0 && ry > 0) continue;
        this.ponto(cx + dx, cy + dy, i);
      }
    }
  }

  /** Polígono preenchido (regra par-ímpar, amostrado no centro do pixel). */
  poligono(pts: readonly Ponto[], cor: Cor | null): void {
    pts.forEach(([x, y]) => {
      inteiro(x, "x do polígono");
      inteiro(y, "y do polígono");
    });
    const i = cor === null ? null : indiceDe(cor);
    const ys = pts.map((p) => p[1]);
    const yMin = Math.max(0, Math.min(...ys));
    const yMax = Math.min(this.h - 1, Math.max(...ys));
    for (let y = yMin; y <= yMax; y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let k = 0; k < pts.length; k++) {
        const [ax, ay] = pts[k];
        const [bx, by] = pts[(k + 1) % pts.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.ceil(xs[k + 1] - 0.5) - 1; x++) this.ponto(x, y, i);
      }
    }
  }

  /** Cola `origem` em (x,y); pixels transparentes da origem não apagam. Recorta nas bordas. */
  carimbar(origem: Tela, x: number, y: number): void {
    inteiro(x, "x");
    inteiro(y, "y");
    for (let oy = 0; oy < origem.h; oy++) {
      for (let ox = 0; ox < origem.w; ox++) {
        const v = origem.px[oy * origem.w + ox];
        if (v !== TRANSPARENTE) this.ponto(x + ox, y + oy, v);
      }
    }
  }

  /** Cópia espelhada (horizontal por padrão). */
  espelhar(horizontal = true): Tela {
    const t = new Tela(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const sx = horizontal ? this.w - 1 - x : x;
        const sy = horizontal ? y : this.h - 1 - y;
        t.px[y * this.w + x] = this.px[sy * this.w + sx];
      }
    }
    return t;
  }

  /** Cópia deslocada por (dx,dy) inteiros; o que sai da tela se perde, o que entra é transparente. */
  deslocar(dx: number, dy: number): Tela {
    inteiro(dx, "dx");
    inteiro(dy, "dy");
    const t = new Tela(this.w, this.h);
    t.carimbar(this, dx, dy);
    return t;
  }

  /** Cópia ampliada por vizinho mais próximo (fator inteiro >= 1). */
  ampliar(k: number): Tela {
    inteiro(k, "fator");
    if (k < 1) throw new RangeError("fator mínimo é 1");
    const t = new Tela(this.w * k, this.h * k);
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) t.px[y * t.w + x] = this.px[Math.floor(y / k) * this.w + Math.floor(x / k)];
    return t;
  }

  /** Cópia 1 px maior em cada lado, com contorno (vizinhança 4) na cor dada. */
  contorno(cor: Cor): Tela {
    const i = indiceDe(cor);
    const t = new Tela(this.w + 2, this.h + 2);
    const cheio = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < this.w && y < this.h && this.px[y * this.w + x] !== TRANSPARENTE;
    for (let y = -1; y <= this.h; y++) {
      for (let x = -1; x <= this.w; x++) {
        const k = (y + 1) * t.w + (x + 1);
        if (cheio(x, y)) t.px[k] = this.px[y * this.w + x];
        else if (cheio(x - 1, y) || cheio(x + 1, y) || cheio(x, y - 1) || cheio(x, y + 1)) t.px[k] = i;
      }
    }
    return t;
  }

  /** Contorno do tamanho da própria tela (o que cair fora é recortado). */
  contornoNoLugar(cor: Cor): Tela {
    const t = new Tela(this.w, this.h);
    t.carimbar(this.contorno(cor), -1, -1);
    return t;
  }

  /** Quantidade de pixels não transparentes. */
  opacos(): number {
    let n = 0;
    for (const v of this.px) if (v !== TRANSPARENTE) n++;
    return n;
  }

  /** Índices da paleta realmente usados, em ordem crescente. */
  coresUsadas(): number[] {
    return [...new Set(this.px)].filter((v) => v !== TRANSPARENTE).sort((a, b) => a - b);
  }

  igual(outra: Tela): boolean {
    return this.w === outra.w && this.h === outra.h && this.px.every((v, k) => v === outra.px[k]);
  }

  /** RGBA (w*h*4); alfa 0 ou 255, nunca intermediário. */
  rgba(): Uint8Array {
    const out = new Uint8Array(this.w * this.h * 4);
    this.px.forEach((v, k) => {
      if (v !== TRANSPARENTE) out.set(RGBA[v], k * 4);
    });
    return out;
  }

  png(): Buffer {
    return encodePng(this.w, this.h, this.rgba());
  }

  /** PNG ampliado para inspeção humana (fator inteiro). */
  pngAmpliado(k: number): Buffer {
    const e = escalar(this.rgba(), this.w, this.h, k);
    return encodePng(e.w, e.h, e.rgba);
  }
}
