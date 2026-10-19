// Pilha de fichas como imagem (P07.S4): o sprite muda com a quantidade; o número fica pequeno ao lado.
// O sprite vem de chipSprite (puro). P07.S2 (decisão do Alexandre, 19/10): sem curadoria fixa, a
// variante é SORTEADA: cada pilha sorteia um "sal" ao montar e o soma ao id do dono. Muda de partida
// para partida (o tabuleiro remonta) e a cada quantidade, mas não pisca enquanto a quantidade fica.
// É só enfeite local: o sal não sai do cliente e não depende de nada oculto.
// P07.S5/S6: "pop" ao trocar de sprite, pilha tombada para quem saiu da partida, fichas fantasma
// (o que sairia com a ação em foco, só na pilha de quem olha) e o aviso de Golpe obrigatório (10+).
"use client";

import { useState } from "react";

import { Pic } from "./ActionSeal";
import { U } from "./escalaMesa";
import { avisoDeGolpe, bauSprite, chipSprite, pilhaComFantasma } from "./fichas";
import { COLORS } from "./helpers";

export function ChipPile({
  count,
  shown,
  ownerId,
  bau = false,
  height = 26,
  custo = 0,
  tombada = false,
}: {
  count: number;
  shown?: number; // número mostrado (animado); o sprite usa sempre o valor real
  ownerId: string;
  bau?: boolean;
  height?: number;
  custo?: number; // custo da ação em foco (fichas fantasma); só para a pilha de quem olha
  tombada?: boolean; // dono fora da partida: a pilha tomba e apaga
}) {
  const [sal] = useState(() => Math.random().toString(36).slice(2, 8));
  const id = `${ownerId}:${sal}`;
  const { resto, fantasma } = pilhaComFantasma(count, custo);
  const src = chipSprite(resto, id);
  const fantasmaSrc = fantasma > 0 ? chipSprite(fantasma, id) : null;
  const golpe = !bau && !tombada && avisoDeGolpe(count);
  const img = { height: U(height), imageRendering: "pixelated" } as const;
  return (
    <span
      data-chip-pile
      data-tombada={tombada ? "sim" : undefined}
      title={`${count} ${count === 1 ? "ficha" : "fichas"}${golpe ? " · Golpe obrigatório" : ""}`}
      className={tombada ? "pilha-tombada" : undefined}
      style={{ display: "inline-flex", alignItems: "center", gap: U(6) }}
    >
      {bau && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bauSprite(count)} alt="" aria-hidden style={img} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img key={src} src={src} alt="" aria-hidden className="pop" style={img} />}
      {fantasmaSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-chip-ghost src={fantasmaSrc} alt="" aria-hidden className="ficha-fantasma" style={img} />
      )}
      <span style={{ fontWeight: 800, color: COLORS.gold }}>
        ×{shown ?? count}
        {fantasma > 0 && <span style={{ color: COLORS.red }}> −{fantasma}</span>}
      </span>
      {golpe && (
        <span data-chip-golpe className="urgent-pulse" style={{ display: "inline-flex" }}>
          <Pic name="golpe" emoji="💥" size={16} />
        </span>
      )}
    </span>
  );
}
