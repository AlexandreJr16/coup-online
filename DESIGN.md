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

## Interação (Mesa v2 — só modo mão)
O modo de botões (A) foi removido. Detalhes e plano em `docs/DESIGN_MESA_V2.md`.

**Dock fixo embaixo, três zonas que nunca mudam de lugar:**
- **Esquerda — ações básicas** (Renda, Ajuda Externa, Golpe de Estado): botões fixos; apagam fora da sua vez ou sem moedas.
- **Centro — a mão:** as 5 cartas em leque (por causa do blefe). As que você TEM em cor cheia com borda dourada; as outras dessaturadas com 🎭. **Clicar numa carta usa o poder dela**; poderes com alvo "armam" a carta (ela levanta) e os alvos possíveis ganham mira pulsando — clique no assento (Esc cancela). Na hora de revelar ou trocar, o centro mostra só as cartas que importam, pulsando.
- **Direita — reações:** Contestar / Bloquear / Passar. Sempre ali; vazia quando não há o que reagir.

**Estado na própria mesa, sem banners de texto:** brilho no assento da vez (os outros escurecem de leve), mira nos alvos, ✔ em quem passou, pulso dourado em quem a mesa espera, placa da jogada no centro com a barra de tempo (informativa, não bloqueia).

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
Fonte: corpo em sans legível (Geist, peso médio). Cinzel (serifada
gravada) só em títulos, marca, nomes de carta e selo — nunca em texto corrido.
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
| (sem partida iniciada)    | Lobby da sala: jogadores + link; host usa game_start |
| aguardando_acao (seu turno)| Ações básicas e mão ativas                          |
| aguardando_acao (outro)   | Controles desabilitados, indicador no avatar deles |
| janela_reacao_*           | Placa da jogada no centro + bandeja de reação (dock) |
| aguardando_revelacao      | Só suas cartas ocultas pulsando no dock; clicar revela |
| fim_de_jogo               | Tela de vitória com nome do vencedor               |

## O que NÃO fazer

- Não usar animações pesadas que atrasam a percepção de turno
- Não esconder o timer — sempre visível (pílula no turno/escolhas, barra na placa nas janelas)
- Não poluir a mesa com informação redundante
- Avatares com imagem: hoje só iniciais; pixel art de avatar entra na Fase 7
  do `docs/ROADMAP.md`
- Não escolher biblioteca de componentes UI genérica (MUI, Chakra etc) —
  o visual tem que parecer um jogo, não um dashboard

## Cartas — Visual

Cada personagem tem identidade visual própria via cor + ícone + nome.
Estado atual: CSS puro + emoji. A arte em pixel art entra na Fase 3 do
`docs/ROADMAP.md`, com o emoji mantido como fallback quando faltar imagem.

| Personagem (id)            | Fundo atrás do retrato | Retrato |
|----------------------------|------------------------|---------|
| Barão do Café (duque)      | #1f3a2a esmeralda      | pixel art |
| Capoeira (assassino)       | #1a1a1a                | pixel art |
| Coronel (capitao)          | #1a2a4a azul-marinho   | pixel art |
| Regatão (embaixador)       | #1d4e5f verde-água     | pixel art |
| Benzedeira (condessa)      | #5c1620 vinho          | pixel art |

Retratos 88×124 (carta `lg`) e 40×56 (`sm`) em `public/art/<tema>/<id>/`, paleta mestra
de 38 cores. Sem arquivo, a carta usa o emoji do catálogo (`cards.ts`).
Carta face-down: verso em pixel art (`verso.png`, esmeralda e ouro com coroa imperial); sem arquivo, #2c3e50 com borda dourada sutil.
Carta revelada (perdida): dessaturada, opacidade 50%, ícone ❌.
Carta no HandView:
- Que você TEM: cor cheia, borda brilhante
- Que você pode BLEFAR: cor dessaturada + ícone 🎭 no canto

## Direção futura (Brasil Império)

Os personagens, a paleta pixel art de 32 cores, o estilo (Balatro + Undertale +
Stardew) e as regras de efeito/áudio estão em `docs/DIRECAO_CRIATIVA.md`,
`docs/AUDIO.md` e `docs/ROADMAP.md`. Este arquivo descreve o estado atual da UI;
quando uma fase do roadmap for entregue, atualizar aqui.

Regra que continua valendo: efeito nunca bloqueia input nem atrasa a percepção
do turno.
