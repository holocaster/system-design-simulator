# Simulator MVP Validation

**Date**: 2026-07-17
**Spec**: `.specs/features/simulator-mvp/spec.md`
**Implementation range**: root commit `729d571` through `39f91d9` (HEAD)
**Verifier**: independent sub-agent (author != verifier)
**Verdict**: FAIL

## Scope and task completion

- T1-T22 have implementation commits and are marked DONE in `tasks.md`.
- The real tree was read-only during verification except for this report. Existing dirty changes in `.specs/STATE.md`, spec/design/tasks and `README.md` were preserved.
- Feature surface: 29 implementation/test files after the root scaffold; 3,064 inserted lines and 14 deleted lines relative to `729d571`.

## Spec-anchored acceptance criteria

Evidence-or-zero is applied below. `/tmp/playwright-test-simulator-mvp-full.js` was inspected line-by-line; the orchestrator reported its latest run as 18/18 PASS. Its screenshot was also inspected. A verifier-local rerun was blocked by the sandbox while launching Chromium (`SIGTRAP`), so browser evidence is identified explicitly.

### P1 - Canvas

| AC | Spec outcome | Evidence (`file:line` + assertion) | Result |
| --- | --- | --- | --- |
| 1 | Drop creates the chosen type at the dropped position | `/tmp/playwright-test-simulator-mvp-full.js:115-122` — node count `=== 6` and x/y distance `< 25` | PASS |
| 2 | Connecting output to input creates a visible edge | `/tmp/playwright-test-simulator-mvp-full.js:33-58,124-129` — edge count equals expected after every connection | PASS |
| 3 | Invalid matrix connection is rejected and reason shown | `/tmp/playwright-test-simulator-mvp-full.js:131-135` — edge count remains 5 and status matches matrix/cycle reasons | PRECISION GAP: exact visual/message contract is unspecified |
| 4 | Selected node shows base fields and type-specific fields | `/tmp/playwright-test-simulator-mvp-full.js:139-142` asserts Service fields only; no assertion for Cache/CDN hit ratio or Queue buffer | GAP |
| 5 | Out-of-range edit is blocked and limit shown | `src/store/useAppStore.test.ts:38-49` — exact error and stored capacity unchanged; UAT `:143-149` asserts visible limit | PASS |
| 6 | Deleting a node removes all incident edges | `src/store/useAppStore.test.ts:115-130` and UAT `:253-260` — node/edge counts and continued running state | PASS |

### P1 - Simulation

| AC | Spec outcome | Evidence (`file:line` + assertion) | Result |
| --- | --- | --- | --- |
| 1 | Valid start animates traffic from Client | UAT `:151-160` — `animateMotion.length > 0` after start | PRECISION GAP: direction/density/observable animation contract is unspecified |
| 2 | Slider 1..100,000 recalculates on the next tick without restart | `src/store/useAppStore.test.ts:133-141` asserts bounds; UAT `:162-170` asserts still running and eventual metric change, but not the next 100 ms tick | GAP |
| 3 | Every component displays utilization, throughput, latency and error | UAT `:155-159` asserts four labels for one Service only | GAP |
| 4 | Global critical-path latency and total success are displayed | `src/engine/tick.test.ts:391-392` asserts `0.75` and `102`; UAT `:154` asserts displayed `Latencia 102 ms`, but displayed success/total are not asserted | GAP |
| 5 | Cache propagates misses only | `src/engine/tick.test.ts:74-92` — 0% hit sends 300; 100% hit sends 0 | PASS |
| 6 | Stop freezes animation and clears metrics | `src/store/useAppStore.test.ts:97-112`; UAT `:215-218` — no animation and RPS 0 | PASS |
| 7 | Missing connected Client shows clear message and does not start | `src/store/useAppStore.test.ts:72-94`; UAT `:101-105` | PRECISION GAP: “mensagem clara” has no exact text contract |
| 8 | Base errors combine with overload and affect global success | `src/engine/tick.test.ts:56-71,125-139,395-408,473-483` — exact local errors, conservation and global ratios | PASS |

### P2 - Degradation and failure

| AC | Spec outcome | Evidence (`file:line` + assertion) | Result |
| --- | --- | --- | --- |
| 1 | Below 70% is healthy/green | `src/engine/tick.test.ts:228-234`; UAT `:155-156` asserts green at 33% | PASS |
| 2 | 70%-100% is yellow and latency grows | `src/engine/tick.test.ts:231-232,349-352`; UAT `:162-170` | PASS |
| 3 | Above 100% is red and excess fails | `src/engine/tick.test.ts:125-139,233`; UAT `:172-179` | PASS |
| 4 | Above 150% for more than 3 seconds becomes down | `src/engine/tick.test.ts:236-257` asserts down on tick 30; `src/engine/tick.ts:5,45-46` implements 30 x 100 ms = exactly 3.0 s | FAIL: spec says **more than** 3 seconds |
| 5 | Down node below 50% for 5 seconds recovers | `src/engine/tick.test.ts:279-305` — tick 49 down, tick 50 healthy and propagating | PASS |
| 6 | Downstream gets zero; upstream records failures | `src/engine/tick.test.ts:245-257,267-276,425-427` | PASS |
| 7 | LB excludes down destinations | `src/engine/tick.test.ts:318-336`; UAT `:181-195` | PASS |

### P2 - Persistence

| AC | Spec outcome | Evidence (`file:line` + assertion) | Result |
| --- | --- | --- | --- |
| 1 | Save by name overwrites | `src/persistence/designStorage.test.ts:61-68` | PASS |
| 2 | List, load and delete | `src/persistence/designStorage.test.ts:70-80`; UAT `:235-268` | PASS |
| 3 | Export downloads complete JSON | `src/persistence/designStorage.test.ts:82-84`; UAT `:225-233` | PASS |
| 4 | Valid JSON import restores the canvas | Unit assertion at `src/persistence/designStorage.test.ts:86-88` covers parsing only; UAT reloads saved data and tests only invalid file import | GAP |
| 5 | Invalid/unknown JSON is rejected and canvas remains intact | `src/persistence/designStorage.test.ts:90-127`; UAT `:243-250` | PRECISION GAP: exact “clear” message contract is unspecified |
| 6 | localStorage failure informs user without losing in-memory design | `src/persistence/designStorage.test.ts:130-141` asserts returned error and unchanged value; no UI assertion that the error is displayed | GAP |

### P3 - AI evaluation

| AC | Spec outcome | Evidence (`file:line` + assertion) | Result |
| --- | --- | --- | --- |
| 1 | Key is stored only in localStorage | UAT `:270-277` asserts storage; repository key-pattern scan found no embedded key | PASS |
| 2 | Send design+metrics and display Portuguese feedback | `src/evaluation/anthropic.test.ts:80-105` asserts mock payload and returned Portuguese text; no successful API/UI display assertion or real successful call | GAP |
| 3 | Auth/network/timeout errors are clear and preserve design | `src/evaluation/anthropic.test.ts:116-137`; UAT `:279-285` asserts network message and unchanged node count | PASS |
| 4 | Missing key opens settings | UAT `:270-277` | PASS |
| 5 | At least two selectable challenges affect the prompt | `src/evaluation/anthropic.test.ts:99-113` covers challenge data/prompt; no browser assertion that changing the selection changes the outgoing request | GAP |

**AC summary**: 19 PASS, 9 GAP/FAIL, 4 SPEC-PRECISION GAP (32 total).

## Edge cases

| Edge case | Evidence | Result |
| --- | --- | --- |
| Empty canvas start gives orientation | UAT `:101-105` | PASS |
| Cycle-closing connection rejected | `src/engine/graph.test.ts:74-83`; UAT `:131-135` | PASS |
| Unreachable node remains at 0 RPS | `src/engine/tick.test.ts:111-123` | PASS |
| Delete during simulation continues next flow | UAT `:253-260` | PASS |
| Multiple Clients sum load | `src/engine/tick.test.ts:94-109` | PASS |

## Gate and test integrity

- Official Full gate: `rtk npm run build && rtk npx vitest run`
- Result: exit 0; build succeeded; 6 test files, 63 passed, 0 failed, 0 skipped.
- Before feature: 0 tests in root scaffold `729d571`; after: 63; delta: +63.
- No skip/todo markers found. `git diff --check 729d571 HEAD` passed.
- Build warnings: Anthropic SDK Node credential modules externalized for browser; output chunk 549.69 kB (>500 kB).
- `npm run lint`: exit 0 with one Fast Refresh warning at `src/components/ComponentNode.tsx:7`.

## Discrimination sensor

Scratch copy: `/tmp/simulator-mvp-verifier.48ieoY`; baseline 63/63. The real tree was never mutated.

| Mutation | Behavioral fault | Result |
| --- | --- | --- |
| M1 | Down threshold 30 -> 31 ticks (`tick.ts:5`) | KILLED: 7/27 targeted tests failed |
| M2 | Effective upstream error replaced by local error (`tick.ts:160`) | KILLED: assertion `tick.test.ts:426` failed |
| M3 | LB critical latency changed from max to average (`tick.ts:142`) | KILLED: assertion `tick.test.ts:392` received 57 instead of 102 |

After restoration: 63/63 passed; scratch and real `tick.ts` SHA-256 both `b12f06f60bd2a489aa509925863ecb3423a53df5d4df15fe241f5822aebac7b3`. Sensor result: 3/3 killed.

## Code quality and risks

| Check | Result |
| --- | --- |
| Minimum/surgical implementation and no unrelated code refactor | PASS |
| Matches repository style and build/lint gates | PASS with one lint warning |
| Spec-anchored values | FAIL: duration mismatch and uncovered conjuncts |
| Per-layer coverage | FAIL: business modules are unit-tested, but several user-visible UI branches have no executable assertions |
| Tests claimed by AC/edge/task done-when | PASS |
| Guidelines | `AGENTS.md` instructions and `tasks.md` coverage matrix applied |

Residual risks: no successful real Anthropic request; no timed proof of the “5 components in under 2 minutes” success criterion; browser bundle warning; React 19 implementation differs from React 18 stated in `design.md`.

## Ranked gaps / fix tasks

1. **Major** — Align P2 degradation AC4: either change the threshold to strictly after 3 seconds or clarify the spec boundary, then assert tick 30 and tick 31.
2. **Major** — Add a successful AI evaluation test through `EvaluationPanel` proving design+metrics request and visible Portuguese feedback; real API success remains unverified.
3. **Major** — Add browser assertions for Simulation AC2-AC4: next-tick update, all node metric fields across component types, and all global displayed values.
4. **Major** — Add type-specific property assertions for Cache/CDN hit ratio and Queue buffer (Canvas AC4).
5. **Major** — Add end-to-end valid-file import assertion restoring canvas nodes, edges, positions and parameters (Persistence AC4).
6. **Minor** — Exercise localStorage failure through the dialog and assert visible error plus unchanged canvas (Persistence AC6).
7. **Minor** — Change the selected challenge in UI and assert the outgoing prompt/request contains that challenge (AI AC5).
8. **Minor** — Make vague visual/message outcomes precise in the spec or define stable semantic assertions for them.
9. **Minor** — Measure the under-two-minute success criterion; it currently has no timed evidence.

## Lessons handling

Validation produced `ac_gap` and `spec_precision_gap` signals, but `scripts/lessons.py` is not available. Per verifier write restrictions, no lesson files were created or edited. The orchestrator should persist lessons through the project-approved mechanism if desired.

## Summary

The build, 63 tests, five edge cases, and 3/3 mutation sensor are healthy. The feature is **not ready to be marked fully verified** because one acceptance boundary contradicts the implementation and several UI/AI conjuncts lack evidence-or-zero. No implementation or tests were changed.
