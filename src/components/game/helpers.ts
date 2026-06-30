// Helpers puros de UI do jogo (sem React). Compartilhados por Table/Seat/
// ActionBar/HandView/ReactionOverlay para que esses componentes não dependam
// uns dos internos dos outros. Referência visual: DESIGN.md.

import type {
  ActionType,
  Character,
  GameView,
  PublicPlayer,
} from "@/src/types/game";
import { CARDS, CARD_BY_ID } from "@/src/lib/game/cards";

// Paleta (DESIGN.md "Tipografia e Cores"). Inline styles, sem lib de UI.
export const COLORS = {
  bg: "#1a1a2e", // fundo
  felt: "#2d5a27", // mesa (feltro)
  feltEdge: "#21421d",
  gold: "#f0a500", // ações de moeda
  red: "#c0392b", // ações agressivas
  coup: "#1f1f24", // golpe (preto/cinza escuro)
  neutral: "#46506b", // trocar
  text: "#f0f0f0",
  dim: "#9aa0a6",
  turn: "#ffd866", // brilho de turno
  cardBack: "#2c3e50", // costas da carta (face-down)
} as const;

// Rótulo de cada personagem — derivado do catálogo (cards.ts), nunca hard-coded.
export const CHAR_LABEL = Object.fromEntries(
  CARDS.map((c) => [c.id, c.nome]),
) as Record<Character, string>;

// Identidade visual (cor + ícone) de cada personagem — derivada do catálogo.
export const CHAR_VISUAL = Object.fromEntries(
  CARDS.map((c) => [c.id, { color: c.cor, icon: c.icone }]),
) as Record<Character, { color: string; icon: string }>;

export type ActionCategory = "coin" | "aggressive" | "coup" | "neutral";

export interface ActionMeta {
  label: string;
  category: ActionCategory;
  needsTarget: boolean;
  coinCost?: number;
}

// Metadado de AÇÃO (não de carta): rótulo, categoria de cor, alvo, custo.
export const ACTION_META: Record<ActionType, ActionMeta> = {
  renda: { label: "Renda", category: "coin", needsTarget: false },
  ajuda_externa: { label: "Ajuda Externa", category: "coin", needsTarget: false },
  taxas: { label: "Taxas", category: "coin", needsTarget: false },
  assassinar: { label: "Assassinar", category: "aggressive", needsTarget: true, coinCost: 3 },
  extorquir: { label: "Extorquir", category: "aggressive", needsTarget: true },
  golpe: { label: "Golpe de Estado", category: "coup", needsTarget: true, coinCost: 7 },
  trocar: { label: "Trocar", category: "neutral", needsTarget: false },
};

// Personagem exigido por cada ação (inverso de CardDef.acao) — derivado do catálogo.
const ACTION_REQUIRES: Partial<Record<ActionType, Character>> = Object.fromEntries(
  CARDS.filter((c) => c.acao).map((c) => [c.acao as ActionType, c.id]),
);
export function requiredCharacter(action: ActionType): Character | null {
  return ACTION_REQUIRES[action] ?? null;
}

export function categoryColor(category: ActionCategory): string {
  switch (category) {
    case "coin": return COLORS.gold;
    case "aggressive": return COLORS.red;
    case "coup": return COLORS.coup;
    case "neutral": return COLORS.neutral;
  }
}

// Ação de turno de cada personagem (Condessa não tem) — derivada do catálogo.
export const CHARACTER_ACTION = Object.fromEntries(
  CARDS.map((c) => [c.id, c.acao]),
) as Record<Character, ActionType | null>;

// Ordem/lista de personagens — derivada do catálogo (cards.ts).
export const ALL_CHARACTERS: readonly Character[] = CARDS.map((c) => c.id);

function me(view: GameView, myId: string): PublicPlayer | undefined {
  return view.players.find((p) => p.id === myId);
}

// Personagens das MINHAS cartas ainda viradas para baixo (influências).
export function myFaceDownChars(view: GameView, myId: string): Character[] {
  const p = me(view, myId);
  if (!p) return [];
  return p.cards
    .filter((c) => !c.revealed && c.character)
    .map((c) => c.character as Character);
}

// Indicador de blefe (DESIGN.md): a ação exige um personagem que não tenho.
// Calculado SÓ no cliente, a partir do viewForPlayer; nunca trafega no socket.
export function isBluff(view: GameView, myId: string, action: ActionType): boolean {
  const req = requiredCharacter(action);
  if (!req) return false;
  return !myFaceDownChars(view, myId).includes(req);
}

// Personagens que ESTE jogador pode alegar para bloquear a ação atual. A LISTA de
// personagens é derivada do catálogo (CardDef.bloqueia); a regra "qualquer um vs.
// só a vítima" mora aqui (é regra de jogo de UI, não dado de carta).
export function legalBlockChars(
  action: ActionType,
  targetId: string | null,
  myId: string,
): Character[] {
  const blockers = Object.values(CARD_BY_ID)
    .filter((c) => c.bloqueia.includes(action))
    .map((c) => c.id);
  if (blockers.length === 0) return [];
  // Ajuda Externa pode ser bloqueada por qualquer um (Duque); as demais, só a vítima.
  if (action === "ajuda_externa") return blockers;
  return targetId === myId ? blockers : [];
}

// ── Avatar: iniciais + cor determinística do nome ───────────────────────────
export function avatarInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 60% 45%)`;
}

// ── Layout dos assentos em volta da mesa ────────────────────────────────────
// Índice 0 = jogador local (sempre embaixo-centro, padrão poker). Demais
// distribuídos pelo arco. Retorna posições em % do container (centro de cada
// assento). O Table rotaciona a lista para o local ficar no índice 0.
export interface SeatPos {
  leftPct: number;
  topPct: number;
}

export function seatLayout(n: number): SeatPos[] {
  const rx = 46;
  const ry = 42;
  return Array.from({ length: n }, (_, i) => {
    const theta = ((90 + (i * 360) / n) * Math.PI) / 180; // 90° = base da elipse
    return {
      leftPct: 50 + rx * Math.cos(theta),
      topPct: 50 + ry * Math.sin(theta),
    };
  });
}

// Contrato IDÊNTICO dos dois modos de interação (A/B). Garante que GameBoard
// possa trocar ActionBar ↔ HandView mudando só a prop, sem conhecer internos.
export interface InteractionModeProps {
  view: GameView;
  myId: string;
  onAction: (action: ActionType, targetId?: string) => void;
}
