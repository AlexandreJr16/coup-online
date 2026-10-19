// Interruptor "Passar automático": o servidor passa por você nas janelas em que você não é
// parte envolvida (não é o alvo; nem o ator quando contestam um bloqueio). Acelera as
// rodadas; o custo é abrir mão de contestar jogadas alheias enquanto estiver ligado.
"use client";

import { U } from "./escalaMesa";

export default function AutoPassToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label
      data-testid="autopass"
      className="toggle"
      style={{ width: U(208), fontSize: U(13), gap: U(10) }}
      title="Passa sozinho nas jogadas que não são contra você (você deixa de poder contestá-las)"
    >
      <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>Passar automático</span>
    </label>
  );
}
