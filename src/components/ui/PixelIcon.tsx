// Ícone pixel 12x12 na cor do texto (`currentColor`). Arte provisória: o P05 gera a final.
import { ICONES, type IconeId } from "./icones";
import { PixelBitmap } from "./PixelBitmap";

export function PixelIcon({ nome, celula = 1, titulo }: { nome: IconeId; celula?: number; titulo?: string }) {
  return (
    <PixelBitmap
      linhas={ICONES[nome]}
      cores={{ "#": "currentColor" }}
      celula={celula}
      titulo={titulo}
      testId={`icone-${nome}`}
    />
  );
}
