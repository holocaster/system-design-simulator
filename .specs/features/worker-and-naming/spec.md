# Worker + Nomes de Componentes - Especificacao

## Problem Statement

1. Nao existe consumidor dedicado de filas: hoje a fila conecta direto a um service, o que nao reflete o padrao real (quem consome fila e um worker assincrono).
2. Componentes nao podem ser renomeados. Com multiplas instancias do mesmo tipo (ex.: service de ingestao e service de consulta), o canvas e a avaliacao por IA nao conseguem distinguir o papel de cada um.

## Goals

- [ ] Novo componente Worker disponivel na paleta, conectavel somente apos uma fila
- [ ] Fila conecta somente a workers (fila -> service deixa de ser valido)
- [ ] Todo componente nasce com nome auto-numerado por tipo (ex.: "Service 1", "Service 2")
- [ ] Usuario renomeia qualquer componente pelo painel de propriedades
- [ ] Nome aparece no canvas e no payload da avaliacao por IA
- [ ] Designs salvos sem nome continuam carregando (fallback auto-numerado)

## Out of Scope

| Feature | Motivo |
| ------- | ------ |
| Rename inline por duplo clique no canvas | Painel de propriedades atende; menos codigo |
| Nomes unicos obrigatorios | Id interno continua sendo UUID; duplicata nao quebra nada |
| Migracao automatica de designs com fila -> service | MVP; o load ja rejeita com mensagem clara |

## Requirements

- R1: Tipo `worker` existe no catalogo com perfil de service (capacity 2000, latencia 20ms, erro 0), label "Worker", sigla "WRK"
- R2: Matriz de conexoes: `queue -> [worker]`; saida do worker igual a do service (`service, cache, sql, nosql, queue, storage`); nenhum outro tipo conecta a worker
- R3: `addNode` gera nome "<label do tipo> N" onde N = maior sufixo numerico existente entre nos do mesmo tipo + 1 (evita duplicata apos delecao)
- R4: Campo "Nome" no topo do painel de propriedades; validacao: trim nao-vazio, maximo 40 caracteres
- R5: Canvas mostra o nome no lugar do label fixo do tipo; sigla colorida continua indicando o tipo
- R6: `DesignNode` persiste `name`; load aceita ausencia de `name` e aplica fallback auto-numerado
- R7: Payload da avaliacao por IA inclui o `name` de cada no

## Breaking Change Aceito

Designs salvos com aresta fila -> service falham no load com "Conexao invalida". Aceito por decisao de design (modelo mais fiel; MVP sem base de usuarios).
