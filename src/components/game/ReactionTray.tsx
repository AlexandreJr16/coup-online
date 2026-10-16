// Bandeja de reação (zona direita do dock, sempre no mesmo lugar): Contestar / Bloquear /
// Passar, em selos com a tecla de atalho. Substitui o antigo modal central — a mesa continua
// visível. Quem não pode reagir (o ator, o bloqueador, eliminados) vê a bandeja vazia.
"use client";

import type { Character, GameView } from "@/src/types/game";
import ActionSeal from "./ActionSeal";
import { CHAR_LABEL, COLORS, reactionOptions } from "./helpers";

export default function ReactionTray({
  view,
  myId,
  onBlock,
  onChallenge,
  onPass,
}: {
  view: GameView;
  myId: string;
  onBlock: (character: Character) => void;
  onChallenge: () => void;
  onPass: () => void;
}) {
  const o = reactionOptions(view, myId);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 208 }}>
      {o.canReact && !o.passed && (
        <>
          {o.canChallenge && (
            <ActionSeal icon="contestar" emoji="❗" label="Contestar" color={COLORS.red} hotkey="C" onClick={onChallenge} />
          )}
          {o.blocks.map((c, i) => (
            <ActionSeal
              key={c}
              icon="bloquear"
              emoji="🛡️"
              label={`Bloquear · ${CHAR_LABEL[c]}`}
              color="#9aa7b8"
              hotkey={i === 0 ? "B" : undefined}
              onClick={() => onBlock(c)}
            />
          ))}
          <ActionSeal icon="passar" emoji="🪭" label="Passar" color="#6b7186" hotkey="Espaço" onClick={onPass} />
        </>
      )}
      {o.canReact && o.passed && (
        <div style={{ color: COLORS.dim, textAlign: "center", fontSize: 13 }}>✔ passou</div>
      )}
    </div>
  );
}
