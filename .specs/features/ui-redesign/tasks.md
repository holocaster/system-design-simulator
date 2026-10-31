# Tarefas: ui-redesign

Spec: `.specs/features/ui-redesign/spec.md`
ADRs: AD-023 (direção "Estúdio", tema único, tokens em CSS puro), AD-024 (IBM Plex
via @fontsource), AD-025 (nó mantém os 4 números), AD-026 (chrome do React Flow
padrão, handle preservado), AD-027 (classes dos e2e são contrato, validação por
screenshot)

O recorte segue expand-contract: T1 introduz os tokens ao lado do que existe, T2-T7
migram uma região cada, T8 fecha o contrato. T2-T7 são regiões disjuntas e não se
bloqueiam entre si — depois de T1 a frontier tem seis tickets simultâneos.

Regra que vale para todos: `src/engine/tick.ts`, `flow.ts`, `graph.ts`,
`diagnose.ts`, `types.ts`, `src/store/`, `src/persistence/`, `src/evaluation/` e
`src/hooks/` não são tocados. Os arquivos em `e2e/` não são tocados. Nenhum
comportamento de simulação muda.

---

## T1 - Fundação: tokens, tipografia e shell

**Status:** concluído em `db7deeb`

**Bloqueado por:** nada, pode começar imediatamente.

**O que construir:** quem abre o app vê, pela primeira vez, uma ferramenta com
nome. Uma faixa de cabeçalho no topo identifica o simulador, e toda a tipografia
passa a ser IBM Plex — idêntica no Linux, no macOS e no Windows, acabando com o
"a mesma tela é outra tela dependendo da máquina".

Por baixo nasce o vocabulário visual do app: um módulo de tokens com a paleta da
direção "Estúdio", a escala tipográfica, a escala de espaçamento, os raios e as
sombras. O fundo do app e das colunas já passa a ler esses tokens, então a
mudança é visível de imediato. As regiões internas (barra, nós, paleta, painel,
diálogos) continuam com o estilo antigo e continuam funcionando — é o "expand":
o novo nasce ao lado do velho, sem quebrar nada.

Paleta conforme AD-023: canvas `#F1EFF9`, painéis brancos, texto `#221D34`,
secundário `#6F6889`, linhas `#E2DFF0`, acento `#5A49D6`; saúde `#12886A`
saudável, `#C07A10` degradado, `#D1435B` sobrecarregado, cinza neutro para
`down`. Raio base 11px.

As fontes vêm via `@fontsource`, servidas do bundle e não de CDN — a premissa
100% client-side do AD-001 não é negociável. Só os pesos usados, subset latino.

- [ ] O app exibe uma faixa de cabeçalho com o nome da ferramenta, acima das três colunas
- [ ] O layout raiz acomoda cabeçalho mais três colunas sem barra de rolagem vertical na janela
- [ ] Toda a interface renderiza em IBM Plex Sans e os números em IBM Plex Mono, com as fontes servidas pelo próprio bundle
- [ ] Existe um único módulo de tokens declarando cor, tipografia, espaçamento, raio e sombra
- [ ] Os fundos do app, do canvas e das colunas leem tokens, sem hexadecimal solto
- [ ] Nenhuma região interna quebra: paleta, barra, nós, painel e diálogos continuam legíveis e operáveis
- [ ] Gate: build verde, oxlint limpo, 183 vitest, 5 playwright
- [ ] Screenshots dos quatro estados apresentados ao usuário

---

## T2 - Barra de controle

**Status:** concluído em `6dc4eba`

**Bloqueado por:** T1 (consome os tokens e a escala tipográfica).

**O que construir:** o rótulo "Carga (RPS)" para de quebrar em duas linhas, e as
três métricas globais deixam de ser texto corrido para virar o elemento mais
legível da tela — que é o que elas deveriam ter sido desde sempre, já que são os
números mais importantes que o app produz.

A barra passa a ter três blocos: a ação de iniciar/parar, as entradas (o slider e
o campo numérico agrupados sob um rótulo único, mais o percentual de escritas) e
as métricas alinhadas à direita como tiles — rótulo pequeno em caixa alta sobre
número grande em monoespaçada. A taxa de sucesso ganha cor semântica: o usuário
percebe a degradação pela cor antes de comparar dígitos.

Os números usam numerais tabulares para as colunas não dançarem a cada tick.

O comportamento não muda em nada: o clamp de RPS em [1, 100000], a sincronização
entre slider e campo, o commit no blur e no Enter, e o descarte de entrada
inválida continuam exatamente como estão.

- [ ] Nenhum rótulo da barra quebra em duas linhas na largura padrão da janela
- [ ] Slider e campo numérico de carga aparecem visualmente agrupados sob um rótulo único
- [ ] Sucesso, latência e total aparecem como tiles com hierarquia tipográfica, não como texto corrido
- [ ] A taxa de sucesso muda de cor conforme o estado de saúde
- [ ] Os números não mudam de largura entre ticks da simulação
- [ ] Iniciar, parar, ajustar carga pelo slider, digitar carga no campo e ajustar escritas continuam funcionando como antes
- [ ] Gate: build verde, oxlint limpo, 183 vitest, 5 playwright
- [ ] Screenshots dos quatro estados apresentados ao usuário

---

## T3 - Nós e arestas

**Status:** concluído em `ddce279`

**Bloqueado por:** T1 (consome os tokens de cor semântica).

**O que construir:** olhar o canvas passa a bastar para achar o gargalo. Cada
componente ganha uma barra de utilização preenchida proporcionalmente e colorida
pelo estado de saúde — a saturação vira forma, não só dígito, e o componente em
sofrimento se anuncia antes de qualquer leitura.

Os quatro números permanecem, e o W/R dos bancos também (AD-025). O nó cresce em
altura para acomodar a barra. Esconder o RPS processado tiraria do aluno a
checagem de conservação de tráfego, que é a regra de domínio central do projeto.

O ponto de conexão é restrição explícita (AD-026): tamanho, borda branca e anel
de foco ficam idênticos, muda só a cor para token. O tamanho maior foi uma
melhoria de UX deliberada e regredi-la seria desfazer trabalho já pago.

As arestas param de ter cor cravada em TypeScript e passam a ler tokens — são os
dois valores que hoje formam a maior mancha de azul no centro da tela. A lógica
de cálculo de fluxo, a densidade de bolinhas e a duração da animação não mudam;
a animação passa a respeitar a preferência de movimento reduzido do sistema.

Badge de réplicas, rótulo de tecnologia, ícone de alerta e tooltip de diagnóstico
mantêm todo o comportamento, apenas reestilizados. `.component-node-tech` é
contrato de e2e (AD-027) e o nome não muda.

- [ ] Cada nó exibe uma barra de utilização proporcional, colorida pelo estado de saúde
- [ ] Utilização, RPS, latência e erro seguem visíveis em todos os nós, e o W/R segue visível nos bancos
- [ ] O ponto de conexão mantém tamanho, borda e anel de foco atuais, mudando apenas a cor
- [ ] Arestas normais e com erro leem tokens, sem hexadecimal em TypeScript
- [ ] A animação de tráfego é suprimida quando o sistema pede movimento reduzido
- [ ] Badge de réplicas, rótulo de tecnologia, ícone de alerta e tooltip seguem funcionando
- [ ] Conectar componentes, arrastar nós e selecionar arestas continuam funcionando
- [ ] Gate: build verde, oxlint limpo, 183 vitest, 5 playwright
- [ ] Screenshots dos quatro estados apresentados ao usuário

---

## T4 - Estado vazio, enquadramento e barra de status

**Status:** concluído em `f7705c4`

**Bloqueado por:** T1 (consome os tokens).

**O que construir:** o primeiro contato deixa de ser um quadriculado mudo. Com o
canvas vazio, o app diz o que fazer — arraste um componente da paleta. E quem
carrega um design salvo ou importa um JSON para de ver os componentes encostados
no canto com metade da tela sobrando: o canvas enquadra automaticamente.

O enquadramento dispara ao carregar do localStorage e ao importar JSON. Não
dispara ao adicionar um componente avulso nem durante a simulação — roubar a
câmera do usuário no meio da edição seria pior que o problema original.

O estado vazio fica atrás da interação de arraste: ele informa, nunca bloqueia o
drop.

A barra de status de erro de conexão é reestilizada sobre os tokens, continuando
claramente identificável como mensagem de erro.

- [ ] Com o canvas vazio, uma instrução visível diz como começar
- [ ] O estado vazio não impede arrastar e soltar um componente da paleta
- [ ] Carregar um design do localStorage enquadra os componentes automaticamente
- [ ] Importar um JSON enquadra os componentes automaticamente
- [ ] Adicionar um componente avulso não reenquadra o canvas
- [ ] A barra de status de erro segue legível e reconhecível como erro
- [ ] Gate: build verde, oxlint limpo, 183 vitest, 5 playwright
- [ ] Screenshots dos quatro estados apresentados ao usuário

---

## T5 - Paleta agrupada por categoria

**Status:** concluído em `1a1abeb`

**Bloqueado por:** T1 (consome os tokens).

**O que construir:** a lista achatada de onze componentes vira quatro grupos com
rótulo — Entrada, Computação, Dados e Assíncrono. Quem procura um componente
acha mais rápido, e quem está aprendendo leva a taxonomia junto.

A categoria vive em `COMPONENT_META`, ao lado de sigla, rótulo e defaults, para
que a verdade sobre tipos de componente continue num lugar só. É metadado de
apresentação, não lógica de simulação — o "engine intocado" do AD-023 é sobre
comportamento.

**Único ticket desta feature com teste unitário.** Ele fecha um modo de falha
silencioso: sem exaustividade, um décimo segundo tipo adicionado no futuro não
entraria em nenhum grupo e sumiria da paleta sem nada quebrar.

- [ ] A paleta exibe os componentes em quatro grupos rotulados: Entrada, Computação, Dados, Assíncrono
- [ ] Todo tipo de componente aparece em exatamente um grupo
- [ ] Arrastar qualquer componente da paleta para o canvas continua funcionando
- [ ] Um teste falha se algum tipo em COMPONENT_TYPES não tiver categoria
- [ ] Um teste falha se alguma categoria declarada ficar sem nenhum tipo
- [ ] Gate: build verde, oxlint limpo, vitest verde com os novos casos, 5 playwright
- [ ] Screenshots dos quatro estados apresentados ao usuário

---

## T6 - Painel de propriedades e avaliação

**Status:** concluído em `a707bf9`

**Bloqueado por:** T1 (consome os tokens).

**O que construir:** o painel direito para de ser duas listas separadas por um
fio. Propriedades e Avaliação por IA ganham cabeçalho, espaçamento e separação
próprios, de modo que fique claro onde uma acaba e a outra começa.

Sem abas: a avaliação é uma das ações principais do app e esconder metade do
painel atrás de uma aba custaria mais do que economiza.

Os campos ganham rótulo, espaçamento e foco visíveis, e a mensagem de erro de
validação fica legível e junto do campo que a originou. O seletor de tecnologia,
o campo de nome, os numéricos, o botão de excluir componente e o disparo da
avaliação mantêm todo o comportamento.

- [ ] Propriedades e Avaliação por IA aparecem como seções visualmente distintas
- [ ] Cada campo tem rótulo legível e estado de foco visível
- [ ] Erros de validação aparecem legíveis e adjacentes ao campo correspondente
- [ ] Editar nome, tecnologia e parâmetros numéricos continua funcionando, incluindo o clamp de valores
- [ ] Excluir componente e disparar avaliação continuam funcionando
- [ ] O aviso de componente sem parâmetros editáveis segue visível quando aplicável
- [ ] Gate: build verde, oxlint limpo, 183 vitest, 5 playwright
- [ ] Screenshots dos quatro estados apresentados ao usuário

---

## T7 - Diálogos

**Status:** concluído em `0c8eee8`

**Bloqueado por:** T1 (consome os tokens).

**O que construir:** os três diálogos — salvar/carregar, configuração da API e a
modal de avaliação com o histórico — passam a ler como parte do mesmo app, com
elevação e fundo que deixam claro que a interação está focada ali.

Na modal de avaliação, dois cuidados específicos: a rodada selecionada na coluna
lateral precisa se destacar sem ambiguidade das demais, e a prosa devolvida pela
IA precisa de medida de linha e entrelinha confortáveis — são vários parágrafos
que o usuário lê de fato, não um rótulo que ele escaneia.

`.evaluation-history-item`, `.evaluation-modal-body` e `.evaluation-modal-meta`
são contrato de e2e (AD-027): o CSS por trás é reescrito à vontade, os nomes
ficam.

- [ ] Os três diálogos aparecem com elevação e fundo que separam do resto da tela
- [ ] Salvar, carregar, excluir, exportar e importar continuam funcionando
- [ ] Configurar chave e modelo da API continua funcionando
- [ ] A rodada selecionada no histórico se distingue claramente das não selecionadas
- [ ] O texto da avaliação tem medida de linha confortável para leitura de vários parágrafos
- [ ] O aviso de histórico cheio e o estado "sem simulação" seguem visíveis
- [ ] Gate: build verde, oxlint limpo, 183 vitest, 5 playwright
- [ ] Screenshots dos quatro estados apresentados ao usuário

---

## T8 - Fechamento do contrato

**Status:** concluído em `ffb1d70`

**Bloqueado por:** T2, T3, T4, T5, T6 e T7 — a asserção "nenhum hex fora dos
tokens" só pode ser verdadeira quando a última região tiver migrado.

**O que construir:** o "contract" do expand-contract. Uma varredura por valores
hexadecimais de cor remanescentes fora do módulo de tokens, em CSS e em
TypeScript, eliminando o que sobrou. Ao fim, a cor do app está definida num lugar
só, e mudar a identidade visual é mudar um arquivo.

Fecha também a feature: gate completo e os quatro screenshots antes/depois
apresentados lado a lado para julgamento final do usuário.

- [ ] Nenhum valor hexadecimal de cor existe fora do módulo de tokens, em CSS ou em TypeScript
- [ ] O `.specs/STATE.md` tem o handoff atualizado para esta feature
- [ ] Gate final: build verde, oxlint limpo, vitest verde, 5 playwright
- [ ] Os quatro estados antes/depois apresentados lado a lado ao usuário
