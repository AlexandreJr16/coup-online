# Vida e Blefe: animação, efeitos e feedback visual

> Escrito em 16/10/2026. **Especificação para a próxima rodada de código** (Fase H do `docs/PLANO_V3.md`).
> Nada aqui foi implementado ainda. Este é um dos documentos mais importantes do projeto:
> é o que transforma um jogo que funciona em um jogo que **parece vivo**.

## Sumário

1. [Visão](#1-visão)
2. [Regras de ouro](#2-regras-de-ouro)
3. [A gramática visual](#3-a-gramática-visual)
4. [O que já existe e será reaproveitado](#4-o-que-já-existe-e-será-reaproveitado)
5. [Arquitetura técnica](#5-arquitetura-técnica)
6. [Catálogo A: estados persistentes (o jogo "tem memória")](#6-catálogo-a-estados-persistentes)
7. [Catálogo B: o blefe como espetáculo](#7-catálogo-b-o-blefe-como-espetáculo)
8. [Catálogo C: perda, exílio e vitória](#8-catálogo-c-perda-exílio-e-vitória)
9. [Catálogo D: as ações de cada personagem](#9-catálogo-d-as-ações-de-cada-personagem)
10. [Catálogo E: microanimações de intuição](#10-catálogo-e-microanimações-de-intuição)
11. [Catálogo F: ambiente e social](#11-catálogo-f-ambiente-e-social)
12. [Fila, prioridade e ritmo](#12-fila-prioridade-e-ritmo)
13. [Inventário de arte](#13-inventário-de-arte)
14. [Inventário de som](#14-inventário-de-som)
15. [Acessibilidade e preferências](#15-acessibilidade-e-preferências)
16. [Ferramentas de revisão e testes](#16-ferramentas-de-revisão-e-testes)
17. [Plano de execução (H0 a H8)](#17-plano-de-execução)
18. [Escopo da v3 e o que fica para depois](#18-escopo-da-v3-e-o-que-fica-para-depois)
19. [Decisões em aberto](#19-decisões-em-aberto)
20. [Riscos](#20-riscos)
21. [Mapa de arquivos](#21-mapa-de-arquivos)
22. [Glossário](#22-glossário)

---

## 1. Visão

### O que o Alexandre pediu (nas palavras dele, organizadas)

- O jogo precisa ser **vivo**. Hoje ele funciona, mas é "seco".
- A inspiração **não é luta literal**. É o que os jogos de luta fazem de melhor: **quando você perde, o seu boneco aparece machucado**. A reação dá vida, os golpes não.
- Como o jogo é **puro blefe**, a animação de blefe é a mais valiosa de todas. Referência: o momento de um programa de TV em que se revela se a resposta é verdadeira ou falsa, com suspense, e depois o vencedor sorri e o perdedor fica abatido.
- Ao **contestar**, deve haver um **mini suspense**: foco no centro da mesa, os dois jogadores num duelo, e depois a revelação.
- Ao **ser exilado**, uma cena: o personagem pega um barco.
- Os retratos hoje são neutros. **Talvez nem seja preciso regerar as fotos**; a moldura dourada, a moldura rachada e outros efeitos já contam a história.
- Além do espetáculo, **pequenas animações que deixem o jogo mais intuitivo**, para ele se explicar sozinho.

### O que isso significa, em uma frase

> **O jogo reage a tudo que acontece, de forma curta e legível, sem nunca revelar o que está escondido.**

### Três tipos de "vida" (e a ordem de importância)

| Tipo | Exemplo | Por que importa |
|---|---|---|
| **Memória** (estado que fica) | A moldura do jogador que apanhou segue rachada | Dá para ler a partida inteira olhando os retratos, sem texto |
| **Espetáculo** (cena rara e forte) | O duelo da contestação, o exílio, a vitória | É o que o jogador comenta depois e o que dá "mais uma" |
| **Intuição** (microanimação frequente) | O medalhão que anda para a próxima vez, a linha da mira | Faz o jogo se explicar sozinho |

---

## 2. Regras de ouro

### 2.1 Nenhuma animação pode vazar informação (a mais importante)

Num jogo de blefe, uma animação diferente entre "verdade" e "blefe" entregaria a resposta. Por isso:

- Quem declara Taxas faz a **mesma animação** sendo verdade ou blefe, para todos os observadores, **inclusive para quem declarou**.
- A verdade **só aparece na contestação**, no instante da revelação.
- A única diferença privada é a **máscara no selo do próprio jogador** (já existe e só ele vê).
- A tensão que cresce durante uma janela de reação cresce **com o tempo**, nunca com a verdade.

**Como garantir isso no código:** o diretor de cena recebe uma **projeção pública** da view, sem as cartas do próprio jogador (a view que o jogador recebe contém a mão dele). Isso vira um **teste unitário de propriedade**: a saída do diretor é **idêntica** quando trocamos a mão do observador (ver seção 16.3).

### 2.2 Os retratos continuam neutros

As 12 fotos de perfil são neutras e **não serão regeneradas** para a v3. O dano, o brilho, o suor e as reações vêm de **camadas por cima** (moldura, curativo, emote, filtro). Isso é barato, consistente e funciona com qualquer avatar (todos têm 64×92).

Rostos novos (sorrindo, abatido) ficam como **etapa opcional** (H8), condicionada a um teste de uma tarde.

### 2.3 Curto, e sempre pulável

- Cena frequente: **no máximo ~400 ms**.
- Cena rara e forte (duelo, exílio, vitória): **no máximo ~2,7 s**, com **pular** (clique, `Espaço` ou `Esc`).
- Nada **bloqueia o clique** além do centro da tela durante o duelo.

### 2.4 O servidor não espera pela animação

O servidor já sabe o resultado na hora. A animação é **apresentação no cliente**. A escolha de carta de quem perdeu aparece **ao fim** do veredito (cerca de 2 s dos 30 s de `CHOICE_TIME`, e o relógio do servidor segue). Não mexemos em regra de jogo nem em temporizador nesta fase.

### 2.5 Uma coisa grande por vez

Se tudo brilha, nada se destaca. Cada momento tem **um** protagonista visual. As demais camadas ficam discretas (princípio 9 do `docs/PLANO_V3.md`).

### 2.6 Vocabulário único

Os mesmos sinais significam as mesmas coisas em todo o jogo (seção 3). Efeito novo reaproveita um sinal existente antes de inventar outro.

### 2.7 Quem não está olhando não paga

Aba em segundo plano (o navegador congela animação), reconexão e espectador que chega no meio **não reproduzem cenas atrasadas**: vão direto para o estado final (ver seção 12.4).

---

## 3. A gramática visual

O jogador aprende estes sinais sem ler nada:

| Sinal | Significa | Onde aparece | Cor (da paleta mestra) |
|---|---|---|---|
| **Dourado** | verdade, ganho, vencedor, a vez | moldura na vez, carimbo de verdade, vitória | ouro |
| **Vermelho** | perigo, ameaça, dano agudo | alvo de Golpe obrigatório, flash de dano, aviso de tempo | vermelho |
| **Máscara** | blefe | selo privado, desmascarado | roxo/escuro |
| **Rachadura** | dano sofrido | moldura do jogador que perdeu influência | marrom escuro/cinza |
| **Lacre de cera** | decisão oficial / jogada declarada | carta no centro, carimbos | vermelho-lacre |
| **Escudo** | bloqueio | carta bloqueada | prata |
| **Ampulheta** | a mesa está esperando | janela de reação | areia |
| **Cinza** | fora do jogo ou ausente | exilado, desconectado | cinza |

> **Revisão de uma ideia anterior:** propus que a moldura mudasse de bronze para prata e ouro conforme a riqueza. **Retirei isso** para não diluir o dourado (que já significa "a vez" e "verdade"). A riqueza fica nas **pilhas de fichas** (Fase B3 do plano) e nos selos de ameaça (seção 6.3).

---

## 4. O que já existe e será reaproveitado

Não partimos do zero. Já temos (código de 16/10/2026):

| Peça | Arquivo | O que faz hoje | Papel na Fase H |
|---|---|---|---|
| Derivação de eventos | `src/components/game/events.ts` (`deriveEvents`), `useGameEvents.ts` | Compara duas views seguidas e extrai log, bloqueio, contestação e variação de moedas | **Base do diretor de cena** (estender) |
| Contestação pública | `GameView.lastChallenge` (`n`, `challengerId`, `accusedId`, `claimed`, `accusedHadCard`, `kind`) | Todos veem quem contestou, o acusado, a carta e o veredito | Gatilho do duelo |
| Revelação da carta | `ChallengeReveal.tsx` | Mostra a carta alegada com o veredito e some sozinha | **Evolui para o Duelo** |
| Selo de cera | `WaxSeal.tsx` | Estampa "CONTESTADO!" e "BLOQUEIO" | Carimbos |
| Tremor da mesa em blefe | `GameBoard.tsx` (classe `shake`, `table-shake`) | A mesa treme quando um blefe é desmascarado | Reaproveitar na reação |
| Moedas voando | `CoinFlights.tsx`, `motion.ts` (`spawnCoins`, `planCoinFlights`) | Moedas voam entre assentos | Fichas que pousam (Fase B3) |
| Cartas voando do baralho | `FlyFromDeck.tsx`, `motion.ts` (`flyIn`) | Distribuir e comprar | Troca visível |
| Movimento reduzido | `motion.ts` (`reducedMotion()`) | Detecta a preferência do sistema | Base da seção 15 |
| Keyframes | `app/globals.css` (`turn-pulse`, `seal-stamp`, `coin-rise`, `target-pulse`, `urgent-pulse`, `lamp-flicker`, `table-shake`, `foil-drift`, `pop`) | Efeitos pontuais | Reuso |
| Áudio procedural | `src/lib/audio/recipes.ts` | 13 efeitos: `moeda`, `carta_vira`, `lacre`, `contestar`, `verdade`, `blefe`, `eliminado`, `vitoria`, `tick`, `vez`, `passar`, `erro`, `distribuir` | Reuso + novos (seção 14) |
| Ícones de ação | `public/art/imperio/icones/` | `renda`, `ajuda_externa`, `golpe`, `taxas`, `assassinar`, `extorquir`, `trocar`, `bloquear`, `passar`, `mascara`, `cadeado` | Balões e selos |
| Passou (✔) e urgência | `Seat.tsx` | Marca de quem passou; pulso de quem a mesa espera | Reuso |

**Fato importante descoberto ao escrever este documento:** quando uma contestação é **vencida por quem foi contestado** (`accusedHadCard === true`), o engine **troca a carta provada por outra do baralho** (`replaceCard`). Hoje isso é **invisível**. E é **derivável de dados públicos**: `lastChallenge.accusedHadCard === true` significa que houve troca. Então a animação da troca (seção 7.6) **não exige mudar o servidor**.

---

## 5. Arquitetura técnica

### 5.1 Visão geral

```
view (GameView) ──► projeção pública ──► deriveEvents (existente, estendido)
                                              │
                                              ▼
                                   DIRETOR DE CENA  (puro, testável)
                                   eventos → Cena = lista de Beats
                                              │
                                              ▼
                                  FILA (prioridade, coalescência, pular)
                                              │
                                              ▼
                                  EXECUTOR  (camada de cena no GameBoard)
                                  WAAPI/CSS + sprites + partículas + áudio

view ──► seatWear() (puro) ──► camadas persistentes no assento (dano, ameaça…)
         (sem eventos: derivado do estado a cada render)
```

Duas vias separadas:
- **Estado persistente** (dano, ameaça, ausência): função pura do estado atual. Nada de fila. Sempre correto, mesmo após reconexão.
- **Cenas** (duelo, perda, exílio): disparadas por **mudanças** entre views consecutivas, passam por fila e podem ser puladas.

### 5.2 Tipos (proposta)

```ts
// src/components/game/fx/types.ts (proposta)
type Alvo =
  | { tipo: "assento"; jogadorId: string }
  | { tipo: "centro" }
  | { tipo: "baralho" }
  | { tipo: "erario" }
  | { tipo: "tela" };

interface Beat {
  em: number;            // ms desde o início da cena
  dur: number;           // ms
  alvo: Alvo;
  efeito: EfeitoId;      // "slide-ao-centro" | "vinheta" | "flip" | "carimbo" | "rachar" | ...
  param?: Record<string, number | string>;
  sfx?: SfxName;         // som sincronizado
  pulavel?: boolean;     // pular salta até o último beat com `final: true`
  final?: boolean;       // estado de chegada ao pular
}

interface Cena {
  id: string;            // ex.: "duelo#12" (usa lastChallenge.n)
  prioridade: 0 | 1 | 2 | 3;   // 3 = drama alto (duelo, exílio, vitória)
  duracaoMax: number;    // teto de segurança
  beats: Beat[];
  bloqueiaUI?: { alvo: "revelacao"; ate: number }; // libera a escolha de carta ao fim
}
```

### 5.3 O diretor de cena (`directScene`)

- **Puro**: `(visaoPublicaAnterior, visaoPublicaAtual, eventosDerivados) → Cena[]`. Sem DOM, sem relógio, sem aleatoriedade (variante é parâmetro, vem de hash estável).
- **Testável** como `status.ts` e `events.ts`: um teste por cena, mais os testes de propriedade da seção 16.3.
- Estende `deriveEvents` com os eventos que faltam: `vezMudou`, `jogadaDeclarada`, `alguemPassou`, `influenciaPerdida`, `eliminado`, `cartaTrocada` (derivado de `lastChallenge`), `partidaIniciada`, `venceu`.

### 5.4 O executor

- Componente `CamadaDeCena` montado no `GameBoard`. Lê a fila e executa os beats.
- **Só `transform` e `opacity`** (compositor). Nada que cause reflow durante a animação.
- Animação por **Web Animations API** e classes CSS. **Sem biblioteca nova.** Se a equipe quiser GSAP ou Motion, **avisar antes de instalar** (regra do projeto).
- Pixel art com `image-rendering: pixelated` e **escala em degraus inteiros** (decisão da Fase 0 do plano).
- Partículas num `<canvas>` único ou em elementos reaproveitados, **com teto** (por exemplo 60 simultâneas).
- Sprites animados por **folha de sprites** (`background-position` em passos) ou sequência de quadros.

### 5.5 Estado persistente (`seatWear`)

```ts
// puro, por jogador, a partir da view pública
seatWear(jogador, view) → {
  integridade: 2 | 1 | 0;          // influências restantes
  ameaca: "nenhuma" | "golpe-pronto" | "golpe-obrigatorio"; // 7+ moedas, 10+ moedas
  ausente: boolean;                // desconectado (vem do `absentIds` do GameBoard)
  naVez: boolean;
}
```

Renderizado em camadas sobre o retrato e a moldura do `Seat`. Testes unitários para todos os limiares (6, 7, 9, 10 moedas; 2, 1, 0 influências).

### 5.6 Sincronia com o servidor e com a interface

| Situação | Comportamento |
|---|---|
| Veredito de contestação | O cliente já recebeu o resultado. Segura a **exibição** do desfecho até o beat do veredito. |
| Escolha de carta de quem perdeu (`aguardando_revelacao`) | Os botões de revelar aparecem **ao fim do veredito + 300 ms**. O relógio do servidor segue (custa ~2 s dos 30 s). |
| Jogada nova durante uma cena | A cena de prioridade maior continua; as menores **encurtam** (seção 12). |
| Espectador | Vê **as mesmas cenas** (todas usam só dados públicos). |
| Reconexão / aba que estava em segundo plano | **Sem replay.** Renderiza o estado persistente final. |
| Revanche | Limpa a fila e as camadas de dano. |

### 5.7 Desempenho

- Alvo: 60 fps em notebook comum. Medir no `/dev/cenas` com a cena mais pesada (duelo + partículas) em 1920×1080.
- Pré-carregar os sprites de FX no início da partida (evita piscar no primeiro duelo).
- Um `Image()` decodificado por sprite; reutilizar elementos DOM das partículas.

---

## 6. Catálogo A: estados persistentes

Estes efeitos **ficam** na tela enquanto o estado existir. São os mais baratos e os que mais mudam a leitura da mesa.

### 6.1 Integridade da moldura (o "boneco machucado") `PRIORIDADE ALTA`

| Influências | Aparência | Camadas |
|---|---|---|
| **2** | Moldura íntegra, dourada | nenhuma |
| **1** | Moldura **rachada** nos cantos + **curativo** na testa + retrato levemente dessaturado (~15%) | `rachadura`, `curativo`, `filtro-dessaturar` |
| **0** | Moldura **estilhaçada**, retrato cinza → dispara o **Exílio** (seção 8.2) | `estilhaços`, cena de exílio |

- A transição 2→1 é uma **cena curta** (seção 8.1), não um corte seco.
- Funciona em qualquer avatar (mesmas camadas posicionadas por proporção da moldura 64×92).
- **Persiste** até o fim da partida; a revanche zera.
- **Arte:** `rachadura` (1), `curativo` (1), `hematoma` (1, opcional), `estilhaços` (4 quadros). Ver seção 13.
- **Por que importa:** quem olha a mesa vê **quem está apanhando** sem ler nada.

### 6.2 Cartas reveladas ao lado do assento

As cartas perdidas ficam **viradas para cima, escurecidas e com uma rachadura**, em fileira ao lado do assento (já ficam reveladas hoje, ganham o tratamento visual). Mostram a história da partida: quem já caiu e com que personagem.

### 6.3 Ameaça (quem pode me atacar) `PRIORIDADE MÉDIA`

| Moedas | Selo | Significado |
|---|---|---|
| 7 a 9 | **Canhãozinho** pixel junto ao assento | "Pode dar Golpe de Estado" |
| 10 ou mais | **Alvo vermelho pulsando** sobre o retrato | "Golpe obrigatório no próximo turno" |

- Qualquer jogador vê, sem ler. Ajuda a decidir quem atacar, a quem bloquear e quem vigiar.
- É **informação pública** (as moedas são públicas), então não vaza nada.
- Discreto: no máximo 24 px. Segue a regra "uma coisa grande por vez".

### 6.4 Medalhão da vez + luz que segue a vez + anel de tempo `PRIORIDADE ALTA`

- **Medalhão** pixel (estilo "ficha de dealer" do poker) que **desliza** de assento em assento a cada turno (450 ms, com o som `vez`).
- **A luz segue a vez**: o assento ativo fica 15% maior, com moldura acesa; os outros escurecem um pouco (a mesa já tem `dimOthers`).
- **Anel de tempo** em volta do retrato de quem deve jogar (substitui a pílula `⏱`). Nos últimos 5 s fica **vermelho e pulsa**, com os dígitos sobre o retrato (hoje o aviso aparece na faixa do cabeçalho; ver Fase B do plano).
- Dígitos em **fonte pixel** (sem arte extra).

### 6.5 Jogador ausente

Retrato **apagado** (cinza), um **"zZz"** pixel flutuando ao lado e a placa de nome esmaecida. Substitui o aviso "sem conexão" em texto.

### 6.6 Plateia de espectadores `PRIORIDADE BAIXA, MAS ENCANTA`

Cada espectador vira uma **silhuetinha** assistindo na borda de baixo da mesa (3 modelos para variar). Entra com um pulinho e sai se levantando. O "👁 N" do cabeçalho some (e com ele o emoji).

---

## 7. Catálogo B: o blefe como espetáculo

O coração do jogo. A ordem abaixo segue a vida de uma jogada com blefe.

### 7.1 A declaração (sem vazar nada) `PRIORIDADE ALTA`

**Gatilho:** alguém declara uma ação de personagem ou ação geral.
**Quem vê:** todos, **idêntico** para verdade e blefe.

| Tempo | O que acontece |
|---|---|
| 0 ms | O retrato do ator **sobe** (recorte de papel levantando) |
| 0–300 ms | A **carta sai da mão do ator** (ou do assento, para os outros) e voa em **arco** até o centro, virada e com o **lacre** da ação |
| 300 ms | **Balão** sobre o assento do ator com o **ícone da ação** ("Assassinar → Anny" vira ícone + retrato) |
| 300–500 ms | Para ações com alvo: **linha** pontilhada animada liga ator e alvo |
| 500 ms | Os assentos que não participam **escurecem** levemente |

- Som: `lacre` (já existe).
- **Importante:** a carta no centro está **virada para baixo**. O jogador não mostra nada.
- Custo: **médio** (reaproveita `flyIn`, `WaxSeal`, `ClaimCard`).

### 7.2 A tensão da janela de reação `PRIORIDADE ALTA`

**Gatilho:** abre uma janela de reação (contestar, bloquear ou passar).
**Quem vê:** todos.

- **Ampulheta** pixel no lacre da carta, a areia caindo proporcional ao tempo da janela.
- A **vinheta** das bordas escurece aos poucos e um **batimento de coração** fica mais rápido nos últimos 40% do tempo.
- Quem já passou ganha o ✔ (existe). Quem ainda precisa reagir recebe um **pontinho pulsando**.
- **Regra de ouro:** a intensidade depende **só do tempo restante**, jamais de a jogada ser verdade ou blefe.
- Som: `tick` nos últimos segundos (existe) + **batida** (nova).

### 7.3 A contestação: o duelo `PRIORIDADE ALTA (a cena mais importante do jogo)`

**Gatilho:** `lastChallenge.n` muda (alguém contestou e o veredito chegou).
**Quem vê:** todos (inclusive espectadores). Prioridade 3.
**Duração:** ~2,6 s. **Teto:** 2,7 s. **Pular:** sim (vai direto ao veredito).

**Linha do tempo (a base é o programa de TV: foco → suspense → revelação → reação):**

| Tempo | Beat | Detalhe | Som |
|---|---|---|---|
| **0 ms** | **Foco** | A mesa escurece (véu a 55%). Os assentos fora do duelo recuam 8%. | `contestar` (existe) |
| **0–350 ms** | **Entrada dos duelistas** | Os **recortes de papel** dos retratos do contestador e do acusado deslizam de seus assentos até o centro, em arco, **frente a frente**. A faixa **"VS"** bate com um tranco. **Hit-stop de 60 ms.** | gongo curto (novo) |
| **350–1500 ms** | **Suspense** | Zoom lento (1,00 → 1,06). Vinheta pulsando de 60 para 100 bpm. **Batida de coração.** A carta alegada fica no meio, **virada para baixo**. As duas molduras tremem de leve, **com a mesma intensidade nos dois**. Aos 900 ms aparecem **gotas de suor nos dois** (igual). | batida (nova) |
| **1500–1900 ms** | **Revelação** | A carta **gira em câmera lenta** (flip 3D de 400 ms). | `carta_vira` (existe) |
| **1900 ms** | **Veredito** | **Hit-stop de 80 ms**, flash, tremor da mesa. Carimbo cai: **VERDADE** (dourado) ou **BLEFE!** (vermelho). Se blefe, a **máscara se estilhaça** (ver 7.4). | `verdade` ou `blefe` (existem) |
| **1900–2600 ms** | **Reação** | **Vencedor:** sobe, brilho dourado, estrelas. **Perdedor:** tomba, desbota, **gota de suor** e vinheta vermelha curta (ver 7.4 e 7.5). | |
| **2600 ms** | **Retorno** | Os recortes voltam aos assentos em arco. A mesa clareia. | `vez` (existe) |

**Antes do veredito (0 a 1900 ms) o duelo é idêntico para verdade e blefe.** Só no beat do veredito as sequências divergem.

**Pular:** clique, `Espaço` ou `Esc` salta para o beat do veredito (mostra o carimbo por 400 ms) e encerra. Quem perdeu pode escolher a carta logo depois.

**Variantes (para não cansar):** 3 variações da cena, sorteadas por hash estável de `lastChallenge.n`. Mudam o som do suspense (coração, tambor, relógio), a direção da entrada dos recortes e o tempo do suspense (±200 ms).

**Para ação e para bloqueio:** a mesma cena. Quando `kind === "block"`, o **escudo** aparece junto da carta alegada (seção 7.7).

**Interação com a interface:**
- A escolha de carta de quem perdeu (`aguardando_revelacao`) é liberada em **veredito + 300 ms**.
- A tela de quem **não** participa do duelo continua respondendo, exceto o centro.

**Custo:** G (a maior cena). Aproveita `ChallengeReveal.tsx`, `WaxSeal.tsx` e `lastChallenge`.

### 7.4 Blefe desmascarado `PRIORIDADE ALTA`

**Gatilho:** `lastChallenge.accusedHadCard === false`.

Sobre a cena do duelo, no beat do veredito:

1. A **máscara de baile** (ícone `mascara`, que já existe) aparece sobre a carta e **se estilhaça** em 4 quadros (~300 ms), com faíscas.
2. A moldura do **blefador racha por um instante** (efeito transitório) e o retrato balança.
3. O **contestador** recebe brilho **dourado** e estrelas (acertou).
4. Tremor da mesa (já existe a classe `shake`).

> **Atenção:** a rachadura aqui é **transitória**. A rachadura **persistente** da moldura só aparece quando a influência é de fato perdida, na cena de perda (seção 8.1), logo depois que o blefador escolhe a carta a revelar. Assim o estado persistente nunca contradiz o estado real do jogo.

Som: `blefe` (existe) + estilhaço (novo).

### 7.5 Verdade provada (o contestador errou) `PRIORIDADE ALTA`

**Gatilho:** `lastChallenge.accusedHadCard === true`.

1. A carta recebe um **carimbo dourado de autenticidade** ("VERDADE") com brilho.
2. O **acusado** sobe, com estrelas e um "ar de quem sabia" (o retrato se inclina levemente para trás).
3. O **contestador** leva o impacto: tomba, desbota, suor e vinheta vermelha curta.
4. Em seguida, a **troca da carta** (seção 7.6).

Som: `verdade` (existe).

### 7.6 A troca visível da carta provada `PRIORIDADE ALTA (resolve uma confusão real)`

**Hoje é invisível:** quando você prova a carta, o jogo troca ela por outra do baralho, e o jogador só percebe que a mão mudou. Isso confunde.

**Gatilho:** `lastChallenge.accusedHadCard === true` (derivável de dado público; **não exige mudança no servidor**).

| Tempo | O que acontece |
|---|---|
| 0 ms | A carta provada **voa de volta ao baralho** (arco de 350 ms) |
| 350–800 ms | O baralho **embaralha** (ondulação de cartas, som `distribuir`) |
| 800–1200 ms | Uma carta **nova, virada para baixo**, é **dada** ao assento do acusado (usa `FlyFromDeck`) |

- Para o **acusado**, a carta nova aparece **na mão dele, virada para cima** (ele vê o que recebeu); para os outros, ela é dada **virada para baixo**.
- Roda **em paralelo** com a escolha de carta do contestador (não bloqueia).
- É a melhoria de intuição de maior valor da lista: o jogador entende por que a mão dele mudou.
- Custo: **M** (reaproveita `FlyFromDeck`; o baralho precisa de uma animação de embaralhar).

### 7.7 O bloqueio `PRIORIDADE MÉDIA`

**Gatilho:** alguém bloqueia (Duque à Ajuda Externa, Condessa ao Assassinato, Embaixador ou Capitão à Extorsão).

| Tempo | O que acontece |
|---|---|
| 0 ms | O **escudo** desce sobre a carta da jogada (3 quadros) |
| 250 ms | **Impacto** ("clang"), tranco de tela, hit-stop de 50 ms |
| 300 ms | Carimbo **BLOQUEIO** (já existe em `WaxSeal`) |

- Se ninguém contesta o bloqueio, o escudo se **firma** e a carta escurece (a jogada falhou).
- Se contestam o bloqueio, vem o **duelo** (7.3) com o escudo ao lado da carta alegada.
- **Tell-free**: o escudo cai igual para bloqueio verdadeiro ou blefado.
- Som: `lacre` + clang (novo).

### 7.8 Perigo duplo (Assassinar contra Benzedeira)

Quando a vítima contesta o Assassino e perde, ou blefa Benzedeira e é desmascarada, ela perde **duas** influências de uma vez. A moldura **racha duas vezes** em sequência (700 ms de intervalo), e o assento vai direto para o **exílio**. É o momento mais dramático do jogo e merece o dobro de impacto (tremor maior, hit-stop de 120 ms).

### 7.9 O blefe social: emotes (liga com a Fase F5 do plano) `PRIORIDADE BAIXA`

Quatro emotes que o jogador pode lançar sobre o próprio retrato durante a partida: **suor**, **calma** ("Zzz" tranquilo), **"?"** e **sorriso suspeito**. São o "blefe de bastidor" (provocar sem falar). Cooldown de 3 s, visíveis a todos, pulsando 1,5 s. Nunca revelam carta.

---

## 8. Catálogo C: perda, exílio e vitória

### 8.1 Perda de influência `PRIORIDADE ALTA`

**Gatilho:** `integridade` cai de 2 para 1 (ou de 1 para 0).
**Quem vê:** todos. Prioridade 2. ~900 ms.

| Tempo | O que acontece |
|---|---|
| 0 ms | A carta escolhida **vira** (300 ms), mostrando o personagem |
| 300 ms | Uma **rachadura** de 3 quadros corta a carta; som de **crack** |
| 400 ms | O **retrato** pisca vermelho e treme (220 ms) |
| 500–800 ms | A carta racha e **desliza para a fileira de cartas reveladas** do assento, escurecida |
| 600 ms | A moldura troca para o estado **rachado** com **curativo** que "pipoca" (efeito `pop`) |

Se for a **última** influência, vai direto para o exílio (8.2).

### 8.2 O exílio: a cena do barco `PRIORIDADE ALTA`

**Gatilho:** jogador fica sem influência (`integridade` 1 → 0).
**Quem vê:** todos. Prioridade 3. ~2,6 s. **Pular:** sim.

**Uma cena compartilhada** (não uma por personagem). Referência histórica: o exílio da família imperial em 1889.

| Tempo | O que acontece | Som |
|---|---|---|
| 0 ms | A moldura **se estilhaça** (4 quadros, 300 ms). O assento escurece. | estilhaço (novo) |
| 300 ms | Sobe da parte de baixo uma **faixa de cenário pixel**: um **cais**, o **mar**, lanternas. | |
| 300–900 ms | O **recorte do retrato** do exilado entra pelo arco, **sobe no barco** (pulinho). Em paralelo, as **fichas dele escorrem** para o Erário. | `moeda` (existe) |
| 600 ms | Carimbo **EXILADO** cai. | `lacre` |
| 900 ms | **Apito de vapor.** O barco **parte** e sai pela direita em ~1,5 s, com ondas e fumaça. | apito (novo) |
| 2600 ms | A faixa de cenário desce. O assento fica **vazio**: placa com o nome **riscado**, lanterna apagada, cadeira vazia. | `eliminado` (existe) |

- **3 variações de veículo:** barco a vapor, jangada, canoa. Escolhido por hash do id do jogador.
- Tudo reaproveita **uma cena** e o recorte do retrato (não precisa de arte por personagem).
- O exilado **continua assistindo** (o jogo hoje o mantém na sala); ver Decisões em aberto.
- Custo: **G**, mas é a cena que mais "vende" o jogo.

### 8.3 Vitória `PRIORIDADE ALTA`

**Gatilho:** `fase === "fim_de_jogo"`. Prioridade 3. ~2,5 s antes do painel.

| Tempo | O que acontece |
|---|---|
| 0 ms | A mesa escurece. O **recorte do vencedor** vai ao centro. |
| 200 ms | A **moldura dourada pulsa**. **Coroa** pixel desce sobre ele. |
| 300–1800 ms | **Chuva de fichas** (partículas, com teto) e fanfarra curta. |
| 400 ms | Os outros retratos **inclinam** ~8° para baixo (reverência) ou, se foram exilados, aparecem em silhueta. |
| 1800 ms | O **painel de fim de partida** sobe (Fase D do plano), com o placar da noite. |

Som: `vitoria` (existe). Respeitar `prefers-reduced-motion`.

### 8.4 Revanche

O baralho **embaralha** em câmera acelerada, os retratos voltam à moldura íntegra com um brilho, o **medalhão da vez** entra no assento do vencedor, e um letreiro **"Partida N"** passa em pixel. Som: `distribuir`.

---

## 9. Catálogo D: as ações de cada personagem

Cada personagem tem uma **assinatura visual**: dá identidade e deixa a jogada legível mesmo de longe. A entrada (7.1) é comum; o que muda é o **efeito de resolução**, quando a jogada se completa.

| Ação | Personagem | Efeito de resolução | Arte nova | Som | Frequência |
|---|---|---|---|---|---|
| **Renda** (+1) | geral | 1 ficha voa do Erário à pilha, com "pop" | — | `moeda` | muito alta |
| **Ajuda Externa** (+2) | geral | Um **saquinho** derrama 2 fichas na pilha | saquinho (3q) | `moeda` | alta |
| **Taxas** (+3) | Barão do Café | **Chuva de moedas** do Erário até o Barão, em arco largo | partícula moeda | `moeda` x3 | alta |
| **Extorquir** | Coronel | Uma **mão pixel** sai do assento do Coronel, **puxa as fichas** do alvo e as traz | mão (3q) | `moeda` + puxão | média |
| **Assassinar** | Capoeira | **Navalha** cruza o retrato do alvo em diagonal (3 quadros), hit-stop de 60 ms, **gota vermelha**; as 3 fichas do custo voam ao Erário | navalha (3q), gota | navalha (novo) | média |
| **Golpe de Estado** | geral | **Canhão** na borda da mesa dispara; **projétil** em arco; **impacto** sobre a moldura do alvo, com tremor forte; as 7 fichas voam ao Erário | canhão (4q), projétil (2q), impacto (3q) | canhão (novo) | média |
| **Trocar** | Regatão | **Duas cartas** deslizam do baralho; o jogador escolhe; as devolvidas voltam ao baralho que **embaralha** | usa `FlyFromDeck` | `distribuir` | média |

**Nota de intuição:** a assinatura só é **mostrada na resolução**. Na declaração a animação é igual para todos (regra de ouro 2.1).

**Sugestão de prioridade:** Assassinar, Golpe e Taxas são os mais frequentes e mais legíveis; entram primeiro (H6).

---

## 10. Catálogo E: microanimações de intuição

Pequenas, frequentes, e **fazem o jogo se explicar sozinho**. Cada uma tem o seu "porquê".

| # | Microanimação | Detalhe | Por que ajuda a entender |
|---|---|---|---|
| E1 | **Medalhão da vez** deslizando | 450 ms, com o som `vez` | Mostra de quem é a vez sem texto |
| E2 | **Mira com linha pontilhada** | Da carta ao alvo, animada (dash); os alvos possíveis **tremem 1 px** | Fica claro "quem posso atacar" |
| E3 | **Ampulheta** no lacre | A areia cai proporcional ao tempo da janela | Mostra que a mesa **espera** e por quanto tempo |
| E4 | **Botão que "clica"** | Escala 0,94 por 80 ms, trava depois de usar | Confirma que a ação foi aceita |
| E5 | **Ação inválida** balança "não" | Selo balança 3 ciclos (240 ms), cadeado pisca, som `erro` | Explica por que não deu (moedas faltando, 10+ moedas) sem texto |
| E6 | **A mão respira** | Sobe e desce ±2 px em 2 s, quando é a sua vez | Diz "agora é você" sem faixa |
| E7 | **Hover na carta da mão** | Sobe 8 px; mostra o que a ação custa e ganha com fichas **fantasma** | Prévia do efeito (já previsto no `DESIGN_MESA_V2`) |
| E8 | **Hover na pilha de fichas** | Mostra o número exato | Leitura precisa sem poluir |
| E9 | **Fichas que pousam** | Voam e a pilha troca para o sprite novo com "pop" | Mostra de onde veio e para quem foi o dinheiro |
| E10 | **Carta que sai do baralho / volta** | Voo em arco | Mostra de onde as cartas vêm e para onde vão |
| E11 | **Quem passou** | ✔ no assento (existe) + a mão do jogador "abre" brevemente | Mostra quem já decidiu |
| E12 | **Alvo escolhido** | A linha pisca e some; o alvo recebe um "alvo" por 400 ms | Confirma o alvo |

Todas respeitam `prefers-reduced-motion` (viram trocas instantâneas).

---

## 11. Catálogo F: ambiente e social

| # | Efeito | Detalhe | Prioridade |
|---|---|---|---|
| F1 | **Lanternas** do fundo | 2 quadros de brilho vacilante (já existe `lamp-flicker`, ampliar) | baixa |
| F2 | **Poeira** no ar | Poucas partículas lentas na luz | baixa |
| F3 | **Plateia** de silhuetas | Seção 6.6 | baixa, mas encanta |
| F4 | **Emotes** | Seção 7.9 | média |
| F5 | **Jogador ausente** | Seção 6.5 | média |
| F6 | **Início da partida** | Lanternas acendem, cartas distribuídas, medalhão entra | média |

---

## 12. Fila, prioridade e ritmo

### 12.1 Prioridades

| Nível | Quem | Regra |
|---|---|---|
| **3** | Duelo, exílio, vitória | Tocam inteiras (podem ser puladas). Cenas menores **encurtam** durante elas. |
| **2** | Perda de influência, troca visível, Golpe, Assassinar | Tocam completas se não houver nível 3. Se houver, **encurtam** ou ficam em fila. |
| **1** | Declaração, Taxas, Extorquir, Trocar | Podem **encurtar** ou **fundir** com outras. |
| **0** | Renda, Ajuda Externa, microanimações | Nunca atrasam o jogo; **descartáveis**. |

### 12.2 Coalescência

Evitar a pilha de animações atrasadas:
- Várias cenas de nível ≤ 1 pendentes: tocam **só a mais recente**, as outras viram **estado final instantâneo**.
- Máximo de **2 cenas visíveis** ao mesmo tempo.
- Exemplo: dez Rendas seguidas (ritmo rápido) não formam fila; a pilha de fichas apenas "pipoca" a cada uma.

### 12.3 Orçamento de tempo por partida

Regra de bolso: **o total de drama alto (nível 3) numa partida de 4 jogadores não passa de ~25 s** (uns 8 a 10 eventos). Se começar a passar, algo está errado (cenas demais ou longas demais). Medir no `/dev/cenas`.

### 12.4 Pular, voltar e reconectar

| Situação | O que faz |
|---|---|
| Clique, `Espaço` ou `Esc` durante cena de nível 3 | **Pula** até o beat marcado como `final`, mostra o carimbo por 400 ms e fecha |
| Aba em segundo plano (`document.hidden`) | **Nenhuma cena** é executada; ao voltar, renderiza o estado persistente final |
| Reconexão (F5) | **Sem replay**: só o estado persistente |
| Muitos eventos de uma vez (diferença maior que 1 evento entre views) | Descarta as cenas e mostra o **estado final** |
| Espectador que entra no meio | Estado persistente atual, sem replay |

---

## 13. Inventário de arte

Tudo na **paleta mestra** (`tools/art/palette.json`), pixel art, fundo transparente. Convenção de nomes: `public/art/imperio/fx/<grupo>/<nome>/<quadro>.png` (e `.sm.png` quando houver miniatura).

**Como gerar:** para peças pequenas de efeito, **script procedural ou desenho à mão** é mais consistente que IA de imagem (objetos pequenos e repetidos saem inconsistentes). IA só onde ajuda (cenário do cais, se o Alexandre quiser). Registrar o método usado em `tools/art/README.md`.

| Grupo | Peça | Quadros | Qtd. | Uso |
|---|---|---|---|---|
| **Dano** | rachadura da moldura | 1 | 1 | 6.1 |
| | curativo | 1 | 1 | 6.1 |
| | hematoma (opcional) | 1 | 1 | 6.1 |
| | estilhaços da moldura | 4 | 1 | 6.1, 8.2 |
| **Carta** | rachadura da carta | 3 | 1 | 8.1 |
| | máscara estilhaçando | 4 | 1 | 7.4 |
| | carimbo VERDADE | 1 | 1 | 7.5 |
| | carimbo BLEFE! | 1 | 1 | 7.4 |
| | carimbo EXILADO | 1 | 1 | 8.2 |
| | carimbo CONTESTADO (já em `WaxSeal`, redesenhar no kit) | 1 | 1 | 7.3 |
| **Duelo** | faixa "VS" | 2 | 1 | 7.3 |
| | mão apontando | 2 | 1 | 7.3 |
| | gota de suor | 3 | 1 | 7.3 |
| **Bloqueio** | escudo descendo | 3 | 1 | 7.7 |
| **Tempo** | ampulheta | 4 | 1 | 7.2 |
| | medalhão da vez | 1 | 1 | 6.4 |
| **Ameaça** | canhãozinho (selo) | 1 | 1 | 6.3 |
| | alvo vermelho (selo) | 2 | 1 | 6.3 |
| **Ação** | navalha (corte) | 3 | 1 | 9 |
| | gota vermelha | 1 | 1 | 9 |
| | canhão (disparo) | 4 | 1 | 9 |
| | projétil | 2 | 1 | 9 |
| | impacto | 3 | 1 | 9 |
| | mão que puxa | 3 | 1 | 9 |
| | saquinho de moedas | 3 | 1 | 9 |
| **Exílio** | fundo do cais | 1 | 1 | 8.2 |
| | mar (loop) | 4 | 1 | 8.2 |
| | barco a vapor | 4 | 1 | 8.2 |
| | jangada | 4 | 1 | 8.2 |
| | canoa | 4 | 1 | 8.2 |
| | fumaça | 4 | 1 | 8.2 |
| **Vitória** | coroa | 1 | 1 | 8.3 |
| **Plateia** | silhuetas | 2 | 3 | 6.6 |
| **Emotes** | suor, calma, "?", sorriso suspeito, "!", raiva, "$", "zZz" | 2 | 8 | 6.5, 7.9 |
| **Partículas** | estrela, faísca, poeira, confete, fagulha | 1 a 2 | 5 | geral |
| **Baralho** | baralho por faixa de cartas (cheio, médio, pouco, última) | 1 | 4 | Fase B |
| **Fichas** | (especificadas na Fase B3 do plano) | — | 36 | Fase B3 |

**Total aproximado de FX (fora as fichas):** cerca de **110 quadros** em **~45 peças**. Todas pequenas.

**Opcional (H8):** rostos novos para os 12 avatares, 3 expressões cada (feliz, abatido, tenso) = **36 imagens**. Só com o teste de uma tarde aprovado (seção 17, H0).

---

## 14. Inventário de som

O áudio é **sintetizado em código** (`src/lib/audio/recipes.ts`, tipo `SfxName`). Nada de arquivo de som.

| Som | Estado | Onde |
|---|---|---|
| `moeda`, `carta_vira`, `lacre`, `contestar`, `verdade`, `blefe`, `eliminado`, `vitoria`, `tick`, `vez`, `passar`, `erro`, `distribuir` | **existem** | vários |
| `gongo` (entrada do duelo) | novo | 7.3 |
| `batida` (coração, acelerando) | novo | 7.2, 7.3 |
| `estilhaco` (máscara e moldura) | novo | 7.4, 8.2 |
| `crack` (carta rachando) | novo | 8.1 |
| `clang` (escudo) | novo | 7.7 |
| `navalha` | novo | 9 |
| `canhao` | novo | 9 |
| `apito` (barco a vapor) | novo | 8.2 |
| `clique` (botão) | novo | E4 |
| `embaralhar` | novo | 7.6, 8.4 |

**Mudo respeitado.** Variações de suspense (coração, tambor, relógio) são **receitas diferentes** do mesmo evento.

---

## 15. Acessibilidade e preferências

- **`prefers-reduced-motion`**: todas as cenas viram **trocas instantâneas** com o carimbo estático e o estado persistente correto. Mantém o significado, tira o movimento.
- **Preferência no jogo** (ícone no HUD): **Efeitos: completo / reduzido / desligado**.
  - *Completo*: tudo.
  - *Reduzido*: só persistentes + carimbos + microanimações essenciais.
  - *Desligado*: só persistentes, sem movimento.
  - Guardada em `localStorage` (try/catch, como as outras preferências).
- **Leitor de tela:** manter um `role="status"` oculto que anuncia os eventos importantes ("Bia contestou Ana. Era blefe.") com os dados que já existem em `deriveRoundStatus`/`deriveEvents`.
- **Fotossensibilidade:** nenhum flash acima de 3 por segundo; os flashes de hit-stop são de um quadro único.
- **Daltonismo:** nunca depender só de cor; o significado também vai no **símbolo** (máscara, rachadura, escudo, ampulheta).

---

## 16. Ferramentas de revisão e testes

### 16.1 Página de revisão `/dev/cenas`

Uma página (sem socket) para **ver e aprovar cada cena** isolada, como `/dev/mesa` e `/dev/cartas`:

- Seletor de **cena** (duelo, exílio, vitória, perda, troca, bloqueio…).
- Seletor de **resultado** (verdade / blefe), de **variante** (A, B, C) e de **velocidade** (1×, 0,25×, passo a passo).
- Botões **Reproduzir**, **Pular**, **Movimento reduzido**.
- Mostra o **tempo total** e a lista de **beats** em tabela (para checar o orçamento da seção 12.3).
- URL com parâmetros (`?cena=duelo&resultado=blefe&variante=B`) para o Alexandre aprovar por link.

### 16.2 Testes unitários (rápidos, rodam sempre)

| Alvo | O que testa |
|---|---|
| `seatWear` | Limiares: 6, 7, 9 e 10 moedas; 2, 1 e 0 influências; ausente; vez |
| `directScene` | Um teste por cena: eventos → beats esperados (tempos, alvos, sons) |
| Variantes | A mesma `lastChallenge.n` dá a mesma variante; ids diferentes dão variantes diferentes |
| Fila | Prioridade, coalescência, teto de 2 cenas, pular, descarte por `document.hidden` |
| Derivação | `cartaTrocada` aparece **só** quando `accusedHadCard === true` |
| Duração | Nenhuma cena passa de `duracaoMax`; o total de cenas de nível 3 numa partida simulada fica dentro do orçamento |

### 16.3 Teste de propriedade: não vazar informação (obrigatório)

> A saída de `directScene` **não pode depender** das cartas ocultas do observador.

- Monte duas views **idênticas** que diferem **só na mão do jogador local** (mão A e mão B).
- Para toda declaração, bloqueio e contestação **anterior ao veredito**, `directScene(viewA) === directScene(viewB)`.
- Para a declaração de um jogador que **blefa** e de um que **diz a verdade**, as cenas dos **outros observadores** são idênticas até o beat do veredito.
- Reprovar o build se houver diferença.

### 16.4 Integração

Nada novo no servidor (a Fase H é de cliente). Os testes existentes devem continuar verdes.

### 16.5 E2E (só quando o Alexandre pedir, e na Fase G)

Cenário por cena na `/dev/cenas` (renderiza sem `console.error`) e um cenário de partida real com o duelo. Seletores novos usam `data-testid`.

---

## 17. Plano de execução

> Pré-requisitos: **Fase A** (kit de UI) e **Fase B** (estrutura do assento, escala e fichas) do `docs/PLANO_V3.md`.
> Esforço: P (poucas horas), M (uma sessão), G (mais de uma sessão).

### H0: Protótipo e testes antes de construir (junto da Fase 0 do plano) `P a M`

1. **Protótipo animado de uma jogada** (Assassinar, seção 9): declaração, tensão, resolução e perda, em uma página de revisão. O objetivo é **sentir o ritmo** antes de decidir o resto.
2. **Protótipo do duelo** (7.3) com os 3 resultados, em `/dev/cenas`.
3. **Teste de uma tarde das expressões** (opcional): gerar 3 expressões (feliz, abatido, tenso) para **2 avatares** com o pipeline local (`tools/art`), e avaliar se a identidade se mantém. Cerca de 80 s por imagem; com curadoria de ~4 sementes, algumas horas de GPU à noite.
4. O Alexandre aprova a **gramática visual** (seção 3), os **tempos** (seção 7.3) e as **decisões em aberto** (seção 19).

**Pronto quando:** protótipos aprovados e decisões registradas.

### H1: Infraestrutura `M`

Tipos (`Beat`, `Cena`), `directScene` esqueleto, `deriveEvents` estendido, fila (prioridade, coalescência, pular, `document.hidden`), `CamadaDeCena`, preferência de efeitos, `/dev/cenas`.
**Pronto quando:** testes unitários da fila e do diretor verdes; `/dev/cenas` reproduz uma cena de teste; teste de propriedade 16.3 existe (mesmo que ainda com poucas cenas).

### H2: Estados persistentes `M`

`seatWear`, moldura (integridade), cartas reveladas com tratamento, ameaça (canhão e alvo), ausente, medalhão da vez, luz seguindo a vez e anel de tempo (liga com a Fase B2).
**Pronto quando:** limiares testados; as 4 resoluções do plano sem `layoutIssues`; sem emoji.

### H3: Intuição `M`

Mira com linha, clique e trava, ação inválida, mão que respira, ampulheta, hovers, fichas que pousam (liga com a Fase B3).
**Pronto quando:** cada microanimação tem `/dev/cenas` e respeita movimento reduzido.

### H4: O blefe `G`

Declaração sem vazar, tensão, **duelo**, blefe desmascarado, verdade provada, **troca visível**, bloqueio, perigo duplo.
**Pronto quando:** teste de propriedade 16.3 verde com todas as cenas; o duelo dura ≤ 2,7 s e pula; a escolha de carta é liberada ao fim; o Alexandre aprova a cena **jogando**.

### H5: Perda, exílio e vitória `M a G`

Perda de influência, exílio (cena do barco, 3 veículos), vitória, revanche.
**Pronto quando:** as cenas passam pela fila sem acúmulo; o exílio funciona com 2 a 6 jogadores; reconexão não repete cena.

### H6: Assinaturas das ações `M`

Assassinar, Golpe, Taxas primeiro; depois Extorquir, Trocar, Ajuda Externa.
**Pronto quando:** cada ação resolve com a sua assinatura e sem vazar nada na declaração.

### H7: Ambiente e social `P a M`

Plateia, emotes (depende da Fase F5), lanternas, poeira.
**Pronto quando:** plateia reflete o número real de espectadores; emotes têm cooldown e não revelam carta.

### H8 (opcional): Rostos novos `G`

36 imagens (12 avatares × 3 expressões). **Só se** o teste do H0 for aprovado **e** a medição da Fase F7 mostrar que as cenas ajudaram o "mais uma partida".

---

## 18. Escopo da v3 e o que fica para depois

> **Proposta** (a aprovar na Fase 0). A regra do plano vale aqui: ideia nova vai para o backlog, não entra no meio.

| Entra na **v3** | Fica para **v3.x / depois** |
|---|---|
| H0, H1, H2 (todos os persistentes) | H8 (rostos novos) |
| H3 (intuição) | Assinaturas de Extorquir, Trocar e Ajuda Externa (H6 parcial) |
| H4 (todo o blefe, incluindo troca visível) | Emotes (H7 parcial) |
| H5 (perda, exílio, vitória, revanche) | Poeira e lanternas animadas |
| H6 só **Assassinar, Golpe e Taxas** | Veículos extras do exílio |
| H7 só **plateia** | Estados extras de moldura |

**Critério de sucesso da v3 para esta frente:**
- Alguém que nunca viu o jogo diz, em 3 s, **quem está machucado** e **de quem é a vez**.
- A contestação é **o momento de que mais se fala** depois da partida (perguntar aos amigos).
- Nenhuma animação revela informação (teste 16.3 verde).
- O total de drama alto por partida fica dentro de ~25 s.

---

## 19. Decisões em aberto

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| 1 | Duração do duelo | 2,0 s / **2,6 s** / 3,2 s | 2,6 s com pular |
| 2 | Onde acontece o duelo | Centro com os dois recortes / sobre os assentos | Centro (o centro era vazio) |
| 3 | O exilado continua assistindo? | Sim (vira "fantasma" na mesa) / Sai da sala | Sim, vê o resto e vira candidato à próxima partida |
| 4 | Veículo do exílio | Um só / **3 variações por hash** | 3 variações (barco a vapor, jangada, canoa) |
| 5 | Selos de ameaça (canhão 7+, alvo 10+) | Ligados / desligados | Ligados, discretos |
| 6 | Emotes na v3? | Sim / não | Não (depende da Fase F5); só plateia |
| 7 | Preferência de efeitos | 3 níveis / liga-desliga | 3 níveis |
| 8 | Som das cenas por padrão | Ligado / desligado até o 1º clique | Seguir a preferência atual de áudio |
| 9 | Rostos novos | Fazer o teste de uma tarde? | Sim, no H0, sem se comprometer com os 12 |
| 10 | Bloqueio de UI durante o duelo | Só o centro / tela toda | Só o centro |

---

## 20. Riscos

| Risco | Mitigação |
|---|---|
| **Vazar informação por animação** | Projeção pública + teste de propriedade 16.3 obrigatório |
| **Fadiga** (a 10ª vez do duelo cansa) | Variantes, pular, orçamento de 25 s, drama alto só em eventos raros |
| **Escopo infinito** (o Alexandre disse que fica mudando) | Escopo da v3 fixo na seção 18; ideia nova vai ao backlog; H8 condicionado |
| **Aba em segundo plano congela animação** | `document.hidden` descarta cenas e vai ao estado final |
| **Pixel art borrada em escala fracionada** | Escala em degraus inteiros; `image-rendering: pixelated` |
| **Desempenho** (partículas, sprites) | Só `transform`/`opacity`; teto de partículas; pré-carregar sprites |
| **Escolha de carta atrasada pelo duelo** | Libera em veredito + 300 ms; custa ~2 s dos 30 s de `CHOICE_TIME` |
| **Recorte de papel parecer barato** | Assumir como **estilo** (teatro de papel, combinando com a época); protótipo H0 antes de decidir |
| **Arte pequena inconsistente** | Script/mão, paleta mestra, curadoria do Alexandre |
| **Dívida de teste** | Diretor e fila são puros e têm teste; E2E só na Fase G ou sob pedido |

---

## 21. Mapa de arquivos

**Novos (proposta):**

```
src/components/game/fx/
  types.ts            tipos Beat/Cena/Alvo
  director.ts         directScene (puro)
  director.test.ts
  queue.ts            fila: prioridade, coalescência, pular (puro)
  queue.test.ts
  wear.ts             seatWear (puro)
  wear.test.ts
  CamadaDeCena.tsx    executor (WAAPI, sprites, partículas)
  Duelo.tsx           evolução de ChallengeReveal
  Exilio.tsx          cena do barco
  Vitoria.tsx
  prefs.ts            efeitos: completo/reduzido/desligado
app/dev/cenas/page.tsx
public/art/imperio/fx/<grupo>/...
tools/art/fx.ts       gerador procedural das peças pequenas
```

**Alterados:**

| Arquivo | O que muda |
|---|---|
| `src/components/game/events.ts`, `useGameEvents.ts` | Estender a derivação com os eventos novos |
| `src/components/game/Seat.tsx` | Camadas de dano, ameaça, ausente; anel de tempo |
| `src/components/game/GameBoard.tsx` | Monta `CamadaDeCena`, libera a escolha de carta ao fim do veredito |
| `src/components/game/ChallengeReveal.tsx` | Evolui para o duelo |
| `src/components/game/WaxSeal.tsx` | Novos carimbos |
| `src/components/game/CoinFlights.tsx`, `motion.ts` | Pousar nas pilhas de fichas |
| `src/lib/audio/recipes.ts`, `useGameAudio.ts` | Novos sons |
| `app/globals.css` | Keyframes novos (usar os existentes antes) |

---

## 22. Glossário

| Termo | Significa |
|---|---|
| **Beat** | Um passo de uma cena, com tempo, alvo, efeito e som |
| **Cena** | Uma sequência de beats (ex.: o duelo) |
| **Diretor de cena** | A função pura que transforma eventos do jogo em cenas |
| **Fila** | Quem decide qual cena toca, qual encurta e qual é descartada |
| **Estado persistente** | O que fica na tela enquanto for verdade (moldura rachada, ameaça) |
| **Hit-stop** | Congelar a imagem por 50 a 120 ms no momento do impacto, para dar peso |
| **Tell-free** | "Sem pista": a animação não entrega se a jogada é verdade ou blefe |
| **Recorte** | O retrato animado como papel recortado em uma vareta (estilo "teatro de papel") |
| **Gramática visual** | O conjunto de sinais com significado fixo (seção 3) |
| **Tell** | Em poker, o gesto que entrega o blefe de um jogador |
