// Economia viva: torna tátil a corrida por moedas (limiares 3/7/10 do Coup).
//  - useCountUp: anima um número rumo ao novo valor (contador de moedas/Tesouro).
//  - CoinDelta: "+N/−N" dourado que sobe e some quando as moedas mudam.
// Posições derivadas localmente; nada novo trafega pelo socket.
"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

export function useCountUp(value: number, duration = 550): number {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const from = displayRef.current;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t); // ease-out
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

export function CoinDelta({ delta, deltaKey }: { delta: number; deltaKey: number }) {
  if (!delta) return null;
  const positive = delta > 0;
  return (
    <span
      key={deltaKey}
      className="coin-rise"
      style={{ ...float, color: positive ? "#ffd866" : "#e07a5f" }}
    >
      {positive ? `+${delta}` : `${delta}`} 🪙
    </span>
  );
}

const float: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: "100%",
  marginBottom: 2,
  whiteSpace: "nowrap",
  pointerEvents: "none",
  fontWeight: 800,
  fontSize: 14,
  textShadow: "0 1px 2px rgba(0,0,0,0.6)",
};
