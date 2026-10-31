# Simulador de System Design - Context

**Gathered:** 2026-07-17
**Spec:** `.specs/features/simulator-mvp/spec.md`
**Status:** Ready for design

---

## Feature Boundary

App web de drag-and-drop para montar arquiteturas de sistema (10 componentes) e simula-las ao vivo: trafego animado, metricas por componente, degradacao/queda sob carga, persistencia local e avaliacao do design por IA via API OpenRouter.

---

## Implementation Decisions

### Nucleo da simulacao

- Os quatro pilares escolhidos pelo usuario: trafego animado no canvas, metricas simuladas, gargalos com queda de componentes, e avaliacao estilo entrevista
- Modelo didatico simples (tick-based), nao simulacao de eventos discretos
- Slider de RPS controla a carga; componentes tem capacidade, latencia e taxa de erro base configuraveis com defaults realistas (erro base default 0%)

### Stack

- React + React Flow para o canvas de nos
- 100% client-side, sem backend proprio

### Falhas

- Degrada e derruba: verde < 70%, amarelo 70-100% (latencia cresce), vermelho > 100% (excedente falha), down > 150% sustentado; recuperacao automatica quando a carga baixa
- Load balancer redistribui para destinos saudaveis

### Componentes (10)

Cliente, CDN, Load Balancer, API Gateway, Service, Cache, Banco SQL, Banco NoSQL, Fila, Object Storage (S3)

### Persistencia

- localStorage com salvar/carregar/excluir por nome + export/import JSON

### Avaliacao

- IA real via API OpenRouter, com chave e modelo escolhidos pelo usuario (guardados so em localStorage)
- Feedback escrito em portugues; desafios pre-definidos como parte do P3

### Idioma

- UI em portugues (pt-BR)

### Agent's Discretion

- Matriz exata de conexoes validas entre componentes
- Valores default de capacidade/latencia por tipo
- Layout da UI (posicao da paleta, painel de propriedades, barra de controles)
- Formato do prompt enviado a IA e estrutura do feedback

### Declined / Undiscussed Gray Areas → Assumptions

- Chamada direta a API OpenRouter do browser via Bearer token, sem backend proprio
- Semantica exata da Fila e do S3 na simulacao (buffer/assincrono vs componente passivo) - decisao de Design

---

## Specific References

- https://systemdesignarena.com/ - referencia de produto (canvas + avaliacao por IA), mas o diferencial aqui e a simulacao viva

---

## Deferred Ideas

- Desafios com metas quantitativas validadas pela propria simulacao (avaliacao deterministica local)
- Mais componentes: sharding, replicas, DNS, service mesh, websockets
- Cenarios de caos (matar componente manualmente, picos de trafego programados)
