// Link com a cara do PixelButton (mesmo CSS): para ações que navegam em vez de agir.
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "./cx";
import s from "./ui.module.css";

export function PixelLink({
  children,
  className,
  ...resto
}: { children: ReactNode } & ComponentPropsWithRef<"a">) {
  return (
    <a {...resto} className={cx(s.btn, className)}>
      {children}
    </a>
  );
}
