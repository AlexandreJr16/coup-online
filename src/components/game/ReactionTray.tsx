// Bandeja de reação (zona direita do dock, sempre no mesmo lugar): Contestar / Bloquear /
// Passar, em selos. Substitui o antigo modal central — a mesa continua visível.
// Quem não pode reagir (o ator, o bloqueador, eliminados) vê a bandeja vazia.
"use client";

import type { Character, GameView } from "@/src/types/game";
import ActionSeal from "./ActionSeal";
import { CHAR_LABEL, COLORS, legalBlockChars, reactorIds } from "./helpers";

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
  const pending = view.pending;
  const inWindow =
    pending !== null &&
    (view.phase === "janela_reacao_global" ||
      view.phase === "janela_reacao_vitima" ||
      view.phase === "janela_contestar_bloqueio");
  const canReact = inWindow && reactorIds(view).includes(myId);
  const passed = inWindow && pending!.passedIds.includes(myId);
  const canChallenge =
    view.phase === "janela_contestar_bloqueio" || pending?.claimedCharacter != null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 208 }}>
      {canReact && !passed && pending && (
        <>
          {canChallenge && (
            <ActionSeal icon="contestar" emoji="❗" label="Contestar" color={COLORS.red} onClick={onChallenge} />
          )}
          {view.phase !== "janela_contestar_bloqueio" &&
            legalBlockChars(pending.action, pending.targetId, myId).map((c) => (
              <ActionSeal
                key={c}
                icon="bloquear"
                emoji="🛡️"
                label={`Bloquear · ${CHAR_LABEL[c]}`}
                color="#9aa7b8"
                onClick={() => onBlock(c)}
              />
            ))}
          <ActionSeal icon="passar" emoji="🪭" label="Passar" color="#6b7186" onClick={onPass} />
        </>
      )}
      {canReact && passed && (
        <div style={{ color: COLORS.dim, textAlign: "center", fontSize: 13 }}>✔ passou</div>
      )}
    </div>
  );
}
