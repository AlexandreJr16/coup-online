// Fontes candidatas da interface (DEC-11/DEC-12), via next/font/google
// (embutido no Next; não é dependência nova). Só latin: cobre os acentos pt-BR.
import {
  Cinzel,
  Geist,
  Pixelify_Sans,
  Press_Start_2P,
  Silkscreen,
  VT323,
} from "next/font/google";

const pixelify = Pixelify_Sans({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const silkscreen = Silkscreen({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const vt323 = VT323({ subsets: ["latin"], weight: "400", display: "swap" });
const pressStart = Press_Start_2P({ subsets: ["latin"], weight: "400", display: "swap" });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "700"], display: "swap" });
const geist = Geist({ subsets: ["latin"], display: "swap" });

export type FonteId = "pixelify" | "silkscreen" | "vt323" | "press" | "cinzel" | "geist";

export interface Fonte {
  id: FonteId;
  nome: string;
  papel: string;
  className: string;
  // Valor CSS de font-family gerado pelo Next (inclui o fallback do próprio Next).
  familia: string;
  // Multiplicador de tamanho no HUD/kit: cada fonte tem altura de x diferente.
  escala: number;
}

export const FONTES: readonly Fonte[] = [
  { id: "pixelify", nome: "Pixelify Sans", papel: "candidata", className: pixelify.className, familia: pixelify.style.fontFamily, escala: 1 },
  { id: "silkscreen", nome: "Silkscreen", papel: "candidata", className: silkscreen.className, familia: silkscreen.style.fontFamily, escala: 0.9 },
  { id: "vt323", nome: "VT323", papel: "candidata", className: vt323.className, familia: vt323.style.fontFamily, escala: 1.35 },
  { id: "press", nome: "Press Start 2P", papel: "candidata", className: pressStart.className, familia: pressStart.style.fontFamily, escala: 0.62 },
  { id: "cinzel", nome: "Cinzel", papel: "atual (contraste)", className: cinzel.className, familia: cinzel.style.fontFamily, escala: 0.95 },
  { id: "geist", nome: "Geist (sans)", papel: "contraste para corpo (DEC-12)", className: geist.className, familia: geist.style.fontFamily, escala: 1 },
];

export const FONTES_PIXEL: readonly Fonte[] = FONTES.filter((f) => f.papel === "candidata");

export function fonteDe(id: string | undefined): Fonte {
  return FONTES_PIXEL.find((f) => f.id === id) ?? FONTES_PIXEL[0];
}
