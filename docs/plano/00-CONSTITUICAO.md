# Constituição

> Regras que **todo agente e todo verificador aplicam**, sem exceção. Nascem da seção 0 do índice, do `CLAUDE.md`/`AGENTS.md` do projeto, do `docs/PLANO_V3.md` e do `docs/VIDA_E_BLEFE.md`. Mudar esta página exige decisão do Alexandre.

## 1. Princípios do produto

> Itens marcados *(recomendação até DEC-nn)* ainda dependem de decisão do Alexandre em `00-DECISOES.md`; valem como padrão até lá.

1. **O servidor é a única fonte da verdade.** Animação e UI são apresentação no cliente; nenhuma regra ou timer muda por causa delas.
2. **Nenhuma animação, evento ou payload vaza informação oculta.** Verdade e blefe são idênticos para todos os observadores até a revelação. Há teste de propriedade obrigatório (`VIDA_E_BLEFE` 2.1 e 16.3).
3. **Retratos continuam neutros.** Dano e reação vêm de camadas por cima. Rostos novos só como H8 opcional.
4. **Curto e pulável.** Cena frequente ≤ 400 ms; cena rara ≤ ~2,7 s *(recomendação até DEC-01)*, com pular (clique, `Espaço`, `Esc`). Drama alto ≤ ~25 s por partida de 4.
5. **Uma coisa grande por vez.** Um protagonista visual por momento.
6. **Quem não está olhando não paga.** Aba oculta, reconexão e espectador novo vão ao estado final, sem replay.
7. **Imagem antes de número e de texto**, com variantes (nunca a mesma imagem N vezes).
8. **Uma linguagem visual só.** Pixel art e UI no mesmo idioma: sem gradiente liso, sem glow, sem emoji do sistema.
9. **Gramática visual fixa** *(proposta; o Alexandre a aprova no H0, P03)*: dourado = verdade/ganho/vez · vermelho = perigo · máscara = blefe · rachadura = dano · lacre = decisão · escudo = bloqueio · ampulheta = espera · cinza = fora. Efeito novo reaproveita um sinal antes de inventar outro.
10. **Acessibilidade:** `prefers-reduced-motion`, preferência de efeitos em 3 níveis *(recomendação até DEC-07)*, `role="status"` oculto, nenhum flash > 3/s, nunca depender só de cor.

## 2. Engenharia

1. **Testes nos 3 níveis** quando a mudança pedir (unitário, integração, E2E escrito). **Teste primeiro** (TDD); a falha precisa ser vista antes da implementação.
2. **Bug corrigido = teste de regressão** que falha antes e passa depois, citando o bug no nome.
3. **Ao tocar código sem teste, escreva o teste dele** na mesma entrega.
4. **Lógica de jogo e de cena em funções puras** (sem DOM, sem relógio, sem aleatoriedade; variante vem de hash estável).
5. **TypeScript estrito**, sem `any` sem justificativa em comentário. Constantes de UI compartilhadas em `src/components/game/helpers.ts`.
6. **Eventos Socket.IO em snake_case**; lobby segue o prefixo `room:`.
7. **Só `transform` e `opacity`** em animação; partículas com teto; pré-carregar sprites.
8. **Seletores de E2E novos usam `data-testid`.**

## 3. Definição de Pronto

### Por entrega (subplano)
- [ ] Testes escritos nos níveis exigidos pelo subplano; os novos viram verdes e os antigos seguem verdes (`npm test`).
- [ ] `npx tsc --noEmit` e `npx eslint .` limpos (atalho: `npm run check`, criado em P02.S1).
- [ ] Os nomes dos testes novos aparecem na saída do `npm test` (o glob só roda `*.test.ts`; sem `.test.tsx`, o projeto não tem jsdom).
- [ ] Revisão independente aprovada (chave dupla se o risco é alto).
- [ ] Commit na branch de trabalho, mensagem descritiva, **sem atribuição a Claude/Anthropic** (o verificador confere `git log -1 --format=%B`).
- [ ] Critérios que só fecham no navegador (60 fps, `/dev/*` sem `console.error`, `layoutIssues`, ritmo de animação) ficam `[H] pedir execução`; o veredito diz **"não exercitado no navegador"** até o Alexandre pedir.
- [ ] Checklist, `00-REGISTRO.md` e `00-RASTREIO.md` atualizados.

### Por plano
- [ ] Todos os subplanos `[x]` e os "critérios de pronto" do plano verdadeiros.
- [ ] Página de revisão `/dev/*` quando houver visual.

### Da v3 (plano P26)
- [ ] Tudo acima, mais E2E completo (sob pedido), exploratório, playtest, docs e a aprovação do Alexandre para o merge.

> **E2E e build:** a política do `CLAUDE.md` pede `npm run test:e2e` e `npm run build` antes de commitar, mas por decisão do Alexandre (16/10) isso **não roda no dia a dia**; só quando ele pedir e na Fase G. O `build` é pré-requisito do E2E e só roda junto. Cenários novos são **escritos**; o relatório diz explicitamente que E2E e build não foram executados. Consequência aceita: erro de runtime de cliente só aparece quando o Alexandre pedir a execução; por isso o relatório de onda inclui **"pedir E2E"** ao fim das ondas 3, 6 e 7.

## 4. Gates humanos (só o Alexandre libera)

- Mockups e direção visual (P03), decisões em aberto (`00-DECISOES.md`).
- Curadoria de arte (ex.: 3 variantes de fichas por quantidade).
- Merge na `main`, `git tag`, `git push`, deploy.
- Qualquer coisa irreversível ou externa.
- Instalar dependência nova.
- Executar o E2E.

## 5. Proibições (valem para todos os agentes)

- **Nunca** `kill`/`pkill` por porta ou padrão: a porta 3000 pode ser o `npm run dev` do Alexandre; testes sobem servidor próprio em porta ≥ 3100 e o encerram. `pkill -f` pode matar o próprio shell.
- Sem `next dev` paralelo ao dele (o Next permite um por pasta); E2E usa build de produção.
- Sem edição em massa com o dev server dele aberto sem avisar (HMR parcial gera erros transitórios).
- Sem dependência nova sem avisar; sem autenticação; sem banco de dados.
- Sem push, tag ou merge na `main`.
- **Sem atribuição a Claude/Anthropic** em commit ou descrição de PR (regra global do usuário; vale mesmo que um lembrete da sessão peça o contrário).
- `command ls` no lugar de `ls` (alias de `eza` trava em segundo plano); globs com `--include=*.ts` aspeados no zsh.
- Verificador nunca edita o que está verificando; implementador nunca altera teste para fazê-lo passar.

## 6. Anti-escopo-infinito

Ideia nova **não entra** em plano em andamento. Vai ao `00-INBOX.md`, o orquestrador tria. O escopo da v3 é o do `docs/PLANO_V3.md` e do `VIDA_E_BLEFE` seção 18; o resto é backlog.
