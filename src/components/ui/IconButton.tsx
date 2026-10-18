// Botão quadrado só com ícone. `rotulo` é obrigatório (aria-label + dica), já que não há texto.
// Alvo de clique >= 44px garantido pelo CSS.
import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";
import type { IconeId } from "./icones";
import { PixelIcon } from "./PixelIcon";
import type { EstadoForcado } from "./PixelButton";
import s from "./ui.module.css";

export function IconButton({
  icone,
  rotulo,
  forcado,
  type = "button",
  className,
  ...resto
}: {
  icone: IconeId;
  rotulo: string;
  forcado?: EstadoForcado;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children">) {
  return (
    <button
      {...resto}
      type={type}
      aria-label={rotulo}
      title={rotulo}
      className={cx(
        s.btn,
        s.btnIcone,
        forcado === "hover" && s.forcaHover,
        forcado === "pressionado" && s.forcaPressionado,
        className,
      )}
    >
      <PixelIcon nome={icone} />
    </button>
  );
}
