# Recalibração e extensão do catálogo de tecnologias de compute - Tasks

**Spec**: `.specs/features/compute-tech-recalibration/spec.md`
**ADR**: `AD-061` em `.specs/STATE.md`
**Status**: ready-for-agent

## Execution Protocol

Gate completo: `npm run build && npm run lint && npx vitest run`.
Engine (`tick.ts`) NÃO é tocada nesta feature — `tech` só afeta params via
preset, mecanismo do AD-016/AD-017 já existe e não muda.

---

## T1 — Estender e recalibrar o catálogo de tecnologias de compute

**What to build:** no painel de propriedades de `service`/`worker`, o
seletor de tecnologia passa a oferecer "Quarkus JVM" e ".NET" além dos cinco
já existentes. Escolher qualquer um aplica capacity/latência do preset,
seguindo o mecanismo já existente (nenhuma mudança de UI necessária). Os
presets "Quarkus native" e "Go" passam a usar valores recalibrados
(benchmark real, ver AD-061); designs salvos que já usam essas duas
tecnologias carregam com os novos valores ao reabrir, via `loadDesign` (o
preset sempre manda, AD-017).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `COMPUTE_PRESETS` em `catalog.ts` ganha `quarkus-jvm` (capacity 650,
      baseLatencyMs 17) e `dotnet` (capacity 500, baseLatencyMs 20),
      posicionados no array em ordem crescente de capacity junto aos demais
- [x] `quarkus-native` recalibrado de 3.000/10ms para 520/19ms
- [x] `go` recalibrado de 5.000/10ms para 3.000/10ms (baseLatencyMs
      inalterada)
- [x] `spring-mvc` (500/20), `nodejs` (1.500/15) e `spring-webflux`
      (2.000/15) permanecem inalterados
- [x] `catalog.test.ts`: o array de ids de `techPresetsFor("service")` (e o
      espelho em `"worker"`) inclui os 7 ids na ordem correta; asserts de
      valor exato cobrem `quarkus-jvm`, `dotnet`, `quarkus-native` e `go`
      com os novos números
- [x] Nenhuma mudança necessária em `useAppStore.test.ts` ou
      `designStorage.test.ts` (não fixam valores literais de presets de
      compute — verificado no grilling)
- [x] Gate completo verde: `npm run build && npm run lint && npx vitest run`
      (build ok, oxlint ok, 229/229 vitest)
