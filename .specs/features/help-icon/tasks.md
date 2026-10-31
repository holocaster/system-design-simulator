# Ícone de Ajuda - Tickets

Spec: `.specs/features/help-icon/spec.md`
ADR: AD-058 em `.specs/STATE.md`

Caminho crítico: T1 → T2 → T3

---

# T1 — Módulo de storage "já visto"

**Status:** done

**Blocked by:** nada — pode começar imediatamente

**What to build**

Um módulo pequeno e puro, mirror direto de `src/theme/theme.ts`: funções livres
sobre uma chave dedicada do `localStorage` para saber se a ajuda já foi vista
neste navegador, e para marcá-la como vista. `storage?: Storage` injetável
para teste, mesma assinatura de `getTheme`/`saveTheme`. A escrita degrada sem
lançar se o storage falhar (mesma guarda de `saveTheme`) — é preferência de
exibição, não conteúdo do design.

Este ticket não toca em nenhum componente React ainda. O que se observa é o
comportamento do módulo isolado, testado por vitest com um `Storage` em
memória (mesmo padrão de `theme.test.ts`).

**Acceptance criteria**

- [x] Módulo exporta uma função para ler se a ajuda já foi vista (default:
      não vista, sem valor salvo)
- [x] Módulo exporta uma função para marcar a ajuda como vista
- [x] Ambas aceitam `storage?: Storage` injetável, mesma assinatura de
      `theme.ts`
- [x] Marcar como vista não lança quando o storage falha ao gravar
- [x] A chave usada não colide com `theme` nem com nenhuma chave existente
- [x] Nenhum campo novo em `Design`/`catalog.ts`/`types.ts`; nenhuma mudança
      em `designStorage.ts`
- [x] Teste unitário cobre: default não visto, leitura após marcar como
      visto, e que marcar não lança em falha de escrita
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde

---

# T2 — Modal de ajuda + ícone na ControlBar + auto-abertura na primeira visita

**Status:** done

**Blocked by:** T1

**What to build**

A feature ponta a ponta, visível para o usuário. Um ícone próprio na
`ControlBar`, ao lado do toggle de tema (fora dos grupos "Design" e
"Simulação" do AD-046), identificado por SVG inline com `aria-label`, sem
emoji. Clicar no ícone sempre abre a modal de ajuda.

Na montagem do app, se o módulo do T1 indicar que a ajuda ainda não foi vista,
a modal abre sozinha e a flag é marcada como vista naquele instante — não
quando o usuário fecha a modal. Em visitas seguintes (flag já marcada), a
modal não abre sozinha; só o ícone a abre, sob demanda.

A modal reusa o padrão visual `.save-dialog-backdrop`/`.save-dialog` já usado
por `SettingsDialog`, `SaveLoadDialog` e `EvaluationModal`, e fecha só pelo
botão "Fechar" (sem Esc, sem clique fora — nenhum diálogo do app faz isso
hoje).

Conteúdo, JSX estático (sem markdown), três blocos nesta ordem:

1. Fluxo básico de uso: arrastar um componente da paleta para o canvas,
   conectar componentes, ajustar carga (RPS) e percentual de escritas, iniciar
   a simulação.
2. Legenda das quatro cores de saúde do nó (saudável, degradado,
   sobrecarregado, inativo), cada uma com um swatch visual usando os tokens
   reais (`--color-health-ok/warn/bad/down`), sem token novo.
3. Nota sobre avaliação por IA: existe, fica atrás do botão "Configurar API",
   e a chave informada fica só no `localStorage` do próprio navegador.

Não menciona réplicas/autoscaling, seletor de tecnologia, tema, ou
salvar/exportar/importar.

**Acceptance criteria**

- [x] Um ícone de ajuda aparece na `ControlBar`, ao lado do toggle de tema
- [x] O ícone é identificado por SVG inline com `aria-label`, sem emoji
- [x] Clicar no ícone abre a modal de ajuda, a qualquer momento
- [x] Na primeira visita a este navegador (flag do T1 não marcada), a modal
      abre sozinha assim que o app carrega
- [x] A flag é marcada como vista no instante da auto-abertura, não no
      fechamento
- [x] Em visitas seguintes (flag já marcada), a modal não abre sozinha; só o
      ícone a abre
- [x] A modal reusa `.save-dialog-backdrop`/`.save-dialog`; fecha só pelo
      botão "Fechar"
- [x] O conteúdo cobre, nesta ordem: fluxo básico de uso, legenda de saúde com
      swatch visual por estado, nota de avaliação por IA (existência, botão
      "Configurar API", chave só no navegador)
- [x] O conteúdo não menciona réplicas/autoscaling, seletor de tecnologia,
      tema, ou salvar/exportar/importar
- [x] Fechar a modal não altera nenhum outro estado do app (design aberto,
      simulação rodando, tema)
- [x] Nenhum campo novo em `Design`; a flag não entra no export/import nem no
      prompt da IA avaliadora
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde; validação
      visual manual no navegador

---

# T3 — Caso ponta a ponta

**Status:** done

**Blocked by:** T2

**What to build**

Um caso Playwright cobrindo o fluxo completo da spec, escopo mínimo (AD-018):
primeira carga da página (sem flag) — a modal aparece sozinha; fecha pelo
botão "Fechar". Recarrega a página — a modal não aparece sozinha desta vez.
Clica no ícone de ajuda — a modal abre sob demanda; fecha de novo. Não
depende de nenhum design importado.

Nenhum teste de screenshot é adicionado (mesmo racional do AD-027).

**Acceptance criteria**

- [x] Um caso e2e afirma que a modal aparece sozinha na primeira carga da
      página
- [x] O caso fecha a modal pelo botão "Fechar"
- [x] O caso recarrega a página e afirma que a modal não aparece sozinha
      desta vez
- [x] O caso clica no ícone de ajuda e afirma que a modal abre sob demanda
- [x] Nenhum teste de screenshot é adicionado
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde, playwright
      verde
