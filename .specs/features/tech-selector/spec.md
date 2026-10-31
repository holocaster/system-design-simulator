# Seletor de Tecnologia por Componente - Especificação

status: ready-for-agent

## Problem Statement

Os tipos de componente do simulador tratam famílias inteiras de tecnologia como uma abstração única. Uma `queue` tem um só `capacity` default (10.000), mas a dispersão real entre tecnologias da mesma família chega a 300x: SQS FIFO sustenta ~3.000 msgs/s enquanto Kafka passa de 200.000. O mesmo vale para `service` (Spring MVC ~500 rps vs Go ~5.000), `sql`, `nosql` e `worker`. Quem estuda system design precisa aprender justamente que escolher SQS FIFO em vez de Kafka muda o desenho em ordens de grandeza — mas hoje o simulador não tem onde registrar essa escolha, e a IA avaliadora só vê um `queue` genérico, sem saber qual tecnologia o aluno pretendia.

Além disso, os próprios defaults genéricos misturavam bases de benchmark incomparáveis (hello-world vs carga transacional realista), deixando `service` em 2.000 rps — irreal para uma aplicação com I/O de banco.

## Solution

Do ponto de vista do usuário: ao selecionar um componente de tipo `queue`, `nosql`, `sql`, `service` ou `worker` no painel de propriedades, aparece um seletor de tecnologia (ex.: Kafka, RabbitMQ, SQS FIFO). Escolher uma tecnologia preenche automaticamente a capacidade e a latência com valores realistas daquela tecnologia. A escolha fica salva no design, viaja no export/import e chega à IA avaliadora, que passa a poder criticar a *escolha de tecnologia*, não só os números. O aluno continua livre para ajustar os números à mão — ao fazê-lo, o seletor volta para "Personalizado", deixando explícito que os números não correspondem mais a nenhuma tecnologia enlatada.

## Goals

- [ ] O aluno escolhe a tecnologia de um componente e vê capacidade/latência realistas serem aplicadas
- [ ] A tecnologia escolhida é persistida no design (salvar, exportar, importar) e chega à IA
- [ ] Editar capacidade/latência à mão devolve o seletor para "Personalizado", sem estado contraditório
- [ ] Os defaults genéricos passam a usar uma régua única (carga realista sob durabilidade)
- [ ] Designs antigos, sem tecnologia, seguem carregando sem migração

## User Stories

1. Como aluno de system design, quero escolher "Kafka" numa fila, para que a capacidade reflita um broker real sem eu precisar decorar números.
2. Como aluno, quero comparar "SQS FIFO" e "Kafka" na mesma topologia, para enxergar que a escolha de tecnologia muda o gargalo em ordens de grandeza.
3. Como aluno, quero que a tecnologia escolhida apareça no nó do canvas, para identificar o desenho de relance.
4. Como aluno, quero ajustar a capacidade à mão depois de escolher uma tecnologia, para modelar um cenário específico — e entender que aí virou "Personalizado".
5. Como aluno, quero que escalar réplicas de um "Kafka" o mantenha "Kafka", porque réplicas são decisão de escala, não de tecnologia.
6. Como aluno, quero salvar e reabrir um design mantendo as tecnologias escolhidas, para retomar o trabalho.
7. Como aluno, quero exportar o design como JSON com as tecnologias, para compartilhar com outra pessoa.
8. Como aluno, quero que a IA avaliadora saiba qual tecnologia escolhi, para receber crítica sobre a adequação da escolha (ex.: "SQS FIFO não sustenta a carga declarada").
9. Como aluno que abre um design antigo (sem tecnologia), quero que ele carregue normalmente como "Personalizado", sem erro.
10. Como aluno que importa um JSON de outra pessoa com uma tecnologia que meu simulador conhece, quero ver os números canônicos daquela tecnologia, mesmo que o arquivo trouxesse números divergentes.
11. Como aluno que importa um JSON com uma tecnologia desconhecida, quero que o componente carregue como "Personalizado" preservando os números do arquivo, em vez de a importação falhar.
12. Como aluno, quero que os componentes sem seletor (cache, CDN, gateway, LB, storage, client) continuem exatamente como estão.

## Implementation Decisions

Referência de ADRs: `AD-014` (recalibração de defaults), `AD-015` (campo `tech`), `AD-016` (preset semeia/manual manda), `AD-017` (normalização no load). Todos em `.specs/STATE.md`.

**Modelo**

- `DesignNode` ganha `tech?: string` — opcional e aditivo. `Design.schema` permanece `1`; designs antigos sem `tech` carregam sem migração (precedente `AD-009`/`AD-012`).
- O catálogo de presets é uma constante de código nova em `catalog.ts`, indexada por tipo de componente e por id de tecnologia, contendo `label`, `capacity` e `baseLatencyMs`. Ids em kebab-case; `label` é o rótulo de UI.
- Régua única de calibração: throughput sustentado sob carga realista e durabilidade, por réplica/nó — a mesma grandeza que a engine já trata como ponto de saturação (a latência degrada 5x em `utilization >= 1`, `tick.ts`).

Catálogo aprovado (capacity / baseLatencyMs):

| Tipo | Tecnologia (id) | capacity | latMs |
| ---- | --------------- | -------: | ----: |
| queue | sqs-fifo | 3.000 | 30 |
| queue | sqs-standard | 30.000 | 20 |
| queue | rabbitmq | 40.000 | 5 |
| queue | kafka | 200.000 | 5 |
| nosql | dynamodb | 8.000 | 10 |
| nosql | mongodb | 10.000 | 5 |
| nosql | cassandra | 30.000 | 5 |
| sql | postgresql | 1.500 | 10 |
| sql | mysql | 2.000 | 10 |
| sql | aurora | 5.000 | 8 |
| service, worker | spring-mvc | 500 | 20 |
| service, worker | nodejs | 1.500 | 15 |
| service, worker | spring-webflux | 2.000 | 15 |
| service, worker | quarkus-native | 3.000 | 10 |
| service, worker | go | 5.000 | 10 |

**Recalibração de defaults genéricos (`AD-014`)**

- `DEFAULT_PARAMS`: `service` 2.000→500, `worker` 2.000→500, `sql` 500→1.500, `nosql` 5.000→10.000. Latências inalteradas. (As três primeiras já foram aplicadas nesta sessão com os testes de `catalog.test.ts` e `useAppStore.test.ts` ajustados; `nosql`→10.000 ainda falta.)
- Os presets `spring-mvc`=500 e `postgresql`=1.500 coincidem de propósito com os novos defaults: o "Personalizado" de service/sql equivale a um Spring/Postgres genérico.

**Comportamento (invariante do `AD-016`)**

- Aplicar uma tecnologia é uma ação atômica no store: define `capacity` e `baseLatencyMs` a partir do preset e define `tech`.
- O preset governa **somente** `capacity` e `baseLatencyMs`. Editar qualquer um dos dois à mão zera `tech` (vira "Personalizado"). Editar `replicas`/`shards`/`bufferSize`/`errorRate` **não** afeta `tech`.
- Invariante mantida em memória: se `tech` está definida, `capacity` e `baseLatencyMs` batem com o preset daquela tecnologia.

**Persistência e normalização (`AD-017`)**

- `currentDesign()` inclui `tech` em cada nó; `exportJson` o serializa por consequência.
- `loadDesign()` no store é o **ponto único de normalização** (tanto o load de localStorage quanto o import de JSON passam por ele): para cada nó, se `tech` é conhecida para o tipo daquele nó, re-semeia `capacity`/`baseLatencyMs` do preset (o arquivo não sobrepõe); se `tech` é desconhecida, ausente, ou o tipo não é selecionável, `tech` vira `undefined` preservando os números do arquivo.
- `importJson`/`validateNode` aceitam `tech` como string opcional (checagem de tipo apenas). A normalização de valor fica no `loadDesign`, não no validador — o validador só rejeita `tech` de tipo não-string.

**Interface**

- `PropertiesPanel` renderiza, para os 5 tipos selecionáveis, um `<select>` de tecnologia acima dos campos numéricos, com uma opção "Personalizado" (sentinela: `tech` ausente) e uma opção por tecnologia do catálogo daquele tipo. Trocar a opção dispara a ação de aplicar tecnologia; "Personalizado" não altera números (apenas representa o estado `tech=undefined`, que já é consequência de edição manual).
- `ComponentNode` exibe o `label` da tecnologia escolhida no nó do canvas quando `tech` está definida.

## Testing Decisions

Um bom teste aqui verifica comportamento externo observável (params resultantes, `tech` resultante, o que sobrevive a um round-trip de persistência), nunca detalhes internos. As seams são as três já existentes; nenhuma seam nova é necessária, e a engine (`tick.ts`) **não** é tocada — `tech` só afeta params via preset, e a engine já consome `capacity`/`baseLatencyMs`.

- **`catalog.test.ts`** — cobre o catálogo de presets e os defaults recalibrados como dados: existência e valores exatos dos presets por tipo, e os novos `DEFAULT_PARAMS`. Prior art: o teste "defaults exatos do design por tipo" já existente.
- **`useAppStore.test.ts`** — cobre o comportamento: aplicar tecnologia semeia os dois params e define `tech`; editar `capacity` ou `baseLatencyMs` zera `tech`; editar `replicas`/`errorRate` preserva `tech`; `loadDesign` re-semeia tech conhecida, rebaixa tech desconhecida para `undefined` preservando números, e trata design antigo sem `tech`. Prior art: os testes de `updateParams` e `loadDesign` já existentes (incl. o round-trip de `challengeId`/`brief` do custom-brief).
- **`designStorage.test.ts`** — cobre a fronteira de import: `tech` string opcional é aceita; `tech` de tipo não-string é rejeitada no padrão do validador existente; export inclui `tech`. Prior art: os testes de validação de `brief`/`challengeId`.

## Out of Scope

| Item | Motivo |
| ---- | ------ |
| Seletor em cache, CDN, gateway, LB, storage, client | Baixa dispersão de throughput (Redis/nginx/S3 dominam suas famílias); seletor agregaria ruído, não lição |
| Editar ou criar presets pela UI | Presets seguem constante de código, como os desafios do custom-brief |
| Modelar esgotamento de pool de conexão (Hikari) | Exigiria acoplamento novo service→sql e parâmetro novo; discutido e deixado como dívida anotada |
| Preset definir `replicas`/`shards`/`bufferSize`/`errorRate` | Dimensionamento e injeção de falha são exercício do aluno; preservar a lição de escala do `AD-010` |
| Testes de componente React (o `<select>`, o nó do canvas) | O projeto não tem essa infraestrutura; introduzi-la seria escopo escondido. Validação visual no browser |

## Assumptions & Open Questions

- O sentinela de "Personalizado" é a ausência de `tech` (`undefined`), não uma string `"custom"` — diferente do `challengeId`, aqui não há segundo campo a preservar.
- A normalização no `loadDesign` re-semear os params de tech conhecida significa que, para nós com `tech` definida, `capacity`/`baseLatencyMs` no JSON são redundantes (o preset manda). É aceito: mantém a invariante airtight sem validação cruzada.
- Presets de `service`/`worker` são os de calibração mais incerta (hello-world 30k vs realista 500); foram ancorados em "endpoint com I/O real por instância de 2-4 vCPU" e aprovados como estão.
- RPS e mix de escrita continuam fora do `Design` (controles de simulação), coerente com `replicas-rw-mix` e `custom-brief`.
