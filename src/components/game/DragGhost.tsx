// Carta "fantasma" que acompanha o mouse enquanto você arrasta um poder da mão.
"use client";

import type { Character } from "@/src/types/game";
import Card from "./Card";
import { U } from "./escalaMesa";

export default function DragGhost({ character, x, y }: { character: Character; x: number; y: number }) {
  return (
    <div
      data-testid="drag-ghost"
      style={{
        position: "fixed",
        left: `calc(${x}px - ${U(44)})`, // metade da carta lg (88x124): o mouse segura o centro
        top: `calc(${y}px - ${U(62)})`,
        zIndex: 100,
        pointerEvents: "none",
        transform: "rotate(-5deg) scale(1.05)",
        filter: `drop-shadow(0 ${U(14)} ${U(18)} rgba(0,0,0,0.55))`,
      }}
    >
      <Card character={character} size="lg" selected />
    </div>
  );
}
