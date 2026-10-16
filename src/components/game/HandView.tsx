// Mão do jogador: as 5 cartas em leque (por enquanto todas, por causa do blefe).
// As que você TEM em cor cheia + borda dourada; as que só dá pra BLEFAR dessaturadas
// com a máscara (Card cuida do visual). Clicar numa carta USA o poder dela — a carta
// "armada" (esperando o alvo) fica levantada. Sem botões nem textos de instrução.
"use client";

import { CARD_BY_ID } from "@/src/lib/game/cards";
import type { Character, GameView } from "@/src/types/game";
import Card from "./Card";
import { ALL_CHARACTERS, myFaceDownChars } from "./helpers";
import { reducedMotion, tiltFromPointer } from "./motion";

export default function HandView({
  view,
  myId,
  armed,
  canAct,
  onUse,
  onPress,
  dragging,
}: {
  view: GameView;
  myId: string;
  armed: Character | null; // carta com ação pendente de alvo (levantada)
  canAct: boolean; // é a minha vez de agir
  onUse: (character: Character) => void;
  onPress: (character: Character, e: React.PointerEvent) => void; // início de arrasto
  dragging: Character | null; // carta que está sendo arrastada (fica esmaecida)
}) {
  const owned = myFaceDownChars(view, myId);
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 26 }}>
      {ALL_CHARACTERS.map((char, i) => {
        const have = owned.includes(char);
        const isArmed = armed === char;
        return (
          <Card
            key={char}
            size="lg"
            character={char}
            bluff={!have}
            selected={isArmed}
            hint={CARD_BY_ID[char].dica}
            className={canAct ? "hand-card can-act" : "hand-card"}
            onClick={canAct ? () => onUse(char) : undefined}
            foil={have}
            onPointerDown={canAct ? (e) => onPress(char, e) : undefined}
            onPointerMove={(e) => {
              if (reducedMotion() || dragging) return;
              const el = e.currentTarget;
              const r = el.getBoundingClientRect();
              const { rx, ry } = tiltFromPointer(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
              el.style.setProperty("--rx", `${rx.toFixed(1)}deg`);
              el.style.setProperty("--ry", `${ry.toFixed(1)}deg`);
              el.style.setProperty("--shine", `${Math.round(((e.clientX - r.left) / r.width) * 100)}%`);
            }}
            onPointerLeave={(e) => {
              e.currentTarget.style.removeProperty("--rx");
              e.currentTarget.style.removeProperty("--ry");
              e.currentTarget.style.removeProperty("--shine");
            }}
            style={
              {
                marginLeft: i === 0 ? 0 : 3,
                // --lift só é fixado inline quando armada; senão o :hover da classe manda.
                ...(isArmed ? { "--lift": "-26px" } : {}),
                transform: `rotate(${(i - 2) * 3}deg) translateY(${Math.abs(i - 2) * 3}px) translateY(var(--lift, 0px)) scale(${isArmed ? 1.1 : 1}) perspective(520px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))`,
                transformOrigin: "bottom center",
                zIndex: isArmed ? 10 : i,
                opacity: dragging === char ? 0.35 : canAct || isArmed ? 1 : 0.92,
                touchAction: "none",
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
