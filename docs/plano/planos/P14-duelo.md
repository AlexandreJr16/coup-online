# P14 Duelo e veredito

> Programa **C Vida e blefe** · Onda **6** · Risco **alto** (a cena mais importante; toca carta oculta) · Estado: `[ ]` detalhado como **exemplo de granularidade**

**Objetivo:** foco, suspense, revelação e reação na contestação (~2,6 s, pulável), sem vazar nada antes do veredito.

- **Seções do índice:** 2 · **IDs cobertos:** B3, B4, B5, B6, B10
- **Depende de:** P13 (e, por ele, P11 e P08), P19 (sons), P20 (arte do duelo)
- **Decisões que bloqueiam:** DEC-01, DEC-02, DEC-10
- **Arquivos que toca:** `src/components/game/events.ts` (+ `events.test.ts`), `fx/scenes/duelo.ts` (+ teste), `fx/scenes/duelo.leak.test.ts`, `fx/Duelo.tsx`, `fx/queue.ts` e `fx/prefs.ts` (extensões pontuais, donos: P11), `ChallengeReveal.tsx`, `WaxSeal.tsx`, `GameBoard.tsx`, `HandView.tsx`, `status.ts` (religação à view efetiva), `fx/hold.ts` (política), `app/globals.css`, `app/dev/cenas/page.tsx`, `tests/e2e/mesa.e2e.test.ts`
  - Convenção: **uma cena por arquivo** em `fx/scenes/`, para que P14, P15 e P17 (todos na onda 6) possam andar em paralelo sem tocar o mesmo arquivo. `recipes.ts` é de P19, não deste plano.
- **Verificação exigida:** chave dupla em todos os subplanos (`revisor-de-codigo` + `auditor-de-vazamento`).
- **Fonte da especificação:** `docs/VIDA_E_BLEFE.md` seções 7.3, 7.4, 7.5, 12.4, 16.3.
- **Dado público usado:** `GameView.lastChallenge` (`n`, `challengerId`, `accusedId`, `claimed`, `accusedHadCard`, `kind`).

> **Atenção ao vazamento (achado da revisão independente, verificado no código).** O cliente recebe a view **já com o desfecho**. Antes do beat do veredito, o desfecho já aparece por vários caminhos: a legenda `status.ts:119` ("X perdeu uma influência"), `mustRevealPlayerId`, `stats.challengesRight/bluffsCaught` (`engine.ts:421-423`), a carta revelada automaticamente de quem só tinha 1 (`engine.ts:563-565`), `eliminated`, e o atributo `data-had-card` com cor no DOM do `ChallengeReveal.tsx:30-32`. Por isso **não basta** o `directScene` ser idêntico: toda a exibição precisa usar uma **view efetiva atrasada** (hold, P11) até o beat do veredito. É o subplano S5.

## Subplanos

### P14.S1 Derivação `lastChallenge` → eventos `[ ]`
- **Objetivo:** `events.ts` emite `duelo` (quando `lastChallenge.n` muda) e `cartaTrocada` **só** quando `accusedHadCard === true`.
- **Arquivos:** `events.ts`, `events.test.ts`
- **Tarefas:** [ ] T1 testes: mesmo `n` não emite; `n` novo emite; `kind` ação e bloqueio; `cartaTrocada` ausente quando blefe · [ ] T2 implementação · [ ] T3 testes antigos de `events.test.ts` seguem verdes.
- **Pronto quando:** `npm test` mostra os nomes dos testes novos na saída e tudo verde.

### P14.S2 Cena `duelo` com 3 variantes `[ ]`
- **Objetivo:** a cena como lista de beats (0–2,6 s; teto 2,7 s), variante A/B/C por hash estável de `lastChallenge.n`.
- **Arquivos:** `fx/scenes/duelo.ts`, `fx/scenes/duelo.test.ts`
- **Tarefas:** [ ] T1 testes de tempo (foco 0, entrada 0–350, suspense 350–1500, revelação 1500–1900, veredito 1900, reação 1900–2600, retorno 2600), alvos e sons · [ ] T2 testes de variante (mesmo `n` → mesma variante; `n` diferentes distribuem) · [ ] T3 teto `duracaoMax` · [ ] T4 implementação.
- **Pronto quando:** nenhum beat passa de 2,7 s (ou do valor de DEC-01); variante é função pura de `n`.

### P14.S3 Executor visual `Duelo.tsx` `[ ]`
- **Objetivo:** evoluir `ChallengeReveal.tsx` para o duelo: véu, recortes de papel dos dois duelistas, faixa VS, hit-stop, vinheta, flip da carta.
- **Arquivos:** `fx/Duelo.tsx`, `ChallengeReveal.tsx`, `app/globals.css`, `app/dev/cenas/page.tsx`
- **Depende de:** arte (P20) e sons (P19), agora dependências do plano.
- **Tarefas:** [ ] T1 `/dev/cenas?cena=duelo&resultado=verdade|blefe&variante=A|B|C` · [ ] T2 componente com WAAPI (só `transform`/`opacity`) · [ ] T3 `data-testid` para o E2E · [ ] T4 `data-had-card` e a cor do veredito **só no DOM a partir do beat do veredito**.
- **Gate humano `[H]`:** o Alexandre aprova o ritmo **jogando**. **Os critérios de navegador (60 fps, `/dev/cenas` sem `console.error`) são `[H] pedir execução`**: o agente não os carimba sem exercitar no navegador; o veredito deve dizer "não exercitado no navegador" até o Alexandre pedir o E2E ou a revisão manual.
- **Pronto quando:** compila e passa `npm run check`; **e** (sob pedido) `/dev/cenas` reproduz as 3 variantes × 2 resultados sem erro; ritmo aprovado.

### P14.S4 Veredito: verdade e blefe `[ ]`
- **Objetivo:** carimbos VERDADE (dourado) e BLEFE! (vermelho), máscara que se estilhaça, tremor da mesa, reação de vencedor e perdedor (B5, B6). A rachadura aqui é **transitória**.
- **Arquivos:** `fx/scenes/duelo.ts`, `WaxSeal.tsx`, `fx/Duelo.tsx`
- **Tarefas:** [ ] T1 testes: beats do veredito divergem **só** a partir de 1900 ms · [ ] T2 implementação dos dois ramos · [ ] T3 a rachadura persistente **não** é disparada aqui (só em P16.S1).
- **Pronto quando:** testes de divergência verdes.

### P14.S5 Segurar a exibição do desfecho (view efetiva) `[ ]`
- **Objetivo:** até o beat do veredito, legenda, `role="status"`, assentos, camadas persistentes (`seatWear`), estatísticas e o DOM do duelo usam a **view efetiva** (a anterior ao desfecho); no veredito, a view efetiva alcança a real.
- **Arquivos:** `fx/hold.ts` (mecanismo é de P11.S8; aqui só a **política** do duelo), `GameBoard.tsx`, `ChallengeReveal.tsx`, `status.ts` (consumo)
- **Tarefas:** [ ] T1 testes puros: para `lastChallenge` novo, a view efetiva mantém `phase`, `mustRevealPlayerId`, `eliminated` e `stats` anteriores até 1900 ms · [ ] T2 nenhum campo que dependa do desfecho aparece no DOM antes do veredito (teste unitário de função pura que calcula as props; sem jsdom) · [ ] T3 integração com P08.S1 e P12 (eles consomem a view efetiva, não a real) · [ ] T4 atualizar a asserção do E2E escrito que lê `data-had-card` cedo (`tests/e2e/mesa.e2e.test.ts`, buscar `data-had-card`).
- **Risco:** o hold **não** pode atrasar o servidor nem o relógio do jogador que perdeu; só a exibição.
- **Pronto quando:** teste de propriedade (S7) verde com esta camada.

### P14.S6 Pular e liberação da escolha de carta `[ ]`
- **Objetivo:** clique, `Espaço` ou `Esc` pulam até o beat do veredito (carimbo por 400 ms); a escolha de carta de quem perdeu (`aguardando_revelacao`) é liberada em veredito + 300 ms (DEC-10: só o centro bloqueia clique).
- **Arquivos:** `fx/queue.ts`, `HandView.tsx`, `GameBoard.tsx`
- **Tarefas:** [ ] T1 testes da fila: pular salta ao beat `final` · [ ] T2 **função pura** `escolhaLiberada(cena, agoraMs)` com teste unitário (não há jsdom nem testing-library no projeto; integração no `CLAUDE.md` significa servidor Socket.IO real) · [ ] T3 o componente só chama a função; cobertura do componente fica no E2E escrito · [ ] T4 relógio do servidor (`CHOICE_TIME`) intocado.
- **Pronto quando:** testes puros verdes; servidor intocado (`git diff --stat` sem `src/server/` nem `src/lib/game/`).

### P14.S7 Teste de propriedade de vazamento do duelo `[ ]`
- **Objetivo:** provar que o duelo e a view efetiva não revelam o desfecho antes de 1900 ms, com pares de views **geradas pela engine** (não construídas à mão).
- **Arquivos:** `fx/scenes/duelo.leak.test.ts`
- **Tarefas:** [ ] T1 par verdade/blefe: aplicar na engine (`applyEvent`, `src/lib/game/engine.ts`) a mesma ação e a mesma contestação a partir do **mesmo pré-estado e com `rng` fixo** (`applyEvent` usa `Math.random` por padrão, `engine.ts:101-104`), mudando só a carta real do acusado; passar por **`viewForPlayer`** (`engine.ts:758`, o filtro por jogador do servidor) e só então por `toPublicView`; comparar beats e view efetiva até 1900 ms (cobre `mustRevealPlayerId`, `stats`, auto-revelação, `eliminated`) · [ ] T2 mão A vs mão B para observador contestador/acusado/terceiro/espectador · [ ] T3 mutante deliberado (diretor que lê `mustRevealPlayerId`) é reprovado.
- **Verificadores:** `auditor-de-vazamento` tenta ativamente achar divergência (variante, som, duração, ordem, `data-*`, `aria-*`).
- **Pronto quando:** o auditor não consegue provar vazamento e o mutante é reprovado.

### P14.S8 Movimento reduzido e aba oculta `[ ]`
- **Objetivo:** com `prefers-reduced-motion` ou efeitos "reduzido/desligado", o duelo vira troca instantânea com carimbo estático; com `document.hidden`, reconexão ou espectador novo, **sem replay**.
- **Arquivos:** `fx/queue.ts`, `fx/prefs.ts`, `fx/Duelo.tsx`
- **Tarefas:** [ ] T1 testes de fila (descarte por `document.hidden`; diferença > 1 evento) · [ ] T2 testes das 3 preferências · [ ] T3 implementação.
- **Pronto quando:** testes verdes; reconexão não repete cena.

### P14.S9 Cenário E2E escrito `[ ]`
- **Objetivo:** cenários de partida real com contestação (verdade e blefe) e de `/dev/cenas`, falhando em qualquer `console.error`.
- **Arquivos:** `tests/e2e/mesa.e2e.test.ts`
- **Tarefas:** [ ] T1 escrever com `data-testid` · [ ] T2 **não executar**; registrar "E2E escrito, não executado".
- **Pronto quando:** cenários escritos e `tsc` limpo (o `tsconfig` inclui `**/*.ts`); execução fica para pedido do Alexandre ou P26.

## Critérios de pronto do plano

- [ ] Duelo dentro do teto de DEC-01, pulável, escolha de carta liberada ao fim.
- [ ] Teste de propriedade verde, com `auditor-de-vazamento` sem contraexemplo.
- [ ] `[H]` Aprovação do Alexandre jogando; 3 variantes × 2 resultados reproduzíveis em `/dev/cenas` (exercício no navegador sob pedido).

## Riscos

| Risco | Mitigação |
|---|---|
| Vazar o resultado antes do veredito por legenda, `stats`, auto-revelação, DOM | View efetiva atrasada (S5) + pares gerados pela engine (S7) + auditor adversarial |
| Fadiga na 10ª contestação | 3 variantes, pular, orçamento de 25 s |
| Escolha de carta atrasada | Liberar em veredito + 300 ms; custa ~2 s dos 30 s |
| Conflito de arquivos com P15/P17 | Uma cena por arquivo em `fx/scenes/` |
