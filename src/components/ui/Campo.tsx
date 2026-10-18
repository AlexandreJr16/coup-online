// Campo de texto do kit: rótulo + input chapado (sem arredondar, contorno em 4 eixos).
import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";
import s from "./ui.module.css";

export function Campo({
  rotulo,
  className,
  ...resto
}: { rotulo: string } & ComponentPropsWithRef<"input">) {
  return (
    <label className={s.campoRotulo}>
      {rotulo}
      <input {...resto} className={cx(s.campoInput, className)} />
    </label>
  );
}

/** Caixa de leitura (ex.: link da sala): mesmo vocabulário do campo, sem edição. */
export function Leitura({ children, className, ...resto }: ComponentPropsWithRef<"code">) {
  return (
    <code {...resto} className={cx(s.leitura, className)}>
      {children}
    </code>
  );
}

/** Quadro escuro (nos dois estilos) para conteúdo pensado para tela escura dentro de painel claro. */
export function QuadroEscuro({ children, className, ...resto }: ComponentPropsWithRef<"div">) {
  return (
    <div {...resto} className={cx(s.quadroEscuro, className)}>
      {children}
    </div>
  );
}
