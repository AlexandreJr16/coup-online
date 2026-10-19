// Mini-editor de pixel art em código: cada sprite é uma grade de caracteres ('.' = vazio,
// qualquer outro caractere = índice da paleta). Funções puras (sem DOM, sem aleatoriedade):
// o mesmo sprite sai igual em qualquer máquina. Serve de PLACEHOLDER para o mockup; a arte
// final das fichas virá de tools/art/fichas.ts (procedural, com seed fixa).

export type Grade = string[];
export type Paleta = Record<string, string>;
type Tela = string[][];

export const VAZIO = ".";

export function tela(w: number, h: number): Tela {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => VAZIO));
}

/** Cola `rows` na tela em (ox, oy); células '.' não apagam o que já existe. */
export function colar(t: Tela, rows: Grade, ox: number, oy: number): void {
  rows.forEach((linha, y) => {
    [...linha].forEach((ch, x) => {
      const ty = oy + y;
      const tx = ox + x;
      if (ch !== VAZIO && ty >= 0 && ty < t.length && tx >= 0 && tx < t[0].length) t[ty][tx] = ch;
    });
  });
}

export function paraGrade(t: Tela): Grade {
  return t.map((l) => l.join(""));
}

/** Disco de raio r (lado 2r+1) preenchido com `ch`. */
export function disco(r: number, ch: string): Grade {
  const lado = 2 * r + 1;
  return Array.from({ length: lado }, (_, y) =>
    Array.from({ length: lado }, (_, x) => {
      const dx = x - r;
      const dy = y - r;
      return dx * dx + dy * dy <= r * r + r * 0.6 ? ch : VAZIO;
    }).join(""),
  );
}

/** Contorno de 1 pixel em volta da silhueta (vizinhança 4); aumenta a grade em 1 de cada lado. */
export function comContorno(rows: Grade, ch = "o"): Grade {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const cheio = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < w && y < h && rows[y][x] !== VAZIO;
  return Array.from({ length: h + 2 }, (_, py) =>
    Array.from({ length: w + 2 }, (_, px) => {
      const x = px - 1;
      const y = py - 1;
      if (cheio(x, y)) return rows[y][x];
      return cheio(x - 1, y) || cheio(x + 1, y) || cheio(x, y - 1) || cheio(x, y + 1) ? ch : VAZIO;
    }).join(""),
  );
}

export function dimensoes(rows: Grade): { w: number; h: number } {
  return { w: rows[0]?.length ?? 0, h: rows.length };
}

// ── Paletas (subconjunto da paleta mestra; ouro = verdade/vez, vermelho = perigo) ──────────
export const PAL = {
  contorno: "#14101a",
  ouroClaro: "#ffd866",
  ouro: "#f0a500",
  ouroEscuro: "#a86a00",
  vermelho: "#e03a2c",
  lacre: "#c0392b",
  verde: "#2f6b45",
  verdeClaro: "#57b07a",
  branco: "#f4f1e6",
  areia: "#e0c88a",
  pergaminho: "#f1e3c0",
  cinza: "#8c93a3",
  cinzaEscuro: "#5b6070",
  madeira: "#8a5a30",
  madeiraEscura: "#5a3a1e",
  madeiraClara: "#b07a44",
} as const;

// ── Sprites ───────────────────────────────────────────────────────────────────
const CHECK_RISCO: Grade = ["......x", ".....xx", "x...xx.", "xx.xx..", ".xxx..."];

/** Selo de "já passou": disco verde com ✔ desenhado em pixels (sem emoji). */
export const SPRITE_PASSOU: Grade = (() => {
  const t = tela(13, 13);
  colar(t, disco(6, "g"), 0, 0);
  colar(t, ["hhhhh"], 4, 1); // brilho no topo do disco
  colar(t, CHECK_RISCO.map((l) => l.replaceAll("x", "w")), 3, 4);
  return comContorno(paraGrade(t));
})();
export const PAL_PASSOU: Paleta = { o: PAL.contorno, g: PAL.verde, h: PAL.verdeClaro, w: PAL.branco };

/** "zZz" de jogador ausente (3 letras Z decrescentes). */
export const SPRITE_ZZZ: Grade = (() => {
  const t = tela(14, 13);
  colar(t, ["xxxxx", "...x.", "..x..", ".x...", "xxxxx"], 8, 0);
  colar(t, ["xxxx", "..x.", ".x..", "xxxx"], 4, 4);
  colar(t, ["xxx", ".x.", "xxx"], 0, 9);
  return comContorno(paraGrade(t));
})();
export const PAL_ZZZ: Paleta = { o: PAL.contorno, x: "#cfd8ff" };

/** Canhãozinho (selo de ameaça 7 a 9 moedas). 10x7 + contorno = 12x9 pixels de arte. */
export const SPRITE_CANHAO: Grade = (() => {
  const t = tela(10, 7);
  colar(t, ["hhhhhhhh", "kkkkkkkk", "kkkkkkkk"], 2, 1);
  colar(t, ["h", "k", "k", "k", "k"], 8, 0);
  colar(t, ["k", "k", "k", "k", "k"], 9, 0);
  colar(t, disco(2, "b"), 2, 2);
  colar(t, ["g"], 4, 4);
  return comContorno(paraGrade(t));
})();
export const PAL_CANHAO: Paleta = {
  o: PAL.contorno,
  h: "#b8bcc8",
  k: PAL.cinzaEscuro,
  b: PAL.madeira,
  g: PAL.ouro,
};

/** Mira vermelha (selo de ameaça 10+ moedas): anel + cruz. 13x13 + contorno. */
export const SPRITE_ALVO: Grade = (() => {
  const t = tela(13, 13);
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < 13; x++) {
      const d = Math.hypot(x - 6, y - 6);
      const anel = d >= 4.3 && d <= 6.3;
      const cruz = (x === 6 || y === 6) && d >= 2.2;
      if (anel || cruz) t[y][x] = "r";
    }
  }
  t[6][6] = "w";
  return comContorno(paraGrade(t));
})();
export const PAL_ALVO: Paleta = { o: PAL.contorno, r: PAL.vermelho, w: PAL.branco };

const ESTRELA: Grade = ["..x..", "xxxxx", ".xxx.", ".x.x.", "x...x"];

/** Medalhão da vez (ficha de dealer): moeda dourada com estrela lacre. 15x15 + contorno. */
export const SPRITE_MEDALHAO: Grade = (() => {
  const t = tela(15, 15);
  colar(t, disco(7, "d"), 0, 0);
  colar(t, disco(6, "g"), 1, 1);
  colar(t, disco(4, "l"), 3, 3);
  colar(t, ESTRELA.map((l) => l.replaceAll("x", "r")), 5, 5);
  return comContorno(paraGrade(t));
})();
export const PAL_MEDALHAO: Paleta = {
  o: PAL.contorno,
  d: PAL.ouroEscuro,
  g: PAL.ouro,
  l: PAL.ouroClaro,
  r: PAL.lacre,
};

/** Ampulheta (a mesa está esperando). */
export const SPRITE_AMPULHETA: Grade = ["xxxxx", ".xxx.", "..x..", "..x..", ".xxx.", "xxxxx"];
export const PAL_AMPULHETA: Paleta = { x: PAL.areia };

/** Seta curta para o balão com alvo ("Assassinar → retrato"). */
export const SPRITE_SETA: Grade = ["...x...", "....x..", "xxxxxx.", "....x..", "...x..."];
export const PAL_SETA: Paleta = { x: PAL.lacre };

/** Rabicho do balão de fala (aponta para baixo). 'o' contorno, 'x' papel. */
export const SPRITE_RABICHO: Grade = ["oxxxxxo", ".oxxxo.", "..oxo..", "...o..."];
export const PAL_RABICHO: Paleta = { o: PAL.contorno, x: PAL.pergaminho };

/** Curativo (influência restante = 1). */
export const SPRITE_CURATIVO: Grade = comContorno(["cccccccccc", "cccppppccc", "cccppppccc", "cccccccccc"]);
export const PAL_CURATIVO: Paleta = { o: PAL.contorno, c: "#d9b98a", p: "#f3e6cf" };

// ── Dígitos 3x5 (sprites de dígito para o anel do relógio; DEC-21) ───────────────────────────
const DIGITOS: Record<string, Grade> = {
  "0": ["xxx", "x.x", "x.x", "x.x", "xxx"],
  "1": [".x.", "xx.", ".x.", ".x.", "xxx"],
  "2": ["xxx", "..x", "xxx", "x..", "xxx"],
  "3": ["xxx", "..x", "xxx", "..x", "xxx"],
  "4": ["x.x", "x.x", "xxx", "..x", "..x"],
  "5": ["xxx", "x..", "xxx", "..x", "xxx"],
  "6": ["xxx", "x..", "xxx", "x.x", "xxx"],
  "7": ["xxx", "..x", "..x", ".x.", ".x."],
  "8": ["xxx", "x.x", "xxx", "x.x", "xxx"],
  "9": ["xxx", "x.x", "xxx", "..x", "xxx"],
};

/** Sprite de um número inteiro >= 0 com contorno (dígitos separados por 1 pixel). */
export function spriteDigitos(valor: number): Grade {
  const texto = String(Math.max(0, Math.floor(valor)));
  const largura = texto.length * 4 - 1;
  const t = tela(largura, 5);
  [...texto].forEach((d, i) => colar(t, DIGITOS[d], i * 4, 0));
  return comContorno(paraGrade(t));
}
