// UI mínima do jogo. Renderiza a GameView (já filtrada pelo servidor) e oferece
// os controles válidos por fase. A engine é quem valida de verdade: cada emit
// tem ack e, se a regra recusar, só mostramos o erro. Estilo cru de propósito.
"use client";

import { type CSSProperties, type ReactNode, useState } from "react";

import { getSocket } from "@/src/lib/socket";
import type { ActionType, Character, GameView } from "@/src/types/game";

const CHAR_LABEL: Record<Character, string> = {
  duque: "Duque",
  assassino: "Assassino",
  capitao: "Capitão",
  embaixador: "Embaixador",
  condessa: "Condessa",
};

const ACTION_LABEL: Record<ActionType, string> = {
  renda: "Renda",
  ajuda_externa: "Ajuda Externa",
  golpe: "Golpe de Estado",
  taxas: "Taxas",
  assassinar: "Assassinar",
  extorquir: "Extorquir",
  trocar: "Trocar",
};

export default function GameBoard({
  view,
  myId,
}: {
  view: GameView;
  myId: string;
}) {
  const socket = getSocket();
  const [error, setError] = useState("");
  const [targetId, setTargetId] = useState("");
  const [keep, setKeep] = useState<number[]>([]); // índices escolhidos na troca

  // Wrapper de emit: limpa erro e exibe a recusa da engine, se houver.
  type Ack = { ok: true } | { ok: false; error: string };
  function onAck(ack: Ack) {
    setError(ack.ok ? "" : ack.error);
  }

  const me = view.players.find((p) => p.id === myId);
  const isMyTurn = view.currentPlayerId === myId;
  const pending = view.pending;
  const opponents = view.players.filter((p) => !p.eliminated && p.id !== myId);
  const mustCoup = (me?.coins ?? 0) >= 10;

  function action(a: ActionType, withTarget = false) {
    setError("");
    if (withTarget && !targetId) return setError("Escolha um alvo.");
    socket.emit(
      "game_action",
      { action: a, targetId: withTarget ? targetId : undefined },
      onAck,
    );
  }

  // ── Controles por fase ──────────────────────────────────────────────────
  function controls() {
    switch (view.phase) {
      case "aguardando_acao":
        if (!isMyTurn) return <Waiting players={view} id={view.currentPlayerId} verb="jogar" />;
        return (
          <div>
            {mustCoup && <p>⚠️ 10+ moedas: só Golpe de Estado.</p>}
            <div style={ROW}>
              <Btn on={() => action("renda")} off={mustCoup}>Renda</Btn>
              <Btn on={() => action("ajuda_externa")} off={mustCoup}>Ajuda Externa</Btn>
              <Btn on={() => action("taxas")} off={mustCoup}>Taxas (Duque)</Btn>
              <Btn on={() => action("trocar")} off={mustCoup}>Trocar (Embaixador)</Btn>
            </div>
            <div style={{ ...ROW, marginTop: 8 }}>
              <label>
                Alvo:{" "}
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">—</option>
                  {opponents.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <Btn on={() => action("golpe", true)} off={(me?.coins ?? 0) < 7}>Golpe (7)</Btn>
              <Btn on={() => action("assassinar", true)} off={mustCoup || (me?.coins ?? 0) < 3}>Assassinar (3)</Btn>
              <Btn on={() => action("extorquir", true)} off={mustCoup}>Extorquir</Btn>
            </div>
          </div>
        );

      case "janela_reacao_global":
      case "janela_reacao_vitima": {
        if (!pending) return null;
        if (pending.actorId === myId) return <p>Aguardando reações dos outros…</p>;
        const canChallenge = pending.claimedCharacter !== null;
        const blockChars = legalBlockChars(pending.action, pending.targetId, myId);
        return (
          <div style={ROW}>
            {canChallenge && (
              <Btn on={() => socket.emit("game_challenge", onAck)}>Contestar</Btn>
            )}
            {blockChars.map((c) => (
              <Btn key={c} on={() => socket.emit("game_block", { character: c }, onAck)}>
                Bloquear ({CHAR_LABEL[c]})
              </Btn>
            ))}
            <span style={{ alignSelf: "center" }}>ou aguarde o tempo…</span>
          </div>
        );
      }

      case "janela_contestar_bloqueio": {
        const b = pending?.block;
        if (!b) return null;
        const blocker = view.players.find((p) => p.id === b.blockerId);
        return (
          <div>
            <p>🛡️ {blocker?.name} bloqueou alegando {CHAR_LABEL[b.character]}.</p>
            {b.blockerId !== myId ? (
              <Btn on={() => socket.emit("game_challenge", onAck)}>Contestar bloqueio</Btn>
            ) : (
              <p>Aguardando contestação…</p>
            )}
          </div>
        );
      }

      case "aguardando_revelacao": {
        if (view.mustRevealPlayerId !== myId) {
          return <Waiting players={view} id={view.mustRevealPlayerId} verb="revelar uma carta" />;
        }
        return (
          <div>
            <p>Você perdeu uma influência. Escolha a carta a revelar:</p>
            <div style={ROW}>
              {me?.cards.map((c, i) =>
                c.revealed ? null : (
                  <Btn key={i} on={() => socket.emit("game_reveal", { cardIndex: i }, onAck)}>
                    {c.character ? CHAR_LABEL[c.character] : "?"}
                  </Btn>
                ),
              )}
            </div>
          </div>
        );
      }

      case "aguardando_troca": {
        if (!view.exchange) {
          return <Waiting players={view} id={pending?.actorId ?? null} verb="trocar cartas" />;
        }
        const keepCount = me?.cards.filter((c) => !c.revealed).length ?? 0;
        const toggle = (i: number) =>
          setKeep((cur) =>
            cur.includes(i)
              ? cur.filter((x) => x !== i)
              : cur.length < keepCount
                ? [...cur, i]
                : cur,
          );
        return (
          <div>
            <p>Troca (Embaixador): mantenha {keepCount} carta(s).</p>
            <div style={ROW}>
              {view.exchange.pool.map((c, i) => (
                <Btn key={i} on={() => toggle(i)} highlight={keep.includes(i)}>
                  {CHAR_LABEL[c]}
                </Btn>
              ))}
            </div>
            <Btn
              on={() => {
                socket.emit(
                  "game_exchange",
                  { keep: keep.map((i) => view.exchange!.pool[i]) },
                  onAck,
                );
                setKeep([]);
              }}
              off={keep.length !== keepCount}
            >
              Confirmar troca
            </Btn>
          </div>
        );
      }

      case "fim_de_jogo": {
        const winner = view.players.find((p) => p.id === view.winnerId);
        return <h2>🏆 Vencedor: {winner?.name ?? "—"}</h2>;
      }
    }
  }

  return (
    <div>
      {pending && view.phase !== "fim_de_jogo" && (
        <p style={{ background: "#f3f3f3", padding: 8 }}>
          {playerName(view, pending.actorId)} usou <b>{ACTION_LABEL[pending.action]}</b>
          {pending.targetId ? ` em ${playerName(view, pending.targetId)}` : ""}.
          {view.timer ? ` (${view.timer.seconds}s)` : ""}
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {view.players.map((p) => (
          <li
            key={p.id}
            style={{
              padding: 6,
              opacity: p.eliminated ? 0.4 : 1,
              fontWeight: p.id === view.currentPlayerId ? "bold" : "normal",
            }}
          >
            {p.id === view.currentPlayerId ? "▶ " : ""}
            {p.name}
            {p.id === myId ? " (você)" : ""} — 🪙 {p.coins} —{" "}
            {p.cards
              .map((c) =>
                c.revealed
                  ? `✖ ${c.character ? CHAR_LABEL[c.character] : "?"}`
                  : c.character
                    ? `🂠 ${CHAR_LABEL[c.character]}`
                    : "🂠",
              )
              .join("  ")}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 16 }}>{controls()}</div>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}

// ── Helpers de UI ───────────────────────────────────────────────────────────
const ROW: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };

function Btn({
  children,
  on,
  off,
  highlight,
}: {
  children: ReactNode;
  on: () => void;
  off?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={on}
      disabled={off}
      style={{
        padding: "6px 12px",
        background: highlight ? "#cde" : undefined,
        cursor: off ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Waiting({
  players,
  id,
  verb,
}: {
  players: GameView;
  id: string | null;
  verb: string;
}) {
  return <p>Aguardando {playerName(players, id)} {verb}…</p>;
}

function playerName(view: GameView, id: string | null): string {
  return view.players.find((p) => p.id === id)?.name ?? "?";
}

// Personagens que ESTE jogador pode alegar para bloquear a ação (game-rules.md).
function legalBlockChars(
  action: ActionType,
  targetId: string | null,
  myId: string,
): Character[] {
  switch (action) {
    case "ajuda_externa":
      return ["duque"]; // qualquer um
    case "assassinar":
      return targetId === myId ? ["condessa"] : [];
    case "extorquir":
      return targetId === myId ? ["capitao", "embaixador"] : [];
    default:
      return [];
  }
}
