# Replicas + Mix Leitura/Escrita - Context

**Gathered:** 2026-07-17
**Spec:** `.specs/features/replicas-rw-mix/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Representar escala horizontal (replicas) em service, worker, cache e bancos, e um mix global de leitura/escrita que revela os tetos reais de RPS: read replica SQL nao escala escrita; sharding NoSQL escala; cache so alivia leitura.

---

## Implementation Decisions

### Forma de representar replicas

- Parametro `replicas` no proprio no (nao nos explicitos atras de LB)
- Aplica a: service, worker, cache, sql, nosql
- `capacity` e por replica; capacidade efetiva = capacity x replicas vivas
- Limite: 1 a 20; default 1
- Saude com degradacao parcial: generaliza a maquina atual — sobrecarga sustentada derruba UMA replica por janela (espiral de morte em cascata); no down quando todas morrem; recuperacao traz UMA replica por janela. Com replicas=1 o comportamento e identico ao atual.

### Mix leitura/escrita

- Global, no controle de carga: campo "Escritas (%)" ao lado do RPS
- Engine propaga dois fluxos (leitura e escrita) por todo o grafo
- Cache: hit ratio vale SO para leituras; escritas atravessam direto para o downstream (write-through)
- SQL: `replicas` = total de instancias (1 = so primaria). Teto de escrita = capacity x 1; teto de leitura = capacity x replicas vivas
- Utilizacao do banco = max(util escrita, util leitura) — o pior dos dois dirige degradacao e queda

### Visual e metricas

- Badge no no: "x5" normal; durante degradacao "3/5" com cor de alerta
- Metricas do no: utilizacao agregada + replicas vivas/total; bancos mostram quebra W/R (ex.: "W 80% | R 30%")
- Painel de propriedades: campos novos (replicas, shards) e detalhe completo

### Agent's Discretion

- Valor default do campo "Escritas (%)"
- Layout exato do badge e da quebra W/R nas metricas
- Nomes dos campos no painel

### Declined / Undiscussed Gray Areas -> Assumptions

- **Shards NoSQL** (nao discutido; default do agente): NoSQL ganha `shards` (1-20) alem de `replicas` (por shard). Escrita escala com shards (teto = capacity x shards); leitura escala com shards e replicas (teto = capacity x shards x replicas vivas). Distribuicao de chaves uniforme (sem hot shard).

---

## Specific References

- "Service esta no EKS": representado pelo nome editavel ja existente (ex.: "Service pedidos (EKS)") + replicas. Sem modelagem de infraestrutura.

## Deferred Ideas

- Autoscaling (replicas variando com carga, min/max como no HPA do EKS)
- Hot shard / skew de chaves no NoSQL
- Queda de replica por falha aleatoria (chaos), nao so por sobrecarga
