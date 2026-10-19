// Mockup P03.S1: kit de UI pixel, escolha de fonte e HUD do cabeçalho.
// Página 100% estática (sem socket, sem fetch). Query: ?res=1280|1920|ambos
// &fonte=pixelify|silkscreen|vt323|press &estilo=A|B (todas opcionais).
import type { Metadata } from "next";
import Link from "next/link";
import { FONTES_PIXEL, fonteDe } from "./fontes";
import { FontesSecao, HudSecao, KitSecao, PaletaSecao, type Estilo, type Resolucao } from "./secoes";
import { PALETA_VARS } from "./paleta";
import s from "./kit.module.css";

export const metadata: Metadata = { title: "Kit de UI pixel (mockup)" };

type Busca = Promise<Record<string, string | string[] | undefined>>;

function um(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

interface Params {
  res: Resolucao;
  fonte: string;
  estilo: Estilo;
}

function href(p: Params): string {
  const q = new URLSearchParams({ res: p.res, fonte: p.fonte, estilo: p.estilo });
  return `/dev/v3/kit?${q.toString()}`;
}

function Opcoes({
  rotulo,
  itens,
}: {
  rotulo: string;
  itens: ReadonlyArray<{ texto: string; destino: string; ativo: boolean; id: string }>;
}) {
  return (
    <div className={s.opcoes}>
      <span className={s.opcoesRotulo}>{rotulo}</span>
      {itens.map((i) => (
        <Link
          key={i.id}
          href={i.destino}
          className={`${s.opcao} ${i.ativo ? s.opcaoAtiva : ""}`}
          aria-current={i.ativo ? "true" : undefined}
          data-testid={`opcao-${i.id}`}
        >
          {i.texto}
        </Link>
      ))}
    </div>
  );
}

export default async function KitPage({ searchParams }: { searchParams: Busca }) {
  const q = await searchParams;
  const resParam = um(q.res);
  const res: Resolucao = resParam === "1920" || resParam === "ambos" ? resParam : "1280";
  const estilo: Estilo = um(q.estilo) === "B" ? "B" : "A";
  const fonte = fonteDe(um(q.fonte));
  const atual: Params = { res, fonte: fonte.id, estilo };

  return (
    <main className={s.pagina} style={PALETA_VARS} data-testid="kit-pagina">
      <div className={s.miolo}>
        <header className={s.topo}>
          <div>
            <h1 className={s.titulo}>Kit de UI pixel (P03.S1, mockup)</h1>
            <p className={s.sub}>
              Uma linguagem só: pixel art, sem gradiente liso, sem glow, sem pílulas, sem emoji do sistema. Página
              estática de revisão, nada aqui é o jogo.
            </p>
          </div>
          <nav aria-label="Opções do mockup" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Opcoes
              rotulo="Resolução do HUD:"
              itens={(["1280", "1920", "ambos"] as const).map((r) => ({
                id: `res-${r}`,
                texto: r === "ambos" ? "ambos" : `${r}x${r === "1280" ? 720 : 1080}`,
                destino: href({ ...atual, res: r }),
                ativo: res === r,
              }))}
            />
            <Opcoes
              rotulo="Fonte do kit e do HUD:"
              itens={FONTES_PIXEL.map((f) => ({
                id: `fonte-${f.id}`,
                texto: f.nome,
                destino: href({ ...atual, fonte: f.id }),
                ativo: f.id === fonte.id,
              }))}
            />
            <Opcoes
              rotulo="Estilo do HUD:"
              itens={(["A", "B"] as const).map((e) => ({
                id: `estilo-${e}`,
                texto: `Estilo ${e}`,
                destino: href({ ...atual, estilo: e }),
                ativo: estilo === e,
              }))}
            />
          </nav>
        </header>

        <aside className={s.caixaDecisoes} data-testid="decisoes" aria-labelledby="decisoes-titulo">
          <h2 id="decisoes-titulo">Decisões necessárias</h2>
          <ol>
            <li data-testid="decisao-dec-11">
              <strong>DEC-11, fonte de interface:</strong> Pixelify Sans, Silkscreen, VT323 ou Press Start 2P.
              Compare na seção 1 a legibilidade em 14 px, os acentos pt-BR (Barão, Café, Ação, Você) e os símbolos
              que o jogo usa (· → −). Veja também o HUD e o kit em cada uma com os botões acima.
            </li>
            <li data-testid="decisao-dec-12">
              <strong>DEC-12, corpo de texto:</strong> a mesma fonte pixel em tudo, ou pixel só em títulos e
              botões e uma sans legível (Geist, no último cartão) só para texto longo, como a colinha. O
              parágrafo de regra de 3 linhas na seção 1 é o teste.
            </li>
            <li data-testid="decisao-estilo">
              <strong>Estilo do kit, A ou B:</strong> A é madeira da mesa e latão (casa com o dock de madeira); B é
              pergaminho e tinta (casa com a colinha e a vitória). Seção 2, lado a lado.
            </li>
          </ol>
          <p className={s.nota}>
            Como responder: &quot;DEC-11 = X, DEC-12 = Y, kit = A ou B&quot;. Depois da aprovação o escopo
            congela (mudança vira backlog pós-v3).
          </p>
        </aside>

        <FontesSecao />
        <PaletaSecao />
        <KitSecao fonte={fonte} />
        <HudSecao resolucao={res} estilo={estilo} fonte={fonte} />
      </div>
    </main>
  );
}
