// Bandeja de reação (zona direita do dock, sempre no mesmo lugar): Contestar /
// Bloquear / Passar. Substitui o antigo modal central — a mesa continua visível.
// Quem não pode reagir (o ator, o bloqueador, eliminados) vê a bandeja vazia.
"use client";

import type { CSSProperties, ReactNode } from "react";

import type { Character, GameView } from "@/src/types/game";
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 208 }}>
      {canReact && !passed && pending && (
        <>
          {view.phase === "janela_contestar_bloqueio" ? (
            <Btn color={COLORS.red} on={onChallenge}>Contestar</Btn>
          ) : (
            pending.claimedCharacter !== null && (
              <Btn color={COLORS.red} on={onChallenge}>Contestar</Btn>
            )
          )}
          {view.phase !== "janela_contestar_bloqueio" &&
            legalBlockChars(pending.action, pending.targetId, myId).map((c) => (
              <Btn key={c} color={COLORS.neutral} on={() => onBlock(c)}>
                Bloquear · {CHAR_LABEL[c]}
              </Btn>
            ))}
          <Btn color="#3a3f55" on={onPass}>Passar</Btn>
        </>
      )}
      {canReact && passed && (
        <div style={{ color: COLORS.dim, textAlign: "center", fontSize: 13 }}>✔ passou</div>
      )}
    </div>
  );
}

function Btn({ children, color, on }: { children: ReactNode; color: string; on: () => void }) {
  return (
    <button
      onClick={on}
      className="game-btn"
      style={{ padding: "9px 14px", fontSize: 14, whiteSpace: "nowrap", color: COLORS.text, "--c": color } as CSSProperties}
    >
      {children}
    </button>
  );
}
