// Selo de ação: o "botão" do jogo. Imagem pixel art + palavra curta + efeito (custo ou
// ganho), em moldura de lacre. Nunca é só texto (docs/DESIGN_MESA_V2.md). Estados:
//  ready      pronto, moldura na cor da ação (dourada se a carta é sua)
//  off        fora da vez: apagado
//  locked     travado: cadeado no lugar do ícone (sem moedas / golpe obrigatório)
//  mandatory  a única jogada permitida: pulsa
// `bluff` pendura a máscara de baile no canto (aviso privado, não impede o uso).
"use client";

import { type CSSProperties, type ReactNode, useState } from "react";

import { U } from "./escalaMesa";
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
  width = 208, // em unidades da mesa (U)
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
      style={
        {
          "--c": color,
          // A classe .seal tem os tamanhos de 1x; o inline os leva ao degrau da mesa.
          width: U(width),
          minHeight: U(46),
          gap: U(10),
          padding: `${U(6)} ${U(12)} ${U(6)} ${U(8)}`,
          fontSize: U(14),
        } as CSSProperties
      }
    >
      <Pic name={locked ? "cadeado" : icon} emoji={locked ? "🔒" : emoji} />
      <span style={{ flex: 1, minWidth: 0, textAlign: "left", fontFamily: CINZEL, fontWeight: 700, letterSpacing: 0.3 }}>
        {label}
      </span>
      {sub !== undefined && <b style={{ fontVariantNumeric: "tabular-nums", opacity: locked ? 0.7 : 1 }}>{sub}</b>}
      {hotkey && !disabled && (
        <kbd className="seal-key" style={{ top: U(-9), left: U(10), fontSize: U(9), lineHeight: U(12), padding: `${U(1)} ${U(6)}` }}>
          {hotkey}
        </kbd>
      )}
      {bluff && !disabled && (
        <span style={{ position: "absolute", top: U(-9), right: U(-7) }} aria-label="blefe" title="você não tem esta carta (blefe)">
          <Pic name="mascara" emoji="🎭" size={16} />
        </span>
      )}
    </button>
  );
}

// Ícone pixel art (32 unidades nativo; 16 = metade; `size` em unidades da mesa). Cai no emoji se faltar.
export function Pic({ name, emoji, size = 32 }: { name: IconName; emoji: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : iconUrl(name, "sm");
  if (!src) return <span style={{ width: U(size), height: U(size), fontSize: U(size * 0.7), lineHeight: U(size), textAlign: "center" }}>{emoji}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      style={{ width: U(size), height: U(size), imageRendering: "pixelated", flex: "none" }}
    />
  );
}
