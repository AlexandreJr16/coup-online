// Hook do placar da noite para a UI. O socket (singleton) é ligado ao scoreStore assim que este
// módulo carrega no navegador, antes de qualquer `room:join`, então nenhum `room:score` se perde
// mesmo que o painel de fim de partida ainda não exista. Só LEITURA: não dispara nada visual.
"use client";

import { useSyncExternalStore } from "react";

import { getSocket } from "@/src/lib/socket";
import type { ScorePayload } from "@/src/types/socket";
import { assinarPlacar, ligarPlacar, placarAtual } from "./scoreStore";

if (typeof window !== "undefined") ligarPlacar(getSocket());

/** Último placar da sala, ou null enquanto o servidor não mandou (SSR e hidratação: null). */
export function useScore(): ScorePayload | null {
  return useSyncExternalStore(assinarPlacar, placarAtual, () => null);
}
