// Tempos da partida (só o host mexe, no lobby). Os campos, limites e padrões vêm de
// CONFIG_SPEC — mesma fonte que a engine usa para validar, então a tela nunca
// aceita um valor que o servidor depois "corrigiria" em silêncio.
"use client";

import { type CSSProperties, useState } from "react";

import { CONFIG_KEYS, CONFIG_SPEC } from "@/src/lib/game/config";
import type { GameConfig } from "@/src/types/game";
import { COLORS } from "./helpers";

export const DEFAULT_TIMERS: GameConfig = Object.fromEntries(
  CONFIG_KEYS.map((k) => [k, CONFIG_SPEC[k].def]),
) as unknown as GameConfig;

export default function TimerSettings({
  value,
  onChange,
  defaultOpen = false,
}: {
  value: GameConfig;
  onChange: (next: GameConfig) => void;
  defaultOpen?: boolean;
}) {
  // Rascunho em texto: deixa apagar e digitar à vontade; só valida ao sair do campo.
  const [drafts, setDrafts] = useState<Partial<Record<keyof GameConfig, string>>>({});

  function commit(key: keyof GameConfig) {
    const raw = drafts[key];
    if (raw === undefined) return;
    const spec = CONFIG_SPEC[key];
    const n = Number(raw);
    const next = Number.isFinite(n) && raw.trim() !== "" ? Math.round(n) : value[key];
    onChange({ ...value, [key]: Math.max(spec.min, Math.min(spec.max, next)) });
    setDrafts((d) => {
      const { [key]: _drop, ...rest } = d;
      void _drop;
      return rest;
    });
  }

  const isDefault = CONFIG_KEYS.every((k) => value[k] === CONFIG_SPEC[k].def);

  return (
    <details style={box} open={defaultOpen}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>⚙ Tempos da partida</summary>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {CONFIG_KEYS.map((key) => {
          const spec = CONFIG_SPEC[key];
          return (
            <label key={key} style={row}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14 }}>{spec.label}</span>
                <span style={{ display: "block", fontSize: 11, color: COLORS.dim }}>
                  {spec.hint} · {spec.min}–{spec.max}s
                </span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={spec.min}
                max={spec.max}
                value={drafts[key] ?? String(value[key])}
                onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                onBlur={() => commit(key)}
                onKeyDown={(e) => e.key === "Enter" && commit(key)}
                style={input}
              />
              <span style={{ fontSize: 12, color: COLORS.dim }}>s</span>
            </label>
          );
        })}
        {!isDefault && (
          <button
            type="button"
            onClick={() => {
              setDrafts({});
              onChange(DEFAULT_TIMERS);
            }}
            style={resetBtn}
          >
            Restaurar padrões
          </button>
        )}
      </div>
    </details>
  );
}

const box: CSSProperties = {
  marginTop: 20,
  padding: "12px 14px",
  background: "rgba(255,255,255,0.04)",
  borderRadius: 10,
  color: COLORS.text,
};
const row: CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const input: CSSProperties = {
  width: 64,
  padding: "6px 8px",
  textAlign: "right",
  color: COLORS.text,
  background: "#15152b",
  border: `1px solid ${COLORS.neutral}`,
  borderRadius: 6,
  fontVariantNumeric: "tabular-nums",
};
const resetBtn: CSSProperties = {
  alignSelf: "flex-start",
  background: "none",
  border: "none",
  color: COLORS.gold,
  textDecoration: "underline",
  cursor: "pointer",
  padding: 0,
  fontSize: 13,
};
