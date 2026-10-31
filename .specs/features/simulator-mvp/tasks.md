# Simulador de System Design - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/simulator-mvp/design.md`
**Status**: In Progress (aprovado em 2026-07-17; execucao com sub-agentes por fase)

## Progress

| Fase | Status | Commits | Testes |
| ---- | ------ | ------- | ------ |
| 1 (T1-T3) | DONE | 729d571, 0df0967, b444d26 | 12 passed |
| 2 (T4-T6) | DONE | 12dfb95, 78b8bc2, 45b9906 | 35 passed |
| 3 (T7-T11) | DONE | 8c7f4e7, c5c8f32, 3f2f8cf, da066b4, fb498c4 | 48 passed |
| 4 (T12-T14) | DONE | 4f46776, a62b986, c60278a | 48 passed |
| 5 (T15-T16) | DONE | 27874ee, bead981 | 54 passed |
| 6 (T17-T19) | DONE | 3176ea6, 1c7eb75, e47b461 | 59 passed |
| 7 (T20-T22, verifier fixes) | DONE | 94ddd7f, f3dd28e, 39f91d9 | 63 passed |

---

## Test Coverage Matrix

> Generated from spec + design + project guidelines — confirm before Execute. Guidelines found: `CLAUDE.md` (be simple, no emojis, incremental steps), AD-006 (Vitest, engine puro). Projeto greenfield: sem testes existentes; strong defaults aplicados.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Engine (`src/engine/`) | unit | Todos os branches; 1:1 com ACs SIM-04/05/06 + edge cases da spec (multiplos Clientes, no isolado, cache 0%/100%) | `src/engine/*.test.ts` | `npx vitest run` |
| Persistence (`src/persistence/`) | unit | ACs SIM-07: save/load/delete, export/import, JSON invalido, localStorage indisponivel | `src/persistence/*.test.ts` | `npx vitest run` |
| Evaluation (`src/evaluation/`) | unit (SDK mockado) | ACs SIM-08: prompt contem design+metricas+desafio; erros chave/rede/timeout mapeados | `src/evaluation/*.test.ts` | `npx vitest run` |
| Store (`src/store/`) | unit | Acoes principais: addNode, updateParams com limites, loadDesign, guard startSim sem Cliente | `src/store/*.test.ts` | `npx vitest run` |
| UI components (`src/components/`) | none | Gate de build + UAT interativa ao final do Execute (feature Complex, user-facing) | — | `npm run build` |

## Parallelism Assessment

> Confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit (vitest) | Yes | Engine e funcoes puras sem estado global; localStorage e SDK mockados por teste | Design: engine sem dependencias; persistence recebe storage injetavel |

## Gate Check Commands

> Confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks com testes unitarios | `npx vitest run` |
| Build | Tasks so de UI/config | `npm run build` |
| Full | Fim de fase | `npm run build && npx vitest run` |

---

## Execution Plan

### Phase 1: Fundacao (Sequential)

```
T1 -> T2 -> T3
```

### Phase 2: Engine de simulacao (Sequential)

```
T3 -> T4 -> T5 -> T6
```

### Phase 3: Canvas builder (P1)

```
T7 -> T8 -> T9 -> T10 [P]
                  T11 [P]
```

### Phase 4: Simulacao viva na UI (P1/P2)

```
T6 + T9 -> T12 -> T13 [P]
                  T14 [P]
```

### Phase 5: Persistencia (P2)

```
T15 -> T16
```

### Phase 6: Avaliacao por IA (P3)

```
T17 [P]
T18 [P] -> T19
```

---

## Task Breakdown

### T1: Scaffold do projeto

**What**: Criar projeto Vite + React + TypeScript com dependencias (`@xyflow/react`, `zustand`) e devDeps (`vitest`), scripts `dev`/`build`/`test`, layout base vazio (3 areas: sidebar, canvas, painel).
**Where**: raiz do projeto
**Depends on**: None
**Reuses**: template `npm create vite@latest`
**Requirement**: infra (todos)

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] `npm run build` passa sem erros
- [ ] `npx vitest run` roda (0 testes, sem falha de config)
- [ ] App abre com layout de 3 areas vazio

**Tests**: none | **Gate**: build
**Commit**: `chore: scaffold vite react ts com react flow, zustand e vitest`

---

### T2: Tipos e catalogo de componentes

**What**: `types.ts` (ComponentType, ComponentParams, Design, SimState, NodeMetrics, HealthState) e `catalog.ts` (defaults por tipo conforme design, limites de parametros, matriz de conexoes `canConnect`).
**Where**: `src/engine/types.ts`, `src/engine/catalog.ts`, `src/engine/catalog.test.ts`
**Depends on**: T1
**Reuses**: tabelas do design.md
**Requirement**: SIM-01, SIM-02, SIM-03

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] 10 tipos com defaults exatos do design
- [ ] `canConnect` cobre toda a matriz (casos validos e invalidos testados, incluindo Service -> SQL/NoSQL/S3 direto e Cliente sem entrada)
- [ ] Limites de parametros exportados (capacidade 1-1M, latencia 0-10000, ratios 0-1)
- [ ] Gate: `npx vitest run` passa

**Tests**: unit | **Gate**: quick
**Commit**: `feat(engine): tipos, catalogo de componentes e matriz de conexoes`

---

### T3: Ordem topologica

**What**: `topoOrder(design)` via Kahn, com deteccao de ciclo (retorna erro) e nos desconectados incluidos.
**Where**: `src/engine/graph.ts`, `src/engine/graph.test.ts`
**Depends on**: T2
**Requirement**: SIM-02, SIM-04

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Ordem correta para grafos com fan-out/fan-in
- [ ] Ciclo detectado e reportado
- [ ] Gate: `npx vitest run` passa

**Tests**: unit | **Gate**: quick
**Commit**: `feat(engine): ordem topologica com deteccao de ciclo`

---

### T4: Forward pass (propagacao de carga)

**What**: Passo 1 do `runTick`: propagacao de RPS pela ordem topologica — LB divide entre destinos saudaveis, Cache/CDN propagam misses, Fila enfileira/drena com buffer, demais replicam; `processed`, `overflow`, `baseErrors`, `localSuccess` por no.
**Where**: `src/engine/tick.ts`, `src/engine/tick.test.ts`
**Depends on**: T3
**Requirement**: SIM-04, SIM-05 (AC5, AC8)

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Exemplo numerico da spec passa: Cliente 1000 -> LB -> 2 Services -> Cache 80% -> SQL recebe 200 RPS
- [ ] Taxa de erro base: 1% em 200 RPS = 2 RPS de falha sem sobrecarga (AC8)
- [ ] Cache 0% e 100% funcionam sem tratamento especial
- [ ] Multiplos Clientes somam carga; no sem caminho fica em 0 RPS
- [ ] Conservacao de fluxo: incoming = success + errors em cada no
- [ ] Gate: `npx vitest run` passa

**Tests**: unit | **Gate**: quick
**Commit**: `feat(engine): forward pass de propagacao de carga`

---

### T5: Maquina de estados de saude

**What**: Passo 2 do `runTick`: utilization -> healthy/degraded/overloaded; down apos 30 ticks acima de 150%; recuperacao apos 50 ticks abaixo de 50%; no down processa 0 e falha tudo; LB redistribui excluindo downs.
**Where**: `src/engine/tick.ts` (modificar), `src/engine/tick.test.ts`
**Depends on**: T4
**Requirement**: SIM-06

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Transicoes com limiares exatos (0.7, 1.0, 1.5) testadas 1:1 com ACs SIM-06
- [ ] Queda apos 3s sustentados e recuperacao apos 5s testadas via contadores de ticks
- [ ] LB redistribui para destinos saudaveis quando um cai (AC7)
- [ ] Downstream de no down recebe zero (AC6)
- [ ] Gate: `npx vitest run` passa

**Tests**: unit | **Gate**: quick
**Commit**: `feat(engine): maquina de estados com degradacao, queda e recuperacao`

---

### T6: Backward pass (sucesso e latencia efetivos)

**What**: Passo 3 do `runTick`: successRatio e latencia efetiva por no (curva mult 1x ate 70%, rampa ate 5x em 100%, teto), agregacao por tipo (LB media ponderada, Cache hit+miss, fan-out produto, Fila corta cadeia), metricas globais no Cliente.
**Where**: `src/engine/tick.ts` (modificar), `src/engine/tick.test.ts`
**Depends on**: T5
**Requirement**: SIM-05, SIM-06 (AC2)

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Curva de latencia testada nos pontos 0.69 (1x), 0.85 (3x), 1.0+ (5x)
- [ ] Latencia ponta-a-ponta pondera cache hit/miss corretamente
- [ ] Falha no banco reduz successRatio dos Services upstream e do global
- [ ] Fila: enfileirar conta como sucesso e nao soma latencia downstream
- [ ] Gate: `npx vitest run` passa

**Tests**: unit | **Gate**: quick
**Commit**: `feat(engine): backward pass de sucesso e latencia ponta-a-ponta`

---

### T7: Store Zustand

**What**: `useAppStore` com nodes/edges/params, rps, running, simState e acoes (addNode com id unico, removeNode, updateParams com clamp nos limites, setRps, startSim com guard de Cliente conectado, stopSim zerando metricas, applyTick, loadDesign).
**Where**: `src/store/useAppStore.ts`, `src/store/useAppStore.test.ts`
**Depends on**: T2
**Requirement**: SIM-01, SIM-03, SIM-04 (AC6, AC7)

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] updateParams rejeita valores fora dos limites (AC5 do P1)
- [ ] startSim sem Cliente conectado retorna erro com mensagem (AC7)
- [ ] stopSim congela e zera metricas (AC6)
- [ ] removeNode remove conexoes associadas
- [ ] Gate: `npx vitest run` passa

**Tests**: unit | **Gate**: quick
**Commit**: `feat(store): estado global com acoes de design e simulacao`

---

### T8: ComponentNode customizado

**What**: No visual com icone, nome do tipo, handles de entrada/saida, cor por HealthState (verde/amarelo/vermelho/cinza down) e area de metricas (util%, RPS, lat, err%) — ainda com dados estaticos.
**Where**: `src/components/ComponentNode.tsx`
**Depends on**: T7
**Reuses**: padrao `nodeTypes` + `Handle` do React Flow (doc oficial)
**Requirement**: SIM-01

**Tools**: MCP: `context7` (se precisar de doc React Flow) | Skill: NONE

**Done when**:

- [ ] Renderiza os 10 tipos com visual distinto
- [ ] Cliente sem handle de entrada; sinks sem handle de saida
- [ ] Gate: `npm run build` passa

**Tests**: none | **Gate**: build
**Commit**: `feat(ui): no customizado com estado visual e metricas`

---

### T9: Palette e Canvas com drag-and-drop

**What**: Sidebar com os 10 componentes arrastaveis e Canvas React Flow com `onDrop`/`onDragOver`/`screenToFlowPosition` criando nos no store; conexoes via `onConnect`.
**Where**: `src/components/Palette.tsx`, `src/components/Canvas.tsx`
**Depends on**: T8
**Reuses**: exemplo oficial drag-and-drop do React Flow (verificado via Context7)
**Requirement**: SIM-01, SIM-02

**Tools**: MCP: `context7` | Skill: NONE

**Done when**:

- [ ] Arrastar da paleta cria no na posicao do drop (AC1)
- [ ] Ligar saida a entrada cria conexao (AC2)
- [ ] Deletar no remove conexoes (AC6)
- [ ] Gate: `npm run build` passa

**Tests**: none | **Gate**: build
**Commit**: `feat(ui): paleta e canvas com drag-and-drop`

---

### T10: Validacao de conexoes no canvas [P]

**What**: `isValidConnection` integrando `canConnect` (matriz) + prevencao de ciclos via `getOutgoers`; feedback visual do motivo da rejeicao.
**Where**: `src/components/Canvas.tsx` (modificar)
**Depends on**: T9
**Reuses**: `src/engine/catalog.ts` (canConnect), padrao prevent-cycles oficial
**Requirement**: SIM-02 (AC3)

**Tools**: MCP: `context7` | Skill: NONE

**Done when**:

- [ ] Conexao invalida pela matriz nao fecha e mostra motivo
- [ ] Ciclo A->B->A rejeitado
- [ ] Gate: `npm run build` passa

**Tests**: none (logica pura ja testada em T2/T3) | **Gate**: build
**Commit**: `feat(ui): validacao de conexoes com matriz e ciclos`

---

### T11: PropertiesPanel [P]

**What**: Painel do no selecionado: capacidade, latencia base, taxa de erro base, hit ratio (cache/cdn), buffer (fila); validacao de limites com mensagem; botao excluir no.
**Where**: `src/components/PropertiesPanel.tsx`
**Depends on**: T9
**Reuses**: limites de `catalog.ts`, acoes do store (T7)
**Requirement**: SIM-03

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Todos os parametros do tipo aparecem e editam o store
- [ ] Valor fora dos limites bloqueado com mensagem do limite (AC5)
- [ ] Gate: `npm run build` passa

**Tests**: none (clamp testado em T7) | **Gate**: build
**Commit**: `feat(ui): painel de propriedades com validacao de limites`

---

### T12: Loop de simulacao e ControlBar

**What**: Hook `useSimulation` (setInterval 100ms chamando `runTick` e `applyTick`) e ControlBar com iniciar/parar, slider RPS em escala log (1-100k) reagindo sem reiniciar, e metricas globais (taxa de sucesso, latencia e2e, RPS total).
**Where**: `src/hooks/useSimulation.ts`, `src/components/ControlBar.tsx`
**Depends on**: T6, T9
**Requirement**: SIM-04, SIM-05 (AC4)

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Iniciar/parar funciona; slider muda carga ao vivo (AC2)
- [ ] Metricas globais exibidas e coerentes (AC4)
- [ ] Estado vazio: mensagem orientando em vez de erro
- [ ] Gate: `npm run build && npx vitest run` passa

**Tests**: none (tick testado nas fases 1-2) | **Gate**: full
**Commit**: `feat(sim): loop de simulacao com controle de carga e metricas globais`

---

### T13: Metricas e cores ao vivo nos nos [P]

**What**: Conectar ComponentNode ao simState via seletores por no (throttle visual 250ms): cores por estado e numeros atualizando durante a simulacao; zerar ao parar.
**Where**: `src/components/ComponentNode.tsx` (modificar)
**Depends on**: T12
**Requirement**: SIM-05 (AC3), SIM-06 (AC1-AC4)

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Cores verde/amarelo/vermelho/down refletem o simState
- [ ] Metricas por no visiveis durante simulacao
- [ ] Gate: `npm run build` passa

**Tests**: none | **Gate**: build
**Commit**: `feat(ui): metricas e estado de saude ao vivo nos nos`

---

### T14: TrafficEdge animada [P]

**What**: Edge customizada com pontos SVG (`animateMotion`) fluindo na direcao do trafego; densidade/velocidade proporcional ao fluxo; oculta sem fluxo; cor de erro quando destino falha.
**Where**: `src/components/TrafficEdge.tsx`
**Depends on**: T12
**Reuses**: padrao de edge animada do React Flow
**Requirement**: SIM-04 (AC1)

**Tools**: MCP: `context7` | Skill: NONE

**Done when**:

- [ ] Animacao visivel do Cliente para downstream com simulacao rodando (AC1)
- [ ] Sem fluxo = sem animacao; parar congela (AC6)
- [ ] Gate: `npm run build` passa

**Tests**: none | **Gate**: build
**Commit**: `feat(ui): edges com trafego animado proporcional ao fluxo`

---

### T15: Persistencia localStorage e JSON

**What**: `designStorage.ts`: save (sobrescreve por nome), list, load, delete, exportJson (download), importJson com validacao de schema/tipos/limites/matriz; erros de localStorage capturados.
**Where**: `src/persistence/designStorage.ts`, `src/persistence/designStorage.test.ts`
**Depends on**: T7
**Requirement**: SIM-07

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Todos os 6 ACs de SIM-07 com teste 1:1 (storage mockado)
- [ ] JSON invalido rejeitado sem tocar o design atual
- [ ] localStorage indisponivel reporta erro sem perder memoria
- [ ] Gate: `npx vitest run` passa

**Tests**: unit | **Gate**: quick
**Commit**: `feat(persistence): salvar, carregar, exportar e importar designs`

---

### T16: SaveLoadDialog

**What**: UI de salvar com nome, listar/carregar/excluir designs, botoes exportar/importar arquivo.
**Where**: `src/components/SaveLoadDialog.tsx`
**Depends on**: T15
**Requirement**: SIM-07

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Fluxo completo: salvar -> recarregar pagina -> carregar identico
- [ ] Import de arquivo invalido mostra erro claro
- [ ] Gate: `npm run build` passa

**Tests**: none (logica em T15) | **Gate**: build
**Commit**: `feat(ui): dialogo de salvar, carregar e importar designs`

---

### T17: SettingsDialog para chave de API [P]

**What**: Tela de configuracao: chave OpenRouter e model ID configuravel salvos so em localStorage, com aviso de seguranca; leitura pela camada de avaliacao.
**Where**: `src/components/SettingsDialog.tsx`
**Depends on**: T7
**Requirement**: SIM-08 (AC1, AC4)

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Chave e model ID persistem em localStorage e nunca aparecem fixos em codigo/arquivos
- [ ] Gate: `npm run build` passa

**Tests**: none | **Gate**: build
**Commit**: `feat(ui): configuracao da chave de API`

---

### T18: Cliente de avaliacao IA [P]

**What**: `evaluation/openRouter.ts`: prompt builder (design JSON + metricas + desafio opcional), chamada REST com Bearer token e model ID configuravel, timeout 60s, mapeamento de erros (chave invalida/rede/timeout); `challenges.ts` com 2 desafios.
**Where**: `src/evaluation/openRouter.ts`, `src/evaluation/challenges.ts`, `src/evaluation/openRouter.test.ts`
**Depends on**: T7
**Reuses**: documentacao OpenRouter verificada via Context7
**Requirement**: SIM-08

**Tools**: MCP: Context7 | Skill: `context7-mcp`

**Done when**:

- [ ] Request contem model ID escolhido, design, metricas e requisitos do desafio (testado com fetch mockado)
- [ ] Erros mapeados para mensagens em portugues (AC3)
- [ ] Gate: `npx vitest run` passa

**Tests**: unit (fetch mockado) | **Gate**: quick
**Commit**: `feat(evaluation): cliente de avaliacao com API OpenRouter`

---

### T19: EvaluationPanel

**What**: Painel: seletor de desafio, botao Avaliar (redireciona para settings se sem chave), loading, feedback renderizado; design intacto em erro.
**Where**: `src/components/EvaluationPanel.tsx`
**Depends on**: T17, T18
**Requirement**: SIM-08 (AC2, AC4, AC5)

**Tools**: MCP: NONE | Skill: NONE

**Done when**:

- [ ] Sem chave -> leva a configuracao (AC4)
- [ ] Avaliacao exibe feedback; erro mostra mensagem clara e mantem design (AC3)
- [ ] Gate: `npm run build && npx vitest run` passa

**Tests**: none (logica em T18) | **Gate**: full
**Commit**: `feat(ui): painel de avaliacao do design por IA`

---

### T20: Transicoes atomicas de saude

**What**: Calcular o estado efetivo do no antes do processamento local, para que a entrada em `down` e a recuperacao alterem processamento, erros e propagacao no mesmo tick em que o novo estado e reportado.
**Where**: `src/engine/tick.ts`, `src/engine/tick.test.ts`
**Depends on**: T6
**Requirement**: SIM-06 (AC4, AC5, AC6)

**Done when**:

- [ ] No tick 30 acima de 150%, o no reporta `down`, processa 0, falha toda a entrada e envia 0 ao downstream
- [ ] No tick 50 abaixo de 50%, o no reporta `healthy`, processa a entrada atual e volta a propagar no mesmo tick
- [ ] Os limites anteriores permanecem: tick 29 ainda nao cai e tick 49 ainda nao recupera
- [ ] Gate: `npx vitest run` passa

**Tests**: unit, novos asserts derivados dos probes do Verifier | **Gate**: quick
**Commit**: `fix(engine): aplicar transicoes de saude no mesmo tick`

---

### T21: Falhas efetivas nos nos upstream

**What**: Adicionar `effectiveErrorRps` a `NodeMetrics`, calculado no backward pass a partir do sucesso ponta-a-ponta; manter `errorRps` como erro local para conservar o fluxo e usar a metrica efetiva na UI.
**Where**: `src/engine/types.ts`, `src/engine/tick.ts`, `src/engine/tick.test.ts`, `src/components/ComponentNode.tsx`
**Depends on**: T20
**Requirement**: SIM-05 (AC3), SIM-06 (AC6)

**Done when**:

- [ ] Falha total no banco produz `effectiveErrorRps` igual a carga nos Services/Cliente upstream
- [ ] `errorRps` local continua satisfazendo `incomingRps = successRps + errorRps`
- [ ] A UI calcula Err% com `effectiveErrorRps`
- [ ] Gate: `npm run build` e `npx vitest run` passam

**Tests**: unit | **Gate**: full
**Commit**: `fix(engine): registrar falhas efetivas nos upstreams`

---

### T22: Latencia global pelo caminho critico

**What**: Para Load Balancer, manter a media dos success ratios, mas calcular latencia downstream pelo maior ramo saudavel.
**Where**: `src/engine/tick.ts`, `src/engine/tick.test.ts`
**Depends on**: T21
**Requirement**: SIM-05 (AC4)

**Done when**:

- [ ] Cliente -> LB 2ms -> Services 10ms/100ms reporta 102ms de latencia global, nao 57ms
- [ ] Semantica ponderada de sucesso do LB permanece inalterada
- [ ] Gate: `npm run build` e `npx vitest run` passam

**Tests**: unit | **Gate**: full
**Commit**: `fix(engine): calcular latencia pelo caminho critico`

---

## Parallel Execution Map

```
Phase 1: T1 -> T2 -> T3
Phase 2: T4 -> T5 -> T6
Phase 3: T7 -> T8 -> T9 -> { T10 [P], T11 [P] }
Phase 4: (T6, T9 prontos) T12 -> { T13 [P], T14 [P] }
Phase 5: T15 -> T16
Phase 6: { T17 [P], T18 [P] } -> T19
Phase 7: T20 -> T21 -> T22
```

`[P]` = sem dependencia entre si dentro da fase (ordem livre). Nao e diretiva de sub-agente por task. 6 fases > 3: oferecer um worker por fase no Execute (offer-then-confirm).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | scaffold (1 acao coesa) | OK |
| T2 | 2 arquivos coesos (tipos+catalogo) | OK (coeso) |
| T3-T6 | 1 funcao/passo do engine cada | OK |
| T7 | 1 store | OK |
| T8, T10, T11, T13, T14, T16, T17, T19 | 1 componente cada | OK |
| T9 | 2 componentes acoplados (DnD par origem/destino) | OK (coeso) |
| T12 | hook + barra de controle acoplados | OK (coeso) |
| T15 | 1 modulo | OK |
| T18 | cliente + dados de desafios | OK (coeso) |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | inicio Phase 1 | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T4 | T4 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |
| T7 | T2 | inicio Phase 3 (apos Phase 1) | Match |
| T8 | T7 | T7 -> T8 | Match |
| T9 | T8 | T8 -> T9 | Match |
| T10 | T9 | T9 -> T10 [P] | Match |
| T11 | T9 | T9 -> T11 [P] | Match |
| T12 | T6, T9 | (T6, T9) -> T12 | Match |
| T13 | T12 | T12 -> T13 [P] | Match |
| T14 | T12 | T12 -> T14 [P] | Match |
| T15 | T7 | inicio Phase 5 | Match |
| T16 | T15 | T15 -> T16 | Match |
| T17 | T7 | Phase 6 [P] | Match |
| T18 | T7 | Phase 6 [P] | Match |
| T19 | T17, T18 | (T17, T18) -> T19 | Match |

T10/T11 nao dependem entre si; T13/T14 idem; T17/T18 idem — flags [P] consistentes.

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | config/scaffold | none | none (build) | OK |
| T2 | engine | unit | unit | OK |
| T3 | engine | unit | unit | OK |
| T4 | engine | unit | unit | OK |
| T5 | engine | unit | unit | OK |
| T6 | engine | unit | unit | OK |
| T7 | store | unit | unit | OK |
| T8 | UI | none | none (build) | OK |
| T9 | UI | none | none (build) | OK |
| T10 | UI (logica pura ja coberta em T2/T3) | none | none (build) | OK |
| T11 | UI (clamp coberto em T7) | none | none (build) | OK |
| T12 | UI/hook (tick coberto em T4-T6) | none | full gate | OK |
| T13 | UI | none | none (build) | OK |
| T14 | UI | none | none (build) | OK |
| T15 | persistence | unit | unit | OK |
| T16 | UI (logica em T15) | none | none (build) | OK |
| T17 | UI | none | none (build) | OK |
| T18 | evaluation | unit | unit | OK |
| T19 | UI (logica em T18) | none | full gate | OK |

Nenhuma violacao: toda logica de negocio (engine, store, persistence, evaluation) tem testes co-localizados na task que a cria; camada UI e "none" por decisao da matriz (build gate + UAT interativa ao final).

---

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| SIM-01 | T2, T7, T8, T9 |
| SIM-02 | T2, T3, T9, T10 |
| SIM-03 | T2, T7, T11 |
| SIM-04 | T3, T4, T7, T12, T14 |
| SIM-05 | T4, T6, T12, T13 |
| SIM-06 | T5, T6, T13 |
| SIM-07 | T15, T16 |
| SIM-08 | T17, T18, T19 |

**Coverage:** 8/8 requisitos mapeados, 0 nao mapeados.
