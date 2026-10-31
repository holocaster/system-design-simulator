# Seletor de Tecnologia por Componente - Tasks

**Spec**: `.specs/features/tech-selector/spec.md`
**ADRs**: `AD-014` a `AD-017` em `.specs/STATE.md`
**Status**: ready-for-agent

## Execution Protocol

Implementar com a skill `tlc-spec-driven` (convenção do repo, ver `custom-brief`):
ativá-la por nome e seguir o fluxo Execute. Se a skill não puder ser ativada,
PARAR e avisar — não prosseguir sem ela.

Regras de gate deste repo:
- Typecheck real é `npm run build` (`tsc -b`); `npx tsc --noEmit` dá falso limpo.
- Gate completo: `npm run build && npm run lint && npx vitest run`.
- Projeto não tem testes de componente React: UI valida por build + browser.
- Engine (`tick.ts`) NÃO é tocada nesta feature — `tech` só afeta params via preset.

## Contexto já aplicado nesta sessão (fora dos tickets)

`DEFAULT_PARAMS` já recalibrados para `service` 2.000→500, `worker` 2.000→500,
`sql` 500→1.500, com os asserts de `catalog.test.ts` e `useAppStore.test.ts`
atualizados. Falta `nosql` (T1). Suíte verde em 122 testes antes destes tickets.

---

## T1 — Fechar recalibração de defaults (nosql)

**What to build:** um componente NoSQL recém-adicionado nasce com capacity 10.000
em vez de 5.000, fechando o `AD-014` (os outros três defaults já foram aplicados
nesta sessão). Mudança de dado apenas; nenhuma lógica muda.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `DEFAULT_PARAMS.nosql.capacity` passa de 5.000 para 10.000; latência e demais campos inalterados
- [x] O assert de `catalog.test.ts` para o default de `nosql` reflete 10.000
- [x] `npx vitest run src/engine` verde; nenhuma regressão em outros defaults

---

## T2 — Seletor de tecnologia ponta a ponta para queue

**What to build:** no painel de propriedades de uma fila, o aluno escolhe uma
tecnologia (SQS FIFO, SQS Standard, RabbitMQ, Kafka) num seletor. Escolher aplica
a capacidade e a latência daquela tecnologia. A escolha aparece no nó do canvas,
é salva no design, sobrevive a exportar/importar e chega à IA avaliadora. Editar
a capacidade ou a latência à mão devolve o seletor para "Personalizado". Escalar
réplicas/buffer não altera a tecnologia. Este ticket prova o mecanismo completo
num único tipo; T3 estende os dados aos demais.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `DesignNode` ganha `tech?: string` opcional; `Design.schema` permanece `1`; designs antigos sem `tech` carregam sem migração
- [x] `catalog.ts` ganha `TECH_PRESETS` indexado por tipo e por id de tecnologia (`label`, `capacity`, `baseLatencyMs`), populado para `queue` com os quatro presets aprovados (sqs-fifo 3.000/30, sqs-standard 30.000/20, rabbitmq 40.000/5, kafka 200.000/5)
- [x] Aplicar uma tecnologia no store define `capacity`+`baseLatencyMs` do preset e define `tech`, atomicamente
- [x] Editar `capacity` ou `baseLatencyMs` via `updateParams` zera `tech` para `undefined`; editar `replicas`/`shards`/`bufferSize`/`errorRate` preserva `tech`
- [x] `currentDesign()` inclui `tech`; `loadDesign()` normaliza: tech conhecida re-semeia `capacity`/`baseLatencyMs` do preset; tech desconhecida, ausente ou de tipo não-selecionável vira `undefined` preservando os números do nó
- [x] `importJson`/validador aceitam `tech` string opcional e rejeitam `tech` de tipo não-string; `exportJson` inclui `tech`
- [x] `PropertiesPanel` mostra, para `queue`, um `<select>` de tecnologia com opção "Personalizado" (sentinela `tech` ausente) acima dos campos numéricos; trocar a opção aplica a tecnologia
- [x] `ComponentNode` exibe o `label` da tecnologia no nó quando `tech` está definida
- [x] Testes: presets de queue como dados em `catalog.test.ts`; aplicar/reset/preservar e normalização de `loadDesign` em `useAppStore.test.ts`; aceite/rejeição de `tech` e export em `designStorage.test.ts`
- [x] Gate completo verde: `npm run build && npm run lint && npx vitest run`

---

## T3 — Estender presets aos demais tipos

**What to build:** o mesmo seletor passa a funcionar em `nosql`, `sql`, `service`
e `worker`, com os presets aprovados de cada família. O mecanismo provado em T2
não muda — é extensão de dados e habilitação do seletor para mais quatro tipos.

**Blocked by:** T2.

**Status:** done

- [x] `TECH_PRESETS` populado para `nosql` (dynamodb 8.000/10, mongodb 10.000/5, cassandra 30.000/5), `sql` (postgresql 1.500/10, mysql 2.000/10, aurora 5.000/8) e `service`+`worker` (spring-mvc 500/20, nodejs 1.500/15, spring-webflux 2.000/15, quarkus-native 3.000/10, go 5.000/10)
- [x] `PropertiesPanel` mostra o `<select>` de tecnologia também para `nosql`, `sql`, `service`, `worker`, cada um listando só as tecnologias do seu tipo (a UI gateia por `techPresetsFor(type).length > 0`, sem código por tipo)
- [x] A normalização de `loadDesign` e o reset de `updateParams` funcionam para os quatro tipos sem código específico por tipo (mesmo caminho do T2)
- [x] Testes: presets dos quatro tipos como dados em `catalog.test.ts`; casos de aplicar em `sql` e de rejeitar preset de outro tipo em `useAppStore.test.ts`
- [x] Gate completo verde: `npm run build && npm run lint && npx vitest run`
