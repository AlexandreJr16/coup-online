# P00 Constituição e governança

> Programa **0 Fundação** · Onda **0** · Risco **baixo** · Estado: `[~]` andaime criado em 18/10/2026; falta verificação independente.

**Objetivo:** fixar as regras inegociáveis, a Definição de Pronto, os gates humanos e os templates que todos os agentes seguem.

- **Seções do índice:** 0 (princípios)
- **Depende de:** nada
- **Arquivos que toca:** `docs/plano/*` (somente documentação)
- **Verificação exigida:** `revisor-de-plano` (instância independente) lê o conjunto e procura lacunas e contradições com `CLAUDE.md`, `AGENTS.md`, `PLANO_V3` e `VIDA_E_BLEFE`.
- **Gate humano:** a Constituição só muda com decisão do Alexandre.

## Subplanos

### P00.S1 Carta de princípios `[~]`
- **Objetivo:** transcrever os princípios da seção 0 do índice em regras verificáveis.
- **Arquivos:** `docs/plano/00-CONSTITUICAO.md`
- **Tarefas:** [x] P00.S1.T1 escrever a Constituição (seções 1 e 2: produto e engenharia) · [ ] P00.S1.T2 revisão independente de contradições com os documentos de origem.
- **Pronto quando:** cada princípio da seção 0 do índice aparece como regra; nenhuma regra contradiz `CLAUDE.md`/`AGENTS.md`.

### P00.S2 Definição de Pronto por tipo de entrega `[~]`
- **Objetivo:** dizer exatamente quando um subplano, um plano e a v3 estão prontos.
- **Tarefas:** [x] P00.S2.T1 DoD por subplano, plano e v3 · [ ] P00.S2.T2 conferir que a DoD é executável por comando (liga com P02.S1, `npm run check`).
- **Pronto quando:** um verificador consegue aplicar a DoD sem interpretar.

### P00.S3 Gates humanos e proibições `[~]`
- **Objetivo:** listar o que só o Alexandre libera e o que nenhum agente pode fazer.
- **Tarefas:** [x] P00.S3.T1 gates e proibições na Constituição (seções 4 e 5) · [ ] P00.S3.T2 conferir com as memórias do projeto (porta 3000, `pkill`, `eza`, E2E sob pedido, sem atribuição em commits).
- **Pronto quando:** toda armadilha de ambiente conhecida está listada.

### P00.S4 Templates `[~]`
- **Objetivo:** padronizar plano, subplano, veredito e relatório de onda.
- **Arquivos:** `docs/plano/templates/*`
- **Tarefas:** [x] P00.S4.T1 cinco templates (plano, subplano, veredito, veredito-de-plano, relatório de onda) · [ ] P00.S4.T2 usar cada template ao menos uma vez (voo de teste, P01.S2) e corrigir o que atrapalhar.
- **Pronto quando:** o voo de teste produziu um veredito e um registro usando os templates sem improviso.

## Critérios de pronto do plano

- [ ] Revisão independente sem pendência bloqueante.
- [ ] Voo de teste (P01.S2) usou os templates e a DoD sem ambiguidade.

## Riscos

| Risco | Mitigação |
|---|---|
| Regras demais que ninguém lê | A Constituição fica em 1 tela por seção; o protocolo remete a ela, não a repete |
| Contradição entre documentos | Ordem de precedência no `00-PROTOCOLO.md` seção 7 |
