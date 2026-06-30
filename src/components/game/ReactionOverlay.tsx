// Overlay das janelas de reação (DESIGN.md): mostra ator·ação·alvo, uma barra
// de timer REGRESSIVA sempre visível e os botões elegíveis para este jogador
// (Contestar / Bloquear / Contestar bloqueio). secondsLeft vem do GameBoard
// (countdown client-side); a engine continua dona do expiry real.
"use client";

import type { ReactNode } from "react";

import type { Character, GameView } from "@/src/types/game";
import { ACTION_META, CHAR_LABEL, COLORS, legalBlockChars } from "./helpers";

export default function ReactionOverlay({
  view,
  myId,
  secondsLeft,
  onBlock,
  onChallenge,
}: {
  view: GameView;
  myId: string;
  secondsLeft: number;
  onBlock: (character: Character) => void;
  onChallenge: () => void;
}) {
  const pending = view.pending;
  if (!pending) return null;

  const total = view.timer?.seconds ?? (secondsLeft || 1);
  const pct = Math.max(0, Math.min(100, (secondsLeft / total) * 100));
  const name = (id: string | null) =>
    view.players.find((p) => p.id === id)?.name ?? "?";

  // Conteúdo conforme a fase.
  let headline: string;
  const buttons: ReactNode[] = [];

  if (view.phase === "janela_contestar_bloqueio" && pending.block) {
    const b = pending.block;
    headline = `🛡️ ${name(b.blockerId)} bloqueou alegando ${CHAR_LABEL[b.character]}`;
    if (b.blockerId !== myId) {
      buttons.push(
        <Btn key="ch" color={COLORS.red} on={onChallenge}>Contestar bloqueio</Btn>,
      );
    }
  } else {
    headline = `${name(pending.actorId)} usou ${ACTION_META[pending.action].label}${
      pending.targetId ? ` em ${name(pending.targetId)}` : ""
    }`;
    if (pending.actorId !== myId) {
      if (pending.claimedCharacter !== null) {
        buttons.push(
          <Btn key="ch" color={COLORS.red} on={onChallenge}>Contestar</Btn>,
        );
      }
      for (const c of legalBlockChars(pending.action, pending.targetId, myId)) {
        buttons.push(
          <Btn key={c} color={COLORS.neutral} on={() => onBlock(c)}>
            Bloquear ({CHAR_LABEL[c]})
          </Btn>,
        );
      }
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          minWidth: 320,
          maxWidth: 460,
          background: "#20203a",
          border: `1px solid ${COLORS.neutral}`,
          borderRadius: 12,
          padding: 20,
          color: COLORS.text,
          textAlign: "center",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Timer regressivo — sempre visível */}
        <div style={{ height: 8, background: "#0d0d18", borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: pct < 30 ? COLORS.red : COLORS.gold,
              transition: "width 250ms linear",
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: COLORS.dim, marginTop: 4 }}>
          {Math.ceil(secondsLeft)}s
        </div>

        <p style={{ fontSize: 16, fontWeight: 600, margin: "12px 0" }}>{headline}</p>

        {buttons.length > 0 ? (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {buttons}
          </div>
        ) : (
          <p style={{ color: COLORS.dim }}>Aguardando reações…</p>
        )}
      </div>
    </div>
  );
}

function Btn({
  children,
  color,
  on,
}: {
  children: ReactNode;
  color: string;
  on: () => void;
}) {
  return (
    <button
      onClick={on}
      style={{
        padding: "8px 16px",
        fontSize: 14,
        fontWeight: 600,
        color: COLORS.text,
        background: color,
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
