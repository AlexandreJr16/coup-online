// Orquestrador da partida. Único ponto que fala com o Socket.IO. Monta a mesa,
// o overlay de reação (com countdown), os prompts de revelação/troca/vitória e
// — no seu turno — o modo de interação escolhido (ActionBar ou HandView) via a
// prop interactionMode. Não conhece os internos dos modos: passa o mesmo
// InteractionModeProps e coordena a seleção de alvo pela mesa.
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

import { getSocket } from "@/src/lib/socket";
import type { ActionType, Character, GameView } from "@/src/types/game";
import type { GameActionAck } from "@/src/types/socket";
import ActionBar from "./ActionBar";
import Card from "./Card";
import HandView from "./HandView";
import IntrigueFeed from "./IntrigueFeed";
import ReactionOverlay from "./ReactionOverlay";
import Table from "./Table";
import WaxSeal, { type SealData } from "./WaxSeal";
import { ACTION_META, CHAR_LABEL, CINZEL, COLORS } from "./helpers";
import { useGameEvents } from "./useGameEvents";

const REACTION_PHASES = new Set<GameView["phase"]>([
  "janela_reacao_global",
  "janela_reacao_vitima",
  "janela_contestar_bloqueio",
]);

export default function GameBoard({
  view,
  myId,
  interactionMode,
  absentIds = [],
}: {
  view: GameView;
  myId: string;
  interactionMode: "buttons" | "hand";
  absentIds?: string[]; // jogadores desconectados (a vez deles passa sozinha)
}) {
  const socket = getSocket();
  const [error, setError] = useState("");
  const [targetingAction, setTargetingAction] = useState<ActionType | null>(null);
  const [keepSel, setKeepSel] = useState<number[]>([]);

  const me = view.players.find((p) => p.id === myId);
  const name = (id: string | null) => view.players.find((p) => p.id === id)?.name ?? "?";

  // ── Countdown: o servidor manda quanto FALTA (view.timer.remainingMs) e o cliente
  // só anima a partir daí. Cada view nova reancora o relógio, então não há deriva
  // nem reinício quando alguém passa/reage sem fechar a janela. ────────────────
  const pending = view.pending;
  const timer = view.timer;
  const [tick, setTick] = useState<{ src: GameView["timer"]; left: number } | null>(null);
  useEffect(() => {
    if (!timer) return;
    const end = Date.now() + timer.remainingMs;
    const update = () => setTick({ src: timer, left: Math.max(0, (end - Date.now()) / 1000) });
    const raf = requestAnimationFrame(update);
    const id = setInterval(update, 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [timer]);
  const secondsLeft = timer ? (tick && tick.src === timer ? tick.left : timer.remainingMs / 1000) : 0;
  const decisionTimer = timer && !REACTION_PHASES.has(view.phase);

  // ── Eventos derivados (Feed/Economia) + selo de cera ──────────────────────
  const events = useGameEvents(view);
  const [seal, setSeal] = useState<SealData | null>(null);
  const sealCounter = useRef(0);
  const fireSeal = (title: string, subtitle?: string) =>
    setSeal({ key: ++sealCounter.current, title, subtitle });
  useEffect(() => {
    if (!events.block) return; // bloqueio de qualquer jogador → estampa "BLOQUEIO"
    setSeal({
      key: ++sealCounter.current,
      title: "BLOQUEIO",
      subtitle: CHAR_LABEL[events.block.character],
    });
  }, [events.block]);

  // ── Emissores (ack devolve erro de regra, privado) ────────────────────────
  const ack = (a: GameActionAck) => setError(a.ok ? "" : a.error);
  const emitAction = (action: ActionType, targetId?: string) => {
    setError("");
    socket.emit("game_action", { action, targetId }, ack);
  };

  function onAction(action: ActionType, targetId?: string) {
    setError("");
    if (targetId) return emitAction(action, targetId);
    if (ACTION_META[action].needsTarget) return setTargetingAction(action);
    emitAction(action);
  }
  function selectTarget(id: string) {
    if (!targetingAction) return;
    emitAction(targetingAction, id);
    setTargetingAction(null);
  }

  const targetIds =
    targetingAction != null
      ? view.players.filter((p) => !p.eliminated && p.id !== myId).map((p) => p.id)
      : [];

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        color: COLORS.text,
      }}
    >
      {/* Mesa — ocupa todo o espaço disponível */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <Table
          players={view.players}
          currentPlayerId={view.currentPlayerId}
          myId={myId}
          treasury={view.treasury}
          coinDeltas={events.coinDeltas}
          deltaKey={events.deltaKey}
          selectableTargetIds={targetIds}
          onSelectTarget={selectTarget}
        />

        {/* Feedback de turno do oponente: banner central (P3) */}
        {view.phase === "aguardando_acao" && view.currentPlayerId !== myId && (
          <div style={turnBanner}>
            ⏳ Vez de{" "}
            <b style={{ fontFamily: CINZEL, letterSpacing: 0.5 }}>
              {name(view.currentPlayerId)}
            </b>
            {view.currentPlayerId && absentIds.includes(view.currentPlayerId) && (
              <span style={{ color: COLORS.dim }}> · sem conexão, joga sozinho em instantes</span>
            )}
          </div>
        )}

        {/* Banner de seleção de alvo (sobre a mesa) */}
        {targetingAction && (
          <div style={banner}>
            🎯 Escolha o alvo de <b>{ACTION_META[targetingAction].label}</b> (clique num avatar)
            <button onClick={() => setTargetingAction(null)} style={linkBtn}>
              cancelar
            </button>
          </div>
        )}

        {/* Tempo do turno / revelação / troca (as janelas de reação têm barra própria) */}
        {decisionTimer && (
          <div
            style={{
              ...timerPill,
              color: secondsLeft <= 10 ? "#fff" : COLORS.text,
              background: secondsLeft <= 10 ? "rgba(192,57,43,0.9)" : "rgba(20,20,40,0.85)",
            }}
          >
            ⏱ {Math.ceil(secondsLeft)}s
          </div>
        )}

        {/* Feed de Intrigas (overlay recolhível) */}
        <IntrigueFeed log={events.log} />
      </div>

      {/* Overlay de reação (cobre o tabuleiro inteiro) */}
      {REACTION_PHASES.has(view.phase) && (
        <ReactionOverlay
          view={view}
          myId={myId}
          secondsLeft={secondsLeft}
          onBlock={(c: Character) => {
            setError("");
            socket.emit("game_block", { character: c }, ack);
          }}
          onChallenge={() => {
            setError("");
            fireSeal("CONTESTADO!");
            socket.emit("game_challenge", ack);
          }}
          onPass={() => {
            setError("");
            socket.emit("game_pass", ack);
          }}
        />
      )}

      {/* Selo de cera — acima do overlay de reação */}
      <WaxSeal seal={seal} />

      {/* Barra inferior fixa: prompts da fase ou o modo de interação */}
      <div style={bottomBar}>
       <div style={{ width: "100%", maxWidth: 960, margin: "0 auto" }}>
        {view.phase === "aguardando_revelacao" &&
          (view.mustRevealPlayerId === myId ? (
            <div style={panel}>
              <p>Você perdeu uma influência. Escolha a carta a revelar:</p>
              <div style={{ display: "flex", gap: 10 }}>
                {me?.cards.map((c, i) =>
                  c.revealed ? null : (
                    <Card
                      key={i}
                      size="lg"
                      character={c.character}
                      onClick={() => {
                        setError("");
                        socket.emit("game_reveal", { cardIndex: i }, ack);
                      }}
                    />
                  ),
                )}
              </div>
            </div>
          ) : (
            <Center>Aguardando {name(view.mustRevealPlayerId)} revelar uma carta…</Center>
          ))}

        {view.phase === "aguardando_troca" &&
          (view.exchange ? (
            <ExchangePanel
              pool={view.exchange.pool}
              keepCount={me?.cards.filter((c) => !c.revealed).length ?? 0}
              selected={keepSel}
              onToggle={(i, keepCount) =>
                setKeepSel((cur) =>
                  cur.includes(i)
                    ? cur.filter((x) => x !== i)
                    : cur.length < keepCount
                      ? [...cur, i]
                      : cur,
                )
              }
              onConfirm={() => {
                setError("");
                socket.emit(
                  "game_exchange",
                  { keep: keepSel.map((i) => view.exchange!.pool[i]) },
                  ack,
                );
                setKeepSel([]);
              }}
            />
          ) : (
            <Center>Aguardando {name(pending?.actorId ?? null)} trocar cartas…</Center>
          ))}

        {view.phase === "aguardando_acao" &&
          (view.currentPlayerId === myId ? (
            interactionMode === "hand" ? (
              <HandView view={view} myId={myId} onAction={onAction} />
            ) : (
              <ActionBar view={view} myId={myId} onAction={onAction} />
            )
          ) : (
            <Center>Vez de {name(view.currentPlayerId)}…</Center>
          ))}

        {view.phase === "fim_de_jogo" && (
          <div style={{ ...panel, textAlign: "center" }}>
            <h2 style={{ color: COLORS.gold, fontFamily: CINZEL, letterSpacing: 0.5 }}>
              🏆 Vencedor: {name(view.winnerId)}
            </h2>
          </div>
        )}

        {error && (
          <p style={{ color: COLORS.red, marginTop: 8, textAlign: "center" }}>{error}</p>
        )}
       </div>
      </div>
    </div>
  );
}

function ExchangePanel({
  pool,
  keepCount,
  selected,
  onToggle,
  onConfirm,
}: {
  pool: Character[];
  keepCount: number;
  selected: number[];
  onToggle: (i: number, keepCount: number) => void;
  onConfirm: () => void;
}) {
  return (
    <div style={panel}>
      <p>Troca (Embaixador): mantenha {keepCount} carta(s).</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        {pool.map((c, i) => (
          <Card
            key={i}
            size="lg"
            character={c}
            selected={selected.includes(i)}
            onClick={() => onToggle(i, keepCount)}
            style={{
              transform: selected.includes(i) ? "translateY(-10px)" : undefined,
              transition: "transform 120ms ease",
            }}
          />
        ))}
      </div>
      <button
        onClick={onConfirm}
        disabled={selected.length !== keepCount}
        style={{ ...cardBtn, width: "auto", padding: "8px 16px", opacity: selected.length === keepCount ? 1 : 0.5 }}
      >
        Confirmar troca
      </button>
    </div>
  );
}

function Center({ children }: { children: ReactNode }) {
  return <p style={{ textAlign: "center", color: COLORS.dim }}>{children}</p>;
}

const banner: CSSProperties = {
  position: "absolute",
  top: 12,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 5,
  display: "flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  background: "rgba(192,57,43,0.85)",
  borderRadius: 999,
  boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
  whiteSpace: "nowrap",
};
const turnBanner: CSSProperties = {
  position: "absolute",
  top: 12,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 5,
  padding: "8px 16px",
  background: "rgba(20,20,40,0.85)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
  whiteSpace: "nowrap",
};
const timerPill: CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  zIndex: 5,
  padding: "6px 12px",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  fontVariantNumeric: "tabular-nums",
  boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
};
const bottomBar: CSSProperties = {
  flex: "none",
  display: "flex",
  alignItems: "center",
  background: "#15152b",
  borderTop: "1px solid rgba(255,255,255,0.07)",
  padding: "14px 16px",
  minHeight: 104,
};
const panel: CSSProperties = {
  padding: 16,
  background: "rgba(0,0,0,0.35)",
  borderRadius: 10,
};
const cardBtn: CSSProperties = {
  width: 100,
  padding: "10px 8px",
  fontWeight: 600,
  color: COLORS.text,
  background: "#3b2f63",
  border: `1px solid ${COLORS.neutral}`,
  borderRadius: 8,
  cursor: "pointer",
};
const linkBtn: CSSProperties = {
  background: "none",
  border: "none",
  color: COLORS.gold,
  textDecoration: "underline",
  cursor: "pointer",
};
