# Roadmap v2 — Arte, áudio e fluidez (plano executável)

Base: tag `v1` (commit `14cfb45`). Este plano substitui o roadmap v1.

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
| Paleta | Mestra **v1, 36 cores** (abaixo; fonte única em `tools/art/palette.json`). Decidido no spike |
| Resolução | **Retrato 88×124 nativo** (carta lg em 1:1) e miniatura **40×56** (carta sm). 44×62 foi descartado: o rosto ficou ilegível (ver `docs/SPIKE_ARTE.md`) |
| Temas | Arte organizada por tema (`public/art/<tema>/...`) para permitir trocar o estilo e fazer teste A/B depois |
| Música | Trilha **procedural por código** como placeholder já na Fase 5. Faixas por IA substituem depois (Fase 8) |
| Gerador de imagem | **stable-diffusion.cpp (Vulkan) + SDXL base + LoRA pixel-art-xl**, local na RX 6600 (~80 s por imagem). Decidido no spike |

### Paleta mestra v1 (36 cores)
v0 tinha 32; o spike mostrou que faltavam marrons médios (pele ia para laranja), então entraram 4.
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
- [ ] **Aprovação do Alexandre do look** (abrir `/dev/cartas`). Expressões ainda sutis: ver "Para a Fase 3" no relatório

**DoD:** pelo menos um caminho gera imagens em tempo aceitável (alvo: minutos, não horas, por imagem); o Capoeira aparece na carta com a paleta mestra; o Alexandre aprova (ou rejeita) o look; o gerador e a resolução ficam decididos.
**Se nenhum caminho local funcionar:** o plano continua com geração online e o resto do roadmap não muda.

### Fase 3 — Arte das 5 cartas, verso e cenário 🤝
- [ ] Estrutura `public/art/<tema>/<personagem>/<expressao>.png` + manifest, campo `arte` em `src/lib/game/cards.ts`
- [ ] 5 personagens × 4 expressões, verso da carta, fundo da mesa (salão imperial)
- [ ] Reskin: `nome`, `cor`, `icone` e rótulos de `ACTION_META` (Erário, réis, etc.)
- [ ] Mapear expressões aos estados (neutro, blefe, atingido, eliminado)

**DoD:** todas as cartas com arte; falta de imagem cai no emoji sem quebrar; nenhuma regra de jogo tocada, `npm test` verde; o personagem de carta alheia só chega ao DOM quando revelada.

### Fase 4 — Juice estilo Balatro (CSS primeiro) 🤖
- [ ] Tilt 3D no hover, foil/holo, screen shake e hit-stop curto na eliminação
- [ ] Números que "pulam", CRT/scanlines leve (liga/desliga), entrada animada do `ReactionOverlay`
- [ ] Tela de vitória dedicada
- [ ] Fundo animado (CSS; WebGL só se o ganho justificar, avisando antes)

**DoD:** nenhum efeito bloqueia clique; efeitos de gameplay ≤ ~400 ms; `prefers-reduced-motion` respeitado; 60 fps em partida de 6 jogadores no navegador (checagem manual); `npm test` verde.

### Fase 5 — SFX e trilha procedural 🤖
- [ ] `src/lib/audio/`: sintetizadores (moeda, flip, selo, contestar, eliminação, vitória, tick de timer)
- [ ] `useGameAudio` escutando o mesmo diff do `useGameEvents.ts` (zero mudança no servidor)
- [ ] Trilha placeholder por código (loop de choro/lundu sintetizado), troca por fase do jogo
- [ ] Mute, volume persistido (`localStorage` com try/catch) e desbloqueio no primeiro gesto

**DoD:** cada evento do jogo tem som; sem som antes do primeiro clique; mute funciona e persiste; loop sem corte audível; sem novas mensagens de socket.

### Fase 6 — Caixa de texto e vozes 🤖
- [ ] Caixa de diálogo com typewriter para ações/bordões
- [ ] Blip de voz por personagem (forma de onda e altura da ficha)

**DoD:** cada personagem tem voz distinguível; o texto não atrasa o turno nem bloqueia input; respeita mute.

### Fase 7 — Menu, lobby e avatares tematizados 🤝
- [ ] Menu e Gabinete (lobby) no estilo imperial; avatares em pixel art
- [ ] Ciclo de luz da mesa (tarde → noite conforme a partida avança)

**DoD:** fluxo menu → sala → jogo → vitória coerente visualmente; contraste legível; responsivo na largura do `Table`.

### Fase 8 — Trilha por IA e temas alternativos 👤
- [ ] Alexandre gera as faixas (menu, mesa, tensão, vitória); o Claude integra e ajusta o loop
- [ ] Troca de tema (`?tema=`) e atribuição persistente em `localStorage` para teste A/B manual

**DoD:** faixas tocam em loop gapless; licença/termos do gerador registrados em `docs/AUDIO.md`; dois temas alternam sem mexer em código de jogo.

## Trilha paralela F — Fluidez (TDD) 🤖
Pode rodar antes ou junto de qualquer fase acima. Ordem sugerida: F1 → F2 → F3 → F4 → F5 → F6.

- [ ] **F1 — "Passar":** evento `game_pass` + botão. A janela fecha quando todos os elegíveis passam.
  **DoD:** testes de engine para passe parcial, total e jogador eliminado; o fluxo normal sem passe continua igual.
- [ ] **F2 — Timeouts de ação/revelação/troca:** autoplay seguro (Renda, carta aleatória, troca neutra).
  **DoD:** testes por fase; partida com jogador AFK termina sem travar.
- [ ] **F3 — Deadline absoluto:** o servidor envia o instante final; o cliente deriva o countdown.
  **DoD:** o relógio não reinicia a cada `game_state`; barra do `ReactionOverlay` coerente entre clientes.
- [ ] **F4 — Reconexão:** token de sessão (sem login). Quem volta recupera o lugar.
  **DoD:** recarregar a aba no meio do jogo mantém o jogador e a mão; token não é adivinhável; sem cartas alheias na view.
- [ ] **F5 — Revanche e config:** "vencedor começa", e UI para os 3 timers.
  **DoD:** nova partida na mesma sala; valores respeitam os limites do `game-rules.md`.
- [ ] **F6 — Selo "CONTESTADO!" global:** todos veem o selo, não só quem clicou.
  **DoD:** duas abas mostram o selo no mesmo momento, sem novo canal além de `game_state` (ou com evento justificado).

## Riscos
| Risco | Mitigação |
|---|---|
| RX 6600 sem ROCm oficial | Testar Vulkan primeiro; plano B online |
| Consistência de personagem na IA | Seed/referência fixa, curadoria humana, retoque no Aseprite |
| Licença de modelos de imagem e música | Registrar termos antes de publicar |
| Efeito atrasando o jogo | DoD de 400 ms, não-bloqueante, reduced-motion |
| Deploy com WebSocket (Vercel não serve) | Escolher Fly.io, Railway, Render ou VPS antes de divulgar |

## Ordem recomendada
Fase 0 → F1 e F2 → Fase 1 → Fase 2 (em paralelo com F3–F4) → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → F5/F6 → Fase 8.
