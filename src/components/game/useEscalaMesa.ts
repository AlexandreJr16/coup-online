// Mede a ÁREA da mesa (o contêiner do GameBoard, já sem o cabeçalho) e devolve o fator que faz o
// palco caber nela, mais o style com as custom properties (`--mu`, `--u`). SSR e hidratação veem 1.
// Devolve uma CALLBACK REF que mede na hora em que o elemento entra no DOM: o ResizeObserver só
// dispara em aba que desenha frames (aba em segundo plano ficava presa em 1x, 19/10). Depois, o
// ResizeObserver e o resize da janela mantêm a medida em dia.
"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";

import { type Escala, escalaDoPalco, estiloEscalaMesa } from "./escalaMesa";

const medir = (el: HTMLElement): Escala => {
  const r = el.getBoundingClientRect();
  return escalaDoPalco(r.width, r.height);
};

export function useEscalaMesa(): { ref: (el: HTMLElement | null) => void; escala: Escala; style: CSSProperties } {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [escala, setEscala] = useState<Escala>(1);
  const ref = useCallback((node: HTMLElement | null) => {
    setEl(node);
    if (node) setEscala(medir(node));
  }, []);
  useEffect(() => {
    if (!el) return;
    const atualizar = () => setEscala(medir(el));
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(atualizar);
    ro?.observe(el);
    window.addEventListener("resize", atualizar);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", atualizar);
    };
  }, [el]);
  const style = useMemo(() => estiloEscalaMesa(escala), [escala]);
  return { ref, escala, style };
}
