// Tela de vitória: quem venceu e os prêmios da partida (calculados das estatísticas
// públicas). Cobre a mesa, mas o dock continua visível; "Jogar de novo" inicia a revanche.
"use client";

import type { CSSProperties } from "react";

import { type Award, computeAwards } from "@/src/lib/game/awards";
import type { GameView } from "@/src/types/game";
import ActionSeal from "./ActionSeal";
import { avatarColor, avatarInitials, CINZEL, COLORS } from "./helpers";

const EMOJI: Record<Award["id"], string> = {
  mentiroso: "🤥",
  desconfiado: "🤨",
  olho_de_lince: "🦅",
  carrasco: "⚔️",
  ricaco: "💰",
};

// `onRematch` ausente = espectador: só aguarda (ele entra na próxima partida).
export default function VictoryPanel({ view, onRematch }: { view: GameView; onRematch?: () => void }) {
  const winner = view.players.find((p) => p.id === view.winnerId);
  const names = Object.fromEntries(view.players.map((p) => [p.id, p.name]));
  const awards = computeAwards(view.stats, names);

  return (
    <div data-testid="victory" style={veil}>
      <div style={panel}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          {winner && (
            <div style={{ ...badge, background: avatarColor(winner.name) }}>{avatarInitials(winner.name)}</div>
          )}
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, letterSpacing: 2, color: "#7c6f8a" }}>PARTIDA {view.matchNumber}</div>
            <h2 style={{ margin: 0, fontFamily: CINZEL, fontSize: 28, color: "#8a5a14" }}>
              🏆 {winner ? `${winner.name} vence!` : "Empate"}
            </h2>
          </div>
        </div>

        <ul style={{ listStyle: "none", margin: "18px 0 20px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {awards.length === 0 && (
            <li style={{ color: "#7c6f8a" }}>Partida tranquila: ninguém levou prêmio.</li>
          )}
          {awards.map((a) => (
            <li key={a.id} data-award={a.id} style={row}>
              <span style={{ fontSize: 24 }}>{EMOJI[a.id]}</span>
              <span style={{ flex: 1, textAlign: "left" }}>
                <b style={{ fontFamily: CINZEL }}>{a.titulo}</b>
                <span style={{ display: "block", fontSize: 12, color: "#5c4a38" }}>
                  {a.names.join(" e ")} · {a.detalhe}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", justifyContent: "center" }}>
          {onRematch ? (
            <ActionSeal icon="trocar" emoji="🔄" label="Jogar de novo" color={COLORS.gold} onClick={onRematch} />
          ) : (
            <p data-testid="victory-wait" style={{ margin: 0, color: COLORS.dim, fontSize: 14, textAlign: "center" }}>
              Você está assistindo: se um jogador pedir a revanche, você entra na próxima partida.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const veil: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(10,8,16,0.68)",
};
const panel: CSSProperties = {
  width: "min(480px, 92%)",
  padding: "22px 26px 24px",
  textAlign: "center",
  color: "#2b2236",
  background: "linear-gradient(#e9dcbf, #d8c59a)",
  border: "2px solid #b8923f",
  borderRadius: 14,
  boxShadow: "0 18px 50px rgba(0,0,0,0.6)",
};
const badge: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 20,
  color: "#fff",
  border: "3px solid #8a5a14",
};
const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 12px",
  background: "rgba(255,255,255,0.35)",
  border: "1px solid rgba(138,90,20,0.35)",
  borderRadius: 8,
};
