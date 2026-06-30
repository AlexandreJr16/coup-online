// Selo de cera: estampa que "bate" no centro da tela quando alguém
// Contesta/Bloqueia — dramatiza o clímax do Coup (desmascarar o blefe). Puramente
// visual; re-anima sempre que `seal.key` muda (remonta via key). Não bloqueia
// cliques (pointerEvents:none).
"use client";

import type { CSSProperties } from "react";

export interface SealData {
  key: number;
  title: string;
  subtitle?: string;
}

export default function WaxSeal({ seal }: { seal: SealData | null }) {
  if (!seal) return null;
  return (
    <div key={seal.key} className="seal-stamp" style={wrap}>
      <div style={disc}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>⚜</span>
        <span style={title}>{seal.title}</span>
        {seal.subtitle && <span style={subtitle}>{seal.subtitle}</span>}
      </div>
    </div>
  );
}

const CINZEL = "var(--font-cinzel), Georgia, serif";

const wrap: CSSProperties = {
  position: "absolute",
  top: "44%",
  left: "50%",
  zIndex: 60, // acima do overlay de reação (50)
  pointerEvents: "none",
};
const disc: CSSProperties = {
  width: 150,
  height: 150,
  borderRadius: "50%",
  background: "radial-gradient(circle at 38% 32%, #a8312c, #6e1410 70%, #4a0d0a)",
  border: "3px solid #5a100c",
  boxShadow:
    "0 10px 30px rgba(0,0,0,0.55), inset 0 4px 10px rgba(255,255,255,0.18), inset 0 -12px 20px rgba(0,0,0,0.55)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  color: "#f3d9c0",
  textAlign: "center",
  padding: 10,
};
const title: CSSProperties = {
  fontFamily: CINZEL,
  fontWeight: 900,
  fontSize: 18,
  letterSpacing: 1,
  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
};
const subtitle: CSSProperties = {
  fontSize: 13,
  opacity: 0.92,
};
