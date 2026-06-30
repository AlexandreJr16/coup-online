// Deriva eventos de jogo SÓ no cliente, diferindo views sucessivas do stream
// `game_state` (o GameView não traz histórico). Alimenta o Feed de Intrigas, o
// Selo de cera (bloqueios) e a Economia viva (deltas de moeda). Não trafega nada
// novo pelo socket — usa apenas o que a view já expõe.
import { useEffect, useRef, useState } from "react";

import type { Character, GameView } from "@/src/types/game";
import { ACTION_META, CHAR_LABEL } from "./helpers";

export interface GameLogEntry {
  id: number;
  kind: "action" | "block" | "reveal" | "eliminate" | "winner";
  text: string;
}

export interface SealEvent {
  id: number;
  blockerId: string;
  character: Character;
}

export interface GameEvents {
  log: GameLogEntry[];
  block: SealEvent | null; // último bloqueio observado (dispara o selo de cera)
  coinDeltas: Record<string, number>; // playerId -> variação de moedas na última transição
  deltaKey: number; // muda a cada transição com deltas (re-dispara a animação)
}

const MAX_LOG = 40;

function nameOf(view: GameView, id: string | null): string {
  return view.players.find((p) => p.id === id)?.name ?? "?";
}
// Assinatura da AÇÃO em andamento (ignora bloqueio) — detecta nova declaração.
function actionSig(v: GameView | null): string {
  const p = v?.pending;
  return p ? `${p.actorId}|${p.action}|${p.targetId ?? ""}` : "";
}
// Assinatura do BLOQUEIO — detecta um novo bloqueio dentro da mesma ação.
function blockSig(v: GameView | null): string {
  const b = v?.pending?.block;
  return b ? `${b.blockerId}|${b.character}` : "";
}

export function useGameEvents(view: GameView | null): GameEvents {
  const prevRef = useRef<GameView | null>(null);
  const idRef = useRef(0);
  const [log, setLog] = useState<GameLogEntry[]>([]);
  const [block, setBlock] = useState<SealEvent | null>(null);
  const [coinDeltas, setCoinDeltas] = useState<Record<string, number>>({});
  const [deltaKey, setDeltaKey] = useState(0);

  useEffect(() => {
    if (!view) return;
    const prev = prevRef.current;
    prevRef.current = view;
    if (!prev) return; // baseline: só registra a partir da 2ª view

    const add: GameLogEntry[] = [];
    const push = (kind: GameLogEntry["kind"], text: string) =>
      add.push({ id: ++idRef.current, kind, text });

    // 1. Ação declarada (entra numa janela de reação)
    if (view.pending && actionSig(view) !== actionSig(prev)) {
      const p = view.pending;
      const tgt = p.targetId ? ` em ${nameOf(view, p.targetId)}` : "";
      push("action", `${nameOf(view, p.actorId)} declarou ${ACTION_META[p.action].label}${tgt}`);
    }
    // 2. Bloqueio declarado
    if (view.pending?.block && blockSig(view) !== blockSig(prev)) {
      const b = view.pending.block;
      push("block", `${nameOf(view, b.blockerId)} bloqueou alegando ${CHAR_LABEL[b.character]}`);
      setBlock({ id: ++idRef.current, blockerId: b.blockerId, character: b.character });
    }
    // 3. Cartas reveladas (perda de influência) e eliminação
    for (const cur of view.players) {
      const before = prev.players.find((p) => p.id === cur.id);
      if (!before) continue;
      cur.cards.forEach((card, i) => {
        if (card.revealed && !before.cards[i]?.revealed && card.character) {
          push("reveal", `${cur.name} perdeu ${CHAR_LABEL[card.character]}`);
        }
      });
      if (cur.eliminated && !before.eliminated) push("eliminate", `${cur.name} foi exilado`);
    }
    // 4. Vencedor
    if (view.winnerId && !prev.winnerId) {
      push("winner", `${nameOf(view, view.winnerId)} venceu`);
    }

    if (add.length) setLog((cur) => [...cur, ...add].slice(-MAX_LOG));

    // Deltas de moeda (Economia viva)
    const deltas: Record<string, number> = {};
    for (const cur of view.players) {
      const before = prev.players.find((p) => p.id === cur.id);
      if (before && before.coins !== cur.coins) deltas[cur.id] = cur.coins - before.coins;
    }
    if (Object.keys(deltas).length) {
      setCoinDeltas(deltas);
      setDeltaKey((k) => k + 1);
    }
  }, [view]);

  return { log, block, coinDeltas, deltaKey };
}
