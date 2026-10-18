# Registro (append-only)

> Uma entrada por evento relevante: quem fez, quem verificou, veredito, commit. **Nunca editar entradas antigas**; correções entram como nova entrada. Mais recentes **no fim**.

Formato:

```
### AAAA-MM-DD · <ID do subplano ou evento> · <resumo>
- Autor: <papel> · Verificador(es): <papel(is)> · Veredito: APROVA | PEDE MUDANÇA | BLOQUEIA
- Commit: <hash curto> · Testes: <o que rodou; E2E: não executado | executado>
- Notas: <lições, decisões, pendências>
```

---

### 2026-10-18 · Andaime · criação de `docs/plano/` e dos papéis em `.claude/agents/`
- Autor: orquestrador · Verificador(es): revisor-de-plano (instância independente) · Veredito: ver entrada seguinte
- Commit: (preencher ao commitar) · Testes: nenhum código de jogo alterado; E2E: não executado
- Notas: 27 planos, 140 subplanos, 79 IDs do índice rastreados. Detalhados: P00, P01, P02, P14. Demais esboçados, a detalhar sob demanda.

### 2026-10-18 · Andaime · revisão independente, ciclo 1: PEDE MUDANÇA (22 achados, todos de documento)
- Autor: orquestrador · Verificador: revisor-de-plano (instância independente) · Veredito: PEDE MUDANÇA
- Achados confirmados no código antes de corrigir: #1 (a legenda `status.ts:119`, `mustRevealPlayerId`, `stats` e `data-had-card` em `ChallengeReveal.tsx:32` entregam o desfecho cedo) e #3 (o glob do `npm test` só roda `src/**/*.test.ts`).
- Correções: P14 reescrito (novo S5 view efetiva; S7 com pares gerados pela engine; integração de componente trocada por função pura); P11 ganha hold da view e teste do orçamento de 25 s; P02 ganha glob/`.test.tsx` proibido, `challengePair`, tipo `PublicView`; voo de teste trocado de P12.S1 para P02.S1/S4; `[H]` espelhados no MESTRE; arestas P03→P01, P11→P02/P03/P06, P14→P19/P20, P16/P17/P18→P20; donos únicos (E8/E9 em P07); caminhos de servidor corrigidos; log do seed foi ao backlog; validação no ar foi ao P26; DEC-21 a DEC-24; precedência de documentos e nota sobre build; veredito de plano separado; papéis ajustados (arquiteto sem Bash, verificador confere nomes de teste e mensagem de commit); R do P02 e P06 reclassificados.
- Commit: nenhum ainda · Testes: nenhum código alterado; E2E e build: não executados

### 2026-10-18 · Andaime · revisão independente, ciclo 2: PEDE MUDANÇA (5 pendências de texto) e correção
- Autor: orquestrador · Verificador: revisor-de-plano (instância nova) · Veredito: PEDE MUDANÇA (nenhuma estrutural)
- Pendências: gates P14.S3 e P26.S7 ausentes no MESTRE; resíduos de "verificador marca [x]"; resíduos do voo de teste em P12; auditor-de-vazamento com Write; P06 médio x tabela do protocolo; `viewForPlayer` e `rng` fixo no par verdade/blefe; regra de ondas do `plano:check`; legenda de P08 só religada em P11.S8/P14.S5; contagem de templates (cinco).
- Correção aplicada e conferida **mecanicamente pelo orquestrador** (grep dos resíduos e regeneração do MESTRE/RASTREIO: 27 planos, 144 subplanos, 79 IDs, sem ciclos). **Não houve terceira revisão independente**: o limite do protocolo é 2 ciclos e as correções eram só de texto; fica registrado como exceção para o Alexandre decidir se quer uma revisão adicional.
- Observação: "140 subplanos" na primeira entrada deste registro é histórico; o número atual é 144.
- Commit: ver `git log` (mensagem `docs(plano): ...`) · Testes: nenhum código alterado; E2E e build: não executados
