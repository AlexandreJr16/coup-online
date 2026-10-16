// Revisão do áudio: cada efeito é renderizado OFFLINE e medido (pico/RMS/duração); o botão
// "Tocar" usa o motor de verdade (precisa do gesto). Serve ao Alexandre e ao E2E.
"use client";

import { useEffect, useState } from "react";

import { getAudio } from "@/src/lib/audio/engine";
import { type Measure, measureMusic, measureSfx } from "@/src/lib/audio/measure";
import { SFX, type SfxName } from "@/src/lib/audio/recipes";
import { COLORS } from "@/src/components/game/helpers";

export default function AudioDevPage() {
  const [rows, setRows] = useState<Record<string, Measure>>({});
  useEffect(() => {
    let vivo = true;
    (async () => {
      const out: Record<string, Measure> = {};
      for (const n of Object.keys(SFX) as SfxName[]) out[n] = await measureSfx(n);
      out["musica"] = await measureMusic();
      if (vivo) setRows(out);
    })();
    return () => {
      vivo = false;
    };
  }, []);
  const tocar = (n: SfxName) => {
    const a = getAudio();
    a.unlock();
    a.play(n);
  };
  return (
    <main style={{ padding: 24, background: COLORS.bg, minHeight: "100vh", color: COLORS.text }}>
      <h1>Áudio</h1>
      <table data-testid="audio-tabela" style={{ borderCollapse: "collapse" }}>
        <thead><tr><th align="left">som</th><th>pico</th><th>rms</th><th>dur (s)</th><th /></tr></thead>
        <tbody>
          {[...Object.keys(SFX), "musica"].map((n) => {
            const m = rows[n];
            return (
              <tr key={n} data-sfx={n} data-peak={m?.peak} data-rms={m?.rms} data-seconds={m?.seconds} data-finite={m ? String(m.finite) : undefined}>
                <td style={{ paddingRight: 16 }}>{n}</td>
                <td>{m ? m.peak.toFixed(3) : "…"}</td>
                <td>{m ? m.rms.toFixed(3) : "…"}</td>
                <td>{m ? m.seconds.toFixed(2) : "…"}</td>
                <td>{n !== "musica" && <button onClick={() => tocar(n as SfxName)}>Tocar</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
