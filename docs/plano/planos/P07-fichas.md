# P07 Fichas

> Programa **B Mesa** · Onda **3** · Risco **alto** · Estado: `[ ]` esboçado (detalhar com `arquiteto` + `revisor-de-plano` antes de executar).

**Objetivo:** Fichas como sprites por quantidade, com variantes por hash de jogador, e as animações de ganhar e perder.

- **Seções do índice:** 7
- **IDs cobertos:** G4, G5, E8, E9
- **Depende de:** P05, P06
- **Arquivos que toca:** tools/art/fichas.ts, public/art/imperio/fichas/*, src/components/game/helpers.ts, Seat.tsx
- **Verificação exigida:** Chave dupla: revisor-de-codigo + auditor-de-vazamento
- **Decisões que bloqueiam:** DEC-17, DEC-22, DEC-23, DEC-24
- **Gate humano:** ver subplanos marcados [H]

## Subplanos

- [ ] **P07.S1** Gerador procedural fichas.ts com seed fixa
- [ ] **P07.S2** Curadoria de 3 variantes por quantidade `[H]`
- [ ] **P07.S3** chipSprite(count, playerId) com testes
- [ ] **P07.S4** Pilha no assento e montes no Erário
- [ ] **P07.S5** Animações pop, voo e desmoronar
- [ ] **P07.S6** Hover na pilha (E8), fichas fantasma, fichas que pousam (E9) e aviso de 10+ (dono único)

## Critérios de pronto do plano

- [ ] (a preencher na expansão; copiar os "Pronto quando" correspondentes de `docs/PLANO_V3.md` e `docs/VIDA_E_BLEFE.md`)

## Testes exigidos (política do CLAUDE.md)

Cada subplano declara seus testes nos 3 níveis (unitário, integração, E2E escrito). O E2E **só roda** sob pedido do Alexandre.

## Riscos

- (a preencher na expansão)
