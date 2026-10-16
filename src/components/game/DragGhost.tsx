// Carta "fantasma" que acompanha o mouse enquanto você arrasta um poder da mão.
"use client";

import type { Character } from "@/src/types/game";
import Card from "./Card";

export default function DragGhost({ character, x, y }: { character: Character; x: number; y: number }) {
  return (
    <div
      data-testid="drag-ghost"
      style={{
        position: "fixed",
        left: x - 44,
        top: y - 62,
        zIndex: 100,
        pointerEvents: "none",
        transform: "rotate(-5deg) scale(1.05)",
        filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.55))",
      }}
    >
      <Card character={character} size="lg" selected />
    </div>
  );
}
