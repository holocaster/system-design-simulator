# Simulador de System Design - Especificacao

## Problem Statement

Nao existe uma forma pratica e visual de aprender system design vendo o sistema "rodar": montar uma arquitetura com componentes reais (load balancer, services, cache, bancos, filas) e observar o trafego fluir, os gargalos aparecerem e o sistema quebrar sob carga. Ferramentas como o System Design Arena focam em avaliacao estatica; queremos uma simulacao viva e didatica.

## Goals

- [ ] Usuario monta uma arquitetura por drag-and-drop e a simula com trafego animado e metricas em menos de 2 minutos
- [ ] Sob carga acima da capacidade, o sistema mostra visivelmente degradacao e queda de componentes
- [ ] Usuario recebe feedback escrito de IA sobre seu design

## Out of Scope

| Feature | Motivo |
| ------- | ------ |
| Backend proprio / contas de usuario | localStorage e suficiente; zero infraestrutura |
| Colaboracao multi-usuario | Escopo de produto muito maior |
| Simulacao de eventos discretos detalhada (percentis reais, filas internas) | Modelo didatico simples atende o objetivo |
| Mobile / touch | Foco em desktop |
| Componentes avancados (sharding, replica sets, DNS, service mesh) | Conjunto inicial de 10 componentes atende o MVP |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Chamada a API OpenRouter direto do browser | Chave e model ID escolhidos pelo usuario em localStorage; Bearer token via `fetch` | Evita backend/proxy e permite escolher o provedor/modelo | y |
| Modelo de simulacao | Tick-based simples: a cada tick, carga propaga pelo grafo a partir do Cliente; cada componente tem capacidade (RPS) e latencia base | Didatico, deterministico, simples de implementar e testar | y |
| Valores default de capacidade/latencia por tipo | Definidos no Design com valores realistas de ordem de grandeza (ex.: cache mais rapido que SQL) | Nao ha valores canonicos; ordem de grandeza basta para didatica | y |
| Regras de conexao entre componentes | Matriz de conexoes validas definida no Design (ex.: Cliente -> CDN/LB/Gateway; Cache nao aponta para LB) | Evita designs sem sentido; detalhes sao decisao tecnica | y |
| Desafios pre-definidos para avaliacao | Avaliacao funciona sobre o design atual + metricas da simulacao; desafios prontos sao P3 | Feedback de IA util mesmo sem desafio formal | y |
| Distribuicao de trafego em fan-out | Load balancer divide igualmente entre destinos; demais componentes replicam a chamada para cada destino conectado | Comportamento intuitivo e simples | y |
| Cache hit ratio | Parametro configuravel do componente Cache (default 80%); hits nao propagam carga downstream | Nucleo do valor didatico do cache | y |
| Taxa de erro base por componente | Parametro 0-100% (default 0%); aplica-se aos requests processados (consomem capacidade e falham); requests falhos nao propagam downstream | Simula falhas intrinsecas (ex.: 1% de erro ao persistir no banco) sem complicar o default | y |

**Open questions:** nenhuma - todas resolvidas ou registradas acima.

---

## User Stories

### P1: Montar arquitetura no canvas ⭐ MVP

**User Story**: Como estudante de system design, quero arrastar componentes para um canvas e conecta-los, para montar visualmente uma arquitetura.

**Why P1**: Sem o builder, nada existe. E a fundacao de tudo.

**Acceptance Criteria**:

1. WHEN o usuario arrasta um componente da paleta para o canvas THEN o sistema SHALL criar um no daquele tipo na posicao solta
2. WHEN o usuario liga a saida de um componente a entrada de outro THEN o sistema SHALL criar uma conexao visivel entre eles
3. WHEN o usuario tenta uma conexao invalida pela matriz de regras THEN o sistema SHALL rejeitar a conexao e indicar visualmente o motivo
4. WHEN o usuario seleciona um no THEN o sistema SHALL exibir um painel com os parametros do componente (capacidade em RPS, latencia base, taxa de erro base em % com default 0, e parametros especificos como hit ratio do cache)
5. WHEN o usuario edita um parametro com valor fora dos limites definidos THEN o sistema SHALL bloquear o valor e mostrar o limite aceito
6. WHEN o usuario deleta um no THEN o sistema SHALL remover o no e todas as suas conexoes

**Paleta (10 componentes)**: Cliente (fonte de trafego), CDN, Load Balancer, API Gateway, Service, Cache, Banco SQL, Banco NoSQL, Fila, Object Storage (S3).

**Independent Test**: Montar Cliente -> Load Balancer -> 2 Services -> Cache -> SQL no canvas, editar capacidade de um Service, deletar um no e ver as conexoes sumirem.

---

### P1: Simular trafego com metricas ⭐ MVP

**User Story**: Como estudante, quero definir uma carga (RPS) e ver o trafego animado fluindo pela arquitetura com metricas por componente, para entender como o sistema se comporta.

**Why P1**: "Ver rodando" e o coracao do produto.

**Acceptance Criteria**:

1. WHEN o usuario clica em Iniciar simulacao com um design valido (Cliente conectado a pelo menos um componente) THEN o sistema SHALL animar pontos de trafego fluindo pelas conexoes a partir do Cliente
2. WHEN o usuario move o slider de RPS (limites 1 a 100.000) THEN o sistema SHALL recalcular a propagacao de carga no proximo tick sem reiniciar a simulacao
3. WHEN a simulacao esta rodando THEN cada componente SHALL exibir utilizacao (%), throughput (RPS), latencia efetiva e taxa de erro
4. WHEN a simulacao esta rodando THEN o sistema SHALL exibir metricas globais: latencia ponta-a-ponta do caminho critico e taxa de sucesso total
5. WHEN o trafego passa por um Cache THEN apenas a fracao de misses SHALL propagar para os componentes downstream
6. WHEN o usuario clica em Parar THEN o sistema SHALL congelar a animacao e zerar as metricas
7. WHEN o usuario inicia a simulacao sem um no Cliente conectado THEN o sistema SHALL exibir mensagem clara e nao iniciar
8. WHEN um componente tem taxa de erro base maior que 0% THEN essa fracao dos requests processados SHALL falhar mesmo sem sobrecarga, somando-se aos erros de sobrecarga nas metricas do componente e na taxa de sucesso global

**Independent Test**: Montar Cliente -> LB -> Service -> SQL, iniciar com 100 RPS, ver animacao e metricas coerentes (throughput do SQL igual ao dos misses propagados), subir o slider e ver os numeros mudarem.

---

### P2: Gargalos, degradacao e queda de componentes

**User Story**: Como estudante, quero ver componentes degradarem e cairem quando a carga excede a capacidade, para aprender onde estao os gargalos e como corrigi-los.

**Why P2**: E o climax didatico, mas depende da simulacao P1 funcionando.

**Acceptance Criteria**:

1. WHEN a carga de um componente esta abaixo de 70% da capacidade THEN o componente SHALL aparecer verde (saudavel)
2. WHEN a carga fica entre 70% e 100% THEN o componente SHALL aparecer amarelo e sua latencia efetiva SHALL crescer progressivamente
3. WHEN a carga excede 100% THEN o componente SHALL aparecer vermelho e os requests excedentes SHALL falhar (contam na taxa de erro)
4. WHEN a carga excede 150% da capacidade por mais de 3 segundos THEN o componente SHALL cair (estado down): para de responder e 100% dos requests que chegam a ele falham
5. WHEN um componente esta down e a carga que chega a ele fica abaixo de 50% da capacidade por 5 segundos THEN o componente SHALL se recuperar sozinho
6. WHEN um componente cai THEN os componentes downstream SHALL receber zero trafego dele e os upstream SHALL registrar as falhas
7. WHEN um Load Balancer tem um destino down THEN ele SHALL redistribuir o trafego apenas entre os destinos saudaveis

**Independent Test**: Montar Cliente -> LB -> 1 Service (capacidade 100 RPS), subir para 200 RPS, ver o Service ficar vermelho e cair; adicionar um segundo Service ao LB e ver o sistema se recuperar.

---

### P2: Salvar, carregar e exportar designs

**User Story**: Como usuario, quero salvar meus designs e reabri-los depois, para nao perder meu trabalho.

**Why P2**: Importante para uso real, mas o app funciona sem isso numa sessao.

**Acceptance Criteria**:

1. WHEN o usuario salva um design com um nome THEN o sistema SHALL persisti-lo no localStorage (sobrescrevendo design de mesmo nome)
2. WHEN o usuario abre a lista de designs salvos THEN o sistema SHALL listar nomes e permitir carregar ou excluir cada um
3. WHEN o usuario exporta THEN o sistema SHALL baixar um arquivo JSON com o design completo (nos, conexoes, parametros)
4. WHEN o usuario importa um JSON valido THEN o sistema SHALL restaurar o design no canvas
5. WHEN o usuario importa um JSON invalido ou de schema desconhecido THEN o sistema SHALL rejeitar com mensagem clara e manter o canvas atual intacto
6. WHEN o localStorage falha ao salvar (cheio/indisponivel) THEN o sistema SHALL informar o erro sem perder o design em memoria

**Independent Test**: Salvar um design, recarregar a pagina, carregar o design e ver o canvas identico; exportar, limpar, importar e conferir.

---

### P3: Avaliacao do design por IA

**User Story**: Como estudante, quero enviar meu design para avaliacao por IA e receber feedback escrito, como numa entrevista de system design.

**Why P3**: Alto valor, mas depende de chave de API do usuario e do design+simulacao prontos.

**Acceptance Criteria**:

1. WHEN o usuario informa sua chave da API OpenRouter e escolhe um model ID nas configuracoes THEN o sistema SHALL guarda-los apenas em localStorage (nunca em codigo ou arquivos do projeto)
2. WHEN o usuario clica em Avaliar design THEN o sistema SHALL enviar o model ID escolhido, o snapshot do design (componentes, conexoes, parametros) e as metricas da ultima simulacao para a API OpenRouter e exibir o feedback escrito em portugues
3. WHEN a chamada a API falha (chave invalida, rede, timeout de 60s) THEN o sistema SHALL exibir mensagem de erro clara e manter o design intacto
4. WHEN nao ha chave configurada THEN o botao Avaliar SHALL levar o usuario para a tela de configuracao da chave
5. WHEN o usuario seleciona um desafio pre-definido (minimo 2 disponiveis) THEN a avaliacao SHALL considerar os requisitos do desafio no prompt

**Independent Test**: Configurar chave, montar um design, simular, clicar Avaliar e receber feedback textual coerente; testar com chave invalida e ver o erro tratado.

---

## Edge Cases

- WHEN o canvas esta vazio e o usuario inicia a simulacao THEN o sistema SHALL exibir orientacao (estado vazio) em vez de erro
- WHEN o usuario cria um ciclo de conexoes (A -> B -> A) THEN o sistema SHALL rejeitar a conexao que fecha o ciclo
- WHEN um componente nao tem caminho a partir do Cliente THEN ele SHALL permanecer ocioso (0 RPS) sem quebrar a simulacao
- WHEN o usuario deleta um no durante a simulacao THEN a simulacao SHALL continuar sem o no, recalculando o fluxo no proximo tick
- WHEN existem multiplos nos Cliente THEN a carga total SHALL ser a soma das cargas de cada Cliente

## Sweep de dimensoes implicitas

| Dimensao | Resolucao |
| -------- | --------- |
| Validacao de entrada e limites | Coberta: limites de parametros (P1-AC5), slider 1-100k (SIM-04), import JSON validado (SIM-07) |
| Falhas / falhas parciais | Coberta: falha da API de IA (SIM-08), falha de localStorage (SIM-07), queda de componentes (SIM-06) |
| Idempotencia / retry / duplicatas | N/A because app local single-user; unica operacao externa (avaliacao IA) e manualmente disparada e sem efeito colateral |
| Auth e rate limits | Coberta parcialmente: chave de API so em localStorage (SIM-08). Sem auth propria - N/A because nao ha backend |
| Concorrencia / ordenacao | N/A because simulacao roda em loop unico no browser; sem escrita concorrente |
| Ciclo de vida dos dados | Coberta: designs vivem no localStorage ate exclusao explicita pelo usuario (SIM-07) |
| Observabilidade | N/A because app client-side; as proprias metricas da simulacao sao o produto |
| Falha de dependencia externa | Coberta: unica dependencia externa e a API OpenRouter (SIM-08 AC3) |
| Integridade de transicoes de estado | Coberta: healthy -> degraded -> overloaded -> down -> recovered com limiares explicitos (SIM-06) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SIM-01 | P1: Canvas - paleta e drag-and-drop | T2, T7-T9 | Verified |
| SIM-02 | P1: Canvas - conexoes com validacao | T2, T3, T9, T10 | Verified |
| SIM-03 | P1: Canvas - configuracao de parametros | T2, T7, T11 | Verified |
| SIM-04 | P1: Simulacao - trafego animado e slider RPS | T4, T7, T12, T14 | Verified |
| SIM-05 | P1: Simulacao - metricas por componente e globais | T4, T6, T12, T13, T21, T22 | Verified |
| SIM-06 | P2: Degradacao, queda e recuperacao | T5, T13, T20, T21 | Verified |
| SIM-07 | P2: Persistencia localStorage + export/import | T15, T16 | Verified |
| SIM-08 | P3: Avaliacao por IA | T17-T19 | Verified |

**Coverage:** 8 total, 8 mapeados em tasks, 0 nao mapeados.

---

## Success Criteria

- [ ] Usuario monta e simula uma arquitetura de 5 componentes em menos de 2 minutos
- [x] Sobrecarregar um componente produz feedback visual (cores + queda) em ate 3 segundos
- [x] Metricas da simulacao sao coerentes (conservacao de fluxo: entrada = sucesso + erro local em cada componente)
- [ ] Avaliacao por IA retorna feedback textual em portugues referente ao design enviado
