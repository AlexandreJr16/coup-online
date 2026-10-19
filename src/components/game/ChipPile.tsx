// Pilha de fichas como imagem (P07.S4): o sprite muda com a quantidade; o número fica pequeno ao lado.
// O sprite vem de chipSprite (puro, determinístico por jogador e quantidade).
"use client";

import { bauSprite, chipSprite } from "./fichas";
import { U } from "./escalaMesa";
import { COLORS } from "./helpers";

export function ChipPile({
  count,
  shown,
  ownerId,
  bau = false,
  height = 26,
}: {
  count: number;
  shown?: number; // número mostrado (animado); o sprite usa sempre o valor real
  ownerId: string;
  bau?: boolean;
  height?: number;
}) {
  const src = chipSprite(count, ownerId);
  return (
    <span data-chip-pile style={{ display: "inline-flex", alignItems: "center", gap: U(6) }}>
      {bau && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bauSprite(count)} alt="" aria-hidden style={{ height: U(height), imageRendering: "pixelated" }} />
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden
          className="pop"
          style={{ height: U(height), imageRendering: "pixelated" }}
        />
      )}
      <span style={{ fontWeight: 800, color: COLORS.gold }}>×{shown ?? count}</span>
    </span>
  );
}
