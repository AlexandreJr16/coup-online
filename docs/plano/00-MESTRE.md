# Plano mestre: o todo

> Porta de entrada do trabalho contínuo. **Leia este arquivo e as últimas entradas de `00-REGISTRO.md` ao começar qualquer sessão.**
> Criado em 18/10/2026. Estados: `[ ]` a fazer · `[~]` em andamento · `[?]` aguardando verificação · `[x]` verificado e commitado · `[!]` bloqueado · `[H]` gate humano.
> `[x]` exige veredito APROVA registrado em `00-REGISTRO.md` (o orquestrador marca). Detalhe do protocolo em `00-PROTOCOLO.md`; regras em `00-CONSTITUICAO.md`.

## Painel

- Planos: 0 de 30 concluídos · Subplanos: 0 de 158 concluídos
- Onda atual: **0** (fundação) · Próximo gate humano: **P03** (mockups e decisões)

## Árvore (planos e subplanos)

### Programa 0 Fundação

- [~] **[P00](planos/P00-constituicao.md) Constituição e governança** · onda 0 · risco baixo
  - [~] P00.S1 Carta de princípios (seção 0 do índice)
  - [~] P00.S2 Definição de Pronto por tipo de entrega
  - [~] P00.S3 Gates humanos e proibições
  - [~] P00.S4 Templates de plano, subplano, veredito e relatório de onda
- [~] **[P01](planos/P01-times-de-agentes.md) Times de agentes e protocolo** · onda 0 · risco médio
  - [~] P01.S1 Definições dos 8 papéis em .claude/agents/ e teste de aninhamento de subagentes
  - [ ] P01.S2 Voo de teste do ciclo completo numa tarefa pequena
  - [ ] P01.S3 Ajuste do protocolo com as lições do voo
  - [ ] P01.S4 Cadência de sessão (fila pronta, relatório de onda)
- [ ] **[P02](planos/P02-infra-de-qualidade.md) Infra de qualidade** · onda 0 · risco médio
  - [x] P02.S1 Script npm run check e glob de testes (sentinela em tools/)
  - [x] P02.S2 Fixtures de GameView (mãos A/B, fases, lastChallenge)
  - [x] P02.S3 Harness do teste de propriedade de vazamento (16.3)
  - [x] P02.S4 Script de cobertura do rastreio e de ciclos no grafo
- [ ] **[P03](planos/P03-fase0-mockups-e-decisoes.md) Fase 0: mockups e decisões** · onda 1 · risco médio · `[H]`
  - [ ] P03.S1 Mockup do kit de UI e do cabeçalho (1280x720 e 1920x1080) `[H]`
  - [ ] P03.S2 Mockup da mesa com 2 e 4 jogadores `[H]`
  - [ ] P03.S3 Mockup do dock em 3 variações `[H]`
  - [ ] P03.S4 Mockup da tela de vitória e da colinha `[H]`
  - [ ] P03.S5 Protótipos de movimento H0 (Assassinar e duelo) em /dev/cenas `[H]`
  - [ ] P03.S6 Teste de uma tarde das expressões (opcional) `[H]`
  - [ ] P03.S7 Rodada de decisões 1-12 com o Alexandre e congelamento do escopo `[H]`

### Programa A Linguagem visual

- [ ] **[P04](planos/P04-kit-de-ui.md) Kit de UI, tokens e fonte** · onda 2 · risco médio
  - [x] P04.S1 Tokens (paleta reduzida, bordas chapadas, sombra dura)
  - [x] P04.S2 Fonte escolhida na Fase 0 em layout.tsx
  - [x] P04.S3 PixelPanel, PixelButton, IconButton, Tag
  - [ ] P04.S4 Migrar home, lobby e header para o kit
  - [ ] P04.S5 Remover game-btn, corner-btn, repo-link legados e conferir por busca
- [ ] **[P05](planos/P05-arte-de-ui.md) Arte de UI** · onda 2 · risco médio
  - [x] P05.S1 Lista de arte e método por peça (script ou mão) em tools/art/README.md
  - [x] P05.S2 Gerador de ícones de UI
  - [x] P05.S3 Logo e favicon `[H]`
  - [x] P05.S4 Ícones de prêmios e registro em ICONS_AVAILABLE
  - [ ] P05.S5 Zero emoji do sistema (busca em src/ e app/)
- [ ] **[P06](planos/P06-escala.md) Escala em degraus inteiros** · onda 2 · risco médio
  - [x] P06.S1 Unidade de escala e hook
  - [x] P06.S2 Aplicar em Card DIMS, Seat e DOCK_HEIGHT
  - [x] P06.S3 layoutIssues nas 4 resoluções (teste escrito)
- [ ] **[P27](planos/P27-aba-de-aparencia.md) Aba de Aparência (jogador escolhe)** · onda 3 · risco médio
  - [x] P27.S1 Preferências de aparência puras (fonte, estilo, dock) com padrão, validação e storage protegido
  - [x] P27.S2 Tokens por tema: estilo A (madeira e latão) e B (pergaminho e tinta) como conjuntos de variáveis
  - [x] P27.S3 As 4 fontes pixel carregadas sem pesar (preload só da escolhida)
  - [ ] P27.S4 Aba de configurações no HUD (abre como peça do kit) com prévia ao vivo
  - [ ] P27.S5 Dock em 3 variações selecionáveis (cavalete, mão sobre a mesa, bandeja) sobre as 3 zonas fixas
  - [ ] P27.S6 Gancho para a linha de efeitos (completo, reduzido, desligado) do P11.S6

### Programa B Mesa

- [ ] **[P07](planos/P07-fichas.md) Fichas** · onda 3 · risco alto
  - [x] P07.S1 Gerador procedural fichas.ts com seed fixa
  - [ ] P07.S2 Curadoria de 3 variantes por quantidade `[H]`
  - [x] P07.S3 chipSprite(count, playerId) com testes
  - [x] P07.S4 Pilha no assento e montes no Erário
  - [ ] P07.S5 Animações pop, voo e desmoronar
  - [ ] P07.S6 Hover na pilha (E8), fichas fantasma, fichas que pousam (E9) e aviso de 10+ (dono único)
- [ ] **[P08](planos/P08-informacao-no-assento.md) Informação no assento e no centro** · onda 3 · risco médio
  - [x] P08.S1 Legenda curta no centro (reusa deriveRoundStatus e timeoutWarning)
  - [x] P08.S2 Cabeçalho sem texto de status e role=status oculto
  - [x] P08.S3 Balão da jogada sobre o assento
  - [x] P08.S4 Marca de quem a mesa espera
  - [ ] P08.S5 Baralho por faixa e Erário com baú
  - [ ] P08.S6 Histórico de Intrigas no kit
  - [ ] P08.S7 Dígitos do relógio em sprite
- [ ] **[P09](planos/P09-dock.md) Dock imersivo** · onda 3 · risco médio
  - [ ] P09.S1 Casca do dock sem fundo de largura total (variação escolhida)
  - [ ] P09.S2 Ações básicas como selos sobre a madeira
  - [ ] P09.S3 Reações como selos perto da jogada
  - [ ] P09.S4 Chave de passar automático e dicas de tecla menores
  - [ ] P09.S5 Alvos de 44 px e atalhos C, B, Espaço intactos
- [ ] **[P10](planos/P10-microanimacoes.md) Microanimações de intuição** · onda 5 · risco médio
  - [ ] P10.S1 Hover na carta da mão com custo e ganho (E7; as fichas fantasma são de P07.S6)
  - [ ] P10.S2 Mira com linha pontilhada e alvo escolhido (E2, E12)
  - [ ] P10.S3 Botão que clica e ação inválida balança (E4, E5)
  - [ ] P10.S4 Mão que respira (E6)
  - [ ] P10.S5 Carta que sai e volta do baralho, quem passou (E10, E11); E8 e E9 vivem em P07

### Programa C Vida e blefe

- [ ] **[P11](planos/P11-motor-de-cenas.md) Motor de cenas** · onda 4 · risco alto
  - [x] P11.S1 Tipos Beat, Cena e Alvo
  - [ ] P11.S2 events.ts estendido com os eventos que faltam
  - [x] P11.S3 directScene (puro) com projeção pública
  - [x] P11.S4 Fila: prioridade, coalescência, pular, document.hidden
  - [ ] P11.S5 CamadaDeCena (executor)
  - [~] P11.S6 Preferência de efeitos (3 níveis) e reduced motion
  - [ ] P11.S7 Página /dev/cenas
  - [x] P11.S8 Hold da view: exibição do desfecho atrasada até o beat do veredito (view efetiva usada por legenda, assento e DOM)
  - [ ] P11.S9 Teste do orçamento de drama alto (<= ~25 s) numa partida simulada
- [ ] **[P12](planos/P12-estados-persistentes.md) Estados persistentes** · onda 5 · risco médio
  - [ ] P12.S1 seatWear puro com testes de limiar
  - [ ] P12.S2 Moldura machucada (A1)
  - [ ] P12.S3 Cartas perdidas ao lado do assento (A2)
  - [ ] P12.S4 Selos de ameaça (A3)
  - [ ] P12.S5 Medalhão, luz da vez e anel de tempo (A4, A5, A6, E1)
  - [ ] P12.S6 Jogador ausente (A7)
  - [ ] P12.S7 Estados extras de moldura (A9, depois)
- [ ] **[P13](planos/P13-declaracao-e-tensao.md) Declaração e tensão** · onda 5 · risco alto
  - [ ] P13.S1 Declaração tell-free (B1)
  - [ ] P13.S2 Ampulheta, vinheta e batida por tempo restante (B2, E3)
  - [ ] P13.S3 Teste de propriedade de vazamento para declaração e tensão
- [ ] **[P14](planos/P14-duelo.md) Duelo e veredito** · onda 6 · risco alto
  - [ ] P14.S1 Derivação lastChallenge para eventos
  - [ ] P14.S2 Cena duelo no directScene com 3 variantes
  - [ ] P14.S3 Executor visual Duelo.tsx `[H]`
  - [ ] P14.S4 Veredito verdade e blefe (carimbos, máscara, tremor)
  - [ ] P14.S5 Segurar a exibição do desfecho (view efetiva até o veredito)
  - [ ] P14.S6 Pular e liberação da escolha de carta (função pura)
  - [ ] P14.S7 Teste de propriedade de vazamento com pares gerados pela engine
  - [ ] P14.S8 Movimento reduzido e document.hidden
  - [ ] P14.S9 Cenário E2E escrito
- [ ] **[P15](planos/P15-troca-bloqueio-perigo.md) Troca visível, bloqueio e perigo duplo** · onda 6 · risco alto
  - [ ] P15.S1 Troca visível da carta provada (B7)
  - [ ] P15.S2 Bloqueio com escudo (B8)
  - [ ] P15.S3 Perigo duplo (B9)
  - [ ] P15.S4 Teste de propriedade de vazamento
- [ ] **[P16](planos/P16-perda-exilio-vitoria.md) Perda, exílio, vitória e revanche** · onda 7 · risco médio
  - [ ] P16.S1 Perda de influência (C1)
  - [ ] P16.S2 Exílio: cena do barco (C2)
  - [ ] P16.S3 Veículos extras (C3, depois)
  - [ ] P16.S4 Vitória (C4)
  - [ ] P16.S5 Revanche (C5)
  - [ ] P16.S6 Exilado continua assistindo (C6, decisão 3)
- [ ] **[P17](planos/P17-assinaturas-das-acoes.md) Assinaturas das ações** · onda 6 · risco médio
  - [ ] P17.S1 Assassinar (D1)
  - [ ] P17.S2 Golpe de Estado (D2)
  - [ ] P17.S3 Taxas (D3)
  - [ ] P17.S4 Renda (D7)
  - [ ] P17.S5 Extorquir, Trocar e Ajuda Externa (D4, D5, D6, depois)
- [ ] **[P18](planos/P18-ambiente-e-social.md) Ambiente e social** · onda 8 · risco baixo
  - [ ] P18.S1 Plateia de espectadores (A8, F3)
  - [ ] P18.S2 Emotes (B11, F4, depois)
  - [ ] P18.S3 Lanternas e poeira (F1, F2, depois)
  - [ ] P18.S4 Início da partida (F5, opcional)
  - [ ] P18.S5 Ciclo de luz e música por IA (F6, F7, backlog)
- [ ] **[P19](planos/P19-audio-novo.md) Áudio novo** · onda 4 · risco baixo
  - [ ] P19.S1 gongo, batida, estilhaco, crack
  - [ ] P19.S2 clang, navalha, canhao, apito
  - [ ] P19.S3 clique e embaralhar
  - [ ] P19.S4 Mapeamento em useGameAudio e testes das receitas
- [ ] **[P20](planos/P20-arte-de-fx.md) Arte de FX** · onda 2 · risco médio
  - [x] P20.S1 Gerador base fx.ts e paleta mestra
  - [x] P20.S2 Dano, carimbos e duelo `[H]`
  - [ ] P20.S3 Bloqueio, tempo e ameaça `[H]`
  - [ ] P20.S4 Ações (navalha, canhão, mão, saquinho) `[H]`
  - [ ] P20.S5 Exílio (cais, mar, barcos, fumaça) `[H]`
  - [ ] P20.S6 Plateia, emotes, partículas e coroa `[H]`
  - [ ] P20.S7 Retrato que reage (G10, opcional H8) `[H]`

### Programa D Telas

- [ ] **[P21](planos/P21-fim-de-partida.md) Fim de partida** · onda 3 · risco médio
  - [x] P21.S1 Retrato do vencedor no PixelPanel
  - [x] P21.S2 Troféu e prêmios em ícones
  - [x] P21.S3 Botão de revanche grande com atalho
  - [x] P21.S4 Espaço do placar da noite
  - [ ] P21.S5 Animação leve de moedas/confete respeitando reduced motion (a cena de vitória do P16 vem depois)
- [ ] **[P22](planos/P22-colinha.md) Colinha como objeto** · onda 3 · risco baixo
  - [x] P22.S1 Peça única que abre como carta
  - [x] P22.S2 Retrato maior e ícones de contestável e bloqueável
  - [x] P22.S3 No máximo 5 regras curtas
  - [x] P22.S4 Cabe em 1280x720 sem rolagem
  - [x] P22.S5 Atalhos ? e Esc preservados

### Programa E Retenção

- [ ] **[P23](planos/P23-placar-e-medicao.md) Placar, títulos, revanche e medição** · onda 2 · risco médio
  - [x] P23.S1 Log JSON de revanches e linha de base (R7) `[H]`
  - [x] P23.S2 room.scoreboard e room:score (unit e integração) (R1)
  - [ ] P23.S3 Placar no fim de partida e no lobby
  - [ ] P23.S4 Revanche sem atrito (R2)
  - [x] P23.S5 Títulos da noite (R3)
- [ ] **[P24](planos/P24-ritmo-e-personalidade.md) Ritmo, personalidade e 2 jogadores** · onda 8 · risco médio
  - [ ] P24.S1 Ritmo: turno padrão e animações que atrasam (R4)
  - [ ] P24.S2 Algo para o eliminado fazer (R4)
  - [ ] P24.S3 Falas e bordões dos personagens (R5)
  - [ ] P24.S4 Pesquisa e decisão sobre 2 jogadores (R6) `[H]`

### Programa F Fechamento

- [ ] **[P25](planos/P25-pendencias-do-playtest.md) Pendências do playtest** · onda 2 · risco baixo
  - [ ] P25.S1 Estabilizar o teste de contestação (espera de 6 s) `[H]`
  - [ ] P25.S2 Cobertura da promoção de espectador no E2E `[H]`
  - [ ] P25.S3 LICENSE com o nome escolhido pelo Alexandre `[H]`
  - [ ] P25.S4 Cobertura da promoção de espectador na integração (verificar)
- [ ] **[P26](planos/P26-fechamento-v3.md) Fechamento final (release v3.2: animações)** · onda 9 · risco alto · `[H]`
  - [ ] P26.S1 E2E completo e checagens finais (só com pedido do Alexandre) `[H]`
  - [ ] P26.S2 Teste exploratório com objetivos `[H]`
  - [ ] P26.S3 Playtest com amigos (3 salas) e perguntas fixas (de quem é a vez, o que aconteceu, a contestação é o mais falado, mais uma?) `[H]`
  - [ ] P26.S4 Teste dos 3 segundos em 1280x720 e 1920x1080 `[H]`
  - [ ] P26.S5 Validação no ar do build final (branch ou serviço de teste no Render) `[H]`
  - [ ] P26.S6 Documentação e prints novos `[H]`
  - [ ] P26.S7 Merge na main, tag v3 e deploy (aprovação explícita) `[H]`
- [ ] **[P28](planos/P28-release-v3-0.md) Release v3.0: visual novo (mesclada na main em 18/10/2026)** · onda 3 · risco alto · `[H]`
  - [ ] P28.S1 E2E completo (feito: 68/68)
  - [ ] P28.S2 Merge na main (feito)
  - [ ] P28.S3 Tag v3.0, push e deploy (Alexandre)
  - [ ] P28.S4 Partida de teste com amigos no ar
- [ ] **[P29](planos/P29-release-v3-1.md) Release v3.1: mesa nova** · onda 3 · risco alto · `[H]`
  - [ ] P29.S1 E2E completo e layoutIssues nas 4 resoluções (só com pedido do Alexandre)
  - [ ] P29.S2 Teste dos 3 segundos em 1280x720 e 1920x1080
  - [ ] P29.S3 Partida de teste com amigos
  - [ ] P29.S4 Merge na main, tag v3.1 e deploy (aprovação explícita)

## Grafo de dependências

| Plano | Depende de |
|---|---|
| P00 | — |
| P01 | P00 |
| P02 | P00 |
| P03 | P00, P01 |
| P04 | P03 |
| P05 | P03 |
| P06 | P04 |
| P07 | P05, P06 |
| P08 | P04, P06, P07 |
| P09 | P04, P06 |
| P10 | P11, P07 |
| P11 | P02, P03, P06 |
| P12 | P11, P08 |
| P13 | P11, P08 |
| P14 | P13, P19, P20 |
| P15 | P14 |
| P16 | P12, P14, P20 |
| P17 | P11, P07, P20 |
| P18 | P12, P20 |
| P19 | P11 |
| P20 | P03 |
| P21 | P04, P05, P23 |
| P22 | P04 |
| P23 | P00 |
| P24 | P23 |
| P25 | — |
| P26 | todos os planos P03 a P29 |
| P27 | P04, P09 |
| P28 | P04, P05, P27 |
| P29 | P06, P07, P08, P09, P21, P22, P28 |

## Ondas

| Onda | Planos | Observação |
|---|---|---|
| 0 | P00, P01, P02 | fundação + voo de teste do protocolo |
| 1 | P03 | **gate humano**: mockups e decisões 1-12 |
| 2 | P04, P05, P06, P20, P23, P25 | kit, escala, arte de UI, gerador de FX, pendências, placar (servidor) |
| 3 | P07, P08, P09, P21, P22, P27, P28, P29 | v3.0 (visual novo: kit, aba de aparência, vitória, colinha) e v3.1 (mesa nova: escala, fichas, assento, dock) |
| 4 | P11, P19 | motor de cenas e áudio |
| 5 | P10, P12, P13 | persistentes, intuição, declaração e tensão |
| 6 | P14, P15, P17 | **duelo (maior risco)**, bloqueio e troca, assinaturas |
| 7 | P16 | perda, exílio e vitória (cenas) |
| 8 | P18, P24 | itens "se der tempo" e "depois" |
| 9 | P26 | **gate humano**: fechamento final e tag v3.2 |

## Notas de desenho

- **Mapeamento por frente de trabalho**, não por seção do índice; a rastreabilidade (`00-RASTREIO.md`) garante que nenhum ID fique sem dono.
- Aliases do índice: E1 = A4 (em P12), E3 = B2 (em P13), F3 = A8 e F4 = B11 (em P18). G10 (retrato que reage) vive em P20 como opcional.
- **Dono único por feature:** E8 (hover na pilha) e E9 (fichas que pousam) pertencem a P07; fichas fantasma e aviso de 10+ também. P10 só referencia.
- **Hold da view (P11.S8):** legenda (P08), `seatWear` (P12), estatísticas e DOM das cenas consomem a **view efetiva**, atrasada até o beat do veredito. O desfecho já vem na view recebida (ver P14), então só o hold impede o vazamento.
- **Uma cena por arquivo** em `fx/scenes/` (P13, P14, P15, P17), para permitir paralelismo na onda 6.
- **Critérios de navegador** (60 fps, `/dev/*` sem `console.error`, `layoutIssues`) são `[H] pedir execução`; relatório de onda pede E2E ao fim das ondas 3, 6 e 7.
- **Legenda e hold:** a religação da legenda de P08 à view efetiva é tarefa de P11.S8 / P14.S5.T3, não de P08 (que vem antes na onda 3).
- **Aviso de 10+:** o aviso na pilha de fichas (G5) é de P07; o selo de alvo pulsando no assento (A3) é de P12. Mesmo limiar, sinais diferentes; um não substitui o outro.
- **Regra de ondas:** onda da dependência <= onda do plano (pode ser igual, ordenando dentro da onda).
- **Voo de teste do protocolo:** P02.S1 e depois P02.S4 (não P12.S1, que depende de P11 e P08).
- Ordem das ondas segue o `docs/PLANO_V3.md` (0, A, B, C, H, D, E, F, G).
- Plano que crescer demais **se divide** (`00-PROTOCOLO.md`, regra de subdivisão); IDs são hierárquicos e imutáveis.
