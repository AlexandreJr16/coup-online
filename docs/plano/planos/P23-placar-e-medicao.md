# P23 Placar, títulos, revanche e medição

> Programa **E Retenção** · Onda **7** · Risco **médio** · Estado: `[ ]` esboçado (detalhar com `arquiteto` + `revisor-de-plano` antes de executar).

**Objetivo:** Ligar uma partida à outra: placar da noite, títulos acumulados, revanche sem atrito e medição.

- **Seções do índice:** 9
- **IDs cobertos:** R1, R2, R3, R7
- **Depende de:** P00
- **Arquivos que toca:** src/server/rooms.ts, src/server/socket.ts, src/lib/game/*, src/components/game/VictoryPanel.tsx
- **Verificação exigida:** Revisor de código
- **Decisões que bloqueiam:** DEC-16
- **Gate humano:** ver subplanos marcados [H]

## Subplanos

- [ ] **P23.S1** Log JSON de revanches e linha de base (R7) `[H]`
- [ ] **P23.S2** room.scoreboard e room:score (unit e integração) (R1)
- [ ] **P23.S3** Placar no fim de partida e no lobby
- [ ] **P23.S4** Revanche sem atrito (R2)
- [ ] **P23.S5** Títulos da noite (R3)

## Critérios de pronto do plano

- [ ] (a preencher na expansão; copiar os "Pronto quando" correspondentes de `docs/PLANO_V3.md` e `docs/VIDA_E_BLEFE.md`)

## Testes exigidos (política do CLAUDE.md)

Cada subplano declara seus testes nos 3 níveis (unitário, integração, E2E escrito). O E2E **só roda** sob pedido do Alexandre.

## Riscos

- (a preencher na expansão)
