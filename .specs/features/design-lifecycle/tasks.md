# Identidade e Ciclo de Vida do System Design — Tasks

**Spec:** `.specs/features/design-lifecycle/spec.md`
**ADRs:** AD-033 a AD-053 em `.specs/STATE.md`

> Este arquivo em `.specs` é a fonte de verdade para o status, os critérios de
> aceite e os commits desta feature. Arquivos de planejamento em `.scratch` não
> devem ser usados como acompanhamento canônico.

## T1 — Criar e salvar um System Design identificável

**Status:** concluído em `7086142`

- [x] `Design` possui `id` obrigatório e nome opcional.
- [x] A entidade recebe identidade antes do primeiro salvamento.
- [x] Persistência atualiza pelo `id`; o primeiro salvamento solicita nome.
- [x] Identidade, nome e histórico não entram no prompt de avaliação.
- [x] Cobertura unitária e smoke de primeiro salvamento.

## T2 — Proteger alterações e criar novo design

**Status:** concluído em `a6f4ecb`

- [x] Baseline derivado do conteúdo persistível e estado de alterações observável.
- [x] RPS, mix de escritas, métricas e execução não alteram o baseline.
- [x] Novo design restaura defaults e gera nova identidade.
- [x] Novo design protege alterações pendentes e saída/reload usa aviso nativo.

## T3 — Carregar designs sem perder trabalho

**Status:** concluído em `efde0cd`

- [x] Gerenciador identifica a entidade aberta.
- [x] Carregamento protegido por salvar, descartar ou cancelar.
- [x] Troca substitui a entidade e histórico, para a simulação e preserva RPS/mix.

## T4 — Renomear designs sem salvar conteúdo pendente

**Status:** concluído em `dd9f90a`

- [x] Renomeia por `id`, sem carregar a entidade.
- [x] Preserva conteúdo persistido e atualiza somente o nome.
- [x] Renomear o ativo atualiza somente a parte de nome do baseline.
- [x] Conflito de nome requer confirmação; o design aberto é protegido.

## T5 — Excluir cópias persistidas com segurança

**Status:** concluído em `bf36b80`

- [x] Exclusão requer confirmação explícita.
- [x] Excluir cópia não ativa não altera a entidade aberta.
- [x] Excluir o ativo preserva seu conteúdo em memória e o marca como não salvo.

## T6 — Importar e exportar entidades completas

**Status:** concluído em `93c7dee`

- [x] Exportação serializa a entidade atual, sem alterar baseline ou persistir localmente.
- [x] Importação exige a identidade do contrato atual e abre revisão não salva.
- [x] Importação com alterações pendentes usa salvar, descartar ou cancelar.
- [x] Testes de persistência/store e smoke Playwright do fluxo completo.
