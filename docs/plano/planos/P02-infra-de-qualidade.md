# P02 Infra de qualidade

> Programa **0 Fundação** · Onda **0** · Risco **médio** (o S3 é **alto**: é o que garante que não vaza informação) · Estado: `[ ]`

**Objetivo:** dar aos verificadores as ferramentas: script `check`, fixtures de `GameView`, harness do teste de propriedade de vazamento (16.3) e checagem de cobertura do rastreio.

- **Seções do índice:** 0, 2
- **Depende de:** P00
- **Arquivos que toca:** `package.json` (scripts `check` e `plano:check`, glob do `test`), `src/components/game/test-utils.ts` (estender), `src/components/game/fx/leak.ts` e `leak.test.ts` (novos), `tools/plano-check.ts` (novo)
- **Verificação exigida:** revisor de código nos S1, S2, S4; **chave dupla** (`revisor-de-codigo` + `auditor-de-vazamento`) no S3.
- **Reaproveita:** `makeView` e `player` em `src/components/game/test-utils.ts`; tipo `GameView` em `src/types/game.ts`.

## Fato importante sobre o dado (verificado em `src/types/game.ts`)

`GameView` entregue ao cliente contém **a mão do próprio jogador** (`players[].cards[].character` não nulo só para ele; `null` para os outros, **exceto cartas reveladas**, que têm `character` para todos) e `exchange.pool` (só para o ator da troca). Logo, a **projeção pública** que o diretor de cena recebe deve **zerar** essas duas coisas. O teste de vazamento compara a saída do diretor para duas views idênticas que diferem apenas na mão (e no `exchange.pool`) do observador.

## Subplanos

### P02.S1 Script `npm run check` `[ ]`
- **Objetivo:** um comando só para a verificação mecânica do dia a dia (sem E2E).
- **Arquivos:** `package.json`
- **Achado da revisão:** o glob atual do `npm test` é `src/**/*.test.ts` (`package.json:11`). Arquivos `*.test.tsx` e testes em `tools/` **nunca rodam**, e o verificador reportaria verde sem executar nada.
- **Tarefas:** [ ] P02.S1.T1 estender o glob do `test` para incluir `tools/**/*.test.ts` (ou manter todos os testes novos em `src/**/*.test.ts`) e **proibir `.test.tsx`** (sem jsdom no projeto); [ ] P02.S1.T2 adicionar `"check": "npm test && tsc --noEmit && eslint ."`; [ ] P02.S1.T3 regra para o `verificador-mecanico`: conferir que os **nomes dos testes novos aparecem na saída**; [ ] P02.S1.T4 documentar na Constituição (DoD).
- **Testes:** executar `npm run check` e ver a saída; sem dependência nova.
- **Pronto quando:** `npm run check` verde na branch atual, **não** invoca `test:e2e` nem `build`, e um teste-sentinela em `tools/` aparece na saída.

### P02.S2 Fixtures de `GameView` `[ ]`
- **Objetivo:** construtores para cenários repetíveis (mãos A/B, fases, `lastChallenge` verdade/blefe/bloqueio, `pending` com `passedIds`, jogador ausente, 2 a 6 jogadores).
- **Arquivos:** `src/components/game/test-utils.ts` (estender, sem quebrar `makeView`/`player`)
- **Tarefas:** [ ] P02.S2.T1 teste que fixa o contrato atual de `makeView`; [ ] P02.S2.T2 helpers `withHand(view, playerId, hand)`, `withPending(view, {...})`, `playersN(n)`; [ ] P02.S2.T3 `challengePair(preState, ...)`: gera o **par verdade/blefe pela engine** (`applyEvent` a partir do mesmo pré-estado e com `rng` fixo, pois o padrão é `Math.random`), passando por `viewForPlayer` (`engine.ts:758`) antes de `toPublicView`, de forma que os campos derivados (`mustRevealPlayerId`, `stats`, `eliminated`, auto-revelação) fiquem consistentes; [ ] P02.S2.T4 testes dos helpers.
- **Pronto quando:** os testes existentes que usam `makeView` seguem verdes e os novos helpers têm teste.

### P02.S3 Harness do teste de propriedade de vazamento `[ ]`
- **Objetivo:** infraestrutura que as Fases H usarão: dado um "observador" e uma função pura `f(viewPublica)`, provar que `f` não depende de dado oculto.
- **Arquivos:** `src/components/game/fx/leak.ts` (`toPublicView(view)`: zera a mão **não revelada** do observador e `exchange.pool`; tipo `PublicView` com brand, para o `tsc` impedir que o diretor receba o `GameView` cru), `src/components/game/fx/leak.test.ts`
- **Tarefas:**
  - [ ] P02.S3.T1 `toPublicView` com teste: nenhuma carta oculta sobrevive; `revealed: true` permanece
  - [ ] P02.S3.T2 `assertNoLeak(f, viewA, viewB)` (igualdade profunda da saída para views que diferem só no oculto)
  - [ ] P02.S3.T3 teste de mutação: uma `f` deliberadamente vazadora (lê a mão) **é reprovada** pelo harness
  - [ ] P02.S3.T4 `f` de exemplo que passa (usa só `toPublicView`)
- **Risco:** alto. **Verificadores:** `revisor-de-codigo` + `auditor-de-vazamento` (precisa tentar enganar o harness: campos que ele esqueça de zerar, ordem de chaves, `undefined` vs `null`).
- **Pronto quando:** o mutante é reprovado, o exemplo é aprovado, e o auditor não consegue fazer um vazamento passar.

### P02.S4 Script de cobertura do rastreio e dos ciclos `[ ]`
- **Objetivo:** automatizar o que hoje foi checado uma vez: todo ID do índice aparece uma vez em `00-RASTREIO.md`; o grafo de dependências do `00-MESTRE.md` não tem ciclos; ondas consistentes.
- **Arquivos:** `tools/plano-check.ts`
- **Tarefas:** [ ] P02.S4.T1 parser dos IDs em `docs/IDEIAS_ANIMACAO_E_EXPERIENCIA.md`; [ ] P02.S4.T2 parser de `00-RASTREIO.md` e da tabela de dependências do `00-MESTRE.md`; regra de ondas: **onda da dependência <= onda do plano** (igualdade é permitida; ex.: P06 depende de P04, ambas na onda 2); [ ] P02.S4.T3 testes com fixtures de documentos quebrados (ID faltando, duplicado, ciclo); [ ] P02.S4.T4 script `npm run plano:check` (sem dependência nova, via `tsx` já presente); o teste fica em `tools/plano-check.test.ts` (coberto pelo glob de S1).
- **Pronto quando:** o script passa nos documentos atuais e falha nos documentos quebrados de teste.

## Critérios de pronto do plano

- [ ] `npm run check` verde (com teste de `tools/` rodando); `leak.ts` com mutação provada; `plano:check` verde.
- [ ] Nenhuma dependência nova instalada.

## Riscos

| Risco | Mitigação |
|---|---|
| Harness com falso negativo (deixa vazar) | Teste de mutação obrigatório (S3.T3) e auditor adversarial |
| Fixtures acopladas ao formato de `GameView` que muda | Estender `makeView` em vez de duplicar; contrato fixado por teste |
