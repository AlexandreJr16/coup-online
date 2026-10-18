// Painel do kit: moldura chapada em degraus, filete e sombra dura. Cores pelo tema.
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import s from "./ui.module.css";

export function PixelPanel({
  titulo,
  children,
  className,
  ...resto
}: { titulo?: string; children: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, "title">) {
  return (
    <div {...resto} className={cx(s.panel, className)}>
      <div className={s.panelBorda}>
        <div className={s.panelFace}>
          {titulo ? <h3 className={s.panelTitulo}>{titulo}</h3> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
