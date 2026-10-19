// Mede a janela e devolve o degrau da mesa + o style com as custom properties (`--mu`, `--u`).
// Põe o `style` no contêiner da mesa (GameBoard); os componentes filhos usam U(n).
// SSR: o servidor e a hidratação veem 1 (sem divergência); depois do mount vale a medida
// real. O resize é debounced para não refazer o layout a cada pixel arrastado.
"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";

import { type Escala, escalaDaTela, estiloEscalaMesa } from "./escalaMesa";

const ESPERA_MS = 120;

function medir(): Escala {
  return escalaDaTela(window.innerWidth, window.innerHeight);
}

let atual: Escala | null = null;
const ouvintes = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function aoRedimensionar(): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const novo = medir();
    if (novo === atual) return;
    atual = novo;
    ouvintes.forEach((f) => f());
  }, ESPERA_MS);
}

function assinar(f: () => void): () => void {
  if (ouvintes.size === 0) {
    atual = medir(); // a janela pode ter mudado com ninguém ouvindo
    window.addEventListener("resize", aoRedimensionar);
  }
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
    if (ouvintes.size === 0) {
      window.removeEventListener("resize", aoRedimensionar);
      clearTimeout(timer);
    }
  };
}

const foto = (): Escala => (atual ??= medir());
const fotoServidor = (): Escala => 1;

export function useEscalaMesa(): { escala: Escala; style: CSSProperties } {
  const escala = useSyncExternalStore(assinar, foto, fotoServidor);
  const style = useMemo(() => estiloEscalaMesa(escala), [escala]);
  return { escala, style };
}
