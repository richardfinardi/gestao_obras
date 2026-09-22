# Modelagem Funcional V1

## Escopo inicial

A V1 será de um único usuário, porém suportará múltiplas obras. A estrutura já inclui `ID_ORGANIZACAO` nas entidades principais para permitir evolução futura para múltiplas empresas e acessos sem refazer o banco.

## Camadas do cronograma

1. **Baseline** — planejamento aprovado e congelado.
2. **Forecast** — cronograma atual recalculado pelo motor.
3. **Realizado** — histórico físico efetivamente informado.

## Entidades

### OBRAS
Cadastro principal da obra e suas datas contratuais.

### WBS
Estrutura Analítica da Obra. Permite níveis hierárquicos ilimitados via `ID_WBS_PAI`.

### ATIVIDADES
Cadastro das atividades físicas da obra. Duração, peso, responsáveis, restrições e campos calculados de forecast ficam centralizados aqui.

### DEPENDENCIAS
Relação muitos-para-muitos entre atividades. Uma atividade filha pode depender de várias atividades pai. Cada dependência possui percentual de liberação e lag em dias.

### EXECUCOES
Histórico append-only das medições. Nunca substituir registros anteriores.

### BASELINES / BASELINE_ATIVIDADES / BASELINE_DEPENDENCIAS
Snapshots do planejamento aprovado. Uma obra pode possuir várias versões de baseline.

### CALENDARIOS / CALENDARIO_EXCECOES
Dias úteis e exceções específicas.

### EMPRESAS_EXECUTORAS / RESPONSAVEIS / TIPOS_ATIVIDADE
Cadastros auxiliares.

### AUDITORIA
Rastreabilidade de alterações relevantes.

## Regras já definidas

- Datas de forecast são calculadas e não são editadas pelo usuário.
- Início manual é tratado como restrição de início mínimo.
- Peso físico da obra é calculado pela soma ponderada das atividades.
- Status é calculado pelo sistema.
- Uma atividade com múltiplas dependências só é liberada quando todas as dependências ativas forem atendidas.
- Percentual de execução não pode regredir sem operação administrativa específica.
- Baseline nunca é alterada pelo recalculo do forecast.
- Histórico de execução é imutável por padrão.

## Próximas etapas

1. Criar a planilha nativa do sistema.
2. Vincular o Apps Script e executar o bootstrap.
3. Implementar CRUD/API JSON.
4. Implementar motor de calendário e dependências.
5. Implementar baseline.
6. Implementar motor de forecast.
7. Implementar frontend de cadastro/planejamento.
8. Implementar diário de avanço.
9. Implementar dashboard e Curva S.
10. Implementar caminho crítico e simulações.
