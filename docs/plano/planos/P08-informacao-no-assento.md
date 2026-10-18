# P08 Informação no assento e no centro

> Programa **B Mesa** · Onda **3** · Risco **médio** · Estado: `[ ]` esboçado (detalhar com `arquiteto` + `revisor-de-plano` antes de executar).

**Objetivo:** A informação fica onde o olho está: balão da jogada, legenda do centro, marca de espera e cabeçalho sem texto.

- **Seções do índice:** 7
- **IDs cobertos:** G2, G3, G6, G7, G8, G9, G11, G13
- **Depende de:** P04, P06, P07
- **Arquivos que toca:** Table.tsx, Seat.tsx, GameBoard.tsx, TurnBanner.tsx, IntrigueFeed.tsx, status.ts (reuso)
- **Verificação exigida:** Revisor de código
- **Decisões que bloqueiam:** DEC-15, DEC-21
- **Gate humano:** ver subplanos marcados [H]

## Subplanos

- [ ] **P08.S1** Legenda curta no centro (reusa deriveRoundStatus e timeoutWarning)
- [ ] **P08.S2** Cabeçalho sem texto de status e role=status oculto
- [ ] **P08.S3** Balão da jogada sobre o assento
- [ ] **P08.S4** Marca de quem a mesa espera
- [ ] **P08.S5** Baralho por faixa e Erário com baú
- [ ] **P08.S6** Histórico de Intrigas no kit
- [ ] **P08.S7** Dígitos do relógio em sprite

## Critérios de pronto do plano

- [ ] (a preencher na expansão; copiar os "Pronto quando" correspondentes de `docs/PLANO_V3.md` e `docs/VIDA_E_BLEFE.md`)

## Testes exigidos (política do CLAUDE.md)

Cada subplano declara seus testes nos 3 níveis (unitário, integração, E2E escrito). O E2E **só roda** sob pedido do Alexandre.

## Riscos

- (a preencher na expansão)
