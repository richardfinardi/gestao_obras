# Gestão de Obras

Sistema web de planejamento e acompanhamento físico de obras.

## Arquitetura

- Google Sheets: banco de dados
- Google Apps Script: backend / motor de regras
- HTML + CSS + JavaScript: frontend
- GitHub Pages: hospedagem do frontend

## Princípios

- Múltiplas obras desde a V1.
- Usuário não edita datas calculadas diretamente.
- Execuções são append-only: medições antigas nunca são sobrescritas.
- Baseline é congelada e separada do forecast.
- Dependências podem liberar atividades por percentual.
- Schema do Google Sheets é criado e evoluído por código.
- Sem SQL, React, frameworks ou APIs externas.

## Estrutura inicial

- `apps-script/Code.gs`: bootstrap e schema do banco.
- `apps-script/appsscript.json`: manifesto do Apps Script.
- `docs/MODELAGEM_V1.md`: modelagem funcional e dados.

## Fluxo de desenvolvimento

O GitHub é a fonte oficial do projeto.

- Frontend: arquivos da raiz do repositório.
- Backend: módulos em `apps-script/`.
- Banco: Google Sheets `GESTAO_OBRAS_DB`.
- Deploy do Apps Script: automatizado por GitHub Actions usando a autorização `clasp` já existente no projeto Fluxo de Caixa.
- Alterações de schema são feitas por código e/ou diretamente pela integração com Google Sheets; o usuário não cria campos manualmente.

Não existe mais fluxo de copiar/colar `Code.gs` ou executar bundle manual.

## Estado atual

### Banco
O banco oficial `GESTAO_OBRAS_DB` já foi inicializado com 15 abas e schema V1.

### Backend V1
Implementado no repositório:
- `Code.gs`: schema e bootstrap.
- `Utils.gs`: utilidades e respostas JSON.
- `Db.gs`: acesso centralizado ao Sheets.
- `Obras.gs`: regras e CRUD inicial de obras.
- `Api.gs`: endpoints HTTP iniciais.

Rotas iniciais:
- `GET ?action=health`
- `GET ?action=obras.list`
- `GET ?action=obras.get&id=...`
- `POST ?action=obras.create`
- `POST ?action=obras.update&id=...`

A próxima etapa é ativar/publicar o projeto Google Apps Script e então conectar o frontend GitHub Pages.


## Deploy automático

A ponte de publicação fica em `richardfinardi/fluxo_caixa`, workflow `deploy-gestao-obras.yml`.

Quando uma alteração de backend estiver pronta:
1. o código é atualizado em `richardfinardi/gestao_obras`;
2. o gatilho de deploy no `fluxo_caixa` é atualizado;
3. GitHub Actions usa `clasp` para enviar os módulos ao Apps Script;
4. o deployment Web App existente é atualizado mantendo a mesma URL `/exec`.

O único vínculo técnico necessário para concluir a automação é o Script ID do projeto Apps Script atual.
