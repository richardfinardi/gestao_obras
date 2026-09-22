# Configuração inicial do Google Apps Script

O banco oficial já está criado e configurado no Google Sheets.

## Banco oficial

- Nome: GESTAO_OBRAS_DB
- O código do backend já contém o ID da planilha.
- Não é necessário criar abas ou cabeçalhos manualmente.

## Passo único para ativar o backend

A conexão atual permite editar o Google Sheets e o GitHub, mas não permite criar ou publicar projetos Google Apps Script.

1. Abra a planilha GESTAO_OBRAS_DB.
2. Acesse **Extensões > Apps Script**.
3. Crie os arquivos abaixo no projeto Apps Script usando o conteúdo correspondente do repositório:
   - Code.gs
   - Utils.gs
   - Db.gs
   - Obras.gs
   - Api.gs
4. No arquivo appsscript.json, use o manifesto do repositório.
5. Execute `verificarSchema()` uma vez para autorizar o script e confirmar o banco.
6. Faça uma implantação como **Aplicativo da Web**.
7. Execute como o proprietário do projeto.
8. Durante desenvolvimento, disponibilize somente conforme necessário e não divulgue a URL.
9. Copie a URL `/exec` da implantação para configuração do frontend.

## Teste inicial

Após a publicação:

```
<URL_DO_WEBAPP>?action=health
```

Resposta esperada:

```json
{
  "ok": true,
  "data": {
    "app": "Gestão de Obras",
    "schemaVersion": "1"
  }
}
```

## Segurança

A API ainda está em estágio de desenvolvimento. Não publicar a interface para terceiros antes da implementação do módulo de autenticação/sessão.

## Evolução

Depois que o primeiro projeto Apps Script estiver criado, avaliar sincronização automatizada via clasp/GitHub Actions para eliminar cópias manuais nas próximas versões.
