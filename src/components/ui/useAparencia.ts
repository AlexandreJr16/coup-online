"use client";
// Hook da preferência de aparência. Fonte única no módulo (não em cada componente): lê o
// storage uma vez, aplica os `data-*` no <html> e avisa quem estiver ouvindo (inclusive outras
// abas, pelo evento `storage`). No servidor e na hidratação devolve o padrão, igual ao SSR do
// layout, então não há mismatch; o script inline do <head> já pintou o tema salvo antes disso.
import { useCallback, useSyncExternalStore } from "react";
import {
  APARENCIA_PADRAO,
  CHAVE_APARENCIA,
  aplicarAtributos,
  lerAparencia,
  salvarAparencia,
  type Aparencia,
} from "@/src/lib/aparencia";

let atual: Aparencia | null = null;
const ouvintes = new Set<() => void>();

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined; // acessar localStorage pode lançar (dados do site bloqueados)
  }
}

function snapshot(): Aparencia {
  if (atual === null) atual = lerAparencia(storage());
  return atual;
}

function avisar(): void {
  ouvintes.forEach((f) => f());
}

function aoMudarOutraAba(e: StorageEvent): void {
  if (e.key !== null && e.key !== CHAVE_APARENCIA) return;
  atual = lerAparencia(storage());
  aplicarAtributos(document.documentElement, atual);
  avisar();
}

function assinar(f: () => void): () => void {
  if (ouvintes.size === 0) window.addEventListener("storage", aoMudarOutraAba);
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
    if (ouvintes.size === 0) window.removeEventListener("storage", aoMudarOutraAba);
  };
}

export function useAparencia(): readonly [Aparencia, (parcial: Partial<Aparencia>) => void] {
  const aparencia = useSyncExternalStore(assinar, snapshot, () => APARENCIA_PADRAO);
  const mudar = useCallback((parcial: Partial<Aparencia>) => {
    atual = { ...snapshot(), ...parcial };
    aplicarAtributos(document.documentElement, atual);
    salvarAparencia(storage(), atual);
    avisar();
  }, []);
  return [aparencia, mudar] as const;
}
