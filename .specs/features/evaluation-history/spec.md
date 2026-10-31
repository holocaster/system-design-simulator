# Histórico de Avaliações por IA - Especificação

status: ready-for-agent

## Problem Statement

A avaliação por IA é o principal instrumento didático do simulador, mas ela só existe uma vez. O texto devolvido pelo modelo vive num `useState` local do `EvaluationPanel`: recarregar a página o apaga, e clicar em "Avaliar design" de novo o sobrescreve sem aviso. Não há undo.

Isso quebra exatamente o ciclo que o simulador existe para ensinar. O aluno avalia, a IA aponta que o banco SQL é o gargalo de escrita, ele adiciona réplicas e reavalia — e nesse instante perde a crítica que motivou a mudança. Ele fica sem a única referência que permitiria julgar se a mudança melhorou algo. O aprendizado depende de comparar rodadas, e o app não guarda rodada nenhuma.

A comparação também depende de contexto que hoje se perde junto. A mesma arquitetura avaliada a 100 RPS e a 50.000 RPS recebe crítica oposta — é a lição central do AD-010. Um histórico que guardasse só o texto produziria entradas aparentemente contraditórias, e o aluno concluiria que a IA é incoerente quando na verdade avaliou cargas diferentes.

## Goals

- [ ] Avaliar de novo nunca destrói avaliações anteriores
- [ ] O histórico sobrevive ao reload, ao salvar/carregar e ao exportar/importar
- [ ] Cada entrada registra a carga e as métricas que a geraram, tornando as rodadas comparáveis
- [ ] O aluno consegue varrer a progressão das rodadas de relance, sem abrir uma a uma
- [ ] O diagnóstico da IA continua independente entre rodadas, sem ancoragem

## Solution

O `Design` passa a carregar um histórico de avaliações. Cada vez que a IA responde, uma entrada é anexada com o texto, o instante, a carga da simulação (RPS e percentual de escritas), o modelo usado e o resumo global da simulação daquela rodada. O histórico viaja com o artefato: é salvo, exportado e importado junto com nós e arestas, pela mesma lógica que já se aplica ao enunciado (AD-012).

A modal de avaliação deixa de mostrar um texto solto e passa a ter uma coluna lateral com as rodadas, a mais recente no topo. Cada item da coluna resume a rodada numa linha — data, carga, percentual de escritas e taxa de sucesso — e selecioná-lo mostra o texto correspondente ao lado. É essa coluna que entrega a comparação: a progressão de `62% sucesso` para `99% sucesso` fica legível de relance, sem abrir entrada nenhuma.

O histórico é limitado a dez rodadas. Ao estourar, a mais antiga sai. Quando cheio, o cabeçalho da coluna diz que as mais antigas são descartadas, para que o descarte nunca seja surpresa.

O prompt enviado à IA não muda: cada avaliação continua sendo feita do zero, sem conhecimento das anteriores.

## User Stories

1. Como aluno de system design, quero que avaliar de novo preserve a avaliação anterior, para que eu não perca a crítica que motivou a mudança que acabei de fazer.
2. Como aluno, quero reabrir o simulador amanhã e reler o que a IA disse hoje, para que o estudo não precise caber numa sessão só.
3. Como aluno, quero ver as rodadas empilhadas em ordem, para que eu perceba a progressão do meu desenho sem abrir uma por uma.
4. Como aluno, quero ver a carga de cada rodada ao lado da crítica, para que eu não interprete como incoerência da IA duas críticas que na verdade avaliaram cargas diferentes.
5. Como aluno, quero ver a taxa de sucesso de cada rodada, para que eu tenha uma medida objetiva de melhora além da prosa.
6. Como aluno, quero ver a latência ponta a ponta e o RPS total de cada rodada, para que eu avalie se ganhei disponibilidade às custas de latência.
7. Como aluno, quero saber qual modelo gerou cada crítica, para que eu não compare julgamentos de modelos diferentes como se fossem a mesma régua.
8. Como aluno, quero que uma avaliação feita sem simulação apareça marcada como tal, para que eu não leia um zero como se fosse um resultado medido.
9. Como aluno, quero que a modal abra já na avaliação recém-concluída, para que ler o resultado novo continue sendo o caminho de menor atrito.
10. Como aluno, quero fechar a modal e reabri-la pelo painel, para que reler não custe uma nova chamada de API.
11. Como aluno, quero que o histórico seja salvo junto com o design nomeado, para que carregar aquele design me devolva o contexto inteiro do que já estudei nele.
12. Como aluno, quero que exportar o JSON leve o histórico, para que meu backup não seja parcial.
13. Como aluno, quero que importar meu próprio JSON restaure o histórico, para que mover o trabalho entre navegadores ou máquinas não apague meu progresso.
14. Como aluno, quero que importar um design de outra pessoa me mostre as críticas que a IA fez a ela, para que eu aprenda com o desenho alheio e não só com o meu.
15. Como aluno, quero que um arquivo antigo, sem histórico, continue abrindo normalmente, para que meus designs salvos não quebrem.
16. Como aluno, quero que um arquivo com uma entrada corrompida ainda importe o resto, para que um defeito pontual não me custe o design inteiro.
17. Como aluno, quero um teto de rodadas guardadas, para que o app não pare de salvar por estouro de armazenamento no momento em que eu mais precisar.
18. Como aluno, quero ser avisado quando o histórico estiver cheio, para que o descarte da rodada mais antiga não me pegue de surpresa.
19. Como aluno, quero que cada avaliação seja feita do zero, para que a IA julgue o desenho que está na tela e não reafirme o diagnóstico que já deu.
20. Como aluno, quero selecionar e copiar o texto de qualquer rodada do histórico, para que eu leve a crítica para minhas anotações.
21. Como aluno, quero rolar textos longos dentro da modal, para que a crítica não apareça cortada.
22. Como aluno, quero que uma avaliação que falhou não entre no histórico, para que a lista contenha só rodadas reais.
23. Como aluno que ainda não avaliou nada, quero que o botão de ver avaliações não apareça, para que a interface não ofereça o que está vazio.

## Implementation Decisions

Referências: AD-020 (onde mora e teto), AD-021 (forma da entrada), AD-022 (prompt independente). Todos registrados em `.specs/STATE.md`.

### Modelo de domínio

O tipo `Design` ganha um campo opcional `evaluations`. `schema` permanece `1`. É o quarto campo opcional acrescentado sem bump de schema, seguindo `name` (AD-009), `brief`/`challengeId` (AD-012) e `tech` (AD-015): ausência significa "design anterior à feature" e recebe fallback tolerante, não erro.

Cada entrada tem a forma:

```
{
  text: string
  createdAt: string        // ISO 8601
  rps: number
  writePercent: number
  model: string
  metrics?: { successRatio: number; e2eLatencyMs: number; totalRps: number }
}
```

`metrics` é opcional porque a avaliação pode ocorrer sem simulação — `evaluateDesign` já aceita `simState: null`. Ausente significa "não simulado", e a UI deve dizer isso em vez de exibir zeros.

Não há snapshot de `nodes`/`edges` por entrada. Sem tela de diff ou ação de restaurar, seria peso morto multiplicando o tamanho do JSON.

A ordem canônica é a mais recente primeiro. A lista é a fonte de verdade da ordem; nada deve reordenar por `createdAt` na leitura.

### Estado e ações

A avaliação corrente deixa de ser estado local do `EvaluationPanel` e passa a viver no store, como `brief` já vive. O `feedback` local é removido; a avaliação corrente é a primeira entrada do histórico.

O store ganha uma ação de anexar avaliação. Ela concentra a regra inteira: insere no topo, aplica o teto de dez e descarta a mais antiga. Nenhum outro ponto do código deve truncar a lista.

`currentDesign()` passa a incluir o histórico, o que faz salvar e exportar funcionarem sem mudança adicional. `loadDesign` passa a substituir o histórico em memória pelo do arquivo — regra única para carregar salvo e para importar JSON, sem caso especial.

### Persistência

A normalização de importação valida as entradas individualmente. Entrada inválida é descartada; as válidas seguem. O teto é reaplicado na normalização, para que um arquivo editado à mão com cinquenta entradas não contorne a regra. Nunca falha a importação por causa do histórico — precedente firme em AD-009, AD-012 e AD-017.

O armazenamento continua sendo a chave existente de designs no `localStorage`, sem chave nova. O caminho de falha por cota já existe e permanece: `saveDesign` devolve erro sem perder o design em memória.

### Prompt

`buildPrompt` não muda. Ele serializa apenas `{ schema, nodes, edges }` do design, então o histórico não vaza para a IA nem consome tokens do usuário. Isso é decisão deliberada (AD-022), não acidente da implementação, e precisa de guarda de regressão.

### Interface

A modal de avaliação ganha uma coluna lateral com as rodadas e alarga de 760px para cerca de 1000px, mantendo o padrão visual `.save-dialog` já usado por ela e pelo `SettingsDialog`. O corpo continua com `white-space: pre-wrap`, rolável e selecionável — sem biblioteca de markdown, como decidido na feature `evaluation-modal`.

Cada item da coluna resume a rodada em uma linha: data e hora, carga em RPS, percentual de escritas e taxa de sucesso. Sem métricas, o item indica que não houve simulação em vez de mostrar zeros.

Concluída uma avaliação, a modal abre com a nova entrada selecionada, preservando o AC1 da feature `evaluation-modal`. O botão do painel passa a se chamar "Ver avaliações" e aparece quando houver ao menos uma entrada. Com o histórico cheio, o cabeçalho da coluna informa que as mais antigas são descartadas.

## Testing Decisions

Um bom teste aqui fixa comportamento externo observável — o que o usuário obtém — e não a forma interna. Testar que o teto é dez e que a mais antiga sai é comportamento; testar o nome do campo interno que guarda o índice selecionado é implementação e envelhece na primeira refatoração.

Três dos quatro seams já existem. Nenhum módulo de teste conceitualmente novo é criado, e a lógica de negócio inteira fica no seam mais alto possível.

**Store (`src/store/useAppStore.test.ts`, existente).** É o seam principal: concentra teto, FIFO, ordenação, opcionalidade das métricas e o round-trip por `loadDesign`, tudo testável sem React. Prior art abundante no próprio arquivo — os testes de `applyTech` e `updateParams` já exercitam ações do store isoladamente.

Cobre: anexar coloca no topo; a décima primeira avaliação descarta a mais antiga e o tamanho estaciona em dez; avaliar sem simulação grava a entrada sem métricas; `currentDesign()` inclui o histórico; `loadDesign` substitui o histórico em memória pelo do arquivo; carregar design sem histórico resulta em lista vazia, não em erro.

**Persistência (`src/persistence/designStorage.test.ts`, existente).** Cobre: `importJson` aceita design com histórico válido; descarta entrada malformada preservando as válidas e o restante do design; aplica o teto a arquivo com excesso de entradas; design sem o campo importa normalmente; round-trip `exportJson` → `importJson` preserva o histórico. Prior art direto: os testes existentes de tolerância a `tech` desconhecida e de round-trip.

**Prompt (`src/evaluation/openRouter.test.ts`, existente).** Uma guarda de regressão do AD-022: avaliar um design que já tem histórico produz um prompt que não contém o texto das avaliações anteriores. É barato e protege uma decisão que um refator futuro desfaria sem perceber. Prior art: os testes existentes já inspecionam o corpo da requisição.

**End-to-end (`e2e/evaluation-history.spec.ts`, novo arquivo sob o seam do AD-018).** A coluna lateral é UI pura e não há RTL nem jsdom no projeto — Playwright é o único caminho, e o AD-018 já o estabeleceu para exatamente este caso. Semeia por import de JSON contendo histórico, como faz `e2e/tech-selector.spec.ts`, o que evita depender de chave de API ou de rede. Cobre: a coluna lista as rodadas na ordem, selecionar um item troca o texto exibido, e uma entrada sem métricas aparece marcada como não simulada.

O escopo do e2e é deliberadamente mínimo, seguindo o AD-018: o grosso da lógica fica nos testes unitários e o browser cobre só o que existe apenas no DOM.

## Out of Scope

| Feature | Motivo |
| ------- | ------- |
| Excluir uma entrada individual do histórico | O FIFO já resolve o crescimento. Excluir exigiria confirmação (o app não tem undo), estado de seleção e mais superfície de teste, para um problema que ainda não existe. É aditivo e barato de acrescentar depois |
| Comparar duas avaliações lado a lado | Dois blocos de prosa de vários KB não alinhados por parágrafo não se comparam na prática — rola-se um e perde-se o outro. O ganho real de comparação vem das métricas na coluna lateral, que esta spec entrega |
| Enviar avaliações anteriores no prompt | AD-022. Ancoraria a IA na própria crítica, comprometendo o diagnóstico, e a comparação já é feita pelo usuário na coluna lateral |
| Ação explícita de comparação pela IA | Se a continuidade fizer falta, o caminho honesto é uma ação separada que o usuário dispara sabendo o que pediu — não um modificador escondido no botão de avaliar. Fica no backlog |
| Snapshot da arquitetura por entrada | AD-021. Sem tela de diff ou ação de restaurar, ninguém lê `nodes`/`edges` cru |
| Restaurar o design de uma avaliação passada | Feature própria, com UI própria. Depende do snapshot acima |
| Renderização de markdown na modal | Já estava fora de escopo na feature `evaluation-modal` e continua |
| Chave de `localStorage` própria para o histórico | AD-020. Indexar por nome exigiria design salvo, e o design em memória só ganha nome ao salvar |

## Further Notes

O checkbox "incorporar a avaliação mais recente", com aviso de viés, foi considerado e recusado durante o grilling. O motivo está no AD-022 e vale repetir porque é o tipo de ideia que volta: se o rótulo de uma opção precisa avisar sobre viés de LLM, ela está pedindo ao aluno uma decisão sobre comportamento de modelo que ele não tem base para tomar — e ele veio aprender system design, não engenharia de prompt.

O efeito colateral de exportar o histórico junto foi discutido e aceito conscientemente: quem compartilha um design compartilha também as críticas que a IA lhe fez. Isso é mais didático que prejudicial num app local sem dados sensíveis, e a alternativa quebraria o backup do próprio usuário.

O teto de dez vem de aritmética, não de gosto: a resposta da IA é limitada a 2048 tokens de saída, cerca de 8 KB de texto, e o `localStorage` gira em torno de 5 MB compartilhados por todos os designs salvos. Dez entradas mantêm cada design em algo como 80 KB, deixando folga larga. Se o teto mudar, esse é o cálculo a refazer.
