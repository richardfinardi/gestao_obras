/**
 * Segurança simples para a V1 de um único usuário.
 * A chave fica em Script Properties, nunca no Sheets nem no GitHub.
 */

const AUTH = Object.freeze({
  PROPERTY_KEY: 'GESTAO_OBRAS_ACCESS_KEY'
});

function configurarChaveAcesso() {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty(AUTH.PROPERTY_KEY, token);
  Logger.log('CHAVE DE ACESSO: ' + token);
  return token;
}

function validarChaveAcesso_(payload) {
  const expected = PropertiesService.getScriptProperties().getProperty(AUTH.PROPERTY_KEY);

  if (!expected) {
    throw new Error('CHAVE_ACESSO_NAO_CONFIGURADA');
  }

  const informed = String(
    (payload && (payload.access_key || payload.ACCESS_KEY || payload.token)) || ''
  ).trim();

  if (!informed || informed !== expected) {
    throw new Error('ACESSO_NEGADO');
  }

  return true;
}
