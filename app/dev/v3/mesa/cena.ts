// Dados FICTÍCIOS da cena do mockup (sem socket). Um único estado de jogo:
// o Barão do Café declara Taxas (ou, na variante ?acao=assassinar, Assassinar contra um alvo),
// a janela de reação está aberta e alguns jogadores já passaram.
// Posições em unidades base (palco 1280x720 com u = 1); o palco multiplica por --u.
import type { ActionType, Character } from "@/src/types/game";
import type { Relogio } from "./Retrato";

export type TamanhoMesa = 2 | 4;
export type AcaoCena = "taxas" | "assassinar";

export interface JogadorCena {
  id: string;
  nome: string;
  avatar: string; // slug em public/art/imperio/avatares
  moedas: number;
  influencias: 0 | 1 | 2;
  perdidas: Character[]; // cartas reveladas (2 - influencias)
  ausente?: boolean;
  eu?: boolean;
}

export interface EntradaHistorico {
  icone: ActionType;
  texto: string;
  atual?: boolean;
}

export interface Cena {
  n: TamanhoMesa;
  acao: AcaoCena;
  jogadores: JogadorCena[];
  posicoes: Record<string, { cx: number; y: number }>;
  atorId: string;
  alvoId: string | null;
  passaramIds: string[];
  aguardando: Record<string, Relogio>;
  legenda: string;
  erario: number;
  baralho: number;
  historico: EntradaHistorico[];
}

const BARAO: JogadorCena = { id: "barao", nome: "Barão do Café", avatar: "jovem_barao", moedas: 5, influencias: 2, perdidas: [] };
const ANNY: JogadorCena = { id: "anny", nome: "Anny", avatar: "dama_corte", moedas: 3, influencias: 1, perdidas: ["condessa"] };
const CAIO: JogadorCena = { id: "caio", nome: "Caio", avatar: "capitao_porto", moedas: 8, influencias: 2, perdidas: [] };
const VOCE: JogadorCena = { id: "voce", nome: "Você", avatar: "ribeirinho", moedas: 4, influencias: 2, perdidas: [], eu: true };

const POSICOES_4: Cena["posicoes"] = {
  barao: { cx: 640, y: 96 },
  anny: { cx: 168, y: 262 },
  caio: { cx: 1112, y: 262 },
  voce: { cx: 640, y: 440 },
};
const POSICOES_2: Cena["posicoes"] = {
  barao: { cx: 640, y: 96 },
  voce: { cx: 640, y: 440 },
};

/** "você e Caio" / "você, Anny e Caio": o jogador local vem primeiro e em minúscula. */
export function listarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

export function montarCena(n: TamanhoMesa, acao: AcaoCena): Cena {
  const jogadores = n === 2 ? [BARAO, VOCE] : [BARAO, ANNY, CAIO, VOCE];
  const alvoId = acao === "assassinar" ? (n === 2 ? "voce" : "caio") : null;

  let passaramIds: string[];
  let aguardando: Cena["aguardando"];
  if (acao === "taxas") {
    // Janela global: quem não passou ainda precisa agir. Dois relógios diferentes lado a lado
    // só para revisão (no jogo real todos da janela global dividem o mesmo tempo).
    passaramIds = n === 2 ? [] : ["anny"];
    aguardando =
      n === 2
        ? { voce: { pct: 78, segundos: 9 } }
        : { caio: { pct: 58, segundos: 3 }, voce: { pct: 78, segundos: 9 } };
  } else {
    // Janela da vítima: os outros já passaram, só o alvo precisa responder.
    passaramIds = jogadores.filter((j) => j.id !== "barao" && j.id !== alvoId).map((j) => j.id);
    aguardando = { [alvoId ?? "voce"]: { pct: 70, segundos: 10 } };
  }

  const nome = (id: string): string => {
    const j = jogadores.find((x) => x.id === id);
    return j?.eu ? "você" : (j?.nome ?? "?");
  };
  const esperados = Object.keys(aguardando)
    .map(nome)
    .sort((a, b) => (a === "você" ? -1 : b === "você" ? 1 : 0));
  const oQue = acao === "taxas" ? "contestar ou passar" : "contestar, bloquear ou passar";
  const legenda = `Aguardando ${listarNomes(esperados)}: ${oQue}`;

  return {
    n,
    acao,
    jogadores,
    posicoes: n === 2 ? POSICOES_2 : POSICOES_4,
    atorId: "barao",
    alvoId,
    passaramIds,
    aguardando,
    legenda,
    erario: 22,
    baralho: 17,
    historico: [
      { icone: "renda", texto: "Você · Renda" },
      { icone: "ajuda_externa", texto: "Caio · Ajuda Externa" },
      { icone: "renda", texto: "Anny · Renda" },
      { icone: acao === "taxas" ? "taxas" : "assassinar", texto: `Barão · ${acao === "taxas" ? "Taxas" : "Assassinar"}`, atual: true },
    ],
  };
}

export function lerTamanho(v: string | undefined): TamanhoMesa {
  return v === "2" ? 2 : 4;
}
export function lerAcao(v: string | undefined): AcaoCena {
  return v === "assassinar" ? "assassinar" : "taxas";
}
