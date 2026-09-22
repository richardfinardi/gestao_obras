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
6. Execute `configurarChaveAcesso()` uma vez. Copie a chave mostrada no log de execução e guarde-a; ela será solicitada no primeiro acesso ao frontend.
7. Faça uma implantação como **Aplicativo da Web**.
8. Execute como o proprietário do projeto.
9. O frontend GitHub usa a URL `/exec` configurada no `app.js`.
10. Sempre que o backend for alterado, atualize a implantação do Apps Script para uma nova versão.

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


## Atualização após a primeira implantação

O bundle atual inclui proteção por chave de acesso. Se o Apps Script foi publicado antes desta alteração:

1. Substitua o conteúdo do `Code.gs` pelo arquivo atualizado `apps-script/DEPLOY_SINGLE_FILE.gs`.
2. Execute `configurarChaveAcesso()`.
3. Vá em **Implantar > Gerenciar implantações > Editar**.
4. Selecione **Nova versão** e publique mantendo a mesma URL `/exec`.
5. Abra o frontend e informe a chave gerada.
