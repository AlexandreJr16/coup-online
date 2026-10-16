@AGENTS.md

## Política de testes (obrigatória)

**Tudo é testado, em três níveis, e nada vai para commit sem os três cobrindo o que mudou.**

1. **Unitários** (`node:test`, rápidos): engine e toda lógica pura (`src/lib/game/*`, `helpers.ts`, derivação de eventos, store de salas). Mudou regra de jogo = TDD: teste falhando primeiro.
2. **Integração**: servidor Socket.IO real, em memória e sem Next (`attachGameSocket`), com clientes `socket.io-client`. Cobre sala, reconexão, timers, passar, revanche, contestação pública e o filtro de cartas por socket.
3. **E2E no navegador**: Chrome headless via DevTools Protocol contra o **build de produção**. Abre as páginas de verdade, **clica** (carta, mira, passar, revelar) e **falha em qualquer `console.error` ou exceção**. Typecheck, lint e build NÃO substituem isto: é o único nível que pega erro de runtime no cliente.

### Testes retroativos
- Ao **tocar em código que não tem teste**, escreva os testes dele na mesma entrega, mesmo que a mudança não seja sua. Não deixe dívida de teste para trás.
- **Todo bug corrigido ganha teste de regressão** que falha antes da correção e passa depois (cite o bug no nome do teste).
- Componente de UI novo: pelo menos um cenário E2E que o exercita no navegador e uma página de revisão em `/dev/*` quando houver visual.

### Definição de pronto (antes de commitar)
`npm test` (unitário + integração) e `npm run test:e2e` verdes, mais `npx tsc --noEmit`, `npx eslint .` e `npm run build`. Não diga que algo "funciona" sem tê-lo exercitado no navegador.

### Ambiente de testes
- **Nunca** `kill` por porta: a 3000 pode ser o `npm run dev` do Alexandre. Testes sobem o próprio servidor numa porta livre (a partir de 3100) e o encerram ao fim.
- O Next permite só **um** `next dev` por pasta; por isso o E2E de navegador usa o build de produção (`npm run build` antes).
- Evite editar arquivos em massa enquanto o dev server do Alexandre está aberto sem avisar: aba aberta + HMR parcial gera erros transitórios (`is not a function`). Peça reload forçado se ele relatar isso.
