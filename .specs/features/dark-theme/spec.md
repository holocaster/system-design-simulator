# Tema Escuro - Especificação

status: done

## Problem Statement

O simulador só existe em uma paleta clara e branca (AD-023, direção "Estúdio"). Quem estuda ou pratica com ele em ambiente com pouca luz — à noite, numa sala escurecida, numa apresentação com projetor — fica preso a uma tela branca de alto brilho, sem nenhuma alternativa dentro do próprio app.

O AD-023 já deixou a porta aberta de propósito: todas as cores do app vivem como custom properties num único arquivo (`tokens.css`), e a auditoria feita então (e reforçada pelo AD-026/AD-027) garante zero cor literal fora dele. A ausência de tema escuro hoje não é uma limitação técnica — é só um trabalho que ainda não foi feito.

## Solution

O app ganha um segundo conjunto de valores para os mesmos tokens de cor já existentes, ativado por um toggle manual explícito — não por detecção automática do sistema operacional. A escolha do usuário persiste no `localStorage` do navegador, fora da entidade `Design` (é preferência de dispositivo, não conteúdo do artefato, mesma fronteira do AD-033).

Um botão próprio na `ControlBar` alterna entre os dois temas, identificado por ícone (sol/lua) com rótulo acessível (`aria-label`) indicando o tema-alvo — decisão revista pelo AD-056, que substitui o texto visível inicial do AD-055. Ele fica fora dos grupos "Design" e "Simulação" já estabelecidos pelo AD-046 — não é uma ação do documento nem um controle da simulação, é preferência de exibição.

Tecnicamente, o tema ativo é expresso por um atributo na raiz do documento (ex.: `data-theme="dark"`), e `tokens.css` ganha um bloco de override sob esse seletor redeclarando os mesmos custom properties com valores escuros. Nenhum outro arquivo CSS ou componente precisa mudar, porque nenhum deles contém cor literal (AD-026, AD-027) — é o que faz a feature ser genuinamente simples de implantar.

As cores escuras (superfícies, texto, acento violeta, as quatro cores de saúde) são propostas num único conjunto coerente e validadas visualmente no navegador rodando o app sob carga real, sem um processo formal de múltiplas direções como o AD-023 usou para o tema claro.

## User Stories

1. Como aluno usando o simulador à noite ou em ambiente escuro, quero um tema escuro, para não ficar com uma tela branca de alto brilho.
2. Como usuário, quero alternar entre tema claro e escuro com um clique, para não depender de configuração do sistema operacional ou do navegador.
3. Como usuário, quero que minha escolha de tema seja lembrada entre sessões, para não ter que reativar o tema escuro toda vez que abro o app.
4. Como usuário, quero que o tema escuro seja uma preferência do navegador, não do design salvo, para que abrir designs diferentes não troque o tema sozinho.
5. Como usuário, quero encontrar o toggle de tema na barra de controle, sem precisar abrir um diálogo de configurações, para trocar de tema rapidamente.
6. Como usuário, quero identificar o botão de alternância por um ícone (sol/lua) com rótulo acessível para leitor de tela, para reconhecer a ação sem depender de texto visível na barra (revisto pelo AD-056; a decisão original do AD-055 era texto puro).
7. Como aluno, quero que a cor de acento violeta continue reconhecível no tema escuro, para que o vocabulário visual do app (o que é interativo, o que conecta) não mude entre temas.
8. Como aluno, quero que as quatro cores de saúde (ok/degradado/ruim/down) continuem legíveis e distinguíveis no tema escuro, para que o diagnóstico visual dos componentes não piore.
9. Como aluno, quero que o texto principal e secundário mantenham contraste suficiente sobre o fundo escuro, para não ter dificuldade de leitura.
10. Como usuário, quero que o canvas do React Flow (pontilhado de fundo, aresta, handle de conexão) continue visível e coerente no tema escuro, para que o editor de arquitetura não pareça quebrado.
11. Como usuário, quero que o tema escolhido seja aplicado assim que o app carrega, sem esperar a simulação iniciar, para que a preferência valha desde a primeira tela.
12. Como usuário, quero que recarregar a página mantenha o tema que eu escolhi, para não perder a preferência a cada F5.
13. Como desenvolvedor validando a feature, quero um teste automatizado que clique no toggle e confirme a troca (e a persistência após reload), para que uma regressão futura no mecanismo de tema seja pega antes de chegar ao usuário.
14. Como usuário abrindo o app pela primeira vez neste navegador, quero que o tema padrão seja escuro, para não precisar procurar o toggle antes de ter uma tela confortável (revisto pelo AD-056; o AD-055 original definia claro como default).

## Implementation Decisions

Registrado como ADR em `.specs/STATE.md` (AD-055), com o racional completo.

- **Mecanismo de tema**: atributo `data-theme` (`"light"` implícito por ausência, ou `"dark"`) na raiz do documento (`<html>` ou `:root` via `document.documentElement`). `tokens.css` ganha um seletor `:root[data-theme="dark"]` redeclarando exatamente os mesmos custom properties já existentes, com valores escuros. Nenhuma classe CSS nova em componentes.
- **Escopo de cor a redefinir**: todos os tokens de cor de `tokens.css` — superfícies (`--color-app-bg`, `--color-canvas`, `--color-panel`, `--color-line`), texto (`--color-text`, `--color-text-secondary`, `--color-on-accent`), acento (`--color-accent`), e as quatro cores de saúde (`--color-health-ok/warn/bad/down`). Tokens de tipografia, espaçamento, raio e sombra não mudam de valor entre temas (sombra pode precisar de opacidade/cor ajustada para continuar visível sobre fundo escuro — decisão de execução, validada visualmente).
- **Persistência**: novo módulo pequeno de storage (mesmo padrão de `src/evaluation/apiKey.ts`: funções livres sobre uma chave dedicada do `localStorage`, sem estado no Zustand). Lido de forma síncrona o mais cedo possível na inicialização (antes ou durante o primeiro render) para evitar flash de tema errado.
- **Persistência não usa o `useAppStore`**: tema não é estado de design nem de simulação; é lido/escrito diretamente do módulo de storage a partir do componente do toggle, análogo a como `SettingsDialog` já lê/escreve `apiKey.ts` sem passar pelo store.
- **UI**: botão na `ControlBar`, fora de `.design-controls` (grupo "Design", AD-046) e fora dos controles de simulação. Identificado por ícone SVG inline (sol/lua, sem emoji — regra do projeto) com `aria-label` indicando a ação (trocar para o outro tema), não o estado atual como substantivo solto — ex. `aria-label="Tema escuro"` quando o tema claro está ativo, `aria-label="Tema claro"` quando o escuro está ativo. **Revisto pelo AD-056**: a decisão original do AD-055 era texto visível puro, sem ícone (precedente AD-032); o usuário pediu ícone depois de ver o resultado.
- **Sem detecção de `prefers-color-scheme`**: decisão explícita do grilling. O app não lê nem reage a essa media query. **Revisto pelo AD-056**: o default de um navegador novo (sem preferência salva) é o tema escuro, não o claro definido originalmente no AD-055.
- **Não é campo do `Design`**: `schema` não muda, nenhum campo novo em `catalog.ts`/`types.ts`, nenhuma mudança em `designStorage.ts` ou no payload enviado à IA avaliadora.

## Testing Decisions

### O que faz um bom teste aqui

A lógica de tema é puramente mecânica: ler/escrever uma chave de `localStorage` e aplicar/remover um atributo no DOM. Um bom teste unitário afirma sobre o valor lido/escrito no storage e sobre o atributo resultante, sem depender de nenhuma cor renderizada (cor é responsabilidade do CSS, não testável de forma útil em vitest). A validação de que as cores em si são legíveis é visual, feita no navegador, não em teste automatizado.

### Módulos testados

- Novo módulo de storage de tema (equivalente a `apiKey.ts`): teste unitário cobrindo default (sem valor salvo = escuro, AD-056), leitura após escrita, e alternância nos dois sentidos.
- Prior art: não há teste unitário para `apiKey.ts` hoje (é só storage direto sem lógica própria) — o módulo de tema é ligeiramente mais rico (tem alternância), então ganha teste onde `apiKey.ts` não tem.

### Ponta a ponta

Um caso, seguindo o escopo mínimo do AD-018 e o precedente do e2e de autoscaling (T5): clicar no toggle, afirmar que o atributo de tema mudou no DOM, recarregar a página e afirmar que o tema persistiu. Semeia estado mínimo (não depende de um design importado).

### Fora do escopo de teste

Nenhum teste de contraste de cor, nenhum screenshot de tema escuro versionado (mesmo racional do AD-027: screenshot de reforma visual é caro e frágil, e aqui o valor da checagem visual é validação manual pontual, não regressão contínua).

## Out of Scope

- **Tema automático por `prefers-color-scheme`**: recusado no grilling. Fica no backlog caso o usuário peça depois.
- **Terceiro estado "seguir o sistema"**: mesma recusa acima.
- **Processo formal de múltiplas direções de cor** (como o AD-023 fez para o tema claro): o grilling optou por uma proposta única iterada visualmente.
- **Qualquer novo token não-cor** (tipografia, espaçamento, raio): tema escuro reusa os mesmos valores estruturais do tema claro.
- **Configuração do tema entrar no `Design`, no export/import ou no prompt da IA avaliadora.**
- **Toggle dentro do `SettingsDialog`**: decisão explícita de colocar na `ControlBar`.

## Further Notes

A ordem natural de implementação é: (1) módulo de storage de tema com teste unitário, (2) aplicação do atributo na inicialização + botão na `ControlBar`, (3) bloco de tokens escuros em `tokens.css` com validação visual manual sob carga real (RPS alto o bastante para ver as quatro cores de saúde), (4) caso e2e do toggle. A ordem separa "mecanismo funciona" (1-2) de "cores estão certas" (3), que é onde a maior parte da iteração visual deve acontecer.
