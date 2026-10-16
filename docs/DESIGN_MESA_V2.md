# Mesa v2 — redesign da interação

> Status: **proposta aprovada em conversa (2026-10-15)**, ainda sem código. Nasceu do playtest
> da Fase 3: a arte agradou, a interface não. Entra no ROADMAP como Fase 4 revisada.

## Princípios
1. **Mostrar, não dizer.** O estado do jogo acontece na mesa (carta que sobe, moeda que voa, anel de tempo), não em banners de texto.
2. **Toda ação é uma imagem + uma palavra.** Nada de botão só com texto. Cor = significado, forma fixa, lugar fixo.
3. **Um lugar para cada coisa.** Sem sobreposição: nada cobre avatar, carta ou botão. Nenhum modal bloqueia a mesa.
4. **Tudo tem peso.** Carta, moeda e selo têm animação de baralho de verdade (dar, comprar, jogar, virar).
5. **Mesma linguagem no site inteiro:** menu, lobby, mesa e botões usam papel, lacre, ouro e Cinzel.
6. **Fluidez antes de enfeite.** Efeito nunca bloqueia clique (regra do DESIGN.md).

## Decisões
- **Só modo mão** (o modo de botões sai).
- **As 5 cartas continuam visíveis** na mão por causa do blefe. As que você tem são destacadas; as outras ficam marcadas como blefe.
- **Ações básicas em botões fixos** (Renda, Ajuda Externa, Golpe), sempre no mesmo lugar.
- **Poderes dos personagens** ativados pela carta (clicar ou arrastar).

## Selos de ação (os "botões")
Cada ação é um **selo** pixel art: moldura de lacre/papel, ícone grande, nome curto e custo/ganho em moedas.

| Ação | Ícone | Cor da moldura | Efeito mostrado |
|---|---|---|---|
| Renda | uma moeda de ouro | ouro | `+1` |
| Ajuda Externa | saquinho derramando 2 moedas | ouro | `+2` (pode ser bloqueada) |
| Golpe de Estado | canhão disparando | vermelho escuro | `−7`, alvo perde carta |
| Taxas (Barão) | livro-caixa, pena e moedas | verde-imperial | `+3` |
| Assassinar (Capoeira) | navalha com gota vermelha | preto/vermelho | `−3`, alvo perde carta |
| Extorquir (Coronel) | bolsa de moedas sendo puxada | azul-marinho | rouba até 2 |
| Trocar (Regatão) | duas cartas trocando de lugar | verde-água | troca 0–2 cartas |
| Contestar | dedo apontando + "!" | vermelho | "mentiroso!" |
| Bloquear | escudo redondo | prata | bloqueia a jogada |
| Passar | leque dobrado | cinza | libera a mesa |

### Estados do selo (todos privados, só você vê)
- **Verdadeiro** (você tem a carta): moldura dourada com brilho de vela.
- **Blefe** (você não tem): uma **máscara de baile** pendurada no canto do selo, moldura mais escura. Não impede de usar: é aviso, não punição.
- **Sem moedas:** selo apagado com um **cadeado** e o custo em vermelho.
- **Obrigatório** (10+ moedas): só o Golpe aceso, os outros acorrentados.
- **Pré-visualização ao passar o mouse:** moedas fantasmas mostram o efeito (`+3` subindo do Erário), e o alvo possível se ilumina. Sem tooltip de texto.

## Layout (uma zona para cada coisa)
```
┌────────────────────────────────────────────────────────┐
│ [sala/sair]                               [intrigas ▸] │  topo: só menus
│            ( retrato )  ( retrato )                    │  oponentes: retrato em moldura,
│              moedas      moedas                        │  moedas e cartas ao lado
│                                                        │
│        [ baralho ]   JOGADA NA MESA   [ Erário ]       │  centro: carta jogada + anel de tempo
│                                                        │
│  (retrato) cartas       ┌──────── mão ────────┐        │
│  moedas                 │ Barão Capoeira ...  │        │  mão: 5 cartas (blefe marcado)
│                         └─────────────────────┘        │
│  [Renda] [Ajuda] [Golpe]      ← selos fixos →          │  barra fixa embaixo
└────────────────────────────────────────────────────────┘
```
Reações (Contestar/Bloquear/Passar) aparecem como selos perto da sua mão, não em modal.

## Animações (baralho de verdade)
- **Início:** o baralho no centro distribui 2 cartas a cada jogador.
- **Declarar:** a carta sobe da mão, desliza pro centro virada, ganha o lacre da ação e um **anel de tempo** em volta.
- **Moedas:** voam do Erário para a pilha do jogador (e vice-versa); as pilhas crescem de verdade.
- **Trocar:** 2 cartas voam do baralho, as escolhidas voltam.
- **Contestar:** a carta vira com tremor de tela e selo de cera estampando; veredito no centro.
- **Perder influência:** a carta vira e desliza para uma pilha de descarte ao lado do jogador (visível).
- **Turno:** brilho de lampião no assento ativo; os demais escurecem de leve.
- **Passou:** ✔ no retrato de quem passou.

## Rapidez
Atalhos (`Espaço` passar, `C` contestar, `B` bloquear), **passar automático** opcional para jogadas que não te afetam, e janela que nem abre quando você não tem reação possível.

## Pessoas e clima
- Avatares viram **retratos pixel art** de convidados do baile (conjunto próprio, mesmo pipeline).
- **Falas** estilo Undertale: balão curto com o bordão do personagem ao declarar.
- Fim de partida com **prêmios** ("Mentiroso do ano", "Maior desconfiado").
- Mesa: sair da elipse verde vazia para veludo imperial com bordado (ou o próprio salão como mesa).

## Assets a gerar (pipeline `tools/art`)
Ícones de ação (10) + máscara + cadeado, moeda e pilhas, saco de moedas, baralho/pilha de cartas, veludo/bordado da mesa, moldura de retrato, conjunto de avatares (~12), balão de fala.
Ícones primeiro (`tools/art/prompts/icones.json`).

## Em aberto
- Mobile conta? (decide se a tela é pensada de pé.)
- Arrastar e clicar funcionando juntos (sugerido).
