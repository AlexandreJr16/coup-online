// Botão quadrado só com ícone PIXEL (PNG de public/art/<tema>/icones/, via `iconUrl`).
// `rotulo` é obrigatório (aria-label + dica), já que não há texto. Alvo de clique >= 44px
// garantido pelo CSS. `ref` chega por props (React 19).
import type { ComponentPropsWithRef } from "react";
import { iconUrl } from "@/src/components/game/helpers";
import { cx } from "./cx";
import type { IconeId } from "./icones";
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
} & Omit<ComponentPropsWithRef<"button">, "aria-label" | "children">) {
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconUrl(icone, "sm") ?? undefined}
        alt=""
        draggable={false}
        className={s.iconeImg}
        data-testid={`icone-${icone}`}
      />
    </button>
  );
}
