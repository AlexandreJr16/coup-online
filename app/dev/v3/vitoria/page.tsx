// Mockup da tela de fim de partida (P03.S4). Estático, sem socket.
//   /dev/v3/vitoria?papel=jogador|espectador&fx=moedas|confete|ambos|nenhum&res=1280|1920
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { CINZEL, COLORS } from "@/src/components/game/helpers";
import VitoriaMock, { type Fx, type Papel } from "./VitoriaMock";

type SP = Record<string, string | string[] | undefined>;

const PAPEIS: Array<{ id: Papel; nome: string }> = [
  { id: "jogador", nome: "Jogador (com revanche)" },
  { id: "espectador", nome: "Espectador (aguarda)" },
];
const FXS: Array<{ id: Fx; nome: string }> = [
  { id: "moedas", nome: "Moedas" },
  { id: "confete", nome: "Confete" },
  { id: "ambos", nome: "Os dois" },
  { id: "nenhum", nome: "Sem efeito" },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function VitoriaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const papel = (PAPEIS.find((p) => p.id === first(sp.papel))?.id ?? "jogador") as Papel;
  const fx = (FXS.find((f) => f.id === first(sp.fx))?.id ?? "moedas") as Fx;
  const res: 1280 | 1920 = first(sp.res) === "1920" ? 1920 : 1280;
  const href = (o: Partial<{ papel: string; fx: string; res: number }>) =>
    `/dev/v3/vitoria?papel=${o.papel ?? papel}&fx=${o.fx ?? fx}&res=${o.res ?? res}`;

  return (
    <main style={page} data-testid="mock-vitoria">
      <h1 style={{ fontFamily: CINZEL, fontSize: 24, margin: "0 0 4px" }}>Mockup da tela de vitória</h1>
      <p style={{ margin: "0 0 12px", color: COLORS.dim, fontSize: 13, maxWidth: 1100 }}>
        Retrato do vencedor em moldura, troféu e ícones dos prêmios desenhados em pixel (nenhum emoji), placar da noite,
        botão de revanche com atalho e aviso de espectadores. Os 5 prêmios aparecem juntos só para revisar os ícones; no
        jogo entram apenas os que alguém ganhou. Dados fictícios.
      </p>

      <section data-testid="decisoes" style={box}>
        <h2 style={{ fontFamily: CINZEL, fontSize: 16, margin: "0 0 8px", color: COLORS.turn }}>Decisões necessárias</h2>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.55, color: "#d8cdb8" }}>
          <li>
            <b>Efeito de fim: moedas ou confete?</b> Teste os links abaixo. Sugestão: <b>moedas</b> (combina com o Erário
            e com o tema; confete é festa genérica). Em qualquer caso: teto de 28 partículas, só <code>transform</code>, e
            some sob <code>prefers-reduced-motion</code>. Aqui o efeito repete em laço só para revisão; no jogo seria 1 ciclo (~1,5 s).
          </li>
          <li>
            <b>Atalho da revanche:</b> <kbd>Enter</kbd> (mostrado) ou <kbd>R</kbd>. Evitei <kbd>Espaço</kbd> porque na mesa
            ele é &quot;Passar&quot; e um aperto rápido no fim da partida poderia reiniciar sem querer.
          </li>
          <li>
            <b>Placar da noite:</b> um troféu por vitória (mostrado, com o número ao lado) ou só o número? Só vitórias ou
            também partidas jogadas?
          </li>
          <li>
            <b>Prêmios:</b> listar todos os que alguém ganhou (mostrado, até 5) ou limitar a 3 para a tela respirar?
          </li>
          <li>
            <b>Coroa e retrato grande:</b> retrato em 3× com moldura que pulsa e a coroa que desce (VIDA_E_BLEFE 8.3)
            aprovados? A coroa e o troféu aqui são desenhos de retângulos, não arte do pipeline.
          </li>
          <li>
            <b>Estilo dos ícones dos prêmios</b> (machado, saco de moedas, máscara, lupa, olho): aprovar o desenho por
            retângulos ou gerar/curar arte própria? A máscara repete o sinal &quot;máscara = blefe&quot; da gramática visual.
          </li>
          <li>
            <b>Escala 1920×1080:</b> aqui é o mesmo desenho em 1,5× (pixels desiguais). Liga com DEC-13 (degraus inteiros).
          </li>
        </ol>
      </section>

      <Nav label="Quem vê">
        {PAPEIS.map((p) => (
          <Link key={p.id} href={href({ papel: p.id })} style={chip(p.id === papel)} data-testid={`link-${p.id}`}>
            {p.nome}
          </Link>
        ))}
      </Nav>
      <Nav label="Efeito">
        {FXS.map((f) => (
          <Link key={f.id} href={href({ fx: f.id })} style={chip(f.id === fx)} data-testid={`link-${f.id}`}>
            {f.nome}
          </Link>
        ))}
      </Nav>
      <Nav label="Resolução">
        {([1280, 1920] as const).map((r) => (
          <Link key={r} href={href({ res: r })} style={chip(r === res)} data-testid={`link-${r}`}>
            {r === 1280 ? "1280×720" : "1920×1080"}
          </Link>
        ))}
      </Nav>

      <div style={{ marginTop: 14 }}>
        <VitoriaMock papel={papel} fx={fx} res={res} />
      </div>
    </main>
  );
}

function Nav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }} aria-label={label}>
      <span style={{ width: 84, fontSize: 12, color: COLORS.dim }}>{label}</span>
      {children}
    </nav>
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
