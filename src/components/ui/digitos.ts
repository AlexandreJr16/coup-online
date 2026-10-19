// Dígitos pixel 3x5 do relógio (P08.S7): desenhados aqui, sem arquivo de arte. Um número vira
// um único bitmap (dígitos lado a lado com 1 coluna de respiro), desenhado por PixelBitmap.

export const DIGITOS: Record<string, readonly string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
};

/** Bitmap de um inteiro >= 0 (negativo, NaN e fração viram o inteiro >= 0 mais próximo por baixo). */
export function bitmapDoNumero(n: number): string[] {
  const v = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const ds = String(v).split("").map((c) => DIGITOS[c]);
  return [0, 1, 2, 3, 4].map((y) => ds.map((d) => d[y]).join("."));
}
