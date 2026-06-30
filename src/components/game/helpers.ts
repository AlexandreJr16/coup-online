// Helpers puros de UI do jogo (sem React). Compartilhados por Table/Seat/
// ActionBar/HandView/ReactionOverlay para que esses componentes não dependam
// uns dos internos dos outros. Referência visual: DESIGN.md.

import type {
  ActionType,
  Character,
  GameView,
  PublicPlayer,
} from "@/src/types/game";

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

export const CHAR_LABEL: Record<Character, string> = {
  duque: "Duque",
  assassino: "Assassino",
  capitao: "Capitão",
  embaixador: "Embaixador",
  condessa: "Condessa",
};

// Identidade visual de cada personagem (DESIGN.md "Cartas — Visual"): cor base +
// ícone. Usado pelo componente Card (mesa e mão). Sem imagem externa — CSS puro.
export const CHAR_VISUAL: Record<Character, { color: string; icon: string }> = {
  duque: { color: "#7b2d8b", icon: "👑" },
  assassino: { color: "#1a1a1a", icon: "🗡️" },
  capitao: { color: "#1a4a8a", icon: "⚓" },
  embaixador: { color: "#2d6a4f", icon: "🕊️" },
  condessa: { color: "#8b1a1a", icon: "💎" },
};

export type ActionCategory = "coin" | "aggressive" | "coup" | "neutral";

export interface ActionMeta {
  label: string;
  category: ActionCategory;
  requiredCharacter: Character | null; // personagem alegado (null = ação geral)
  needsTarget: boolean;
  coinCost?: number;
}

export const ACTION_META: Record<ActionType, ActionMeta> = {
  renda: { label: "Renda", category: "coin", requiredCharacter: null, needsTarget: false },
  ajuda_externa: { label: "Ajuda Externa", category: "coin", requiredCharacter: null, needsTarget: false },
  taxas: { label: "Taxas", category: "coin", requiredCharacter: "duque", needsTarget: false },
  assassinar: { label: "Assassinar", category: "aggressive", requiredCharacter: "assassino", needsTarget: true, coinCost: 3 },
  extorquir: { label: "Extorquir", category: "aggressive", requiredCharacter: "capitao", needsTarget: true },
  golpe: { label: "Golpe de Estado", category: "coup", requiredCharacter: null, needsTarget: true, coinCost: 7 },
  trocar: { label: "Trocar", category: "neutral", requiredCharacter: "embaixador", needsTarget: false },
};

export function categoryColor(category: ActionCategory): string {
  switch (category) {
    case "coin": return COLORS.gold;
    case "aggressive": return COLORS.red;
    case "coup": return COLORS.coup;
    case "neutral": return COLORS.neutral;
  }
}

// Ação de turno de cada personagem (Condessa não tem ação ativa).
export const CHARACTER_ACTION: Record<Character, ActionType | null> = {
  duque: "taxas",
  assassino: "assassinar",
  capitao: "extorquir",
  embaixador: "trocar",
  condessa: null,
};

export const ALL_CHARACTERS: readonly Character[] = [
  "duque",
  "assassino",
  "capitao",
  "embaixador",
  "condessa",
];

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
  const req = ACTION_META[action].requiredCharacter;
  if (!req) return false;
  return !myFaceDownChars(view, myId).includes(req);
}

// Personagens que ESTE jogador pode alegar para bloquear a ação atual.
export function legalBlockChars(
  action: ActionType,
  targetId: string | null,
  myId: string,
): Character[] {
  switch (action) {
    case "ajuda_externa": return ["duque"]; // qualquer um
    case "assassinar": return targetId === myId ? ["condessa"] : [];
    case "extorquir": return targetId === myId ? ["capitao", "embaixador"] : [];
    default: return [];
  }
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
