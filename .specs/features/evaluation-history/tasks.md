# Tarefas: evaluation-history

Spec: `.specs/features/evaluation-history/spec.md`
ADRs: AD-020 (onde mora e teto), AD-021 (forma da entrada), AD-022 (prompt independente)

---

## T1 - Histórico no modelo e no store

**Status:** ready-for-agent

**Bloqueado por:** nada, pode começar imediatamente.

**O que construir:** avaliar duas vezes deixa de destruir a primeira avaliação. O
histórico passa a existir como estado do domínio, é salvo junto com o design
nomeado e sai no JSON exportado. Aos olhos do usuário a tela ainda se comporta
como hoje — mostra a avaliação mais recente — mas nada mais é perdido.

O `Design` ganha um campo opcional de avaliações, com `schema` mantido em `1`.
O store ganha a ação de anexar uma avaliação, que concentra a regra inteira:
insere no topo, aplica o teto de dez e descarta a mais antiga. Nenhum outro
ponto do código trunca a lista. A avaliação corrente deixa de ser estado local
do painel e passa a ser a primeira entrada do histórico no store.

Forma da entrada (AD-021):

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

- [x] Anexar uma avaliação a coloca no topo; a ordem canônica é a mais recente primeiro
- [x] A décima primeira avaliação descarta a mais antiga e o tamanho estaciona em dez
- [x] Avaliar sem simulação rodada grava a entrada sem métricas, não com zeros
- [x] A entrada registra a carga (RPS e percentual de escritas) e o modelo usado
- [x] `currentDesign()` inclui o histórico, de modo que salvar e exportar o levam junto
- [x] Carregar um design substitui o histórico em memória pelo do arquivo
- [x] Carregar um design sem o campo resulta em histórico vazio, nunca em erro
- [x] Uma avaliação que falhou não entra no histórico
- [x] O painel deixa de guardar a avaliação em estado local e lê a mais recente do store
- [x] Guarda de regressão do AD-022: avaliar um design que já tem histórico produz um prompt que não contém o texto das avaliações anteriores
- [x] Gate: `npm run build`, `npm run lint`, `npx vitest run` verdes

---

## T2 - Coluna lateral na modal

**Status:** ready-for-agent

**Bloqueado por:** T1

**O que construir:** o aluno passa a enxergar a progressão do próprio desenho.
A modal de avaliação deixa de mostrar um texto solto e ganha uma coluna lateral
com as rodadas, a mais recente no topo. Cada item resume a rodada numa linha —
data e hora, carga em RPS, percentual de escritas e taxa de sucesso — e
selecioná-lo mostra o texto correspondente ao lado. É a coluna que entrega a
comparação: a progressão de `62% sucesso` para `99% sucesso` fica legível de
relance, sem abrir entrada nenhuma.

Mantém o padrão visual `.save-dialog` já usado pela modal e pelo
`SettingsDialog`, e o corpo continua `pre-wrap`, rolável e selecionável — sem
biblioteca de markdown.

- [x] A coluna lista as rodadas com a mais recente no topo
- [x] Cada item mostra data e hora, carga em RPS, percentual de escritas e taxa de sucesso
- [x] Item de rodada sem simulação aparece marcado como não simulado, não com zeros
- [x] Selecionar um item troca o texto exibido no corpo
- [x] Concluída uma avaliação, a modal abre com a nova entrada selecionada (AC1 da feature `evaluation-modal`)
- [x] Fechar e reabrir pelo painel não custa nova chamada de API
- [x] O botão do painel se chama "Ver avaliações" e só aparece havendo ao menos uma entrada
- [x] Com o histórico cheio, o cabeçalho da coluna informa que as mais antigas são descartadas
- [x] O texto de qualquer rodada continua selecionável e o corpo rolável
- [x] A modal alarga para comportar a coluna sem espremer o texto
- [x] Gate: `npm run build`, `npm run lint`, `npx vitest run` verdes; validação visual no browser

---

## T3 - Tolerância na importação

**Status:** ready-for-agent

**Bloqueado por:** T1

**O que construir:** importar e exportar deixam de ser um caminho por onde o
histórico se perde ou por onde regras são contornadas. A normalização de
importação valida as entradas individualmente e nunca falha a importação por
causa do histórico — precedente firme em AD-009, AD-012 e AD-017.

- [x] Importar um arquivo com uma entrada malformada descarta só ela e preserva as válidas e o restante do design
- [x] Importar um arquivo com mais de dez entradas aplica o teto na normalização
- [x] Importar um arquivo antigo, sem o campo, funciona normalmente
- [x] Round-trip exportar e importar preserva o histórico
- [x] Importar um design de outra pessoa traz o histórico dela (regra única para carregar e importar, sem caso especial)
- [x] Gate: `npm run build`, `npm run lint`, `npx vitest run` verdes

---

## T4 - Smoke e2e do histórico

**Status:** ready-for-agent

**Bloqueado por:** T2, T3

**O que construir:** cobertura de browser para o que existe apenas no DOM. Segue
o AD-018: escopo deliberadamente mínimo, semeando por import de JSON contendo
histórico — como faz `e2e/tech-selector.spec.ts` — para não depender de chave de
API nem de rede.

- [x] Importa um design com histórico e abre a modal de avaliações
- [x] A coluna lista as rodadas na ordem esperada
- [x] Selecionar um item troca o texto exibido
- [x] Uma entrada sem métricas aparece marcada como não simulada
- [x] Gate: `npx playwright test` verde, além de `npm run build`, `npm run lint`, `npx vitest run`

---

## Verificação final

- `npm run build`, `npm run lint`, `npx vitest run` e `npx playwright test` verdes
- `.specs/STATE.md` com o Handoff atualizado
