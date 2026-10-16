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

### 5.1 Troca de carta ao vencer uma contestação — implementado e testado (✅ 16/10)
Dúvida: "contestaram meu Barão, na próxima eu jogo essa carta pro baralho e pego outra?"
- **Já está implementado** conforme `game-rules.md`: `replaceCard` (`src/lib/game/engine.ts`, ~l.672) devolve a carta à Corte, reembaralha e saca outra. É chamado quando o contestado prova a carta (~l.609). Vale para ação e para bloqueio.
- **Testes escritos** em `src/lib/game/engine.test.ts` (seção "Troca de carta ao vencer uma contestação"): ação e bloqueio provados trocam a carta (baralho conserva as 25 cartas, 5 de cada; a carta nova vem da Corte; mão segue com 2 ocultas), blefe não troca nada, e a carta sacada pode ser igual à devolvida. Verificado por mutação: sem o `replaceCard`, os testes falham.

### 5.2 "Mal embaralhamento" (reclamação) — medido: é percepção (✅ 16/10)
Print: mão com 4 cartas (Capoeira, Regatão, Regatão, Capoeira) — é uma **Troca** (2 da mão + 2 sacadas), duas duplas.
- O embaralhamento é **Fisher-Yates correto** com `Math.random` (`src/lib/game/deck.ts`), baralho de 25 cartas (5 de cada). Com só 5 tipos e 5 cópias, repetição é muito comum; duas duplas em 4 cartas não é sinal de bug.
- **Medição** (`src/lib/game/deck.test.ts`, 20 000 embaralhamentos com seed fixa): a carta do topo e a da posição do meio passam no qui-quadrado (gl=4, p<0,001) contra o uniforme, e **duas duplas em 4 cartas saem em 7,80% das mãos** (esperado teórico 1000/12650 = 7,91%), ou seja, cerca de 1 a cada 13 mãos de Troca. O print do amigo é um caso normal.
- Se quiser ir além: log do seed por partida para reproduzir queixas.
- Se continuar parecendo ruim, a opção é de **design** (ex.: evitar 2ª cópia igual na compra), não de correção — e isso muda a regra do jogo, então decidir antes.

## 6. Resposta rápida (não é código)
- Site feito em **Next.js** (versão 16 no `package.json`, não 14/15). Amigo pediu pra anotar como issue: abrir issues no GitHub com os itens acima.
