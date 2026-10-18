// Bitmaps pixel desenhados à mão (copiados de app/dev/v3/kit/icones.ts, mockup aprovado; a
// arte final vem do P05). '#' = cor principal; 'o' = cor secundária; '.' = vazio.
// Cada linha tem a mesma largura (conferido em tempo de execução por `validarBitmap`).

export type IconeId = "som" | "mudo" | "olho" | "ajuda" | "sair" | "engrenagem" | "crt";

export const ICONES: Record<IconeId, readonly string[]> = {
  som: [
    "............",
    "......#.....",
    ".....##...#.",
    "....###...#.",
    ".######.#.#.",
    ".######.#.#.",
    ".######.#.#.",
    ".######.#.#.",
    "....###...#.",
    ".....##...#.",
    "......#.....",
    "............",
  ],
  mudo: [
    "............",
    "......#.....",
    ".....##.....",
    "....###.....",
    ".######.#..#",
    ".######..##.",
    ".######..##.",
    ".######.#..#",
    "....###.....",
    ".....##.....",
    "......#.....",
    "............",
  ],
  olho: [
    "............",
    "............",
    "....####....",
    "..##....##..",
    ".#..####..#.",
    "#..######..#",
    "#..######..#",
    ".#..####..#.",
    "..##....##..",
    "....####....",
    "............",
    "............",
  ],
  ajuda: [
    "............",
    "....####....",
    "...######...",
    "..##....##..",
    "..##....##..",
    ".......##...",
    "......##....",
    ".....##.....",
    ".....##.....",
    "............",
    ".....##.....",
    ".....##.....",
  ],
  sair: [
    "............",
    ".######.....",
    ".#..........",
    ".#......#...",
    ".#......##..",
    ".#..########",
    ".#..########",
    ".#......##..",
    ".#......#...",
    ".#..........",
    ".######.....",
    "............",
  ],
  engrenagem: [
    "............",
    ".....##.....",
    ".##.####.##.",
    ".##########.",
    "..###..###..",
    ".####..####.",
    ".####..####.",
    "..###..###..",
    ".##########.",
    ".##.####.##.",
    ".....##.....",
    "............",
  ],
  crt: [
    "............",
    ".##########.",
    ".#........#.",
    ".#.######.#.",
    ".#........#.",
    ".#.######.#.",
    ".#........#.",
    ".#.######.#.",
    ".##########.",
    "....####....",
    "..########..",
    "............",
  ],
};

// Coroa do logo (13x8). 'o' = gemas.
export const COROA: readonly string[] = [
  "#.....#.....#",
  "##...###...##",
  "###.#####.###",
  "#############",
  "###o##o##o###",
  "#############",
  "#############",
  ".###########.",
];

export function validarBitmap(linhas: readonly string[]): { largura: number; altura: number } {
  const largura = linhas[0]?.length ?? 0;
  for (const l of linhas) {
    if (l.length !== largura) throw new Error(`bitmap irregular: "${l}" tem ${l.length}, esperado ${largura}`);
  }
  return { largura, altura: linhas.length };
}

/** Um retângulo do SVG: linhas contíguas da mesma cor viram um retângulo só. */
export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  cor: string; // a chave do caractere em `cores`
}

/** Bitmap -> retângulos de 1 de altura. '.' e caracteres fora de `chaves` ficam vazios. */
export function retangulosDoBitmap(linhas: readonly string[], chaves: readonly string[]): Retangulo[] {
  validarBitmap(linhas);
  const saida: Retangulo[] = [];
  linhas.forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      const c = linha[x];
      if (c === "." || !chaves.includes(c)) {
        x += 1;
        continue;
      }
      let fim = x;
      while (fim + 1 < linha.length && linha[fim + 1] === c) fim += 1;
      saida.push({ x, y, largura: fim - x + 1, cor: c });
      x = fim + 1;
    }
  });
  return saida;
}
