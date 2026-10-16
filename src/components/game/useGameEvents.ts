// Hook que acompanha o stream de views e acumula os eventos derivados (Feed de
// Intrigas, selos, Economia viva). A lógica de derivação é pura e fica em events.ts.
// Não trafega nada novo pelo socket — usa apenas o que a view já expõe.
import { useEffect, useRef, useState } from "react";

import type { GameView } from "@/src/types/game";
import {
  type ChallengeEvent,
  deriveEvents,
  type GameLogEntry,
  type SealEvent,
} from "./events";

export type { ChallengeEvent, GameLogEntry, SealEvent } from "./events";

export interface GameEvents {
  log: GameLogEntry[];
  block: SealEvent | null; // último bloqueio observado (dispara o selo de cera)
  challenge: ChallengeEvent | null; // última contestação (dispara o selo "CONTESTADO!")
  coinDeltas: Record<string, number>; // playerId -> variação de moedas na última transição
  deltaKey: number; // muda a cada transição com deltas (re-dispara a animação)
}

const MAX_LOG = 40;

export function useGameEvents(view: GameView | null): GameEvents {
  const prevRef = useRef<GameView | null>(null);
  const idRef = useRef(0);
  const [log, setLog] = useState<GameLogEntry[]>([]);
  const [block, setBlock] = useState<SealEvent | null>(null);
  const [challenge, setChallenge] = useState<ChallengeEvent | null>(null);
  const [coinDeltas, setCoinDeltas] = useState<Record<string, number>>({});
  const [deltaKey, setDeltaKey] = useState(0);

  useEffect(() => {
    if (!view) return;
    const prev = prevRef.current;
    prevRef.current = view;
    if (!prev) return; // baseline: só registra a partir da 2ª view

    const d = deriveEvents(prev, view, () => ++idRef.current);
    if (d.log.length) setLog((cur) => [...cur, ...d.log].slice(-MAX_LOG));
    if (d.block) setBlock(d.block);
    if (d.challenge) setChallenge(d.challenge);
    if (Object.keys(d.coinDeltas).length) {
      setCoinDeltas(d.coinDeltas);
      setDeltaKey((k) => k + 1);
    }
  }, [view]);

  return { log, block, challenge, coinDeltas, deltaKey };
}
