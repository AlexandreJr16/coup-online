# P01 Times de agentes e protocolo

> Programa **0 Fundação** · Onda **0** · Risco **médio** · Estado: `[~]` papéis criados; falta o voo de teste.

**Objetivo:** definir os papéis, o ciclo de verificação cruzada e validar o protocolo num voo de teste real antes de escalar.

- **Seções do índice:** (meta)
- **Depende de:** P00 (e o subplano S2 depende de **P02.S1**, ver abaixo)
- **Arquivos que toca:** `.claude/agents/*.md`, `docs/plano/00-PROTOCOLO.md`, `docs/plano/00-REGISTRO.md`, mais o arquivo escolhido para o voo de teste (ver S2)
- **Verificação exigida:** revisor de código sobre os papéis; o voo de teste é a prova real.
- **Decisões que bloqueiam:** DEC-19 (aninhamento de subagentes)

## Subplanos

### P01.S1 Papéis em `.claude/agents/` e teste de aninhamento `[~]`
- **Objetivo:** ter os 8 papéis definidos com ferramentas mínimas e formato de saída fixo, e descobrir se subagentes criam subagentes.
- **Arquivos:** `.claude/agents/{arquiteto,revisor-de-plano,escritor-de-testes,implementador,artista-procedural,verificador-mecanico,revisor-de-codigo,auditor-de-vazamento}.md`
- **Tarefas:**
  - [x] P01.S1.T1 escrever os 8 arquivos de papel
  - [ ] P01.S1.T2 em sessão nova, confirmar que os papéis carregam (`/agents`); se não carregarem, usar o fallback do `00-PROTOCOLO.md` (leitura em Explore/Plan, escrita em `general-purpose`)
  - [ ] P01.S1.T3 teste de aninhamento: pedir a um agente com ferramenta de agentes que dispare outro; registrar o resultado em DEC-19
- **Testes:** não se aplica a código; critério é comportamental.
- **Pronto quando:** cada papel responde no formato esperado numa tarefa de prova e DEC-19 está resolvida.

### P01.S2 Voo de teste do ciclo completo `[ ]`
- **Objetivo:** executar o ciclo inteiro (plano → testes falhando → implementação → verificação mecânica → revisão → commit → registro) numa tarefa pequena e segura, antes de escalar.
- **Tarefa escolhida (revisada após a revisão independente):** **P02.S4 `plano:check`** (`tools/plano-check.ts` + teste). Está na fila pronta (P02 depende só de P00), não toca jogo, servidor nem UI, e exercita plano, testes, implementação, verificação mecânica e revisão de código; **não** exercita `arquiteto`, `artista-procedural` nem `auditor-de-vazamento` (este fica para P02.S3, os outros para o primeiro plano que os use). A escolha anterior, `seatWear` (P12.S1), violava o grafo (depende de P11 e P08, onda 5) e de DEC-05 aberta.
- **Pré-requisito:** commitar o andaime antes de qualquer worktree (worktrees não enxergam arquivos fora do controle de versão).
- **Arquivos tocados:** `tools/plano-check.ts`, `tools/plano-check.test.ts`, `package.json` (script `plano:check`; depende de P02.S1 para o glob rodar o teste)
- **Tarefas:**
  - [ ] P01.S2.T1 `revisor-de-plano` aprova o subplano P02.S4 (preenchido com o template; **depois de P02.S1**)
  - [ ] P01.S2.T2 `escritor-de-testes` escreve `tools/plano-check.test.ts`; falha demonstrada
  - [ ] P01.S2.T3 `implementador` cria `tools/plano-check.ts`
  - [ ] P01.S2.T4 `verificador-mecanico` roda `npm test`, `tsc`, `eslint` (saída bruta)
  - [ ] P01.S2.T5 `revisor-de-codigo` emite veredito (template)
  - [ ] P01.S2.T6 orquestrador commita e registra; `verificador-mecanico` confere `git log -1 --format=%B` sem atribuição a Claude/Anthropic
- **Pronto quando:** commit feito, veredito e registro preenchidos, `[x]` marcado pelo orquestrador citando o veredito APROVA, e uma lista de atritos do processo anotada em `00-REGISTRO.md`.

### P01.S3 Ajuste do protocolo `[ ]`
- **Objetivo:** corrigir `00-PROTOCOLO.md`, os papéis e os templates com o que o voo mostrou.
- **Tarefas:** [ ] P01.S3.T1 reduzir cerimônia que não pegou erro; [ ] P01.S3.T2 reforçar o que pegou erro; [ ] P01.S3.T3 medir tempo e custo aproximado do ciclo.
- **Pronto quando:** protocolo revisado e registrado; o Alexandre informado do custo por subplano.

### P01.S4 Cadência de sessão `[ ]`
- **Objetivo:** tornar a retomada previsível: fila pronta, inbox, relatório de onda.
- **Tarefas:** [ ] P01.S4.T1 receita de "início de sessão" (ler mestre e registro, montar fila); [ ] P01.S4.T2 primeiro `relatorio-de-onda` real ao fim da onda 0; [ ] P01.S4.T3 ponteiro na memória do projeto para `docs/plano/00-MESTRE.md`.
- **Pronto quando:** uma sessão nova consegue retomar só com `README.md` + `00-MESTRE.md`.

## Critérios de pronto do plano

- [ ] Papéis carregam e respeitam suas restrições (o verificador não edita; o implementador não toca testes).
- [ ] DEC-19 resolvida.
- [ ] Voo de teste concluído e protocolo ajustado.

## Riscos

| Risco | Mitigação |
|---|---|
| Papéis novos só carregam em sessão nova | Fallback do protocolo: papéis de leitura em Explore/Plan; escrita em `general-purpose` |
| Cerimônia pesada para tarefa pequena | Voo de teste mede o custo; S3 poda |
| Verificador carimba sem ler | Exigir evidência `arquivo:linha` e reexecução de comandos; auditar amostras |
