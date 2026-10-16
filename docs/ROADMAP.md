# Roadmap v2 — Arte, áudio e fluidez (plano executável)

Base: tag `v1` (commit `14cfb45`). Este plano substitui o roadmap v1.

## Testes (política no `CLAUDE.md`)
Unitário + integração (`npm test`, 106 testes) e E2E de navegador (`npm run test:e2e`, 20 cenários) valem como parte do "pronto" de **toda** fase. O E2E já pegou um bug de layout real (6 jogadores em 1280×720) que build, lint e tipos não pegaram.

## Como executar (regras)
- O Alexandre diz **"faz a Fase X"**. O Claude implementa, roda `npm test` e `npm run lint`, e apresenta o resumo do diff.
- **Nada é commitado sem o Alexandre revisar o diff** (AGENTS.md). Depois da aprovação, um commit descritivo por fase (sem atribuição de ferramenta na mensagem).
- Dependência nova: avisar qual e por quê antes de instalar. Libs de animação/WebGL já foram aceitas em princípio.
- Engine (trilha F): **TDD**. Teste falhando primeiro, depois a implementação.
- Regra arquitetural inegociável: o servidor é a única fonte da verdade; o cliente nunca recebe carta alheia.

Legenda: 🤖 autônomo · 👤 precisa do Alexandre · 🤝 misto (Claude executa, humano aprova).

## Decisões fechadas
| Tema | Decisão |
|---|---|
| Época | Brasil Império (1822–1889) |
| Personagens | Barão do Café, **Capoeira**, Coronel da Guarda Nacional, Regatão, Benzedeira (ids internos inalterados) |
| Capoeira | Tratado com dignidade: malandro carismático, ginga, calça branca, lenço colorido, navalha. Nada de estereótipo de "bandido genérico" |
| Paleta | Mestra **v2, 38 cores** (abaixo; fonte única em `tools/art/palette.json`). Decidido no spike |
| Resolução | **Retrato 88×124 nativo** (carta lg em 1:1) e miniatura **40×56** (carta sm). 44×62 foi descartado: o rosto ficou ilegível (ver `docs/SPIKE_ARTE.md`) |
| Temas | Arte organizada por tema (`public/art/<tema>/...`) para permitir trocar o estilo e fazer teste A/B depois |
| Música | Trilha **procedural por código** como placeholder já na Fase 5. Faixas por IA substituem depois (Fase 8) |
| Gerador de imagem | **stable-diffusion.cpp (Vulkan) + SDXL base + LoRA pixel-art-xl**, local na RX 6600 (~80 s por imagem). Decidido no spike |

### Paleta mestra v2 (38 cores)
v0 tinha 32; faltavam marrons médios (+4 na v1) e cobres (+2 na v2: peles terracota caíam no vermelho).
- Tinta/neutros: `#14101a #2b2236 #4a3d5c #7c6f8a #bdb0a6 #f6ecd6`
- Pele/madeira: `#3a2218 #4e2f20 #5e3a26 #734630 #8a5535 #a0643d #b87a48 #cd9358 #dba26c #efc89a`
- Vermelhos: `#5c1620 #9a2a2a #d0453a #f08a5d`
- Dourados: `#8a5a14 #d9a028 #f7d56a`
- Verdes: `#1f3a2a #2f6b45 #6aa84f #b5d86a`
- Azuis: `#1a2a4a #2f5d9a #4aa3c7 #a8dce0`
- Roxos: `#3b1f52 #7b3f8f #c58ad0`
- Extras: `#e8743b #fffaf0`

## Ambiente de GPU (diagnóstico feito)
- GPU: **Navi 23 (RX 6600)**, ~8,5 GB de VRAM.
- Instalado: `mesa` e `vulkan-radeon`. **Sem ROCm/HIP.** Python do sistema: 3.14 (provavelmente novo demais para PyTorch/ROCm; usar venv com Python mais antigo).
- **Resultado do spike: o caminho 1 funcionou** (stable-diffusion.cpp + Vulkan, sem ROCm). ComfyUI/ROCm e geradores online não foram necessários. Detalhes e setup: `docs/SPIKE_ARTE.md` e `tools/art/README.md`.

## Fases

### Fase 0 — Higiene 🤖
- [ ] `npm install` e `npm test` verdes (baseline de 22 testes)
- [ ] `AGENTS.md`: remover "sem testes", corrigir `lib/game/rules.ts` → `src/lib/game/engine.ts`
- [ ] `DESIGN.md`: refletir Cinzel, pixel art e a direção Brasil Império; remover fase `aguardando_jogadores` inexistente
- [ ] `<html lang="pt-BR">` em `app/layout.tsx`
- [ ] Centralizar a constante `CINZEL` (hoje repetida em ~7 arquivos)
- [ ] Remover `.coin-fly` órfã de `globals.css`

**DoD:** `npm test` e `npm run lint` verdes; `npm run build` passa; nenhum comportamento de jogo mudou; `grep` mostra `CINZEL` definida em um único lugar.

### Fase 1 — Bíblia criativa e design system 🤝
- [ ] `docs/DIRECAO_CRIATIVA.md` completo: ficha de cada um dos 5 personagens (silhueta, props, paleta, 4 expressões, bordão, voz, instrumento-tema)
- [ ] Tokens de design em um só lugar (cores, sombras, raios) e `prefers-reduced-motion` global
- [ ] Prompts-base versionados em `tools/art/prompts/*.json`

**DoD:** os 5 personagens têm ficha completa e o Alexandre aprovou o texto; tokens aplicados sem mudar o visual atual; reduced-motion desliga as animações existentes.

### Fase 2 — Teste de viabilidade de geração (spike) 🤝
- [x] Rodar stable-diffusion.cpp (Vulkan) na RX 6600 e gerar 1 imagem de teste
- [x] Se falhar, tentar ComfyUI + ROCm; se falhar, plano B online (não foi necessário)
- [x] Gerar o **Capoeira** com 4 expressões, nos 2 tamanhos candidatos
- [x] Script `tools/art/postprocess` (fundo → grade → paleta → PNG) e `tools/art/generate.ts`
- [x] Mostrar o Capoeira dentro de `Card.tsx` (com fallback para emoji) + galeria `/dev/cartas`
- [x] Relatório em `docs/SPIKE_ARTE.md`
- [x] **Look aprovado pelo Alexandre.** Expressões ainda sutis: ver "Para a Fase 3" no relatório

**DoD:** pelo menos um caminho gera imagens em tempo aceitável (alvo: minutos, não horas, por imagem); o Capoeira aparece na carta com a paleta mestra; o Alexandre aprova (ou rejeita) o look; o gerador e a resolução ficam decididos.
**Se nenhum caminho local funcionar:** o plano continua com geração online e o resto do roadmap não muda.

### Fase 3 — Arte das 5 cartas, verso e cenário ✅ concluída
- [x] Estrutura `public/art/<tema>/<id-da-carta>/neutro.png` (+ `.sm.png`) e campo `arte` em `src/lib/game/cards.ts`
- [x] 5 retratos (Barão do Café, Capoeira, Coronel, Regatão, Benzedeira), verso da carta (`verso.png`) e cenário da mesa (`mesa.png`), com 6 seeds curadas por personagem
- [x] Reskin: nomes e cores de fundo por carta, "Tesouro" → "Erário" (`nomeCurto` "Barão" para caber na carta)
- [x] Reações **sem retrato novo**: `artUrl` cai na expressão neutra; blefe/perdida usam o filtro cinza, e o "atingido" vira efeito (Fase 4). O teste de img2img mostrou que SDXL + LoRA não faz careta a 88 px
- [x] Cenário suavizado e desfocado atrás da mesa (pixel art ampliado 8× virava mosaico)
- [x] Páginas de revisão: `/dev/cartas` (todos os estados) e `/dev/mesa` (mesa fictícia com cenário)

**DoD cumprido:** todas as cartas com arte; falta de imagem cai no emoji sem quebrar; nenhuma regra tocada (testes verdes); personagem de carta alheia só no DOM quando revelada.
**Pendente (fica para a Fase 4/7):** o feltro verde da mesa ainda é o do v1 (re-tematizar como veludo imperial); em modo "mão" a barra inferior ocupa muito espaço e corta o assento do jogador em telas baixas.

### Fase 4 — Mesa v2 (redesign da interação) 🤝
Detalhes de design em `docs/DESIGN_MESA_V2.md`. Nasceu do playtest da Fase 3 (arte aprovada, interface não). Sem mobile (fica para v3/v4). Cada passo = um commit; **pontos de teste** marcados com 🎮.

- [x] **4.1 Layout limpo e uma zona para cada coisa** ✅ 🤖
  Só modo mão (remove `ActionBar` e o toggle A/B); zonas fixas (topo só menus, mesa, dock fixo embaixo com mão + ações básicas); sem banners de texto ("Vez de…", "Escolha o alvo…", "Aguardando…"); alvo escolhido clicando no assento (anel/mira pulsando, Esc cancela); reação deixa de ser modal e vira bandeja junto da mão; timer vira anel; assentos nunca cortados.
  **DoD:** em 1280×720 e 1920×1080 nada se sobrepõe nem é cortado (prints em `/dev/mesa`); zero banners de texto; a partida inteira jogável por 2 abas; testes/lint/build verdes.
- [x] **4.2 Selos de ação** 🤝 (precisa dos ícones: `tools/art/prompts/icones.json`)
  Componente `ActionSeal` (moldura + ícone + palavra + custo) com estados: verdadeiro (brilho de vela), blefe (máscara no canto), sem moedas (cadeado), obrigatório (só o Golpe aceso); pré-visualização do efeito ao passar o mouse; ações básicas fixas e poderes pela carta (clicar; arrastar entra em 4.3); galeria `/dev/selos`.
  **DoD:** todo botão do jogo é imagem + palavra; estados corretos para quem tem/não tem a carta (sem vazar nada para os outros); fallback para texto se faltar ícone.
- [x] **4.3 A jogada acontece na mesa** 🤖 🎮
  Carta declarada sobe da mão e fica no centro virada, com lacre da ação e anel de tempo; ✔ no retrato de quem passou; assento ativo com brilho de lampião e os outros levemente escurecidos; arrastar o poder até o oponente (e clicar continua valendo); reações como selos (Contestar/Bloquear/Passar) perto da mão.
  **DoD:** dá pra jogar uma rodada inteira sem ler nenhum texto de instrução; efeito nunca bloqueia clique.
  🎮 **Primeiro teste de "está intuitivo?"**
- [x] **4.4 Animações de baralho** 🤖 🎮
  Distribuição inicial a partir do baralho visível (com contagem); moedas voando entre Erário e jogadores, em pilhas que crescem; Trocar (2 cartas voam do baralho e as escolhidas voltam); Contestar (carta vira + tremor + selo); perder influência (vira e vai para a pilha de descarte do jogador). Pergunto antes de instalar lib de animação (sugestão: `motion`); sem ela dá com WAAPI/CSS.
  **DoD:** 60 fps com 6 jogadores; `prefers-reduced-motion` desliga o que balança; animação nunca atrasa o turno.
  🎮 **Teste de "sensação de baralho".**
- [ ] **4.5 Retratos, molduras e falas** 🤝 _(parcial: 12 retratos de convidados com moldura dourada, sorteados sem repetição e iguais no lobby e na mesa; falta a escolha no lobby, persistência na reconexão por escolha e os balões de fala)_
  Conjunto de ~12 retratos de convidados do baile (pipeline `tools/art`), moldura, escolha no lobby; balões de fala estilo Undertale com o bordão do personagem ao declarar.
  **DoD:** nenhum círculo com iniciais restante; avatar escolhido persiste na reconexão; fala não atrasa o turno.
- [ ] **4.6 Coerência visual do site inteiro** 🤝 🎮 _(parcial: mesa de veludo bordô com aro de madeira e filete dourado, dock/header/painéis de madeira escura com ouro, menu e lobby sobre o salão com o leque dos 5 personagens, feed de Intrigas em faixa própria; falta favicon/título, `prefers-reduced-motion` global e o teste de coerência 🎮)_
  Mesa em veludo imperial com bordado (some a elipse verde); menu, lobby, botões, feed e painéis no mesmo vocabulário (papel, lacre, ouro, Cinzel); favicon e título.
  **DoD:** nenhuma tela com visual do v1; contraste legível; um `prefers-reduced-motion` global.
  🎮 **Teste de coerência.**
- [x] **4.7 Rapidez** 🤖
  Atalhos (`Espaço` passar, `C` contestar, `B` bloquear); "passar automático" opcional por jogador (servidor registra e emite o `pass`); TDD onde tocar a engine.
  **DoD:** com todos em passar automático uma rodada de Renda/Taxas não pede nenhum clique de reação; testes cobrindo a preferência.
- [x] **4.8 Fim de partida** 🤖
  Tela de vitória dedicada e prêmios ("Mentiroso do ano", "Maior desconfiado") calculados da partida (estatísticas na engine, com TDD).
  **DoD:** prêmios corretos em partidas simuladas; revanche continua funcionando.
- [x] **4.9 Juice estilo Balatro** 🤖
  Tilt 3D das cartas no hover, brilho foil/holo no selecionado, números que pulam, screen shake e hit-stop curtos, CRT leve (liga/desliga).
  **DoD:** tudo ≤ ~400 ms e não bloqueante; reduced-motion respeitado.

### Fase 5 — SFX e trilha procedural ✅ (feita na branch `noite/mesa-v2`; falta afinar de ouvido)
- [ ] `src/lib/audio/`: sintetizadores (moeda, flip, selo, contestar, eliminação, vitória, tick de timer)
- [ ] `useGameAudio` escutando o mesmo diff do `useGameEvents.ts` (zero mudança no servidor)
- [ ] Trilha placeholder por código (loop de choro/lundu sintetizado), troca por fase do jogo
- [ ] Mute, volume persistido (`localStorage` com try/catch) e desbloqueio no primeiro gesto

**DoD:** cada evento do jogo tem som; sem som antes do primeiro clique; mute funciona e persiste; loop sem corte audível; sem novas mensagens de socket.

### Fase 6 — Caixa de texto e vozes 🤖
- [ ] Caixa de diálogo com typewriter para ações/bordões
- [ ] Blip de voz por personagem (forma de onda e altura da ficha)

**DoD:** cada personagem tem voz distinguível; o texto não atrasa o turno nem bloqueia input; respeita mute.

### Fase 7 — Ciclo de luz da mesa 🤝
O restante da antiga Fase 7 (menu, lobby, avatares) foi absorvido pelos passos 4.5 e 4.6. Sobra o **ciclo de luz** (tarde → noite conforme a partida avança).
**DoD:** a luz muda suavemente, sem atrapalhar a leitura da mesa.

### Fase 8 — Trilha por IA e temas alternativos 👤
- [ ] Alexandre gera as faixas (menu, mesa, tensão, vitória); o Claude integra e ajusta o loop
- [ ] Troca de tema (`?tema=`) e atribuição persistente em `localStorage` para teste A/B manual

**DoD:** faixas tocam em loop gapless; licença/termos do gerador registrados em `docs/AUDIO.md`; dois temas alternam sem mexer em código de jogo.

## Trilha paralela F — Fluidez (TDD) ✅ concluída
Todas feitas e validadas com testes de engine, testes do store de salas e E2E com clientes Socket.IO reais.

- [x] **F1 — "Passar":** evento `game_pass` + botão. A janela fecha quando todos os elegíveis passam; quem passou não reage mais; passar não reinicia o timer.
- [x] **F2 — Timeouts de turno/revelação/troca:** `TURN_TIME` (45s) e `CHOICE_TIME` (30s). Estourou: Renda (ou Golpe obrigatório), carta sorteada, troca neutra.
- [x] **F3 — Relógio do servidor:** o timer só rearma quando a fase/janela muda (`phaseSeq`); a view traz `remainingMs`, sem deriva no cliente.
- [x] **F4 — Reconexão:** `playerId` estável + token secreto (sessionStorage por aba). F5 retoma o assento e a mão; sem token, reivindica assento ausente pelo nome. Ausente da vez joga em 5s; lobby remove quem caiu em 20s; sala sem ninguém pausa e some em 10 min. Limite de 6 jogadores e validação do payload.
- [x] **F5 — Revanche e config:** "Jogar de novo" (vencedor começa, mesmos timers) e tela de tempos no lobby (host), montada a partir de `src/lib/game/config.ts`.
- [x] **F6 — Selo "CONTESTADO!" global:** a engine registra a última contestação (pública) e todos veem selo e feed ao mesmo tempo.

Pendências conhecidas (fora da trilha): indicar ausentes também na mesa (hoje só no banner e no lobby); rate limit de eventos; deploy com WebSocket.

## Riscos
| Risco | Mitigação |
|---|---|
| RX 6600 sem ROCm oficial | Testar Vulkan primeiro; plano B online |
| Consistência de personagem na IA | Seed/referência fixa, curadoria humana, retoque no Aseprite |
| Licença de modelos de imagem e música | Registrar termos antes de publicar |
| Efeito atrasando o jogo | DoD de 400 ms, não-bloqueante, reduced-motion |
| Deploy com WebSocket (Vercel não serve) | Escolher Fly.io, Railway, Render ou VPS antes de divulgar |

## Ordem recomendada
Feitas: Fase 0, Fase 2 (spike), toda a trilha F e Fase 3. Próximas: **4.1 → 4.2 → 4.3 (🎮) → 4.4 (🎮) → 4.5 → 4.6 (🎮) → 4.7 → 4.8 → 4.9**, depois Fase 5 (SFX, que já nasce encaixada nas animações), Fase 6 (vozes), Fase 7 (ciclo de luz) e Fase 8 (trilha por IA e temas). Mobile: v3/v4.
