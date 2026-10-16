// Galeria dos selos de ação em todos os estados (revisão visual — passo 4.2).
"use client";

import ActionSeal from "@/src/components/game/ActionSeal";
import { CINZEL, COLORS, ICONS_AVAILABLE, type IconName, type SealState } from "@/src/components/game/helpers";
import { Pic } from "@/src/components/game/ActionSeal";

const ESTADOS: Array<{ nome: string; state: SealState; bluff?: boolean }> = [
  { nome: "pronto", state: "ready" },
  { nome: "pronto + blefe (máscara)", state: "ready", bluff: true },
  { nome: "fora da vez (apagado)", state: "off" },
  { nome: "travado (cadeado)", state: "locked" },
  { nome: "obrigatório (pulsa)", state: "mandatory" },
];

export default function SelosDevPage() {
  return (
    <main style={{ padding: 24, background: COLORS.bg, minHeight: "100vh", color: COLORS.text }}>
      <h1 style={{ fontFamily: CINZEL, fontSize: 22, margin: "0 0 16px" }}>Selos de ação</h1>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }} data-testid="selos">
        {ESTADOS.map((e) => (
          <section key={e.nome} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 12, color: COLORS.dim, margin: 0 }}>{e.nome}</h2>
            <ActionSeal icon="renda" emoji="🪙" label="Renda" sub="+1" color={COLORS.gold} state={e.state} bluff={e.bluff} />
            <ActionSeal icon="taxas" emoji="📒" label="Taxas" sub="+3" color="#2f6b45" state={e.state} bluff={e.bluff} />
            <ActionSeal icon="golpe" emoji="💥" label="Golpe de Estado" sub="−7" color="#b3392b" state={e.state} bluff={e.bluff} />
            <ActionSeal icon="contestar" emoji="❗" label="Contestar" color={COLORS.red} state={e.state} bluff={e.bluff} />
          </section>
        ))}
      </div>
      <h2 style={{ fontFamily: CINZEL, fontSize: 16, margin: "28px 0 10px" }}>Ícones</h2>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }} data-testid="icones">
        {(["renda","ajuda_externa","golpe","taxas","assassinar","extorquir","trocar","contestar","bloquear","passar","mascara","cadeado"] as IconName[]).map((n) => (
          <div key={n} style={{ textAlign: "center", fontSize: 11, color: COLORS.dim }}>
            <Pic name={n} emoji="∅" size={32} />
            <div>{n}{ICONS_AVAILABLE.includes(n) ? "" : " (emoji)"}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
