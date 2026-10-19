// Escala da mesa (P06; contínua desde 19/10, ver escalaDoPalco). Os tamanhos da mesa são medidos em "unidades da
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

/** Fator de escala da mesa (px de tela por unidade). Contínuo desde a mesa nova (19/10). */
export type Escala = number;

/**
 * Palco da mesa em unidades (porte do mockup P03.S2): a mesa ocupa 0..536 e o dock 536..680.
 * Tudo dentro do palco é posicionado nessas unidades, então nenhuma peça cruza outra em
 * resolução nenhuma: o layout é o MESMO, só muda o fator.
 */
export const PALCO = { largura: 1280, altura: 680, mesa: 536 } as const;

/** Limites do fator: abaixo de 0,6 a mesa fica ilegível; acima de 3 não há tela que peça. */
export const ESCALA_MIN = 0.6;
export const ESCALA_MAX = 3;

/**
 * Fator que faz o palco caber na área (largura x altura) da mesa, arredondado para baixo em
 * passos de 0,05 (evita relayout a cada pixel de resize). Decisão de 19/10: o degrau inteiro do
 * DEC-13 deixava a mesa em 1x numa janela 1920x940 (assentos minúsculos numa mesa enorme); a
 * arte pixel em fator fracionário fica com pixels levemente desiguais, o que foi aceito.
 * Valores inválidos (0, negativo, NaN, Infinity) dão 1.
 */
export function escalaDoPalco(largura: number, altura: number): Escala {
  if (!Number.isFinite(largura) || !Number.isFinite(altura) || largura <= 0 || altura <= 0) return 1;
  const bruto = Math.min(largura / PALCO.largura, altura / PALCO.altura);
  const passo = Math.floor(bruto * 20 + 1e-9) / 20;
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, passo));
}

/** `n` unidades da mesa em pixels, para um degrau (uso numérico: geometria calculada). */
export function px(n: number, escala: number): number {
  return n * escala;
}

/** `n` unidades da mesa como valor de CSS. Fora do contêiner da mesa vale 1px por unidade. */
export function U(n: number): string {
  return `calc(var(--mu, 1px) * ${n})`;
}

/**
 * `n` unidades da mesa como TAMANHO DE FONTE: além do --mu, multiplica pelo fator de largura da
 * fonte escolhida na Aparência (`--fw`, globals.css). Assim as 4 fontes ocupam ~a mesma largura e
 * nenhum rótulo estoura a caixa ao trocar de fonte (queixa de 19/10).
 */
export function F(n: number): string {
  return `calc(var(--mu, 1px) * ${n} * var(--fw, 1))`;
}

/** Lado do "pixel" do kit de UI (`--u` do globals.css) dentro da mesa, por degrau. */
export function unidadeDoKit(escala: Escala): number {
  return Math.max(2, Math.round(3 * escala));
}

/** Custom properties do contêiner da mesa: `--mu` (mesa) e `--u` (kit, mesma proporção). */
export function estiloEscalaMesa(escala: Escala): CSSProperties {
  return { "--mu": `${escala}px`, "--u": `${unidadeDoKit(escala)}px` } as CSSProperties;
}
