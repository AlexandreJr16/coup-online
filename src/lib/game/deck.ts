// Baralho da Corte: 25 cartas (5 de cada personagem). Funções puras.
// O RNG é injetável para tornar a engine determinística nos testes.

import { ALL_CHARACTERS, type Character } from "../../types/game";

// Igual a Math.random: retorna [0, 1).
export type Rng = () => number;

const COPIES_PER_CHARACTER = 5; // 5 × 5 = 25 cartas

export function createDeck(): Character[] {
  const deck: Character[] = [];
  for (const character of ALL_CHARACTERS) {
    for (let i = 0; i < COPIES_PER_CHARACTER; i++) deck.push(character);
  }
  return deck;
}

// Fisher-Yates. Retorna uma cópia embaralhada (não muta a entrada).
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Embaralha no lugar (usado ao devolver cartas à Corte durante o jogo).
export function shuffleInPlace<T>(arr: T[], rng: Rng): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
