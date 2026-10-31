# Replicas + Mix Leitura/Escrita Validation

**Date**: 2026-07-17  
**Spec**: `.specs/features/replicas-rw-mix/spec.md`  
**Diff range**: `82ad7ff^..HEAD`  
**Verifier**: independent sub-agent (author != verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T13 | ✅ Done | All marked complete in `tasks.md`; commits are present in the reviewed range. |
| T14 | ✅ Done | Playwright UAT recorded as passed; script and screenshot are present in `/tmp`. |

## Spec-Anchored Acceptance Criteria

| Requirement | Spec-defined outcome | `file:line` + assertion | Result |
| ----------- | -------------------- | ----------------------- | ------ |
| R1 | Replicas are integer 1-20, default 1, and capacity is per replica for service/worker/cache/sql/nosql. | `src/engine/catalog.test.ts:27-32` — `expect(DEFAULT_PARAMS.<type>).toEqual(... replicas: 1 ...)`; `src/engine/catalog.test.ts:42-43` — limits equal `{ min: 1, max: 20 }`; `src/engine/tick.test.ts:400-405` — three replicas reduced to two process exactly 200 at capacity 100. | ✅ PASS |
| R2 | Effective capacity and utilization use live replicas. | `src/engine/tick.test.ts:400-405` — after the transition `aliveReplicas` is 2, utilization is 2.4, and processed RPS is 200. | ✅ PASS |
| R3 | `>150%` for 30 ticks removes one replica; `<50%` for 50 ticks restores one; one replica retains the prior boundaries. | `src/engine/tick.test.ts:282-289` — exactly 30 ticks yields `down`; `src/engine/tick.test.ts:306-310` — exactly 1.5 does not accumulate; `src/engine/tick.test.ts:387-423` — a 3-replica service loses then restores exactly one per window. | ✅ PASS |
| R4 | Queue drain uses consumer effective capacity. | `src/engine/tick.test.ts:426-452` — after worker loss from 3 to 2 replicas, its incoming drained work is exactly 400 (`2 × 100` from two queues). | ✅ PASS |
| R5 | A global 0-100 write control defaults to 20 and the engine propagates read/write flows through client, generic nodes, LB and fan-out. | `src/store/useAppStore.test.ts:216-223` — default 20 and clamps 0/100; `src/engine/tick.test.ts:650-662` — 1000 at 20% is exactly 800 read/200 write; `src/engine/tick.test.ts:685-708` — LB gives each target 400/100; `src/engine/tick.test.ts:711-729` — fan-out duplicates 300/200. | ✅ PASS |
| R6 | Cache/CDN hit ratio only reduces reads; writes pass downstream unchanged. | `src/engine/tick.test.ts:748-751` — cache hit 80% with 20% writes sends exactly 160 reads and 200 writes downstream. | ✅ PASS |
| R7 | SQL read ceiling is `capacity × live replicas`; write ceiling is one primary; utilization is max(W,R). | `src/engine/tick.test.ts:808-824` — at 2500 RPS successes are 2000 read/500 write and utilization W/R is 1/0.8; at 3000 only 100 writes fail and utilization is 1.2. | ✅ PASS |
| R8 | NoSQL write ceiling is `capacity × shards`; read ceiling also multiplies live replicas; utilization is max(W,R). | `src/engine/tick.test.ts:846-861` — 500 capacity, 4 shards, 5 replicas at 10000 RPS succeeds as exactly 8000 read/2000 write with W/R utilization 1/0.8. | ✅ PASS |
| R9 | Overflow becomes an error in the same flow and each flow is conserved. | `src/engine/tick.test.ts:673-682` — generic node asserts read and write incoming equal success + error; `src/engine/tick.test.ts:825-830` and `856-861` assert the same for SQL/NoSQL. | ✅ PASS |
| R10 | Replicable-node badge shows `xN`; partial degradation shows `alive/N` with alert styling. | `/tmp/playwright-test-replicas-rw-mix.js:60-66` — `expectText(..., "x3")` then exact `"2/3"`; its assertion throws on mismatch at `:85-89`. UAT is recorded passed in `tasks.md:356-361`. | ✅ PASS |
| R11 | Node metrics expose aggregate utilization and live/total replicas; databases display W/R utilization. | `src/engine/tick.test.ts:400-404` — exact live/total/utilization metrics; `/tmp/playwright-test-replicas-rw-mix.js:80-81` — exact `"W 100% | R 80%"` assertion, recorded passed. | ✅ PASS |
| R12 | Properties UI edits replicas and NoSQL shards; values are limited to valid integers. | `src/store/useAppStore.test.ts:120-139` — fractional values return `"Valor deve ser um numero inteiro"` without changes and valid 5/4 values are retained; `/tmp/playwright-test-replicas-rw-mix.js:60,73-76,100-101` drives the labeled fields in UAT. | ✅ PASS |
| R13 | `replicas`/`shards` persist optionally; legacy designs load using defaults; import rejects out-of-range/noninteger values. | `src/persistence/designStorage.test.ts:91-100` — round trip equals the scaled design; `:103-115` — legacy import succeeds; `:118-126` — 0, 21, and 2.5 return exact invalid-parameter error. Engine fallback is `src/engine/tick.ts:92-95` (`?? 1`). | ✅ PASS |
| R14 | AI evaluation payload includes the new parameters and global mix. | `src/evaluation/openRouter.test.ts:75-78,94-96` — passes 1500/35 and asserts exact `"Carga da simulacao: 1500 RPS, 35% escritas"`. | ✅ PASS |

**Status**: ✅ 14/14 requirements have spec-matched evidence. No spec-precision gaps.

## Edge Cases

- [x] Exact health thresholds: 1.5 does not trigger overload accumulation (`src/engine/tick.test.ts:306-310`); recovery occurs on tick 50 (`:325-351`).
- [x] Legacy persistence omits both new fields and remains importable (`src/persistence/designStorage.test.ts:103-115`).
- [x] Zero/full write input clamps to 0/100 (`src/store/useAppStore.test.ts:220-223`).
- [x] Per-flow queue depth remains equal to its read + write components over multiple ticks (`src/engine/tick.test.ts:231-255`).

## Discrimination Sensor

Scratch worktree: `/tmp/replicas-rw-mix-verifier-wt` (created from `HEAD`, then removed). Targeted test command: `npx vitest run src/engine/tick.test.ts`.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `src/engine/tick.ts:174` | Changed cache write forwarding from `successF.write` to `0`. | ✅ Killed — `tick.test.ts:750` expected 200 writes, received 0. |
| 2 | `src/engine/tick.ts:122` | Changed database write capacity to `0`. | ✅ Killed — including SQL exact primary-capacity assertion at `tick.test.ts:810` (expected 500, received 0). |
| 3 | `src/engine/tick.ts:46` | Changed overload boundary from `>` to `>=`. | ✅ Killed — `tick.test.ts:309` expected `overloaded` at exactly 1.5, received `down`. |

**Sensor depth**: lightweight  
**Result**: ✅ 3/3 killed, 0 survived.

## Interactive UAT Results

| # | Test | Result | Details |
| - | ---- | ------ | ------- |
| 1 | Replica badge and degradation spiral | ✅ Pass | Provided Playwright result; script asserts `x3` then `2/3` at `/tmp/playwright-test-replicas-rw-mix.js:60-66`. |
| 2 | SQL write bottleneck with read replicas | ✅ Pass | Script asserts W/R metric and `Sucesso 99.9%` at `:76-81,99`. |
| 3 | NoSQL shard scaling | ✅ Pass | Script sets 4 shards and asserts `Sucesso 100.0%` at `:100-101`. Screenshot: `/tmp/replicas-rw-mix-uat.png`. |

## Gate Check

- **Gate command**: `npm run build && npm run lint && npx vitest run`
- **Result**: ✅ build passed; lint passed; 101 tests passed, 0 failed, 0 skipped (7 files).
- **Test count before feature**: 73 (sum of test cases in the six pre-feature test files at `82ad7ff^`).
- **Test count after feature**: 101.
- **Delta**: +28 tests.
- **Skipped tests**: none.
- **Failures**: none.

## Code Quality

| Check | Result |
| ----- | ------ |
| No features beyond requested scope | ✅ Diff is limited to dual-flow/replicas, UI, persistence, evaluation, and feature tracking. |
| No single-use abstraction or unnecessary flexibility | ✅ `flow.ts` centralizes the repeated two-field arithmetic; no unrelated abstraction added. |
| Surgical changes and existing patterns | ✅ Existing tick, catalog, store, validation, and component patterns are retained. |
| Tests map to requirements and assert outcomes | ✅ Requirement table above supplies evidence-or-zero traceability for R1-R14. |
| Per-layer coverage expectation | ✅ Engine R1-R9, store R5/R12, persistence R13, evaluation R14 have unit coverage; UI has recorded Playwright UAT per `tasks.md`. |
| Project guidelines | ✅ `AGENTS.md`: incremental validation, no unrelated changes, and full gate followed. |

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 14/14 requirements matched exact outcomes; 0 spec-precision gaps.  
**Sensor**: 3/3 mutations killed.  
**Gate**: 101 passed, 0 failed.

No lessons were created because this is a clean PASS with no validation signal.
