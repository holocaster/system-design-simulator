# Feature: node-diagnosis

## Objetivo

Quando uma caixa fica não-saudável no canvas, explicar o que está acontecendo e
como resolver, direto na caixa. Hoje a caixa só muda de cor e mostra números
crus (Util, RPS, Lat, Err), sem dizer a causa.

## Termo canônico

- **diagnóstico**: explicação textual (causa + ação) derivada do estado de saúde
  de um nó. Distinto de **estado de saúde**, que é o enum
  `healthy | degraded | overloaded | down`.

## Escopo

- Estados não-saudáveis: `degraded`, `overloaded`, `down`, e o caso de réplicas
  parciais em recuperação. `healthy` com réplicas completas não gera diagnóstico.
- Ícone de alerta no cabeçalho da caixa quando há diagnóstico.
- Tooltip no hover (CSS puro, cor do estado) com duas linhas: causa e ação.
- Função pura `diagnose(type, metrics, params)` em `src/engine/diagnose.ts`,
  retornando `{ cause, action } | null`. A UI apenas renderiza.

## Catálogo (prioridade decrescente, retorna uma causa)

1. `down`: "Fora do ar: todas as réplicas caíram sob carga." / "Reduza a carga
   ou aumente capacidade para permitir recuperação."
1.5. `overloaded`/`degraded` COM réplicas caídas (`aliveReplicas < totalReplicas`):
   "Sobrecarga com réplicas caídas (A/B)." (ou "Perto do limite com réplicas
   caídas (A/B)." se degraded) / "Reduza a carga (util < 50%) para as réplicas
   voltarem." Prioriza sobre as mensagens de tipo abaixo porque, com réplicas
   presas na zona morta (0,5-1,5 de util), aumentar réplicas configuradas não
   ressuscita as mortas; o lever é reduzir carga.
2. `overloaded` (réplicas completas):
   - SQL escrita domina: "Escrita saturou a primária (X%)." / "Réplicas não
     escalam escrita; particione ou reduza escrita."
   - NoSQL escrita domina: "Escrita saturou os shards (X%)." / "Adicione shards
     para escalar escrita."
   - SQL leitura domina: "Leitura saturou (X%)." / "Adicione réplicas ou um
     cache na frente."
   - NoSQL leitura domina: "Leitura saturou (X%)." / "Adicione réplicas ou
     shards."
   - fila: "Fila sem vazão: chegam X, capacidade Y." / "Acelere os workers a
     jusante ou aumente a fila."
   - genérico: "Sobrecarga: chegam X RPS, capacidade Y." / service|worker:
     "Aumente réplicas ou capacidade."; demais: "Aumente a capacidade."
3. `degraded`: mesma distinção read/write nos bancos, texto "Perto do limite
   (X%)." / "Margem baixa; reforce antes do pico."
4. réplicas parciais (`aliveReplicas < totalReplicas`) e nenhum caso acima:
   "Recuperando: A de B réplicas vivas." / "Réplicas voltam uma a uma quando a
   utilização cai."

Prioridade: down > overloaded > degraded > réplicas-parciais.

## Fora de escopo

- Diagnóstico de saudável ("operando com folga").
- Painel/lista agregada de problemas; o diagnóstico é por nó, no hover.

## Critérios de aceitação

- AC1: `diagnose` retorna `null` para nó saudável com réplicas completas.
- AC2: `down` produz a causa de fora do ar, independente do tipo.
- AC3: SQL com escrita saturada cita a primária; NoSQL cita shards.
- AC4: SQL/NoSQL com leitura saturada sugere réplicas (e cache/shards).
- AC5: fila sobrecarregada cita vazão/workers a jusante.
- AC6: genérico sobrecarregado mostra RPS de entrada e capacidade efetiva.
- AC7: `degraded` usa texto de "perto do limite"; overloaded tem prioridade.
- AC8: réplicas parciais sem sobrecarga mostram "A de B réplicas vivas".
- AC9: a caixa exibe ícone de alerta e o tooltip no hover quando há diagnóstico.
- AC10: componente sobrecarregado/degradado com réplicas caídas prioriza o aviso
  de reduzir carga; com réplicas completas mantém a mensagem de tipo.
- AC11: clicar no ícone de alerta fixa o tooltip (com botão de fechar); o texto é
  selecionável para cópia.
