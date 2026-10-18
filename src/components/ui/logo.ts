// Dimensões e arquivo da logo "COUP IMPÉRIO" (PNG pixel). Lógica pura: o componente `Logo`
// só aplica o resultado. A grande é 260x84 e a pequena 130x42 (metade exata).
import { ART_THEME } from "@/src/components/game/helpers";

export const LOGO_LARGURA_GRANDE = 260;
export const LOGO_LARGURA_PEQUENA = 130;
const PROPORCAO = 84 / 260;

export interface DimensoesDaLogo {
  src: string;
  width: number;
  height: number;
}

/** Largura pedida (px) -> arquivo e tamanho. Inválida (NaN, <= 0) cai na pequena (130 px). */
export function dimensoesDaLogo(largura: number = LOGO_LARGURA_PEQUENA): DimensoesDaLogo {
  const w = Number.isFinite(largura) && largura > 0 ? Math.round(largura) : LOGO_LARGURA_PEQUENA;
  const pequena = w <= LOGO_LARGURA_PEQUENA;
  return {
    src: `/art/${ART_THEME}/logo${pequena ? ".sm" : ""}.png`,
    width: w,
    height: Math.round(w * PROPORCAO),
  };
}
