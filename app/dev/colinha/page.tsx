// Revisão da colinha (botão "?"): o botão (abre a peça sobre a tela) e a MESMA peça aberta numa
// página, sem socket. Troque o estilo A/B e a fonte pela aba de Aparência (engrenagem na mesa)
// para conferir as duas versões. A peça é pensada para 1280x720 sem rolagem.
"use client";

import type { CSSProperties } from "react";

import { CheatSheetBody, CheatSheetButton } from "@/src/components/game/CheatSheet";
import { PixelPanel } from "@/src/components/ui/PixelPanel";

const PIXEL_COMPACTO = { "--u": "2px", maxWidth: 1200 } as CSSProperties;

export default function ColinhaDevPage() {
  return (
    <main style={{ padding: 24, background: "var(--k-tinta)", minHeight: "100vh", color: "var(--k-texto)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontFamily: "var(--fonte-ui)", fontWeight: 400, fontSize: 22, margin: 0 }}>Colinha</h1>
        <CheatSheetButton />
      </div>
      <p style={{ color: "var(--k-texto-fraco)", fontFamily: "var(--fonte-ui)", margin: "0 0 16px", fontSize: 13 }}>
        O botão &quot;?&quot; abre a peça (ou tecle <kbd>?</kbd>). Abaixo, o mesmo conteúdo em página:
      </p>
      <div style={PIXEL_COMPACTO} data-testid="colinha-pagina">
        <PixelPanel>
          <CheatSheetBody />
        </PixelPanel>
      </div>
    </main>
  );
}
