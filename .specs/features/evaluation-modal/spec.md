# Feature: evaluation-modal

## Objetivo

A resposta da avaliação por IA é longa (markdown) e não cabe no painel lateral
estreito, ficando cortada. Mostrar em uma modal ampla e rolável.

## Decisões

- A avaliação abre em modal ao terminar; o texto fica guardado no estado. Ao
  fechar, o painel mostra um botão "Ver avaliação" que reabre a modal, evitando
  re-chamar a IA só para reler.
- Texto renderizado como puro com `white-space: pre-wrap` (sem lib de markdown);
  resolve o corte sem adicionar dependência. Markdown de verdade fica para
  depois se incomodar.
- Modal reusa o padrão existente `.save-dialog-backdrop` / `.save-dialog`
  (mesma convenção de `SettingsDialog`), com largura maior e corpo rolável.

## Arquivos

- `src/components/EvaluationModal.tsx`: componente de exibição (open, feedback,
  onClose).
- `src/components/EvaluationPanel.tsx`: estado `modalOpen`, abre ao concluir,
  botão "Ver avaliação".
- `src/components/components.css`: `.evaluation-modal`, `.evaluation-modal-body`.

## Critérios de aceitação

- AC1: concluída a avaliação, a modal abre automaticamente com o texto completo.
- AC2: fechar a modal preserva a avaliação; "Ver avaliação" reabre sem custo de
  API.
- AC3: corpo rolável, texto selecionável, quebras preservadas.

## Fora de escopo

- Renderização de markdown, cópia com botão, histórico de avaliações.
