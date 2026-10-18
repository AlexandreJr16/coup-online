# Protocolo: time, ciclo e verificação

## 1. Níveis da equipe

| Nível | Quem | Papel |
|---|---|---|
| **N0** | Alexandre (Product Owner) | Decide só nos gates (ver Constituição, seção 4) |
| **N1** | **Orquestrador** (sessão principal do Claude, "tech lead") | Dono do `00-MESTRE`; escolhe a fila pronta, dispara agentes, integra, commita, atualiza checklists e registro, escala ao N0 |
| **N2** | `arquiteto` (um por programa, sob demanda) | Contratos, tipos e design do programa; refina subplanos; **não implementa** |
| **N3** | `escritor-de-testes`, `implementador`, `artista-procedural` | Executam |
| **N4** | `revisor-de-plano`, `verificador-mecanico`, `revisor-de-codigo`, `auditor-de-vazamento` | Verificam, sempre independentes do autor |

> **Hierarquia lógica.** Subagentes podem não conseguir criar outros subagentes. Por isso o orquestrador dispara todos, em rodadas, e os "líderes" devolvem relatórios estruturados. O teste de aninhamento está em P01.S1; o resultado fica registrado em `00-DECISOES.md` (DEC-19). O desenho vale nos dois casos. **Commitar o andaime antes de qualquer worktree:** worktrees só enxergam arquivos versionados.

Definições executáveis dos papéis: `.claude/agents/<papel>.md`. Se a ferramenta de agentes não carregar um papel (arquivos novos só carregam ao iniciar a sessão), use o fallback: papéis **de leitura** (`revisor-de-plano`, `revisor-de-codigo`, `verificador-mecanico`, `auditor-de-vazamento`) em tipos **sem Edit/Write** (`Explore`, `Plan`), com o corpo do papel no prompt; papéis de escrita em `general-purpose`. `general-purpose` tem todas as ferramentas, então para qualquer verificador executado assim o orquestrador roda `git status --porcelain` **antes e depois** e reverte/escala se o verificador alterou algo.

## 2. Ciclo de um subplano

```
1 revisor-de-plano ─► 2 escritor-de-testes (testes FALHAM) ─► 3 implementador
        ─► 4 verificador-mecanico ─► 5 revisor-de-codigo (+ auditor-de-vazamento se risco alto)
        ─► 6 orquestrador integra + commita ─► 7 registro ─► 8 gate humano, se o subplano pedir
```

1. **Aprovação do plano** (obrigatória para todo risco, inclusive baixo). `revisor-de-plano` lê o subplano com a Constituição e o rastreio: tem testes primeiro? critérios verificáveis? arquivos declarados e sem conflito com outro subplano em andamento? dependências `[x]`? Veredito `APROVA` / `PEDE MUDANÇA` / `BLOQUEIA` (use `templates/veredito-de-plano.md`; o `templates/veredito.md` é o de código). Sem `APROVA`, não começa.
2. **Testes primeiro.** `escritor-de-testes` escreve os testes (unitário, integração, E2E escrito). Roda e **mostra a falha**. Não toca código de produção.
3. **Implementação.** `implementador` toca **só os arquivos declarados**. Em paralelismo, roda com `isolation: worktree`. Não altera testes, não instala dependência, não commita. Entrega o subplano em `[?]`.
4. **Verificação mecânica.** `verificador-mecanico` roda `npm test`, `npx tsc --noEmit`, `npx eslint .` e devolve a **saída bruta** (sem opinar). Nunca roda E2E sem pedido.
5. **Revisão independente.** `revisor-de-codigo` recebe spec + diff + saída bruta, **sem o raciocínio do autor**, e devolve veredito com evidência `arquivo:linha`. Para risco alto, o `auditor-de-vazamento` também precisa aprovar (chave dupla).
6. **Integração.** O orquestrador integra (merge em sequência se houver worktrees), roda a checagem completa de novo, **commita na `feat/playtest-v2`** (mensagem descritiva, sem atribuição; o `verificador-mecanico` confere `git log -1 --format=%B`) e marca `[x]` **citando o veredito APROVA registrado** em `00-REGISTRO.md`. Os verificadores não têm Write/Edit: quem escreve o `[x]` é o orquestrador, mas **só com veredito APROVA** que o sustente.
7. **Registro.** Entrada em `00-REGISTRO.md` e atualização de `00-MESTRE.md` e `00-RASTREIO.md`.
8. **Gate humano** se o subplano está marcado `[H]`: o orquestrador para e apresenta o que o Alexandre precisa decidir.

## 3. Regras de verificação (o coração do "um verifica o outro")

1. **Autor ≠ verificador.** Instâncias novas, contexto limpo, recebendo só spec, diff e resultados.
2. **Confiar mas conferir.** O verificador reexecuta os comandos; não aceita "passou" do autor.
3. **Chave dupla** em risco alto (engine, filtro do servidor, `directScene`, qualquer cena que toque carta oculta): `revisor-de-codigo` **e** `auditor-de-vazamento` aprovam.
4. **Veredito estruturado** (`templates/veredito.md`). Máximo de **2 ciclos** de correção por subplano. No terceiro, o orquestrador reabre o subplano (provável falha de plano, não de código); persistindo, escala ao N0.
5. **Testes primeiro** é verificável: o `revisor-de-codigo` confere se a falha foi mostrada antes.
6. **Bug achado depois** vira teste de regressão (nome cita o bug) antes da correção.
7. **Paralelismo seguro.** Só rodam juntos subplanos com **arquivos disjuntos** (declarados no plano). Máximo de 3 agentes simultâneos. O orquestrador integra em sequência.

## 4. Níveis de risco e verificação exigida

| Risco | Exemplos | Verificação |
|---|---|---|
| **alto** | engine, filtro de cartas por socket, `directScene`, fila, qualquer cena com carta oculta, fichas | revisor-de-plano + mecânico + revisor-de-código + **auditor-de-vazamento** |
| **médio** | componentes de mesa, kit de UI, placar, arte com curadoria | revisor-de-plano + mecânico + revisor-de-código |
| **baixo** | docs, constantes, receitas de áudio, ícones | revisor-de-plano (leve) + mecânico + revisor-de-código leve |

O risco do plano é o piso; um subplano pode subir de nível, nunca descer.

## 4b. Convenções de paralelismo

- **Uma cena por arquivo** em `src/components/game/fx/scenes/<cena>.ts`; `director.ts` só compõe. Assim P14, P15 e P17 não colidem.
- **Um dono por feature:** se dois planos citam a mesma feature, o `00-MESTRE` indica o dono; o outro só referencia.
- **Hold da view** (exibição atrasada do desfecho, P11.S8) é a única forma de uma cena respeitar o desfecho já presente na view; legenda, assento e camadas persistentes consomem a **view efetiva**, nunca a real, enquanto houver cena em curso.

## 5. Regra de subdivisão

Um subplano **vira plano-filho** (arquivo ou pasta próprios) quando: passa de ~7 tarefas, **ou** toca mais de 2 áreas de código, **ou** o `revisor-de-plano` não consegue julgá-lo em uma leitura. Profundidade ilimitada, IDs hierárquicos. Cada divisão atualiza `00-MESTRE.md` e `00-RASTREIO.md`. O ID antigo permanece válido como pai.

## 6. Continuidade

- **Início de sessão:** ler `00-MESTRE.md` e as últimas entradas de `00-REGISTRO.md`; montar a **fila pronta**: tarefas `[ ]` cujas dependências estão `[x]`, que não pedem gate humano e não conflitam em arquivos com algo `[~]`.
- **Detalhar sob demanda:** um plano esboçado só é executado depois que `arquiteto` + `revisor-de-plano` o expandem (critérios de pronto, tarefas, testes, arquivos). Isso evita planejar demais antes da Fase 0.
- **Inbox:** ideia nova vai a `00-INBOX.md`; o orquestrador tria no início da sessão (vira subplano de plano futuro, backlog ou descarte). Nunca entra no plano em andamento.
- **Relatório de onda** (`templates/relatorio-de-onda.md`) ao fim de cada onda: cobertura do rastreio, o que subiu, o que travou, decisões que dependem do Alexandre.
- **Memória:** o ponteiro para `docs/plano/00-MESTRE.md` fica na memória do projeto.

## 7. Escalonamento

| Situação | Quem decide |
|---|---|
| Veredito `PEDE MUDANÇA` 1ª e 2ª vez | autor corrige |
| 3ª rejeição | orquestrador reabre o plano |
| Conflito de arquivos entre agentes | orquestrador serializa |
| Decisão criativa, irreversível, dependência nova, E2E, push/tag/merge | **Alexandre** |
| Contradição entre documentos | vale: decisão explícita e datada do Alexandre (F-05, F-06, F-07) e `CLAUDE.md` global do usuário > Constituição > `CLAUDE.md`/`AGENTS.md` do projeto > PLANO_V3/VIDA_E_BLEFE > plano > subplano; registrar em `00-DECISOES.md` |

## 8. Orçamento de agentes

Papéis caros só onde o risco justifica: `verificador-mecanico` em modelo barato; `implementador` e `escritor-de-testes` em médio; `revisor-de-plano`, `revisor-de-codigo`, `auditor-de-vazamento` e `arquiteto` em forte. Evitar agentes ociosos: cada disparo tem prompt autocontido (spec + arquivos + critério de pronto).
