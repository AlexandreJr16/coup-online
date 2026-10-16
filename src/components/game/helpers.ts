// Helpers puros de UI do jogo (sem React). Compartilhados por Table/Seat/
// HandView/BasicActions/ReactionTray para que esses componentes não dependam
// uns dos internos dos outros. Referência visual: DESIGN.md.

import type { CSSProperties } from "react";

import type {
  ActionType,
  Character,
  GameView,
  PublicPlayer,
} from "@/src/types/game";
import { CARDS, CARD_BY_ID, type Expressao } from "@/src/lib/game/cards";

// Fonte de títulos/marca (carregada em app/layout.tsx via next/font). Única definição.
export const CINZEL = "var(--font-cinzel), Georgia, serif";

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

// Rótulo curto para a legenda da carta (quando o nome completo não cabe nos 88px).
export const CHAR_SHORT = Object.fromEntries(
  CARDS.map((c) => [c.id, CARD_BY_ID[c.id].nomeCurto ?? c.nome]),
) as Record<Character, string>;

// Identidade visual (cor + ícone) de cada personagem — derivada do catálogo.
export const CHAR_VISUAL = Object.fromEntries(
  CARDS.map((c) => [c.id, { color: c.cor, icon: c.icone }]),
) as Record<Character, { color: string; icon: string }>;

// ── Ícones dos selos de ação (public/art/<tema>/icones/) ─────────────────────
export type IconName =
  | "renda" | "ajuda_externa" | "golpe" | "taxas" | "assassinar" | "extorquir"
  | "trocar" | "contestar" | "bloquear" | "passar" | "mascara" | "cadeado";

// Ícones que JÁ existem como arquivo; os demais caem no emoji do selo (contestar e
// assassinar entram quando a 2ª leva de geração for curada).
export const ICONS_AVAILABLE: readonly IconName[] = [
  "renda", "ajuda_externa", "golpe", "taxas", "extorquir", "trocar",
  "bloquear", "passar", "mascara", "cadeado",
];

export function iconUrl(name: IconName, size: "sm" | "lg" = "sm"): string | null {
  if (!ICONS_AVAILABLE.includes(name)) return null;
  return `/art/${ART_THEME}/icones/${name}${size === "sm" ? ".sm" : ""}.png`;
}

// Estado de um selo de ação básica: apagado (fora da vez), travado (cadeado: moedas
// insuficientes ou golpe obrigatório), obrigatório (a única jogada permitida) ou pronto.
export type SealState = "ready" | "off" | "locked" | "mandatory";

export function basicSealState(coins: number, action: ActionType, canAct: boolean): SealState {
  if (!canAct) return "off";
  if (coins >= 10) return action === "golpe" ? "mandatory" : "locked";
  return actionBlockedReason(coins, action) ? "locked" : "ready";
}

// Quem pode reagir (bloquear/contestar/passar) na janela atual: todo jogador vivo
// exceto quem fez a jogada julgada (ator na ação; bloqueador no bloqueio). Espelha
// reactorIds da engine — a engine continua sendo quem valida de fato.
export function reactorIds(view: GameView): string[] {
  const p = view.pending;
  if (!p) return [];
  const excluded = view.phase === "janela_contestar_bloqueio" ? p.block?.blockerId : p.actorId;
  return view.players.filter((x) => !x.eliminated && x.id !== excluded).map((x) => x.id);
}

// Tema de arte ativo → pasta em public/art/<tema>/. Fica numa constante para o
// futuro seletor/teste A/B (ROADMAP Fase 8) trocar o estilo sem tocar nos componentes.
export const ART_THEME = "imperio";

// Verso da carta (face-down) do tema; a miniatura tem arquivo próprio.
export function backUrl(size: "sm" | "lg"): string {
  return `/art/${ART_THEME}/verso${size === "sm" ? ".sm" : ""}.png`;
}

// Cenário atrás da mesa (pixel art em baixa resolução, ampliado com cover).
export const TABLE_BG_URL = `/art/${ART_THEME}/mesa.png`;

// URL do retrato (ou null → a carta usa o emoji). A miniatura (size "sm") tem
// arquivo próprio `.sm.png` para manter pixels inteiros; ver tools/art/.
export function artUrl(character: Character, expr: Expressao, size: "sm" | "lg"): string | null {
  const arte = CARD_BY_ID[character].arte;
  // Sem arte para esta expressão → usa a neutra (as reações viram efeito/filtro em
  // CSS, não retrato novo). Sem nenhuma arte → null e a carta cai no emoji.
  const use = arte?.includes(expr) ? expr : arte?.includes("neutro") ? "neutro" : null;
  if (!use) return null;
  return `/art/${ART_THEME}/${character}/${use}${size === "sm" ? ".sm" : ""}.png`;
}

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
// Assentos ANCORADOS nas bordas (topo / laterais / embaixo) em vez de calculados
// numa elipse em %: assim nenhum assento é cortado em telas baixas. Índice 0 =
// jogador local (sempre embaixo-centro); os demais seguem em sentido horário. O
// Table rotaciona a lista para o local ficar no índice 0.
export type SeatAnchor = "top" | "bottom" | "mid" | "midLow" | "midHigh";
export interface SeatPos {
  x: number; // % da largura (centro do assento)
  anchor: SeatAnchor;
}

const SEAT_LAYOUTS: Record<number, SeatPos[]> = {
  2: [{ x: 50, anchor: "bottom" }, { x: 50, anchor: "top" }],
  3: [{ x: 50, anchor: "bottom" }, { x: 26, anchor: "top" }, { x: 74, anchor: "top" }],
  4: [{ x: 50, anchor: "bottom" }, { x: 9, anchor: "mid" }, { x: 50, anchor: "top" }, { x: 91, anchor: "mid" }],
  5: [{ x: 50, anchor: "bottom" }, { x: 9, anchor: "mid" }, { x: 30, anchor: "top" }, { x: 70, anchor: "top" }, { x: 91, anchor: "mid" }],
  // 6: cantos. Cada assento tem ~180px de altura; empilhar dois na lateral (33%/67%)
  // não cabe em telas de 720px e os dois se sobrepunham (pego pelo E2E de layout).
  6: [
    { x: 50, anchor: "bottom" },
    { x: 9, anchor: "bottom" },
    { x: 9, anchor: "top" },
    { x: 50, anchor: "top" },
    { x: 91, anchor: "top" },
    { x: 91, anchor: "bottom" },
  ],
};

export function seatLayout(n: number): SeatPos[] {
  return SEAT_LAYOUTS[Math.min(6, Math.max(2, n))];
}

// CSS de posição de um assento (centro horizontal em `x`%, ancorado na borda).
export function seatStyle(pos: SeatPos): CSSProperties {
  const left = `${pos.x}%`;
  switch (pos.anchor) {
    case "top":
      return { left, top: 14, transform: "translateX(-50%)" };
    case "bottom":
      return { left, bottom: 12, transform: "translateX(-50%)" };
    case "midHigh":
      return { left, top: "33%", transform: "translate(-50%, -50%)" };
    case "midLow":
      return { left, top: "67%", transform: "translate(-50%, -50%)" };
    default:
      return { left, top: "50%", transform: "translate(-50%, -50%)" };
  }
}

// Mensagem se este jogador NÃO pode iniciar a ação agora (null = pode). Espelha as
// regras que a engine valida; serve só para dar retorno imediato antes de ir ao servidor.
export function actionBlockedReason(coins: number, action: ActionType): string | null {
  if (coins >= 10 && action !== "golpe") return "Com 10+ moedas só o Golpe de Estado.";
  const cost = ACTION_META[action].coinCost ?? 0;
  if (coins < cost) return `Faltam moedas: ${ACTION_META[action].label} custa ${cost}.`;
  return null;
}
