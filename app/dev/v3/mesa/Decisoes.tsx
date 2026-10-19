// Caixa "Decisões necessárias" no topo da página: o Alexandre decide olhando o mockup logo abaixo.
// Cada decisão aponta onde olhar. Números de DEC seguem docs/plano/00-DECISOES.md.

interface Decisao {
  id: string;
  titulo: string;
  olhar: string;
  opcoes: string[];
  recomendacao: string;
}

const DECISOES: Decisao[] = [
  {
    id: "DEC-13",
    titulo: "Escala da tela",
    olhar: "Troque 1280 e 1920 no topo e veja a régua no fim da página: assentos, cartas e sprites crescem juntos com --u.",
    opcoes: [
      "A · contínua (escala suave por CSS)",
      "B · degraus inteiros: u = 1 (1280), 1,5 (1920), 2 (2560)",
    ],
    recomendacao: "B. Atenção: o 1,5x do retrato e das cartas (arquivos fixos) não é inteiro; os sprites em código são.",
  },
  {
    id: "DEC-15",
    titulo: "Texto de status",
    olhar: "Cabeçalho sem texto de status; a legenda de uma linha está no centro da mesa, com a ampulheta.",
    opcoes: ["A · só assento e balão (sem legenda)", "B · A + legenda curta no centro"],
    recomendacao: "B. O centro vazio ganha função e o cabeçalho fica só com HUD.",
  },
  {
    id: "DEC-21",
    titulo: "Imagens no lugar de número",
    olhar: "Decida cada item: baralho por faixa (G8), Erário com baú (G9), dígitos do relógio em sprite (G11) e medalhão da vez em sprite (G11).",
    opcoes: [
      "Baralho da Corte por faixa: aprovar / cortar",
      "Erário com montes e baú: aprovar / cortar",
      "Dígitos em sprite sobre o anel: aprovar / cortar",
      "Medalhão da vez em sprite: aprovar / cortar",
    ],
    recomendacao: "Só o que for aprovado aqui vira subplano; o resto fica no backlog.",
  },
  {
    id: "DEC-22",
    titulo: "Aparência de 0 fichas",
    olhar: "Folha 'DEC-22' (e a ficha apagada ao lado do número).",
    opcoes: ["A · sem sprite (só o número 0)", "B · ficha apagada"],
    recomendacao: "Decidir no mockup. B mantém o lugar da pilha ocupado, A deixa a mesa mais limpa.",
  },
  {
    id: "DEC-24",
    titulo: "Variante das fichas",
    olhar: "Folha 'DEC-24': três linhas com as mesmas quantidades de 1 a 10.",
    opcoes: [
      "Hash fixo de (jogador, quantidade): sem piscar",
      "Troca de variante a cada mudança de quantidade",
    ],
    recomendacao: "Hash fixo; a alternativa está na linha 3 para comparar.",
  },
  {
    id: "DEC-05",
    titulo: "Selos de ameaça ligados?",
    olhar: "Caio tem 8 moedas (canhãozinho). A folha 'Estados do assento' mostra o alvo vermelho pulsante (10+).",
    opcoes: ["Ligados e discretos (máx. 24 px)", "Desligados"],
    recomendacao: "Ligados e discretos: é informação pública e ajuda a decidir quem atacar.",
  },
];

export default function Decisoes() {
  return (
    <section className="m3-decisoes" data-testid="decisoes-necessarias" aria-labelledby="m3-decisoes-titulo">
      <h2 id="m3-decisoes-titulo">Decisões necessárias</h2>
      <p className="m3-nota">Olhe o palco e as folhas abaixo; cada cartão diz onde olhar e qual a recomendação.</p>
      <div className="m3-decisoes-grade">
        {DECISOES.map((d) => (
          <article key={d.id} className="m3-decisao" data-testid={`decisao-${d.id}`}>
            <header>
              <span className="m3-decisao-id">{d.id}</span>
              <h3>{d.titulo}</h3>
            </header>
            <p className="m3-decisao-olhar">{d.olhar}</p>
            <ul>
              {d.opcoes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            <p className="m3-decisao-rec">
              <b>Recomendação:</b> {d.recomendacao}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
