# DESIGN.md — Coup Online UI

## Filosofia
UI que dá vontade de jogar. Limpa, sem poluição visual, intuitiva
sem precisar ler manual. Referências: Codenames (clareza), Poker
online (layout de mesa), Pokémon TCG (interação com carta).

## Layout Principal — Mesa de Poker

Vista aérea (top-down), mesa circular centralizada na tela.
Jogadores distribuídos em volta da mesa em arco, posicionados
dinamicamente conforme quantidade (2–6 jogadores).

Cada jogador na mesa:
- Avatar circular com iniciais do nome em cor única por jogador
- Nome abaixo do avatar
- Contador de moedas visível
- Cartas face-down empilhadas ao lado (quantidade indica influências restantes)
- Cartas reveladas (perdidas) viradas para cima, visivelmente distintas
- Jogador eliminado: avatar acinzentado/riscado

O jogador local (você) fica sempre na posição inferior central —
mesmo padrão do poker online.

Indicador de turno: borda luminosa no avatar de quem está jogando.

## Modos de Interação (A/B — modularizados)

O componente `GameBoard` recebe `interactionMode: 'buttons' | 'hand'`
e renderiza `ActionBar` ou `HandView`. Trocar é mudar uma prop.
Futuramente vira opção configurável na sala.

### Modo A — ActionBar (Botões)

Barra de ações na parte inferior da tela, visível só no seu turno.

Categorias de botão por cor:

**Dourado/Âmbar** — ações de moeda (renda, ajuda externa, taxas):
- Botão principal abre sub-ações: +1 / +2 / +3 moedas
- Sub-botão de +3 (Taxas) aparece com indicador sutil de blefe
  se você não tiver Duque na mão (visível só pra você)

**Vermelho escuro** — ações agressivas (Assassinar, Extorquir):
- Ao clicar, abre seletor de alvo (highlight nos avatares dos outros jogadores)
- Indicador de blefe se não tiver o personagem correspondente

**Preto/Cinza escuro** — Golpe de Estado:
- Só aparece ativo quando você tem ≥7 moedas
- Obrigatório (único botão ativo) quando ≥10 moedas

**Neutro** — Trocar (Embaixador): botão separado

Botões de reação (bloquear/contestar) aparecem como overlay
durante a janela de reação, com timer visual regressivo.

### Modo B — HandView (Cartas)

Suas cartas aparecem em destaque na parte inferior, como uma
mão segurando cartas (estilo Pokémon TCG).

- Cartas que você TEM: visíveis, cores vivas
- Cartas que você NÃO TEM mas pode blefar: escurecidas/dessaturadas
- Clicar numa carta: zoom + aparecem as ações disponíveis daquele
  personagem como botões ao redor da carta
- Indicador de blefe: a carta escurecida tem um ícone sutil
  (ex: máscara) quando você está prestes a usá-la

## Indicador de Blefe

Visível SOMENTE pro jogador local, nunca transmitido via Socket.IO.
Calculado no cliente comparando a ação escolhida com `myCards`
(as cartas do `viewForPlayer`).
Não é um aviso intrusivo — é sutil (borda diferente, ícone pequeno).
Objetivo: feedback de auto-consciência, não punição.

## Tipografia e Cores

Fundo: cor sólida escura (tom de feltro/mesa de jogo) — futuramente
substituível por cenário de castelo.
Mesa: círculo/elipse com textura sutil, tom mais claro que o fundo.
Fonte: sem serifa, legível, peso médio. Nada de fontes decorativas.
Paleta base:
- Fundo: #1a1a2e ou similar (azul-escuro/preto)
- Mesa: #2d5a27 (verde feltro) ou variação neutra
- Dourado: #f0a500
- Vermelho: #c0392b
- Texto: #f0f0f0

## Avatares

Iniciais do nome (1–2 letras) em círculo colorido.
Cor do círculo: gerada deterministicamente do nome (hash → hue)
para que o mesmo jogador sempre tenha a mesma cor na sala.
Futuro: upload de imagem ou seleção de personagem do Coup.

## Estados Visuais por Fase

| Fase do jogo              | O que aparece na tela                              |
|---------------------------|----------------------------------------------------|
| aguardando_jogadores      | Lobby: lista de jogadores + link compartilhável    |
| aguardando_acao (seu turno)| ActionBar ou HandView ativos                      |
| aguardando_acao (outro)   | Controles desabilitados, indicador no avatar deles |
| janela_reacao_*           | Overlay com botões Bloquear/Contestar + timer      |
| aguardando_revelacao      | Suas cartas em destaque, deve escolher qual revelar|
| fim_de_jogo               | Tela de vitória com nome do vencedor               |

## O que NÃO fazer

- Não usar animações pesadas que atrasam a percepção de turno
- Não esconder o timer — sempre visível durante janelas de reação
- Não poluir a mesa com informação redundante
- Não implementar avatares com imagem agora — placeholder de iniciais é suficiente
- Não escolher biblioteca de componentes UI genérica (MUI, Chakra etc) —
  o visual tem que parecer um jogo, não um dashboard
