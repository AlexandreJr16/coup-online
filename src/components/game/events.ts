// Derivação PURA dos eventos de jogo a partir de duas views consecutivas do stream
// `game_state` (o GameView não traz histórico). Alimenta o Feed de Intrigas, os selos
// (bloqueio e contestação) e a Economia viva (deltas de moeda). Sem React: testável.
import type { Character, GameView } from "@/src/types/game";
import { ACTION_META, CHAR_LABEL } from "./helpers";

export interface GameLogEntry {
  id: number;
  kind: "action" | "block" | "challenge" | "reveal" | "eliminate" | "winner";
  text: string;
}

export interface SealEvent {
  id: number;
  blockerId: string;
  character: Character;
}

// Contestação resolvida (vem do view.lastChallenge, igual para TODOS os jogadores).
export interface ChallengeEvent {
  id: number;
  title: string; // ex.: "Bia contestou Ana"
  verdict: string; // ex.: "Era blefe!" / "Tinha a carta"
}

export interface DerivedEvents {
  log: GameLogEntry[];
  block: SealEvent | null;
  challenge: ChallengeEvent | null;
  coinDeltas: Record<string, number>; // playerId -> variação de moedas
}

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


export function deriveEvents(prev: GameView, view: GameView, nextId: () => number): DerivedEvents {
  const add: GameLogEntry[] = [];
  let block: SealEvent | null = null;
  let challenge: ChallengeEvent | null = null;
  const push = (kind: GameLogEntry["kind"], text: string) =>
    add.push({ id: nextId(), kind, text });

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
    block = { id: nextId(), blockerId: b.blockerId, character: b.character };
  }
  // 2b. Contestação resolvida (n novo em lastChallenge = todo mundo vê o mesmo)
  const lc = view.lastChallenge;
  if (lc && lc.n !== (prev.lastChallenge?.n ?? 0)) {
    const who = `${nameOf(view, lc.challengerId)} contestou ${nameOf(view, lc.accusedId)}`;
    const verdict = lc.accusedHadCard
      ? `tinha ${CHAR_LABEL[lc.claimed]}`
      : `era blefe (sem ${CHAR_LABEL[lc.claimed]})`;
    push("challenge", `${who}: ${verdict}`);
    challenge = { id: nextId(), title: who, verdict: verdict[0].toUpperCase() + verdict.slice(1) };
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


  // Deltas de moeda (Economia viva)
  const deltas: Record<string, number> = {};
  for (const cur of view.players) {
    const before = prev.players.find((p) => p.id === cur.id);
    if (before && before.coins !== cur.coins) deltas[cur.id] = cur.coins - before.coins;
  }

  return { log: add, block, challenge, coinDeltas: deltas };
}
