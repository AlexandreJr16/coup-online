// Fichas como IMAGEM (P07 / PLANO_V3 B3): qual sprite mostrar para uma quantidade.
// Funções puras, sem DOM e sem aleatoriedade: o mesmo (jogador, quantidade) escolhe sempre o mesmo
// arquivo, em qualquer cliente e em qualquer execução (a pilha não "pisca" nem muda sozinha).
// A arte é gerada por tools/art/fichas.ts em public/art/<tema>/fichas/:
//   <n>/<a|b|c>.png                 n = 1..10      (a arrumada, b torta, c espalhada)
//   monte/<11-15|16-25|26+>/<a|b>.png              (Erário e pilhas grandes)
//   bau/<vazio|11-15|16-25|26+>.png                (baú que enche)
import { ART_THEME } from "./helpers";

/** Maior quantidade com sprite próprio; de 11 em diante entram os montes. */
export const MAX_CHIP_SPRITE = 10;
export type ChipVariant = 0 | 1 | 2;
export type MonteBand = "11-15" | "16-25" | "26+";
export type BauLevel = "vazio" | MonteBand;

const VARIANT_LETTERS = ["a", "b", "c"] as const;
const MONTE_LETTERS = ["a", "b"] as const;
const DIR = `/art/${ART_THEME}/fichas`;

/** Id fixo usado quando o Erário (sem dono) escolhe variante para 1..10 fichas. */
export const TREASURY_ID = "erario";

/**
 * FNV-1a de 32 bits sobre `${playerId}:${count}`, mais um embaralhamento final (fmix32, de
 * MurmurHash3): sem ele o bit mais baixo do FNV-1a é só a paridade dos caracteres e `% 2` sairia
 * enviesado. Determinístico e sem dependências.
 */
export function chipHash(playerId: string, count: number): number {
  const s = `${playerId}:${count}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Quantidade inteira >= 1, ou null (0, negativo, NaN e infinito não têm sprite). */
function normalize(count: number): number | null {
  if (!Number.isFinite(count)) return null;
  const n = Math.floor(count);
  return n >= 1 ? n : null;
}

/** Variante (0 a, 1 b, 2 c) da pilha de `count` fichas do jogador: só depende dos dois. */
export function chipVariant(playerId: string, count: number): ChipVariant {
  return (chipHash(playerId, count) % 3) as ChipVariant;
}

/** Faixa do monte para 11+ (null abaixo disso). */
export function monteBand(count: number): MonteBand | null {
  const n = normalize(count);
  if (n === null || n <= MAX_CHIP_SPRITE) return null;
  return n >= 26 ? "26+" : n >= 16 ? "16-25" : "11-15";
}

/** Nível do baú do Erário: vazio até 10 fichas, depois as mesmas faixas dos montes. */
export function bauLevel(count: number): BauLevel {
  return monteBand(count) ?? "vazio";
}

/**
 * Caminho do sprite da pilha de `count` fichas do jogador `playerId`; `null` para 0 (sem sprite).
 * 1..10: sprite próprio com 3 variantes; 11+: monte da faixa, com 2 variantes.
 */
export function chipSprite(count: number, playerId: string): string | null {
  const n = normalize(count);
  if (n === null) return null;
  const hash = chipHash(playerId, n);
  const band = monteBand(n);
  if (band) return `${DIR}/monte/${band}/${MONTE_LETTERS[hash % 2]}.png`;
  return `${DIR}/${n}/${VARIANT_LETTERS[hash % 3]}.png`;
}

/** Sprite do monte do Erário (sem dono): como `chipSprite`, com o id fixo do Erário. */
export function baseSprite(count: number): string | null {
  return chipSprite(count, TREASURY_ID);
}

/** Sprite do baú que enche conforme o Erário (sempre existe: 0 a 10 fichas = baú vazio). */
export function bauSprite(count: number): string {
  return `${DIR}/bau/${bauLevel(count)}.png`;
}
