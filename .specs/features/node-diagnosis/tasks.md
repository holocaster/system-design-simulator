# Tarefas: node-diagnosis

## T1 - Função pura de diagnóstico (TDD)

- `src/engine/diagnose.ts`: `diagnose(type, metrics, params): Diagnosis | null`.
- `src/engine/diagnose.test.ts` cobrindo AC1-AC8.
- Gate: `npx vitest run` verde.

## T2 - Exibição na caixa

- `ComponentNode.tsx`: ícone de alerta no cabeçalho quando `diagnose` != null;
  tooltip no hover com causa + ação.
- `components.css`: estilos do ícone e do tooltip (CSS puro, cor do estado).
- Gate: `npm run build`, `npm run lint` verdes; validação visual no browser.

## Verificação final

- `npm run build`, `npm run lint`, `npx vitest run` verdes.
