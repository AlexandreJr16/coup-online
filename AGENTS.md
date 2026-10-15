# Coup Online — Contexto do Projeto

## O que é
Versão online (não-oficial, tema/nomes adaptados) do jogo de blefe Coup,
para jogar com amigos via navegador. 2-6 jogadores por sala.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS para estilo
- Socket.IO para comunicação real-time (servidor customizado)

## Regra arquitetural inegociável
O SERVIDOR é a única fonte da verdade do estado do jogo.
- Toda lógica de regras (jogadas válidas, revelar carta, resolver desafio
  de blefe, eliminar jogador) roda no servidor, nunca no cliente.
- O cliente NUNCA recebe as cartas dos outros jogadores — nem em payloads
  "escondidos" no JSON. O servidor filtra o que cada socket recebe.
- Cada partida é uma "room" do Socket.IO, isolada das demais.

## Decisões de Arquitetura Conscientes
- Estado em memória pura (sem banco de dados): escala de 2-6 jogadores não justifica DB.
  Se o servidor reiniciar, a partida é perdida — isso é aceitável.
- Sem autenticação: jogador é identificado pelo socket.id + nome digitado.
- Sem clean architecture / camadas formais: separação mínima funcional
  (lógica de jogo em lib/, transporte em server.ts, UI em components/).
  Não criar abstrações antes de precisar delas.
- Testes: a engine (`src/lib/game/engine.ts`) tem testes com `node:test`
  (`npm test`). Mudança de regra = TDD (teste falhando primeiro). UI e
  transporte seguem com validação manual via duas abas.

## Convenções de código
- TypeScript estrito, sem `any` salvo justificativa em comentário.
- Componentes React pequenos e focados; lógica de jogo fica fora de
  componentes, em funções puras testáveis (ex: `src/lib/game/engine.ts`).
- Nomes de eventos do Socket.IO em snake_case (ex: `game_action`,
  `game_challenge`). Os eventos de lobby existentes usam o prefixo `room:`
  (`room:create`, `room:join`, `room:players`); manter por compatibilidade.
- Constantes de UI compartilhadas (paleta `COLORS`, fonte `CINZEL`) ficam em
  `src/components/game/helpers.ts`. Não redeclarar por arquivo.

## O que NÃO fazer sem perguntar
- Não adicionar autenticação/login — o jogo é "entra pelo link, escolhe nome".
- Não instalar dependências novas sem avisar.
- Não fazer commit automático sem eu revisar o diff antes.
- Ao finalizar cada entrega distinta (engine, wiring, UI), 
  fazer commit com mensagem descritiva antes de seguir.

## Regras do jogo
Para regras completas, mecânicas e timers, veja `game-rules.md`.
Toda lógica de jogo implementada deve ser fiel a esse documento.

## Direção do projeto
Tema Brasil Império (arte pixel art, áudio, efeitos estilo Balatro) e trilha
de fluidez (passar, timeouts, reconexão). Plano executável com critérios de
pronto por fase em `docs/ROADMAP.md`; visão criativa em
`docs/DIRECAO_CRIATIVA.md`; áudio em `docs/AUDIO.md`. Tag `v1` = jogo antes
dessa direção.
