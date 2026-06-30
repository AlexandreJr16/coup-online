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

## Convenções de código
- TypeScript estrito, sem `any` salvo justificativa em comentário.
- Componentes React pequenos e focados; lógica de jogo fica fora de
  componentes, em funções puras testáveis (ex: `lib/game/rules.ts`).
- Nomes de eventos do Socket.IO em snake_case (ex: `player_join`,
  `action_taxar`, `challenge_resolved`).

## O que NÃO fazer sem perguntar
- Não adicionar autenticação/login — o jogo é "entra pelo link, escolhe nome".
- Não instalar dependências novas sem avisar.
- Não fazer commit automático sem eu revisar o diff antes.
