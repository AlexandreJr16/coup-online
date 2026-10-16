# Próximas versões — backlog pós-playtest (16/10/2026)

Origem: primeira partida real com amigos (~3 partidas). Feedback geral muito positivo ("tá incrível", jogaram e se divertiram). Abaixo, o que pediram e o que ficou para verificar.

## 1. Colinha das cartas (mais pedido)
Três pessoas pediram. Falta informação sobre **as cartas e o jogo**.
- Botão fixo no canto com um **"?" estilizado** (tema Brasil Império) que abre a colinha dos personagens, como a carta de referência do Coup físico: nome, ação, efeito e se pode ser bloqueada/contestada (e por quem).
- Também resumir as regras básicas (renda, ajuda externa, golpe obrigatório com 10+ moedas, contestação).
- Conteúdo vem de `game-rules.md` (fonte única), não duplicar texto à mão.
- DoD: abre/fecha por clique e tecla, não bloqueia input da mesa, cenário E2E + página `/dev/*` de revisão.

## 2. Mais informação de rodada
- **De quem é a vez**, bem destacado (além do histórico no canto direito).
- **O que está acontecendo agora**: ação declarada, alvo, quem pode reagir, quem já passou, o que se espera de cada um.
- O histórico lateral continua, mas não deve ser a única fonte.

## 3. Entrar no meio da partida como espectador
- Quem abre o link de uma sala em andamento entra como **spec** e vira jogador na **próxima partida** (revanche).
- Spec vê a mesa pública, nunca as cartas de ninguém (regra do servidor continua valendo).
- Interage com a fila de revanche: ao iniciar a próxima, specs viram jogadores (respeitando o limite de 6).

## 4. Jogador demorando / ausente
- Hoje: estourou o timer → Renda (ou Golpe obrigatório), carta sorteada, troca neutra; ausente da vez joga em 5s.
- Pedido: **contador de alguns segundos visível** antes de assumir a ação básica (Renda), pra deixar claro que o jogo vai seguir sem a pessoa. Avaliar se o contador atual já cobre isso ou se falta a UI.

## 5. Verificações (não são features)

### 5.1 Troca de carta ao vencer uma contestação — implementado, falta teste
Dúvida: "contestaram meu Barão, na próxima eu jogo essa carta pro baralho e pego outra?"
- **Já está implementado** conforme `game-rules.md`: `replaceCard` (`src/lib/game/engine.ts`, ~l.672) devolve a carta à Corte, reembaralha e saca outra. É chamado quando o contestado prova a carta (~l.609). Vale para ação e para bloqueio.
- **Dívida de teste:** não achei teste de engine que cubra isso diretamente (tamanho do baralho constante, carta nova sacada, mão continua com 2 cartas). Escrever como teste de unidade, com `Rng` injetado.

### 5.2 "Mal embaralhamento" (reclamação) — provavelmente percepção, mas checar
Print: mão com 4 cartas (Capoeira, Regatão, Regatão, Capoeira) — é uma **Troca** (2 da mão + 2 sacadas), duas duplas.
- O embaralhamento é **Fisher-Yates correto** com `Math.random` (`src/lib/game/deck.ts`), baralho de 25 cartas (5 de cada). Com só 5 tipos e 5 cópias, repetição é muito comum; duas duplas em 4 cartas não é sinal de bug.
- Para fechar a dúvida com dado, não com sensação: teste estatístico (muitos embaralhamentos, chi-quadrado simples sobre a 1ª carta e sobre pares) e, se quiser, log do seed por partida para reproduzir queixas.
- Se continuar parecendo ruim, a opção é de **design** (ex.: evitar 2ª cópia igual na compra), não de correção — e isso muda a regra do jogo, então decidir antes.

## 6. Resposta rápida (não é código)
- Site feito em **Next.js** (versão 16 no `package.json`, não 14/15). Amigo pediu pra anotar como issue: abrir issues no GitHub com os itens acima.
