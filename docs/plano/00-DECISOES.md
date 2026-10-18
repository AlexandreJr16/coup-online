# Registro de decisões

> Estilo ADR curto. **Aberta** = depende do Alexandre (gate). A coluna "Recomendação" é a proposta dos documentos de origem. Ao decidir, preencher "Decisão" e a data, e não editar o histórico.
> Fonte: `docs/IDEIAS_ANIMACAO_E_EXPERIENCIA.md` seção 12, `docs/VIDA_E_BLEFE.md` seção 19 e `docs/PLANO_V3.md` Fase 0.

| ID | Decisão | Opções | Recomendação | Estado | Decisão / data | Bloqueia |
|---|---|---|---|---|---|---|
| DEC-01 | Duração do duelo | 2,0 s / **2,6 s** / 3,2 s | 2,6 s com pular | aberta | | P14 |
| DEC-02 | Onde acontece o duelo | Centro com os dois recortes / sobre os assentos | Centro | aberta | | P14 |
| DEC-03 | O exilado continua assistindo? | Sim (fantasma) / sai da sala | Sim | aberta | | P16 (C6) |
| DEC-04 | Veículo do exílio | Um só / 3 por hash | 3 variações | aberta | | P16 (C3), P20 |
| DEC-05 | Selos de ameaça (canhão 7+, alvo 10+) | Ligados / desligados | Ligados e discretos | aberta | | P12 (A3) |
| DEC-06 | Emotes na v3? | Sim / não | Não (só plateia) | aberta | | P18 |
| DEC-07 | Preferência de efeitos | 3 níveis / liga-desliga | 3 níveis | aberta | | P11 |
| DEC-08 | Som das cenas por padrão | Ligado / desligado até o 1º clique | Seguir a preferência atual de áudio | aberta | | P19 |
| DEC-09 | Teste de expressões (2 avatares) | Fazer / não | Fazer no H0, sem compromisso com os 12 | aberta | | P03, P20 (G10) |
| DEC-10 | Bloqueio de UI durante o duelo | Só o centro / tela toda | Só o centro | aberta | | P14 |
| DEC-11 | Fonte de interface | Pixelify Sans / Silkscreen / VT323 / Press Start 2P (testar acentos pt-BR) | Testar 2 ou 3 nos mockups | aberta | | P04 |
| DEC-12 | Corpo de texto | Mesma fonte pixel / sans só para texto longo | Pixel em títulos e botões; sans só se a colinha precisar | aberta | | P04, P22 |
| DEC-13 | Escala da tela | Contínua / degraus inteiros | Degraus inteiros | aberta | | P06 |
| DEC-14 | Dock | Cavalete de madeira / mão sobre a madeira da mesa / bandeja de couro | Escolher no mockup | aberta | | P09 |
| DEC-15 | Texto de status | (A) só assento e balão / (B) A + legenda curta no centro | B | aberta | | P08 |
| DEC-16 | Quais itens de retenção entram na v3 | R1, R2, R3, R7 / + R4, R5 / + R6 | R1, R2, R3, R7; R4 e R5 se der tempo; R6 só depois de medir | aberta | | P23, P24 |
| DEC-17 | "Iterativas" nas fichas era "interativas"? | Interativas / outra coisa | Interativas (interpretação atual) | aberta | | P07 |
| DEC-18 | Nome de copyright na LICENSE | (livre) | Escolha do Alexandre | aberta | | P25 |
| DEC-19 | Subagentes conseguem criar subagentes? | Sim / não | Verificar em P01.S1; desenho vale nos dois casos | aberta (técnica) | | P01 |
| DEC-21 | Candidatas de imagem no lugar de número (baralho por faixa G8, Erário com baú G9, dígitos e medalhão em sprite G11) | Aprovar cada uma no mockup / cortar | Decidir no mockup da Fase 0; só as aprovadas viram subplano | aberta | | P08 |
| DEC-22 | Fichas: aparência de 0 fichas | Sem sprite / ficha apagada | Decidir no mockup | aberta | | P07 |
| DEC-23 | Fichas: tamanhos `sm` e `lg` e convenção de arquivo | (livre) | `<nome>.png` + `<nome>.sm.png` | aberta | | P07 |
| DEC-24 | Fichas: variante por hash fixo (jogador, quantidade) ou troca a cada mudança de quantidade | Hash fixo / troca | Hash fixo; testar a alternativa no mockup | aberta | | P07 |
| DEC-20 | Escopo da v3 para a frente "vida e blefe" | `VIDA_E_BLEFE` seção 18 | H0 a H5 + Assassinar, Golpe e Taxas + plateia | aberta | | todos de C |

## Decisões já fechadas (herdadas)

| ID | Decisão | Origem |
|---|---|---|
| F-01 | Estado em memória, sem banco; sem autenticação | `AGENTS.md` |
| F-02 | Retratos continuam neutros; dano por camadas | `VIDA_E_BLEFE` 2.2 |
| F-03 | Moldura não muda de bronze para prata/ouro (riqueza vai nas fichas e na ameaça) | `VIDA_E_BLEFE` 3 |
| F-04 | Sem biblioteca de animação nova (WAAPI/CSS); avisar antes de instalar qualquer uma | `VIDA_E_BLEFE` 5.4 |
| F-05 | E2E só quando o Alexandre pedir e na Fase G | memória `politica-testes-e-ambiente` |
| F-06 | Commit por entrega na branch de trabalho sem perguntar; push e tag só sob pedido; sem atribuição a Claude | memória `commit-sem-perguntar` + CLAUDE.md global |
| F-07 | Autonomia dos agentes: param só em decisão criativa ou irreversível | Alexandre, 18/10/2026 |
| F-08 | Planos e subplanos vivem em `docs/plano/`; quantidade de planos livre (14 a 100), decidida pelo orquestrador | Alexandre, 18/10/2026 |
