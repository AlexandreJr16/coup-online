// Selo de ação: o "botão" do jogo. Imagem pixel art + palavra curta + efeito (custo ou
// ganho), em moldura de lacre. Nunca é só texto (docs/DESIGN_MESA_V2.md). Estados:
//  ready      pronto, moldura na cor da ação (dourada se a carta é sua)
//  off        fora da vez: apagado
//  locked     travado: cadeado no lugar do ícone (sem moedas / golpe obrigatório)
//  mandatory  a única jogada permitida: pulsa
// `bluff` pendura a máscara de baile no canto (aviso privado, não impede o uso).
"use client";

import { type CSSProperties, type ReactNode, useState } from "react";

import { CINZEL, type IconName, iconUrl, type SealState } from "./helpers";

export default function ActionSeal({
  icon,
  emoji,
  label,
  sub,
  color,
  state = "ready",
  bluff = false,
  onClick,
  width = 208,
  title,
  hotkey,
}: {
  icon: IconName;
  emoji: string; // fallback quando o ícone não existe ou falha ao carregar
  label: ReactNode;
  sub?: ReactNode; // efeito: "+3", "−7"…
  color: string; // cor da moldura
  state?: SealState;
  bluff?: boolean;
  onClick?: () => void;
  width?: number;
  title?: string;
  hotkey?: string; // tecla de atalho mostrada no canto (ex.: "Espaço", "C")
}) {
  const locked = state === "locked";
  const disabled = state === "off" || locked;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-state={state}
      className={`seal${state === "mandatory" ? " urgent-pulse" : ""}`}
      style={{ "--c": color, width } as CSSProperties}
    >
      <Pic name={locked ? "cadeado" : icon} emoji={locked ? "🔒" : emoji} />
      <span style={{ flex: 1, minWidth: 0, textAlign: "left", fontFamily: CINZEL, fontWeight: 700, letterSpacing: 0.3 }}>
        {label}
      </span>
      {sub !== undefined && <b style={{ fontVariantNumeric: "tabular-nums", opacity: locked ? 0.7 : 1 }}>{sub}</b>}
      {hotkey && !disabled && <kbd className="seal-key">{hotkey}</kbd>}
      {bluff && !disabled && (
        <span style={{ position: "absolute", top: -9, right: -7 }} aria-label="blefe" title="você não tem esta carta (blefe)">
          <Pic name="mascara" emoji="🎭" size={16} />
        </span>
      )}
    </button>
  );
}

// Ícone pixel art em escala inteira (32px nativo; 16px = metade). Cai no emoji se faltar.
export function Pic({ name, emoji, size = 32 }: { name: IconName; emoji: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : iconUrl(name, "sm");
  if (!src) return <span style={{ width: size, height: size, fontSize: size * 0.7, lineHeight: `${size}px`, textAlign: "center" }}>{emoji}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, imageRendering: "pixelated", flex: "none" }}
    />
  );
}
