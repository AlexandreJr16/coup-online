// Pilha de fichas como imagem (P07.S4, mockup P03.S2): sprite da quantidade em 2x e o número num
// selo pequeno no canto. O sprite vem de chipSprite (puro). P07.S2 (decisão do Alexandre, 19/10):
// sem curadoria fixa, a variante é SORTEADA: cada pilha sorteia um "sal" ao montar e o soma ao id
// do dono. Muda de partida para partida e a cada quantidade, mas não pisca enquanto a quantidade
// fica. É só enfeite local: o sal não sai do cliente e não depende de nada oculto.
// P07.S5/S6: "pop" ao trocar de sprite, pilha tombada para quem saiu, fichas fantasma (o que
// sairia com a ação em foco, só na pilha de quem olha). O aviso de 10+ é o selo do retrato.
"use client";

import { useState } from "react";

import { U } from "./escalaMesa";
import { chipSprite, pilhaComFantasma } from "./fichas";

/** Altura do sprite de 1..10 fichas (26 px de arte) em 2x. */
const ALTURA = 52;

export function ChipPile({
  count,
  shown,
  ownerId,
  custo = 0,
  tombada = false,
}: {
  count: number;
  shown?: number; // número mostrado (animado); o sprite usa sempre o valor real
  ownerId: string;
  custo?: number; // custo da ação em foco (fichas fantasma); só para a pilha de quem olha
  tombada?: boolean; // dono fora da partida: a pilha tomba e apaga
}) {
  const [sal] = useState(() => Math.random().toString(36).slice(2, 8));
  const id = `${ownerId}:${sal}`;
  const { resto, fantasma } = pilhaComFantasma(count, custo);
  const src = chipSprite(resto, id);
  const fantasmaSrc = fantasma > 0 ? chipSprite(fantasma, id) : null;
  const img = { height: U(ALTURA), imageRendering: "pixelated", display: "block" } as const;
  return (
    <span
      data-chip-pile
      data-seat-coin
      data-tombada={tombada ? "sim" : undefined}
      title={`${count} ${count === 1 ? "ficha" : "fichas"}`}
      className={tombada ? "pilha-tombada" : undefined}
      style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: U(2), width: U(88), height: U(ALTURA) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img key={src} src={src} alt="" aria-hidden className="pop" style={img} />}
      {fantasmaSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-chip-ghost src={fantasmaSrc} alt="" aria-hidden className="ficha-fantasma" style={{ ...img, height: U(ALTURA / 2) }} />
      )}
      <span className="m3-numero" style={{ position: "absolute", right: 0, bottom: 0 }}>
        {shown ?? count}
        {fantasma > 0 && <span style={{ color: "#e07a5f" }}> −{fantasma}</span>}
      </span>
    </span>
  );
}
