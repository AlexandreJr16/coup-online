// Unidade de escala da mesa (DEC-13). Tudo no mockup é medido em "u":
//
//   --u = 1    em 1280x720   (1 pixel de arte = 2 px na tela)
//   --u = 1.5  em 1920x1080  (1 pixel de arte = 3 px: continua inteiro)
//   --u = 2    em 2560x1440  (1 pixel de arte = 4 px)
//
// Os degraus são fixos por faixa de resolução (nada de escala contínua): sprites procedurais
// ficam sempre em pixels inteiros. Os arquivos de arte de tamanho fixo (retrato 64x92,
// carta 40x56) ficam em 1x, 1,5x e 2x; o 1,5x é o "meio degrau" que o DEC-13 precisa aprovar.
import type { CSSProperties } from "react";

/** Mede `n` em unidades de escala: `calc(var(--u) * npx)`. */
export const U = (n: number): string => `calc(var(--u) * ${n}px)`;

export type Resolucao = 1280 | 1920;

export const RESOLUCOES: Record<Resolucao, { u: number; largura: number; altura: number }> = {
  1280: { u: 1, largura: 1280, altura: 720 },
  1920: { u: 1.5, largura: 1920, altura: 1080 },
};

/** Estilo que define --u num contêiner (custom property precisa de cast em CSSProperties). */
export function estiloEscala(u: number): CSSProperties {
  return { "--u": u } as CSSProperties;
}

/** Lado de um pixel de arte, em px de tela, para uma escala (inteiro nos degraus aprovados). */
export function pixelDeArte(u: number): number {
  return 2 * u;
}

/** Custom properties de CSS (--nome) num style, com o cast único num lugar só. */
export function estiloVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}
