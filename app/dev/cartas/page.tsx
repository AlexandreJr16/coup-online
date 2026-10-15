// Galeria de revisão das cartas (só visual, sem socket nem dados de partida).
// Mostra cada personagem nos estados do jogo, nos dois tamanhos — usada para
// aprovar arte nova (ROADMAP Fases 2–3) e comparar temas (Fase 8).
"use client";

import type { CSSProperties } from "react";

import Card from "@/src/components/game/Card";
import { ART_THEME, CINZEL, COLORS } from "@/src/components/game/helpers";
import { CARDS } from "@/src/lib/game/cards";

const STATES: Array<{ label: string; props: Record<string, boolean> }> = [
  { label: "na mão", props: {} },
  { label: "blefe", props: { bluff: true } },
  { label: "perdida", props: { lost: true } },
  { label: "selecionada", props: { selected: true } },
];

export default function CartasDevPage() {
  return (
    <main style={{ padding: 24, background: COLORS.bg, minHeight: "100vh", color: COLORS.text }}>
      <h1 style={{ fontFamily: CINZEL, fontSize: 22, margin: "0 0 4px" }}>Galeria de cartas</h1>
      <p style={{ color: COLORS.dim, margin: "0 0 20px", fontSize: 13 }}>
        Tema de arte: <b>{ART_THEME}</b>. Personagem sem arte usa o emoji (fallback).
      </p>
      {CARDS.map((c) => (
        <section key={c.id} style={{ marginBottom: 22 }}>
          <h2 style={{ fontFamily: CINZEL, fontSize: 15, margin: "0 0 8px" }}>
            {c.nome} <span style={{ color: COLORS.dim, fontWeight: 400 }}>({c.id})</span>
          </h2>
          <div style={row}>
            {STATES.map((s) => (
              <figure key={s.label} style={fig}>
                <Card character={c.id} size="lg" hint={c.dica} {...s.props} />
                <figcaption style={cap}>{s.label}</figcaption>
              </figure>
            ))}
            <figure style={fig}>
              <Card faceDown size="lg" />
              <figcaption style={cap}>verso</figcaption>
            </figure>
            <figure style={fig}>
              <div style={{ display: "flex", gap: 6 }}>
                <Card character={c.id} size="sm" />
                <Card character={c.id} size="sm" lost />
                <Card faceDown size="sm" />
              </div>
              <figcaption style={cap}>miniatura (mesa): ativa · perdida · verso</figcaption>
            </figure>
          </div>
        </section>
      ))}
    </main>
  );
}

const row: CSSProperties = { display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end" };
const fig: CSSProperties = { margin: 0, display: "flex", flexDirection: "column", gap: 6 };
const cap: CSSProperties = { fontSize: 11, color: COLORS.dim };
