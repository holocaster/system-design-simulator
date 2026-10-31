# Identidade e Ciclo de Vida do System Design - Especificação

status: ready-for-agent

## Problem Statement

O simulador trata designs salvos como pares de nome e conteúdo. O nome é a chave do armazenamento, e salvar novamente com o mesmo texto sobrescreve o que já existe sem distinguir se o usuário está atualizando a mesma arquitetura ou substituindo outra. Na tela não existe um design ativo com identidade própria, nem indicação permanente de qual design está aberto ou se há alterações não salvas.

Essa ausência de identidade fragmenta o ciclo de trabalho. O usuário precisa informar um nome em todo salvamento, não pode renomear sem misturar a operação com o conteúdo, não tem uma ação clara de “Novo design” e pode perder alterações ao carregar ou importar outra arquitetura. O histórico de avaliações já pertence ao artefato, mas a interface ainda não trata o artefato inteiro como uma entidade que nasce, muda, é salva, carregada, exportada e excluída.

Também não há baseline salvo. A aplicação não sabe diferenciar uma mudança no design de um ajuste temporário da simulação, nem pode avisar com precisão quando uma troca, recarga ou fechamento descartará trabalho. O resultado é um fluxo de documento implícito e vulnerável à perda de dados dentro de uma ferramenta cujo uso natural é iterar repetidamente sobre a mesma arquitetura.

## Solution

O System Design passa a ser uma entidade com `id` estável, nome opcional e conteúdo próprio. A identidade nasce junto com a entidade, antes do primeiro salvamento, e é preservada por edições, avaliações, salvamentos, renomeações, exportações e importações. O armazenamento local passa a indexar designs por `id`; o nome se torna identificação humana única, não chave técnica.

A aplicação mantém um design ativo e o compara com seu último baseline salvo. Mudanças no conteúdo persistível deixam o design alterado; carga, percentual de escritas e execução continuam sendo controles temporários da simulação e não afetam esse estado. Novo, carregar e importar compartilham uma proteção com três escolhas: salvar e continuar, descartar ou cancelar. Fechar ou recarregar a página usa a proteção nativa do navegador.

Um grupo “Design” na barra mostra o nome atual ou “Sem título”, o estado de salvamento e as ações frequentes “Novo design” e “Salvar”, separado dos controles da simulação. O diálogo lateral vira “Gerenciar designs” e concentra carregar, renomear, excluir, importar e exportar. Renomear persiste somente o nome; excluir o ativo remove apenas sua cópia salva e preserva o conteúdo aberto.

O formato continua com `schema: 1`, agora exigindo `id`. Como o produto ainda não foi distribuído, não há migração de armazenamento nem suporte a JSON anterior sem identidade.

## User Stories

1. Como usuário, quero que cada System Design tenha identidade própria, para que salvar atualize a entidade correta sem depender do nome.
2. Como usuário, quero que a identidade exista antes do primeiro salvamento, para que o ciclo do design não comece apenas quando eu escolher um nome.
3. Como usuário, quero que editar, avaliar, salvar e renomear preservem o `id`, para que essas ações continuem tratando o mesmo design.
4. Como usuário, quero iniciar a aplicação com um design novo e vazio, para que nenhuma sessão anterior seja reaberta implicitamente.
5. Como usuário, quero ver “Sem título” antes do primeiro salvamento, para que fique claro que o design ainda não tem nome.
6. Como usuário, quero ver permanentemente o nome do design ativo, para que eu saiba qual entidade estou editando.
7. Como usuário, quero ver “Alterações não salvas” quando o conteúdo divergir do último salvamento, para que eu saiba que há trabalho pendente.
8. Como usuário, quero ver “Salvo” quando o conteúdo corresponder ao baseline persistido, para que eu tenha confirmação do estado atual.
9. Como usuário, quero que um design vazio nunca persistido não exiba um falso aviso de alteração, para que o estado inicial não pareça um problema.
10. Como usuário, quero informar um nome somente no primeiro salvamento, para que salvamentos seguintes sejam rápidos.
11. Como usuário, quero que salvamentos seguintes atualizem pelo `id`, para que renomear não crie outra entidade.
12. Como usuário, quero que o botão Salvar fique desabilitado quando um design já salvo estiver limpo, para que a interface não ofereça uma ação sem efeito.
13. Como usuário, quero usar nomes de 1 a 40 caracteres com acentos, espaços e pontuação, para que os nomes sejam naturais em português.
14. Como usuário, quero que espaços nas extremidades sejam removidos, para que diferenças invisíveis não criem nomes distintos.
15. Como usuário, quero que nomes salvos sejam únicos sem diferenciar maiúsculas de minúsculas, para que a lista não contenha entradas visualmente ambíguas.
16. Como usuário, quero confirmar antes de substituir outro design por conflito de nome, para que uma colisão não apague trabalho silenciosamente.
17. Como usuário, quero cancelar um conflito de nome sem qualquer mutação, para que eu possa escolher outro nome com segurança.
18. Como usuário, quero renomear um design sem salvar outras edições pendentes, para que uma mudança de metadado não confirme trabalho por acidente.
19. Como usuário, quero renomear um design não ativo sem carregá-lo, para que eu organize a lista sem trocar o canvas atual.
20. Como usuário, quero identificar a linha do design aberto no gerenciador, para que operações sobre a lista não sejam confundidas com troca de entidade.
21. Como usuário, quero impedir que um design não ativo tome o nome do design aberto, para que o ativo não perca sua cópia salva por uma operação indireta.
22. Como usuário, quero que mudanças no desafio, brief, topologia, parâmetros, nomes de componentes e avaliações contem como alterações, para que todo conteúdo persistível seja protegido.
23. Como usuário, quero que ajustes de RPS e percentual de escritas não contem como alterações do design, para que experimentar cargas não produza avisos indevidos.
24. Como usuário, quero que iniciar, parar ou avançar a simulação não deixe o design alterado, para que estado de execução não seja confundido com conteúdo.
25. Como usuário, quero que reverter manualmente o conteúdo ao baseline elimine o estado alterado, para que eu não receba aviso depois de desfazer minha própria edição.
26. Como usuário, quero ser avisado ao criar um novo design com alterações pendentes, para que eu não perca o trabalho atual.
27. Como usuário, quero a mesma proteção ao carregar outro design, para que carregar não seja uma rota de perda silenciosa.
28. Como usuário, quero a mesma proteção ao importar JSON, para que importar não substitua o canvas sem consentimento.
29. Como usuário, quero salvar e continuar uma troca pendente, para que eu preserve o trabalho e conclua a ação original em um único fluxo.
30. Como usuário, quero descartar e continuar uma troca pendente, para que eu possa abandonar conscientemente as alterações.
31. Como usuário, quero cancelar uma troca pendente, para que design e simulação permaneçam intactos.
32. Como usuário, quero que erro de salvamento ou conflito não confirmado cancele a troca, para que a aplicação não prossiga sem garantir o destino do trabalho.
33. Como usuário, quero que a simulação só pare quando a troca for efetivada, para que abrir ou cancelar uma confirmação não interrompa meu experimento.
34. Como usuário, quero receber o aviso nativo ao fechar ou recarregar a página com alterações pendentes, para que `Ctrl+R` não contorne a proteção da aplicação.
35. Como usuário, quero recarregar ou sair sem aviso quando o design estiver limpo, para que a proteção não seja intrusiva.
36. Como usuário, quero criar um novo design com canvas, brief, histórico e métricas vazios, para que a nova entidade não misture conteúdo anterior.
37. Como usuário, quero que Novo design restaure o desafio inicial, 100 RPS e 20% de escritas, para que o novo exercício comece dos defaults conhecidos.
38. Como usuário, quero que carregar ou importar preserve o RPS e o percentual de escritas atuais, para que eu compare arquiteturas sob a mesma condição.
39. Como usuário, quero que carregar ou importar pare a execução e limpe métricas, para que resultados do design anterior não apareçam no novo.
40. Como usuário, quero exportar o estado atual completo, inclusive alterações pendentes, identidade, nome e histórico, para que o arquivo seja um snapshot fiel.
41. Como usuário, quero que exportar não seja tratado como salvamento local, para que o baseline não seja alterado sem gravação no aplicativo.
42. Como usuário, quero que um design sem nome seja exportado como `design-sem-titulo.json`, para que o download tenha nome previsível.
43. Como usuário, quero que importar preserve o `id` e o nome do arquivo, para que restaurar um backup continue tratando a mesma entidade.
44. Como usuário, quero que importar abra uma revisão não salva sem escrever automaticamente no armazenamento, para que eu possa revisar ou cancelar antes de substituir algo.
45. Como usuário, quero que somente JSON com `schema: 1` e identidade válida seja aceito, para que o estado ativo nunca fique sem `id`.
46. Como usuário, quero confirmar toda exclusão, para que remover uma cópia persistida nunca seja acidental.
47. Como usuário, quero excluir um design não ativo sem alterar o design aberto, para que a operação permaneça restrita à entrada escolhida.
48. Como usuário, quero que excluir o design ativo preserve seu conteúdo em memória, para que excluir a cópia local não apague o canvas como efeito colateral.
49. Como usuário, quero que o design ativo excluído passe a não salvo e possa ser salvo novamente, para que eu consiga recriar sua cópia persistida.
50. Como aluno, quero que cada design mantenha seu próprio histórico de avaliações, para que carregar ou importar nunca misture rodadas entre arquiteturas.
51. Como aluno, quero que `id` e nome não entrem no prompt da IA, para que metadados de organização não contaminem o diagnóstico.
52. Como usuário, quero que uma falha do armazenamento mantenha o conteúdo ativo e alterado, para que um erro local não resulte em perda de trabalho.

## Implementation Decisions

Todas as decisões estão registradas com racional completo em AD-033 a AD-053.

### Modelo de domínio

- O System Design contém `schema`, `id`, nome opcional, desafio opcional, brief opcional, nós, conexões e histórico opcional de avaliações.
- `schema` permanece `1`; `id` passa a ser obrigatório no contrato corrente.
- A identidade é criada com a entidade e permanece estável durante seu ciclo normal.
- O nome é identificação humana, não chave técnica. Só pode estar ausente antes do primeiro salvamento.
- RPS, percentual de escritas, métricas e estado de execução continuam fora do System Design.
- A aplicação não restaura o último design ativo ao iniciar. Inicialização cria uma entidade nova com os mesmos defaults de “Novo design”.

### Persistência e nomes

- A coleção local é indexada por `id`. O nome fica armazenado dentro da entidade.
- Não haverá migração do formato atual nem aceitação de JSON sem `id`, pois não existe instalação ou artefato externo a preservar.
- Nomes são normalizados com trim, preservam a grafia e são comparados sem distinção entre maiúsculas e minúsculas.
- Nome válido tem de 1 a 40 caracteres após trim e aceita Unicode, espaços internos e pontuação.
- Salvar uma entidade já persistida atualiza pelo `id`, independentemente do nome.
- Conflito de nome com outro `id` exige confirmação. Confirmar remove a entidade conflitante e persiste a ativa sem trocar seu `id`; cancelar não altera nada.
- Um design não ativo não pode ser renomeado para o nome do design aberto. A interface orienta renomear primeiro o ativo.
- Renomear um design salvo persiste somente o nome. Para o ativo, o baseline incorpora o nome novo sem incorporar outras mudanças pendentes.
- Renomear um design não ativo não o carrega nem altera o ativo.
- Toda exclusão exige confirmação. Excluir o ativo remove sua versão persistida, preserva a entidade aberta e elimina seu baseline salvo; salvar depois recria a mesma identidade.
- Falhas de armazenamento não alteram o conteúdo ativo, seu baseline ou a ação de troca pendente.

### Baseline e alterações

- O estado alterado é derivado da diferença entre o conteúdo persistível atual e o último baseline salvo, não de um booleano irreversível.
- Um design novo e vazio começa limpo mesmo sem cópia persistida. Sua primeira mudança o deixa alterado.
- Salvar e carregar definem um baseline limpo.
- Importar sempre abre a entidade como revisão alterada, mesmo quando seu conteúdo coincide com uma cópia local.
- Mudanças em desafio, brief, nós, posições, conexões, parâmetros, nomes de componentes e avaliações participam da comparação.
- Identidade e nome também pertencem ao conteúdo, respeitando a atualização parcial do baseline durante renomeação.
- RPS, percentual de escritas, métricas e estado de execução não participam da comparação.

### Trocas de entidade

- Novo, carregar e importar usam o mesmo fluxo de proteção quando o ativo está alterado: salvar e continuar, descartar ou cancelar.
- Salvar e continuar atualiza diretamente um design nomeado. Para entidade ainda sem nome, solicita o nome e só continua após salvamento bem-sucedido.
- Descartar executa a ação pendente sem salvar. Cancelar preserva design, execução e métricas.
- Erro de salvamento, nome inválido ou conflito não confirmado cancela a transição.
- A simulação para apenas quando a troca realmente acontece.
- Novo cria outro `id` e restaura canvas vazio, brief vazio, desafio inicial, histórico vazio, nenhuma métrica, 100 RPS e 20% de escritas.
- Carregar e importar substituem a entidade inteira e seu histórico, param a simulação e limpam métricas, mas preservam RPS e percentual de escritas.
- Fechar, recarregar ou navegar para fora com alterações registra a proteção nativa do navegador. Não há mensagem personalizada nem opção de salvar nesse diálogo.

### Importação e exportação

- Exportar serializa o estado atual inteiro, com `id`, nome opcional e histórico, mesmo quando alterado.
- Exportar não grava localmente, não atualiza o baseline e não limpa o estado alterado.
- O nome do arquivo deriva do nome do design; sem nome usa `design-sem-titulo.json`.
- Importar exige o contrato corrente com identidade, preserva `id` e nome e não grava automaticamente no armazenamento.
- A entidade importada fica alterada e será persistida somente por ação explícita de salvar, sujeita às regras de conflito.

### Interface

- Um grupo “Design” abre a barra de controles e fica visualmente separado do grupo da simulação.
- O grupo mostra o nome ou “Sem título”, o estado “Alterações não salvas”/“Salvo”, “Novo design” e “Salvar”.
- Design vazio nunca persistido mostra somente “Sem título”.
- Salvar fica desabilitado apenas quando uma entidade já persistida está limpa; entidade nunca persistida ainda pode ser salva mesmo vazia.
- O diálogo lateral passa a se chamar “Gerenciar designs” e reúne carregar, renomear, excluir, importar e exportar.
- A linha do design ativo recebe o rótulo “Aberto”.
- Confirmações de conflito, exclusão e alterações pendentes são explícitas e não usam apenas estado visual implícito.

### Avaliação por IA

- A avaliação concluída continua sendo anexada ao histórico do design ativo e passa a deixá-lo alterado.
- O prompt não recebe `id`, nome nem avaliações anteriores. Ele continua limitado à arquitetura, ao brief resolvido e ao contexto da rodada.
- Nenhuma mudança é feita na independência entre avaliações definida anteriormente.

## Testing Decisions

### O que faz um bom teste

Um bom teste afirma o comportamento que o usuário ou um consumidor público observa: identidade preservada, entidade correta persistida, estado alterado coerente, conteúdo protegido e mensagem/ação visível. Não deve afirmar sobre a representação interna do baseline, nomes de helpers, flags privadas ou ordem de chamadas entre componentes.

Os seams foram confirmados com o usuário durante o grilling. Nenhuma abstração será criada apenas para facilitar testes.

### Persistência

O seam de persistência existente, com `Storage` injetado, cobre:

- coleção indexada por `id` e atualização da mesma entidade após renomear;
- validação de identidade obrigatória no import;
- round-trip de identidade, nome, topologia e histórico;
- trim, limite e comparação de nomes sem distinção entre maiúsculas e minúsculas;
- conflito confirmado e não confirmado;
- renomeação sem alterar conteúdo não relacionado;
- exclusão de entidades;
- falhas de leitura e escrita sem mutação do argumento nem perda da coleção anterior.

Prior art: testes atuais de salvar/carregar, validação de importação, round-trip JSON e armazenamento indisponível.

### Store

O seam público do store cobre:

- identidade presente na inicialização e nova identidade após “Novo design”;
- preservação do `id` em edição, avaliação, salvamento e renomeação;
- design novo vazio limpo, primeira edição alterada e reversão ao baseline limpa;
- inclusão de todos os campos persistíveis e exclusão dos controles da simulação na comparação;
- salvar/carregar limpos e importar alterado;
- renomeação atualizando apenas a parcela de nome do baseline;
- exclusão do ativo preservando conteúdo e removendo seu baseline;
- Novo restaurando defaults completos;
- carregar/importar preservando RPS e percentual de escritas, mas parando e limpando métricas;
- históricos substituídos, nunca mesclados, na troca de entidade.

Prior art: testes atuais de `currentDesign`, `loadDesign`, ações de edição e histórico de avaliações.

### Avaliação por IA

Uma guarda de regressão no seam de prompt confirma que `id`, nome e histórico não aparecem na entrada do modelo, enquanto arquitetura, brief e contexto da rodada continuam presentes.

Prior art: testes atuais inspecionam o corpo enviado à avaliação e já protegem a exclusão do histórico.

### Ponta a ponta

Playwright cobre somente comportamento que existe na interface real:

- primeiro salvamento, edição e fluxo completo de salvar/descartar/cancelar antes de “Novo design”;
- nome/estado visíveis e separação entre ações de design e simulação;
- gerenciamento de carregar, renomear e excluir, incluindo o rótulo do ativo;
- importação de uma entidade e exportação do estado atual;
- aviso nativo ao tentar recarregar uma página alterada.

Os casos semeiam estado por importação JSON quando isso evitar drag-and-drop no canvas. Não haverá testes de componente nem screenshots versionados. O escopo e2e permanece pequeno; regras combinatórias ficam nos testes unitários.

### Gates

- Build e typecheck completos.
- Oxlint limpo.
- Suíte Vitest completa.
- Suíte Playwright completa.
- Verificação de ausência de regressão nos fluxos existentes de tecnologia, histórico de avaliações e autoscaling.

## Out of Scope

- Migração do formato atual do `localStorage`.
- Importação de JSON sem `id` ou compatibilidade com contrato anterior.
- Alteração para `schema: 2` nesta fase de desenvolvimento.
- Restauração automática do último design ou persistência da sessão ativa.
- Autosave.
- Duplicação de design ou “Salvar como”.
- Coordenação, locks, detecção de conflito ou sincronização entre abas; o último salvamento vence.
- Lixeira, recuperação de exclusão ou undo.
- Renomear um design nunca persistido fora do fluxo do primeiro salvamento.
- Persistir RPS, percentual de escritas, métricas ou estado da simulação no System Design.
- Enviar identidade, nome ou histórico ao prompt da IA.
- Backend, conta de usuário ou sincronização remota.
- Auditoria de acessibilidade ampla, screenshots visuais versionados ou testes de componente.

## Further Notes

Há três distinções que não devem ser simplificadas durante a implementação:

1. **Nome não é identidade.** Trocar o nome nunca troca o `id`; salvar nunca procura a entidade pelo nome para decidir qual atualizar.
2. **Exportar não é salvar.** Um arquivo baixado não cria baseline local nem elimina a proteção de saída.
3. **Excluir a cópia salva não exclui a entidade aberta.** O ativo permanece em memória e passa a não salvo, como uma revisão importada.

O caso mais delicado é renomear um design não ativo para o nome do ativo. Ele é bloqueado deliberadamente. Sem essa proteção, a confirmação removeria a cópia persistida do design ainda aberto e mudaria seu estado por uma ação iniciada em outra linha da lista.

O comportamento multiaba é deliberadamente último-salvamento-vence. Isso não deve ser “corrigido” com eventos de armazenamento ou revisão otimista dentro desta feature.
