// Botão do kit. Estados: normal, hover, pressionado (afunda) e desabilitado, todos por CSS.
// `forcado` existe para a página de revisão mostrar os estados lado a lado e para marcar a
// opção escolhida num grupo de opções (ex.: aba de Aparência).
// `ref` chega por props (React 19), sem forwardRef.
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";
import s from "./ui.module.css";

export type EstadoForcado = "hover" | "pressionado";

export function PixelButton({
  children,
  variante = "normal",
  forcado,
  cheio,
  type = "button",
  className,
  ...resto
}: {
  children: ReactNode;
  variante?: "normal" | "perigo";
  forcado?: EstadoForcado;
  /** ocupa toda a largura do contêiner (formulários) */
  cheio?: boolean;
} & ComponentPropsWithRef<"button">) {
  return (
    <button
      {...resto}
      type={type}
      className={cx(
        s.btn,
        variante === "perigo" && s.perigo,
        cheio && s.cheio,
        forcado === "hover" && s.forcaHover,
        forcado === "pressionado" && s.forcaPressionado,
        className,
      )}
    >
      {children}
    </button>
  );
}
