# Replicas + Mix Leitura/Escrita - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/replicas-rw-mix/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md` (raiz do drive + global do usuario: validar cada incremento, sem metas de cobertura explicitas); padrao inferido dos testes existentes (vitest, colocados `src/**/*.test.ts`, modulos puros).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| engine (flow, tick, catalog) | unit | Todos os ramos; 1:1 com requisitos R1-R9; conservacao por fluxo em todos os tipos; regressao replicas=1 | `src/engine/*.test.ts` | `npx vitest run src/engine` |
| store | unit | writePercent clamp; validacao inteiro replicas/shards; casos de erro | `src/store/*.test.ts` | `npx vitest run src/store` |
| persistence | unit | Round-trip com novos params; legacy sem params; invalidos rejeitados | `src/persistence/*.test.ts` | `npx vitest run src/persistence` |
| evaluation | unit | Prompt contem carga (rps + escritas %) | `src/evaluation/*.test.ts` | `npx vitest run src/evaluation` |
| UI components (ControlBar, PropertiesPanel, ComponentNode) | none | — (build gate; validacao manual via playwright em T14) | — | build gate only |

Nota: o projeto nao tem testes de componente React; o piso existente e build + validacao manual no browser (padrao usado na feature worker-and-naming).

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit (todos) | Yes | Modulos puros; store resetado por beforeEach; MemoryStorage por teste | `useAppStore.test.ts:8`, `designStorage.test.ts:13` |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Apos task com testes de uma area | `npx vitest run src/<area>` |
| Full | Apos task que cruza areas | `npx vitest run` |
| Build | Fim de fase e tasks so de UI | `npm run build && npm run lint && npx vitest run` |

Atencao: usar `npm run build` (tsc -b) como verdade de typecheck — `npx tsc --noEmit` ja deu falso limpo neste repo.

---

## Execution Plan

### Fase 1: Fundacao (paralela)

T1 [P], T2 [P]

### Fase 2: Engine dual-flow (sequencial — todos alteram tick.ts)

T3 -> T4 -> T5 -> T6 -> T7

### Fase 3: Store e persistencia (paralela)

T8 [P], T9 [P]

### Fase 4: UI (paralela)

T10 [P], T11 [P], T12 [P]

### Fase 5: Integracao e validacao (sequencial)

T13 -> T14

---

## Task Breakdown

### T1: Criar engine/flow.ts [P]

**What**: Tipo `Flow {read, write}` e operacoes puras: `flowTotal`, `addFlow`, `scaleFlow`, `capFlow` (reducao proporcional para caber em um teto).
**Where**: `src/engine/flow.ts` + `src/engine/flow.test.ts`
**Depends on**: None
**Reuses**: n/a (modulo novo, sem dependencias)
**Requirement**: R5 (base)
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Operacoes cobrem casos: fluxo zero, capFlow com teto maior que o total (passa tudo), teto menor (proporcional), teto zero
- [x] Gate: `npx vitest run src/engine`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(engine): tipo Flow com operacoes de leitura/escrita`
**Status**: Complete (82ad7ff)

---

### T2: Params e metricas de replicas no catalogo e types [P]

**What**: `ComponentParams.replicas?/shards?`; `PARAM_LIMITS` (1-20); `DEFAULT_PARAMS` (replicas:1 em service/worker/cache/sql/nosql; shards:1 em nosql); `REPLICABLE_TYPES`; campos novos em `NodeMetrics` (aliveReplicas, totalReplicas, flows, readUtilization?, writeUtilization?, queueDepthFlow?).
**Where**: `src/engine/types.ts`, `src/engine/catalog.ts`, `src/engine/catalog.test.ts`
**Depends on**: None (usa tipo Flow de T1 apenas em NodeMetrics — importacao de tipo; se executado antes de T1, declarar na mesma task)
**Reuses**: padrao PARAM_LIMITS/DEFAULT_PARAMS existente
**Requirement**: R1, R8
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] catalog.test atualizado: defaults exatos por tipo incluem replicas/shards; limites novos
- [x] Gate: `npx vitest run src/engine`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(engine): parametros replicas e shards no catalogo`
**Status**: Complete (6a12a0c)

---

### T3: Migrar runTick para carga composta e propagacao Flow generica

**What**: Assinatura `runTick(design, {rps, writeRatio}, prev?)`; cliente emite Flow; nos genericos processam Flow com teto total (overflow e errorRate proporcionais por fluxo); LB divide Flow; fan-out duplica Flow; conservacao por fluxo. Cache/fila/bancos ainda com comportamento agregado equivalente ao atual. Call site `useSimulation` e todos os testes migrados (cenarios neutros com writeRatio=0 — sem afrouxar asserts).
**Where**: `src/engine/tick.ts`, `src/engine/tick.test.ts`, `src/hooks/useSimulation.ts`
**Depends on**: T1, T2
**Reuses**: estrutura atual do tick (passada topologica + reversa)
**Requirement**: R5, R9
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Todos os testes existentes passam migrados (mesmos valores esperados com writeRatio=0)
- [x] Novos testes: split do cliente por writeRatio; conservacao por fluxo (entrada = sucesso + erro em cada fluxo) em no generico e LB
- [x] Gate: `npx vitest run` (cruza engine + hooks via build) e `npm run build`

**Tests**: unit
**Gate**: full
**Commit**: `feat(engine): propagacao dual-flow leitura/escrita no tick`
**Status**: Complete (1e69a09)

---

### T4: Cache/CDN com hit somente em leitura

**What**: Hit ratio aplica so ao fluxo de leitura; escritas atravessam integralmente; passada reversa usa fracao de passagem `(missLeitura + escrita)/sucessoTotal` para latencia downstream.
**Where**: `src/engine/tick.ts`, `src/engine/tick.test.ts`
**Depends on**: T3
**Reuses**: caso cache existente no tick
**Requirement**: R6
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Teste: com hit 80% e mix 20% escrita, downstream recebe 0.2xRPS de escrita + 0.16xRPS de leitura
- [x] Teste: writeRatio=0 reproduz comportamento anterior do cache
- [x] Gate: `npx vitest run src/engine`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(engine): cache com hit ratio somente em leituras`
**Status**: Complete (c9e0f9b)

---

### T5: Fila com profundidade por fluxo

**What**: `queueDepthFlow` interno (Flow) persistido entre ticks; enfileira proporcional aos fluxos de entrada; drena proporcional as profundidades; `queueDepth` publico = total (invariante read+write).
**Where**: `src/engine/tick.ts`, `src/engine/tick.test.ts`
**Depends on**: T3
**Reuses**: logica de enqueue/drain existente
**Requirement**: R5, R9
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Invariante testado: queueDepth === queueDepthFlow.read + queueDepthFlow.write em multiplos ticks
- [x] Testes existentes de fila passam com writeRatio=0
- [x] Gate: `npx vitest run src/engine`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(engine): fila com profundidade por fluxo`
**Status**: Complete (4add2b3)

---

### T6: Tetos por fluxo nos bancos SQL e NoSQL

**What**: SQL: tetoLeitura = capacity x replicas, tetoEscrita = capacity x 1; NoSQL: tetoLeitura = capacity x shards x replicas, tetoEscrita = capacity x shards; utilizacao = max(W, R) exposta em readUtilization/writeUtilization; excesso por fluxo vira erro daquele fluxo. (Nesta task replicas = valor do param; vivas entram em T7.)
**Where**: `src/engine/tick.ts`, `src/engine/tick.test.ts`
**Depends on**: T3
**Reuses**: processamento de no do tick
**Requirement**: R7, R8, R9
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Teste-licao SQL: capacity 500, replicas 5, mix 20% escrita -> sistema satura em 2500 RPS com erro so no fluxo de escrita
- [x] Teste-licao NoSQL: capacity 500, shards 4, mesmo mix -> sustenta 10000 RPS
- [x] readUtilization/writeUtilization expostos e conservacao por fluxo mantida
- [x] Gate: `npx vitest run src/engine`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(engine): tetos de leitura e escrita em sql e nosql`
**Status**: Complete (2ad81c8)

---

### T7: Maquina de replicas com degradacao parcial

**What**: `stepReplicas` (janela 150%/30 ticks mata 1 replica; 50%/50 ticks revive 1; down = 0 vivas; transicao no mesmo tick); utilizacao e tetos usam capacidade viva; drain da fila usa capacidade efetiva dos consumidores (R4); aliveReplicas/totalReplicas em NodeMetrics.
**Where**: `src/engine/tick.ts`, `src/engine/tick.test.ts`
**Depends on**: T4, T5, T6
**Reuses**: limiares e contadores da maquina de saude atual
**Requirement**: R2, R3, R4
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Regressao: com replicas=1, todos os cenarios da maquina atual produzem valores identicos (down em 30 ticks, recovery em 50)
- [x] Teste espiral: service com 3 replicas sob sobrecarga perde replicas em cascata ate down; recupera uma a uma
- [x] Teste R4: drain da fila cai quando worker perde replicas
- [x] SQL com vivas < total reduz teto de leitura; escrita zera so com 0 vivas
- [x] Gate: `npx vitest run src/engine`; fim da fase validado com build, lint e suite completa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(engine): degradacao parcial de replicas`
**Status**: Complete (dc5e516)

---

### T8: writePercent no store e validacao de inteiros [P]

**What**: `writePercent` (0-100, default 20) + `setWritePercent` com clamp; `updateParams` valida `Number.isInteger` para replicas/shards; `useSimulation` passa `{rps, writeRatio: writePercent/100}`.
**Where**: `src/store/useAppStore.ts`, `src/store/useAppStore.test.ts`, `src/hooks/useSimulation.ts`
**Depends on**: T3
**Reuses**: padrao setRps/clamp; validacao generica de updateParams
**Requirement**: R5, R12 (validacao)
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Testes: clamp de writePercent; replicas 2.5 rejeitado com mensagem; replicas 5 aceito
- [x] Gate: `npx vitest run src/store` + `npm run build`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(store): controle de escritas e validacao de replicas`
**Status**: Complete (dae78c0)

---

### T9: Validacao de replicas/shards no import [P]

**What**: `validateNode` aceita replicas/shards opcionais (inteiros 1-20); ausentes ok (default 1 aplicado no engine via params default no load — verificar caminho loadDesign).
**Where**: `src/persistence/designStorage.ts`, `src/persistence/designStorage.test.ts`
**Depends on**: T2
**Reuses**: loop de params opcionais existente (hitRatio/bufferSize)
**Requirement**: R13
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Testes: round-trip com replicas/shards; legacy sem os campos importa; replicas 0, 21 e 2.5 rejeitados
- [x] Gate: `npx vitest run src/persistence`; fim da fase validado com build, lint e suite completa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(persistence): validar replicas e shards no import`
**Status**: Complete (6278c5c)

---

### T10: Campo Escritas (%) na ControlBar [P]

**What**: Input numerico "Escritas (%)" ao lado do RPS, ligado a setWritePercent.
**Where**: `src/components/ControlBar.tsx`
**Depends on**: T8
**Reuses**: padrao do controle de RPS existente
**Requirement**: R5 (UI)
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Campo renderiza, altera o store e respeita clamp
- [x] Gate: `npm run build && npm run lint && npx vitest run`

**Tests**: none (matriz: UI = build gate)
**Gate**: build
**Commit**: `feat(ui): controle global de percentual de escritas`
**Status**: Complete (0b4af3f)

---

### T11: Campos Replicas e Shards no PropertiesPanel [P]

**What**: Campo "Replicas" para tipos replicaveis (REPLICABLE_TYPES) e "Shards" para nosql, padrao Field existente com erro inline.
**Where**: `src/components/PropertiesPanel.tsx`
**Depends on**: T8
**Reuses**: Field pattern e fieldsFor existentes
**Requirement**: R12
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Campos aparecem so nos tipos certos; valores invalidos mostram erro inline
- [x] Gate: `npm run build && npm run lint && npx vitest run`

**Tests**: none (matriz: UI = build gate)
**Gate**: build
**Commit**: `feat(ui): edicao de replicas e shards no painel`
**Status**: Complete

---

### T12: Badge de replicas e quebra W/R no ComponentNode [P]

**What**: Badge `xN` (parado, de params) / `vivas/N` com cor de alerta quando vivas < N (rodando, de NodeMetrics); bancos mostram `W util% | R util%` na linha de metricas.
**Where**: `src/components/ComponentNode.tsx`, `src/components/components.css`
**Depends on**: T7
**Reuses**: useNodeMetrics e layout de metricas existentes
**Requirement**: R10, R11
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Badge e quebra W/R renderizam nos casos parado/rodando/degradado
- [x] Gate: `npm run build && npm run lint && npx vitest run`

**Tests**: none (matriz: UI = build gate)
**Gate**: build
**Commit**: `feat(ui): badge de replicas e utilizacao leitura/escrita`
**Status**: Complete

---

### T13: Carga no payload da avaliacao por IA

**What**: `evaluateDesign(design, metrics, challenge?, load?)`; prompt ganha secao "Carga da simulacao: X RPS, Y% escritas"; EvaluationPanel passa rps/writePercent do store.
**Where**: `src/evaluation/openRouter.ts`, `src/evaluation/openRouter.test.ts`, `src/components/EvaluationPanel.tsx`
**Depends on**: T8
**Reuses**: buildPrompt e teste de payload existentes
**Requirement**: R14
**Tools**: MCP: NONE; Skill: NONE
**Done when**:

- [x] Teste: prompt contem RPS e percentual de escritas
- [x] Gate: `npx vitest run src/evaluation` + `npm run build`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(evaluation): carga da simulacao no prompt`
**Status**: Complete

---

### T14: Validacao manual no browser (UAT)

**What**: Script playwright validando as licoes de ponta a ponta: replicas aumentam teto (badge e util caem), espiral de morte visivel (vivas/N decrementa), SQL satura por escrita com muitas replicas, NoSQL com shards sustenta, campo Escritas (%) altera o resultado.
**Where**: script em `/tmp` (padrao playwright-skill); nada commitado alem de eventuais fixes
**Depends on**: T10, T11, T12, T13
**Reuses**: infra do teste browser da feature worker-and-naming
**Requirement**: Goals do spec (validacao)
**Tools**: MCP: NONE; Skill: `playwright-skill`
**Done when**:

- [x] Todos os cenarios do script passam; screenshot final capturado
- [x] Gate: `npm run build && npm run lint && npx vitest run`

**Tests**: none (validacao manual instrumentada)
**Gate**: build
**Commit**: nenhum (ou fix se algo for encontrado)
**Status**: Complete (UAT em `/tmp/playwright-test-replicas-rw-mix.js`; screenshot em `/tmp/replicas-rw-mix-uat.png`)

---

## Parallel Execution Map

```
Fase 1: T1 [P]  T2 [P]          (arquivos distintos)
Fase 2: T1,T2 -> T3 -> T4 -> T5 -> T6 -> T7   (sequencial: todos em tick.ts)
Fase 3: T3 -> T8 [P]   T2 -> T9 [P]
Fase 4: T8 -> T10 [P]  T8 -> T11 [P]  T7 -> T12 [P]
Fase 5: T10,T11,T12,T13(T8) ... T13 -> T14
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 modulo novo | OK |
| T2 | types+catalog (coesos: mesmo conceito de params) | OK |
| T3 | 1 mudanca estrutural no tick + migracao de call sites | OK (atomica: assinatura+generico) |
| T4-T7 | 1 caso especial do tick cada | OK |
| T8 | store + repasse no hook (coesos) | OK |
| T9-T13 | 1 arquivo principal cada | OK |
| T14 | 1 script de validacao | OK |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | Fase 1 sem seta | OK |
| T2 | None | Fase 1 sem seta | OK |
| T3 | T1, T2 | T1,T2 -> T3 | OK |
| T4 | T3 | T3 -> T4 | OK |
| T5 | T3 (apos T4 por arquivo compartilhado) | T4 -> T5 | OK (ordem de fase) |
| T6 | T3 (apos T5 por arquivo compartilhado) | T5 -> T6 | OK (ordem de fase) |
| T7 | T4, T5, T6 | T6 -> T7 | OK |
| T8 | T3 | T3 -> T8 | OK |
| T9 | T2 | T2 -> T9 | OK |
| T10 | T8 | T8 -> T10 | OK |
| T11 | T8 | T8 -> T11 | OK |
| T12 | T7 | T7 -> T12 | OK |
| T13 | T8 | T8 -> T13 | OK |
| T14 | T10, T11, T12, T13 | -> T14 | OK |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | engine | unit | unit | OK |
| T2 | engine | unit | unit | OK |
| T3 | engine (+hook) | unit | unit | OK |
| T4 | engine | unit | unit | OK |
| T5 | engine | unit | unit | OK |
| T6 | engine | unit | unit | OK |
| T7 | engine | unit | unit | OK |
| T8 | store (+hook) | unit | unit | OK |
| T9 | persistence | unit | unit | OK |
| T10 | UI | none (build) | none/build | OK |
| T11 | UI | none (build) | none/build | OK |
| T12 | UI | none (build) | none/build | OK |
| T13 | evaluation (+UI) | unit | unit | OK |
| T14 | validacao | none | none | OK |
