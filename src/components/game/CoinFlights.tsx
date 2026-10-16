// Camada de moedas voando: quando as moedas de alguém mudam, algumas moedas pixel art voam
// entre o Erário e o contador do jogador (ou direto entre dois jogadores num roubo).
// Só decoração por cima do estado real; não captura cliques.
"use client";

import { useEffect, useRef } from "react";

import { iconUrl } from "./helpers";
import { centerOf, planCoinFlights, spawnCoins } from "./motion";

export default function CoinFlights({ deltas, deltaKey }: { deltas: Record<string, number>; deltaKey: number }) {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = layer.current;
    if (!el || deltaKey === 0) return;
    const where = (id: string) => {
      const t = id === "erario" ? document.querySelector("[data-erario]") : document.querySelector(`[data-seat-id="${id}"] [data-seat-coin]`);
      return t ? centerOf(t, el) : null;
    };
    for (const f of planCoinFlights(deltas)) {
      const a = where(f.from);
      const b = where(f.to);
      if (a && b) spawnCoins(el, a, b, f.count, iconUrl("renda", "sm"));
    }
  }, [deltas, deltaKey]);
  return <div ref={layer} data-testid="coin-layer" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 8, overflow: "hidden" }} />;
}
