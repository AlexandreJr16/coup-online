// Tipos do motor de cenas (VIDA_E_BLEFE 5.2). Sem DOM: o diretor e a fila são puros.
import type { SfxName } from "@/src/lib/audio/recipes";

export type Alvo =
  | { tipo: "assento"; jogadorId: string }
  | { tipo: "centro" }
  | { tipo: "baralho" }
  | { tipo: "erario" }
  | { tipo: "tela" };

export type EfeitoId =
  | "escurecer"
  | "vinheta"
  | "slide-ao-centro"
  | "voo-carta"
  | "voo-ficha"
  | "flip"
  | "carimbo"
  | "rachar"
  | "estilhacar"
  | "tremer"
  | "hit-stop"
  | "brilho"
  | "balao"
  | "linha-mira";

/** 3 = drama alto (duelo, exílio, vitória) · 2 = perda, troca, Golpe · 1 = declaração · 0 = descartável. */
export type Prioridade = 0 | 1 | 2 | 3;

export interface Beat {
  em: number; // ms desde o início da cena
  dur: number; // ms
  alvo: Alvo;
  efeito: EfeitoId;
  param?: Record<string, number | string>;
  sfx?: SfxName;
  pulavel?: boolean;
  /** Estado de chegada ao pular: a cena salta até o fim do último beat `final`. */
  final?: boolean;
}

export interface Cena {
  id: string; // ex.: "duelo#12" (usa lastChallenge.n)
  prioridade: Prioridade;
  duracaoMax: number; // teto de segurança (ms)
  beats: Beat[];
  /** Mantém a view EXIBIDA no estado anterior até este instante da cena (ms desde o início). */
  segurarDesfechoAte?: number;
}

/** Teto absoluto de qualquer cena e do hold (VIDA_E_BLEFE 2.3). */
export const DURACAO_TETO_MS = 3000;
/** Tempo que o carimbo final fica na tela ao pular. */
export const PULAR_CARIMBO_MS = 400;
