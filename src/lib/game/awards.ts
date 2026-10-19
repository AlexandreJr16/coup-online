// Prêmios de fim de partida, calculados das estatísticas públicas (engine.stats).
// Função pura: fácil de testar e igual para todos os jogadores.
import type { IconName } from "../../components/game/helpers"; // só o tipo: some na compilação
import type { PlayerStats } from "../../types/game";

export type AwardId = "mentiroso" | "desconfiado" | "olho_de_lince" | "carrasco" | "ricaco";

// Ícone pixel de cada prêmio (public/art/<tema>/icones/<nome>.png). Todos precisam estar em
// ICONS_AVAILABLE: awards.test.ts garante, para a tela de fim de partida nunca cair em emoji.
export const ICONE_DO_PREMIO: Record<AwardId, IconName> = {
  mentiroso: "mentiroso",
  desconfiado: "desconfiado",
  olho_de_lince: "olho_de_lince",
  carrasco: "carrasco",
  ricaco: "ricaco",
};

export interface Award {
  id: AwardId;
  icone: IconName; // nome do ícone pixel (ICONS_AVAILABLE)
  titulo: string;
  detalhe: string; // ex.: "pego mentindo 3 vezes"
  names: string[]; // empate divide o prêmio
}

const vezes = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// Quem tem o MAIOR valor da métrica (a partir de `min`); empatados entram juntos.
function topo(
  entries: Array<[string, PlayerStats]>,
  metric: (s: PlayerStats) => number,
  min: number,
): { ids: string[]; value: number } | null {
  const max = Math.max(...entries.map(([, s]) => metric(s)));
  if (!Number.isFinite(max) || max < min) return null;
  return { ids: entries.filter(([, s]) => metric(s) === max).map(([id]) => id), value: max };
}

export function computeAwards(
  stats: Record<string, PlayerStats>,
  names: Record<string, string>,
): Award[] {
  const todos = Object.entries(stats).filter(([id]) => id in names); // quem saiu da sala fica de fora
  const nomes = (ids: string[]) => ids.map((id) => names[id]);
  const out: Award[] = [];

  const mentiroso = topo(todos, (s) => s.bluffsCaught, 1);
  if (mentiroso) {
    out.push({
      id: "mentiroso",
      icone: ICONE_DO_PREMIO.mentiroso,
      titulo: "Mentiroso do ano",
      detalhe: `pego mentindo ${vezes(mentiroso.value, "vez", "vezes")}`,
      names: nomes(mentiroso.ids),
    });
  }

  const desconfiado = topo(todos, (s) => s.challengesMade, 1);
  if (desconfiado) {
    out.push({
      id: "desconfiado",
      icone: ICONE_DO_PREMIO.desconfiado,
      titulo: "Maior desconfiado",
      detalhe: `${vezes(desconfiado.value, "contestação", "contestações")}`,
      names: nomes(desconfiado.ids),
    });
  }

  // Olho de lince: melhor taxa de acerto, exigindo ao menos 2 contestações e 1 acerto.
  const elegiveis = todos.filter(([, s]) => s.challengesMade >= 2 && s.challengesRight >= 1);
  const lince = topo(elegiveis, (s) => s.challengesRight / s.challengesMade, 0.0001);
  if (lince) {
    const ex = elegiveis.find(([id]) => id === lince.ids[0])![1];
    out.push({
      id: "olho_de_lince",
      icone: ICONE_DO_PREMIO.olho_de_lince,
      titulo: "Olho de lince",
      detalhe: `acertou ${ex.challengesRight} de ${ex.challengesMade} contestações`,
      names: nomes(lince.ids),
    });
  }

  const carrasco = topo(todos, (s) => s.kills, 1);
  if (carrasco) {
    out.push({
      id: "carrasco",
      icone: ICONE_DO_PREMIO.carrasco,
      titulo: "Carrasco",
      detalhe: `derrubou ${vezes(carrasco.value, "influência", "influências")} na força`,
      names: nomes(carrasco.ids),
    });
  }

  const ricaco = topo(todos, (s) => s.maxCoins, 8);
  if (ricaco) {
    out.push({
      id: "ricaco",
      icone: ICONE_DO_PREMIO.ricaco,
      titulo: "Ricaço",
      detalhe: `chegou a ${ricaco.value} moedas`,
      names: nomes(ricaco.ids),
    });
  }
  return out;
}
