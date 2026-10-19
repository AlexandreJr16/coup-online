// Timers configuráveis (game-rules.md "Timers Configuráveis"): FONTE ÚNICA de
// padrão, limites e textos. A engine normaliza com isto e a tela de configuração
// da sala monta os campos a partir daqui — não repetir esses números em outro lugar.

import type { GameConfig } from "../../types/game";

// Nos últimos N segundos de uma fase de decisão (turno, revelação, troca) a mesa avisa
// o que o servidor vai jogar pelo jogador. Fixo (não entra na tela de tempos do lobby)
// e só de UI: o relógio e a jogada automática continuam sendo do servidor.
export const TIMEOUT_WARNING_SECONDS = 5;

export interface ConfigField {
  label: string;
  hint: string;
  min: number;
  max: number;
  def: number; // segundos
}

export const CONFIG_SPEC = {
  globalReactionTime: {
    label: "Reação a ações gerais",
    hint: "Taxas, Ajuda Externa, Trocar",
    min: 3,
    max: 60,
    def: 5,
  },
  targetReactionTime: {
    label: "Reação do alvo",
    hint: "Assassinar, Extorquir",
    min: 5,
    max: 120,
    def: 15,
  },
  challengeBlockTime: {
    label: "Contestar um bloqueio",
    hint: "Janela depois que alguém bloqueia",
    min: 3,
    max: 60,
    def: 5,
  },
  turnTime: {
    label: "Tempo do turno",
    hint: "Se estourar, joga Renda sozinho",
    min: 15,
    max: 180,
    def: 45,
  },
  choiceTime: {
    label: "Tempo de escolha",
    hint: "Revelar carta ou escolher a Troca",
    min: 10,
    max: 120,
    def: 30,
  },
} as const satisfies Record<keyof GameConfig, ConfigField>;

export const CONFIG_KEYS = Object.keys(CONFIG_SPEC) as Array<keyof GameConfig>;

/** Aplica padrão e limites; valores que não são número finito usam o padrão. */
export function normalizeConfig(input: Partial<GameConfig> = {}): GameConfig {
  const out = {} as GameConfig;
  for (const key of CONFIG_KEYS) {
    const spec: ConfigField = CONFIG_SPEC[key];
    const raw: unknown = input[key];
    const n = typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : spec.def;
    out[key] = Math.max(spec.min, Math.min(spec.max, n));
  }
  return out;
}
