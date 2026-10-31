# Autoscaling e Ciclo de Vida de Réplicas - Tickets

Spec: `.specs/features/autoscaling/spec.md`
ADRs: AD-028, AD-029, AD-030, AD-031, AD-032 em `.specs/STATE.md`

Caminho crítico: T1/T2 (paralelos) → T3 → T4 → T5

---

# T1 — Ciclo de vida da réplica

**Status:** done

**Blocked by:** nada — pode começar imediatamente

**What to build**

Uma réplica que caiu volta sozinha depois de um prazo fixo, sem consultar a
carga do componente. A regra atual, que só devolve a réplica quando a
utilização fica abaixo de 50% por 5 segundos, deixa de existir — não é
afrouxada, é removida.

Rodando o simulador sob carga insustentável e sem autoscaling, o usuário passa
a ver o crash loop: a réplica cai, volta pouco depois, é esmagada de novo e cai
outra vez, num ciclo estável. Isso é o comportamento correto (AD-028), não um
defeito a corrigir.

A queda continua exatamente como está: utilização sustentadamente acima do teto
derruba uma réplica por vez, e o componente só fica `down` quando a última
morre. A degradação parcial do AD-010 é preservada.

Este ticket também faz a renomeação de vocabulário `aliveReplicas` →
`readyReplicas` em tipos, engine, UI e testes. "Alive" sempre significou
"pronta para receber tráfego"; "ready" é o termo que o ciclo de vida introduz e
o que o T3 vai usar na fórmula. O raio de alcance é pequeno (poucos arquivos),
então não precisa de expand-contract — uma passada só.

**Acceptance criteria**

- [x] Sob sobrecarga sustentada, a réplica cai no prazo de queda atual e volta
      no prazo de reinício, independentemente da utilização estar alta
- [x] O ciclo se repete de forma estável enquanto a carga insustentável durar
- [x] Nenhum caminho de código faz a volta de uma réplica depender de
      utilização
- [x] A queda continua sendo de uma réplica por transição
- [x] O componente só fica `down` quando a última réplica morre
- [x] Com carga estável e sem sobrecarga, o comportamento é idêntico ao atual
      (caso de regressão explícito)
- [x] A constante de reinício vive junto das demais constantes de tempo da
      engine, expressa em ticks
- [x] `aliveReplicas` não existe mais no código; `readyReplicas` ocupa seu lugar
      em tipos, engine, UI e testes
- [x] O distintivo de réplicas do nó continua exibindo contagem parcial quando
      prontas < total
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde, playwright
      verde

---

# T2 — Configuração de autoscaling

**Status:** done

**Blocked by:** nada — pode começar imediatamente

**What to build**

O usuário liga autoscaling num componente pelo painel de propriedades e define
piso, teto e utilização-alvo. A configuração faz parte do artefato: sobrevive a
salvar, recarregar a página, exportar e importar.

A engine ainda ignora a configuração neste ticket — o autoscaler entra no T3.
O que funciona ponta a ponta aqui é o ciclo de vida da configuração em si
(histórias 25 e 26 da spec).

A configuração é um objeto opcional nos parâmetros do componente, com os três
campos. **A presença do objeto é o opt-in** — não existe booleano separado
(AD-029), porque um booleano ao lado dos campos permitiria persistir estado
incoerente. A versão de schema não muda: é o quinto campo opcional adicionado
sem bump, seguindo AD-009, AD-012, AD-015 e AD-020.

A validação de persistência existente percorre chaves escalares e não serve
para objeto aninhado. Precisa de um ramo próprio que valide os três campos,
seus tipos, suas faixas e a relação piso ≤ teto. Um arquivo com autoscaling
malformado é saneado ou rejeitado, nunca quebra a simulação.

Defaults: piso 1, teto 10, alvo 60% (AD-031). O alvo é 60% e não 80% de
propósito — 80% colidiria com o limiar de degradação do componente e pintaria
de âmbar, permanentemente, um nó que está exatamente onde foi mandado ficar.
80% continua digitável, só não é o default.

O campo de réplicas iniciais **continua visível** com autoscaling ligado
(AD-032): ele segue governando de onde a simulação parte.

~~Nenhum tipo de componente é impedido de ligar autoscaling. Configurações que
não ajudam são permitidas e a consequência é a aula (AD-029).~~ **Revertido
pelo AD-054**: o controle só é oferecido em `REPLICABLE_TYPES` (`service`,
`worker`, `cache`, `sql`, `nosql`).

**Acceptance criteria**

- [x] O painel de propriedades tem um controle que liga o autoscaling e revela
      os três campos
- [x] Os controles ficam no grupo de réplicas já organizado pelo redesign da
      interface
- [x] Autoscaling vem desligado por padrão em todo componente novo
- [x] Piso e teto reusam os limites já definidos para o parâmetro de réplicas;
      o alvo tem faixa própria de 10% a 100%
- [x] Piso ≤ teto é garantido
- [x] O campo de réplicas iniciais continua visível e editável com autoscaling
      ligado
- [x] A configuração faz round-trip: salvar, carregar, exportar, importar
- [x] Um design salvo sem o campo carrega e se comporta exatamente como antes
- [x] A versão de schema não muda
- [x] Objeto malformado (campo faltando, tipo errado, fora de faixa, piso maior
      que teto) é saneado ou rejeitado sem quebrar a simulação
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde, playwright
      verde

---

# T3 — Autoscaler na engine e distintivo do nó

**Status:** done

**Blocked by:** T1, T2

**What to build**

Com autoscaling ligado, o número de réplicas passa a subir com a demanda, e o
usuário vê isso acontecer: o distintivo do nó sai de `x2` e chega a `x7`
durante um pico. É essa mudança na tela que mostra o autoscaler trabalhando.

A cada tick, o autoscaler calcula quantas réplicas trariam a utilização ao
alvo, usando a fórmula do Kubernetes (AD-030):

```
desejado = clamp(ceil(prontas × utilização / alvo), piso, teto)
```

O sinal é a **mesma utilização que o nó exibe** — nenhum sinal paralelo,
nenhuma média móvel própria. A base é o número de réplicas **prontas**, não o
total configurado: é isso que mantém o autoscaler e o ciclo de vida do T1
ortogonais.

Scale-up é imediato e vai direto ao valor calculado, sem degraus — um pico de
dez vezes é absorvido num tick. Neste ticket, o encolhimento é imediato também;
a estabilização entra no T4.

O modelo de estado passa a ter três números por componente:

| Número | Onde vive | Quem mexe |
| --- | --- | --- |
| réplicas iniciais | parâmetro do componente, persistido | usuário |
| réplicas desejadas | estado de simulação, não persistido | autoscaler, dentro do piso e do teto |
| réplicas prontas | estado de simulação, não persistido | ciclo de vida do T1 |

Sem autoscaling, o desejado é o valor do parâmetro e não se move — o
comportamento é o de hoje. As réplicas desejadas **não** são persistidas: um
design salvo em pleno pico voltaria com 12 réplicas e nenhuma explicação.

Ao ligar autoscaling, o valor inicial é o parâmetro de réplicas ajustado para
dentro do piso e do teto, para que `replicas=1` com `piso=3` não seja uma
contradição silenciosa.

Com zero réplicas prontas o autoscaler **não calcula nada**: a utilização é
infinita nesse caso e o produto daria `NaN`. Ressuscitar é papel do reinício do
T1, não do dimensionamento.

O distintivo do nó é reaproveitado, sem elemento visual novo (AD-032). Passa a
exibir o desejado, com sufixo indicando autoscaling ligado, contagem parcial
quando prontas < desejadas, e um estado próprio quando o desejado encostou no
teto. O sufixo de teto carrega a única informação que o número sozinho não dá:
`x10` e `x10 (max)` são idênticos sem o rótulo, e é a diferença entre
"dimensionado" e "acabou o autoscaler, o problema agora é seu". Texto, não
ícone — sem emoji, sem glifo que precise de legenda.

Os quatro números do nó (Util, RPS, Lat, Err) continuam onde estão (AD-025).

**Acceptance criteria**

- [x] Diante de um pico de dez vezes, o desejado sobe direto ao valor da fórmula
      num único tick
- [x] O autoscaler nunca ultrapassa o teto nem desce abaixo do piso
- [x] Com a carga acima do que o teto cobre, o desejado trava no teto, a
      utilização segue alta e a réplica volta a cair pelo ciclo de vida do T1
- [x] Com zero réplicas prontas, o autoscaler não calcula e nenhuma métrica do
      componente vira `NaN`; só o reinício do T1 ressuscita
- [x] Num SQL sob carga de escrita, o desejado sobe até o teto e a utilização de
      escrita não cede — AD-010 preservado
- [x] Réplicas iniciais fora dos limites fazem a simulação começar no valor
      ajustado para dentro deles
- [x] Em regime permanente no alvo default, o componente aparece saudável e não
      degradado (AD-031)
- [x] Sem autoscaling, o comportamento é idêntico ao pós-T1 (caso de regressão
      explícito)
- [x] O desejado não é persistido; parar e reiniciar a simulação volta ao ponto
      de partida
- [x] O distintivo exibe o desejado com sufixo de autoscaling, contagem parcial
      quando prontas < desejadas, e estado próprio no teto
- [x] Os quatro números do nó continuam visíveis
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde, playwright
      verde

---

# T4 — Estabilização de scale-down

**Status:** done

**Blocked by:** T3

**What to build**

O autoscaler para de devolver capacidade no instante em que a carga cai. Ele só
encolhe depois que a demanda menor se sustentou por uma janela inteira; um
único tick acima da condição zera a contagem e a janela recomeça.

Essa assimetria é a lição, não um detalhe de tuning (AD-030): adicionar
capacidade é barato e reversível, tirar capacidade cedo demais derruba o
serviço na próxima onda. Com janelas simétricas, o autoscaler pareceria um
termostato e o aluno perderia a única intuição que o Kubernetes real ensina
aqui.

A janela é uma constante da engine, deliberadamente maior que o ciclo de
reinício do T1 — se fossem da mesma ordem de grandeza, o autoscaler encolheria
no meio de um crash loop e os dois mecanismos ficariam indistinguíveis na tela.
Não é configurável pelo usuário: seria um quarto campo que quase ninguém
ajustaria, cobrando em interface e em teste.

Consequência aceita e visível: depois de um pico, o componente fica com
réplicas sobrando por alguns segundos. É folga aparente e é o preço correto.

**Acceptance criteria**

- [x] Quando a carga cai, o desejado só encolhe depois da janela inteira
- [x] Um único tick com o desejado acima da condição zera a janela e a contagem
      recomeça do zero
- [x] Scale-up continua imediato — a janela não atrasa crescimento
- [x] A janela é constante da engine, junto das demais constantes de tempo, e
      não aparece em nenhum controle da interface
- [x] A janela é maior que o prazo de reinício do T1
- [x] Depois de um pico, as réplicas sobrando permanecem pela duração da janela
      antes de serem devolvidas
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde, playwright
      verde

---

# T5 — Caso ponta a ponta

**Status:** done

**Blocked by:** T4

**What to build**

Um caso Playwright que exercita a feature pelo navegador: ligar autoscaling num
componente pelo painel de propriedades, iniciar a simulação sob carga alta, e
observar o distintivo do nó sair da contagem inicial e chegar ao estado de
teto.

Escopo de um caso só, coerente com o mínimo firmado no AD-018. Os nomes de
classe introduzidos pelo T3 no distintivo entram no contrato de seletores do
AD-027 a partir daqui: o CSS por trás é reescrito à vontade, o nome fica.

Testes de screenshot são recusados explicitamente: a feature é um número que se
move no tempo, exatamente a fragilidade que o AD-027 já rejeitou.

**Acceptance criteria**

- [x] Um caso e2e liga autoscaling pelo painel de propriedades
- [x] O caso roda a simulação sob carga alta o suficiente para forçar o teto
- [x] O caso afirma que o distintivo saiu da contagem inicial e chegou ao estado
      de teto
- [x] Os seletores usados estão registrados como contrato do AD-027
- [x] Nenhum teste de screenshot é adicionado
- [x] `npm run build` verde, `oxlint` limpo, suíte vitest verde, playwright
      verde
