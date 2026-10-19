# P10 Microanimações de intuição

> Programa **B Mesa** · Onda **5** · Risco **médio** · Estado: `[ ]` esboçado (detalhar com `arquiteto` + `revisor-de-plano` antes de executar).

**Objetivo:** Pequenas animações frequentes que fazem o jogo se explicar sozinho (E1 e E3 vivem em P12 e P13).

- **Seções do índice:** 5
- **IDs cobertos:** E2, E4, E5, E6, E7, E10, E11, E12
- **Depende de:** P11, P07
- **Arquivos que toca:** Seat.tsx, HandView.tsx, ActionSeal.tsx, motion.ts, app/globals.css
- **Verificação exigida:** Revisor de código
- **Decisões que bloqueiam:** nenhuma
- **Gate humano:** ver subplanos marcados [H]

## Subplanos

- [ ] **P10.S1** Hover na carta da mão com custo e ganho (E7; as fichas fantasma são de P07.S6)
- [ ] **P10.S2** Mira com linha pontilhada e alvo escolhido (E2, E12)
- [ ] **P10.S3** Botão que clica e ação inválida balança (E4, E5)
- [ ] **P10.S4** Mão que respira (E6)
- [ ] **P10.S5** Carta que sai e volta do baralho, quem passou (E10, E11); E8 e E9 vivem em P07

## Critérios de pronto do plano

- [ ] (a preencher na expansão; copiar os "Pronto quando" correspondentes de `docs/PLANO_V3.md` e `docs/VIDA_E_BLEFE.md`)

## Testes exigidos (política do CLAUDE.md)

Cada subplano declara seus testes nos 3 níveis (unitário, integração, E2E escrito). O E2E **só roda** sob pedido do Alexandre.

## Riscos

- (a preencher na expansão)
