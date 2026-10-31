# Worker + Nomes de Componentes - Design

## Parte 1: Worker

### engine/types.ts
- `ComponentType` ganha `"worker"`.

### engine/catalog.ts
- `COMPONENT_TYPES`: adicionar `"worker"` (apos `"queue"`).
- `DEFAULT_PARAMS.worker = { capacity: 2_000, baseLatencyMs: 20, errorRate: 0 }`.
- `CONNECTION_MATRIX`:
  - `queue: ["worker"]` (remove `service`)
  - `worker: ["service", "cache", "sql", "nosql", "queue", "storage"]`

### components/ComponentNode.tsx
- `COMPONENT_META.worker = { label: "Worker", sigla: "WRK" }`.

### Engine (tick.ts)
- Sem mudanca: worker e um processador comum; o drain da fila entrega a qualquer outgoer.

### Efeitos colaterais automaticos
- Paleta, canvas (nodeTypes) e validacao de load ja derivam de `COMPONENT_TYPES`, `COMPONENT_META` e `canConnect`. Nenhum codigo novo de validacao.

## Parte 2: Nomes

### store/useAppStore.ts
- `AppNodeData` ganha `name: string`.
- `addNode`: gera nome via `nextName(type, nodes)` = label do tipo + (maior sufixo numerico entre nos do mesmo tipo + 1).
- Nova action `renameNode(id, name): string | null` — valida trim nao-vazio e <= 40 chars; retorna mensagem de erro ou null.

### components/ComponentNode.tsx
- Header mostra `data.name` no lugar de `meta.label`.

### components/PropertiesPanel.tsx
- Campo texto "Nome" no topo do form (antes dos campos numericos), ligado a `renameNode`, com exibicao de erro no padrao existente.
- Cliente tambem pode ser renomeado (campo aparece para todo tipo).

### engine/types.ts + persistence/designStorage.ts
- `DesignNode.name?: string` (opcional no schema para retrocompatibilidade).
- Save: serializa `name`.
- Load/validacao: `name` ausente ou vazio -> fallback auto-numerado na conversao para nos; se presente, valida string <= 40 chars.

### evaluation/openRouter.ts
- Incluir `name` na representacao dos nos enviada no prompt.

## Ordem de implementacao

1. Worker (types, catalog, meta) + testes de catalogo e tick
2. Nome no store (addNode auto-numerado, renameNode) + testes
3. UI (ComponentNode, PropertiesPanel)
4. Persistencia + testes de round-trip e retrocompatibilidade
5. Payload da avaliacao

## Testes

- catalog: fila conecta somente a worker; nenhum tipo alem de fila conecta a worker; saida do worker
- tick: fluxo client -> gateway -> service -> queue -> worker -> sql processa trafego
- store: auto-numeracao (incluindo apos delecao), validacao de renameNode
- designStorage: round-trip com name; load de design antigo sem name aplica fallback; name invalido rejeitado
