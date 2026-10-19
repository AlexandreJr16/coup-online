# Regras do Coup — Versão Base (PT-BR)

## Fonte
Manual oficial: Rikki Tahta / La Mame Games (edição Funbox Jogos)
Todos os nomes de ações, personagens e mecânicas seguem o português do manual.

> **Tema Brasil Império (só na interface):** as regras e a engine continuam com os ids do manual
> (`duque`, `assassino`, `capitao`, `embaixador`, `condessa`). Na tela eles aparecem como
> Barão do Café, Capoeira, Coronel, Regatão e Benzedeira; o Tesouro Central aparece como Erário.
> Ver `docs/DIRECAO_CRIATIVA.md`.

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
| `TURN_TIME`                | Declarar a ação do turno                          | 45s    | 15s–180s  |
| `CHOICE_TIME`              | Escolher a carta a revelar / escolher a Troca     | 30s    | 10s–120s  |

### Passar
Em qualquer janela de reação o jogador pode **passar** ("deixo passar": não bloqueio nem contesto).
- Quem pode reagir: todo jogador vivo, exceto quem fez a jogada julgada (o ator na janela da ação;
  o bloqueador na janela de contestar o bloqueio — nesta, o ator pode contestar).
- Quando **todos** os elegíveis passam, a janela fecha na hora, como se o timer tivesse esgotado
  (a ação prossegue; ou o bloqueio vale).
- Passar é final: quem passou não pode mais bloquear nem contestar naquela janela.
- Passar não reinicia nem estende o timer da janela.

### Quando o tempo estoura
- Janelas de reação: a janela fecha como "ninguém reagiu" (ver fluxos abaixo).
- `TURN_TIME`: joga **Renda** pelo jogador. Com 10+ moedas, dá o Golpe de Estado obrigatório num
  oponente vivo sorteado.
- `CHOICE_TIME` na revelação: revela uma das cartas ainda ocultas, sorteada.
- `CHOICE_TIME` na Troca: mantém as próprias cartas (troca neutra).

### Aviso antes da jogada automática
Nos **últimos 5 segundos** de uma fase de decisão (turno, revelação, Troca), a mesa avisa a todos o
que o servidor vai jogar pelo jogador, com contagem regressiva (ex.: "Ana joga Renda em 3…", "Bia
revela uma carta sorteada em 2…"). Com 10+ moedas o aviso é de Golpe em alguém sorteado. As janelas
de reação não têm aviso (nelas "passar" já resolve e o estouro só fecha a janela).
- O valor (5s) é fixo, não entra na tela de tempos do lobby (`TIMEOUT_WARNING_SECONDS` em `config.ts`).
- É só aviso de UI: não estende o tempo e a jogada automática continua sendo do servidor.
- Jogador ausente: o servidor já reduz a decisão dele para 5s, então o aviso aparece de imediato.

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

## Espectadores
Quem abre o link de uma sala com a **partida em andamento** (ou com os **6 lugares ocupados** no
lobby) entra como **espectador**, em vez de ser recusado.
- Vê a mesa pública (moedas, cartas reveladas, jogadas, histórico), **nunca as cartas ocultas de
  ninguém**, nem a escolha de cartas de uma Troca. O servidor monta essa view; o cliente não filtra.
- Não age: ações, bloqueios, contestações, passar, revelar, "passar automático", iniciar e pedir
  revanche são recusados pelo servidor.
- **Vira jogador** por ordem de chegada, até 6, quando: (1) uma revanche começa, (2) o host inicia
  uma partida do lobby, (3) abre vaga no lobby. Quem não cabe segue espectador; espectador
  desconectado é descartado. O token dele continua valendo (mesmo id), sem reentrar.
- Não conta como "alguém online": não segura o relógio nem a sala (sala só com espectadores segue a
  regra de sala abandonada). Se cair, tem 20s para voltar (F5); sair de propósito tira da lista na hora.

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
