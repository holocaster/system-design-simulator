# Custom Brief - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/custom-brief/design.md`
**Status**: Concluída

## Desvios do plano original

Registrados porque o recorte executado difere do planejado, e quem ler depois precisa saber por quê.

| Desvio | Motivo |
| ------ | ------ |
| T2 virou puramente aditivo; o rename `requirements` -> `brief` migrou para o T3 | `tsconfig.app.json` inclui `"src"`, então os testes entram no `tsc -b`. Renomear em T2 quebraria o próprio gate do T2, já que `openRouter.test.ts` referenciava `requirements` |
| T3 ganhou a serialização só-da-arquitetura (R14) | Defeito encontrado na verificação: `currentDesign()` passou a incluir `brief`, e o prompt serializava o `Design` inteiro, duplicando o enunciado com risco de contradição |
| T6 corrigiu `cursor: wait` para `not-allowed` no botão desabilitado | Com o brief vazio nada está carregando; a ampulheta mentiria sobre o estado |
| T7 moveu o predicado para `challenges.ts` em vez de deixá-lo inline no `SaveLoadDialog` | Lógica pura com três ramos (indefinido, custom, desconhecido). Em `challenges.ts` cai na costura `src/evaluation/*.test.ts` que já existe, em vez de ficar sem teste na UI |
| T1 precisou de correção após o gate verde | A lista de arquivos veio de um `grep` com lista fixa de palavras, que omitiu `noticias`, `simulacao` e `conexoes` — e a verificação usou o mesmo `grep`, confirmando o próprio ponto cego. A varredura correta é a inversa: extrair todas as strings e filtrar as que **já têm** acento |

---

## Test Coverage Matrix

> Gerada a partir do código, das diretrizes do projeto e do spec — confirmar antes de Execute. Diretrizes encontradas: `CLAUDE.md` (raiz do drive + global do usuário: validar cada incremento, sem metas explícitas de cobertura); padrão inferido dos testes existentes (vitest, colocados em `src/**/*.test.ts`, módulos puros).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| evaluation | unit | Brief resolvido chega ao prompt (preset e customizado); prompt não contém a frase de entrevista; desafio não serializado como JSON | `src/evaluation/*.test.ts` | `npx vitest run src/evaluation` |
| persistence | unit | Round-trip de `brief`/`challengeId`; legado sem os campos; brief acima de 2000 rejeitado; tipos inválidos rejeitados | `src/persistence/*.test.ts` | `npx vitest run src/persistence` |
| store | unit | `currentDesign()` inclui os campos; `loadDesign()` restaura; default quando ausentes | `src/store/*.test.ts` | `npx vitest run src/store` |
| engine | unit | Regressão apenas — nenhuma mudança de comportamento nesta feature | `src/engine/*.test.ts` | `npx vitest run src/engine` |
| UI components (EvaluationPanel, SaveLoadDialog) | none | — (build gate; validação manual) | — | build gate only |

Nota: o projeto não tem testes de componente React. O piso existente é build + validação manual no browser, padrão registrado em `worker-and-naming` e `replicas-rw-mix`. Introduzir essa infraestrutura aqui seria escopo escondido — está declarado em Out of Scope no spec.

## Parallelism Assessment

> Gerada a partir do código — confirmar antes de Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit (todos) | Yes | Módulos puros; store resetado por `beforeEach`; `MemoryStorage` por teste; `fetch` mockado por teste | `useAppStore.test.ts:8`, `designStorage.test.ts:13`, `openRouter.test.ts` |

## Gate Check Commands

> Gerada a partir do código — confirmar antes de Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após task com testes de uma área | `npx vitest run src/<area>` |
| Full | Após task que cruza áreas | `npx vitest run` |
| Build | Fim de fase e tasks só de UI | `npm run build && npm run lint && npx vitest run` |

Atenção: usar `npm run build` (`tsc -b`) como verdade de typecheck — `npx tsc --noEmit` já deu falso limpo neste repo.

---

## Execution Plan

### Fase 1: Acentuação (isolada — toca 16 arquivos, precisa de diff limpo)

T1

### Fase 2: Modelo (sequencial — base das demais)

T2

### Fase 3: Camadas (paralela — áreas disjuntas)

T3 [P], T4 [P], T5 [P]

### Fase 4: UI (sequencial — T6 depende de T3 e T5)

T6 -> T7

### Fase 5: Documentação

T8

---

## Task Breakdown

### T1: Acentuar strings em português

**What**: Corrigir a acentuação de todas as strings em português no código — UI, mensagens de erro e de status. Nenhuma mudança de lógica. Atualizar os asserts que afirmam strings literais sem acento.
**Where** (real, após a correção): `src/components/{Canvas,ControlBar,EvaluationPanel,PropertiesPanel,SaveLoadDialog,SettingsDialog}.tsx`, `src/engine/graph.ts`, `src/evaluation/{challenges,openRouter}.ts`, `src/persistence/designStorage.ts`, `src/store/useAppStore.ts` + 5 de teste (`src/engine/{tick,catalog}.test.ts`, `src/evaluation/openRouter.test.ts`, `src/persistence/designStorage.test.ts`, `src/store/useAppStore.test.ts`). `types.ts` e `tick.ts` foram planejados mas não continham texto humano; `challenges.ts`, `ControlBar.tsx` e `graph.ts` não estavam no plano e continham.
**Depends on**: None
**Reuses**: n/a
**Requirement**: R1
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Nenhuma string em português no código sem acentuação correta
- [x] Asserts literais atualizados, incluindo `designStorage.test.ts:207` e `useAppStore.test.ts:59`
- [x] Nenhuma mudança de lógica no diff (só literais de string)
- [x] Gate: `npm run build && npm run lint && npx vitest run`

---

### T2: Modelo — campos do brief no Design (aditivo)

**What**: `Design` ganha `challengeId?: string` e `brief?: string` (schema segue `1`). Exportar `CUSTOM_CHALLENGE_ID` e `BRIEF_MAX_LENGTH` em `challenges.ts`. Mudança puramente aditiva — nada existente é renomeado.
**Where**: `src/engine/types.ts`, `src/evaluation/challenges.ts`
**Depends on**: T1
**Reuses**: padrão de campo opcional de `DesignNode.name`
**Requirement**: R2
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] `Design` tem `challengeId?` e `brief?`, `schema` inalterado em `1`
- [x] `CUSTOM_CHALLENGE_ID = "custom"` e `BRIEF_MAX_LENGTH = 2000` exportados
- [x] `EvaluationChallenge` **não** é alterado neste ticket
- [x] Gate: `npm run build && npx vitest run`

---

### T3: Avaliação — unificação do brief e prompt reescrito

**What**: Renomear `EvaluationChallenge.requirements` para `brief`, reescrevendo os dois presets para incorporar o domínio em prosa. `buildPrompt` e `evaluateDesign` passam a receber `brief: string` em vez do objeto. Remover o `JSON.stringify` do desafio. Reescrever o prompt ancorando a crítica nos requisitos declarados e removendo a frase "como em uma entrevista técnica".
**Where**: `src/evaluation/challenges.ts`, `src/evaluation/openRouter.ts`, `src/evaluation/openRouter.test.ts`
**Depends on**: T2
**Reuses**: costura existente de mock de `fetch` em `openRouter.test.ts`
**Requirement**: R3, R7, R8
**Tools**: MCP: NONE; Skill: NONE

> **Atômico por necessidade**: `tsconfig.app.json` inclui `"src"`, portanto os testes entram no `tsc -b`. Renomear `requirements` sem atualizar `openRouter.test.ts` no mesmo ticket quebra o build. Tipo, consumidor e teste mudam juntos.

**Done when**:

- [x] `EvaluationChallenge` usa `brief`; presets contêm domínio + carga em prosa
- [x] Assinaturas de `buildPrompt` e `evaluateDesign` recebem `brief: string`
- [x] Prompt não contém "entrevista" nem desafio serializado como JSON
- [x] Teste: brief de preset chega ao prompt
- [x] Teste: brief customizado chega ao prompt
- [x] Teste: brief vazio omite a seção do enunciado sem quebrar
- [x] Asserts antigos sobre `requirements` (linhas ~92 e ~102) substituídos
- [x] Gate: `npm run build && npx vitest run`

---

### T4: Persistência — validação dos campos novos [P]

**What**: `validateDesign` valida `brief` (string, `length <= 2000`) e `challengeId` (string), ambos opcionais. `challengeId` **não** é conferido contra a lista de presets.
**Where**: `src/persistence/designStorage.ts` + `src/persistence/designStorage.test.ts`
**Depends on**: T2
**Reuses**: `validateNode`, que já valida `name` como string com teto
**Requirement**: R10
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Round-trip preserva `brief` e `challengeId`
- [x] Design legado sem os campos importa sem erro
- [x] Brief com 2001 caracteres rejeitado
- [x] `brief` não-string e `challengeId` não-string rejeitados
- [x] `challengeId` desconhecido **não** rejeita o import
- [x] Gate: `npx vitest run src/persistence`

---

### T5: Store — estado e ciclo de vida do brief [P]

**What**: `AppState` ganha `brief: string` e `challengeId: string` com setters. `currentDesign()` inclui os campos; `loadDesign()` os restaura, com default para o primeiro preset quando ausentes. O `challengeId` é guardado cru, sem normalizar contra `CHALLENGES`.
**Where**: `src/store/useAppStore.ts` + `src/store/useAppStore.test.ts`
**Depends on**: T2
**Reuses**: padrão de setter existente (`setRps`, `setWritePercent`)
**Requirement**: R5 (parcial), R9
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] `setBrief` e `setChallengeId` funcionam
- [x] `currentDesign()` inclui os dois campos
- [x] `loadDesign()` restaura ambos; ausentes viram `""` e primeiro preset
- [x] `loadDesign()` preserva `challengeId` desconhecido sem normalizar
- [x] Gate: `npx vitest run src/store`

---

### T6: UI — opção Personalizado e textarea

**What**: Seletor ganha "Personalizado". Quando ativa, revela textarea com `maxLength={2000}` e o placeholder de exemplo. Seleção e texto vêm do store — remover o `useState(CHALLENGES[0].id)` atual. Botão "Avaliar design" desabilitado com "Personalizado" selecionado e brief vazio após `trim`. Resolver o brief antes de chamar `evaluateDesign`.
**Where**: `src/components/EvaluationPanel.tsx`, `src/components/components.css`
**Depends on**: T3, T5
**Reuses**: estrutura de `<select>` e classes CSS já existentes no painel
**Requirement**: R4, R5, R6
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] "Personalizado" no seletor revela o textarea; presets o escondem
- [x] Placeholder: `Ex: Sistema de reserva de hotéis. 5.000 buscas/s e 200 reservas/s no pico. Busca pode ficar levemente desatualizada, mas reserva não pode gerar overbooking.`
- [x] Botão desabilitado com Personalizado + textarea vazio
- [x] `useState` de seleção removido; estado vem do store
- [x] Resolução: preset -> `preset.brief`; custom -> `design.brief`; desconhecido -> primeiro preset
- [x] Validação manual: escrever brief, salvar, recarregar, reabrir — texto e seleção voltam
- [x] Gate: `npm run build && npm run lint && npx vitest run`

---

### T7: UI — aviso de desafio desconhecido

**What**: Após carregar ou importar um design, se `challengeId` não estiver em `CHALLENGES` e não for `"custom"`, exibir `"Desafio desconhecido, usando o padrão"` pelo canal de mensagem existente.
**Where**: `src/components/SaveLoadDialog.tsx`
**Depends on**: T6
**Reuses**: `setMessage`, já usado por load, import, save, delete e export
**Requirement**: R11
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Aviso aparece nos dois caminhos de carga (localStorage e import de arquivo)
- [x] Design carrega normalmente apesar do aviso; `brief` preservado
- [x] Nenhum aviso para `challengeId` válido ou `"custom"`
- [x] Validação manual: importar JSON com `challengeId` inventado
- [x] Gate: `npm run build && npm run lint && npx vitest run`

---

### T8: ADRs

**What**: Registrar `AD-011`, `AD-012` e `AD-013` em `.specs/STATE.md`. Marcar `AD-004` e `AD-007` como superados por `AD-013`, sem apagá-los.
**Where**: `.specs/STATE.md`
**Depends on**: T7
**Reuses**: tabela de decisões existente (`AD-001`..`AD-010`)
**Requirement**: R12, R13
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] `AD-011` — acentuação pt-BR nas strings de UI
- [x] `AD-012` — brief no `Design`; presets como brief enlatado; `challengeId` guardado para evitar destruição do brief
- [x] `AD-013` — avaliação via OpenRouter; racional: permite testar vários modelos, não só os da Anthropic; data 2026-07-17, commit `ca57870`
- [x] `AD-004` e `AD-007` marcados como superados por `AD-013`, ainda presentes na tabela
- [x] Handoff da seção final atualizado para esta feature
