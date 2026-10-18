// Mockup do dock (P03.S3 / DEC-14). Estático, sem socket.
//   /dev/v3/dock?v=cavalete|mesa|bandeja&estado=minha|reacao|espera&res=1280|1920
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { CINZEL, COLORS } from "@/src/components/game/helpers";
import DockMock, { type Estado, type Variant } from "./DockMock";

type SP = Record<string, string | string[] | undefined>;

const VARIANTS: Array<{ id: Variant; nome: string; nota: string }> = [
  { id: "cavalete", nome: "Cavalete", nota: "Rummikub: as cartas em pé num trilho de madeira com plaquetas de latão." },
  { id: "mesa", nome: "Mesa", nota: "As cartas pousadas direto na madeira da borda da mesa, levemente inclinadas." },
  { id: "bandeja", nome: "Bandeja", nota: "Bandeja de couro com costura e rebites, forro escuro por dentro." },
];
const ESTADOS: Array<{ id: Estado; nome: string }> = [
  { id: "minha", nome: "Minha vez" },
  { id: "reacao", nome: "Reação (jogada contra mim)" },
  { id: "espera", nome: "Esperando" },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function DockPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const variant = (VARIANTS.find((v) => v.id === first(sp.v))?.id ?? "cavalete") as Variant;
  const estado = (ESTADOS.find((e) => e.id === first(sp.estado))?.id ?? "minha") as Estado;
  const res: 1280 | 1920 = first(sp.res) === "1920" ? 1920 : 1280;
  const href = (o: Partial<{ v: string; estado: string; res: number }>) =>
    `/dev/v3/dock?v=${o.v ?? variant}&estado=${o.estado ?? estado}&res=${o.res ?? res}`;
  const atual = VARIANTS.find((v) => v.id === variant)!;

  return (
    <main style={page} data-testid="mock-dock">
      <h1 style={{ fontFamily: CINZEL, fontSize: 24, margin: "0 0 4px" }}>Mockup do dock · {atual.nome}</h1>
      <p style={{ margin: "0 0 12px", color: COLORS.dim, fontSize: 13, maxWidth: 1100 }}>
        {atual.nota} Três zonas fixas em todas: ações básicas à esquerda (fichas sobre a madeira), poderes pela carta no
        meio, reações como selos grandes logo abaixo da jogada. Dados fictícios; nada aqui fala com o servidor.
      </p>

      <DecisoesDock />

      <Nav label="Variação">
        {VARIANTS.map((v) => (
          <Link key={v.id} href={href({ v: v.id })} style={chip(v.id === variant)} data-testid={`link-${v.id}`}>
            {v.nome}
          </Link>
        ))}
      </Nav>
      <Nav label="Estado">
        {ESTADOS.map((e) => (
          <Link key={e.id} href={href({ estado: e.id })} style={chip(e.id === estado)} data-testid={`link-${e.id}`}>
            {e.nome}
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
        <DockMock variant={variant} estado={estado} res={res} />
      </div>
    </main>
  );
}

function DecisoesDock() {
  return (
    <section data-testid="decisoes" style={box}>
      <h2 style={{ fontFamily: CINZEL, fontSize: 16, margin: "0 0 8px", color: COLORS.turn }}>Decisões necessárias</h2>
      <p style={{ margin: "0 0 6px", fontSize: 13 }}>
        <b>DEC-14 · Dock.</b> Qual casca para a mão? (bloqueia P09). Sugestão minha, sem compromisso:{" "}
        <b>Mesa</b> se o custo importa, <b>Cavalete</b> se o objeto precisa &quot;vender&quot; a identidade.
      </p>
      <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 12.5, lineHeight: 1.5, color: "#d8cdb8" }}>
        <li>
          <b>Cavalete.</b> Maior identidade e leitura imediata (trilho = &quot;minhas peças&quot;). Custo: um objeto novo
          com 2 camadas (fundo e frente) para a carta ficar &quot;dentro&quot;; as plaquetas de nome ficam no latão.
        </li>
        <li>
          <b>Mesa.</b> Mais barata e mais integrada: só a textura de madeira que a borda já precisa. Risco: a mão perde
          contraste com a madeira e fica mais fácil esbarrar nas fichas; precisa de sombra dura sob as cartas.
        </li>
        <li>
          <b>Bandeja.</b> Boa para &quot;guardar&quot; a mão e dá moldura natural, mas é o mais parecido com um painel
          (caixa fechada); é o que mais ocupa largura e precisa de couro e costura novos.
        </li>
      </ul>
      <p style={{ margin: "0 0 4px", fontSize: 13 }}>
        <b>Sub-decisões deste mockup (propostas, ainda sem número no registro):</b>
      </p>
      <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.5, color: "#d8cdb8" }}>
        <li>Ações básicas como <b>fichas redondas</b> com plaqueta (aqui) ou manter o selo retangular do <code>ActionSeal</code>?</li>
        <li>Reações no <b>centro, sob a jogada</b> (aqui) em vez de no canto direito do dock: aprovado?</li>
        <li>
          1920×1080 aqui é o <b>mesmo desenho em 1,5×</b> (pixels desiguais em escala não inteira). Reflow nativo ou
          escala em degraus? Liga com DEC-13.
        </li>
        <li>
          O ícone de <b>Contestar</b> (ponto de exclamação) foi desenhado no mockup porque o pipeline não o tem; aprovar o
          desenho ou gerar outro.
        </li>
        <li>Mostrar os <b>3 estados</b> como aqui (zona de reação some para um &quot;fantasma&quot; em vez de desaparecer) ou ocultar a zona fora das janelas?</li>
      </ol>
    </section>
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
const box: CSSProperties = {
  maxWidth: 1100,
  margin: "0 0 14px",
  padding: "12px 16px",
  background: "#241c14",
  border: `2px solid ${COLORS.gold}`,
};
const chip = (on: boolean): CSSProperties => ({
  padding: "6px 12px",
  fontSize: 13,
  textDecoration: "none",
  color: on ? "#1a1a2e" : COLORS.text,
  background: on ? COLORS.gold : "#2b2236",
  border: `2px solid ${on ? COLORS.gold : "#4a3d5c"}`,
});
