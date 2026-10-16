# Plano v3: de "funciona" para "tem cara de jogo"

> Escrito em 16/10/2026, depois do primeiro playtest e da revisão visual do Alexandre.
> Este documento é para ser **executado na próxima rodada de código, fase por fase**.
> Nada aqui foi implementado ainda. A v3 sai quando as fases A a G estiverem prontas.

## Como usar este documento

1. Leia o **Resumo** (2 minutos).
2. Execute as fases **na ordem**. Cada fase termina em **"Pronto quando"**: só passe para a próxima com isso verdadeiro.
3. Ideia nova no meio do caminho? Vai para o **Backlog pós-v3** (no fim). Não entra na fase em andamento. Isso protege o plano.
4. Para retomar com o Claude, cole: *"Leia `docs/PLANO_V3.md` e execute a Fase 0."*

## Resumo

O jogo funciona e os amigos gostaram. O incômodo do Alexandre tem **uma causa principal e duas estruturais**:

| # | Problema | Causa | Fase que resolve |
|---|---|---|---|
| 1 | "Cara de IA", botões que destoam, colinha e tela final feias | **Duas linguagens visuais brigando**: arte em pixel art + interface de web app (gradiente liso, brilho, pílulas, chips, emojis do sistema, Cinzel liso) | **A** (kit de UI), **D**, **E** |
| 2 | Não fica "na cara" o que está acontecendo | **Hierarquia da mesa**: a informação está espalhada pelos cantos, moeda é número, centro vazio, tamanhos fixos em px (tudo pequeno no monitor 1920) | **B** |
| 3 | A barra de baixo é feia e tira imersão | Barra sólida de largura total, com cara de app | **C** |
| 4 | Não dá vontade de jogar "mais uma" | Nada passa de uma partida para a outra; a tela final é um beco; 2 jogadores é o pior modo de Coup | **F** |

O núcleo já é bom (cenário, retratos, cartas). **Não vamos refazer a arte que agradou**, só tirar o que destoa dela.

## Estado de partida (16/10/2026)

Branch `feat/playtest-v2` (**não mesclada na `main`**, que está em produção no Render). Já feito nela:
colinha "?", faixa de status no cabeçalho, aviso dos últimos 5s, espectador, link do GitHub + LICENSE MIT, e os testes de `replaceCard` e embaralhamento. Detalhes em `docs/PROXIMAS_VERSOES.md`.

**Pendências herdadas (resolver na Fase G, ou antes se travarem algo):**
- [ ] Rodar o E2E completo. Os cenários de faixa de status (parte), aviso dos 5s e espectador estão **escritos e não executados**.
- [ ] Teste antigo de contestação falhou **uma vez** na suíte cheia e passou 4 de 4 depois (espera de 6s em aba de fundo). Tornar robusto.
- [ ] `LICENSE`: copyright está como `AlexandreJr16`. Trocar pelo nome que o Alexandre quiser.
- [ ] Validar no ar (branch local ou serviço de teste no Render) antes do merge.

## Princípios novos (somam aos 6 do `docs/DESIGN_MESA_V2.md`)

7. **Uma linguagem só.** Tudo é pixel art ou parece feito com ela: fonte, bordas, botões, ícones. Sem gradiente liso, sem brilho gratuito, sem emoji do sistema.
8. **A informação fica onde o olho já está**: no assento de quem age e no centro da mesa, não nos cantos.
9. **Uma coisa grande por vez.** Se tudo destaca, nada destaca.
10. **Coisas, não números.** Moeda é pilha de fichas; tempo é anel em volta de quem deve jogar.
11. **A interface escala com a tela.** Testar em 1280×720, 1600×900, 1920×1080 e 2560×1440.
12. **Revisão visual antes do código.** UI nova passa por mockup aprovado (Fase 0).
13. **Imagem antes de número e de texto.** Onde hoje há um número ou uma frase, o jogo mostra uma pixel art própria (fichas, baralho, cofre, expressões). O número fica só como apoio para leitura exata. A imagem **nunca é a mesma repetida N vezes**: tem variantes. Ver B3 e a lista de candidatas na Fase 0.

> **Tensão a resolver (de propósito):** em 15/10 o Alexandre disse que **não gosta de banners de texto** ("Vez de X", "Aguardando reações…"). Em 16/10 pediu mais informação de rodada, e eu entreguei justamente um banner de texto no cabeçalho, que ele achou "estranho". A saída da v3 é **mostrar na mesa** (anel no assento, balão da jogada, legenda curta no centro) e **tirar o texto do cabeçalho**. Ver Fase B.

---

## Fase 0: Mockups e decisões (antes de qualquer código de UI)

**Objetivo:** aprovar a direção visual no papel. Barato, e evita refazer código.

**Tarefas**
1. Fazer mockups em **HTML estático** (páginas em `app/dev/v3/*`, sem socket) de: (a) kit de UI e header, (b) mesa nova com 2 e 4 jogadores, (c) dock imersivo (3 variações), (d) tela de vitória, (e) colinha. Cada um em 1280×720 e 1920×1080.
2. O Alexandre escolhe uma opção por tela. **Congelar**: depois da aprovação, mudanças viram Backlog pós-v3.

**Decisões que o Alexandre precisa tomar aqui**

| Decisão | Opções | Recomendação |
|---|---|---|
| Fonte de interface | Pixelify Sans, Silkscreen, VT323, Press Start 2P (todas no Google Fonts). Testar com "Barão do Café, Benzedeira, Ação, Coronel" (**acentos pt-BR são obrigatórios**) e conferir licença | Testar 2 ou 3 nos mockups e escolher a que fica legível em 14px |
| Corpo de texto | Mesma fonte pixel, ou uma sans legível só para texto longo | Pixel nos títulos e botões, sans só se a colinha precisar |
| Escala da tela | (1) escala contínua por CSS, (2) **escala em degraus inteiros** (1×, 1.5×, 2×), melhor para pixel art | Degraus inteiros; ver Fase B |
| Dock | (1) cavalete de madeira (Rummikub), (2) mão sobre a madeira da própria mesa, (3) bandeja de couro | Escolher no mockup |
| Texto de status | (A) remover do cabeçalho e usar só assento + balão, (B) A + legenda curta no centro da mesa | **B** (o centro vazio ganha função) |

**Lista de arte necessária** (levantada aqui para a Fase A não travar):
logo + favicon; ícone de **contestar** (hoje cai em emoji); **fichas** (sprite por quantidade, com variantes: ver B3); troféu; ícones dos prêmios (Carrasco, Ricaço, Mentiroso do ano, Maior desconfiado, Olho de lince); olho (espectador); "?"; som ligado/desligado; sair; moldura e botão pixel (9-slice); textura de madeira para o dock.
**Onde mais usar imagens (candidatas; só entram se aprovadas no mockup, para o escopo não crescer):**

| Hoje | Vira |
|---|---|
| Baralho da Corte com número ("Corte · 21") | Sprite por faixa de cartas restantes (cheio, médio, pouco, última carta) |
| Erário com número | Montes e, acima deles, um baú ou cofre que enche por faixas |
| Retrato fixo | Retrato que **reage**: neutro, atingido, eliminado, vencedor (hoje só o Capoeira tem 4 expressões nas cartas; os 12 avatares têm 1) |
| Texto "Assassinar → Anny" | Balão com o **ícone da ação** (os 10 ícones já existem) + retrato |
| Dígitos do relógio | Dígitos em sprite pixel sobre o anel |
| Marcador de vez | Medalhão em sprite |
| Prêmios com emoji | Ícones pixel (já na lista acima) |

Como gerar: o pipeline local (`tools/art/`, SDXL + LoRA, ~80 s por imagem) serve para logo e retratos. **Para ícones pequenos de UI, desenhar por script ou à mão** costuma sair mais consistente que IA. Decidir caso a caso e registrar em `tools/art/README.md`.

**Pronto quando:** existe uma escolha registrada para cada linha da tabela e mockups aprovados para as 5 telas.

---

## Fase A: Linguagem de UI única (o kit)

**Objetivo:** acabar com o "web app em volta de um jogo". Resolve de uma vez o header, a colinha, a vitória e a base do dock.

**Por quê:** é a causa nº 1. Todas as outras fases consomem este kit.

**Tarefas**
1. **Tokens** em `app/globals.css` e `src/components/game/helpers.ts` (`COLORS`): paleta reduzida (a de 36 cores de `tools/art/palette.json` é a referência), bordas chapadas de pixel, sombra dura (sem blur), sem `box-shadow` com glow.
2. **Fonte** escolhida na Fase 0 em `app/layout.tsx` (substitui o uso de Cinzel e Geist onde for UI).
3. **Componentes base** em `src/components/ui/`: `PixelPanel`, `PixelButton`, `IconButton`, `Tag` (só onde for realmente necessário), todos sobre a moldura 9-slice.
4. **Ícones pixel** da lista da Fase 0 em `public/art/imperio/icones/` (padrão `<nome>.png` + `.sm.png`, e registrar em `ICONS_AVAILABLE` no `helpers.ts`).
5. **Header** vira HUD enxuto: logo à esquerda, sala, e à direita **um** estilo de botão (som, CRT, "?", sair) com ícones pixel. Sem a faixa de status (ver Fase B).
6. **Logo + favicon**: `app/icon.png` (e `favicon.ico`), mesma logo no menu e no header.
7. **Migrar** home, lobby, header, colinha e vitória para o kit (as duas últimas são refeitas nas Fases D e E, aqui só usam os componentes).
8. Remover `.corner-btn`, `.repo-link` e botões `game-btn` com gradiente quando já não houver uso.

**Arquivos principais:** `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/room/[id]/page.tsx`, `src/components/game/helpers.ts`, `src/components/game/GithubLink.tsx`, `src/components/game/CheatSheet.tsx`, novo `src/components/ui/*`, `public/art/imperio/icones/`.

**Pronto quando**
- Nenhum botão do site usa estilo fora do kit (conferir por busca: `game-btn`, `corner-btn`, `repo-link`, `linear-gradient` em botão).
- Zero emoji do sistema na interface (busca por emojis em `src/` e `app/`).
- Header com um único estilo de botão; logo no header e na aba do navegador.
- Capturas de tela antes/depois da home, lobby e header anexadas em `docs/img/`.

**Testes:** unitários nada novo (é visual). Atualizar seletores de E2E que dependam de classes removidas. E2E só quando o Alexandre pedir.

---

## Fase B: Hierarquia da mesa (o maior ganho)

**Objetivo:** qualquer pessoa olha por 3 segundos e sabe **de quem é a vez** e **o que acabou de acontecer**, como no poker online e no Balatro.

**Por quê:** é a queixa mais séria. Hoje a informação está nos cantos e o olho viaja ~1900 px.

**Tarefas**

**B1. Escala.** Hoje os tamanhos são fixos em px (`Card.tsx` `DIMS`: 40×56 e 88×124; `Seat.tsx` `width: 96`; `GameBoard.tsx` `DOCK_HEIGHT = 214`), calibrados para 1280×720. Introduzir uma unidade de escala (degraus inteiros, decididos na Fase 0) aplicada a assentos, cartas e dock, de forma que no 1920×1080 a mesa seja ocupada e legível, em vez de pequena e vazia.

**B2. Informação no assento.**
- **Relógio como anel** em volta do retrato de quem deve jogar. Substitui a pílula `⏱` do canto e é onde o aviso dos últimos 5s aparece (anel vermelho, número grande sobre o retrato). O texto "joga Renda em 3…" passa para a legenda do centro (B4).
- **Marcador de vez**: um medalhão ("fecha de dealer" do poker) que anda de assento em assento.
- **Balão da jogada** sobre o assento de quem agiu ("Assassinar → Anny"), por alguns segundos, em pixel art.
- **Quem a mesa espera** ganha marca no assento (já existe o ✔ de quem passou; falta a marca de quem ainda precisa reagir).

**B3. Fichas como imagens (um sprite por quantidade, com variantes).**
Cada quantidade de fichas tem a **sua própria pixel art**: 1 ficha, 2 fichas, 3 fichas… Não é um número e **não é a mesma ficha copiada N vezes**.

- **Quantidades:** sprite próprio para **1 a 10 fichas**. De **11 em diante**, "montes" maiores (faixas 11–15, 16–25, 26+). O Erário usa os montes (e, se aprovado, o baú que enche).
- **Variedade (o que evita o "ctrl+c ctrl+v"):** **3 variantes por quantidade** (A, B, C): pilha arrumada, pilha torta, fichas espalhadas, uma de lado, faces diferentes à vista. A variante sai de um **hash determinístico de (id do jogador, quantidade)**: o mesmo jogador com 4 fichas sempre vê a mesma pilha (sem piscar), e jogadores diferentes têm pilhas diferentes lado a lado. Alternativa a testar no mockup: trocar de variante a cada mudança de quantidade.
- **Número pequeno** em fonte pixel ao lado, só para leitura exata. A informação principal é o sprite.
- **0 fichas:** decidir no mockup (sem sprite, ou uma ficha apagada).
- **Como gerar:** script `tools/art/fichas.ts`, **procedural, com seed fixa e a paleta mestra** (`tools/art/palette.json`). Ele combina faces de ficha e layouts de pilha com variações em pixels inteiros (deslocamento, inclinação por posições pré-desenhadas, face ou verso) e gera todas as combinações. O Alexandre e o Claude **curam as 3 melhores por quantidade** (como na curadoria de retratos com `--seeds`) e retocam à mão se precisar. **Não usar IA de imagem (SDXL) aqui**: objetos pequenos e repetidos saem inconsistentes.
- **Interativas** (assumi que "iterativas" era isso; se era outra coisa, ajustar na Fase 0):
  - **Ganhar:** a ficha voa (`CoinFlights`) e a pilha troca para o sprite da nova quantidade com um "pop" de 2 quadros.
  - **Perder ou ser roubado:** as fichas de cima saem e voam para quem recebeu (Extorquir) ou para o Erário (Assassinar, Golpe).
  - **Exílio:** a pilha desmorona para o Erário.
  - **Passar o mouse:** mostra o número exato e, quando a ação em foco custa fichas, as fichas **fantasma** que sairiam (já previsto no `docs/DESIGN_MESA_V2.md`).
  - **10 ou mais:** a pilha ganha um aviso pixel de Golpe obrigatório.
- **Volume de arte:** 10 quantidades × 3 variantes = **30 sprites**, mais montes (3 faixas × 2 variantes = **6**), mais as animações de pop e de tombar (2 a 4 quadros). Tamanhos (`sm` e `lg`) definidos na Fase 0, seguindo a convenção `<nome>.png` + `<nome>.sm.png`.
- **Arquivos:** `public/art/imperio/fichas/<n>/<variante>.png` e `public/art/imperio/fichas/monte/<faixa>/<variante>.png`. Função pura `chipSprite(count, playerId)` em `helpers.ts` (devolve o caminho do arquivo), **com teste unitário**: determinismo, toda quantidade de 0 até o máximo cai num arquivo que existe, e as variantes se distribuem entre jogadores.

**B4. Centro da mesa.** Baralho da Corte e Erário perto do centro. A **legenda curta** (uma linha, fonte pixel) diz o que a mesa espera ("Aguardando você e Caio: contestar ou passar") e carrega o aviso dos 5s. Reaproveitar `deriveRoundStatus` e `timeoutWarning` (`src/components/game/status.ts`), que **continuam como estão e já têm teste**; só muda onde são exibidas.

**B5. Cabeçalho sem texto de status.** Remover `TurnBanner` e `RoundStatusSlot` do cabeçalho. Manter um `role="status"` visualmente oculto para leitores de tela.

**B6. Histórico de Intrigas** (canto superior direito): manter, mas no estilo do kit e sem cobrir assentos.

**Arquivos principais:** `src/components/game/Table.tsx`, `Seat.tsx`, `Card.tsx`, `GameBoard.tsx`, `CoinFlights.tsx`, `ClaimCard.tsx`, `IntrigueFeed.tsx`, `status.ts` (reuso), `TurnBanner.tsx` (removido), `app/dev/mesa/page.tsx` (revisão).

**Pronto quando**
- **Teste dos 3 segundos** com alguém que não viu a mesa: responde "de quem é a vez?" e "o que aconteceu agora?" corretamente, em 1920×1080 e em 1280×720.
- Nenhum elemento de informação fica a mais de ~1/3 da largura de distância do assento de quem age.
- **Fichas:** cada quantidade de 1 a 10 mostra um sprite próprio, e dois jogadores com a mesma quantidade **não** mostram pilhas idênticas na maioria das vezes; os 36 arquivos existem e `chipSprite` tem teste verde.
- `layoutIssues` do E2E (assentos fora da tela, sobrepostos, dock cortado) limpo em 1280×720, 1600×900, 1920×1080 e 2560×1440 com 2 a 6 jogadores.
- Testes unitários de `status.ts` seguem verdes (a lógica não mudou).

---

## Fase C: Dock imersivo (a barra de baixo)

**Objetivo:** tirar a cara de "app" da parte de baixo **sem perder** as zonas fixas, que existem para os botões nunca mudarem de lugar (decisão de usabilidade a manter).

**Tarefas**
1. Manter as três zonas (`data-zone` básicas / centro / reações). Trocar a **casca**: remover o fundo retangular de largura total.
2. Aplicar a variação escolhida na Fase 0 (cavalete de madeira, mão sobre a madeira da mesa, ou bandeja). A madeira da borda da mesa continua até o fim da tela.
3. Ações básicas como **selos/fichas sobre a madeira** (`ActionSeal` e `WaxSeal` já existem), sem painel em volta.
4. Reações (Contestar, Bloquear, Passar) aparecem **perto da jogada**, como selos grandes, em vez de um bloco no canto direito.
5. "Passar automático" vira uma chave pequena em pixel; as dicas de tecla (`C`, `Espaço`) ficam menores.
6. Alvos de clique com **no mínimo 44 px**.

**Arquivos principais:** `GameBoard.tsx` (estilos `dock`), `BasicActions.tsx`, `ReactionTray.tsx`, `HandView.tsx`, `AutoPassToggle.tsx`, `ActionSeal.tsx`.

**Pronto quando**
- Não existe elemento de fundo retangular com largura de tela cheia na parte de baixo.
- Mão, selos e reações usam só o kit, em 1280×720 e 1920×1080, sem sobreposição (`layoutIssues` limpo).
- Teclas C, B e Espaço continuam funcionando (os testes de atalho existentes seguem válidos).

---

## Fase D: Tela de fim de partida

**Objetivo:** consertar o que está fora da arte e transformar o "beco" em ponte para a próxima partida.

**Hoje** (`VictoryPanel.tsx`): círculo com **iniciais** em cor aleatória (resto da versão sem retratos), 🏆⚔️💰 como emoji do sistema, painel bege que não existe em nenhum outro lugar.

**Tarefas**
1. **Retrato pixel do vencedor** (o mesmo da mesa, via `assignAvatars`), em moldura do kit.
2. **Troféu e ícones dos prêmios** em pixel (lista da Fase 0), no lugar dos emojis.
3. Painel na paleta da mesa, via `PixelPanel`.
4. **Botão de revanche grande**, com atalho de teclado, e o aviso de espectadores (já existe `victory-wait`).
5. Espaço para o **placar da noite** (Fase F1): vitórias de cada um nesta sala.
6. Uma animação curta e leve (moedas ou confete em pixel), respeitando `prefers-reduced-motion`.

**Arquivos principais:** `src/components/game/VictoryPanel.tsx`, `src/lib/game/awards.ts` (campo de ícone no lugar de emoji), `app/dev/mesa/page.tsx` (`?fase=fim`).

**Pronto quando:** nenhum emoji do sistema na tela; retrato do vencedor igual ao da mesa; painel só com paleta e fonte do kit.

---

## Fase E: Colinha como objeto

**Objetivo:** a colinha deixa de ser um despejo de dados e vira **uma peça do jogo**, como a carta de referência do Coup físico (que o Alexandre mandou de modelo).

**Hoje:** 5 tiles com chips de texto repetidos ("Não pode ser contestada" aparece 3 vezes) e uma parede de regras. Tudo a 13px.

**Tarefas**
1. **Uma peça só** (pergaminho ou carta de referência), abrindo como carta que sobe, no kit.
2. Personagem com **retrato maior**, uma linha de ação, e **ícones pixel** (✓ e ✗) para "contestável" e "bloqueável" no lugar de chips de texto.
3. Regras em **no máximo 5 linhas curtas**, cada uma com ícone (alvo: até ~60 palavras).
4. Cabe em 1280×720 **sem rolagem**.
5. **Não mexer na lógica**: `buildCheatSheet()` e seus 8 testes ficam como estão (mudança só de apresentação). Continuam valendo `?` para abrir e `Esc` para fechar sem cancelar a mira.

**Arquivos principais:** `src/components/game/CheatSheet.tsx`, `cheatsheet.ts` (sem mudar), `app/dev/colinha/page.tsx`.

**Pronto quando:** cabe sem rolar em 1280×720; a leitura dos 5 personagens leva poucos segundos; testes unitários da colinha verdes.

---

## Fase F: Retenção ("mais uma partida")

**Objetivo:** fazer a partida seguinte parecer a coisa óbvia a fazer. Esta trilha é **de design de jogo**, não de polimento, e pode andar em paralelo às fases B a E depois da A.

**O que o feedback mostrou:** o Alexandre enjoou na 2ª partida e saiu na 3ª, **com 2 jogadores** (Coup foi feito para 4 a 6). Parte disso é familiaridade (ele é o dev e já jogou muito); os amigos jogaram ~3 partidas e gostaram. Mesmo assim, nada liga uma partida à outra, e é isso que cria o "mais uma" no poker e no Balatro.

**Entregas (da mais barata para a mais cara)**

| # | Entrega | Detalhe |
|---|---|---|
| F1 | **Placar da noite** | Vitórias por jogador na sala, em memória (`room.scoreboard`), mostradas no fim de partida e no lobby. Some quando a sala some (aceito pela arquitetura sem banco). Evento novo `room:score` |
| F2 | **Revanche sem atrito** | Um clique, atalho, e a próxima partida já começa com o vencedor na vez (isso já existe no servidor) |
| F3 | **Títulos da noite** | Os prêmios por partida (Carrasco, Ricaço…) acumulam: "Mentiroso da noite", com quem lidera |
| F4 | **Ritmo** | Cortar tempo morto: rever o turno padrão (45s), acelerar animações que atrasam, e dar ao jogador eliminado algo para fazer (assistir com comentários, como o espectador já faz) |
| F5 | **Personalidade** | Falas e bordões dos personagens (é a Fase 6 do `docs/ROADMAP.md`) e 4 emotes rápidos entre jogadores. É o que dá "carinha" e conversa à mesa |
| F6 | **Modo de 2 jogadores** | Pesquisar e decidir: variante (mais vidas, ou o Inquisidor do Coup Reformation) ou orientar no lobby "melhor com 4+". **Decisão do Alexandre** |
| F7 | **Medir** | Registrar no servidor (linha de log em JSON, sem banco) quantas revanches cada sala pede, para saber se o "mais uma" realmente melhorou |

**Decisão a tomar:** quais F entram na v3. **Recomendação:** F1, F2, F3, F7 (baratos e direto no "mais uma"); F4 e F5 se der tempo; F6 só depois de medir.

**Pronto quando:** F1+F2+F3 funcionando com testes unitários e de integração (placar na sala, reset ao apagar a sala); F7 escrevendo o log; e **a meta de comportamento**: medir a média de partidas por sala numa noite com 4+ amigos **antes** de ligar F1 a F3 (linha de base), e só então combinar a meta com o Alexandre. Sucesso = média acima da linha de base. (Hoje não há número: o que se sabe é que os amigos jogaram ~3 partidas e gostaram.)

---

## Fase G: Fechamento e lançamento da v3

1. **Testes:** `npm test`, `npx tsc --noEmit`, `npx eslint .`, `npm run build` e **o E2E completo** (nesta fase, sim, rodar tudo; é o momento de pagar o custo uma vez). Corrigir o teste de contestação instável.
2. **Teste exploratório** com Claude for Chrome na branch local, com objetivos (não passo a passo): criar sala, abrir 2 abas, jogar uma partida, tentar quebrar.
3. **Playtest com amigos** (3 salas, de 2 a 6 pessoas), com 3 perguntas fixas: "de quem é a vez?", "o que acabou de acontecer?", "quer jogar mais uma?". Anotar as respostas em `docs/PROXIMAS_VERSOES.md`.
4. **Documentação:** atualizar `README.md` (rodar `tools/readme-shots.ts` para gerar prints novos), `game-rules.md`, `docs/ROADMAP.md`.
5. **Resolver as pendências herdadas** (lista no topo).
6. **Lançar:** merge da branch na `main`, `git tag v3`, push da tag, deploy no Render (build com `npm install --include=dev && npm run build`, start `npm start`).

**Pronto quando:** tudo verde, os 3 playtests feitos, a `main` com a v3 no ar, tag publicada.

---

## Ordem, esforço e dependências

| Ordem | Fase | Esforço | Depende de | Observação |
|---|---|---|---|---|
| 1 | **0** Mockups e decisões | P | nada | Sem isto, não começar |
| 2 | **A** Kit de UI | G | 0 (+ arte de ícones) | Destrava todas |
| 3 | **B** Hierarquia da mesa | G | A (+ arte das fichas) | Maior ganho; as fichas são a maior parte da arte nova |
| 4 | **C** Dock imersivo | M | A, B1 (escala) | |
| 5 | **D** Fim de partida | M | A (+ arte de prêmios) | Usa F1 se já existir |
| 6 | **E** Colinha | P | A | Só apresentação |
| 7 | **F** Retenção | M | A (F1 a F3 independem do visual) | Pode andar em paralelo às B a E |
| 8 | **G** Fechamento | M | todas | |

P = poucas horas, M = uma sessão, G = mais de uma sessão.

## Regras de execução (para o Claude, na próxima rodada)

- Trabalhar **uma fase por vez**, na ordem. Commit por entrega, mensagem descritiva, **sem atribuição a Claude/Anthropic**.
- **Mockup aprovado antes de UI nova** (Fase 0). Não pular.
- **Não mexer em regra de jogo** nas Fases A a E (a engine está testada). A Fase F mexe no servidor só para o placar e o log.
- **Testes:** escrever os três níveis quando a mudança pedir (política do `CLAUDE.md`), mas **rodar o E2E só quando o Alexandre pedir, e na Fase G**. No dia a dia: `npm test`, `npx tsc --noEmit`, `npx eslint .`.
- Funções puras novas ganham teste unitário. Seletores de E2E novos usam `data-testid`.
- Nada de dependência nova sem avisar.
- Servidor de desenvolvimento do Alexandre pode estar na porta 3000: nunca `kill` por porta; avisar antes de editar muitos arquivos de uma vez.
- Push só da branch de trabalho; **a `main` só recebe merge na Fase G, com aprovação explícita**.

## Riscos

| Risco | Mitigação |
|---|---|
| Mudar de ideia o tempo todo (já aconteceu) | Mockups aprovados na Fase 0 e o Backlog pós-v3: ideia nova não entra na fase em andamento |
| Pixel art em escala fracionada fica borrada | Escala em degraus inteiros; testar `image-rendering: pixelated` |
| Fonte pixel sem acento ou ilegível em tamanho pequeno | Testar com texto real em pt-BR na Fase 0; manter sans para texto longo se preciso |
| Ícones gerados por IA saem inconsistentes | Para UI pequena, desenhar por script/à mão e padronizar na paleta mestra |
| Refazer layout quebra os testes de layout | Rodar `layoutIssues` nas 4 resoluções ao fim das Fases B e C |
| Volume de arte das fichas (36+ sprites) e parecer cópia | Gerador procedural com seed e variação em pixels inteiros; curar 3 por quantidade; hash por jogador |
| Retenção é subjetiva | Fase F7: medir revanches por sala antes e depois |

## Backlog pós-v3 (ideias que NÃO entram agora)

- Ciclo de luz da mesa (Fase 7 do `docs/ROADMAP.md`).
- Trilha de música por IA e troca de temas (Fase 8 do `docs/ROADMAP.md`).
- Versão para celular (adiada para a v4).
- _(coloque aqui qualquer ideia nova que surgir durante a v3)_
