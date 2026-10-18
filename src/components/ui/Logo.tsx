// Logo provisória: coroa pixel + "COUP IMPÉRIO". A definitiva vem do P05.
import { COROA } from "./icones";
import { PixelBitmap } from "./PixelBitmap";
import s from "./ui.module.css";

export function Logo() {
  return (
    <div className={s.logo} data-testid="logo">
      <PixelBitmap
        linhas={COROA}
        cores={{ "#": "var(--k-logo-1)", o: "var(--k-logo-gema)" }}
        celula={2}
        titulo="Coroa"
      />
      <div className={s.logoTexto}>
        <span className={s.logoCoup}>COUP</span>
        <span className={s.logoImperio}>IMPÉRIO</span>
      </div>
    </div>
  );
}
