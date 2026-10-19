// Orquestrador da partida. Único ponto que fala com o Socket.IO. Tudo vive num PALCO de tamanho
// base fixo (1280x680 unidades, centralizado e escalado por --mu): a mesa em cima e o DOCK
// embaixo, com três zonas que nunca mudam de lugar — ações básicas (esq.), mão ou escolha da hora
// (centro) e reações (dir.). O estado do jogo aparece na própria mesa (balão da jogada, legenda
// do centro, marcas nos assentos); o cabeçalho só guarda a região de status para leitor de tela.
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

import { readAutoPass, saveAutoPass } from "@/src/lib/session";
import { getSocket } from "@/src/lib/socket";
import type { ActionType, Character, GameView } from "@/src/types/game";
import type { GameActionAck } from "@/src/types/socket";
import AutoPassToggle from "./AutoPassToggle";
import BasicActions from "./BasicActions";
import Card from "./Card";
import ChallengeReveal from "./ChallengeReveal";
import CoinFlights from "./CoinFlights";
import DragGhost from "./DragGhost";
import FlyFromDeck from "./FlyFromDeck";
import HandView from "./HandView";
import IntrigueFeed from "./IntrigueFeed";
import VictoryPanel from "./VictoryPanel";
import ReactionTray from "./ReactionTray";
import Table from "./Table";
import { actionBalloon, centerCaption, deriveRoundStatus } from "./status";
import TurnBanner from "./TurnBanner";
import { Pic } from "./ActionSeal";
import { bitmapDoNumero } from "../ui/digitos";
import { PixelBitmap } from "../ui/PixelBitmap";
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
import { PixelButton } from "@/src/components/ui/PixelButton";
import { F, PALCO, U } from "./escalaMesa";
import "./mesa/mesa.css";
import { useEscalaMesa } from "./useEscalaMesa";
import { useGameAudio } from "./useGameAudio";
import { useGameEvents } from "./useGameEvents";

// Medidas em UNIDADES DA MESA (1 = 1 px em 1280x720); U() as leva ao degrau da tela (escalaMesa.ts).
// Palco de 1280x680: a mesa ocupa 0..536 e o dock 536..680 (PALCO, escalaMesa.ts).
const DOCK_HEIGHT = U(PALCO.altura - PALCO.mesa);

export default function GameBoard({
  view,
  myId,
  absentIds = [],
  spectator = false,
}: {
  view: GameView;
  myId: string;
  absentIds?: string[]; // jogadores desconectados (a vez deles passa sozinha)
  spectator?: boolean; // só assiste: sem mão, sem ações e sem revanche; entra na próxima partida
}) {
  const socket = getSocket();
  const { ref: area, style: escalaStyle } = useEscalaMesa(); // --mu/--u: o palco cabe na área
  const [error, setError] = useState("");
  const [feedOpen, setFeedOpen] = useState(true);
  const [targetingAction, setTargetingAction] = useState<ActionType | null>(null);
  const [keepSel, setKeepSel] = useState<number[]>([]);

  const me = view.players.find((p) => p.id === myId);
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

  // ── Eventos derivados (Feed/Economia) + selo de cera ──────────────────────
  const events = useGameEvents(view);
  const dealIn =
    view.phase === "aguardando_acao" &&
    view.deckCount === 25 - 2 * view.players.length &&
    view.players.every((p) => p.coins === 2 && p.cards.every((c) => !c.revealed));
  useGameAudio({ view, myId, events, secondsLeft, error, dealIn });
  const [seal, setSeal] = useState<SealData | null>(null);
  const sealCounter = useRef(0);
  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (!events.challenge || events.challenge.hadCard) return; // blefe desmascarado: a mesa treme
    const on = setTimeout(() => setShaking(true), 0);
    const off = setTimeout(() => setShaking(false), 520);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [events.challenge]);
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
    if (spectator) return; // o servidor recusa; espectador não tem "passar automático"
    socket.emit("game_autopass", { enabled: autoPass }, () => {});
  }, [socket, autoPass, spectator]);
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
    if (suppressClick.current) return;
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

  // ── Arrastar um poder da mão: até um oponente (ações com alvo) ou para a mesa (as demais).
  // Soltar no dock, ou fora de um alvo válido, cancela. O clique simples continua valendo.
  const [drag, setDrag] = useState<{ char: Character; x: number; y: number } | null>(null);
  const press = useRef<{ char: Character; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  function onPressCard(char: Character, e: React.PointerEvent) {
    if (!canAct || e.button !== 0 || !CHARACTER_ACTION[char]) return;
    press.current = { char, x: e.clientX, y: e.clientY, moved: false };
  }
  const coinsNow = me?.coins ?? 0;
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = press.current;
      if (!p) return;
      if (!p.moved) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return; // ainda é clique
        const action = CHARACTER_ACTION[p.char]!;
        const why = actionBlockedReason(coinsNow, action);
        if (why) {
          press.current = null;
          setError(why);
          return;
        }
        p.moved = true;
        if (ACTION_META[action].needsTarget) setTargetingAction(action);
      }
      setDrag({ char: p.char, x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent) => {
      const p = press.current;
      press.current = null;
      if (!p?.moved) return;
      suppressClick.current = true; // o click que vem depois do arrasto não vale
      setTimeout(() => (suppressClick.current = false), 150);
      setDrag(null);
      const action = CHARACTER_ACTION[p.char]!;
      const hits = document.elementsFromPoint(e.clientX, e.clientY) as HTMLElement[];
      if (ACTION_META[action].needsTarget) {
        const id = hits.find((el) => el.dataset?.target === "sim")?.dataset.seatId;
        setTargetingAction(null);
        if (id) emitAction(action, id);
      } else {
        const noDock = !hits.some((el) => el.dataset?.testid === "dock");
        if (noDock) emitAction(action);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // emitAction só usa o socket (singleton) e setError.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinsNow, socket]);

  const targetIds =
    targetingAction != null
      ? view.players.filter((p) => !p.eliminated && p.id !== myId).map((p) => p.id)
      : [];
  const armedChar = targetingAction ? requiredCharacter(targetingAction) : null;

  // Quem a mesa está esperando (marca o assento): revelar carta ou escolher a troca.
  // Na janela de reação, quem ainda não passou também é esperado (P08.S4).
  const urgentIds =
    view.phase === "aguardando_revelacao" && view.mustRevealPlayerId
      ? [view.mustRevealPlayerId]
      : view.phase === "aguardando_troca" && view.currentPlayerId
        ? [view.currentPlayerId]
        : deriveRoundStatus(view, myId).waitingOnIds;

  // ── Zona central do dock: o que o jogador faz AGORA ───────────────────────
  let center: ReactNode;
  if (me?.eliminated && view.phase !== "fim_de_jogo") {
    center = <span style={{ color: COLORS.dim }}>☠ Você foi exilado</span>;
  } else if (view.phase === "aguardando_revelacao" && view.mustRevealPlayerId === myId) {
    // Só as MINHAS cartas ocultas, pulsando: clicar numa revela (perde a influência).
    center = (
      <div style={{ display: "flex", gap: U(14) }}>
        {me?.cards.map((c, i) =>
          c.revealed ? null : (
            <div key={i} className="urgent-pulse" style={{ borderRadius: U(10) }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: U(14) }}>
        {pool.map((c, i) => {
          const card = (
            <Card
              size="lg"
              character={c}
              selected={keepSel.includes(i)}
              onClick={() =>
                setKeepSel((cur) =>
                  cur.includes(i) ? cur.filter((x) => x !== i) : cur.length < keepCount ? [...cur, i] : cur,
                )
              }
              style={{
                transform: keepSel.includes(i) ? `translateY(${U(-12)})` : undefined,
                transition: "transform 120ms ease",
              }}
            />
          );
          // As cartas depois das minhas (keepCount) acabaram de ser compradas da Corte.
          return i >= keepCount ? (
            <FlyFromDeck key={i} delay={(i - keepCount) * 140}>
              {card}
            </FlyFromDeck>
          ) : (
            <div key={i} style={{ display: "flex" }}>{card}</div>
          );
        })}
        <PixelButton
          onClick={() => {
            setError("");
            socket.emit("game_exchange", { keep: keepSel.map((i) => pool[i]) }, ack);
            setKeepSel([]);
          }}
          disabled={keepSel.length !== keepCount}
        >
          Manter {keepCount}
        </PixelButton>
      </div>
    );
  } else {
    center = <HandView view={view} myId={myId} armed={armedChar} canAct={canAct} onUse={onUse} onPress={onPressCard} dragging={drag?.char ?? null} />;
  }

  return (
    <div ref={area} style={{ position: "relative", height: "100%", overflow: "hidden", color: COLORS.text, fontFamily: "var(--fonte-ui)", ...escalaStyle }}>
     <div data-palco className={shaking ? "shake" : undefined} style={palco}>
      {/* Mesa: a parte de cima do palco */}
      <div data-stage style={{ position: "absolute", left: 0, top: 0, width: U(PALCO.largura), height: U(PALCO.mesa) }}>
        <Table
          players={view.players}
          currentPlayerId={view.currentPlayerId}
          myId={myId}
          treasury={view.treasury}
          deckCount={view.deckCount}
          coinDeltas={events.coinDeltas}
          deltaKey={events.deltaKey}
          selectableTargetIds={targetIds}
          onSelectTarget={selectTarget}
          dimOthers={view.phase === "aguardando_acao"}
          dealIn={dealIn}
          urgentIds={urgentIds}
          passedIds={view.pending?.passedIds ?? []}
          caption={view.phase === "fim_de_jogo" ? undefined : centerCaption(view, myId, secondsLeft)}
          balloon={actionBalloon(view)}
          custoFantasma={targetingAction ? (ACTION_META[targetingAction].coinCost ?? 0) : 0}
        />

        <ChallengeReveal challenge={events.challenge} />
        <CoinFlights deltas={events.coinDeltas} deltaKey={events.deltaKey} />

        {/* Relógio da fase (turno, reação, revelação, troca) */}
        {timer && (
          <div
            style={{
              ...timerPill,
              color: secondsLeft <= 10 ? "#fff" : COLORS.text,
              background: secondsLeft <= 10 ? "rgba(192,57,43,0.9)" : "rgba(20,20,40,0.85)",
            }}
          >
            <span data-testid="relogio" data-segundos={Math.ceil(secondsLeft)} style={{ display: "inline-flex", alignItems: "center", gap: U(6) }}>
              <Pic name="ampulheta" emoji="⏳" size={18} />
              <PixelBitmap linhas={bitmapDoNumero(Math.ceil(secondsLeft))} cores={{ "#": "currentColor" }} celula={2} titulo={`${Math.ceil(secondsLeft)} segundos`} />
            </span>
          </div>
        )}

        {/* Jogador da vez sem conexão: aviso discreto junto do timer */}
        {view.currentPlayerId && absentIds.includes(view.currentPlayerId) && (
          <div style={{ ...timerPill, top: U(52), color: COLORS.dim, background: "rgba(20,20,40,0.85)" }}>
            sem conexão
          </div>
        )}

        <IntrigueFeed log={events.log} open={feedOpen} onOpenChange={setFeedOpen} />


        {/* Retorno rápido de regra (some sozinho) */}
        {error && <div style={toast}>{error}</div>}
      </div>

      {/* DOCK fixo: ações básicas · mão/escolha · reações. Espectador: só o aviso, com a
          mesma altura (a mesa não muda de tamanho). */}
      {spectator ? (
        <div data-testid="dock" data-spectator="sim" style={{ ...dock, display: "flex", justifyContent: "center" }}>
          <div data-testid="spectator-notice" style={spectatorNotice}>
            <div style={{ fontFamily: CINZEL, fontSize: F(18), fontWeight: 800, color: COLORS.turn }}>
              👁 Você está assistindo
            </div>
            <div style={{ marginTop: U(4), color: COLORS.dim, fontSize: F(13.5) }}>
              Você vê a mesa, mas não as cartas de ninguém. Entra como jogador na próxima partida.
            </div>
          </div>
        </div>
      ) : (
      <div data-testid="dock" style={dock}>
        <div data-zone="basicas" style={{ justifySelf: "end" }}>
          <BasicActions view={view} myId={myId} canAct={canAct} onAction={onAction} />
        </div>
        <div data-zone="centro" style={{ display: "flex", justifyContent: "center", minWidth: U(380) }}>
          {center}
        </div>
        <div data-zone="reacoes" style={{ justifySelf: "start", display: "flex", alignItems: "center", gap: U(12) }}>
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
      )}
     </div>

      {/* Fim de partida: o véu cobre a área inteira do jogo (mesa, dock e as faixas dos lados) */}
      {view.phase === "fim_de_jogo" && (
        <VictoryPanel
          view={view}
          onRematch={
            spectator
              ? undefined
              : () => {
                  setError("");
                  socket.emit("game_rematch", ack);
                }
          }
        />
      )}

      {/* Região de status para leitor de tela (portal no cabeçalho da sala) */}
      <TurnBanner view={view} myId={myId} secondsLeft={secondsLeft} />

      {drag && <DragGhost character={drag.char} x={drag.x} y={drag.y} />}

      {/* Selo de cera — acima de tudo */}
      <WaxSeal seal={seal} />
    </div>
  );
}

const palco: CSSProperties = {
  position: "absolute",
  left: `calc(50% - ${U(PALCO.largura / 2)})`,
  top: `calc(50% - ${U(PALCO.altura / 2)})`,
  width: U(PALCO.largura),
  height: U(PALCO.altura),
};

const timerPill: CSSProperties = {
  position: "absolute",
  top: U(12),
  left: U(12),
  zIndex: 5,
  padding: `${U(6)} ${U(12)}`,
  fontSize: F(16),
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  fontVariantNumeric: "tabular-nums",
  boxShadow: `0 ${U(4)} ${U(14)} rgba(0,0,0,0.4)`,
};
const toast: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: U(14),
  transform: "translateX(-50%)",
  zIndex: 7,
  padding: `${U(8)} ${U(14)}`,
  fontSize: F(16),
  color: "#fff",
  background: "rgba(139,26,26,0.92)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 999,
  boxShadow: `0 ${U(4)} ${U(14)} rgba(0,0,0,0.45)`,
  whiteSpace: "nowrap",
};
const spectatorNotice: CSSProperties = {
  alignSelf: "center",
  maxWidth: U(520),
  padding: `${U(14)} ${U(22)}`,
  textAlign: "center",
  borderRadius: U(12),
  background: "rgba(0,0,0,0.28)",
  border: "1px solid rgba(240,165,0,0.3)",
};
const dock: CSSProperties = {
  position: "absolute",
  left: 0,
  top: U(PALCO.mesa),
  width: U(PALCO.largura),
  height: DOCK_HEIGHT,
  display: "grid",
  // Colunas fixas: as zonas nunca andam quando a mão muda de tamanho (zonas fixas, DESIGN_MESA_V2).
  gridTemplateColumns: `1fr ${U(520)} 1fr`,
  alignItems: "center",
  gap: U(20),
  padding: `0 ${U(20)}`,
  // P09.S1: sem fundo, filete nem sombra de largura total (selos e mão ficam sobre o fundo da sala);
  // as variações "cavalete" e "bandeja" da Aparência pintam só o necessário, por CSS (globals.css).
};
