# STATE

> Preparação para publicação: domínios e dados de infraestrutura foram
> substituídos por exemplos. Referências a commits descrevem o desenvolvimento
> anterior e não fazem parte do novo histórico Git.

## Backlog / ideias futuras

### Proxima sessao (acordado em 2026-07-20)

- ~~**Historico de avaliacoes**~~: feito. Feature `evaluation-history`
  (AD-020/021/022), T1-T4 concluídos.
- ~~**Campo de texto para o RPS**~~: feito. `ControlBar` tem slider e input
  numérico sincronizados; o clamp em [1, 100000] já existia em `setRps`.
- **Melhoria de UX (visual)**: escopo definido em 2026-07-21 e virou a feature
  `ui-redesign` (AD-023..AD-027). Sai do backlog.
- ~~**Tema escuro**~~: escopo definido em 2026-07-22 e virou a feature
  `dark-theme` (AD-055). Sai do backlog.

### Outras

- **Autoscaling e ciclo de vida de réplicas**: escopo definido em 2026-07-22 e
  virou a feature `autoscaling` (AD-028..AD-032), com as duas partes juntas.
  Sai do backlog. O alvo virou 60% e não os 80% citados aqui — ver AD-031.
- Do grilling de `autoscaling`, adiado deliberadamente: backoff exponencial de
  reinício (`CrashLoopBackOff` com atraso crescente, AD-028); janela de
  scale-down configurável pelo usuário em vez de constante (AD-030); série
  temporal de réplicas no `SimState` para gráfico/sparkline (AD-032).
- **Identidade e ciclo de vida do System Design**: escopo definido em
  2026-07-22 e virou a feature `design-lifecycle` (AD-033..AD-053). Sai do
  backlog — feature concluída, ver Handoff.
- Circuit breaker como padrao de resiliencia: componente/comportamento que faz
  load shedding (fail-fast) quando o alvo esta sobrecarregado, dando folga para
  as replicas recuperarem. Descartado no node-diagnosis por ser feature grande
  (mexe na conservacao de trafego, novos testes e UI); reavaliar se o objetivo
  virar ensinar resiliencia. O aviso "reduza a carga para as replicas voltarem"
  (AD-019 / node-diagnosis) cobre a lacuna didatica imediata a custo baixo.

### Deploy em VPS (anotado em 2026-07-22)

- ~~**Ícone de ajuda**~~: escopo definido em 2026-07-23 (AD-058). Sai do
  backlog — feature `help-icon` concluída, ver Handoff.
- ~~**SEO e `nginx.conf`**~~: escopo definido em 2026-07-23 (AD-059, AD-060) —
  vira a feature `seo-deploy`. Sai do backlog.

## Decisions

| ID | Data | Decisao | Racional |
| -- | ---- | ------- | -------- |
| AD-001 | 2026-07-17 | Stack: React + React Flow, 100% client-side, sem backend | Simplicidade; React Flow e o padrao para canvas de nos com drag-and-drop |
| AD-002 | 2026-07-17 | Simulacao tick-based simples (nao DES) | Didatico, deterministico, testavel |
| AD-003 | 2026-07-17 | Persistencia via localStorage + export/import JSON | Zero infraestrutura |
| AD-004 | 2026-07-17 | ~~Avaliacao por IA via API Anthropic com chave do usuario em localStorage~~ **Superada por AD-013** | Sem backend; usuario controla a propria chave |
| AD-005 | 2026-07-17 | UI em portugues (pt-BR) | Escolha do usuario |
| AD-006 | 2026-07-17 | Vite + Zustand + Vitest; engine de simulacao como modulo TS puro separado da UI | Testabilidade dos ACs e simplicidade |
| AD-007 | 2026-07-17 | ~~SDK @anthropic-ai/sdk no browser com dangerouslyAllowBrowser: true, chave em localStorage~~ **Superada por AD-013** | Verificado na doc oficial; evita backend |
| AD-008 | 2026-07-17 | Novo componente worker: fila conecta somente a worker (fila -> service removido); saida do worker igual a do service | Modelo mais fiel: quem consome fila e um worker assincrono; breaking change aceita em designs salvos |
| AD-009 | 2026-07-17 | Componentes tem nome editavel (auto-numerado por tipo, rename via painel de propriedades, max 40 chars) | Distinguir instancias multiplas do mesmo tipo no canvas e na avaliacao por IA; designs antigos sem nome recebem fallback no load |
| AD-010 | 2026-07-17 | Engine dual-flow: trafego propagado como Flow {read, write}; replicas com degradacao parcial generalizam a maquina de saude (down = 0 vivas); capacity e por replica | Ensinar tetos reais de escala (read replica SQL nao escala escrita, shard NoSQL escala, cache so alivia leitura); com replicas=1 e writeRatio compativel o comportamento reduz ao anterior |
| AD-011 | 2026-07-19 | Strings em português usam acentuação correta; identificadores, chaves de localStorage, ids e abreviações de métricas (Util, RPS, Lat, Err) permanecem sem acento | Nada no projeto exigia ASCII — não há ESLint, .editorconfig, Prettier nem Biome, e o index.html declara charset UTF-8. O AD-005 fixou pt-BR sem dizer nada sobre acentuação |
| AD-012 | 2026-07-19 | Brief livre persistido no Design (`brief`), com `challengeId` guardando a seleção; presets viram brief enlatado com o domínio em prosa; o prompt serializa somente a arquitetura | A descrição do sistema é parte do artefato e viaja no salvar/exportar. Guardar `challengeId` evita apagar o brief ao trocar para um preset, num app sem undo. Serializar o Design inteiro no prompt duplicaria o enunciado e poderia contradizer o brief resolvido |
| AD-013 | 2026-07-17 | Avaliação por IA via OpenRouter, com `fetch` direto e chave do usuário em localStorage. Supera AD-004 e AD-007 | Permite testar vários modelos, não só os da Anthropic. Registrado retroativamente em 2026-07-19: a migração ocorreu no commit ca57870 e os ADRs anteriores descreviam um SDK que o código já não usava |
| AD-014 | 2026-07-20 | Defaults de `capacity` recalibrados para carga realista sob durabilidade: `service` 2000->500, `worker` 2000->500, `sql` 500->1500, `nosql` 5000->10000. Latências mantidas | Os defaults antigos misturavam bases (hello-world x transacional). Régua única: throughput sustentado por réplica/nó com I/O real e durabilidade. `service`=500 reflete Spring MVC + Hikari + JPA em 2-4 vCPU; a engine já degrada latência 5x em saturação (tick.ts), então `capacity` é o ponto de saturação, não o regime confortável. Validado contra benchmarks públicos (Postgres ~1875 writes/s durável; Cassandra/Mongo 10-50k/nó) |
| AD-015 | 2026-07-20 | `DesignNode.tech?: string` opcional e persistido; seletor de tecnologia em `queue`, `nosql`, `sql`, `service`, `worker`. `schema` permanece `1`; designs antigos sem `tech` são Personalizado | A tecnologia é estado do domínio, não atalho de UI: viaja no salvar/exportar e chega à IA avaliadora (via `JSON.stringify` já existente), que passa a criticar a ESCOLHA, não só os números. Precedente de campo opcional: `name` (AD-009) e `brief`/`challengeId` (AD-012). Só os 5 tipos com dispersão de throughput grande o bastante para mudar o desenho (queue chega a 300x: SQS FIFO ~3k vs Kafka ~200k) |
| AD-016 | 2026-07-20 | Preset semeia, manual manda: escolher `tech` aplica `capacity`+`baseLatencyMs` do preset; editar qualquer um dos dois zera `tech` para Personalizado. Invariante: `tech` definida => `capacity`/`baseLatencyMs` batem com o preset. `replicas`/`shards`/`bufferSize`/`errorRate` ficam livres e não afetam `tech` | Espelha o AD-012 (preset semeia, editar depois não mente sobre o selecionado). O preset carrega só o que a tecnologia determina (throughput por réplica e latência); dimensionamento (replicas/shards/buffer) e injeção de falha (errorRate) continuam exercício do aluno, preservando a lição de escala do AD-010. Evita estado contraditório ("Kafka com capacity 300") que a IA veria |
| AD-017 | 2026-07-20 | Import/load normaliza `tech`: tech conhecida re-semeia `capacity`/`baseLatencyMs` do preset (arquivo não sobrepõe); tech desconhecida ou ausente vira Personalizado preservando os números do arquivo | Mantém a invariante do AD-016 sempre verdadeira em memória sem código de validação cruzada. Fallback tolerante espelha AD-009/AD-012 (desconhecido faz fallback, não quebra a importação), preservando forward-compat com techs futuras |
| AD-018 | 2026-07-20 | Adotado e2e smoke com Playwright em `e2e/`, restrito a poucos fluxos de alto valor (começando pelo tech-selector). O `vitest` passa a fixar `include: ['src/**/*.test.ts']` para não coletar as specs de Playwright. Supera parcialmente a postura de "nenhuma infra de teste de UI" registrada no Out of Scope do custom-brief | O tech-selector deixou fluxos UI-only (seletor, rótulo no canvas, round-trip de export) cobertos só pelo build. Um smoke e2e fecha esse buraco sem virar suíte ampla: semeia via import JSON (evita o DnD nativo do React Flow, frágil no Playwright) e valida DOM real. Escopo deliberadamente mínimo — o grosso da lógica segue nos 146 testes unitários; e2e amplo seria redundância cara e flaky |
| AD-022 | 2026-07-21 | O prompt de avaliação NÃO recebe as avaliações anteriores; cada avaliação é independente. Descartada também a variante com checkbox opcional ("incorporar a mais recente") | Dar à IA a própria crítica anterior a ancora: LLMs tendem a reafirmar o diagnóstico prévio em vez de reavaliar o design atual, e o usuário não tem como pedir "olhe com olhos novos". Num app cujo valor é o diagnóstico honesto, contaminar a entrada com a saída anterior é caro. Depois do AD-020 a continuidade virou quase redundante: a lista lateral já permite ao usuário comparar as rodadas com números. O checkbox foi recusado por empurrar ao aluno uma decisão sobre comportamento de LLM que ele não tem base para tomar — se o rótulo precisa avisar do viés, o default deveria bastar. Backlog: ação explícita e separada de comparação, se fizer falta |
| AD-021 | 2026-07-21 | Cada entrada do histórico guarda texto, timestamp, `rps`, `writePercent`, modelo e o `SimState.global` da rodada (`successRatio`, `e2eLatencyMs`, `totalRps`, opcional). Sem snapshot de `nodes`/`edges` | A mesma arquitetura avaliada a 100 e a 50.000 RPS recebe crítica oposta (AD-010): sem a carga registrada, duas entradas parecem contradição da IA em vez de cargas diferentes. O modelo entra porque o `SettingsDialog` deixa trocá-lo e crítica de modelos distintos não é comparável. As métricas globais são 3 números e fecham o loop quantitativo que a prosa não dá; são opcionais porque `evaluateDesign` aceita `simState: null`, e a UI mostra "sem simulação" em vez de 0% (que seria mentira). Snapshot de arquitetura recusado: sem tela de diff ou "restaurar este design" ninguém lê `nodes`/`edges` cru, e ele multiplicaria o tamanho do JSON |
| AD-020 | 2026-07-21 | Histórico de avaliações por IA vive no `Design` como `evaluations?` opcional, `schema` mantido em `1`; teto de 10 entradas com descarte FIFO silencioso da mais antiga; carregar e importar trazem o histórico do arquivo | Precedente triplo de campo opcional sem bump de schema: `name` (AD-009), `brief`/`challengeId` (AD-012), `tech` (AD-015); o AD-012 já firmou que o artefato carrega mais que a topologia. Indexar por chave separada exigiria nome, e o design em memória só ganha nome ao salvar — perderia o histórico no caso mais comum. Não vaza para o prompt: `buildPrompt` serializa só `{schema, nodes, edges}`. Teto necessário porque ~8 KB por entrada estouraria o `localStorage` e a falha apareceria deslocada da causa (no salvar). Importar traz o histórico porque export/import é o único mecanismo de backup: descartá-lo apagaria justamente o que a feature protege |
| AD-023 | 2026-07-21 | Direção visual "Estúdio": mundo claro (canvas `#F1EFF9`, painéis brancos, texto `#221D34`), acento violeta `#5A49D6`, raio 11px, sombras suaves; semântica de saúde `#12886A`/`#C07A10`/`#D1435B` mais um cinza neutro para `down`. Tema único (claro). Tokens como custom properties em `src/styles/tokens.css`, CSS puro; nenhum hex fora dos tokens | Escolhida entre três mockups da tela real sob a mesma carga de estresse (12.000 RPS, API degradada, banco sobrecarregado), critério que expôs como cada paleta comunica sofrimento. "Estúdio" trata o app como ferramenta de aprendizado, não console de produção — coerente com o propósito didático que já orienta AD-010 e AD-019. Tema escuro recusado por dobrar a superfície de validação sem ganho didático, e porque as cores de saúde escolhidas são escuras: um C escuro exigiria outra escala semântica, ou seja, outro desenho. Tailwind recusado (nova infraestrutura de build para uma reforma de aparência) e CSS Modules também (nomes com hash colidem com AD-027). Risco aceito conscientemente: arredondado generoso + violeta é a estética mais datável das três |
| AD-024 | 2026-07-21 | Tipografia própria: IBM Plex Sans (UI) e IBM Plex Mono (números) via `@fontsource`, servidas do bundle. Primeiras dependências de runtime além de React/React Flow/Zustand | `system-ui` pode renderizar fontes diferentes conforme o sistema operacional: a mesma tela parece outra por SO. Sans e mono da mesma superfamília importa num app onde rótulo e número vivem colados ("Util 96%"). Servir do bundle, não de CDN, preserva a premissa 100% client-side do AD-001. Inter foi recusada por ser a face-padrão de projeto gerado por IA |
| AD-025 | 2026-07-21 | O nó ganha barra de utilização mas mantém os quatro números (Util, RPS, Lat, Err) e o W/R dos bancos; o nó cresce em altura para acomodar. A barra reforça o Util, não o substitui | O RPS processado é o número que fecha a conservação de tráfego (entrada = sucesso + erro), a regra de domínio que o AGENTS.md põe em primeiro lugar: escondê-lo tira do aluno a checagem que ensina a regra. Recusada também a variante "compacto, expande ao selecionar": comparar dois componentes passaria a exigir um clique de cada vez, e comparar é exatamente o que o simulador serve para ensinar |
| AD-026 | 2026-07-21 | O chrome do `@xyflow/react` fica no padrão (Background pontilhado, anel de seleção, atribuição) — nenhum seletor `.react-flow__*` novo. O handle de 16px com borda branca e anel de foco é preservado na geometria e no comportamento, mudando só a cor para token; os dois hex cravados no `TrafficEdge.tsx` também viram tokens | O azul dominante do canvas nunca foi do React Flow: veio de override próprio em `components.css` e de `#1565c0`/`#c62828` cravados no `TrafficEdge.tsx`. Tokenizar esses três valores tira a maior mancha de azul do centro da tela sem acoplar CSS a seletor interno da lib, que pode mudar entre versões maiores. O tamanho do handle é decisão de UX anterior e explícita do usuário — o padrão da lib é pequeno demais para acertar com o mouse; voltar a ele seria desfazer uma melhoria já paga |
| AD-027 | 2026-07-21 | Os nomes de classe de que os e2e dependem (`.component-node-tech`, `.evaluation-history-item`, `.evaluation-modal-body`, `.evaluation-modal-meta`, `.react-flow__node`, `.replica-badge`) são contrato: o CSS por trás é reescrito à vontade, o nome fica. `e2e/*.spec.ts` não muda. Validação visual por screenshots antes/depois em quatro estados (vazio, design importado, simulação rodando, componente selecionado), sem baseline no repo | Mantém o sinal de falha confiável durante a reforma: e2e vermelho passa a significar regressão, nunca renomeação. Migrar para `data-testid` foi recusado por alterar arquivos de teste na mesma feature que altera a UI, embaralhando as duas causas de falha. Snapshots visuais versionados (`toHaveScreenshot`) recusados porque numa reforma visual todo baseline muda de propósito — o valor só começaria depois — e são notoriamente frágeis a versão de navegador e renderização de fonte, ainda mais com a fonte nova do AD-024 entrando. Coerente com o escopo mínimo de e2e firmado no AD-018 |
| AD-019 | 2026-07-20 | Diagnóstico de saúde (causa + ação em pt-BR) vive numa função pura `diagnose(type, metrics, params)` em `src/engine/diagnose.ts`, retornando strings pt-BR prontas; a UI só renderiza (ícone + tooltip CSS no `ComponentNode`) | O diagnóstico deriva dos mesmos limiares da `tick.ts` (0.7 degraded, regra da primária de escrita do AD-010); mantê-lo na engine coloca a verdade da saturação num lugar só e é testável sem React. Retornar strings pt-BR (não um enum + mapeamento na UI) evita indireção YAGNI; precedente de copy pt-BR na engine já existe no `catalog.ts` (labels dos componentes). Um leitor futuro pode estranhar copy de UI na "engine pura", daí o registro |
| AD-028 | 2026-07-22 | Ciclo de vida da réplica separado do dimensionamento: a regra de recuperação `util < 0.5` por 5 s é removida e substituída por reinício com atraso fixo (`RESTART_TICKS = 30`, 3 s) que não olha carga. A queda segue como está (`util > 1.5` por 3 s, uma réplica por vez); `aliveReplicas` é renomeado para `readyReplicas` | Condicionar a volta de uma réplica à utilização é a abstração didática herdada do MVP que esta feature existe para desfazer — pod não espera a fila baixar para subir, e enquanto readiness depender de carga os dois mecanismos continuam sendo um só. Backoff exponencial (`CrashLoopBackOff` de verdade) foi recusado agora: exigiria contagem de reinícios por nó no `SimState` e sumiria com a réplica por dezenas de segundos numa simulação observada em segundos — pareceria bug, não lição. Consequência aceita: sem HPA e sob sobrecarga sustentada, o nó passa a oscilar com período de ~6 s. É crash loop, é verdadeiro, e é o que motiva a parte B |
| AD-029 | 2026-07-22 | Autoscaling é opt-in por nó, desligado por padrão, modelado como `params.autoscaling?: {minReplicas, maxReplicas, targetUtilization}` — a presença do objeto é o opt-in, sem booleano separado. `schema` fica em `1` | Quinto precedente de campo opcional sem bump: `name` (AD-009), `brief`/`challengeId` (AD-012), `tech` (AD-015), `evaluations` (AD-020); design salvo sem o campo carrega e se comporta exatamente como antes. Um booleano ao lado dos três campos criaria estado incoerente persistido (`enabled: false` com `min: 5` gravado, sem saber se é lixo ou intenção). Ligado por padrão foi recusado por duas razões: mudaria o comportamento de designs salvos sem nada no arquivo ter mudado, e o contraste "sem autoscaling vs com" é a aula — sempre ligado, o aluno nunca vê o modo de falha que motiva a feature. Bloquear HPA em tipos que não escalam (SQL, client) também recusado: o simulador ensina pela consequência, não pela proibição (mesma lógica do AD-025). Custo assumido: o laço de escalares em `designStorage.ts:178` não serve para objeto e precisa de ramo próprio de validação. ~~Bloquear HPA em tipos que não escalam (SQL, client) também recusado: o simulador ensina pela consequência, não pela proibição~~ **Cláusula revertida pelo AD-054** |
| AD-030 | 2026-07-22 | HPA usa a fórmula real do Kubernetes — `desired = clamp(ceil(readyReplicas × utilization / targetUtilization), min, max)` — sobre o mesmo `utilization` que o nó exibe. Scale-up imediato e direto ao valor calculado; scale-down só após 10 s (100 ticks) com o desejado abaixo do atual, um tick acima zera a janela. `desiredReplicas` e `readyReplicas` vivem no `SimState`; `params.replicas` é o valor inicial, com `clamp(replicas, min, max)` ao ligar | O número da tela precisa ser o número que age: com sinal separado (RPS absoluto, fila, média móvel própria) o aluno veria 140% na barra e réplicas subindo por um motivo que não consegue conferir — mesma lógica do AD-025. `targetRps` por réplica foi recusado por criar um segundo conceito de capacidade concorrendo com `capacity`. `readyReplicas` como base (não `totalReplicas`) é o que torna AD-028 e este ortogonais de fato. A assimetria scale-up/scale-down é a lição, não tuning: subir é barato e reversível, encolher cedo derruba o serviço na próxima onda; janelas iguais fariam o autoscaler parecer um termostato simétrico. 10 s e não 3 s para a janela ficar visivelmente maior que o ciclo do AD-028 — se fossem da mesma ordem, os dois mecanismos ficariam indistinguíveis na tela. `desiredReplicas` fora do `Design` porque é estado de execução: persistir faria um design salvo em pleno pico voltar com 12 réplicas sem explicação. Guarda necessária: com `readyReplicas === 0`, `utilizationOf` devolve `Infinity` e `0 × Infinity` é `NaN` — o HPA não calcula nada, quem manda é o reinício do AD-028. Aceito: HPA em SQL write-bound sobe até `max` sem mover a agulha (AD-010), e o HPA roda a cada tick (100 ms) e não a cada 15 s como o K8s real — quem segura o comportamento é a estabilização, não a cadência |
| AD-031 | 2026-07-22 | Defaults do HPA: `minReplicas: 1`, `maxReplicas: 10`, `targetUtilization: 0.6`. Os limiares de saúde (0.7 degraded, 1.0 overloaded) não mudam | Alvo de 80% — o valor citado na nota original do backlog e o default comum no K8s — colide com o limiar de `degraded` do `stateFromUtilization`: o autoscaler funcionando perfeitamente estabilizaria o nó em 80% e pintaria de âmbar para sempre, ensinando "está sofrendo" num componente que está exatamente onde foi mandado ficar. 60% põe o regime permanente em verde com folga para a carga oscilar, e devolve ao âmbar o significado certo: o autoscaler não está dando conta (bateu no teto, ou o gargalo é escrita). Mexer nos limiares para acomodar 80% foi recusado — eles são contrato de fato (cores do AD-023, barra do AD-025, `tick.test.ts` inteiro) e mudar a semântica de saúde para caber num default de autoscaling é a cauda balançando o cachorro. 80% continua digitável, só não como default. `min: 1` é o default real do K8s e deixa o custo do ocioso visível; `max: 10` é arbitrário de propósito — todo HPA tem teto arbitrário, e é onde a aula acontece |
| AD-032 | 2026-07-22 | A UI do autoscaling reaproveita o `replica-badge` existente: `x5 auto`, `3/5 auto` quando parcial, `x10 auto (max)` no teto. Nenhum widget novo no nó; checkbox + três campos no `PropertiesPanel`, no grupo de `Réplicas` do T7 do ui-redesign. `min`/`max` reusam `PARAM_LIMITS.replicas` (`[1, 20]`) com `min ≤ max`; alvo em `[10%, 100%]` | O badge subindo de `x2` para `x7` durante um pico já é a animação da feature; qualquer widget adicional competiria com os quatro números que o AD-025 decidiu manter num nó que já cresceu em altura. O sufixo `(max)` carrega a única informação que o número sozinho não dá — `x10` e `x10 (max)` são idênticos sem o rótulo, e é a diferença entre "dimensionado" e "acabou o autoscaler, o problema agora é seu". Texto e não ícone: sem emoji (regra do projeto) e sem glifo que precise de legenda. Terceiro número no nó recusado porque `desired` e `ready` só divergem transitoriamente (os 3 s do AD-028) e o formato `3/5` já cobre. Gráfico/sparkline de réplicas ao longo do tempo recusado: exigiria série temporal no `SimState`, que não existe — o engine não tem memória além do tick anterior. Esconder o campo `replicas` com HPA ligado também recusado: ele segue governando o começo da simulação |
| AD-033 | 2026-07-22 | O System Design é uma entidade com `id` estável criado junto dela, antes do primeiro salvamento. Fazem parte da entidade: identidade, nome opcional, desafio, brief, topologia e histórico de avaliações. RPS, percentual de escritas, métricas e execução da simulação ficam fora | Preserva a regra de domínio de que carga e mix de escrita são controles da simulação. "Novo design" pode reiniciá-los por UX sem transformar mudanças nesses controles em alterações não salvas do design |
| AD-034 | 2026-07-22 | Nomes são opcionais antes do primeiro salvamento e únicos, sem distinção entre maiúsculas e minúsculas, entre designs salvos. Conflito com outro `id` exige confirmação; ao confirmar, a entidade conflitante é substituída e o `id` ativo permanece | O nome é identificação humana, não identidade. Duplicatas tornariam carregar e excluir ambíguos; trocar o `id` ativo em uma substituição quebraria a estabilidade que a feature introduz |
| AD-035 | 2026-07-22 | Exportação e importação transportam `id` e nome. Importar preserva o `id` e abre o conteúdo do arquivo como revisão não salva, sem escrever automaticamente no armazenamento | Export/import é mecanismo de backup, então restaurar deve preservar a entidade. Criar sempre outro `id` transformaria restauração em cópia; não salvar automaticamente mantém a importação reversível e sujeita à confirmação de conflito de nome. Compatibilidade com JSON sem identidade foi descartada depois pelo AD-041 |
| AD-036 | 2026-07-22 | Alteração não salva é diferença entre o conteúdo persistível atual e o último baseline salvo. Criar design vazio começa limpo; carregar e salvar definem baseline limpo; importar começa alterado. Desafio, brief, topologia, parâmetros, nomes de componentes e avaliações contam; controles e execução da simulação não | Comparar conteúdo permite que desfazer manualmente uma edição elimine o aviso, ao contrário de um booleano irreversível. A fronteira segue AD-033 e não promove RPS ou mix de escrita a conteúdo do design |
| AD-037 | 2026-07-22 | Novo design, carregar e importar usam a mesma proteção quando há alteração não salva: salvar e continuar, descartar ou cancelar. Design sem nome pede nome antes de salvar; erro ou confirmação recusada cancela a transição. A simulação só para quando a troca é efetivada | Um único fluxo evita regras divergentes entre três maneiras de substituir a entidade ativa. Manter a ação pendente até o salvamento terminar impede perda de trabalho e evita parar uma simulação quando o usuário apenas abriu ou cancelou o aviso |
| AD-038 | 2026-07-22 | Fechar, recarregar ou navegar para fora da página com alterações não salvas aciona a proteção nativa do navegador; design limpo não mostra aviso. Não haverá autosave nem tentativa de personalizar a mensagem | Sem essa guarda, o fluxo do AD-037 ainda perderia o mesmo trabalho por `Ctrl+R`. O navegador não oferece de forma confiável o diálogo de três opções da aplicação, e autosave mudaria o modelo de persistência inteiro para contornar uma limitação de interface |
| AD-039 | 2026-07-22 | Renomear é ação separada disponível apenas para design já salvo e persiste imediatamente somente o nome. Outras alterações pendentes continuam pendentes; o baseline incorpora o nome novo sem incorporar o restante do conteúdo atual | Fazer uma ação de metadado salvar topologia, brief ou avaliações confirmaria trabalho sem comando do usuário. O primeiro salvamento continua sendo o momento de nomear uma entidade ainda não persistida |
| AD-040 | 2026-07-22 | Toda exclusão exige confirmação. Excluir o design ativo remove somente sua versão persistida: a entidade permanece aberta com o mesmo `id`, nome e conteúdo, passa a não salva e pode ser recriada por um salvamento posterior. A simulação não para | Tratar exclusão como operação do armazenamento evita apagar o canvas e alterações em memória como efeito colateral. Lixeira e undo ficam fora do escopo; a confirmação cobre a irreversibilidade da cópia persistida |
| AD-041 | 2026-07-22 | A feature de identidade não migra o formato atual do `localStorage` nem aceita JSON anterior sem identidade. O contrato pode mudar diretamente | O sistema ainda está somente em construção, sem implantação ou usuários, portanto não existe dado persistido ou JSON externo a preservar. Compatibilidade retroativa seria código e teste para um cenário impossível neste estágio |
| AD-042 | 2026-07-22 | O contrato continua usando `schema: 1`, agora com `id` obrigatório e nome opcional; fixtures internas mudam junto, sem versão nova | O formato ainda não foi publicado nem consumido fora do desenvolvimento. Nesta fase, o número do schema identifica apenas o contrato corrente e não precisa comunicar compatibilidade com uma versão que nunca entrou em uso |
| AD-043 | 2026-07-22 | Nome de design tem de 1 a 40 caracteres após trim, aceita Unicode e pontuação, preserva espaços internos e usa comparação sem distinção entre maiúsculas e minúsculas para conflito | Reusar o limite dos nomes de componentes mantém a validação previsível e evita texto excessivo nos diálogos sem inventar slug ou restrições incompatíveis com a UI em pt-BR |
| AD-044 | 2026-07-22 | Abrir ou recarregar a aplicação sempre cria um System Design vazio com novo `id`; não há restauração do último ativo nem persistência de sessão. Inicialização e "Novo design" usam canvas e brief vazios, desafio inicial, histórico e métricas vazios, 100 RPS e 20% de escritas | Persistir a sessão criaria um segundo ciclo de armazenamento e casos extras para entidade importada ou excluída. O aviso de saída protege trabalho não salvo; designs salvos continuam acessíveis pelo fluxo explícito de carregar |
| AD-045 | 2026-07-22 | Nome do design ativo — ou "Sem título" — e estado textual "Alterações não salvas"/"Salvo" ficam sempre visíveis perto de "Novo design". Design vazio nunca persistido mostra somente "Sem título" | A identidade passa a existir no domínio e precisa aparecer na interface para o usuário saber qual entidade edita e por que uma troca pode pedir confirmação. Texto explícito evita a ambiguidade e a baixa acessibilidade de usar apenas asterisco |
| AD-046 | 2026-07-22 | Um grupo "Design" no início da barra reúne nome/estado, "Novo design" e "Salvar", separado visualmente do grupo da simulação. Salvar pede nome na primeira vez, depois atualiza por `id`, e fica desabilitado quando um design já persistido está limpo. O diálogo lateral vira "Gerenciar designs" | Novo e salvar são ações frequentes da entidade; carregar, renomear, excluir, importar e exportar são operações menos frequentes de gerenciamento. A separação mantém identidade perto de "Iniciar" sem misturar ciclo do documento com execução da simulação |
| AD-047 | 2026-07-22 | Exportar serializa o estado atual completo, incluindo alterações pendentes, `id`, nome opcional e histórico, mas não grava no armazenamento, não atualiza o baseline e não limpa o estado alterado. O arquivo usa o nome do design ou `design-sem-titulo.json` | Exportação é cópia externa e salvamento é atualização da entidade local. Misturar os dois faria uma exportação isolada suprimir a proteção de saída mesmo sem existir cópia salva no aplicativo |
| AD-048 | 2026-07-22 | `id` e nome do design não entram no prompt da IA. A avaliação continua recebendo arquitetura, brief resolvido, carga e métricas da rodada; a entrada resultante pertence ao histórico do design ativo e o deixa alterado | `id` é técnico e o nome organiza documentos, sem descrever requisitos ou arquitetura. Excluí-los preserva o prompt focado e a independência entre rodadas definida no AD-022 |
| AD-049 | 2026-07-22 | Qualquer design salvo pode ser renomeado pela lista de gerenciamento sem ser carregado. Renomear o ativo também atualiza o nome visível e seu baseline de nome; a linha ativa recebe o rótulo "Aberto" | Restringir a ação ao ativo obrigaria trocar de entidade apenas para organizar a lista. O rótulo diferencia uma operação sobre armazenamento de uma troca do documento em edição |
| AD-050 | 2026-07-22 | Carregar ou importar para a simulação e limpa métricas, mas preserva RPS e percentual de escritas. Somente inicialização e "Novo design" restauram 100 RPS e 20% | Os controles ficam fora da entidade pelo AD-033 e preservar seus valores permite comparar arquiteturas sob a mesma carga. Criar uma entidade nova continua sendo o reset explícito completo da experiência |
| AD-051 | 2026-07-22 | Um design não ativo não pode ser renomeado para o nome do design aberto; a UI orienta renomear primeiro o ativo. Nos demais conflitos, a substituição confirmada continua válida | Permitir que uma operação em outra linha removesse a cópia persistida da entidade ainda aberta a deixaria subitamente não salva. A exceção evita essa transição surpreendente sem eliminar a política geral de nomes únicos |
| AD-052 | 2026-07-22 | Duplicação e "Salvar como" ficam fora da feature. Salvar preserva o `id`; renomear preserva a entidade. Uma cópia futura deverá ser ação explícita com novo `id` | Duplicar abre uma decisão própria sobre copiar histórico de avaliações e não é necessário para corrigir identidade, salvamento seguro ou troca de designs |
| AD-053 | 2026-07-22 | Não há coordenação de edição entre abas. Cada aba mantém estado e baseline próprios; se duas salvarem o mesmo `id`, o último salvamento vence | Locks, eventos de `storage` e controle de revisão seriam desproporcionais para uma aplicação local ainda em construção. A proteção de alterações não salvas cobre somente a aba atual |
| AD-054 | 2026-07-22 | Reverte a cláusula do AD-029 que recusava bloquear qualquer tipo. Autoscaling passa a ser oferecido só nos tipos que já possuem o campo `replicas` — `REPLICABLE_TYPES`: `service`, `worker`, `cache`, `sql`, `nosql`. O checkbox some do painel para `client`, `cdn`, `loadbalancer`, `gateway`, `queue` e `storage`; `updateParams` rejeita `autoscaling` nesses tipos (`AUTOSCALING_TYPE_ERROR`); a importação rejeita e o carregamento do armazenamento local saneia silenciosamente autoscaling salvo num tipo não replicável | O racional original ("a consequência ensina") não se sustenta: o distintivo de réplicas — o único lugar onde a consequência apareceria — já é condicionado a `REPLICABLE_TYPES` desde antes desta feature (`ComponentNode.tsx`). Ligar autoscaling num `loadbalancer` ou num `client` não produz nenhum sinal na tela; é o autoscaler mexendo um `replicas` implícito (`?? 1` em `tick.ts`) que o formulário nunca mostrou, não uma lição visível. Bate também com como esses componentes funcionam de fato: load balancer, CDN e API Gateway geridos por nuvem escalam de forma transparente, sem HPA configurado pelo usuário; fila é dimensionada pelo consumidor (`worker`), não pelo broker; object storage é elástico por natureza. SQL e NoSQL continuam podendo ligar autoscaling — é lá que a lição do AD-029 sobre HPA não resolver gargalo de escrita (história 17 da spec) continua de pé, porque ambos já têm `replicas` e o distintivo já se move para eles |

| AD-055 | 2026-07-22 | Tema escuro via toggle manual (não segue `prefers-color-scheme`), persistido em `localStorage` fora da entidade `Design`; controlado por ~~botão de texto próprio~~ **botão próprio (revertido pelo AD-056: ícone, não texto)** na `ControlBar` (não escondido no `SettingsDialog`). Reverte a cláusula de tema único do AD-023 | O AD-026/AD-027 já centralizaram 100% da cor do app em `tokens.css` (zero valor literal fora dele), o que torna um bloco `[data-theme="dark"]` redeclarando os mesmos tokens a implementação natural — motivo prático citado pelo usuário para retomar o item adiado no AD-023. Toggle manual (não automático pelo SO) mantém a mesma postura de controle explícito já usada no `SettingsDialog` (opt-in, não auto-detectado). Botão na `ControlBar`, não no `SettingsDialog`: é ação frequente de aparência, não configuração de infraestrutura como a chave da API — mesma lógica de separação de grupos do AD-046. Persistência fora do `Design` porque tema é preferência de navegador/dispositivo, não conteúdo do artefato (AD-033), mesmo precedente já usado para chave/modelo OpenRouter |
| AD-056 | 2026-07-22 | Dois ajustes ao AD-055 pedidos pelo usuário após ver a primeira implementação: (1) o botão de tema usa ícone SVG inline (sol/lua) com `aria-label` indicando o tema-alvo, não mais texto visível — reverte a cláusula "texto, não ícone" do AD-055 (que seguia o precedente do AD-032); (2) sem preferência salva, o tema default passa a ser escuro, não claro | (1) Ícone: decisão estética do usuário depois de ver o botão de texto rodando; o precedente do AD-032 (nenhum ícone sem legenda) continua respeitado porque o ícone carrega `aria-label` — a legenda não é visual, é acessível. Não é emoji (regra do projeto se mantém: SVG inline, sem glifo Unicode). (2) Default escuro: pedido explícito do usuário; nenhuma consequência técnica — `getTheme` já tratava "sem valor salvo" como um caso a decidir, só a resposta mudou de `"light"` para `"dark"`. O app ainda não lê `prefers-color-scheme` (isso não mudou, só o valor do fallback interno) |
| AD-057 | 2026-07-22 | O campo de modelo no `SettingsDialog` passa de input livre com `datalist` para `<select>` com presets curados (GPT mini, Gemini Flash, Claude Haiku) mais opção "Personalizado" que revela um campo de texto livre. Os presets usam os aliases auto-atualizáveis `~provider/modelo-latest` da OpenRouter — mesmo padrão já usado em `DEFAULT_OPENROUTER_MODEL` — em vez de IDs de versão fixos (ex.: `openai/gpt-4o-mini`) | Usuário não sabe de cabeça o nome dos modelos da OpenRouter, e `datalist` é pouco descobrível — parece input comum até o usuário focar ou digitar. Aliases `-latest` vencem IDs fixos porque nunca ficam desatualizados (a OpenRouter aponta para o modelo mais novo da categoria); fixar versões exigiria voltar ao código quando a OpenRouter descontinuar essas versões, coisa que já não acontece com o default existente. Os três presets foram escolhidos entre os modelos mais baratos de cada provedor grande (verificado contra `/api/v1/models` da OpenRouter, não contra memória: GPT mini e Claude Haiku ~US$0,75-1/M tokens de entrada, Gemini Flash ~US$1,5/M), por pedido explícito do usuário para privilegiar opções baratas e deixar a exceção cara para quem digitar manualmente. Estrutura select + "Personalizado" espelha o seletor de desafio já existente (`EvaluationPanel`/`CUSTOM_CHALLENGE_ID`), evitando um segundo padrão de UI para o mesmo problema |
| AD-059 | 2026-07-23 | `robots.txt` libera todos os crawlers, sem `Disallow`, incluindo os que só treinam modelo (`CCBot`, `GPTBot`, `Google-Extended`) e não só os de resposta em tempo real (`ChatGPT-User`, `PerplexityBot`) | O objetivo do simulador é ser encontrado como ferramenta educacional e citado por IA — bloquear treinamento reduziria justamente a chance de aparecer em resposta de assistentes que aprenderam do conteúdo. Decisão explícita do usuário diante da alternativa (permitir resposta, bloquear treinamento), que é a postura mais comum em produtos comerciais mas contraria o objetivo aqui |
| AD-060 | 2026-07-23 | Deploy pull-based: um script roda no repo clonado no servidor (`git pull` → `npm ci` → `npm run build` → symlink `releases/<id>` → `current` → `nginx -t` → `systemctl reload nginx`), sem `rsync`/`scp` de máquina local. O modelo `deploy/nginx/system-design.conf.example` usa domínio, porta e caminhos de certificado de exemplo | Deploy simples para um app estático. Domínio, porta, certificados e diretórios devem ser definidos para cada instalação, sem registrar infraestrutura pessoal no projeto |
| AD-058 | 2026-07-23 | Ícone de ajuda: modal explicativa abre automaticamente na primeira visita — marcando de imediato uma flag própria no `localStorage` (fora do `Design`) — e nas visitas seguintes só o ícone na `ControlBar` (ao lado do tema) abre sob demanda. Modal reusa `.save-dialog-backdrop`/`.save-dialog`, fecha só pelo botão "Fechar". Conteúdo é JSX estático (não markdown) cobrindo o fluxo básico de uso (arrastar da paleta, conectar, ajustar carga/% escritas, iniciar simulação), a legenda das 4 cores de saúde com swatches dos tokens reais (`--color-health-ok/warn/bad/down`), e uma seção de avaliação por IA (existência da feature, botão "Configurar API", nota de que a chave fica só no localStorage do navegador). Réplicas/autoscaling, tech selector, tema e salvar/exportar ficam fora do conteúdo. Um caso e2e cobre os dois cenários: primeira visita (auto-abre) e visita seguinte (só ícone) | Sempre-visível-sem-auto-abrir foi a primeira proposta, descartada pelo usuário: depender do usuário notar o ícone sozinho falha silenciosamente o propósito de orientar quem chega sem contexto. Precisa de flag persistida porque toda inicialização ou reload cria um System Design vazio (AD-044) — "primeira vez" não pode se amarrar ao design. A flag grava no momento da auto-abertura, não no fechamento, para não deixar uma janela "aberta mas não marcada" caso o usuário recarregue antes de fechar. Reusa `.save-dialog` para não criar layout de diálogo novo, precedente de `SettingsDialog`/`SaveLoadDialog`/`EvaluationModal`. JSX e não markdown porque o texto é autoria do dev, não conteúdo externo — `react-markdown` entrou no projeto para a resposta da IA, não para copy estático do próprio produto. Escopo do conteúdo cobre só o fluxo básico mais avaliação por IA (a dúvida mais provável de quem vê "Configurar API" sem contexto); features avançadas ficam de fora para a modal não virar um manual longo que ninguém lê até o fim — mesma lógica de escopo mínimo do AD-018. Fechamento só por botão, sem Esc/clique fora, segue o padrão já estabelecido nos outros diálogos do projeto (nenhum implementa esse comportamento hoje) |
| AD-061 | 2026-07-24 | `COMPUTE_PRESETS` (`service`/`worker`) ganha `quarkus-jvm` (650/17ms) e `dotnet` (500/20ms, .NET genérico com EF Core, igual ao `spring-mvc`). `quarkus-native` recalibrado de 3.000/10ms para 520/19ms; `go` recalibrado de 5.000/10ms para 3.000/10ms. `spring-mvc` (500/20), `nodejs` (1.500/15) e `spring-webflux` (2.000/15) inalterados | Pesquisa web mostrou que os valores antigos de `quarkus-native` e `go` tinham espaçamento ordinal/didático sem lastro em benchmark de mesma metodologia: razão medida Go/Node com Postgres real e pool de conexão (nDmitry/web-benchmarks, mesma máquina) é ~1,9x, não os 3,33x do catálogo antigo; razão Quarkus-JVM/Spring-Boot em teste de leitura de banco é ~1,2-1,45x (não os 6x que `quarkus-native` tinha sobre `spring-mvc`). Relatos de produção do próprio time Quarkus confirmam que native paga penalidade de throughput sustentado frente a JVM (JIT aquecido escala melhor), então `quarkus-jvm` fica acima de `quarkus-native` — inverte a intuição óbvia de que native seria sempre mais rápido. `dotnet` não usa os números crus de TechEmpower/Kestrel (609k-7M rps): esses medem minimal API sem ORM ou até Native AOT, o equivalente a comparar hello-world com o `spring-mvc` que é explicitamente "Spring MVC + Hikari + JPA" (AD-014). Sem benchmark direto EF Core vs Hibernate, e por experiência direta do usuário com C#, `dotnet` foi igualado ao `spring-mvc` — mesma liga, sem vantagem assumida sem dado. `baseLatencyMs` de cada preset segue a mesma invariante ordinal do catálogo (capacity maior implica latência igual ou menor); a de `go` não mudou por falta de razão medida especificamente para latência, só para capacity |

## Handoff

### Sessão atual

- Feature `seo-deploy` concluída nesta sessão: grilling, spec, tasks.md,
  T1-T4 implementados e verificados (AD-059, AD-060).
- **Completed**: T1 (meta tags, favicon, `robots.txt`, `sitemap.xml`) em
  `b422eee`; T2 (`og-image.png` via screenshot real do simulador rodando,
  gerado por `.specs/features/seo-deploy/gen-og-image.mjs`) em `a302517`;
  T3 (`e2e/seo.spec.ts`) em `1b52da9`; T4 (`deploy/nginx/*.conf` +
  `deploy/build-and-run.sh`, pull-based) em `39ec75b`, com correção da
  revisão independente (headers de segurança não herdados por `location`
  com `add_header` próprio; bit executável do script perdido por
  `core.filemode=false`) em `334c644`. Doc/ADRs em `9b74a2a`.
- Revisão independente rodou em dois flushes de batch (T1-T3 juntos, depois
  T4 sozinho, fronteira vazia) e uma verificação final de cobertura da spec
  contra o diff completo — os 10 histórias de usuário e todas as decisões de
  implementação têm evidência `file:line`, sem lacunas.
- **In-progress**: none
- **Next step**: nenhuma nesta feature. Deploy real na VPS (copiar
  configurar `deploy/nginx/system-design.conf.example` para o nginx da VPS,
  clonar o repo no diretório escolhido, rodar
  `deploy/build-and-run.sh`) fica manual, fora deste repo
- **Blockers**: none
- **Gate final**: `npm run build` verde, `oxlint` limpo, 229/229 vitest,
  13/13 playwright
- **Uncommitted files**: none
- **Branch**: main, sincronizada com `origin/main`

#### Handoff anterior (help-icon)

- Feature `help-icon` concluída: spec, tasks.md, T1-T3 implementados e
  verificados (AD-058).
- **Completed**: T1 (`src/help/helpSeen.ts`, storage injetável espelhando
  `theme.ts`) em `b14c66d`; T2 (modal + ícone na `ControlBar` + auto-abertura
  na primeira visita) em `fe8dd64`; T3 (`e2e/help.spec.ts`, cobre primeira
  visita, reload e ícone sob demanda; `storageState` global do Playwright
  fixado para não quebrar os outros specs) em `bbdb4c3`
- **Gate final**: `npm run build` verde, `oxlint` limpo, 229/229 vitest,
  12/12 playwright

#### Handoff anterior (dark-theme)

- Feature `dark-theme` concluída: grilling (AD-055), spec,
  tasks.md, T1-T3 implementados e verificados.
- **Completed**: T1 (toggle mecânico + módulo `src/theme/theme.ts` com
  storage injetável, espelhando `designStorage.ts`; falha de `setItem`
  degradada sem lançar, achado em code-review antes do commit) em `fd55b1d`;
  T2 (paleta escura em `tokens.css`, validada visualmente sob carga real —
  as quatro cores de saúde permanecem distinguíveis) em `22175c4`; T3
  (`e2e/dark-theme.spec.ts`, um caso: toggle muda o atributo e persiste após
  reload) em `c0d2a79`
- **Ajustes pós-implementação (AD-056)**, pedidos pelo usuário depois de ver
  o resultado rodando: botão de tema passou de texto visível para ícone
  SVG inline (sol/lua) com `aria-label`; default sem preferência salva
  passou de claro para escuro. `theme.ts`, `theme.test.ts`, `ControlBar.tsx`
  e `e2e/dark-theme.spec.ts` atualizados; spec.md e tasks.md anotados com a
  reversão. Commit pendente
- **In-progress**: none
- **Next step**: nenhuma nesta feature
- **Blockers**: none
- **Gate final** (reverificado após o AD-056): `npm run build` verde,
  `oxlint` limpo, 226/226 vitest, 11/11 playwright
- **Uncommitted files**: `src/components/components.css` (alteração
  pré-existente de sessão anterior, não relacionada a esta feature; não
  tocada aqui)
- **Branch**: main, à frente de `origin/main` (commits locais, nenhum
  enviado)

#### Handoff anterior (design-lifecycle)

- **Feature**: identidade e ciclo de vida do System Design
  (`.specs/features/design-lifecycle/spec.md`)
- **Phase / Task**: feature concluída; T1-T6 implementados e verificados
- **Completed**: grilling (AD-033..AD-053), spec, tasks.md. T1 em `7086142`,
  T2 em `a6f4ecb`, T3 em `efde0cd`, T4 em `dd9f90a`, T5 em `bf36b80`, T6 em
  `93c7dee`. Correções pós-implementação encontradas em revisão: `5a65a9c`
  fecha lacunas da revisão de ciclo de vida; `76a2e69` corrige o fluxo de
  salvar design já nomeado (abria a modal com nome vazio em vez de gravar
  direto); `31e9022` corrige espaçamento na barra de controle e nos diálogos
  de confirmação. `a2eb9bf` (AD-054) restringe autoscaling aos tipos que
  escalam por réplica, achado correlato durante a mesma revisão. `ec0d461`
  remove os issues concluídos do scratch local
- **In-progress**: none
- **Next step**: nenhuma nesta feature
- **Blockers**: none
- **Gate final** (reverificado nesta sessão): `npm run build` verde, `oxlint`
  limpo, **221/221** vitest, 10/10 playwright
- **Branch**: main, sincronizada com `origin/main`

#### Handoff anterior (autoscaling)

- **Feature**: autoscaling (`.specs/features/autoscaling`)
- **Phase / Task**: feature autoscaling concluída; T1 (ciclo de vida da
  réplica), T2 (configuração), T3 (autoscaler na engine e badge), T4
  (estabilização de scale-down) e T5 (caso ponta a ponta) implementados e
  verificados
- **Completed**: T1 — `stepReplicas` reescrita com queda e reinício em blocos
  separados (`src/engine/tick.ts`); `RECOVERY_UTILIZATION`/`RECOVERY_TICKS`
  removidas, `RESTART_TICKS = 30` adicionada junto das demais constantes de
  tempo; `aliveReplicas` → `readyReplicas` e `recoveryTicks` → `restartTicks`
  em `types.ts`, `tick.ts`, `diagnose.ts`, `ComponentNode.tsx` e nos testes
  (`tick.test.ts`, `diagnose.test.ts`, `openRouter.test.ts`). Copy do
  diagnóstico em `diagnose.ts` também corrigida: as três mensagens que citavam
  "reduza a carga (util < 50%)" mentiam sobre o mecanismo novo e foram
  reescritas para refletir reinício por tempo fixo — achado durante a
  implementação, fora da lista de arquivos do ticket mas coberto pelo mesmo
  grep de `aliveReplicas` que o ticket mandou rodar
- **Review independente do T1** (agente separado, sem o contexto do autor):
  achou um bug bloqueante que os quatro gates verdes não pegavam. A primeira
  versão de `stepReplicas` zerava `restartTicks` em todo retorno do ramo de
  queda e `overloadTicks` em todo retorno do ramo de reinício — os dois
  relógios se zeravam mutuamente. Sob carga oscilante (25 ticks sobrecarregado
  + 5 ticks abaixo do teto, repetidos) a réplica caída nunca voltava, porque o
  contador de reinício nunca chegava a 30. Ou seja, a volta voltava a depender
  da utilização, justamente o AC central do ticket. Corrigido: os dois
  contadores são calculados de forma independente antes de qualquer decisão, e
  só zeram quando o próprio limiar dispara. Regra adicional: `restartTicks`
  zera junto de uma queda, porque a queda muda o conjunto de réplicas e abre
  uma lacuna nova — sem isso os relógios empatam e o componente oscila de 1
  tick. Teste `carga oscilante não impede o reinício` cobre o cenário e foi
  verificado falhando contra o código antigo (`expected 2 to be 3`) antes de a
  correção entrar
- **Também vindo do review**: asserções sobre `overloadTicks`/`restartTicks`
  removidas dos testes — a spec diz explicitamente que bom teste aqui não
  afirma sobre contador interno de tick, e elas quebrariam no T3/T4 sem o
  comportamento mudar; o teste de regressão virou comparação real entre o tick
  1 e o tick 200 sob carga estável, em vez de asserções soltas; comentários de
  produção em `tick.ts` removidos (eram os únicos em `src/engine/*.ts` e
  parafraseavam o código); copy `réplicas vivas` → `réplicas prontas` em
  `diagnose.ts`, que o AD-028 renomeou no código mas não no texto visível
- **Completed**: T2 — `AutoscalingConfig` opcional em `ComponentParams`,
  defaults/limites/validação no catálogo, configuração no `PropertiesPanel` e
  round-trip validado em store e persistência. O controle é oferecido a todos
  os tipos de componente, como exige AD-029; o campo de réplicas permanece
  visível nos tipos que o possuem. O build expôs que os campos escalares do
  painel haviam passado a aceitar o objeto `autoscaling`; o tipo foi
  restringido aos campos escalares. T2 não altera a engine.
- **Completed**: T3 — `desiredReplicas` entrou no `SimState` sem entrar no
  `Design`; a fórmula usa a utilização exibida e `readyReplicas`, com clamp
  no piso/teto, inicialização ajustada aos limites e guarda para zero prontas.
  O badge exibe desejado, parcial, `auto` e `(max)`. Seis casos observáveis de
  engine cobrem pico, clamp inicial, SQL write-bound, zero prontas e regressão
  sem autoscaling.
- **Completed**: T4 — scale-down agora exige 100 ticks consecutivos de
  recomendação menor antes de alterar `desiredReplicas`; scale-up continua
  imediato e qualquer recomendação que não seja menor zera a janela. A
  contagem (`scaleDownTicks`) é estado de simulação, não persistência nem UI.
  Dois testes observáveis cobrem a janela 99/100 ticks e o reset seguido de
  scale-up imediato.
- **Completed**: T5 — `e2e/autoscaling.spec.ts` importa um design mínimo,
  liga autoscaling pelo painel, altera o teto para 3, inicia com 150 RPS e
  afirma a transição do badge `x1 auto` para `x3 auto (max)`. O seletor
  `.replica-badge` foi adicionado ao contrato do AD-027; nenhum screenshot foi
  criado. A auditoria final também cobre, em `openRouter.test.ts`, que a
  configuração chega ao prompt da IA.
- **In-progress** (file:line): none
- **Next step**: nenhuma nesta feature.
- **Blockers**: none
- **Uncommitted files**: `src/evaluation/openRouter.test.ts`,
  `.specs/features/autoscaling/spec.md`, este `STATE.md`
- **Gate final**: `npm run build` verde, `oxlint` limpo, **210/210** vitest,
  6/6 playwright
- **Branch**: main

#### Handoff anterior (ui-redesign)

- **Feature**: ui-redesign (`.specs/features/ui-redesign`)
- **Phase / Task**: feature concluída; T1-T8 implementados e verificados
- **Completed**: grilling (AD-023..AD-027), spec, tickets T1-T8. T1 em db7deeb,
  T3 em ddce279, T2 em 6dc4eba, T4 em f7705c4, T5 em 1a1abeb, T6 em a707bf9,
  T7 em 0c8eee8, T8 em ffb1d70
- **In-progress** (file:line): none
- **Next step**: nenhuma nesta feature
- **Blockers**: none. A decisão da taxonomia foi fechada pelo usuário: `worker`
  fica em "Assíncrono", junto de Fila; há teste explícito desse agrupamento
- **Uncommitted files**: none
- **Gate final**: zero cores literais fora de `tokens.css`; `npm run build`
  verde, `oxlint` limpo, **186/186** vitest, 5/5 playwright. Quatro estados
  antes/depois revisados em 1440x900; a captura rodando aguarda `RPS 100` no nó

#### Convenções que T1-T5 fixaram — seguir em T6/T7/T8

- Números em `var(--font-mono)` com `font-variant-numeric: tabular-nums`; texto
  de interface em `var(--font-sans)`
- Violeta (`--color-accent`) é a cor do interativo e do que conecta
- `--color-health-ok/warn/bad/down` significam a mesma coisa em nó, barra de
  controle e barra de status. Vermelho não pode querer dizer outra coisa
- Rótulo de seção em caixa alta: `--font-size-2xs`, semibold,
  `letter-spacing: 0.04em`, `var(--color-text-secondary)`
- Chips e fundos tênues usam `var(--color-canvas)`; nenhum token novo foi criado
  desde o T1
- Raio `--radius-md` para cartões, `--radius-sm` para elementos pequenos
- Pesos de fonte são importados sob demanda em `src/main.tsx` (hoje: sans
  400/500/600, mono 400/500/600). Precisou de outro, importe lá

#### Como validar visualmente (o processo do AD-027)

- `.specs/features/ui-redesign/direcoes.html` é o mockup aprovado das três
  direções; a seção `.dir-c` do CSS é a direção escolhida. Copiado para o repo
  porque vivia num scratchpad de sessão
- `.specs/features/ui-redesign/shot.mjs` captura os quatro estados. O Node
  resolve `@playwright/test` pela localização do script, então copie para a raiz
  antes de rodar: `cp .specs/features/ui-redesign/shot.mjs ./.shot.tmp.mjs &&
  node ./.shot.tmp.mjs; rm -f ./.shot.tmp.mjs`. Exige o Vite de pé em `:5173`
- O script roda a 100 RPS e deixa tudo verde. Para exercitar a cor semântica,
  edite uma cópia para 20000 RPS antes de iniciar a simulação

- **Branch**: main; todos os commits da feature estão prontos para envio

#### Handoff anterior (evaluation-history)

- **Feature**: evaluation-history (`.specs/features/evaluation-history`)
- **Phase / Task**: feature concluída; T1-T4 implementados e verificados
- **Completed**: grilling (AD-020, AD-021, AD-022), spec, tickets T1-T4. T1 em b3bb3b2, T2 em 2ff07cf, T3 em d60615d. T4 (`e2e/evaluation-history.spec.ts`, 3 casos: ordem da coluna, troca de seleção, rodada não simulada) implementado, commit pendente. `EVALUATION_HISTORY_LIMIT` movido de `useAppStore` para `engine/catalog` para a persistência não depender do store
- **In-progress** (file:line): none
- **Next step**: nenhuma nesta feature. Backlog: melhoria visual geral da UI (escopo a definir)
- **Blockers**: none
- **Uncommitted files**: T4 (`e2e/evaluation-history.spec.ts`), tasks.md e este STATE.md
- **Gate final**: `npm run build` verde, `oxlint` limpo, 183/183 vitest, 5/5 playwright
- **Branch**: main, sincronizada com `origin/main`

#### Handoff anterior (tech-selector)

- **Feature**: tech-selector (`.specs/features/tech-selector`)
- **Phase / Task**: Feature concluída; T1-T3 implementados e verificados
- **Completed**: T1 (be5bdbd, recalibração de defaults + fecho do AD-014), T2 (d3dbe0f, seletor ponta a ponta para queue). T3 (presets dos demais 4 tipos) implementado, gate verde, commit pendente. Gate final: build verde, 146/146 testes, lint limpo.
- **In-progress** (file:line): none
- **Next step**: nenhuma (feature completa); validação visual do `<select>` e do rótulo no canvas via `npm run dev` fica a critério
- **Blockers**: none
- **Uncommitted files**: T3 (catalog.ts, catalog.test.ts, useAppStore.test.ts, tasks.md, este STATE.md)
- **Branch**: main (11+ commits locais, nenhum enviado)

#### Handoff anterior (custom-brief)

- Feature concluída; T1-T8 (fbbff41, b10f879, 7b7a8dc, 360659b, e894bb2, 612f38d, 9a256eb, 0e6885d). Mensagens de T2-T8 reescritas por `filter-branch` para acentuação; backup em `backup-custom-brief` e tag `backup-antes-rebase`.

### Dívidas conhecidas

- ~~Acentuação inconsistente no corpo das mensagens de commit.~~ Resolvida: mensagens de T2, T3, T7 e T8 reescritas por `filter-branch`, com o conteúdo dos commits verificado como idêntico. Corrigido junto um erro de concordância no T8 ("passam a marcados" -> "passam a ser marcados").
- As linhas AD-001 a AD-010 seguem sem acentuação, anteriores ao AD-011. Não reescritas por serem registro histórico.
