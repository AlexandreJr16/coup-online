// Fonte pixel usada só neste mockup (a escolha final da fonte de interface é do P03.S1).
// Pixelify Sans: acentos pt-BR completos (subset latin).
import { Pixelify_Sans } from "next/font/google";

export const fontePixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  display: "swap",
});
