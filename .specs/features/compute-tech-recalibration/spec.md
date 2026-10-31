---
status: ready-for-agent
---

# Recalibração e extensão do catálogo de tecnologias de compute

## Problem Statement

O seletor de tecnologia (`tech-selector`, AD-014–AD-017) já cobre `service` e
`worker` com cinco presets de compute (`spring-mvc`, `nodejs`,
`spring-webflux`, `quarkus-native`, `go`). Dois problemas motivam esta feature:

1. **Cobertura incompleta**: o catálogo não tem nenhuma opção para Quarkus em
   modo JVM (distinto do `quarkus-native` já existente) nem para C#/.NET —
   duas pilhas comuns em desenho de sistemas que o aluno pode querer modelar.
2. **Números desalinhados com benchmark real**: pesquisa (ver AD-061 em
   `.specs/STATE.md`) mostrou que o espaçamento de `quarkus-native` e `go`
   no catálogo atual não tem lastro em benchmark de mesma metodologia. A
   razão medida Go/Node com Postgres real e pool de conexão é ~1,9x, não os
   3,33x do catálogo; a razão Quarkus/Spring Boot em teste de leitura de
   banco é ~1,2–1,45x, não os 6x que `quarkus-native` tinha sobre
   `spring-mvc`. Um aluno que compara essas tecnologias no simulador estaria
   aprendendo uma proporção inflada em relação ao que dados públicos indicam.

## Solution

Do ponto de vista do usuário: ao selecionar tecnologia num componente
`service` ou `worker`, o seletor passa a oferecer também "Quarkus JVM" e
".NET". Escolher qualquer uma aplica capacity/latência realistas, do mesmo
jeito que as cinco tecnologias já existentes (mecanismo do AD-016, inalterado).
Além disso, os valores de "Quarkus native" e "Go" mudam para refletir melhor
a proporção observada em benchmarks reais com I/O de banco — sem alterar o
mecanismo, a UI, ou o comportamento de nenhuma outra tecnologia.

## User Stories

1. Como aluno de system design, quero escolher "Quarkus JVM" num service,
   para modelar uma API Java que roda em modo JVM tradicional (não
   compilação nativa), com capacidade e latência realistas.
2. Como aluno, quero escolher ".NET" num service ou worker, para modelar uma
   API C#/ASP.NET Core com Entity Framework Core, na mesma liga de throughput
   de um Spring MVC equivalente (mesmo domínio de ORM-bound I/O).
3. Como aluno, quero que "Quarkus JVM" e "Quarkus native" apareçam como
   opções distintas no mesmo seletor, para comparar o trade-off real entre os
   dois modos — inclusive a contraintuição de que o modo JVM sustenta
   throughput ligeiramente maior que o native sob carga, mesmo o native
   tendo startup/memória menores (não modelados aqui).
4. Como aluno que já tinha designs salvos usando "Quarkus native" ou "Go",
   quero que, ao reabrir esses designs, os números de capacity/latência sejam
   os recalibrados (o preset governa, não o arquivo — AD-017), para que a
   lição fique consistente mesmo em designs antigos.
5. Como aluno, quero comparar "Go" e ".NET"/"Quarkus JVM" na mesma topologia,
   para ver como a escolha de linguagem/runtime muda o gargalo, com números
   que refletem melhor a proporção real entre essas pilhas do que a versão
   anterior do catálogo.
6. Como aluno que exporta um design com "Quarkus JVM" ou ".NET" escolhidos,
   quero que a tecnologia viaje no JSON exportado, para compartilhar o design
   com outra pessoa (mecanismo já existente do AD-015, sem mudança).
7. Como aluno, quero que a IA avaliadora saiba que escolhi "Quarkus JVM" ou
   ".NET", para receber crítica sobre a adequação da escolha (mecanismo já
   existente, `tech` já viaja no payload de avaliação).
8. Como desenvolvedor lendo `.specs/STATE.md`, quero que a recalibração e sua
   justificativa (fontes, razões medidas, o porquê da inversão JVM > native)
   fiquem registradas como ADR, para entender a decisão sem precisar refazer
   a pesquisa.

## Implementation Decisions

Referência: `AD-061` em `.specs/STATE.md` (contém o racional completo e as
fontes de benchmark usadas). Mecanismo de tech em si (`AD-015`, `AD-016`,
`AD-017`) não muda — esta feature é extensão e correção de **dados** dentro
do `TECH_PRESETS`/`COMPUTE_PRESETS` já existente em `catalog.ts`, tocando
apenas a constante `COMPUTE_PRESETS` usada por `service` e `worker`.

**Presets novos:**

| id | label | capacity | baseLatencyMs |
| --- | --- | ---: | ---: |
| `quarkus-jvm` | Quarkus JVM | 650 | 17 |
| `dotnet` | .NET | 500 | 20 |

**Presets recalibrados** (mesmo id e label, capacity/baseLatencyMs mudam):

| id | capacity antiga → nova | baseLatencyMs antiga → nova |
| --- | --- | --- |
| `quarkus-native` | 3.000 → 520 | 10 → 19 |
| `go` | 5.000 → 3.000 | 10 → 10 (inalterada — sem base de benchmark específica para latência) |

**Presets inalterados**: `spring-mvc` (500/20), `nodejs` (1.500/15),
`spring-webflux` (2.000/15).

**Invariante preservada**: dentro de `COMPUTE_PRESETS`, capacity maior
implica `baseLatencyMs` igual ou menor (a mesma relação já presente nos
cinco presets originais). Com os valores acima, a ordem por capacity fica:
`spring-mvc`/`dotnet` (500) < `quarkus-native` (520) < `quarkus-jvm` (650) <
`nodejs` (1.500) < `spring-webflux` (2.000) < `go` (3.000), com latência não
crescente nessa mesma ordem (20, 20, 19, 17, 15, 15, 10).

**Ordem no seletor**: os dois presets novos entram no array `COMPUTE_PRESETS`
na posição que mantém essa ordem de capacity crescente (mesma convenção já
usada pelos presets existentes, que já estão em ordem de capacity).

Nenhuma mudança em `DesignNode`, `Design.schema`, `loadDesign`, `importJson`,
`PropertiesPanel` ou `ComponentNode` — todos já iteram sobre
`techPresetsFor(type)` genericamente (sem código por tecnologia), então dois
presets a mais e dois valores recalibrados fluem por eles sem alteração.
`tick.ts` não é tocado: `tech` só afeta `capacity`/`baseLatencyMs` via preset,
e a engine já consome esses dois campos.

## Testing Decisions

Um bom teste aqui verifica os dados do catálogo como dados (existência e
valores exatos dos presets), não detalhes internos — mesmo padrão já usado em
`catalog.test.ts` para os presets de `queue`/`nosql`/`sql`/compute existentes
(seam usada pelo `tech-selector`, T2/T3 de `.specs/features/tech-selector/`).

- **`catalog.test.ts`** — único módulo tocado por teste:
  - O array de ids de `techPresetsFor("service")` (e o espelho em `"worker"`)
    passa a incluir `quarkus-jvm` e `dotnet` na posição correta por ordem de
    capacity.
  - `findTechPreset("service", "quarkus-jvm")` e
    `findTechPreset("service", "dotnet")` retornam os valores exatos da
    tabela acima.
  - `findTechPreset("service", "quarkus-native")` e
    `findTechPreset("service", "go")` refletem os valores recalibrados (não
    mais 3.000/10 e 5.000/10).
  - `service` e `worker` continuam compartilhando a mesma lista
    (`COMPUTE_PRESETS`), teste já existente sem mudança de asserção.
- Nenhum teste novo em `useAppStore.test.ts` ou `designStorage.test.ts` é
  necessário: nenhum deles fixa valores literais de `quarkus-native`/`go`
  (verificado — os testes de `applyTech`/`loadDesign` nesses arquivos usam
  `aurora`/`kafka` como representantes, não presets de compute), e o
  mecanismo de aplicar/normalizar tech já está coberto genericamente por eles.
- Gate completo: `npm run build && npm run lint && npx vitest run`.

## Out of Scope

| Item | Motivo |
| ---- | ------ |
| Recalibrar `spring-mvc`, `nodejs` ou `spring-webflux` | Sem evidência de benchmark que justifique mudança nesses três; `spring-mvc` é a âncora do AD-014 |
| Novo tipo de componente ou mudança de UI | `PropertiesPanel`/`ComponentNode` já são genéricos sobre `TECH_PRESETS`; esta feature é só dado |
| Presets de Quarkus com Virtual Threads como terceira variante | Fora do pedido original (JVM clássico + native); Virtual Threads é uma terceira configuração que não foi pedida |
| Modelar diferença de startup/memória entre `quarkus-jvm` e `quarkus-native` | O simulador não modela cold start nem footprint de memória — só capacity/latência em regime sustentado |
| Editar presets pela UI | Presets seguem constante de código, como todo o resto do catálogo |

## Further Notes

A recalibração de `quarkus-native` e `go` é uma correção retroativa, não
aditiva: designs salvos que já usam essas tecnologias mudam de comportamento
ao recarregar, porque `loadDesign` sempre re-semeia capacity/latência da
tech conhecida (AD-017) — o arquivo nunca manda. Isso é o comportamento
correto e esperado do mecanismo existente, não uma regressão desta feature.
