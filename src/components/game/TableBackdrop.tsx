// Cenário do tema atrás da mesa (suavizado e desfocado) + véu escuro, para dar clima
// sem competir com a mesa. Sem o arquivo, sobra só o fundo escuro do tema.
import type { CSSProperties, ReactNode } from "react";

import { TABLE_BG_URL } from "./helpers";

export default function TableBackdrop({ children }: { children: ReactNode }) {
  return (
    <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
      <SalonBg />
      <div style={{ position: "relative", height: "100%" }}>{children}</div>
    </div>
  );
}

// Só o cenário (preenche o pai `position: relative; overflow: hidden`). Usado também
// no menu e na sala de espera, para o site inteiro falar o mesmo idioma visual.
export function SalonBg() {
  return <div aria-hidden style={backdrop} />;
}

// O cenário tem só 168×96 px: ampliado "pixelado" vira mosaico ilegível. Aqui ele é
// SUAVIZADO e levemente desfocado (como o fundo do Balatro), e o pixel art nítido
// fica para cartas e personagens. A borda negativa evita franja clara do blur.
const backdrop: CSSProperties = {
  position: "absolute",
  inset: -16,
  background: `linear-gradient(rgba(14,12,26,0.42), rgba(14,12,26,0.66)), url(${TABLE_BG_URL}) center / cover no-repeat`,
  imageRendering: "auto",
  filter: "blur(3px) saturate(1.15)",
};
