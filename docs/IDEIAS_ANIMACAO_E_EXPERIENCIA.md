# Índice de ideias: animação e experiência

> Consolidado em 18/10/2026 a partir de `docs/VIDA_E_BLEFE.md`, `docs/PLANO_V3.md`, `docs/PROXIMAS_VERSOES.md` e do feedback de 15–16/10.
> É um **índice**: o detalhe (tempos, arte, som, testes) fica nos documentos de origem, citados em cada linha.
> Legenda de escopo: **v3** = entra na v3 · **depois** = backlog · **opc.** = condicionado a teste/medição.
> Esforço: P (horas) · M (uma sessão) · G (mais de uma sessão).

## 0. Princípios que valem para todas as ideias

- [ ] **Nenhuma animação vaza informação.** Verdade e blefe têm a mesma animação até a revelação; teste de propriedade obrigatório (`VIDA_E_BLEFE` 2.1, 16.3).
- [ ] **Retratos continuam neutros.** Dano e reação vêm de camadas por cima (moldura, curativo, emote). Rostos novos = H8, opcional.
- [ ] **Curto e pulável.** Cena frequente ≤ 400 ms; cena rara (duelo, exílio, vitória) ≤ ~2,7 s, com pular (clique, `Espaço`, `Esc`).
- [ ] **Servidor não espera a animação.** É só apresentação no cliente; nenhuma regra ou timer muda.
- [ ] **Uma coisa grande por vez.** Cada momento tem um protagonista visual.
- [ ] **Quem não está olhando não paga.** Aba em segundo plano, reconexão e espectador novo vão direto ao estado final, sem replay.
- [ ] **Imagem antes de número e de texto.** Onde há número ou frase, entra pixel art própria, com variantes (nunca a mesma imagem repetida N vezes).
- [ ] **Gramática visual única:** dourado = verdade/ganho/vez · vermelho = perigo · máscara = blefe · rachadura = dano · lacre = decisão · escudo = bloqueio · ampulheta = espera · cinza = fora.
- [ ] **Orçamento:** drama alto (nível 3) por partida de 4 jogadores ≤ ~25 s.
- [ ] **Acessibilidade:** `prefers-reduced-motion`, preferência "Efeitos: completo / reduzido / desligado", `role="status"` oculto, sem flash > 3/s, nunca só cor.

## 1. Estados persistentes ("o jogo tem memória") — H2

| # | Ideia | Escopo | Esforço | Fonte |
|---|---|---|---|---|
| A1 | **Moldura machucada**: 2 influências = íntegra; 1 = rachada + curativo + retrato ~15% dessaturado; 0 = estilhaçada + cinza. Persiste até a revanche | v3 | M | 6.1 |
| A2 | **Cartas perdidas** ao lado do assento: viradas, escurecidas, com rachadura (a história da partida) | v3 | P | 6.2 |
| A3 | **Selos de ameaça**: canhãozinho com 7–9 moedas ("pode dar Golpe"); alvo vermelho pulsando com 10+ ("Golpe obrigatório") | v3 | P | 6.3 |
| A4 | **Medalhão da vez** (ficha de dealer) que desliza de assento em assento (450 ms, som `vez`) | v3 | P | 6.4 |
| A5 | **Luz segue a vez**: assento ativo 15% maior com moldura acesa; os outros escurecem | v3 | P | 6.4 |
| A6 | **Anel de tempo** em volta do retrato (substitui a pílula ⏱); vermelho e pulsando nos últimos 5 s, dígitos sobre o retrato | v3 | M | 6.4, Fase B2 |
| A7 | **Jogador ausente**: retrato apagado, "zZz" flutuando, placa esmaecida (no lugar do texto "sem conexão") | v3 | P | 6.5 |
| A8 | **Plateia**: cada espectador vira uma silhueta na borda de baixo (3 modelos), entra com pulinho e sai se levantando; some o "👁 N" | v3 | P | 6.6 |
| A9 | **Estados extras de moldura** (além de íntegra, rachada e estilhaçada) | depois | — | 18 |

## 2. O blefe como espetáculo — H4 (o coração do jogo)

| # | Ideia | Escopo | Esforço | Fonte |
|---|---|---|---|---|
| B1 | **Declaração tell-free**: retrato do ator sobe, carta voa em arco ao centro **virada para baixo** com lacre, balão com ícone da ação, linha pontilhada ator→alvo, não participantes escurecem | v3 | M | 7.1 |
| B2 | **Tensão da janela de reação**: ampulheta no lacre, vinheta que escurece, batimento que acelera nos últimos 40%, pontinho pulsando em quem ainda precisa reagir. Intensidade **só pelo tempo**, nunca pela verdade | v3 | M | 7.2 |
| B3 | **O Duelo da contestação** (~2,6 s, pulável): mesa escurece, recortes de papel dos dois deslizam ao centro, faixa "VS", hit-stop 60 ms, suspense com zoom 1,00→1,06 + coração 60→100 bpm + suor nos dois, carta gira em câmera lenta, veredito com hit-stop 80 ms + flash + tremor + carimbo, reação (vencedor sobe, perdedor tomba), retorno | v3 | G | 7.3 |
| B4 | **3 variantes do duelo** por hash de `lastChallenge.n` (coração/tambor/relógio, direção da entrada, ±200 ms no suspense) | v3 | P | 7.3 |
| B5 | **Blefe desmascarado**: máscara de baile se estilhaça em 4 quadros com faíscas, moldura do blefador racha por um instante (transitório), contestador ganha brilho dourado e estrelas | v3 | M | 7.4 |
| B6 | **Verdade provada**: carimbo dourado "VERDADE", acusado sobe "com ar de quem sabia", contestador leva o impacto | v3 | M | 7.5 |
| B7 | **Troca visível da carta provada**: carta volta ao baralho em arco, baralho embaralha, carta nova é dada ao acusado (virada para cima só para ele). Derivável de `lastChallenge.accusedHadCard`, **sem mexer no servidor**. Maior valor de intuição da lista | v3 | M | 7.6 |
| B8 | **Bloqueio**: escudo desce em 3 quadros, "clang", tranco de tela, hit-stop 50 ms, carimbo BLOQUEIO; se ninguém contesta o escudo se firma e a carta escurece. Igual para bloqueio real e blefado | v3 | M | 7.7 |
| B9 | **Perigo duplo** (Assassinar vs. Benzedeira): moldura racha duas vezes (700 ms de intervalo), tremor maior, hit-stop 120 ms, vai direto ao exílio | v3 | P | 7.8 |
| B10 | **Pular o duelo**: clique/`Espaço`/`Esc` salta ao veredito (carimbo 400 ms). Escolha de carta de quem perdeu liberada em veredito + 300 ms | v3 | P | 7.3, 12.4 |
| B11 | **Emotes** sobre o retrato: suor, calma, "?", sorriso suspeito (cooldown 3 s, nunca revelam carta). Liga com a F5 de retenção | depois | M | 7.9 |

## 3. Perda, exílio e vitória — H5

| # | Ideia | Escopo | Esforço | Fonte |
|---|---|---|---|---|
| C1 | **Perda de influência** (~900 ms): carta vira, rachadura de 3 quadros + som de crack, retrato pisca vermelho e treme, carta racha e desliza para a fileira de reveladas, curativo "pipoca" | v3 | M | 8.1 |
| C2 | **Exílio: a cena do barco** (~2,6 s, pulável): moldura se estilhaça, faixa de cenário pixel (cais, mar, lanternas), recorte do retrato sobe no barco, fichas escorrem ao Erário, carimbo EXILADO, apito de vapor, barco parte pela direita, assento fica vazio com nome riscado. Ref.: exílio da família imperial em 1889 | v3 | G | 8.2 |
| C3 | **3 veículos do exílio** (barco a vapor, jangada, canoa) por hash do jogador | depois (extras) | M | 8.2, 19.4 |
| C4 | **Vitória**: mesa escurece, recorte do vencedor ao centro, moldura dourada pulsa, coroa desce, chuva de fichas, outros se inclinam em reverência (exilados em silhueta), painel final sobe | v3 | M | 8.3 |
| C5 | **Revanche**: baralho embaralha em câmera acelerada, retratos voltam íntegros com brilho, medalhão entra no vencedor, letreiro "Partida N" | v3 | P | 8.4 |
| C6 | **Exilado continua assistindo** (vira "fantasma" e candidato à próxima partida) | decidir | P | 19.3, F4 |

## 4. Assinatura de cada ação — H6

(A declaração é igual para todos; só a **resolução** mostra a assinatura.)

| # | Ação | Efeito | Escopo | Fonte |
|---|---|---|---|---|
| D1 | **Assassinar** (Capoeira) | Navalha cruza o retrato do alvo (3 quadros), hit-stop 60 ms, gota vermelha, 3 fichas voam ao Erário | v3 | 9 |
| D2 | **Golpe de Estado** | Canhão dispara da borda, projétil em arco, impacto com tremor forte, 7 fichas ao Erário | v3 | 9 |
| D3 | **Taxas** (Barão do Café) | Chuva de moedas do Erário ao Barão em arco largo | v3 | 9 |
| D4 | **Extorquir** (Coronel) | Mão pixel sai do assento, puxa as fichas do alvo | depois | 9 |
| D5 | **Trocar** (Regatão) | Duas cartas deslizam do baralho; devolvidas voltam e o baralho embaralha | depois | 9 |
| D6 | **Ajuda Externa** | Saquinho derrama 2 fichas na pilha | depois | 9 |
| D7 | **Renda** | 1 ficha voa do Erário com "pop" | v3 (trivial) | 9 |

## 5. Microanimações de intuição ("o jogo se explica sozinho") — H3

| # | Ideia | Escopo | Fonte |
|---|---|---|---|
| E1 | Medalhão da vez deslizando (= A4) | v3 | 10 |
| E2 | **Mira com linha pontilhada** animada; alvos possíveis tremem 1 px | v3 | 10 |
| E3 | **Ampulheta** no lacre (= B2) | v3 | 10 |
| E4 | **Botão que "clica"**: escala 0,94 por 80 ms e trava depois de usar | v3 | 10 |
| E5 | **Ação inválida balança "não"**: selo balança 3 ciclos, cadeado pisca, som `erro` (moedas faltando, 10+ moedas) | v3 | 10 |
| E6 | **A mão respira** (±2 px em 2 s) quando é a sua vez | v3 | 10 |
| E7 | **Hover na carta da mão**: sobe 8 px e mostra custo/ganho com **fichas fantasma** | v3 | 10, DESIGN_MESA_V2 |
| E8 | **Hover na pilha de fichas** mostra o número exato | v3 | 10 |
| E9 | **Fichas que pousam**: voam e a pilha troca de sprite com "pop" | v3 | 10, Fase B3 |
| E10 | **Carta que sai e volta do baralho** em arco | v3 | 10 |
| E11 | **Quem passou**: ✔ no assento + a mão "abre" brevemente | v3 | 10 |
| E12 | **Alvo escolhido**: linha pisca e some, alvo recebe marca por 400 ms | v3 | 10 |

## 6. Ambiente e social — H7

| # | Ideia | Escopo | Fonte |
|---|---|---|---|
| F1 | Lanternas do fundo com brilho vacilante (ampliar `lamp-flicker`) | depois | 11 |
| F2 | Poeira no ar, poucas partículas na luz | depois | 11 |
| F3 | Plateia de silhuetas (= A8) | v3 | 11 |
| F4 | Emotes (= B11) | depois | 11 |
| F5 | Início da partida: lanternas acendem, cartas distribuídas, medalhão entra | opc. | 11 |
| F6 | Ciclo de luz da mesa (Fase 7 do ROADMAP) | depois | PLANO_V3 backlog |
| F7 | Trilha de música por IA e troca de temas (Fase 8 do ROADMAP) | depois | PLANO_V3 backlog |

## 7. Hierarquia da mesa e imagens no lugar de números — Fase B

| # | Ideia | Escopo | Esforço | Fonte |
|---|---|---|---|---|
| G1 | **Escala em degraus inteiros** (1×, 1,5×, 2×) para assentos, cartas e dock; mesa legível em 1920×1080 | v3 | M | B1 |
| G2 | **Balão da jogada** sobre o assento de quem agiu (ícone da ação + retrato, em vez de texto) | v3 | M | B2 |
| G3 | **Marca de quem a mesa espera** no assento | v3 | P | B2 |
| G4 | **Fichas como sprites por quantidade** (1 a 10, 3 variantes cada, escolha por hash de jogador+quantidade; montes para 11+; número pequeno só de apoio). Gerador procedural `tools/art/fichas.ts` | v3 | G | B3 |
| G5 | **Fichas interativas**: ganhar (voa + pop), perder/ser roubado (as de cima saem), exílio (desmorona), hover (fantasmas), 10+ (aviso de Golpe obrigatório) | v3 | M | B3 |
| G6 | **Legenda curta no centro da mesa** ("Aguardando você e Caio: contestar ou passar"), carrega o aviso dos 5 s | v3 | P | B4 |
| G7 | **Cabeçalho sem texto de status** (remove `TurnBanner` e `RoundStatusSlot`; fica só `role="status"` oculto) | v3 | P | B5 |
| G8 | **Baralho da Corte por faixa** (cheio, médio, pouco, última carta) no lugar de "Corte · 21" | candidata | P | Fase 0 |
| G9 | **Erário** como montes + baú/cofre que enche por faixas | candidata | M | Fase 0 |
| G10 | **Retrato que reage** (neutro, atingido, eliminado, vencedor) | opc. (H8) | G | Fase 0, H8 |
| G11 | **Dígitos do relógio** e **marcador de vez** como sprites | candidata | P | Fase 0 |
| G12 | **Prêmios com ícones pixel** (Carrasco, Ricaço, Mentiroso do ano, Maior desconfiado, Olho de lince) no lugar de emoji | v3 | M | Fase D |
| G13 | **Histórico de Intrigas** no estilo do kit, sem cobrir assentos | v3 | P | B6 |

## 8. Linguagem de UI única, dock, fim de partida e colinha — Fases A, C, D, E

| # | Ideia | Escopo | Fonte |
|---|---|---|---|
| U1 | **Kit de UI pixel** (`PixelPanel`, `PixelButton`, `IconButton`, `Tag`), moldura 9-slice, sombra dura sem glow | v3 | A |
| U2 | **Fonte pixel única** (Pixelify Sans / Silkscreen / VT323 / Press Start 2P; testar acentos pt-BR) | v3 | A, Fase 0 |
| U3 | **Zero emoji do sistema**; logo + favicon próprios; header como HUD enxuto com um só estilo de botão | v3 | A |
| U4 | **Dock imersivo**: sem barra de largura total; 3 variações a escolher (cavalete de madeira, mão sobre a madeira da mesa, bandeja de couro); selos de ação sobre a madeira; reações como selos grandes perto da jogada; "passar automático" como chave pixel; alvos ≥ 44 px | v3 | C |
| U5 | **Tela de vitória**: retrato pixel do vencedor, troféu e ícones em pixel, `PixelPanel`, botão de revanche grande com atalho, placar da noite, animação leve de moedas/confete | v3 | D |
| U6 | **Colinha como objeto**: uma peça só (pergaminho/carta de referência) que sobe como carta, retrato maior, ✓/✗ em ícone no lugar de chips, ≤ 5 regras curtas com ícone, cabe em 1280×720 sem rolar | v3 | E |
| U7 | **Mockups aprovados antes de qualquer código de UI** (Fase 0, `app/dev/v3/*`) e protótipos de movimento em `/dev/cenas` | v3 | Fase 0 |
| U8 | **Aba de Aparência**: o jogador escolhe fonte pixel (4), estilo do kit (A madeira e latão, B pergaminho e tinta) e barra de baixo (cavalete, mão sobre a mesa, bandeja); a linha de efeitos entra no mesmo painel | v3 | Alexandre, 18/10/2026 |

## 9. Retenção ("mais uma partida") — Fase F

| # | Ideia | Escopo | Esforço | Fonte |
|---|---|---|---|---|
| R1 | **Placar da noite** (vitórias por jogador na sala, em memória, evento `room:score`) | v3 | M | F1 |
| R2 | **Revanche sem atrito** (um clique, atalho, vencedor começa) | v3 | P | F2 |
| R3 | **Títulos da noite** acumulados ("Mentiroso da noite") | v3 | M | F3 |
| R4 | **Ritmo**: rever turno de 45 s, acelerar animações que atrasam, dar algo para o eliminado fazer (assistir com comentários) | se der tempo | M | F4 |
| R5 | **Personalidade**: falas e bordões dos personagens (Fase 6 do ROADMAP) + 4 emotes rápidos | se der tempo | G | F5 |
| R6 | **Modo de 2 jogadores**: variante (mais vidas, ou o Inquisidor do Coup Reformation) ou aviso "melhor com 4+". Decisão do Alexandre | depois de medir | M | F6 |
| R7 | **Medir**: log JSON no servidor de revanches por sala; linha de base antes de ligar R1–R3 | v3 | P | F7 |

## 10. Feedback original do playtest (já feito na `feat/playtest-v2`)

- [x] Colinha das cartas ("?")
- [x] Mais informação de rodada (faixa de status — **será removida do cabeçalho na Fase B**, ver G6/G7)
- [x] Espectador que entra no meio e vira jogador na próxima partida
- [x] Aviso dos últimos 5 s antes da ação automática
- [x] Verificação da troca de carta ao vencer contestação e do embaralhamento (ambos corretos)
- [ ] Ideia ainda aberta: log do seed por partida para reproduzir queixas de embaralhamento

## 11. Inventário de arte e som que as ideias exigem

- **Arte:** ~45 peças / ~110 quadros de FX (dano, carimbos, duelo, escudo, ampulheta, medalhão, ameaça, ações, exílio, coroa, plateia, emotes, partículas), 36+ sprites de fichas, 4 de baralho, ícones de UI, logo/favicon. Gerar por **script ou à mão**, não por IA, nas peças pequenas (`VIDA_E_BLEFE` seção 13).
- **Som novo (sintetizado em `recipes.ts`):** `gongo`, `batida`, `estilhaco`, `crack`, `clang`, `navalha`, `canhao`, `apito`, `clique`, `embaralhar` (seção 14).

## 12. Decisões em aberto que travam ideias daqui

| # | Decisão | Recomendação |
|---|---|---|
| 1 | Duração do duelo | 2,6 s com pular |
| 2 | Onde acontece o duelo | Centro |
| 3 | Exilado continua assistindo? | Sim |
| 4 | Veículo do exílio | 3 variações por hash |
| 5 | Selos de ameaça | Ligados e discretos |
| 6 | Emotes na v3? | Não |
| 7 | Preferência de efeitos | 3 níveis |
| 8 | Som das cenas | Seguir a preferência atual |
| 9 | Teste de uma tarde das expressões (2 avatares) | Sim, sem compromisso com os 12 |
| 10 | Bloqueio de UI durante o duelo | Só o centro |
| 11 | Fonte, escala, dock, texto de status, quais F entram | Ver `PLANO_V3.md`, Fase 0 |
| 12 | "Iterativas" nas fichas era "interativas"? | Confirmar na Fase 0 |

## 13. Ordem de execução sugerida (do plano)

`0` mockups e protótipos → `A` kit → `B` mesa e fichas → `C` dock → `H` vida e blefe (H0→H7) → `D` fim de partida → `E` colinha → `F` retenção (pode andar em paralelo) → `G` fechamento (E2E completo, playtest, merge na `main`, tag `v3`).

Dentro da H, a ordem é: H1 infraestrutura → H2 persistentes (A1–A8) → H3 intuição (E1–E12) → H4 blefe (B1–B10) → H5 perda/exílio/vitória (C1–C5) → H6 (D1–D3) → H7 plateia.
