// Mockup da colinha como objeto (P03.S4). Estático, sem socket.
//   /dev/v3/colinha?res=1280|1920
import Link from "next/link";
import type { CSSProperties } from "react";

import { CINZEL, COLORS } from "@/src/components/game/helpers";
import ColinhaMock from "./ColinhaMock";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ColinhaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const res: 1280 | 1920 = first(sp.res) === "1920" ? 1920 : 1280;

  return (
    <main style={page} data-testid="mock-colinha">
      <h1 style={{ fontFamily: CINZEL, fontSize: 24, margin: "0 0 4px" }}>Mockup da colinha</h1>
      <p style={{ margin: "0 0 12px", color: COLORS.dim, fontSize: 13, maxWidth: 1100 }}>
        Uma peça só, que sobe como carta. Personagens, ações, custos, contestável e bloqueável vêm de{" "}
        <code>buildCheatSheet()</code> (sem alterar <code>cheatsheet.ts</code>); ✓ e ✗ são pixel, e quem bloqueia aparece
        em retrato mini. Cabe em 1280×720 sem rolagem. Dados do jogo; nada aqui fala com o servidor.
      </p>

      <section data-testid="decisoes" style={box}>
        <h2 style={{ fontFamily: CINZEL, fontSize: 16, margin: "0 0 8px", color: COLORS.turn }}>Decisões necessárias</h2>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.55, color: "#d8cdb8" }}>
          <li>
            <b>Fundo da peça:</b> escuro com moldura de madeira e filete dourado (mostrado, igual à vitória e ao dock) ou
            pergaminho claro com texto escuro (mais legível, mas é o &quot;painel bege&quot; que já foi criticado). Sugestão:
            escuro.
          </li>
          <li>
            <b>As 5 regras curtas são texto novo</b> (~60 palavras, fiéis ao <code>game-rules.md</code>). Hoje o{" "}
            <code>cheatsheet.ts</code> só tem <code>RULES_SUMMARY</code> (8 regras longas). Para implementar, vira uma
            constante nova com teste de fidelidade (mudança fora da apresentação). Aprovar o texto e essa mudança.
          </li>
          <li>
            <b>Quem bloqueia em retrato mini</b> (mostrado, ao lado do ✓ de Bloquear) ou só ✓/✗ sem retratos?
          </li>
          <li>
            <b>Ações livres</b> (Renda, Ajuda Externa, Golpe) no rodapé esquerdo (mostrado) ou fora da colinha, já que ficam
            no dock?
          </li>
          <li>
            <b>Texto a 12 px:</b> a colinha tem muito texto pequeno. Se o corpo em sans (DEC-12) precisar de 14 px, algo sai:
            o efeito por extenso de cada ação ou a linha &quot;Bloqueia…&quot;.
          </li>
          <li>
            <b>Abertura:</b> a peça sobe em degraus (~0,55 s) e fica parada; sob <code>prefers-reduced-motion</code> aparece
            direto. O botão &quot;Reabrir&quot; abaixo repete só no mockup. Fechar: <kbd>Esc</kbd> ou <kbd>?</kbd>, como hoje.
          </li>
          <li>
            <b>Escala 1920×1080:</b> mesmo desenho em 1,5× (pixels desiguais). Liga com DEC-13.
          </li>
        </ol>
      </section>

      <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }} aria-label="Resolução">
        <span style={{ width: 84, fontSize: 12, color: COLORS.dim }}>Resolução</span>
        {([1280, 1920] as const).map((r) => (
          <Link key={r} href={`/dev/v3/colinha?res=${r}`} style={chip(r === res)} data-testid={`link-${r}`}>
            {r === 1280 ? "1280×720" : "1920×1080"}
          </Link>
        ))}
      </nav>

      <ColinhaMock res={res} />
    </main>
  );
}

const page: CSSProperties = { padding: 20, background: COLORS.bg, minHeight: "100vh", color: COLORS.text, minWidth: 1320 };
const box: CSSProperties = { maxWidth: 1100, margin: "0 0 14px", padding: "12px 16px", background: "#241c14", border: `2px solid ${COLORS.gold}` };
const chip = (on: boolean): CSSProperties => ({
  padding: "6px 12px",
  fontSize: 13,
  textDecoration: "none",
  color: on ? "#1a1a2e" : COLORS.text,
  background: on ? COLORS.gold : "#2b2236",
  border: `2px solid ${on ? COLORS.gold : "#4a3d5c"}`,
});
