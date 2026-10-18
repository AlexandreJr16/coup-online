// Etiqueta do kit. Os tons seguem a gramática visual fixa (ouro, perigo, bloqueio, fora, blefe).
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import s from "./ui.module.css";

export type TagTom = "ouro" | "perigo" | "bloqueio" | "fora" | "blefe";

const CLASSE: Record<TagTom, string> = {
  ouro: s.tagOuro,
  perigo: s.tagPerigo,
  bloqueio: s.tagBloqueio,
  fora: s.tagFora,
  blefe: s.tagBlefe,
};

export function Tag({
  tom,
  children,
  className,
  ...resto
}: { tom: TagTom; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...resto} className={cx(s.tag, CLASSE[tom], className)}>
      {children}
    </span>
  );
}
