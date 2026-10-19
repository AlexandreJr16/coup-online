# P15 Troca visível, bloqueio e perigo duplo

> Programa **C Vida e blefe** · Onda **6** · Risco **alto** · Estado: `[ ]` esboçado (detalhar com `arquiteto` + `revisor-de-plano` antes de executar).

**Objetivo:** Tornar visível a troca da carta provada, o bloqueio e a perda dupla.

- **Seções do índice:** 2
- **IDs cobertos:** B7, B8, B9
- **Depende de:** P14
- **Arquivos que toca:** fx/scenes/troca.ts, fx/scenes/bloqueio.ts, FlyFromDeck.tsx, WaxSeal.tsx, events.ts (B7 fica fora do directScene: carta nova só para o acusado)
- **Verificação exigida:** Chave dupla: revisor-de-codigo + auditor-de-vazamento
- **Decisões que bloqueiam:** nenhuma
- **Gate humano:** ver subplanos marcados [H]

## Subplanos

- [ ] **P15.S1** Troca visível da carta provada (B7)
- [ ] **P15.S2** Bloqueio com escudo (B8)
- [ ] **P15.S3** Perigo duplo (B9)
- [ ] **P15.S4** Teste de propriedade de vazamento

## Critérios de pronto do plano

- [ ] (a preencher na expansão; copiar os "Pronto quando" correspondentes de `docs/PLANO_V3.md` e `docs/VIDA_E_BLEFE.md`)

## Testes exigidos (política do CLAUDE.md)

Cada subplano declara seus testes nos 3 níveis (unitário, integração, E2E escrito). O E2E **só roda** sob pedido do Alexandre.

## Riscos

- (a preencher na expansão)
