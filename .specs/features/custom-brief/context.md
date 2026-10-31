# Custom Brief - Contexto

## Vocabulário

| Termo | Significado |
| ----- | ----------- |
| **Brief** | O enunciado do problema: o que o sistema faz **e** suas restrições. É contra ele que a IA avalia. Substitui o antigo `requirements`, que cobria apenas requisito não-funcional. |
| **Desafio** (`EvaluationChallenge`) | Um brief enlatado com rótulo: `{ id, name, brief }`. O `name` é rótulo de UI; o `brief` é o que vai para a IA. |
| **`challengeId`** | Qual desafio está selecionado no design. O sentinela `"custom"` significa "usar o `brief` do próprio design". |
| **Brief resolvido** | A string única que `buildPrompt` recebe: `preset.brief` quando um preset está selecionado, `design.brief` quando o selecionado é `"custom"`. |

## Por que esta feature existe

A avaliação por IA hoje só aceita dois enunciados fixos (`url-shortener`, `news-feed`), ambos padrões clássicos de entrevista. Quem projeta um sistema fora desse repertório não tem como dizer à IA o que o sistema faz — e a IA acaba cobrando componentes de arquiteturas de referência que os requisitos reais não justificam.

O `brief` livre resolve isso: o usuário descreve o próprio sistema, e o prompt passa a ancorar a crítica no que foi declarado, não no repertório de mercado.

## Decisões que moldaram o desenho

**O brief pertence ao design, não à sessão.** Foi decidido persistir `brief` no `Design` (e não em `useState` ou numa chave solta de `localStorage`) porque a descrição do sistema é parte do artefato: designs salvos e exportados carregam o próprio enunciado junto. Uma chave global de `localStorage` seria ativamente errada com dois designs — descrever o A e abrir o B colaria a descrição errada silenciosamente.

**`challengeId` existe para evitar destruição.** A alternativa considerada era derivar a seleção do dropdown (`brief` preenchido implicaria "Personalizado") e apagar o `brief` ao trocar para um preset, com confirmação. Foi descartada: um campo a mais custa menos que uma ação destrutiva sem undo, num app que não tem undo em lugar nenhum. Com `challengeId` guardado, o `brief` sobrevive ignorado enquanto um preset estiver escolhido.

**Preset e customizado são a mesma coisa.** Unificar `EvaluationChallenge.requirements` em `brief` faz `buildPrompt` receber uma string já resolvida, sem saber a origem. Elimina a ramificação no módulo de IA e preserva no prompt a informação que o `name` do preset carregava (`"URL shortener"` diz mais à IA que `"Suportar 10.000 RPS"`).

**Acentuação vem antes.** O código escreve português sem acento (`"Avaliacao por IA"`, `"Nao foi possivel"`). Não há regra que exija isso — não existe ESLint, `.editorconfig`, Prettier ou Biome no projeto, e o `index.html` declara `charset UTF-8`. Corrigir junto com a feature enterraria a lógica sob dezenas de trocas mecânicas de string em 16 arquivos, então a acentuação é um incremento próprio e anterior.

## Estado anterior relevante

- `AD-005` registra "UI em português (pt-BR)", sem dizer nada sobre acentuação.
- `AD-004` e `AD-007` descrevem avaliação via API Anthropic com `@anthropic-ai/sdk`. O código usa OpenRouter via `fetch` desde o commit `ca57870` (2026-07-17). Os ADRs estão desatualizados e são corrigidos nesta feature.
