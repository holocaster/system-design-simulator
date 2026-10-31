# System Design Simulator

Simulador visual, 100% client-side, para montar arquiteturas e observar
propagacao de carga, latencia, erros e saude dos componentes. A UI e em pt-BR.

## Stack e comandos

- React 19 + TypeScript + Vite; canvas com `@xyflow/react`; estado com Zustand.
- `npm run dev` inicia o Vite.
- `npm run build` e o typecheck real (`tsc -b`); `npm run lint` usa oxlint;
  `npx vitest run` executa a suite unitaria.
- Testes unitarios ficam co-localizados em `src/**/*.test.ts` (vitest fixa esse
  `include`, entao nao coleta as specs de e2e).
- Smoke e2e com Playwright em `e2e/*.spec.ts`; `npm run e2e` roda (sobe o Vite
  sozinho via webServer). Escopo minimo, so fluxos UI-only de alto valor; semeie
  estado via import JSON para evitar o drag-and-drop do canvas. A UI nao tem
  teste de componente; para o resto, valide fluxos visuais no browser.
- `playwright.config.ts` fixa `storageState` global com `help-seen: "true"`
  (senao a modal de ajuda auto-abre em toda pagina fresca e bloqueia clique nos
  outros specs). Um spec que precise de localStorage genuinamente vazio deve
  sobrescrever com `test.use({ storageState: { cookies: [], origins: [] } })`,
  como `e2e/help.spec.ts` ja faz.

## Arquitetura

- `src/engine/`: modulo TypeScript puro e deterministico. `tick.ts` executa a
  simulacao; `flow.ts` modela carga `{ read, write }`; `catalog.ts` concentra
  tipos, defaults, limites e matriz de conexoes; `types.ts` define o contrato.
- `src/store/useAppStore.ts`: unico estado da aplicacao e conversao para
  `Design` via `currentDesign()`.
- `src/hooks/useSimulation.ts`: chama `runTick` a cada 100 ms enquanto a
  simulacao esta ativa. Componentes apenas exibem/alteram o estado.
- `src/components/`: canvas, controles, propriedades, persistencia e avaliacao.
- `src/persistence/designStorage.ts`: localStorage e import/export JSON,
  indexado por `id` do System Design.
- `src/evaluation/openRouter.ts`: avaliacao por IA via OpenRouter; chave e model
  ficam somente no localStorage do navegador.
- `src/theme/theme.ts`: tema claro/escuro. Storage com `Storage` injetavel
  (mesmo padrao de `designStorage.ts`); preferencia de navegador, fora do
  `Design` e do `useAppStore`.

## Regras de dominio importantes

- Trafego deve conservar leitura e escrita separadamente: para cada fluxo,
  entrada = sucesso + erro. Cache/CDN so absorve leituras.
- `capacity` e por replica. Service, worker, cache, SQL e NoSQL aceitam
  `replicas` inteiras de 1 a 20; NoSQL tambem aceita `shards` de 1 a 20.
- SQL escala leitura por replicas vivas, mas escrita usa uma primaria. NoSQL
  escala escrita por shards e leitura por shards x replicas vivas.
- Sob carga sustentada, replicas caem uma a uma (utilizacao > teto sustentada).
  A volta e por reinicio de atraso fixo (`RESTART_TICKS`), independente da
  carga — nao mais por utilizacao baixa. `readyReplicas` conta as prontas;
  `aliveReplicas` nao existe mais no codigo. Preserve os casos de regressao com
  uma replica e a compatibilidade de designs antigos.
- Autoscaling e opt-in por componente (`params.autoscaling`), restrito aos
  tipos que ja tem `replicas` (`REPLICABLE_TYPES`). `desiredReplicas` vive no
  `SimState`, nao no `Design`, e segue a formula do HPA sobre `readyReplicas`;
  scale-up e imediato, scale-down exige janela de estabilizacao.
- O mix de escritas e controle da simulacao (`writePercent`), nao faz parte do
  design persistido. Defaults ausentes de replicas/shards devem equivaler a 1.
- O System Design tem `id` estavel (nasce antes do primeiro salvamento) e nome
  opcional unico; RPS, writePercent, metricas e execucao da simulacao ficam
  fora da entidade. "Alteracao nao salva" compara conteudo persistivel contra o
  ultimo baseline salvo, nao contra os controles da simulacao.

## Alteracoes

- Ao mudar a engine, mantenha a logica React fora dela e cubra o requisito em
  `src/engine/*.test.ts` com valores observaveis, nao detalhes internos.
- Ao mudar schemas ou parametros, atualize catalogo, store, importacao e o
  payload de avaliacao quando aplicavel.
- Consulte `.specs/STATE.md` para decisoes ativas e `.specs/features/` para
  especificacoes, tarefas e validacoes anteriores.

## Fluxo de tickets

- Ao concluir cada ticket, faça o commit e siga inline para o próximo sem pedir
  confirmação. Pare antes de o contexto ficar abaixo de 20%.
- Para cada feature, o `tasks.md` em `.specs/features/<feature>/` é a fonte de
  verdade do status, critérios de aceite e commits; `.scratch` não é canônico.
