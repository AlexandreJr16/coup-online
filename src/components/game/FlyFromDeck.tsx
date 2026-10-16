// Faz o filho "sair do baralho" da Corte e chegar ao seu lugar (cartas da Troca).
"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { centerOf, flyIn } from "./motion";

export default function FlyFromDeck({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const deck = document.querySelector("[data-deck]");
    if (ref.current && deck) flyIn(ref.current, centerOf(deck), { delay, duration: 520 });
    // só ao montar (a carta chegou da Corte uma vez).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} data-fly-from-deck style={{ display: "flex" }}>
      {children}
    </div>
  );
}
