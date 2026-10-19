// Componentes de ficha: pilha do assento (sprite por quantidade, variante por hash), monte e
// baú do Erário. O número é só apoio (canto do sprite, fonte pixel).
import type { CSSProperties, ReactNode } from "react";

import Pix from "./Pix";
import {
  nivelErario,
  NOMES_VARIANTE,
  PAL_BAU,
  PAL_FICHA,
  PAL_FICHA_APAGADA,
  spriteBau,
  spriteFichaApagada,
  spriteFichas,
  spriteMonte,
  MAX_FICHAS,
  varianteFicha,
  type NivelErario,
  type Variante,
} from "./fichas";
import { U } from "./escala";

export type ModoZero = "nada" | "apagada";

/** Uma pilha específica (usada na folha de fichas e pelo assento). */
export function FichasSprite({ n, v, px = 2, style }: { n: number; v: Variante; px?: number; style?: CSSProperties }) {
  return (
    <Pix
      rows={spriteFichas(n, v)}
      paleta={PAL_FICHA}
      px={px}
      rotulo={`${n} fichas, variante ${NOMES_VARIANTE[v]}`}
      style={style}
    />
  );
}

/** Pilha do assento: até 10 fichas = sprite por quantidade; 11+ = monte menor (variante A). */
export function Fichas({
  idJogador,
  quantidade,
  zero = "nada",
}: {
  idJogador: string;
  quantidade: number;
  zero?: ModoZero;
}) {
  const v = varianteFicha(idJogador, Math.min(quantidade, MAX_FICHAS));
  let sprite: ReactNode;
  if (quantidade <= 0) {
    sprite =
      zero === "apagada" ? (
        <Pix rows={spriteFichaApagada()} paleta={PAL_FICHA_APAGADA} rotulo="sem fichas" style={{ opacity: 0.8 }} />
      ) : (
        <div style={{ width: U(64), height: U(52) }} aria-label="sem fichas" role="img" />
      );
  } else if (quantidade <= MAX_FICHAS) {
    sprite = <FichasSprite n={quantidade} v={v} />;
  } else {
    const nivel = Math.max(1, nivelErario(quantidade)) as 1 | 2 | 3;
    sprite = <Pix rows={spriteMonte(nivel, 0)} paleta={PAL_FICHA} px={1} rotulo={`${quantidade} fichas`} />;
  }
  return (
    <div
      data-testid="fichas"
      data-qtd={quantidade}
      data-variante={quantidade > 0 && quantidade <= MAX_FICHAS ? v : undefined}
      style={{ position: "relative", display: "flex", alignItems: "flex-end", width: U(88), height: U(52) }}
    >
      {sprite}
      <span className="m3-numero" style={{ position: "absolute", right: 0, bottom: 0 }}>
        {quantidade}
      </span>
    </div>
  );
}

export function Monte({ nivel, v, px = 2 }: { nivel: 1 | 2 | 3; v: 0 | 1; px?: number }) {
  return <Pix rows={spriteMonte(nivel, v)} paleta={PAL_FICHA} px={px} rotulo={`monte, variante ${v === 0 ? "A" : "B"}`} />;
}

export function Bau({ nivel, px = 2 }: { nivel: NivelErario; px?: number }) {
  return <Pix rows={spriteBau(nivel)} paleta={PAL_BAU} px={px} rotulo={`baú, nível ${nivel}`} />;
}
