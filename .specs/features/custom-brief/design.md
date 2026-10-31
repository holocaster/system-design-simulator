# Custom Brief - Design

**Spec**: `.specs/features/custom-brief/spec.md`
**Contexto**: `.specs/features/custom-brief/context.md`

---

## Modelo de dados

```ts
// src/engine/types.ts
export interface Design {
  schema: 1;
  challengeId?: string;
  brief?: string;
  nodes: DesignNode[];
  edges: DesignEdge[];
}

// src/evaluation/challenges.ts
export interface EvaluationChallenge {
  id: string;
  name: string;   // rótulo do dropdown
  brief: string;  // texto enviado à IA
}

export const CUSTOM_CHALLENGE_ID = "custom";
export const BRIEF_MAX_LENGTH = 2000;
```

`schema` permanece `1`. Os dois campos são opcionais e aditivos: `validateDesign` só exige `schema === 1`, `nodes` e `edges`, e não rejeita chaves extras — designs salvos antes desta feature carregam sem migração.

### Presets como brief enlatado

O `name` deixa de ir para a IA e passa a ser apenas rótulo. A informação de domínio que ele carregava é incorporada em prosa no `brief`:

```ts
export const CHALLENGES: readonly EvaluationChallenge[] = [
  {
    id: "url-shortener",
    name: "URL shortener",
    brief: "Encurtador de URLs. Suportar 10.000 RPS.",
  },
  {
    id: "news-feed",
    name: "Feed de notícias",
    brief: "Feed de notícias social. Suportar 50.000 leituras por segundo.",
  },
];
```

Sem isso, trocar o objeto por uma string no `buildPrompt` faria a IA perder `"URL shortener"` — que informa mais sobre o sistema do que o requisito numérico.

---

## Resolução do brief

Ponto único de decisão, no `EvaluationPanel`, antes de chamar `evaluateDesign`:

```
challengeId === "custom"  ->  design.brief ?? ""
challengeId é preset      ->  preset.brief
challengeId desconhecido  ->  CHALLENGES[0].brief   (fallback de exibição)
```

`buildPrompt` recebe a string já resolvida e não sabe a origem. Isso remove a ramificação preset-vs-customizado do módulo de IA e elimina o `JSON.stringify(challenge)` que hoje injeta um objeto serializado no meio do texto do prompt.

### Assinatura

```ts
// antes
buildPrompt(design, metrics, challenge?: EvaluationChallenge, load?)
evaluateDesign(design, metrics, challenge?: EvaluationChallenge, load?)

// depois
buildPrompt(design, metrics, brief: string, load?)
evaluateDesign(design, metrics, brief: string, load?)
```

Brief vazio continua sendo um caminho válido no módulo de IA (a seção do enunciado é omitida), mas a UI impede que ele aconteça por esquecimento via R6.

---

## Prompt reescrito

```
Avalie este system design contra os requisitos declarados abaixo.
Baseie a crítica no que o sistema precisa fazer, não em arquiteturas
de referência. Não cobre componentes que os requisitos não justificam.
Identifique pontos fortes, gargalos e melhorias concretas.
Responda em português.

Design completo:
{design}

Métricas da última simulação:
{metrics}

Carga da simulação: {load}

Enunciado:
{brief resolvido, em prosa}
```

A frase removida — "como em uma entrevista técnica" — era a origem do viés: ela convoca o repertório canônico de entrevista em vez do enunciado real.

### Somente a arquitetura é serializada

`{design}` na seção "Design completo" é `{ schema, nodes, edges }`, não o `Design` inteiro.

Como `currentDesign()` passou a incluir `brief` e `challengeId`, serializar o objeto completo colocaria um segundo enunciado dentro do prompt. Com um preset selecionado e um `brief` customizado preservado, os dois se contradizem:

```
Design completo:
{ "brief": "Sistema de reserva de hotéis", "challengeId": "url-shortener", ... }

Enunciado:
Encurtador de URLs. Suportar 10.000 RPS.
```

A IA receberia dois enunciados incompatíveis sem nenhuma indicação de qual vale. Este é o custo escondido de preservar o `brief` em vez de apagá-lo ao trocar de desafio — pago aqui, e não com uma ação destrutiva na UI.

---

## Fluxo store -> prompt

O store hoje guarda `nodes`/`edges` como tipos do React Flow e `currentDesign()` monta o `Design`. Os campos novos seguem o mesmo caminho:

```
AppState
  brief: string
  challengeId: string
  setBrief(brief)
  setChallengeId(id)

currentDesign()  ->  inclui brief e challengeId no Design
loadDesign(d)    ->  set({ brief: d.brief ?? "", challengeId: d.challengeId ?? CHALLENGES[0].id })
```

O `useState(CHALLENGES[0].id)` atual em `EvaluationPanel` é removido: seleção e texto passam a vir do store. Mantidos como estado local, não sobreviveriam ao carregamento de um design, que é justamente o ponto de persistir os campos.

O store **guarda `challengeId` cru**, sem normalizar contra `CHALLENGES`. A resolução de um id desconhecido acontece na exibição. Isso evita criar uma dependência do store para o módulo de avaliação e preserva o dado original do arquivo.

---

## Validação na importação

`validateDesign` ganha checagem dos dois campos, seguindo o padrão do `name` de `DesignNode` (string com teto de 40):

```
brief        ausente, ou string com length <= 2000       senão "Brief inválido"
challengeId  ausente, ou string                          senão "Desafio inválido"
```

`challengeId` não é conferido contra a lista de presets — ver abaixo.

---

## Desafio desconhecido

Um design exportado por uma versão com presets diferentes traz um `challengeId` que esta versão não conhece. Como `CHALLENGES` é constante de código, isso acontece a cada mudança na lista de presets.

Comportamento: **carrega e avisa**.

```
SaveLoadDialog, após loadDesign / importJson:
  se design.challengeId não está em CHALLENGES e não é "custom"
    setMessage("Desafio desconhecido, usando o padrão")
```

A checagem fica no `SaveLoadDialog` porque ele já possui o canal de mensagem (`setMessage`) e ambos os caminhos de carga passam por ele. O `brief` não se perde nesse cenário, por ser campo separado.

Silenciar seria pior que avisar: o usuário abriria o design, veria um preset selecionado que não era o original e a IA avaliaria contra o enunciado errado, sem nenhum sinal.

---

## Interface

`EvaluationPanel` ganha a opção "Personalizado" no seletor existente e, quando ela está ativa, um textarea:

```
maxLength    2000
placeholder  "Ex: Sistema de reserva de hotéis. 5.000 buscas/s e 200
              reservas/s no pico. Busca pode ficar levemente
              desatualizada, mas reserva não pode gerar overbooking."
```

O exemplo é deliberadamente um sistema fora do repertório de entrevista, e sua última frase demonstra o tipo de restrição que nenhum preset de mercado captura mas que muda a avaliação por completo.

Botão "Avaliar design" desabilitado quando `challengeId === "custom"` e o brief está vazio após `trim`.

---

## Acentuação (incremento 1)

Mudança mecânica, sem alteração de lógica, em 16 arquivos — 11 de código e 5 de teste. Feita antes da feature para que o código novo já nasça na convenção correta e o diff do brief não fique enterrado sob dezenas de trocas de string.

Nada bloqueia: o projeto não tem ESLint, `.editorconfig`, Prettier ou Biome, e o `index.html` já declara `charset UTF-8`. O `AD-005` registra apenas "UI em português (pt-BR)", sem mencionar acentuação.

Ponto de atenção: mensagens de erro são afirmadas literalmente em teste. O critério de conclusão é a suíte inteira passar.

---

## ADRs (incremento 3)

| ADR | Ação |
| --- | ---- |
| `AD-011` | Novo: acentuação pt-BR nas strings de UI |
| `AD-012` | Novo: brief no `Design`; presets como brief enlatado; `challengeId` guardado para evitar destruição do brief |
| `AD-013` | Novo: avaliação via OpenRouter. Racional do usuário: permite testar vários modelos, não só os da Anthropic. Data 2026-07-17, commit `ca57870` |
| `AD-004` | Marcado como superado por `AD-013` |
| `AD-007` | Marcado como superado por `AD-013` |

`AD-004` e `AD-007` não são apagados. ADR é registro histórico: remover a decisão passada destrói o porquê de ela ter existido.
