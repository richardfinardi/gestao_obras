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

## Primeiro passo

Executar `setupSistema()` no Apps Script ligado à planilha do projeto. A função cria todas as abas e campos automaticamente e pode ser executada novamente com segurança para adicionar campos futuros.


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
