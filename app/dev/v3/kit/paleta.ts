// Paleta mestra v2 (tools/art/palette.json, 38 cores) com nomes locais.
// Cada cor vira uma variável CSS `--p-<nome>` no elemento raiz da página;
// o CSS do kit (kit.module.css) só usa essas variáveis, nunca hex solto.
import type { CSSProperties } from "react";

export const PALETA = [
  { nome: "tinta", hex: "#14101a" },
  { nome: "noite", hex: "#2b2236" },
  { nome: "ameixa", hex: "#4a3d5c" },
  { nome: "cinza-roxo", hex: "#7c6f8a" },
  { nome: "pedra", hex: "#bdb0a6" },
  { nome: "creme", hex: "#f6ecd6" },
  { nome: "cafe-1", hex: "#3a2218" },
  { nome: "cafe-2", hex: "#4e2f20" },
  { nome: "cafe-3", hex: "#5e3a26" },
  { nome: "cafe-4", hex: "#734630" },
  { nome: "cobre-1", hex: "#884028" },
  { nome: "cafe-5", hex: "#8a5535" },
  { nome: "cafe-6", hex: "#a0643d" },
  { nome: "cobre-2", hex: "#c0583a" },
  { nome: "couro", hex: "#b87a48" },
  { nome: "areia", hex: "#cd9358" },
  { nome: "pele", hex: "#dba26c" },
  { nome: "pele-clara", hex: "#efc89a" },
  { nome: "vinho", hex: "#5c1620" },
  { nome: "vermelho", hex: "#9a2a2a" },
  { nome: "rubro", hex: "#d0453a" },
  { nome: "coral", hex: "#f08a5d" },
  { nome: "bronze", hex: "#8a5a14" },
  { nome: "ouro", hex: "#d9a028" },
  { nome: "ouro-claro", hex: "#f7d56a" },
  { nome: "mata", hex: "#1f3a2a" },
  { nome: "verde", hex: "#2f6b45" },
  { nome: "folha", hex: "#6aa84f" },
  { nome: "limao", hex: "#b5d86a" },
  { nome: "marinho", hex: "#1a2a4a" },
  { nome: "azul", hex: "#2f5d9a" },
  { nome: "ceu", hex: "#4aa3c7" },
  { nome: "gelo", hex: "#a8dce0" },
  { nome: "uva", hex: "#3b1f52" },
  { nome: "roxo", hex: "#7b3f8f" },
  { nome: "lilas", hex: "#c58ad0" },
  { nome: "laranja", hex: "#e8743b" },
  { nome: "marfim", hex: "#fffaf0" },
] as const;

// Estilo inline com todas as variáveis `--p-*` (custom properties não existem em CSSProperties).
export const PALETA_VARS = Object.fromEntries(
  PALETA.map((c) => [`--p-${c.nome}`, c.hex]),
) as CSSProperties;
