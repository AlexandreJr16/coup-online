# P12 Estados persistentes

> Programa **C Vida e blefe** · Onda **5** · Risco **médio** · Estado: `[ ]` esboçado (detalhar com `arquiteto` + `revisor-de-plano` antes de executar).

**Objetivo:** O jogo tem memória: moldura machucada, ameaça, medalhão da vez, anel de tempo e ausente, tudo derivado do estado.

- **Seções do índice:** 1
- **IDs cobertos:** A1, A2, A3, A4, A5, A6, A7, A9, E1
- **Depende de:** P11, P08
- **Arquivos que toca:** src/components/game/fx/wear.ts, Seat.tsx, GameBoard.tsx, public/art/imperio/fx/dano/*
- **Verificação exigida:** Revisor de código
- **Decisões que bloqueiam:** DEC-05
- **Gate humano:** ver subplanos marcados [H]

## Subplanos

- [ ] **P12.S1** seatWear puro com testes de limiar
- [ ] **P12.S2** Moldura machucada (A1)
- [ ] **P12.S3** Cartas perdidas ao lado do assento (A2)
- [ ] **P12.S4** Selos de ameaça (A3)
- [ ] **P12.S5** Medalhão, luz da vez e anel de tempo (A4, A5, A6, E1)
- [ ] **P12.S6** Jogador ausente (A7)
- [ ] **P12.S7** Estados extras de moldura (A9, depois)

## Critérios de pronto do plano

- [ ] (a preencher na expansão; copiar os "Pronto quando" correspondentes de `docs/PLANO_V3.md` e `docs/VIDA_E_BLEFE.md`)

## Testes exigidos (política do CLAUDE.md)

Cada subplano declara seus testes nos 3 níveis (unitário, integração, E2E escrito). O E2E **só roda** sob pedido do Alexandre.

## Riscos

- (a preencher na expansão)
