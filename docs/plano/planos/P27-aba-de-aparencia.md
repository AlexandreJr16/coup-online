# P27 Aba de Aparência (jogador escolhe)

> Programa **A Linguagem visual** · Onda **3** · Risco **médio** · Estado: `[ ]` esboçado (detalhar com `arquiteto` + `revisor-de-plano` antes de executar).

**Objetivo:** O jogador escolhe a aparência numa aba de configurações: fonte, estilo do kit e barra de baixo (as 4 fontes, os 2 estilos e os 3 docks dos mockups ficam todos disponíveis).

- **Seções do índice:** 8
- **IDs cobertos:** U8
- **Depende de:** P04, P09
- **Arquivos que toca:** src/components/ui/*, src/components/game/Aparencia*.tsx, app/layout.tsx, app/globals.css, src/lib/aparencia.ts
- **Verificação exigida:** Revisor de código
- **Decisões que bloqueiam:** nenhuma
- **Gate humano:** ver subplanos marcados [H]

## Subplanos

- [ ] **P27.S1** Preferências de aparência puras (fonte, estilo, dock) com padrão, validação e storage protegido
- [ ] **P27.S2** Tokens por tema: estilo A (madeira e latão) e B (pergaminho e tinta) como conjuntos de variáveis
- [ ] **P27.S3** As 4 fontes pixel carregadas sem pesar (preload só da escolhida)
- [ ] **P27.S4** Aba de configurações no HUD (abre como peça do kit) com prévia ao vivo
- [ ] **P27.S5** Dock em 3 variações selecionáveis (cavalete, mão sobre a mesa, bandeja) sobre as 3 zonas fixas
- [ ] **P27.S6** Gancho para a linha de efeitos (completo, reduzido, desligado) do P11.S6

## Critérios de pronto do plano

- [ ] (a preencher na expansão; copiar os "Pronto quando" correspondentes de `docs/PLANO_V3.md` e `docs/VIDA_E_BLEFE.md`)

## Testes exigidos (política do CLAUDE.md)

Cada subplano declara seus testes nos 3 níveis (unitário, integração, E2E escrito). O E2E **só roda** sob pedido do Alexandre.

## Riscos

- (a preencher na expansão)
