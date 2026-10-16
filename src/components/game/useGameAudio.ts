// Liga o áudio aos eventos do jogo (a mesma derivação do feed/animações — nada novo no
// socket). O contexto só nasce no 1º gesto do usuário (política de autoplay). Mudo e
// volume vêm das preferências; com mudo o motor simplesmente não toca.
"use client";

import { useEffect, useRef } from "react";

import { getAudio } from "@/src/lib/audio/engine";
import { usePrefs } from "@/src/lib/audio/usePrefs";
import type { GameView } from "@/src/types/game";
import type { GameEvents } from "./useGameEvents";

export function useGameAudio({
  view,
  myId,
  events,
  secondsLeft,
  error,
  dealIn,
}: {
  view: GameView;
  myId: string;
  events: GameEvents;
  secondsLeft: number;
  error: string;
  dealIn: boolean;
}): void {
  const [prefs] = usePrefs();
  const lastLogId = useRef(0);
  const lastTurn = useRef<string | null>(view.currentPlayerId);
  const lastTick = useRef(-1);

  // Desbloqueia no 1º gesto e aplica as preferências ao motor.
  useEffect(() => {
    const unlock = () => {
      const a = getAudio();
      a.setPrefs(prefs);
      a.unlock();
      document.documentElement.dataset.audio = a.ready ? "running" : "pending";
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [prefs]);

  useEffect(() => {
    getAudio().setPrefs(prefs);
  }, [prefs]);

  // Distribuição inicial: um "tchac" por carta dos assentos.
  useEffect(() => {
    if (!dealIn) return;
    const ids = Array.from({ length: view.players.length * 2 }, (_, i) => setTimeout(() => getAudio().play("distribuir"), i * 85));
    return () => ids.forEach(clearTimeout);
    // só na montagem (uma partida nova remonta o tabuleiro).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Moedas, bloqueio e contestação.
  useEffect(() => {
    if (events.deltaKey > 0) getAudio().play("moeda");
  }, [events.deltaKey]);
  useEffect(() => {
    if (events.block) getAudio().play("lacre");
  }, [events.block]);
  useEffect(() => {
    const c = events.challenge;
    if (!c) return;
    getAudio().play("contestar");
    const t = setTimeout(() => getAudio().play(c.hadCard ? "verdade" : "blefe"), 700);
    return () => clearTimeout(t);
  }, [events.challenge]);

  // Entradas novas do feed: carta virada, eliminação, vitória.
  useEffect(() => {
    for (const e of events.log) {
      if (e.id <= lastLogId.current) continue;
      lastLogId.current = e.id;
      if (e.kind === "reveal") getAudio().play("carta_vira");
      else if (e.kind === "eliminate") getAudio().play("eliminado");
      else if (e.kind === "winner") getAudio().play("vitoria");
    }
  }, [events.log]);

  // Minha vez.
  useEffect(() => {
    if (view.currentPlayerId !== lastTurn.current && view.currentPlayerId === myId && view.phase === "aguardando_acao") {
      getAudio().play("vez");
    }
    lastTurn.current = view.currentPlayerId;
  }, [view.currentPlayerId, view.phase, myId]);

  // Últimos 3 segundos de uma janela de reação: um tique por segundo.
  useEffect(() => {
    const inWindow = view.phase.startsWith("janela_");
    const s = Math.ceil(secondsLeft);
    if (inWindow && s >= 1 && s <= 3 && s !== lastTick.current) getAudio().play("tick");
    lastTick.current = inWindow ? s : -1;
  }, [secondsLeft, view.phase]);

  // Erro de regra.
  useEffect(() => {
    if (error) getAudio().play("erro");
  }, [error]);
}
