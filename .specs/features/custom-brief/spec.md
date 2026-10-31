# Custom Brief - Especificação

## Problem Statement

A avaliação por IA só aceita dois enunciados fixos (`url-shortener`, `news-feed`), ambos padrões clássicos de entrevista. Quem projeta qualquer outro sistema não tem onde dizer à IA o que o sistema faz — e o prompt, que hoje pede avaliação "como em uma entrevista técnica", empurra o modelo a cobrar componentes de arquiteturas de referência que os requisitos reais não justificam. O simulador serve para desenhar sistemas livres, mas a avaliação só sabe julgar os dois padrões que conhece.

## Goals

- [ ] Usuário descreve o próprio sistema em texto livre e a IA avalia contra essa descrição
- [ ] O enunciado viaja junto com o design: salvo, exportado e importado
- [ ] A IA para de cobrar componentes que os requisitos declarados não pedem
- [ ] Os presets continuam disponíveis como atalho, sem regressão
- [ ] Strings em português passam a ter acentuação correta
- [ ] ADRs refletem o estado real do projeto

## Out of Scope

| Feature | Motivo |
| ------- | ------ |
| Editar ou criar presets pela UI | Presets seguem sendo constante de código; o texto livre já cobre o caso |
| Brief por componente | O enunciado descreve o sistema inteiro; granularidade por nó é outra feature |
| Histórico de avaliações | Não existe hoje e não é pré-requisito do brief |
| Testes de componente React | O projeto não tem essa infraestrutura; introduzi-la aqui seria escopo escondido |
| Confirmação no botão "Excluir" | Levantado durante o desenho e deliberadamente deixado como está |
| Migrar de volta para a API Anthropic | `AD-013` registra a escolha por OpenRouter; nada muda no cliente |

## Requirements

### Incremento 1: Acentuação

- R1: Todas as strings em português no código (UI, mensagens de erro, mensagens de status) usam acentuação correta. Nenhuma lógica muda. Os asserts que hoje afirmam strings sem acento são atualizados junto — no mínimo `designStorage.test.ts:207` (`"Nao foi possivel salvar o design"`) e `useAppStore.test.ts:59` (`"Nome nao pode ser vazio"`)

### Incremento 2: Brief customizado

**Modelo**

- R2: `Design` ganha `challengeId?: string` e `brief?: string`. O `schema` permanece `1`: os campos são opcionais e aditivos, então designs já salvos carregam sem migração
- R3: `EvaluationChallenge` passa de `{ id, name, requirements }` para `{ id, name, brief }`. O `name` é rótulo de UI; o `brief` é o texto enviado à IA e incorpora em prosa o domínio que o `name` carregava (ex.: `"Encurtador de URLs. Suportar 10.000 RPS."`)

**Interface**

- R4: O seletor de desafio ganha a opção "Personalizado" (`challengeId === "custom"`), que revela um textarea com `maxLength` de 2000 e um placeholder de exemplo cobrindo domínio, números de carga e restrição de consistência
- R5: Seleção e texto vivem no store, não em estado local do componente — caso contrário não sobrevivem ao carregamento de um design
- R6: O botão "Avaliar design" fica desabilitado quando "Personalizado" está selecionado e o textarea está vazio

**Avaliação**

- R7: `buildPrompt` recebe um **brief resolvido** (string): `preset.brief` quando um preset está selecionado, `design.brief` quando o selecionado é `"custom"`. O desafio deixa de ser serializado com `JSON.stringify` dentro do prompt
- R8: O prompt é reescrito para todos os desafios, ancorando a crítica nos requisitos declarados em vez de arquiteturas de referência, e instruindo a IA a não cobrar componentes que os requisitos não justificam

**Persistência**

- R9: `currentDesign()` inclui `brief` e `challengeId`; `loadDesign()` os restaura
- R10: `importJson` valida os campos novos: `brief` string de no máximo 2000 caracteres, `challengeId` string. Tipos inválidos ou brief acima do teto rejeitam o import, no padrão do validador existente
- R11: Design com `challengeId` que não existe em `CHALLENGES` **carrega normalmente** e exibe aviso ("Desafio desconhecido, usando o padrão"). Falhar o import inteiro por causa de um rótulo de dropdown seria desproporcional, e o `brief` — que é o conteúdo que importa — sobrevive por ser campo separado

**Prompt**

- R14: A seção "Design completo" do prompt serializa **somente a arquitetura** (`schema`, `nodes`, `edges`), excluindo `brief` e `challengeId`. Como `currentDesign()` passou a incluir esses campos, serializar o `Design` inteiro colocaria um segundo enunciado no prompt — possivelmente contraditório com o brief resolvido, já que o `brief` é preservado ao trocar para um preset (R2). Requisito descoberto na verificação do T3, não no planejamento inicial

### Incremento 3: ADRs

- R12: `.specs/STATE.md` registra `AD-011` (acentuação pt-BR), `AD-012` (brief no `Design`, presets como brief enlatado) e `AD-013` (avaliação via OpenRouter, com racional: permite testar vários modelos, não só os da Anthropic; data 2026-07-17, commit `ca57870`)
- R13: `AD-004` e `AD-007` são marcados como **superados por `AD-013`**, não apagados — ADR é registro histórico e apagar destrói o porquê

## Assumptions & Open Questions

- O sentinela para o desafio customizado é a string `"custom"`
- O teto de 2000 caracteres é aplicado tanto no `maxLength` do textarea quanto na validação de import, para que o limite apareça ao digitar e não como erro surpresa
- `challengeId` não é validado contra a lista de presets na importação (só o tipo); a resolução de um id desconhecido acontece na exibição
- O mix de leitura/escrita e o RPS continuam fora do `Design` — são controles de simulação, não de arquitetura (coerente com `replicas-rw-mix`)

## Impacto na qualidade da avaliação (racional)

O ganho não vem só do campo novo, mas da combinação dele com R8. Hoje o prompt pede avaliação "como em uma entrevista técnica", o que faz o modelo comparar o desenho contra o repertório canônico — cobrando rate limiter, consistent hashing ou CDN mesmo quando o enunciado não pede nada disso.

Com o brief livre e o prompt ancorado, a mesma IA passa a julgar contra o que o sistema precisa fazer. Um sistema de reservas que não pode gerar overbooking recebe crítica sobre consistência e concorrência; um feed que tolera atraso recebe crítica sobre cache e leitura. Os presets também melhoram, porque param de ser avaliados contra uma arquitetura de referência implícita e passam a ser avaliados contra o próprio enunciado.
