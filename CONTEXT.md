# System Design Simulator

Simulador didático no qual uma arquitetura persistível é exercitada sob diferentes condições de carga.

## Language

**System Design**:
Entidade que reúne identidade estável, nome opcional, desafio, brief, topologia e histórico de avaliações de uma arquitetura. Sua identidade nasce com a entidade, antes do primeiro salvamento, e acompanha sua exportação e importação.
_Avoid_: Sessão, simulação

**Nome do design**:
Identificador humano opcional, único sem distinção entre maiúsculas e minúsculas entre os System Designs salvos localmente. Não determina a identidade da entidade.
_Avoid_: ID, chave do design

**Alteração não salva**:
Diferença entre o conteúdo persistível atual de um System Design e seu último estado salvo. Controles e estado da simulação não participam dessa comparação.
_Avoid_: Simulação em andamento, controle alterado

**Controles da simulação**:
Condições temporárias usadas para exercitar um System Design, como carga e percentual de escritas. Não fazem parte do System Design persistido.
_Avoid_: Configuração do design
