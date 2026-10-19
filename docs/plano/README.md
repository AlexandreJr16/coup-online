# docs/plano: como ler e como operar

Este diretório é o **sistema de planejamento contínuo** do Coup Online. Ele transforma as 79 ideias (IDs) de `docs/IDEIAS_ANIMACAO_E_EXPERIENCIA.md` em um trabalho hierárquico, verificável e retomável por qualquer sessão ou agente.

## Em 1 minuto

1. **Comece por [`00-MESTRE.md`](00-MESTRE.md):** a árvore do todo (27 planos, 144 subplanos), o painel e as ondas.
2. **Regras:** [`00-CONSTITUICAO.md`](00-CONSTITUICAO.md) (inegociáveis) e [`00-PROTOCOLO.md`](00-PROTOCOLO.md) (papéis, ciclo, verificação).
3. **Estado:** [`00-REGISTRO.md`](00-REGISTRO.md) é o log append-only; as últimas entradas dizem onde paramos.
4. **Decisões:** [`00-DECISOES.md`](00-DECISOES.md). Nenhum plano que dependa de decisão aberta começa sem ela.
5. **Ideia nova?** Só em [`00-INBOX.md`](00-INBOX.md). Nunca dentro de um plano em andamento.
6. **Cobertura:** [`00-RASTREIO.md`](00-RASTREIO.md) liga cada ID do índice a um plano.

## Estrutura

```
00-MESTRE.md  00-CONSTITUICAO.md  00-PROTOCOLO.md  00-DECISOES.md
00-REGISTRO.md  00-INBOX.md  00-RASTREIO.md
planos/Pnn-*.md        um arquivo por plano (vira pasta Pnn-*/ se for subdividido)
templates/             plano, subplano, veredito, veredito-de-plano, relatório de onda
```

Os papéis dos agentes estão em `.claude/agents/` (na raiz do repositório).

## Convenções

- **IDs hierárquicos e imutáveis:** `P14` → `P14.S2` → `P14.S2.T3` (e `P14.S2.a.T1` se subdividir).
- **Estados:** `[ ]` a fazer · `[~]` em andamento · `[?]` aguardando verificação · `[x]` verificado e commitado · `[!]` bloqueado · `[H]` gate humano.
- **`[x]` exige veredito APROVA registrado.** O autor chega no máximo a `[?]`; o orquestrador marca `[x]` citando o veredito (verificadores não têm Write/Edit).
- **`00-MESTRE.md` é a fonte do estado**; os arquivos de plano detalham e devem ficar sincronizados.
- **Gate humano `[H]`** = decisão criativa ou irreversível; só o Alexandre libera.

## Como retomar com o Claude

> "Leia `docs/plano/00-MESTRE.md` e `00-REGISTRO.md` e execute a próxima onda pronta."

O orquestrador pega a **fila pronta** (tarefas `[ ]` com dependências `[x]`, sem gate humano e sem conflito de arquivos) e segue o ciclo do protocolo.
