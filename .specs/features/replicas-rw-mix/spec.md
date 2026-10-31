# Replicas + Mix Leitura/Escrita - Especificacao

## Problem Statement

O simulador trata cada componente como uma instancia unica e todo RPS como homogeneo. Nao da para representar um service no EKS com N replicas, nem ensinar as licoes centrais de escala: read replica SQL nao escala escrita, sharding NoSQL escala, e cache so alivia leitura. Sem isso, o teto de RPS do sistema nao reflete arquiteturas reais.

## Goals

- [ ] Usuario define replicas em service, worker, cache, sql e nosql e ve o teto de RPS do no crescer
- [ ] Sob sobrecarga prolongada, replicas caem uma a uma (espiral de morte visivel) e se recuperam uma a uma
- [ ] Usuario controla o mix global de leitura/escrita e ve a escrita virar gargalo no SQL mesmo com muitas replicas
- [ ] NoSQL com shards mostra escrita escalando, em contraste com SQL
- [ ] Cache deixa de aliviar trafego de escrita

## Out of Scope

| Feature | Motivo |
| ------- | ------ |
| Autoscaling (HPA) | Feature propria; replicas aqui sao fixas por configuracao |
| Hot shard / skew de chaves | Distribuicao uniforme e suficiente para a licao didatica |
| Falha aleatoria de replica (chaos) | Queda so por sobrecarga neste escopo |
| Mix R/W por conexao (edge) | Mix e global; decisao de contexto |

## Requirements

### Replicas

- R1: Nos service, worker, cache, sql e nosql tem parametro `replicas` (inteiro 1-20, default 1); `capacity` passa a ser por replica
- R2: Capacidade efetiva = capacity x replicas vivas; utilizacao do no usa capacidade efetiva
- R3: Maquina de saude generalizada: janela de sobrecarga sustentada (utilizacao > 150% da capacidade viva por 30 ticks) derruba UMA replica; no fica down quando 0 vivas; janela de recuperacao (utilizacao < 50% da capacidade viva por 50 ticks) traz UMA replica de volta. Com replicas=1 o comportamento e identico ao atual (mesmos limiares e ticks)
- R4: Drain da fila usa capacidade efetiva (replicas vivas) dos consumidores

### Mix leitura/escrita

- R5: Controle global "Escritas (%)" (0-100) junto ao controle de RPS; engine propaga dois fluxos (leitura e escrita) por todo o grafo com as mesmas regras de distribuicao (LB divide, fan-out duplica, fila enfileira)
- R6: Cache/CDN: hit ratio aplica somente a leituras; escritas seguem integralmente para o downstream
- R7: SQL: teto de escrita = capacity x 1 (primaria); teto de leitura = capacity x replicas vivas; utilizacao = max(escritaRps/tetoEscrita, leituraRps/tetoLeitura)
- R8: NoSQL: parametro `shards` (inteiro 1-20, default 1); teto de escrita = capacity x shards; teto de leitura = capacity x shards x replicas vivas; utilizacao = max dos dois
- R9: Excesso de um fluxo vira erro daquele fluxo (conservacao: entrada = sucesso + erro por fluxo e no agregado)

### UI e persistencia

- R10: Badge de replicas no no: "xN" normal; durante degradacao parcial "vivas/N" com cor de alerta
- R11: Metricas do no mostram utilizacao agregada e replicas vivas/total; bancos mostram quebra de utilizacao W/R
- R12: Painel de propriedades edita `replicas` (e `shards` no NoSQL) com validacao de limites, no padrao dos campos existentes
- R13: `DesignNode` persiste `replicas` e `shards` (opcionais); designs antigos carregam com default 1; validacao de import rejeita valores fora de 1-20
- R14: Payload da avaliacao por IA inclui os novos parametros e o mix global

## Assumptions & Open Questions

- NoSQL: shards escalam leitura e escrita; replicas (por shard) so leitura; chaves uniformes (default do agente, nao discutido)
- Client, gateway, LB, fila e storage nao tem replicas neste escopo; escalam so via capacity
- Default de "Escritas (%)": 20 (discricao do agente)
- O mix global nao e persistido no design (como o RPS, e um controle de simulacao, nao de arquitetura)

## Impacto no RPS do sistema (racional didatico)

O RPS maximo sustentavel continua sendo o menor teto ao longo do caminho critico, mas os tetos passam a ser compostos:

- Service/worker/cache: capacity x replicas vivas
- SQL: min entre teto de leitura (escala com replicas) e teto de escrita (fixo na primaria) ponderado pelo mix — com 20% de escrita, o sistema atinge o teto quando escritaRps = capacity, ou seja RPS total = capacity / 0.2, nao importa quantas read replicas existam
- NoSQL: escrita escala com shards, entao o mesmo mix sustenta RPS total = (capacity x shards) / 0.2
- Cache reduz a leitura que chega ao banco (hit ratio), mas nao reduz escrita — depois de um cache o trafego fica proporcionalmente mais pesado em escrita
