// Escala da mesa em degraus (DEC-13, P06). Os tamanhos da mesa são medidos em "unidades da
// mesa": 1 unidade = 1 px num monitor de 1280x720. O degrau (1, 1,5 ou 2) multiplica tudo
// por `calc(var(--mu) * N)`, e a custom property `--mu` é posta num contêiner só (GameBoard,
// pelo hook useEscalaMesa). Fora do contêiner (colinha em portal, páginas /dev) o fallback é
// 1px, ou seja, o tamanho antigo.
//
// Por que `--mu` e não `--u`: o `--u` já é o "pixel" do KIT de UI (globals.css, 3px na raiz,
// 2px/3px no HUD). Um `--u: 1px` na mesa encolheria os botões do kit e qualquer carta fora
// da mesa herdaria os 3px da raiz. O hook ainda ajusta o `--u` do kit dentro da mesa
// (unidadeDoKit) para os botões do kit acompanharem o degrau.
//
// Os arquivos de arte (carta 40x56 / 88x124, retrato 64x92) têm tamanho fixo: em 1,5x o
// `image-rendering: pixelated` cai em escala fracionária. Isso está aceito no DEC-13.
import type { CSSProperties } from "react";

export type Escala = 1 | 1.5 | 2;

/** Tela de referência em que 1 unidade = 1 px (o layout foi calibrado nela). */
export const BASE = { largura: 1280, altura: 720 } as const;

/** Degraus disponíveis, do maior para o menor. */
export const DEGRAUS: readonly Escala[] = [2, 1.5, 1];

/**
 * Folga na comparação: uma tela de 1920x1080 inteira precisa dar 1,5x, mas janelas só um
 * pouco menores (barra de rolagem, 1px de borda) não devem cair para 1x.
 */
const FOLGA = 0.02;

/**
 * Degrau da tela. Usa a MENOR relação entre largura/1280 e altura/720, então a mesa nunca
 * estoura em nenhum dos dois eixos (o eixo da altura costuma ser o limitante, pois o dock é
 * fixo). Limiares: 1,5x a partir de 1895x1066 (1920x1080 cheio); 2x a partir de 2535x1426
 * (2560x1440 cheio). Abaixo disso, 1x. Valores inválidos (0, negativo, NaN, Infinity) dão 1.
 */
export function escalaDaTela(largura: number, altura: number): Escala {
  if (!Number.isFinite(largura) || !Number.isFinite(altura) || largura <= 0 || altura <= 0) return 1;
  const relacao = Math.min(largura / BASE.largura, altura / BASE.altura);
  for (const degrau of DEGRAUS) {
    if (relacao >= degrau - FOLGA) return degrau;
  }
  return 1;
}

/** `n` unidades da mesa em pixels, para um degrau (uso numérico: geometria calculada). */
export function px(n: number, escala: number): number {
  return n * escala;
}

/** `n` unidades da mesa como valor de CSS. Fora do contêiner da mesa vale 1px por unidade. */
export function U(n: number): string {
  return `calc(var(--mu, 1px) * ${n})`;
}

/** Lado do "pixel" do kit de UI (`--u` do globals.css) dentro da mesa, por degrau. */
export function unidadeDoKit(escala: Escala): number {
  return escala === 2 ? 6 : escala === 1.5 ? 4 : 3;
}

/** Custom properties do contêiner da mesa: `--mu` (mesa) e `--u` (kit, mesma proporção). */
export function estiloEscalaMesa(escala: Escala): CSSProperties {
  return { "--mu": `${escala}px`, "--u": `${unidadeDoKit(escala)}px` } as CSSProperties;
}
