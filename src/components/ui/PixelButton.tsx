// Botão do kit. Estados: normal, hover, pressionado (afunda) e desabilitado, todos por CSS.
// `forcado` existe só para a página de revisão mostrar os estados lado a lado.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import s from "./ui.module.css";

export type EstadoForcado = "hover" | "pressionado";

export function PixelButton({
  children,
  variante = "normal",
  forcado,
  type = "button",
  className,
  ...resto
}: {
  children: ReactNode;
  variante?: "normal" | "perigo";
  forcado?: EstadoForcado;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...resto}
      type={type}
      className={cx(
        s.btn,
        variante === "perigo" && s.perigo,
        forcado === "hover" && s.forcaHover,
        forcado === "pressionado" && s.forcaPressionado,
        className,
      )}
    >
      {children}
    </button>
  );
}
