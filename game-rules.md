# Regras do Coup — Versão Base (PT-BR)

## Fonte
Manual oficial: Rikki Tahta / La Mame Games (edição Funbox Jogos)
Todos os nomes de ações, personagens e mecânicas seguem o português do manual.

## Preparação
- 25 cartas de personagem (5 de cada: Duque, Assassino, Capitão, Embaixador, Condessa)
- Cada jogador começa com 2 cartas viradas para baixo e 2 moedas
- Cartas restantes formam o Baralho da Corte; moedas restantes formam o Tesouro Central
- Jogadores: 2–6
- Primeiro a jogar: vencedor da última partida (ou definido antes da primeira)

## Objetivo
Eliminar a influência de todos os outros jogadores e ser o último sobrevivente.
Influência = cartas viradas para baixo na frente do jogador.
Quando um jogador perde uma influência, ele vira UMA carta de sua escolha para cima.
Cartas reveladas ficam visíveis permanentemente e não fornecem mais influência.
Jogador com 0 influências é exilado e devolve todas as moedas ao Tesouro Central.

## Ações Gerais
(Sempre disponíveis, sem precisar declarar personagem)

| Ação            | Efeito                                                                 | Pode ser bloqueada? | Pode ser contestada? |
|-----------------|------------------------------------------------------------------------|---------------------|----------------------|
| Renda           | +1 moeda do Tesouro Central                                            | Não                 | Não                  |
| Ajuda Externa   | +2 moedas do Tesouro Central                                           | Sim (pelo Duque)    | Não                  |
| Golpe de Estado | Paga 7 moedas → alvo perde 1 influência imediatamente. Sempre sucede. | Não                 | Não                  |

⚠️ Se um jogador começar o turno com 10 ou mais moedas, é OBRIGADO a dar
um Golpe de Estado como única ação.

## Ações de Personagens
(O jogador declara que influencia o personagem — pode ser verdade ou blefe.
Não precisa revelar carta a menos que seja contestado.)

| Personagem  | Ação       | Efeito                                                                                      | Bloqueia          |
|-------------|------------|---------------------------------------------------------------------------------------------|-------------------|
| Duque       | Taxas      | +3 moedas do Tesouro Central                                                                | Ajuda Externa     |
| Assassino   | Assassinar | Paga 3 moedas ao Tesouro → alvo perde 1 influência                                         | —                 |
| Capitão     | Extorquir  | Pega 2 moedas de um alvo (se ele tiver só 1, pega 1)                                       | Extorsão          |
| Embaixador  | Trocar     | Pega 2 cartas aleatórias da Corte; troca 0–2 com suas cartas; devolve 2 à Corte            | Extorsão          |
| Condessa    | —          | Não possui ação ativa                                                                       | Assassinato       |

## Ações Contrárias (Bloqueios)
Qualquer jogador pode declarar um bloqueio alegando o personagem correspondente
(pode ser blefe). O bloqueio pode ser contestado, mas se não for, é automaticamente
bem-sucedido.

⚠️ Se uma ação for bloqueada com sucesso, a ação falha MAS as moedas pagas
pelo jogador (ex: 3 moedas do Assassino) NÃO são devolvidas.

| Quem bloqueia         | Bloqueia o quê               |
|-----------------------|------------------------------|
| Duque (qualquer um)   | Ajuda Externa                |
| Condessa (a vítima)   | Assassinato                  |
| Embaixador (a vítima) | Extorsão (Capitão)           |
| Capitão (a vítima)    | Extorsão (Capitão)           |

## Contestações
- Qualquer ação ou bloqueio de personagem pode ser contestado por QUALQUER jogador,
  independente de estar envolvido na ação ou não.
- A janela de contestação fecha quando o jogo prossegue — após isso, não pode contestar.

### Resolução
- **Contestado TEM a carta:** o contestante perde 1 influência. O jogador que venceu
  devolve a carta ao Baralho da Corte, reembaralha e pega uma nova aleatoriamente.
  A ação original prossegue normalmente.
- **Contestado NÃO tem a carta:** o jogador contestado perde 1 influência.
  A ação falha. Se havia custo em moedas (ex: Assassino), as moedas são devolvidas.

## Timers Configuráveis
Definidos pelo criador da sala antes de iniciar o jogo:

| Timer                      | Aplica a                                          | Padrão | Range     |
|----------------------------|---------------------------------------------------|--------|-----------|
| `GLOBAL_REACTION_TIME`     | Ações globais (Taxas, Ajuda Externa, Trocar)      | 5s     | 3s–60s    |
| `TARGET_REACTION_TIME`     | Ações targeted (Assassinar, Extorquir) — a vítima | 15s    | 5s–120s   |
| `CHALLENGE_BLOCK_TIME`     | Janela de contestar um bloqueio declarado         | 5s     | 3s–60s    |

## Fluxo de Estados por Tipo de Ação

### Ações Imediatas (Renda, Golpe de Estado)
`aguardando_acao` → resolve imediatamente → `proximo_turno`

### Ações Globais (Ajuda Externa, Taxas, Trocar)
`aguardando_acao` → `janela_reacao_global (GLOBAL_REACTION_TIME)`
→ ninguém reagiu: resolve → `proximo_turno`
→ alguém bloqueou: `janela_contestar_bloqueio (CHALLENGE_BLOCK_TIME)`
  → ninguém contestou: ação bloqueada → `proximo_turno`
  → alguém contestou: `resolvendo_contestacao` → resolve → `proximo_turno`
→ alguém contestou a ação: `resolvendo_contestacao` → resolve → `proximo_turno`

### Ações Targeted (Assassinar, Extorquir)
`aguardando_acao` → `janela_reacao_vitima (TARGET_REACTION_TIME)`
→ vítima aceitou / timer esgotou: resolve → `proximo_turno`
→ vítima bloqueou: `janela_contestar_bloqueio (CHALLENGE_BLOCK_TIME)`
  → ninguém contestou: ação bloqueada → `proximo_turno`
  → alguém contestou: `resolvendo_contestacao` → resolve → `proximo_turno`
→ alguém contestou a ação: `resolvendo_contestacao` → resolve → `proximo_turno`

## Casos Especiais

### ⚠️ Perigo Duplo do Assassino
É possível perder 2 influências em um único turno durante um assassinato:
1. Se você CONTESTAR o Assassino e perder: perde 1 influência pelo desafio perdido +
   1 influência pelo assassinato bem-sucedido = eliminado se tiver 2 influências.
2. Se você BLEFAR a Condessa para bloquear e for contestado: perde 1 influência
   pela contestação + 1 influência pelo assassinato = mesmo resultado.

### Regras Gerais
- Negociações são permitidas, mas não são vinculativas.
- Jogadores NÃO podem revelar cartas voluntariamente aos outros.
- Moedas não podem ser dadas ou emprestadas entre jogadores.
- Não existe segundo lugar.
