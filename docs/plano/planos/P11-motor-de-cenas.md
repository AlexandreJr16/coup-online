# P11 Motor de cenas

> Programa **C Vida e blefe** · Onda **4** · Risco **alto** · Estado: `[ ]` esboçado (detalhar com `arquiteto` + `revisor-de-plano` antes de executar).

**Objetivo:** Infraestrutura da Fase H: tipos, diretor puro, fila, executor, preferência de efeitos e página de revisão.

- **Seções do índice:** 2, 13
- **IDs cobertos:** (ver objetivo)
- **Depende de:** P02, P03, P06
- **Arquivos que toca:** src/components/game/fx/*, events.ts, useGameEvents.ts, app/dev/cenas/page.tsx
- **Verificação exigida:** Chave dupla: revisor-de-codigo + auditor-de-vazamento
- **Decisões que bloqueiam:** DEC-07
- **Gate humano:** ver subplanos marcados [H]

## Subplanos

- [ ] **P11.S1** Tipos Beat, Cena e Alvo
- [ ] **P11.S2** events.ts estendido com os eventos que faltam
- [ ] **P11.S3** directScene (puro) com projeção pública
- [ ] **P11.S4** Fila: prioridade, coalescência, pular, document.hidden
- [ ] **P11.S5** CamadaDeCena (executor)
- [ ] **P11.S6** Preferência de efeitos (3 níveis) e reduced motion
- [ ] **P11.S7** Página /dev/cenas
- [ ] **P11.S8** Hold da view: exibição do desfecho atrasada até o beat do veredito (view efetiva usada por legenda, assento e DOM)
- [ ] **P11.S9** Teste do orçamento de drama alto (<= ~25 s) numa partida simulada

## Critérios de pronto do plano

- [ ] (a preencher na expansão; copiar os "Pronto quando" correspondentes de `docs/PLANO_V3.md` e `docs/VIDA_E_BLEFE.md`)

## Testes exigidos (política do CLAUDE.md)

Cada subplano declara seus testes nos 3 níveis (unitário, integração, E2E escrito). O E2E **só roda** sob pedido do Alexandre.

## Riscos

- (a preencher na expansão)
