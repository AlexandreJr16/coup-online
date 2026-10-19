// Revisão da colinha (botão "?"): o botão e o mesmo conteúdo aberto numa página, sem socket.
"use client";

import { CheatSheetBody, CheatSheetButton } from "@/src/components/game/CheatSheet";
import { CINZEL, COLORS } from "@/src/components/game/helpers";

export default function ColinhaDevPage() {
  return (
    <main style={{ padding: 24, background: COLORS.bg, minHeight: "100vh", color: COLORS.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontFamily: CINZEL, fontSize: 22, margin: 0 }}>Colinha</h1>
        <CheatSheetButton />
      </div>
      <p style={{ color: COLORS.dim, margin: "0 0 16px", fontSize: 13 }}>
        O botão &quot;?&quot; abre o painel (ou tecle <kbd>?</kbd>). Abaixo, o mesmo conteúdo em página:
      </p>
      <div style={{ maxWidth: 780 }} data-testid="colinha-pagina">
        <CheatSheetBody />
      </div>
    </main>
  );
}
