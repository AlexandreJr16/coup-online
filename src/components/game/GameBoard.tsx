// Orquestrador da partida. Único ponto que fala com o Socket.IO. Layout em ZONAS
// FIXAS (DESIGN_MESA_V2): a mesa ocupa o espaço de cima; o DOCK de baixo tem altura
// fixa e três zonas que nunca mudam de lugar — ações básicas (esq.), mão ou escolha
// da hora (centro) e reações (dir.). O estado do jogo aparece na própria mesa
// (brilho no turno, mira nos alvos, ✔ em quem passou), não em banners de texto.
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

import { readAutoPass, saveAutoPass } from "@/src/lib/session";
import { getSocket } from "@/src/lib/socket";
import type { ActionType, Character, GameView } from "@/src/types/game";
import type { GameActionAck } from "@/src/types/socket";
import AutoPassToggle from "./AutoPassToggle";
import BasicActions from "./BasicActions";
import Card from "./Card";
import ClaimPlate from "./ClaimPlate";
import HandView from "./HandView";
import IntrigueFeed from "./IntrigueFeed";
import ReactionTray from "./ReactionTray";
import Table from "./Table";
import WaxSeal, { type SealData } from "./WaxSeal";
import {
  ACTION_META,
  actionBlockedReason,
  CHAR_LABEL,
  CHARACTER_ACTION,
  CINZEL,
  COLORS,
  reactionOptions,
  requiredCharacter,
} from "./helpers";
import { useGameEvents } from "./useGameEvents";

const REACTION_PHASES = new Set<GameView["phase"]>([
  "janela_reacao_global",
  "janela_reacao_vitima",
  "janela_contestar_bloqueio",
]);

const DOCK_HEIGHT = 214;

export default function GameBoard({
  view,
  myId,
  absentIds = [],
}: {
  view: GameView;
  myId: string;
  absentIds?: string[]; // jogadores desconectados (a vez deles passa sozinha)
}) {
  const socket = getSocket();
  const [error, setError] = useState("");
  const [targetingAction, setTargetingAction] = useState<ActionType | null>(null);
  const [keepSel, setKeepSel] = useState<number[]>([]);

  const me = view.players.find((p) => p.id === myId);
  const name = (id: string | null) => view.players.find((p) => p.id === id)?.name ?? "?";
  const canAct = view.phase === "aguardando_acao" && view.currentPlayerId === myId && !me?.eliminated;

  // ── Countdown: o servidor manda quanto FALTA (view.timer.remainingMs) e o cliente
  // só anima a partir daí. Cada view nova reancora o relógio, então não há deriva
  // nem reinício quando alguém passa/reage sem fechar a janela. ────────────────
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
  const inReaction = REACTION_PHASES.has(view.phase);
  const decisionTimer = timer && !inReaction;

  // ── Eventos derivados (Feed/Economia) + selo de cera ──────────────────────
  const events = useGameEvents(view);
  const [seal, setSeal] = useState<SealData | null>(null);
  const sealCounter = useRef(0);
  useEffect(() => {
    if (!events.challenge) return; // contestação de QUALQUER jogador → todos veem o selo
    setSeal({
      key: ++sealCounter.current,
      title: "CONTESTADO!",
      subtitle: `${events.challenge.title} · ${events.challenge.verdict}`,
    });
  }, [events.challenge]);
  useEffect(() => {
    if (!events.block) return; // bloqueio de qualquer jogador → estampa "BLOQUEIO"
    setSeal({
      key: ++sealCounter.current,
      title: "BLOQUEIO",
      subtitle: CHAR_LABEL[events.block.character],
    });
  }, [events.block]);

  // ── Passar automático: o servidor guarda; aqui só o interruptor (reenviado ao montar) ──
  const [autoPass, setAutoPass] = useState(readAutoPass);
  useEffect(() => {
    socket.emit("game_autopass", { enabled: autoPass }, () => {});
  }, [socket, autoPass]);
  const toggleAutoPass = (enabled: boolean) => {
    setAutoPass(enabled);
    saveAutoPass(enabled);
  };

  // ── Atalhos de teclado nas janelas de reação: Espaço passa, C contesta, B bloqueia ──
  const reaction = reactionOptions(view, myId);
  useEffect(() => {
    if (!reaction.canReact || reaction.passed) return;
    const done = (a: GameActionAck) => setError(a.ok ? "" : a.error);
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const act =
        e.code === "Space" || k === " "
          ? () => socket.emit("game_pass", done)
          : k === "c" && reaction.canChallenge
            ? () => socket.emit("game_challenge", done)
            : k === "b" && reaction.blocks.length > 0
              ? () => socket.emit("game_block", { character: reaction.blocks[0] }, done)
              : null;
      if (!act) return;
      e.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur(); // Espaço não reativa o botão focado
      setError("");
      act();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `blocks` entra como string estável (a lista é recriada a cada render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction.canReact, reaction.passed, reaction.canChallenge, reaction.blocks.join(","), socket]);

  // Mensagens de erro somem sozinhas; Esc cancela a escolha de alvo.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(""), 3200);
    return () => clearTimeout(id);
  }, [error]);
  useEffect(() => {
    if (!targetingAction) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTargetingAction(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [targetingAction]);
  // Saiu da minha vez (timeout, etc.): descarta a mira pendente. (Ajuste de estado
  // na renderização quando a prop muda — padrão do React, sem efeito em cascata.)
  const [prevCanAct, setPrevCanAct] = useState(canAct);
  if (prevCanAct !== canAct) {
    setPrevCanAct(canAct);
    if (!canAct) setTargetingAction(null);
  }

  // ── Emissores (ack devolve erro de regra, privado) ────────────────────────
  const ack = (a: GameActionAck) => setError(a.ok ? "" : a.error);
  const emitAction = (action: ActionType, targetId?: string) => {
    setError("");
    socket.emit("game_action", { action, targetId }, ack);
  };

  function onAction(action: ActionType) {
    if (!canAct) return;
    const why = actionBlockedReason(me?.coins ?? 0, action);
    if (why) return setError(why);
    if (ACTION_META[action].needsTarget) return setTargetingAction(action);
    emitAction(action);
  }
  // Clicar numa carta da mão = usar o poder dela (clicar de novo cancela a mira).
  function onUse(char: Character) {
    const action = CHARACTER_ACTION[char];
    if (!action) return setError(`${CHAR_LABEL[char]} não tem ação de turno: só reage.`);
    if (targetingAction === action) return setTargetingAction(null);
    onAction(action);
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
  const armedChar = targetingAction ? requiredCharacter(targetingAction) : null;

  // Quem a mesa está esperando (marca o assento): revelar carta ou escolher a troca.
  const urgentIds =
    view.phase === "aguardando_revelacao" && view.mustRevealPlayerId
      ? [view.mustRevealPlayerId]
      : view.phase === "aguardando_troca" && view.currentPlayerId
        ? [view.currentPlayerId]
        : [];

  // ── Zona central do dock: o que o jogador faz AGORA ───────────────────────
  let center: ReactNode;
  if (view.phase === "fim_de_jogo") {
    center = (
      <div style={{ textAlign: "center" }}>
        <h2 style={{ margin: "0 0 10px", color: COLORS.gold, fontFamily: CINZEL, letterSpacing: 0.5 }}>
          🏆 {name(view.winnerId)}
        </h2>
        {me && (
          <button
            onClick={() => {
              setError("");
              socket.emit("game_rematch", ack);
            }}
            className="game-btn"
            style={{ padding: "10px 20px", fontSize: 15, color: "#1a1a2e", "--c": COLORS.gold } as CSSProperties}
          >
            Jogar de novo
          </button>
        )}
      </div>
    );
  } else if (me?.eliminated) {
    center = <span style={{ color: COLORS.dim }}>☠ Você foi exilado</span>;
  } else if (view.phase === "aguardando_revelacao" && view.mustRevealPlayerId === myId) {
    // Só as MINHAS cartas ocultas, pulsando: clicar numa revela (perde a influência).
    center = (
      <div style={{ display: "flex", gap: 14 }}>
        {me?.cards.map((c, i) =>
          c.revealed ? null : (
            <div key={i} className="urgent-pulse" style={{ borderRadius: 10 }}>
              <Card
                size="lg"
                character={c.character}
                onClick={() => {
                  setError("");
                  socket.emit("game_reveal", { cardIndex: i }, ack);
                }}
                style={{ cursor: "pointer" }}
              />
            </div>
          ),
        )}
      </div>
    );
  } else if (view.phase === "aguardando_troca" && view.exchange) {
    const keepCount = me?.cards.filter((c) => !c.revealed).length ?? 0;
    const pool = view.exchange.pool;
    center = (
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {pool.map((c, i) => (
          <Card
            key={i}
            size="lg"
            character={c}
            selected={keepSel.includes(i)}
            onClick={() =>
              setKeepSel((cur) =>
                cur.includes(i) ? cur.filter((x) => x !== i) : cur.length < keepCount ? [...cur, i] : cur,
              )
            }
            style={{
              transform: keepSel.includes(i) ? "translateY(-12px)" : undefined,
              transition: "transform 120ms ease",
            }}
          />
        ))}
        <button
          onClick={() => {
            setError("");
            socket.emit("game_exchange", { keep: keepSel.map((i) => pool[i]) }, ack);
            setKeepSel([]);
          }}
          disabled={keepSel.length !== keepCount}
          className="game-btn"
          style={{ padding: "10px 16px", fontSize: 14, color: "#1a1a2e", "--c": COLORS.gold } as CSSProperties}
        >
          Manter {keepCount}
        </button>
      </div>
    );
  } else {
    center = <HandView view={view} myId={myId} armed={armedChar} canAct={canAct} onUse={onUse} />;
  }

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", color: COLORS.text }}>
      {/* Mesa — ocupa todo o espaço acima do dock */}
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
          dimOthers={view.phase === "aguardando_acao"}
          urgentIds={urgentIds}
          passedIds={view.pending?.passedIds ?? []}
        />

        {/* Jogada em andamento (informação; não bloqueia a mesa) */}
        {inReaction && <ClaimPlate view={view} secondsLeft={secondsLeft} />}

        {/* Tempo do turno / revelação / troca (as janelas têm a barra na placa) */}
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

        {/* Jogador da vez sem conexão: aviso discreto junto do timer */}
        {view.currentPlayerId && absentIds.includes(view.currentPlayerId) && (
          <div style={{ ...timerPill, top: 52, color: COLORS.dim, background: "rgba(20,20,40,0.85)" }}>
            sem conexão
          </div>
        )}

        <IntrigueFeed log={events.log} />

        {/* Retorno rápido de regra (some sozinho) */}
        {error && <div style={toast}>{error}</div>}
      </div>

      {/* Selo de cera — acima de tudo */}
      <WaxSeal seal={seal} />

      {/* DOCK fixo: ações básicas · mão/escolha · reações */}
      <div data-testid="dock" style={dock}>
        <div data-zone="basicas" style={{ justifySelf: "end" }}>
          <BasicActions view={view} myId={myId} canAct={canAct} onAction={onAction} />
        </div>
        <div data-zone="centro" style={{ display: "flex", justifyContent: "center", minWidth: 380 }}>
          {center}
        </div>
        <div data-zone="reacoes" style={{ justifySelf: "start", display: "flex", flexDirection: "column", gap: 12 }}>
          <ReactionTray
            view={view}
            myId={myId}
            onBlock={(c) => {
              setError("");
              socket.emit("game_block", { character: c }, ack);
            }}
            onChallenge={() => {
              setError("");
              socket.emit("game_challenge", ack);
            }}
            onPass={() => {
              setError("");
              socket.emit("game_pass", ack);
            }}
          />
          <AutoPassToggle enabled={autoPass} onChange={toggleAutoPass} />
        </div>
      </div>
    </div>
  );
}

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
const toast: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: 14,
  transform: "translateX(-50%)",
  zIndex: 7,
  padding: "8px 14px",
  color: "#fff",
  background: "rgba(139,26,26,0.92)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 999,
  boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
  whiteSpace: "nowrap",
};
const dock: CSSProperties = {
  flex: "none",
  height: DOCK_HEIGHT,
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 20,
  padding: "0 20px",
  background: "linear-gradient(#15152b, #101022)",
  borderTop: "1px solid rgba(255,255,255,0.08)",
};
