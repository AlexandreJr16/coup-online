# P02 Infra de qualidade

> Programa **0 Fundação** · Onda **0** · Risco **médio** (o S3 é **alto**: é o que garante que não vaza informação) · Estado: `[x]` concluído em 18/10/2026

**Objetivo:** dar aos verificadores as ferramentas: script `check`, fixtures de `GameView`, harness do teste de propriedade de vazamento (16.3) e checagem de cobertura do rastreio.

- **Seções do índice:** 0, 2
- **Depende de:** P00
- **Arquivos que toca:** `package.json` (scripts `check` e `plano:check`, glob do `test`), `tools/sentinela.test.ts` (novo, S1), `tools/plano-check.ts` e `tools/plano-check.test.ts` (novos, S4), `src/components/game/test-utils.ts` (estender), `src/components/game/fx/leak.ts` e `leak.test.ts` (novos), `tools/plano-check.ts` (novo)
- **Verificação exigida:** revisor de código nos S1, S2, S4; **chave dupla** (`revisor-de-codigo` + `auditor-de-vazamento`) no S3.
- **Reaproveita:** `makeView` e `player` em `src/components/game/test-utils.ts`; tipo `GameView` em `src/types/game.ts`.

## Fato importante sobre o dado (verificado em `src/types/game.ts`)

`GameView` entregue ao cliente contém **a mão do próprio jogador** (`players[].cards[].character` não nulo só para ele; `null` para os outros, **exceto cartas reveladas**, que têm `character` para todos) e `exchange.pool` (só para o ator da troca). Logo, a **projeção pública** que o diretor de cena recebe deve **zerar** essas duas coisas. O teste de vazamento compara a saída do diretor para duas views idênticas que diferem apenas na mão (e no `exchange.pool`) do observador.

## Subplanos

### P02.S1 Script `npm run check` e glob de testes `[x]`
- **Objetivo:** um comando só para a verificação mecânica do dia a dia (sem E2E nem build) e um glob de testes que realmente cobre `tools/`.
- **Arquivos tocados (declarados):** `package.json` (só o bloco `scripts`) e `tools/sentinela.test.ts` (novo). **Não toca** a Constituição nem os papéis: T3 e T4 já estão atendidas em `.claude/agents/verificador-mecanico.md:21` e `docs/plano/00-CONSTITUICAO.md:35-36`.
- **Precondição de ambiente:** `node_modules` presente (`tsx`, `tsc`, `eslint` em `node_modules/.bin`); restaurar com `npm ci` é decisão do Alexandre. Verificado em 18/10/2026: presente.
- **Exceção de ordem registrada:** P02.S1 e P02.S4 rodam com P00 em `[~]` porque são o voo de teste que fecha P00 (ver `00-REGISTRO.md`).
- **Achado que originou o subplano:** o glob do `npm test` é `src/**/*.test.ts` (`package.json:11`); testes em `tools/` e `*.test.tsx` nunca rodam.
- **Linha de base registrada em 18/10/2026:** `npm test` 203/203 verdes (~73 s), `tsc --noEmit` e `eslint .` limpos.
- **Linha de base antes de começar (regra):** `verificador-mecanico` registra `npm test`, `tsc --noEmit` e `eslint .` **como estão**. Erro antigo fora dos arquivos declarados vai ao `00-INBOX.md` e **não** é corrigido aqui (S1 fica `[!]` se bloquear).
- **Tarefas:**
  - [x] P02.S1.T1 `escritor-de-testes` cria `tools/sentinela.test.ts` (conteúdo mínimo: um teste `P02.S1 sentinela: tools/**/*.test.ts roda no npm test` e um teste `P02.S1 nenhum arquivo .test.tsx em src, tools ou tests (sem jsdom)` com controle positivo que a varredura enxerga `helpers.test.ts`; usa só `node:test`, `node:assert/strict`, `node:fs`, `node:path`, e `readdirSync` com `withFileTypes`). A **falha vista** antes da mudança: `node --import tsx --test tools/sentinela.test.ts` passa, mas `npm test 2>&1 | grep -c "P02.S1 sentinela"` dá `0`.
  - [x] P02.S1.T2 `implementador` edita `package.json`: `"test": "node --import tsx --test \"src/**/*.test.ts\" \"tools/**/*.test.ts\""` (aspas obrigatórias: sem elas o `sh` lê `**` como `*`) e `"check": "npm test && tsc --noEmit && eslint ."`. **Proibido** o glob largo `**/*.test.ts` (pegaria `tests/e2e/`, que exige o build). Sem `precheck`, `postcheck`, `pretest`, `posttest`. Usar `tsc` e `eslint` puros, nunca `npx tsc`.
  - [x] P02.S1.T3 regra do `verificador-mecanico` (nomes de teste na saída): já atendida em `.claude/agents/verificador-mecanico.md:21`.
  - [x] P02.S1.T4 DoD na Constituição: já atendida em `docs/plano/00-CONSTITUICAO.md:35-36`.
- **Concluído em 18/10/2026:** commit `be2d5d3`; verificação mecânica e revisão de código (APROVA) registradas em `00-REGISTRO.md`.
- **Testes:** unitário: `tools/sentinela.test.ts`. Integração: não se aplica. E2E: não se aplica (nada escrito).
- **Pronto quando (comandos):**
  - `npm test 2>&1 | grep -F "P02.S1 sentinela"` e `... | grep -F "P02.S1 nenhum arquivo .test.tsx"` acham uma linha cada.
  - `node -e "const s=require('./package.json').scripts;const bad=['check','test'].some(k=>/e2e|build|tests\\//.test(s[k]))||['precheck','postcheck','pretest','posttest'].some(k=>k in s);process.exit(bad?1:0)"` sai com 0.
  - Checagem exata do glob (pega o glob largo proibido): `node -e "const s=require('./package.json').scripts;const g=s.test.match(/\\S+\\.test\\.ts\\S*/g);process.exit(JSON.stringify(g)===JSON.stringify(['\\"src/**/*.test.ts\\"','\\"tools/**/*.test.ts\\"'])?0:1)"` sai com 0.
  - `npm run check; echo $?` dá `0` (se a linha de base estava limpa).

### P02.S2 Fixtures de `GameView` `[x]`
- **Objetivo:** construtores para cenários repetíveis (mãos A/B, fases, `lastChallenge` verdade/blefe/bloqueio, `pending` com `passedIds`, jogador ausente, 2 a 6 jogadores).
- **Arquivos:** `src/components/game/test-utils.ts` (estender, sem quebrar `makeView`/`player`)
- **Tarefas:** [x] P02.S2.T1 teste que fixa o contrato atual de `makeView`; [x] P02.S2.T2 helpers `withHand(view, playerId, hand)`, `withPending(view, {...})`, `playersN(n)`; [x] P02.S2.T3 `challengePair(preState, ...)`: gera o **par verdade/blefe pela engine** (`applyEvent` a partir do mesmo pré-estado e com `rng` fixo, pois o padrão é `Math.random`), passando por `viewForPlayer` (`engine.ts:758`) antes de `toPublicView`, de forma que os campos derivados (`mustRevealPlayerId`, `stats`, `eliminated`, auto-revelação) fiquem consistentes; [x] P02.S2.T4 testes dos helpers.
- **Pronto quando:** os testes existentes que usam `makeView` seguem verdes e os novos helpers têm teste.

### P02.S3 Harness do teste de propriedade de vazamento `[x]`
- **Objetivo:** infraestrutura que as Fases H usarão: dado um "observador" e uma função pura `f(viewPublica)`, provar que `f` não depende de dado oculto.
- **Arquivos:** `src/components/game/fx/leak.ts` (`toPublicView(view)`: zera a mão **não revelada** do observador e `exchange.pool`; tipo `PublicView` com brand, para o `tsc` impedir que o diretor receba o `GameView` cru), `src/components/game/fx/leak.test.ts`
- **Tarefas:**
  - [x] P02.S3.T1 `toPublicView` com teste: nenhuma carta oculta sobrevive; `revealed: true` permanece
  - [x] P02.S3.T2 `assertNoLeak(f, viewA, viewB)` (igualdade profunda da saída para views que diferem só no oculto)
  - [x] P02.S3.T3 teste de mutação: uma `f` deliberadamente vazadora (lê a mão) **é reprovada** pelo harness
  - [x] P02.S3.T4 `f` de exemplo que passa (usa só `toPublicView`)
- **Risco:** alto. **Verificadores:** `revisor-de-codigo` + `auditor-de-vazamento` (precisa tentar enganar o harness: campos que ele esqueça de zerar, ordem de chaves, `undefined` vs `null`).
- **Pronto quando:** o mutante é reprovado, o exemplo é aprovado, e o auditor não consegue fazer um vazamento passar.

### P02.S4 Script de cobertura do rastreio e dos ciclos `[x]`
- **Objetivo:** automatizar o que hoje foi checado uma vez: todo ID do índice aparece uma vez em `00-RASTREIO.md`; o grafo de dependências do `00-MESTRE.md` não tem ciclos; ondas consistentes.
- **Arquivos:** `tools/plano-check.ts`
- **Tarefas:** [x] P02.S4.T1 parser dos IDs em `docs/IDEIAS_ANIMACAO_E_EXPERIENCIA.md`; [x] P02.S4.T2 parser de `00-RASTREIO.md` e da tabela de dependências do `00-MESTRE.md`; regra de ondas: **onda da dependência <= onda do plano** (igualdade é permitida; ex.: P06 depende de P04, ambas na onda 2); [x] P02.S4.T3 testes com fixtures de documentos quebrados (ID faltando, duplicado, ciclo); [x] P02.S4.T4 script `npm run plano:check` (sem dependência nova, via `tsx` já presente); o teste fica em `tools/plano-check.test.ts` (coberto pelo glob de S1).
- **Pronto quando:** o script passa nos documentos atuais e falha nos documentos quebrados de teste.

## Critérios de pronto do plano

- [ ] `npm run check` verde (com teste de `tools/` rodando); `leak.ts` com mutação provada; `plano:check` verde.
- [ ] Nenhuma dependência nova instalada.

## Riscos

| Risco | Mitigação |
|---|---|
| Harness com falso negativo (deixa vazar) | Teste de mutação obrigatório (S3.T3) e auditor adversarial |
| Fixtures acopladas ao formato de `GameView` que muda | Estender `makeView` em vez de duplicar; contrato fixado por teste |
