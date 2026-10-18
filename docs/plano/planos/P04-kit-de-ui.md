# P04 Kit de UI, tokens e fonte

> Programa **A Linguagem visual** · Onda **2** · Risco **médio** · Estado: `[ ]` esboçado (detalhar com `arquiteto` + `revisor-de-plano` antes de executar).

**Objetivo:** Uma linguagem visual só: tokens, fonte pixel e componentes base sobre moldura 9-slice.

- **Seções do índice:** 8
- **IDs cobertos:** U1, U2
- **Depende de:** P03
- **Arquivos que toca:** app/globals.css, app/layout.tsx, src/components/ui/*, src/components/game/helpers.ts
- **Verificação exigida:** Revisor de código
- **Decisões que bloqueiam:** DEC-11, DEC-12
- **Gate humano:** ver subplanos marcados [H]

## Subplanos

- [ ] **P04.S1** Tokens (paleta reduzida, bordas chapadas, sombra dura)
- [ ] **P04.S2** Fonte escolhida na Fase 0 em layout.tsx
- [ ] **P04.S3** PixelPanel, PixelButton, IconButton, Tag
- [ ] **P04.S4** Migrar home, lobby e header para o kit
- [ ] **P04.S5** Remover game-btn, corner-btn, repo-link legados e conferir por busca

## Critérios de pronto do plano

- [ ] (a preencher na expansão; copiar os "Pronto quando" correspondentes de `docs/PLANO_V3.md` e `docs/VIDA_E_BLEFE.md`)

## Testes exigidos (política do CLAUDE.md)

Cada subplano declara seus testes nos 3 níveis (unitário, integração, E2E escrito). O E2E **só roda** sob pedido do Alexandre.

## Riscos

- (a preencher na expansão)
