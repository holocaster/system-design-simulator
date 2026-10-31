# Reforma Visual da UI - Especificação

status: ready-for-agent

## Problem Statement

A UI está feia, e isso não é um julgamento de gosto — é um problema funcional num app cujo produto é a leitura de números.

Quem abre o simulador hoje vê uma página que começa colada no canto superior esquerdo, sem título, sem identidade, sem nenhuma indicação do que fazer. O canvas ocupa quase dois terços da tela e está vazio, quadriculado, mudo. Quem importa um design salvo vê os componentes encostados no canto com metade da tela sobrando, porque nada enquadra a visualização.

A tipografia é toda plana: praticamente tudo entre 10 e 12 pixels, em `system-ui`, com pesos 600 e 700 espalhados sem hierarquia. Como o usuário desenvolve no Linux, `system-ui` resolve para Cantarell — enquanto no macOS resolve para SF Pro. A mesma tela é outra tela dependendo do sistema operacional.

A paleta foi montada caso a caso, com hex cravados direto nas regras (`#2e7d32`, `#1565c0`, `#c62828`) e sem nenhum token. Não há um lugar onde a cor do app esteja definida.

A barra de controle é o pior sintoma: o rótulo "Carga (RPS)" quebra em duas linhas por falta de espaço, e as três métricas globais — sucesso, latência e total, os números mais importantes que o app produz — aparecem como texto corrido, com exatamente o mesmo peso visual de um rótulo secundário. O dado mais valioso da tela é o que menos se destaca.

Os painéis laterais são colunas brancas separadas do canvas por um fio de 1px, sem elevação, sem agrupamento, sem densidade. O painel direito empilha "Propriedades" e "Avaliação por IA" separados apenas por outro fio. A paleta lista onze componentes em sequência achatada, sem ensinar que existe uma taxonomia entre eles.

Nos nós, a utilização — o número que ensina saturação, o conceito central do simulador — é renderizada em cinza de 10px, indistinguível dos outros três números ao lado.

O resultado é um app que parece um protótipo, e um protótipo não convida ninguém a estudar nele.

## Solution

Adotar a direção visual "Estúdio" (AD-023): um mundo claro construído sobre tokens, que trata o simulador como ferramenta de aprendizado e não como console de produção.

Toda cor, tamanho de texto, espaçamento, raio e sombra passa a vir de custom properties declaradas num único arquivo de tokens. Nenhum hex solto sobrevive fora dele. Uma família tipográfica própria — IBM Plex Sans para a interface e IBM Plex Mono para os números — é servida do próprio bundle, tornando a renderização idêntica em qualquer sistema operacional.

A tela ganha um cabeçalho com identidade. A barra de controle é reorganizada para que os rótulos não quebrem e para que as três métricas globais virem tiles com hierarquia tipográfica real, legíveis de relance. O canvas ganha um estado vazio que diz o que fazer, e passa a enquadrar automaticamente o design ao carregar ou importar. O painel direito ganha seções com cabeçalho e respiro próprios. A paleta agrupa os componentes em Entrada, Computação, Dados e Assíncrono, ensinando a taxonomia junto com o desenho.

Cada nó ganha uma barra de utilização que traduz a saturação em forma, não só em número — mantendo os quatro números e o W/R dos bancos intactos (AD-025). A cor da barra carrega a semântica de saúde, de modo que um componente em sofrimento se anuncia antes de o usuário ler qualquer dígito.

O comportamento da simulação não muda em nada. Nenhum número novo, nenhum número a menos, nenhuma regra de domínio tocada.

## User Stories

1. Como aluno que abre o simulador pela primeira vez, quero ver um cabeçalho que nomeia a ferramenta, para saber onde eu estou.
2. Como aluno que abre o simulador com o canvas vazio, quero uma instrução visível dizendo para arrastar um componente da esquerda, para saber por onde começar sem precisar adivinhar.
3. Como aluno que importa um design salvo, quero que o canvas enquadre automaticamente os componentes, para não ter que arrastar e dar zoom antes de conseguir ler qualquer coisa.
4. Como aluno que carrega um design do localStorage ao abrir o app, quero o mesmo enquadramento automático, para que carregar e importar se comportem igual.
5. Como aluno rodando uma simulação, quero ver a taxa de sucesso, a latência ponta a ponta e o total de RPS com destaque tipográfico real, para captar o estado do sistema de relance sem procurar.
6. Como aluno rodando uma simulação, quero que a taxa de sucesso mude de cor quando cai, para perceber a degradação sem precisar comparar números mentalmente.
7. Como aluno ajustando a carga, quero que o rótulo "Carga" caiba numa linha só, para que a barra de controle não pareça quebrada.
8. Como aluno ajustando a carga, quero o slider e o campo numérico visualmente agrupados sob o mesmo rótulo, para entender que controlam a mesma coisa.
9. Como aluno olhando um componente, quero uma barra de utilização preenchida proporcionalmente, para ver a saturação como forma e não apenas como dígito.
10. Como aluno olhando um componente saturado, quero que a barra fique âmbar ou vermelha conforme o estado de saúde, para identificar o gargalo antes de ler qualquer número.
11. Como aluno olhando um componente, quero continuar vendo utilização, RPS processado, latência efetiva e taxa de erro, para poder conferir que entrada é igual a sucesso mais erro.
12. Como aluno olhando um banco de dados, quero continuar vendo as utilizações separadas de escrita e leitura, para entender por que réplicas não aliviam escrita.
13. Como aluno com um componente replicado, quero que o badge de réplicas continue distinguindo o total esperado das réplicas vivas, para perceber quando alguma caiu.
14. Como aluno com um componente em sofrimento, quero que o diagnóstico continue acessível pelo ícone de alerta e pelo tooltip, para saber a causa e a ação sem sair da tela.
15. Como aluno procurando um componente na paleta, quero que eles estejam agrupados em Entrada, Computação, Dados e Assíncrono, para encontrar mais rápido e aprender a taxonomia no caminho.
16. Como aluno arrastando um componente da paleta, quero que o item indique que é arrastável, para entender a interação sem instrução.
17. Como aluno conectando dois componentes, quero que o ponto de conexão continue grande o suficiente para acertar com o mouse, porque essa melhoria já foi feita e não pode regredir.
18. Como aluno conectando dois componentes, quero que o ponto de conexão siga a cor de acento da interface, para que o canvas não tenha uma cor estranha ao resto do app.
19. Como aluno observando o tráfego, quero que as arestas usem as cores da nova paleta, para que o canvas leia como parte do mesmo app.
20. Como aluno observando uma aresta com erro, quero que ela fique na cor crítica, para localizar onde o tráfego está falhando.
21. Como aluno que selecionou um componente, quero que o painel de propriedades tenha um cabeçalho de seção claro, para saber a que componente aqueles campos pertencem.
22. Como aluno editando propriedades, quero campos com rótulo, espaçamento e foco visíveis, para editar sem errar de campo.
23. Como aluno editando propriedades, quero que a mensagem de erro de validação seja legível e próxima do campo, para corrigir sem procurar.
24. Como aluno que quer avaliar o design, quero que a seção de avaliação por IA seja visualmente distinta das propriedades, para não confundir as duas.
25. Como aluno lendo o texto devolvido pela IA, quero medida de linha e entrelinha confortáveis, para conseguir ler vários parágrafos sem cansar.
26. Como aluno navegando o histórico de avaliações, quero que a rodada selecionada se destaque claramente das outras, para não perder o lugar.
27. Como aluno que abriu um diálogo, quero que ele tenha elevação e um fundo que separe do resto, para entender que a interação está focada ali.
28. Como aluno que cometeu um erro de conexão, quero que a barra de status seja legível e claramente uma mensagem de erro, para entender o que aconteceu.
29. Como usuário de teclado, quero foco visível em todos os controles interativos, para operar o app sem mouse.
30. Como usuário que prefere menos movimento, quero que a animação de tráfego respeite a preferência do sistema, para não sentir desconforto.
31. Como aluno usando o app em qualquer sistema operacional, quero que a tipografia seja a mesma, para que a tela não pareça outra dependendo da máquina.
32. Como aluno lendo números lado a lado, quero dígitos de largura fixa, para que as colunas de métricas não dancem a cada tick da simulação.
33. Como desenvolvedor que for mexer no visual depois, quero que toda cor e espaçamento venham de tokens num arquivo só, para mudar um valor em um lugar em vez de caçar hex pelo CSS.
34. Como desenvolvedor que adicionar um novo tipo de componente no futuro, quero que um teste falhe caso eu esqueça de categorizá-lo, para que ele não desapareça silenciosamente da paleta.
35. Como desenvolvedor reformando a UI, quero que a suíte e2e continue verde sem eu tocar nela, para que um teste vermelho signifique regressão de verdade e não renomeação de classe.

## Implementation Decisions

### Sistema de tokens

Um novo módulo de estilos concentra as custom properties: escala de cor (superfícies, texto, linhas, acento), escala semântica de saúde, escala tipográfica, escala de espaçamento, raios e sombras. Ele é importado uma vez na folha raiz. Os três arquivos de CSS existentes são reescritos consumindo exclusivamente esses tokens.

A regra dura: nenhum valor hexadecimal de cor pode existir fora do arquivo de tokens. Isso inclui os hex hoje cravados em TypeScript, dentro do componente de nó e do componente de aresta — eles passam a ler os tokens.

Paleta da direção "Estúdio", conforme AD-023: canvas `#F1EFF9`, painéis brancos, texto `#221D34`, secundário `#6F6889`, linhas `#E2DFF0`, acento `#5A49D6`. Semântica de saúde: `#12886A` saudável, `#C07A10` degradado, `#D1435B` sobrecarregado, e um cinza neutro para o estado `down`. Raio base 11px, sombras suaves.

### Tipografia

IBM Plex Sans e IBM Plex Mono entram como dependências via `@fontsource`, servidas do bundle — não de CDN, preservando a premissa 100% client-side do AD-001. Apenas os pesos efetivamente usados são importados, com subset latino.

Divisão de papéis: Plex Sans para rótulos, texto de interface e prosa; Plex Mono para todo número — métricas de nó, métricas globais, campos numéricos e badges. Onde dígitos se alinham em coluna e mudam a cada tick, usar numerais tabulares para as colunas não dançarem.

### Cabeçalho

Uma faixa nova no topo da aplicação, acima das três colunas atuais, com o nome da ferramenta. O layout raiz passa de três colunas em tela cheia para cabeçalho mais três colunas, o que muda o cálculo de altura das colunas e da área do canvas.

### Barra de controle

Reorganizada em três blocos: ação (iniciar/parar), entradas (carga com slider e campo numérico agrupados sob um rótulo único, mais o percentual de escritas) e métricas globais alinhadas à direita como tiles.

Cada tile é um rótulo pequeno em caixa alta sobre um número grande em monoespaçada. A taxa de sucesso recebe cor semântica conforme o valor. O comportamento dos controles — clamp de RPS, sincronização entre slider e campo, commit no blur e no Enter — não muda em nada.

### Canvas

Estado vazio: quando não há nenhum componente, o canvas exibe uma mensagem instruindo a arrastar um componente da paleta. Deve estar atrás da interação de drop, nunca bloqueando o arraste.

Enquadramento automático: ao carregar um design do localStorage ou importar um JSON, o canvas enquadra os componentes. Não deve disparar ao adicionar um componente individualmente, nem durante a simulação, para não roubar o controle de câmera do usuário no meio da edição.

Chrome do React Flow: permanece no padrão da biblioteca (AD-026). Nenhum seletor interno da biblioteca é adicionado ao CSS.

### Nós

O nó ganha uma barra de utilização entre o cabeçalho e as métricas. Preenchimento proporcional à utilização, cor derivada do estado de saúde. Os quatro números e o W/R dos bancos permanecem (AD-025); o nó cresce em altura para acomodar.

O ponto de conexão preserva geometria e comportamento atuais — tamanho, borda branca e anel de foco — mudando apenas a cor para token (AD-026). Isso é uma restrição explícita: o tamanho maior foi uma melhoria de UX deliberada e não pode regredir.

O badge de réplicas, o rótulo de tecnologia, o ícone de alerta e o tooltip de diagnóstico mantêm todo o comportamento, apenas reestilizados.

### Arestas

Os dois valores de cor hoje cravados no componente de aresta — o normal e o de erro — passam a ler tokens. A lógica de cálculo de fluxo, a densidade de bolinhas e a duração da animação não mudam. A animação de tráfego passa a respeitar a preferência de movimento reduzido do sistema.

### Painéis

A paleta agrupa os componentes em quatro categorias com rótulo: Entrada, Computação, Dados e Assíncrono. A taxonomia vive em `COMPONENT_META`, junto com sigla, rótulo e defaults, mantendo uma fonte única de verdade sobre tipos de componente.

O painel direito ganha seções visualmente fortes para Propriedades e Avaliação por IA — com cabeçalho, espaçamento e separação próprios, sem abas, porque abas esconderiam a avaliação, que é uma das ações principais.

Os diálogos de salvar/carregar, de configuração e de avaliação são reestilizados sobre os tokens, mantendo estrutura e comportamento.

### Fora dos limites da mudança

`src/engine/tick.ts`, `flow.ts`, `graph.ts`, `diagnose.ts` e `types.ts`; `src/store/`; `src/persistence/`; `src/evaluation/`; `src/hooks/`. A única alteração em `src/engine/` é o acréscimo do campo de categoria em `COMPONENT_META`, que é metadado de apresentação, não lógica de simulação.

## Testing Decisions

Um bom teste aqui verifica comportamento observável, não aparência. Aparência não é testável de forma útil por asserção automatizada — nenhuma asserção sobre valor de cor ou pixel entra na suíte, porque ela quebraria a cada ajuste de token sem nunca ter detectado um defeito real.

**Zero seams novos.** Todos os testes usam arquivos e mecanismos que já existem.

### Exaustividade da taxonomia da paleta

Testada em `src/engine/catalog.test.ts`, junto dos testes que já cobrem `COMPONENT_META` e a matriz de conexões. Duas asserções: todo tipo em `COMPONENT_TYPES` pertence a exatamente uma categoria, e toda categoria declarada contém pelo menos um tipo.

Isso fecha o modo de falha silencioso: sem ele, um tipo de componente adicionado no futuro sumiria da paleta e nenhum teste avisaria.

Prior art: os testes de exaustividade que já existem em `catalog.test.ts` sobre defaults e siglas por tipo.

### Regressão de comportamento

A suíte e2e existente (5 casos, em dois arquivos) roda inalterada e serve de rede: ela exercita o seletor de tecnologia, o rótulo no canvas, o round-trip de exportação e o histórico de avaliações. Os nomes de classe de que ela depende são contrato (AD-027) — o CSS por trás é reescrito à vontade, os nomes ficam.

Um e2e vermelho durante esta feature significa regressão real, nunca renomeação.

A suíte unitária (183 casos) roda inalterada. Como a engine não muda, qualquer falha nela indica que o diâmetro da mudança escapou do previsto.

### Validação visual

Por screenshots antes/depois, capturados fora do repo (AD-027). Quatro estados, sempre com o mesmo design semeado por importação de JSON: canvas vazio, design importado, simulação rodando e componente selecionado. Os "antes" já foram capturados. Nenhum baseline de imagem é versionado.

O julgamento de "ficou bom" é do usuário, a cada ticket, não de uma asserção.

### Gate de conclusão

`npm run build` verde, `oxlint` limpo, 183 (mais os novos de categoria) testes unitários passando, 5 e2e passando, screenshots dos quatro estados apresentados.

## Out of Scope

- **Tema escuro.** Recusado no AD-023 e movido para o backlog. Os tokens em `:root` deixam a porta aberta, mas nenhum valor de tema escuro é definido nem validado.
- **Qualquer mudança de comportamento da simulação.** Nenhum número novo, nenhum número removido, nenhuma regra de domínio tocada.
- **Novas funcionalidades.** Sem undo, sem atalhos de teclado novos, sem painéis colapsáveis, sem minimapa, sem controles de zoom, sem tela de diff entre avaliações.
- **Reorganização da arquitetura de informação.** As três colunas permanecem três colunas; nada migra para drawer ou aba.
- **Tailwind, CSS Modules ou CSS-in-JS.** Recusados no AD-023.
- **Sobrescrita do chrome do React Flow.** Recusada no AD-026.
- **Snapshots visuais versionados no Playwright.** Recusados no AD-027.
- **Responsividade para telas pequenas.** O app assume desktop hoje e continua assumindo. Não é uma decisão nova, apenas não é atacada aqui.
- **Acessibilidade além do básico.** Foco visível e movimento reduzido entram porque são baratos e vêm junto do CSS novo. Auditoria de contraste completa, navegação por teclado no canvas e suporte a leitor de tela não entram.
- **Ícones.** As siglas de texto permanecem como identificação dos tipos de componente.

## Further Notes

A direção "Estúdio" foi escolhida entre três mockups da tela real, todos renderizados sob a mesma carga de estresse — 12.000 RPS, API degradada em 72%, banco sobrecarregado em 96%. O critério não foi qual paleta é mais bonita em repouso, e sim qual comunica melhor quando algo está em sofrimento, porque é nesse momento que o simulador precisa ser lido.

Risco registrado e aceito conscientemente no AD-023: arredondado generoso somado a acento violeta é a estética mais datável das três direções apresentadas. Se envelhecer mal, o custo de reverter é baixo justamente por causa dos tokens — que é parte do argumento a favor deles.

Uma correção de fato feita durante o grilling merece registro, porque contradiz o que se supunha no início: o azul dominante do canvas nunca foi do React Flow. Ele vem de um override próprio no CSS dos pontos de conexão e de dois valores hexadecimais cravados no componente de aresta. A superfície realmente estilizada pela biblioteca neste app se resume ao pontilhado do fundo, ao anel de seleção e ao link de atribuição — e nenhum dos três é tocado.
