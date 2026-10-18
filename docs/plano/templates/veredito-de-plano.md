# Veredito de plano

- **Subplano:** Pnn.Sx · **Revisor:** revisor-de-plano · **Ciclo:** 1 | 2 | 3
- **Recebeu:** o subplano, `00-RASTREIO.md`, `00-DECISOES.md`, a Constituição. Não roda comandos de teste.

## Resultado: APROVA | PEDE MUDANÇA | BLOQUEIA

## Checklist (cada item com evidência `arquivo:linha`)

- [ ] Objetivo de uma frase; IDs do índice corretos
- [ ] Dependências `[x]` e decisões bloqueantes resolvidas
- [ ] Testes primeiro nos 3 níveis; E2E marcado "escrito, não executado"; nada depende de jsdom/testing-library
- [ ] Critérios de pronto verificáveis (os que exigem navegador estão `[H] pedir execução`)
- [ ] Arquivos tocados declarados e sem conflito com subplanos `[~]`; uma cena por arquivo
- [ ] Risco >= o do plano; chave dupla prevista quando alto
- [ ] Autor e verificador são papéis diferentes
- [ ] Constituição respeitada; funções e arquivos citados existem (Grep)
- [ ] <= ~7 tarefas
- [ ] Gates `[H]` marcados e espelhados no `00-MESTRE.md`

## Achados

| # | Gravidade | Evidência | O que está errado | Correção sugerida |
|---|---|---|---|---|
