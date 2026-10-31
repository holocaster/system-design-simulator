# Autoscaling e Ciclo de Vida de Réplicas - Especificação

status: done

## Problem Statement

O simulador existe para ensinar system design, e hoje ele ensina uma coisa errada sobre o mecanismo mais citado em entrevistas de escalabilidade.

Quando uma réplica cai por sobrecarga, ela só volta se a utilização do componente ficar abaixo de 50% durante 5 segundos. Nada em Kubernetes funciona assim. Um pod que morre é reiniciado pelo kubelet num prazo próprio; ele não fica esperando a fila baixar para pedir permissão de subir. A regra atual é uma abstração didática herdada do MVP — barata de implementar, e ela ensina ao aluno um modelo mental que vai atrapalhá-lo na primeira conversa técnica real.

O efeito colateral é pior que a imprecisão: como a volta depende da carga, o único jeito de recuperar um componente derrubado é o usuário baixar o RPS na mão. O simulador não tem nenhum mecanismo pelo qual o sistema se recupere sozinho, e portanto não consegue mostrar a diferença entre um sistema que aguenta um pico e um que não aguenta. A arquitetura que o aluno desenha nunca reage — só ele reage por ela.

Falta também o conceito inteiro de dimensionamento automático. `replicas` é um número fixo que o usuário digita e que nunca se move. Não existe forma de expressar "esse serviço deve crescer com a demanda até um teto", que é a decisão de arquitetura que a feature de autoscaling representa no mundo real. Sem ela, o aluno não tem como aprender o que um HPA resolve, nem — mais importante — o que ele **não** resolve: bater no teto de réplicas, ou escalar um banco cujo gargalo é escrita e ver a utilização não ceder.

Os dois problemas estão entrelaçados no código: uma única função decide tanto que a réplica morreu quanto que ela voltou, usando o mesmo sinal de utilização para as duas coisas. Enquanto forem um mecanismo só, nenhum dos dois pode ser modelado direito.

## Goals

- [x] Uma réplica caída volta por conta própria, num prazo que não depende da carga
- [x] O ciclo de vida da réplica e o dimensionamento são mecanismos separados e observáveis separadamente
- [x] Um componente pode ser configurado para crescer com a demanda, dentro de um piso e um teto
- [x] O aluno vê o autoscaler agir na tela, tick a tick, e vê quando ele deixa de dar conta
- [x] Um design salvo antes desta feature se comporta exatamente como antes
- [x] A IA avaliadora enxerga a configuração de autoscaling e pode criticá-la

## Solution

A feature entrega dois mecanismos ortogonais, na mesma entrega porque um sem o outro é pior que nenhum.

**Ciclo de vida da réplica.** A regra de recuperação por utilização morre. Uma réplica que cai é reiniciada após um atraso fixo, sem consultar a carga. A queda continua como está: utilização sustentadamente acima do teto derruba uma réplica por vez, e o componente só fica `down` quando a última morre. Isso torna o comportamento fiel — e faz aparecer o crash loop, que é real: sob sobrecarga sustentada e sem autoscaling, a réplica volta, é esmagada de novo, e cai de novo.

**Dimensionamento automático.** Cada componente pode, opcionalmente, ganhar um autoscaler: um piso, um teto e uma utilização-alvo. A cada tick ele calcula quantas réplicas seriam necessárias para trazer a utilização ao alvo e move o número desejado dentro dos limites. Cresce imediatamente, indo direto ao valor calculado — um pico de dez vezes é absorvido num tick. Encolhe devagar, só depois de a demanda menor se sustentar por um tempo, porque devolver capacidade cedo demais derruba o serviço na onda seguinte.

Na tela, o distintivo de réplicas que o nó já tem passa a se mexer durante a simulação: `x2` vira `x7` conforme a carga sobe. É essa mudança que mostra o autoscaler trabalhando. Quando ele encosta no teto, o distintivo diz isso explicitamente — é o momento em que o aluno descobre que o autoscaling acabou e o problema voltou a ser dele.

O autoscaler é opt-in e desligado por padrão, porque a lição está no contraste. Um aluno que nunca viu o sistema sofrer sem autoscaling não entende o que ele comprou com ele.

## User Stories

1. Como aluno de system design, quero que uma réplica derrubada volte sozinha depois de um tempo, para que eu aprenda que reinício de pod é um processo próprio e não uma consequência de a carga ter baixado.
2. Como aluno, quero que a volta da réplica não dependa da utilização, para que eu não saia do simulador achando que Kubernetes espera a fila esvaziar para subir um pod.
3. Como aluno, quero ver o crash loop acontecer quando a carga é insustentável e não há autoscaling, para que eu entenda por que `CrashLoopBackOff` é um estado que existe.
4. Como aluno, quero que a queda continue sendo gradual — uma réplica por vez —, para que eu veja a degradação parcial do componente em vez de um corte binário.
5. Como aluno, quero que um componente com várias réplicas continue servindo tráfego com parte delas mortas, para que eu entenda o valor de redundância.
6. Como aluno, quero ligar autoscaling num componente específico, para que eu declare no desenho quais partes do sistema devem crescer com a demanda.
7. Como aluno, quero que o autoscaling venha desligado por padrão, para que eu veja primeiro como o sistema sofre sem ele.
8. Como aluno, quero definir um número mínimo de réplicas, para que eu expresse o piso de disponibilidade que a arquitetura exige.
9. Como aluno, quero definir um número máximo de réplicas, para que eu expresse o limite de custo ou de capacidade da infraestrutura.
10. Como aluno, quero definir a utilização-alvo, para que eu escolha quanta folga o sistema mantém em regime permanente.
11. Como aluno, quero que o autoscaler reaja ao mesmo número de utilização que o nó exibe, para que eu consiga prever e conferir na mão o que ele vai fazer.
12. Como aluno, quero que o número de réplicas suba imediatamente diante de um pico, para que eu veja um sistema bem dimensionado absorver a onda em vez de morrer nela.
13. Como aluno, quero que o número de réplicas encolha devagar quando a carga cai, para que eu aprenda que devolver capacidade rápido demais é o que causa a segunda queda.
14. Como aluno, quero ver as réplicas sobrando por alguns segundos depois de um pico, para que eu perceba o custo real de manter folga.
15. Como aluno, quero que o autoscaler pare no teto que eu configurei, para que eu descubra que autoscaling não é capacidade infinita.
16. Como aluno, quero que o nó me diga quando está no teto, para que eu distinga "dimensionado corretamente" de "acabou o autoscaler".
17. Como aluno, quero ligar autoscaling num banco SQL sob carga de escrita e ver as réplicas subirem sem a utilização ceder, para que eu aprenda na prática que réplica de leitura não escala escrita.
18. Como aluno, quero que o autoscaling não ressuscite um componente cujas réplicas morreram todas, para que eu entenda que o autoscaler dimensiona, não conserta.
19. Como aluno, quero ver o distintivo de réplicas mudando durante a simulação, para que o autoscaling seja algo que eu observo acontecer e não um número em um formulário.
20. Como aluno, quero continuar vendo os quatro números do nó enquanto o autoscaler trabalha, para que eu consiga relacionar réplicas com utilização, latência e erro.
21. Como aluno, quero continuar podendo digitar o número inicial de réplicas mesmo com autoscaling ligado, para que eu controle de onde a simulação parte.
22. Como aluno, quero que um número inicial fora dos limites seja ajustado para dentro deles, para que eu não monte uma configuração contraditória sem perceber.
23. Como aluno, quero que parar e reiniciar a simulação volte ao ponto de partida, para que cada experimento comece do mesmo lugar.
24. Como usuário do simulador, quero que meus designs salvos antes desta feature continuem se comportando exatamente como antes, para que eu não perca o trabalho já feito.
25. Como usuário, quero que a configuração de autoscaling seja salva, carregada, exportada e importada junto com o resto do design, para que ela faça parte do artefato.
26. Como usuário, quero que um arquivo com autoscaling inválido seja rejeitado ou saneado em vez de quebrar a simulação, para que um JSON editado à mão não derrube o app.
27. Como aluno, quero que a IA avaliadora veja minha configuração de autoscaling, para que ela possa criticar um teto absurdo ou um HPA colocado onde não resolve.
28. Como aluno, quero que a crítica da IA sobre autoscaling se some ao resto do diagnóstico de arquitetura, para que eu receba uma leitura única do desenho e não um relatório separado.
29. Como aluno, quero que o componente em regime permanente bem dimensionado apareça saudável, para que a cor do nó continue significando o que diz.
30. Como aluno, quero que o âmbar signifique que algo não está sendo resolvido, para que eu saiba quando olhar.

## Implementation Decisions

Todas as decisões abaixo estão registradas como ADRs em `.specs/STATE.md` (AD-028 a AD-032), com o racional completo e as alternativas recusadas.

### Ciclo de vida (AD-028)

- A regra de recuperação baseada em utilização é **removida**, não flexibilizada. A função da engine que hoje decide queda e volta passa a ter as duas responsabilidades separadas: a queda continua governada por utilização sustentada, a volta passa a ser governada por um contador de reinício.
- Reinício com atraso fixo, expresso em ticks como as demais constantes de tempo da engine, e da mesma ordem de grandeza do limiar de queda.
- A granularidade continua sendo uma réplica por transição, preservando a degradação parcial.
- `aliveReplicas` é renomeado para `readyReplicas` em todo o código e nos tipos. É renomeação de vocabulário do domínio, não campo novo: "alive" sempre significou "pronta para receber tráfego", e "ready" é o termo que o ciclo de vida introduz.

### Modelo de estado (AD-029, AD-030)

Três números por componente, em três lugares diferentes:

| Número | Onde vive | Quem mexe |
| --- | --- | --- |
| réplicas iniciais | parâmetro do componente, persistido | usuário |
| réplicas desejadas | estado de simulação, não persistido | autoscaler, dentro do piso e do teto |
| réplicas prontas | estado de simulação, não persistido | ciclo de vida: queda derruba, reinício recompõe até o desejado |

Sem autoscaling, o desejado é o valor do parâmetro e não se move — o comportamento é o de hoje.

### Configuração (AD-029)

- Objeto opcional nos parâmetros do componente, com piso, teto e utilização-alvo. **A presença do objeto é o opt-in**; não há booleano separado, porque booleano ao lado dos campos permite persistir estado incoerente.
- A versão de schema **não** muda. É o quinto campo opcional adicionado sem bump, seguindo AD-009, AD-012, AD-015 e AD-020.
- A validação de persistência existente percorre chaves escalares e não serve para objeto aninhado; precisa de um ramo próprio que valide os três campos, seus tipos, suas faixas e a relação piso ≤ teto.
- ~~Nenhum tipo de componente é impedido de ligar autoscaling. Configurações que não ajudam são permitidas e produzem a consequência visível.~~ **Revertido pelo AD-054**: autoscaling só é oferecido nos tipos que já têm o campo `replicas` (`REPLICABLE_TYPES`: `service`, `worker`, `cache`, `sql`, `nosql`). O distintivo de réplicas — a única consequência visível na tela — já era restrito a `REPLICABLE_TYPES` desde antes desta feature; nos demais tipos, ligar autoscaling nunca produziu nenhum sinal observável, contradizendo a própria premissa desta decisão. `client`, `cdn`, `loadbalancer`, `gateway`, `queue` e `storage` perdem o controle no painel.

### Fórmula e estabilização (AD-030)

- `desejado = clamp(ceil(prontas × utilização / alvo), piso, teto)`, a fórmula do Kubernetes.
- O sinal é a **mesma utilização exibida no nó** — nenhum sinal paralelo, nenhuma média móvel própria.
- A base é o número de réplicas **prontas**, não o total configurado. É o que mantém os dois mecanismos ortogonais.
- Scale-up: no mesmo tick, direto ao valor calculado, sem degraus.
- Scale-down: só depois de uma janela de estabilização com o desejado abaixo do atual durante toda ela; qualquer tick acima reinicia a contagem. A janela é constante da engine, não configurável pelo usuário.
- A janela de scale-down é deliberadamente maior que o ciclo de reinício, para que os dois mecanismos não fiquem indistinguíveis na tela.
- Com zero réplicas prontas, o autoscaler **não calcula nada**. A utilização é infinita nesse caso e o produto seria `NaN`; além disso, ressuscitar é papel do reinício, não do dimensionamento.
- O autoscaler roda a cada tick. Não se tenta imitar o intervalo de sincronização do Kubernetes real: quem governa o comportamento é a estabilização.
- Ao ligar autoscaling, o valor inicial é o parâmetro de réplicas ajustado para dentro do piso e do teto.

### Defaults e saúde (AD-031)

- Piso 1, teto 10, alvo 60%.
- Os limiares de saúde do componente **não mudam**. O alvo de 60% foi escolhido justamente para o regime permanente ficar abaixo do limiar de degradação — um alvo de 80% pintaria de âmbar, permanentemente, um componente que está exatamente onde foi mandado ficar.
- 80% continua sendo um valor digitável pelo usuário. Só não é o default.

### Interface (AD-032)

- O distintivo de réplicas do nó é reaproveitado, sem elemento visual novo. Três formas: contagem simples, contagem parcial quando prontas < desejadas, e contagem no teto. O sufixo que indica autoscaling ligado e o que indica teto atingido são texto, não ícone.
- O número exibido passa a ser o desejado, que se move durante a simulação.
- No painel de propriedades, um controle liga o autoscaling e revela os três campos, dentro do grupo de réplicas já organizado pelo redesign da interface.
- Piso e teto reusam os limites já definidos para o parâmetro de réplicas; o alvo tem faixa própria.
- O campo de réplicas iniciais **continua visível** com autoscaling ligado.
- Nomes de classe novos introduzidos aqui entram no contrato de seletores estabelecido pelo AD-027.

### Avaliação por IA

Nenhuma mudança no módulo de avaliação. O prompt já serializa os nós inteiros, então a configuração de autoscaling chega ao modelo automaticamente — que é o comportamento desejado. Estado de execução (desejadas, prontas) **não** vai ao prompt, coerente com o AD-021.

## Testing Decisions

### O que faz um bom teste aqui

A feature é comportamento no tempo. Um bom teste avança a simulação por N ticks com uma carga dada e afirma sobre os números observáveis do componente — réplicas prontas, réplicas desejadas, utilização, estado de saúde. Ele **não** afirma sobre contadores internos de tick, nem sobre a existência de funções auxiliares, nem sobre a ordem em que a engine avalia os nós.

### Seams

Um só, e já existe: a função pura de tick da engine, exercitada encadeando estados de simulação. É o mesmo seam usado por toda a suíte de engine atual, é o mais alto disponível para lógica temporal, e não exige nada novo. Confirmado com o usuário durante o grilling.

Seams secundários, ambos já existentes: a validação de persistência (round-trip de design) e um caso de ponta a ponta pelo navegador.

Prior art direta: os testes de tick que já cobrem queda de réplica, degradação parcial e a assimetria leitura/escrita dos bancos.

### Casos de engine — o gate real

| # | Cenário | Espera |
| --- | --- | --- |
| 1 | Sem autoscaling, carga estável | Comportamento idêntico ao atual (regressão) |
| 2 | Sem autoscaling, sobrecarga sustentada | Réplica cai no prazo de queda, volta no prazo de reinício, cai de novo — ciclo estável, sem qualquer dependência de utilização baixa |
| 3 | Autoscaling, pico de dez vezes | Desejado sobe direto ao valor da fórmula num único tick |
| 4 | Autoscaling, carga cai | Desejado só encolhe depois da janela inteira; um tick acima da condição zera a janela |
| 5 | Autoscaling, carga acima do que o teto cobre | Trava no teto, utilização segue alta, réplica volta a cair pelo ciclo de vida |
| 6 | Zero réplicas prontas | Autoscaler não calcula, nenhum `NaN` em nenhuma métrica; só o reinício ressuscita |
| 7 | SQL write-bound com autoscaling | Desejado sobe até o teto e a utilização de escrita não cede (AD-010 preservado) |
| 8 | Réplicas iniciais fora dos limites | Simulação começa no valor ajustado para dentro do piso |
| 9 | Regime permanente no alvo default | Componente fica saudável, não degradado (AD-031) |

### Persistência

Round-trip do objeto de autoscaling: salvar, carregar, exportar, importar. Design sem o campo carrega e roda como antes. Objeto malformado (campos faltando, tipos errados, fora de faixa, piso maior que teto) é saneado ou rejeitado sem quebrar a simulação.

### Ponta a ponta

**Um** caso, coerente com o escopo mínimo firmado no AD-018: ligar autoscaling pelo painel de propriedades, rodar sob carga alta e observar o distintivo do nó sair da contagem inicial e chegar ao estado de teto.

Testes de screenshot são explicitamente recusados: a feature é um número que se move no tempo, exatamente a fragilidade que o AD-027 já rejeitou.

## Out of Scope

- **Backoff exponencial de reinício.** O `CrashLoopBackOff` real, com atraso crescente a cada morte. Recusado agora por exigir contagem de reinícios por nó no estado de simulação e por sumir com a réplica por dezenas de segundos numa simulação observada em segundos — pareceria bug. No backlog.
- **Janela de scale-down configurável.** Quarto campo que quase ninguém ajustaria, cobrando em interface e em teste. Constante da engine. No backlog.
- **Série temporal de réplicas** e qualquer gráfico ou sparkline de histórico. Exigiria memória no estado de simulação além do tick anterior, que a engine não tem. No backlog.
- ~~**Bloquear autoscaling em tipos que não escalam bem.** Decisão explícita: permitir e deixar a consequência ensinar.~~ **Revertido pelo AD-054** — ver Configuração acima.
- **Mudar os limiares de saúde** para acomodar um alvo de 80%.
- **Autoscaling por sinal que não seja utilização** (RPS absoluto, profundidade de fila, métrica customizada).
- **Circuit breaker / load shedding.** Continua no backlog, independente desta feature.
- **Custo em dinheiro** por réplica ou qualquer modelagem financeira.

## Further Notes

Duas consequências desta feature são deliberadas e não devem ser tratadas como defeito por quem implementar ou revisar:

1. **Sem autoscaling e sob sobrecarga sustentada, o componente oscila.** Cai, reinicia, cai de novo, num ciclo estável. Isso é crash loop, é o comportamento correto, e é precisamente o que motiva o autoscaler. Se o revisor achar isso feio, a resposta é ligar o autoscaling — não é reintroduzir a regra de utilização.

2. **Com autoscaling ligado e teto folgado, quedas de réplica praticamente desaparecem.** O scale-up imediato não deixa a utilização permanecer no patamar que derruba réplicas. O ciclo de vida passa a se manifestar quase só quando o autoscaler bate no teto ou quando o gargalo é escrita — que é exatamente onde ele deve aparecer.

A ordem de implementação natural é ciclo de vida antes do autoscaler: o segundo depende da definição de "réplica pronta" que o primeiro estabelece, e a renomeação de vocabulário toca muitos arquivos e é melhor absorvida cedo.
