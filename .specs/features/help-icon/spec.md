# Ícone de Ajuda - Especificação

status: ready-for-agent

## Problem Statement

O simulador não tem nenhuma orientação embutida. Um usuário que chega direto na URL pública, sem o contexto de quem o construiu, vê um canvas vazio, uma paleta de componentes e uma barra de controles — sem nenhuma pista de como montar um design, o que os números e cores dos nós significam, ou que existe avaliação por IA e o que ela exige (uma chave própria da OpenRouter).

## Solution

O app ganha uma modal de ajuda com o essencial para começar: como montar e simular um design, o que a cor de cada nó indica, e a existência (e pré-requisito) da avaliação por IA.

Na primeira visita a este navegador, a modal abre sozinha assim que o app carrega. Uma flag própria, gravada no `localStorage` (fora da entidade `Design`, mesma fronteira já usada por `theme.ts` — AD-033), marca a visita como vista no instante em que a modal auto-abre, não quando o usuário a fecha. Em visitas seguintes, a modal não abre mais sozinha; um ícone próprio na `ControlBar`, ao lado do toggle de tema, abre a mesma modal sob demanda a qualquer momento.

A modal reusa o padrão visual já estabelecido por `SettingsDialog`/`SaveLoadDialog`/`EvaluationModal` (`.save-dialog-backdrop`/`.save-dialog`) e fecha só pelo botão "Fechar" — sem tecla Esc, sem clique fora do diálogo, mesmo comportamento dos diálogos existentes hoje.

O conteúdo é JSX estático escrito no próprio componente (não markdown — `react-markdown` já existe no projeto, mas para renderizar texto que vem de fora, a resposta da IA avaliadora; aqui o texto é copy do produto, autoria do dev). Cobre três blocos: (1) o fluxo básico de uso — arrastar um componente da paleta para o canvas, conectar componentes, ajustar carga (RPS) e percentual de escritas, iniciar a simulação; (2) a legenda das quatro cores de saúde do nó, cada uma com um swatch visual usando os tokens reais (`--color-health-ok/warn/bad/down`) ao lado do texto; (3) uma nota curta sobre a avaliação por IA — que existe, que fica atrás do botão "Configurar API", e que a chave informada fica só no `localStorage` do próprio navegador.

## User Stories

1. Como usuário chegando pela primeira vez na URL pública, quero ver uma explicação do simulador assim que a página carrega, para não ficar perdido diante de um canvas vazio sem nenhuma pista de como usar.
2. Como usuário que já viu a ajuda antes neste navegador, quero que ela não abra mais sozinha nas visitas seguintes, para não ser interrompido por uma explicação que já conheço.
3. Como usuário que quer reler a ajuda depois de dispensá-la, quero um ícone sempre visível que a reabre, para não depender de recarregar a página ou lembrar de algo que só vi uma vez.
4. Como usuário, quero encontrar o ícone de ajuda na barra de controle, perto do toggle de tema, para achá-lo no mesmo lugar onde já espero ações de nível de app.
5. Como usuário, quero que o ícone de ajuda seja reconhecível sem depender de texto visível (com rótulo acessível para leitor de tela), seguindo o mesmo padrão do ícone de tema já existente.
6. Como usuário novo, quero que a ajuda explique como montar um design (arrastar componente da paleta, conectar componentes), para saber como começar a construir uma arquitetura.
7. Como usuário novo, quero que a ajuda explique como ajustar a carga (RPS) e o percentual de escritas, para saber como exercitar o design que montei.
8. Como usuário novo, quero que a ajuda explique como iniciar a simulação, para saber como ver o design em ação.
9. Como usuário novo, quero uma legenda explícita das quatro cores de saúde de um nó (saudável, degradado, sobrecarregado, inativo), para interpretar o que vejo no canvas sem precisar adivinhar.
10. Como usuário novo, quero que a legenda de cores mostre o tom real de cada estado de saúde (não só o nome da cor em texto), para reconhecer exatamente a cor que vou ver no nó.
11. Como usuário novo, quero saber que existe avaliação por IA e onde configurá-la (botão "Configurar API"), para descobrir a feature sem precisar explorar o app inteiro sozinho.
12. Como usuário considerando usar a avaliação por IA, quero saber que minha chave fica só no meu navegador, para decidir com confiança se quero colar uma chave de API paga num site que não conheço.
13. Como usuário, quero fechar a modal de ajuda por um botão explícito, para ter controle claro sobre quando ela sai da tela, do mesmo jeito que já funciona nos outros diálogos do app.
14. Como usuário, quero que fechar a modal de ajuda não afete nenhum outro estado do app (design aberto, simulação rodando, tema), para que consultar a ajuda nunca tenha efeito colateral.
15. Como desenvolvedor validando a feature, quero um teste automatizado que cubra a primeira visita (auto-abertura) e uma visita seguinte (só o ícone, sob demanda), para que uma regressão futura no mecanismo de "primeira vez" seja pega antes de chegar ao usuário.
16. Como desenvolvedor mantendo o projeto, quero a lógica de "já visto" isolada num módulo puro e testável, para verificar o comportamento sem precisar renderizar componentes React.

## Implementation Decisions

Registrado como ADR em `.specs/STATE.md` (AD-058), com o racional completo.

- **Módulo de persistência de "já visto"**: novo módulo pequeno de storage, mesmo padrão de `theme.ts` — funções livres sobre uma chave dedicada do `localStorage` (`storage?: Storage` injetável para teste), sem estado no Zustand. Duas operações: ler se a ajuda já foi vista, e marcar como vista. A escrita degrada silenciosamente se o storage falhar (mesma guarda de `saveTheme`) — é preferência de exibição, não conteúdo do design, então uma falha de quota não deve quebrar a experiência.
- **Quando marcar como visto**: no instante em que a modal auto-abre (na inicialização), não quando o usuário a fecha. Evita uma janela de estado "aberta mas não marcada" se o usuário recarregar a página antes de fechar a modal.
- **Não é campo do `Design`**: a flag vive fora da entidade, mesma fronteira do tema (AD-033) — é preferência de navegador/dispositivo, não conteúdo do artefato. `schema` não muda, nenhum campo novo em `catalog.ts`/`types.ts`, nenhuma mudança em `designStorage.ts` ou no payload enviado à IA avaliadora.
- **UI — ícone e gatilho**: botão na `ControlBar`, ao lado do toggle de tema (fora dos grupos "Design" e "Simulação" do AD-046). Ícone SVG inline, sem emoji (regra do projeto), com `aria-label` descrevendo a ação ("Ajuda" ou equivalente). Na inicialização, se a flag de "já visto" não estiver marcada, a modal abre automaticamente; o clique no ícone sempre abre a modal, independentemente da flag.
- **UI — modal**: reusa o padrão `.save-dialog-backdrop`/`.save-dialog` já usado por `SettingsDialog`, `SaveLoadDialog` e `EvaluationModal`. Fecha exclusivamente pelo botão "Fechar" — nenhum novo comportamento de Esc ou clique fora é introduzido (nenhum diálogo do app faz isso hoje).
- **Conteúdo**: JSX estático dentro do próprio componente da modal, sem markdown e sem arquivo externo. Três blocos, nesta ordem: fluxo básico de uso; legenda de saúde com swatch visual por estado (elemento colorido via `var(--color-health-ok|warn|bad|down)`, sem token novo); avaliação por IA (existência, botão "Configurar API", nota de que a chave fica só no `localStorage` do navegador).
- **Fora do conteúdo**: réplicas/autoscaling, seletor de tecnologia, tema, salvar/exportar/importar, histórico de avaliações — não são mencionados na modal.

## Testing Decisions

### O que faz um bom teste aqui

A lógica de "primeira visita" é puramente mecânica: ler/escrever uma flag booleana numa chave de `localStorage`. Um bom teste unitário afirma sobre o valor lido/escrito no storage, sem depender de nenhuma renderização — mesmo racional já validado em `theme.test.ts`. O comportamento observável pelo usuário (a modal de fato abre sozinha na primeira visita e não abre nas seguintes; o ícone sempre abre sob demanda) é o que o e2e cobre, porque só ele exercita DOM real.

### Módulos testados

- Novo módulo de storage de "já visto": teste unitário cobrindo default (sem valor salvo = não visto), leitura após marcar como visto, e que marcar não lança quando o storage falha ao gravar.
- Prior art direto: `theme.test.ts` (mesma estrutura de `MemoryStorage` injetada, mesmos três casos: default, leitura após escrita, falha de escrita não lança).

### Ponta a ponta

Um caso, seguindo o escopo mínimo do AD-018: (1) primeira carga da página (sem flag) — a modal aparece sozinha; fecha pelo botão. (2) Recarregar a página — a modal não aparece sozinha desta vez. (3) Clicar no ícone de ajuda — a modal abre sob demanda; fecha de novo. Não depende de nenhum design importado.

### Fora do escopo de teste

Nenhum teste de conteúdo textual palavra-por-palavra (a modal pode ganhar copy revisada sem quebrar teste); nenhum screenshot versionado do conteúdo da modal.

## Out of Scope

- **Conteúdo sobre réplicas/autoscaling, seletor de tecnologia, tema ou salvar/exportar**: ficam de fora para a modal não virar um manual longo; usuário descobre essas features explorando o painel de propriedades.
- **Fechar por Esc ou clique fora do diálogo**: nenhum diálogo do app faz isso hoje; não é introduzido aqui.
- **Persistência de sessão ou de design**: a flag de "já visto" não entra no `Design`, no export/import, nem no prompt da IA avaliadora.
- **Botão de "resetar ajuda" ou qualquer forma de forçar a auto-abertura de novo**: se o usuário quiser rever a ajuda, usa o ícone.
- **Tour guiado interativo, tooltips passo a passo, ou qualquer coisa além de uma modal de leitura**: fora de escopo desta feature.

## Further Notes

Ordem natural de implementação: (1) módulo de storage de "já visto" com teste unitário, mirror direto de `theme.ts`/`theme.test.ts`; (2) componente da modal com o conteúdo estático (fluxo básico, legenda de cores com swatches, nota de avaliação por IA) e o botão na `ControlBar` que lê a flag na montagem para decidir auto-abrir; (3) caso e2e cobrindo os três passos da seção de teste ponta a ponta.
