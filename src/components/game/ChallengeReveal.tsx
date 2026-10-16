// Revelação da contestação: a carta alegada vira no centro da mesa e o veredito aparece
// (verde = tinha a carta; vermelho = era blefe). Some sozinha. Não captura cliques.
"use client";

import { type CSSProperties, useEffect, useState } from "react";

import Card from "./Card";
import type { ChallengeEvent } from "./events";
import { CINZEL } from "./helpers";

export default function ChallengeReveal({ challenge }: { challenge: ChallengeEvent | null }) {
  // key={id}: cada contestação monta uma revelação nova, com os próprios cronômetros.
  return challenge ? <Reveal key={challenge.id} ev={challenge} /> : null;
}

// Esconde a si mesma: um callback vindo do pai seria recriado a cada render (o contador da
// mesa re-renderiza a cada 250ms) e reiniciaria o cronômetro para sempre — bug pego no E2E.
function Reveal({ ev }: { ev: ChallengeEvent }) {
  const [flipped, setFlipped] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setFlipped(true), 80);
    const b = setTimeout(() => setGone(true), 2300);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  if (gone) return null;
  const cor = ev.hadCard ? "#6aa84f" : "#d0453a";
  return (
    <div data-testid="challenge-reveal" data-had-card={String(ev.hadCard)} style={wrap}>
      <div style={{ borderRadius: 12, boxShadow: `0 0 0 3px ${cor}, 0 0 34px ${cor}`, transform: "scale(1.3)", margin: "20px 0 10px" }}>
        <Card flip revealed={flipped} character={ev.claimed} size="lg" flipLost={false} />
      </div>
      <div style={{ ...verdict, color: cor }}>{ev.verdict}!</div>
    </div>
  );
}

const wrap: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "48%",
  transform: "translate(-50%, -50%)",
  zIndex: 9,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  pointerEvents: "none",
};
const verdict: CSSProperties = {
  padding: "4px 14px",
  fontFamily: CINZEL,
  fontWeight: 800,
  fontSize: 18,
  letterSpacing: 0.5,
  background: "rgba(20,16,26,0.88)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8,
  whiteSpace: "nowrap",
};
