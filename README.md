# Coup Online

Réplica **não-oficial** e **experimental** do jogo de blefe **Coup**, jogável no
navegador com amigos (2–6 jogadores por sala, em tempo real).

> ⚠️ **Este é, antes de tudo, um projeto de aprendizado.**
> O objetivo principal foi **explorar como construir software com auxílio de IA**
> (planejamento, implementação e revisão assistidos por um agente de código) —
> usando uma **réplica de teste do Coup** como caso prático. Não é um produto
> final nem tem fins comerciais.

## Aviso legal

Coup é um jogo de Rikki Tahta (La Mame Games / Funbox no Brasil). Este repositório
é um **fan project sem afiliação oficial**, com tema e nomes adaptados, feito para
estudo. Não se destina a uso comercial. Se você curtiu o jogo, compre a versão
oficial. 🙂

## O que é

- Versão online do Coup para jogar via link de sala — entra, escolhe um nome, joga.
- Toda a lógica de regras roda no **servidor** (fonte única da verdade).
- Cada partida é uma sala isolada via Socket.IO.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Socket.IO** (servidor customizado em `server.ts`) para tempo real
- **Tailwind v4** + estilos inline (sem biblioteca de componentes — o visual tem
  que parecer um jogo, não um dashboard)
- **next/font** (Geist para corpo, **Cinzel** para o tema de corte renascentista)

## Regra arquitetural inegociável

O **servidor é a única fonte da verdade** do estado do jogo:

- Regras (jogadas válidas, revelar carta, resolver contestação/blefe, eliminar
  jogador) rodam **só no servidor**.
- O cliente **nunca** recebe as cartas ocultas dos outros jogadores — nem
  escondidas no JSON. O servidor envia uma *view filtrada* por socket
  (`viewForPlayer`).
- Indicadores client-side (ex.: "blefe", Feed de Intrigas, animação de moeda) são
  **derivados apenas do que a view já expõe** — nada novo trafega pelo socket.

Decisões conscientes: estado **em memória** (sem banco — reiniciar o servidor
perde a partida, e tudo bem), **sem autenticação** (jogador = socket.id + nome),
separação mínima funcional (lógica em `lib/`, transporte em `server.ts`, UI em
`components/`).

## Como rodar

```bash
npm install
npm run dev          # sobe o servidor (Socket.IO + Next) em http://localhost:3000
```

Abra `http://localhost:3000`, **crie uma sala** numa aba e **entre com o código**
em outra aba (ou compartilhe o link com amigos). Com 2+ jogadores, o host inicia.

### Scripts

| Comando         | O que faz                                              |
|-----------------|--------------------------------------------------------|
| `npm run dev`   | Servidor de desenvolvimento (`tsx server.ts`)          |
| `npm run build` | Build de produção do Next                              |
| `npm start`     | Sobe em modo produção                                  |
| `npm run lint`  | ESLint                                                  |
| `npm test`      | Testes da engine de regras (`src/lib/game/engine.test.ts`) |

## Estrutura

```
app/                      # rotas (menu, sala) + layout + estilos globais
server.ts                 # servidor Socket.IO (transporte)
src/
  lib/game/
    engine.ts             # engine de regras (fonte da verdade)  ← testada
    engine.test.ts        # testes da engine (TDD)
    deck.ts               # Baralho da Corte (25 cartas)
    cards.ts              # catálogo de cartas (nome/cor/ícone/ação/bloqueios)
  lib/socket.ts           # cliente Socket.IO
  server/rooms.ts         # salas em memória
  types/                  # tipos de domínio e de socket
  components/game/        # UI (mesa, cartas, modos A/B, gamificação)
```

## UI / UX

- **Mesa estilo poker** (top-down): você sempre embaixo-centro; avatares com
  iniciais e cor determinística; avatar do turno **pulsa**.
- **Cartas em CSS puro** (sem imagem): cor + ícone por personagem, vinda de
  `cards.ts` (regra: nenhum dado de carta hard-coded em componente).
- **Cartas dos oponentes estilo UNO**: versos visíveis; ao perder influência, a
  carta faz **flip 3D** e fica face-up dessaturada.
- **Dois modos de interação (A/B)**, alternáveis por um botão na tela:
  - **A — ActionBar**: barra de botões por categoria de ação.
  - **B — HandView**: suas cartas em leque (estilo Pokémon TCG).
- **Janela de reação** com timer regressivo (bloquear/contestar).
- **Gamificação visual** (tudo derivado do estado, client-side):
  - **Feed de Intrigas** — log em pergaminho de quem declarou/bloqueou/perdeu o quê.
  - **Selo de cera** — estampa dramática em bloqueios e contestações.
  - **Economia viva** — count-up de moedas, "+N/−N" no avatar, Tesouro Central.

## Regras do jogo

As regras completas (ações, bloqueios, contestações, timers, casos especiais como
o "Perigo Duplo do Assassino") estão em [`game-rules.md`](./game-rules.md). A engine
implementada é fiel a esse documento.

## Sobre o desenvolvimento assistido por IA

O código foi construído em conjunto com um agente de IA (**Claude Code**), seguindo
um fluxo deliberado:

1. **Plano antes de implementar** — cada entrega começa por um plano aprovado.
2. **Implementação incremental** com **commits por componente** (histórico legível).
3. **Verificação** a cada passo: `tsc`, `lint`, testes da engine, smoke test.
4. **Limites claros de escopo** documentados em [`AGENTS.md`](./AGENTS.md) (ex.: a
   UI não toca na engine; servidor é a fonte da verdade).

Documentos de apoio que guiaram o trabalho:
- [`AGENTS.md`](./AGENTS.md) — contexto, stack e regras inegociáveis do projeto.
- [`DESIGN.md`](./DESIGN.md) — direção de UI/UX e identidade visual das cartas.
- [`game-rules.md`](./game-rules.md) — regras do Coup (base da engine).

## Status e limitações

Protótipo de estudo — funcional, mas com cantos não acabados de propósito:

- Sem banco de dados: partidas vivem em memória (reinício = partida perdida).
- Sem login/autenticação.
- Testes automatizados cobrem a **engine**; a UI é validada manualmente (duas abas).
- Foco em aprendizado, não em escala ou produção.
