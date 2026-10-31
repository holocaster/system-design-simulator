# Tema Escuro - Tickets

Spec: `.specs/features/dark-theme/spec.md`
ADR: AD-055, AD-056 em `.specs/STATE.md`

Caminho crítico: T1 → T2 → T3

---

# T1 — Toggle mecânico de tema

**Status:** done

**Blocked by:** nada — pode começar imediatamente

**What to build**

Um botão na `ControlBar`, fora dos grupos "Design" (AD-046) e dos controles de
simulação, que alterna entre tema claro e escuro. A escolha é aplicada como
atributo (`data-theme`) na raiz do documento, persiste em `localStorage` —
fora da entidade `Design` (AD-033, AD-055) — e sobrevive a recarregar a
página.

Este ticket não define nenhuma cor escura ainda. `tokens.css` continua sem
bloco de override; o que se observa é o atributo mudando no DOM e persistindo,
não uma mudança visual.

O botão é identificado por ícone SVG inline (sol/lua) com `aria-label`
indicando a ação (para qual tema ele alterna), não o estado atual como
substantivo solto — ex. `aria-label="Tema escuro"` com o claro ativo,
`aria-label="Tema claro"` com o escuro ativo. Sem emoji (regra do projeto).
~~Rótulo de texto visível, sem ícone (precedente AD-032)~~ **Revertido pelo
AD-056**: o usuário pediu ícone depois de ver o resultado em texto.

O módulo de storage segue o padrão já usado em `src/evaluation/apiKey.ts`:
funções livres sobre uma chave dedicada do `localStorage`, sem estado no
Zustand — porque tema não é conteúdo do design nem controle de simulação.
O tema salvo é lido o mais cedo possível na inicialização para não haver flash
do tema errado no primeiro paint. Sem valor salvo, o default é escuro — não há
leitura de `prefers-color-scheme` (decisão explícita do grilling). ~~Default
claro~~ **Revertido pelo AD-056**: o usuário pediu default escuro.

**Acceptance criteria**

- [x] Um botão na `ControlBar` alterna entre tema claro e escuro
- [x] O botão fica fora de `.design-controls` e fora dos controles de
      simulação
- [x] O botão é identificado por ícone (sol/lua) com `aria-label` indicando o
      tema para o qual ele vai trocar, não o estado atual isolado; sem emoji
- [x] Clicar no botão aplica/remove o atributo de tema na raiz do documento
- [x] A escolha persiste em `localStorage`, sob chave própria, sem tocar no
      `Design`, no `useAppStore` de conteúdo ou no round-trip de
      salvar/carregar/exportar/importar
- [x] Recarregar a página mantém o último tema escolhido
- [x] Sem preferência salva, o tema default é escuro (AD-056); o app não lê
      `prefers-color-scheme`
- [x] Teste unitário cobre o módulo de storage: default escuro sem valor
      salvo, leitura após escrita, alternância nos dois sentidos
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde

---

# T2 — Paleta escura em `tokens.css`

**Status:** done

**Blocked by:** T1

**What to build**

Com o toggle do T1 já mudando o atributo de tema, este ticket entrega a
aparência escura de fato: um bloco de override em `tokens.css`, sob o
seletor correspondente ao atributo de tema escuro, redeclarando exatamente os
mesmos custom properties de cor já existentes — superfícies, texto, acento
violeta, e as quatro cores de saúde (ok/degradado/ruim/down). Nenhum outro
arquivo CSS ou componente muda, porque nenhum deles contém cor literal fora de
`tokens.css` (AD-026, AD-027).

Tokens de tipografia, espaçamento e raio não mudam de valor entre temas. Sombra
pode precisar de ajuste de opacidade/cor para continuar visível sobre fundo
escuro — decisão de execução, resolvida durante a validação visual.

A validação é manual: rodar `npm run dev`, ligar o tema escuro, e conferir sob
carga real (RPS alto o bastante para acionar as quatro cores de saúde) que
texto, acento e o canvas do React Flow (pontilhado de fundo, handle de conexão,
aresta) continuam legíveis e coerentes. Não há processo formal de múltiplas
direções (diferente do AD-023) — uma proposta só, iterada até ficar boa.

**Acceptance criteria**

- [x] `tokens.css` ganha um bloco de override de tema escuro redeclarando
      todos os tokens de cor existentes (superfícies, texto, acento, as 4
      cores de saúde)
- [x] Nenhum arquivo além de `tokens.css` muda
- [x] Tokens de tipografia, espaçamento e raio permanecem idênticos entre
      temas
- [x] Texto principal e secundário mantêm contraste legível sobre o fundo
      escuro
- [x] As quatro cores de saúde continuam distinguíveis entre si no tema
      escuro
- [x] O acento violeta continua reconhecível como a cor do interativo/do que
      conecta
- [x] O canvas do React Flow (fundo pontilhado, handle, aresta) permanece
      visível e coerente com o tema escuro
- [x] Validado visualmente no navegador sob carga real, com o tema escuro
      ligado pelo toggle do T1
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde

---

# T3 — Caso ponta a ponta

**Status:** done

**Blocked by:** T1, T2

**What to build**

Um caso Playwright que clica no toggle de tema, afirma que o atributo de tema
mudou, recarrega a página e afirma que o tema persistiu. Escopo de um caso só,
coerente com o mínimo firmado no AD-018 e o precedente do e2e de autoscaling
(T5 daquela feature).

Nenhum teste de screenshot é adicionado — mesmo racional do AD-027: valor de
regressão contínua não justifica a fragilidade, a checagem visual de cor já
foi feita manualmente no T2.

**Acceptance criteria**

- [x] Um caso e2e clica no botão de alternância de tema
- [x] O caso afirma que o atributo de tema mudou no DOM
- [x] O caso recarrega a página e afirma que o tema persistiu
- [x] Nenhum teste de screenshot é adicionado
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde, playwright
      verde
