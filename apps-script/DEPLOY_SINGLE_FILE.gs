/**
 * GESTÃO DE OBRAS - BACKEND V1
 * Bundle único para implantação no Google Apps Script.
 *
 * Fonte oficial modular: /apps-script/*.gs
 * Banco oficial: GESTAO_OBRAS_DB
 */



// ============================================================
// apps-script/Code.gs
// ============================================================

/**
 * GESTÃO DE OBRAS
 * Bootstrap do banco Google Sheets
 *
 * V1 - Schema inicial
 * Idempotente: pode ser executado novamente para criar abas
 * e acrescentar campos que ainda não existam.
 */

const APP = Object.freeze({
  NAME: 'Gestão de Obras',
  SCHEMA_VERSION: '1',
  TIMEZONE: 'America/Sao_Paulo',
  DEFAULT_ORGANIZATION_ID: 'ORG-001',
  SPREADSHEET_ID: '1FY1ToQ4I8CdZk1zvxQ4fMO3SHO6uggKcNhaixZvq5GA'
});

const DB_SCHEMA = Object.freeze({
  CONFIG: [
    'CHAVE','VALOR','DESCRICAO','ATUALIZADO_EM'
  ],

  OBRAS: [
    'ID_OBRA','ID_ORGANIZACAO','CODIGO','NOME','CLIENTE','DESCRICAO',
    'DATA_INICIO_CONTRATUAL','DATA_FIM_CONTRATUAL','ID_CALENDARIO','STATUS',
    'ID_BASELINE_ATIVA','ATIVA','CRIADO_EM','ATUALIZADO_EM'
  ],

  WBS: [
    'ID_WBS','ID_OBRA','ID_WBS_PAI','CODIGO_WBS','NOME','ORDEM',
    'ATIVA','CRIADO_EM','ATUALIZADO_EM'
  ],

  TIPOS_ATIVIDADE: [
    'ID_TIPO_ATIVIDADE','ID_ORGANIZACAO','NOME','COR','ATIVO',
    'CRIADO_EM','ATUALIZADO_EM'
  ],

  EMPRESAS_EXECUTORAS: [
    'ID_EMPRESA','ID_ORGANIZACAO','NOME','DOCUMENTO','CONTATO',
    'TELEFONE','EMAIL','ATIVA','CRIADO_EM','ATUALIZADO_EM'
  ],

  RESPONSAVEIS: [
    'ID_RESPONSAVEL','ID_ORGANIZACAO','NOME','EMAIL','TELEFONE',
    'ATIVO','CRIADO_EM','ATUALIZADO_EM'
  ],

  ATIVIDADES: [
    'ID_ATIVIDADE','ID_OBRA','ID_WBS','CODIGO','NOME','ID_TIPO_ATIVIDADE',
    'ID_EMPRESA','ID_RESPONSAVEL','DURACAO_PLANEJADA_DIAS','PESO_PERCENTUAL',
    'RESTRICAO_INICIO_MINIMO','PERCENTUAL_ATUAL',
    'DATA_INICIO_FORECAST','DATA_FIM_FORECAST',
    'DATA_INICIO_REAL','DATA_FIM_REAL',
    'DURACAO_PROJETADA_DIAS','FOLGA_TOTAL_DIAS','CAMINHO_CRITICO',
    'STATUS','ULTIMA_MEDICAO_EM','ULTIMA_OBSERVACAO',
    'ORDEM','ATIVA','CRIADO_EM','ATUALIZADO_EM'
  ],

  DEPENDENCIAS: [
    'ID_DEPENDENCIA','ID_OBRA','ID_ATIVIDADE_PAI','ID_ATIVIDADE_FILHA',
    'PERCENTUAL_LIBERACAO','LAG_DIAS','ATIVA','CRIADO_EM','ATUALIZADO_EM'
  ],

  EXECUCOES: [
    'ID_EXECUCAO','ID_OBRA','ID_ATIVIDADE','DATA_REFERENCIA',
    'PERCENTUAL_ANTERIOR','PERCENTUAL_NOVO','AVANCO_PERIODO',
    'OBSERVACAO','REGISTRADO_POR','CRIADO_EM'
  ],

  BASELINES: [
    'ID_BASELINE','ID_OBRA','VERSAO','NOME','DATA_BASELINE',
    'OBSERVACAO','ATIVA','CRIADO_EM'
  ],

  BASELINE_ATIVIDADES: [
    'ID_BASELINE_ATIVIDADE','ID_BASELINE','ID_OBRA','ID_ATIVIDADE',
    'DURACAO_PLANEJADA_DIAS','PESO_PERCENTUAL',
    'DATA_INICIO','DATA_FIM','CRIADO_EM'
  ],

  BASELINE_DEPENDENCIAS: [
    'ID_BASELINE_DEPENDENCIA','ID_BASELINE','ID_OBRA',
    'ID_ATIVIDADE_PAI','ID_ATIVIDADE_FILHA',
    'PERCENTUAL_LIBERACAO','LAG_DIAS','CRIADO_EM'
  ],

  CALENDARIOS: [
    'ID_CALENDARIO','ID_ORGANIZACAO','NOME',
    'SEG','TER','QUA','QUI','SEX','SAB','DOM',
    'ATIVO','CRIADO_EM','ATUALIZADO_EM'
  ],

  CALENDARIO_EXCECOES: [
    'ID_EXCECAO','ID_CALENDARIO','DATA','TIPO','DESCRICAO','CRIADO_EM'
  ],

  AUDITORIA: [
    'ID_AUDITORIA','ID_ORGANIZACAO','ID_OBRA','ENTIDADE','ID_REGISTRO',
    'ACAO','CAMPO','VALOR_ANTERIOR','VALOR_NOVO',
    'USUARIO','DATA_HORA'
  ]
});

/**
 * Retorna sempre o banco oficial do projeto.
 * O backend pode ser vinculado ou standalone sem depender da planilha ativa.
 */
function getDb_() {
  return SpreadsheetApp.openById(APP.SPREADSHEET_ID);
}

/**
 * Cria e atualiza a estrutura do banco.
 * Não remove abas, colunas nem dados existentes.
 */
function setupSistema() {
  const ss = getDb_();

  Object.entries(DB_SCHEMA).forEach(([sheetName, headers]) => {
    ensureSheetSchema_(ss, sheetName, headers);
  });

  seedConfig_(ss);
  styleDatabase_(ss);

  SpreadsheetApp.flush();

  return {
    ok: true,
    app: APP.NAME,
    schemaVersion: APP.SCHEMA_VERSION,
    spreadsheetId: ss.getId(),
    sheets: Object.keys(DB_SCHEMA)
  };
}

/**
 * Garante que a aba exista e que todos os campos do schema estejam presentes.
 * Campos novos são acrescentados ao final sem afetar dados existentes.
 */
function ensureSheetSchema_(ss, sheetName, expectedHeaders) {
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const existingHeaders = sheet.getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(v => String(v || '').trim());

  const hasAnyHeader = existingHeaders.some(Boolean);

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  const missingHeaders = expectedHeaders.filter(h => !existingHeaders.includes(h));

  if (missingHeaders.length) {
    const startColumn = sheet.getLastColumn() + 1;
    sheet.getRange(1, startColumn, 1, missingHeaders.length).setValues([missingHeaders]);
  }
}

function seedConfig_(ss) {
  const sheet = ss.getSheetByName('CONFIG');

  const defaults = [
    ['APP_NAME', APP.NAME, 'Nome interno da aplicação'],
    ['SCHEMA_VERSION', APP.SCHEMA_VERSION, 'Versão atual da estrutura do banco'],
    ['DEFAULT_ORGANIZATION_ID', APP.DEFAULT_ORGANIZATION_ID, 'Organização padrão da V1'],
    ['TIMEZONE', APP.TIMEZONE, 'Fuso horário utilizado pelo sistema']
  ];

  defaults.forEach(([key, value, description]) => {
    upsertConfig_(sheet, key, value, description);
  });
}

function upsertConfig_(sheet, key, value, description) {
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const index = keys.findIndex(v => String(v) === key);

    if (index >= 0) {
      const row = index + 2;
      sheet.getRange(row, 2, 1, 3)
        .setValues([[value, description, new Date()]]);
      return;
    }
  }

  sheet.appendRow([key, value, description, new Date()]);
}

function styleDatabase_(ss) {
  Object.keys(DB_SCHEMA).forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const lastColumn = sheet.getLastColumn();
    if (!lastColumn) return;

    sheet.setFrozenRows(1);

    const header = sheet.getRange(1, 1, 1, lastColumn);
    header.setFontWeight('bold');
    header.setWrap(true);

    if (sheet.getFilter()) {
      sheet.getFilter().remove();
    }

    const filterRows = Math.max(sheet.getLastRow(), 2);
    sheet.getRange(1, 1, filterRows, lastColumn).createFilter();

    sheet.autoResizeColumns(1, lastColumn);
  });
}

/**
 * Diagnóstico rápido da estrutura.
 */
function verificarSchema() {
  const ss = getDb_();

  return Object.entries(DB_SCHEMA).map(([sheetName, expectedHeaders]) => {
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return {
        aba: sheetName,
        ok: false,
        erro: 'ABA_INEXISTENTE',
        faltando: expectedHeaders
      };
    }

    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const existingHeaders = sheet.getRange(1, 1, 1, lastColumn)
      .getValues()[0]
      .map(v => String(v || '').trim());

    const missing = expectedHeaders.filter(h => !existingHeaders.includes(h));

    return {
      aba: sheetName,
      ok: missing.length === 0,
      faltando: missing
    };
  });
}


// ============================================================
// apps-script/Utils.gs
// ============================================================

/**
 * Utilidades compartilhadas do backend.
 */

function now_() {
  return new Date();
}

function uid_(prefix) {
  const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
  return prefix + '-' + suffix;
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data, meta) {
  return {
    ok: true,
    data: data === undefined ? null : data,
    meta: meta || {}
  };
}

function fail_(code, message, details) {
  return {
    ok: false,
    error: {
      code: code,
      message: message,
      details: details || null
    }
  };
}

function parseRequestBody_(e) {
  if (!e) return {};

  if (e.postData && e.postData.contents) {
    const raw = e.postData.contents.trim();
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (err) {
        // Permite envio como form-urlencoded com campo payload.
      }
    }
  }

  if (e.parameter && e.parameter.payload) {
    try {
      return JSON.parse(e.parameter.payload);
    } catch (err) {
      throw new Error('PAYLOAD_JSON_INVALIDO');
    }
  }

  return Object.assign({}, e.parameter || {});
}

function asBoolean_(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).toLowerCase().trim();
  return ['true', '1', 'sim', 'yes'].includes(normalized);
}

function asNumber_(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('NUMERO_INVALIDO');
  return n;
}

function asDate_(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('DATA_INVALIDA');
  return d;
}

function formatDateIso_(date) {
  if (!date) return null;
  return Utilities.formatDate(new Date(date), APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function serializeValue_(value) {
  if (value instanceof Date) return formatDateIso_(value);
  return value;
}


// ============================================================
// apps-script/Auth.gs
// ============================================================

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


// ============================================================
// apps-script/Db.gs
// ============================================================

/**
 * Camada de acesso ao Google Sheets.
 * A interface e os serviços não acessam ranges diretamente.
 */

function getSheet_(sheetName) {
  const ss = getDb_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('ABA_NAO_ENCONTRADA:' + sheetName);
  return sheet;
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return [];

  return sheet.getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function(v) { return String(v || '').trim(); });
}

function listObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  const headers = getHeaders_(sheet);

  if (lastRow < 2 || headers.length === 0) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  return values
    .filter(function(row) {
      return row.some(function(v) { return v !== '' && v !== null; });
    })
    .map(function(row) {
      const obj = {};
      headers.forEach(function(header, index) {
        obj[header] = serializeValue_(row[index]);
      });
      return obj;
    });
}

function findObjectById_(sheetName, idColumn, idValue) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  const idIndex = headers.indexOf(idColumn);

  if (idIndex < 0) throw new Error('COLUNA_ID_NAO_ENCONTRADA:' + idColumn);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const ids = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues().flat();
  const offset = ids.findIndex(function(v) { return String(v) === String(idValue); });

  if (offset < 0) return null;

  const rowNumber = offset + 2;
  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const obj = {};

  headers.forEach(function(header, index) {
    obj[header] = serializeValue_(values[index]);
  });

  obj.__ROW_NUMBER = rowNumber;
  return obj;
}

function appendObject_(sheetName, data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getSheet_(sheetName);
    const headers = getHeaders_(sheet);

    const row = headers.map(function(header) {
      const value = Object.prototype.hasOwnProperty.call(data, header) ? data[header] : '';
      return value === undefined || value === null ? '' : value;
    });

    sheet.appendRow(row);
    SpreadsheetApp.flush();

    return data;
  } finally {
    lock.releaseLock();
  }
}

function updateObjectById_(sheetName, idColumn, idValue, changes, allowedFields) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getSheet_(sheetName);
    const headers = getHeaders_(sheet);
    const current = findObjectById_(sheetName, idColumn, idValue);

    if (!current) return null;

    const rowNumber = current.__ROW_NUMBER;
    const allowed = new Set(allowedFields || headers);

    Object.keys(changes).forEach(function(field) {
      if (!allowed.has(field)) return;

      const columnIndex = headers.indexOf(field);
      if (columnIndex < 0) return;

      const value = changes[field];
      sheet.getRange(rowNumber, columnIndex + 1).setValue(
        value === undefined || value === null ? '' : value
      );
    });

    SpreadsheetApp.flush();

    const updated = findObjectById_(sheetName, idColumn, idValue);
    if (updated) delete updated.__ROW_NUMBER;
    return updated;
  } finally {
    lock.releaseLock();
  }
}

function appendAudit_(data) {
  appendObject_('AUDITORIA', {
    ID_AUDITORIA: uid_('AUD'),
    ID_ORGANIZACAO: data.ID_ORGANIZACAO || APP.DEFAULT_ORGANIZATION_ID,
    ID_OBRA: data.ID_OBRA || '',
    ENTIDADE: data.ENTIDADE || '',
    ID_REGISTRO: data.ID_REGISTRO || '',
    ACAO: data.ACAO || '',
    CAMPO: data.CAMPO || '',
    VALOR_ANTERIOR: data.VALOR_ANTERIOR === undefined ? '' : data.VALOR_ANTERIOR,
    VALOR_NOVO: data.VALOR_NOVO === undefined ? '' : data.VALOR_NOVO,
    USUARIO: data.USUARIO || 'SISTEMA',
    DATA_HORA: now_()
  });
}


// ============================================================
// apps-script/Obras.gs
// ============================================================

/**
 * Serviço de Obras.
 */

const OBRA_STATUS = Object.freeze({
  PLANEJAMENTO: 'PLANEJAMENTO',
  EM_EXECUCAO: 'EM_EXECUCAO',
  CONCLUIDA: 'CONCLUIDA',
  SUSPENSA: 'SUSPENSA',
  CANCELADA: 'CANCELADA'
});

function listarObras_(params) {
  params = params || {};
  const incluirInativas = asBoolean_(params.incluir_inativas, false);

  return listObjects_('OBRAS')
    .filter(function(obra) {
      return incluirInativas || asBoolean_(obra.ATIVA, true);
    })
    .sort(function(a, b) {
      return String(a.NOME || '').localeCompare(String(b.NOME || ''), 'pt-BR');
    });
}

function obterObra_(idObra) {
  const obra = findObjectById_('OBRAS', 'ID_OBRA', idObra);
  if (obra) delete obra.__ROW_NUMBER;
  return obra;
}

function criarObra_(payload) {
  payload = payload || {};

  const nome = String(payload.NOME || payload.nome || '').trim();
  if (!nome) throw new Error('NOME_OBRA_OBRIGATORIO');

  const inicio = asDate_(payload.DATA_INICIO_CONTRATUAL || payload.data_inicio_contratual);
  const fim = asDate_(payload.DATA_FIM_CONTRATUAL || payload.data_fim_contratual);

  if (inicio && fim && fim < inicio) {
    throw new Error('DATA_FIM_ANTERIOR_AO_INICIO');
  }

  const idObra = uid_('OBR');
  const agora = now_();

  const obra = {
    ID_OBRA: idObra,
    ID_ORGANIZACAO: APP.DEFAULT_ORGANIZATION_ID,
    CODIGO: String(payload.CODIGO || payload.codigo || '').trim(),
    NOME: nome,
    CLIENTE: String(payload.CLIENTE || payload.cliente || '').trim(),
    DESCRICAO: String(payload.DESCRICAO || payload.descricao || '').trim(),
    DATA_INICIO_CONTRATUAL: inicio || '',
    DATA_FIM_CONTRATUAL: fim || '',
    ID_CALENDARIO: String(payload.ID_CALENDARIO || payload.id_calendario || '').trim(),
    STATUS: OBRA_STATUS.PLANEJAMENTO,
    ID_BASELINE_ATIVA: '',
    ATIVA: true,
    CRIADO_EM: agora,
    ATUALIZADO_EM: agora
  };

  appendObject_('OBRAS', obra);

  appendAudit_({
    ID_OBRA: idObra,
    ENTIDADE: 'OBRAS',
    ID_REGISTRO: idObra,
    ACAO: 'CRIAR',
    VALOR_NOVO: JSON.stringify({ NOME: nome })
  });

  return obterObra_(idObra);
}

function atualizarObra_(idObra, payload) {
  const atual = obterObra_(idObra);
  if (!atual) throw new Error('OBRA_NAO_ENCONTRADA');

  payload = payload || {};

  const changes = {};
  const map = {
    CODIGO: ['CODIGO','codigo'],
    NOME: ['NOME','nome'],
    CLIENTE: ['CLIENTE','cliente'],
    DESCRICAO: ['DESCRICAO','descricao'],
    DATA_INICIO_CONTRATUAL: ['DATA_INICIO_CONTRATUAL','data_inicio_contratual'],
    DATA_FIM_CONTRATUAL: ['DATA_FIM_CONTRATUAL','data_fim_contratual'],
    ID_CALENDARIO: ['ID_CALENDARIO','id_calendario'],
    STATUS: ['STATUS','status'],
    ATIVA: ['ATIVA','ativa']
  };

  Object.keys(map).forEach(function(target) {
    const aliases = map[target];
    const source = aliases.find(function(key) {
      return Object.prototype.hasOwnProperty.call(payload, key);
    });

    if (!source) return;

    let value = payload[source];

    if (target.indexOf('DATA_') === 0) value = asDate_(value) || '';
    if (target === 'ATIVA') value = asBoolean_(value, true);
    if (target === 'NOME' && !String(value || '').trim()) {
      throw new Error('NOME_OBRA_OBRIGATORIO');
    }

    changes[target] = value;
  });

  const inicio = changes.DATA_INICIO_CONTRATUAL || atual.DATA_INICIO_CONTRATUAL;
  const fim = changes.DATA_FIM_CONTRATUAL || atual.DATA_FIM_CONTRATUAL;

  if (inicio && fim && new Date(fim) < new Date(inicio)) {
    throw new Error('DATA_FIM_ANTERIOR_AO_INICIO');
  }

  changes.ATUALIZADO_EM = now_();

  const updated = updateObjectById_(
    'OBRAS',
    'ID_OBRA',
    idObra,
    changes,
    [
      'CODIGO','NOME','CLIENTE','DESCRICAO',
      'DATA_INICIO_CONTRATUAL','DATA_FIM_CONTRATUAL',
      'ID_CALENDARIO','STATUS','ATIVA','ATUALIZADO_EM'
    ]
  );

  appendAudit_({
    ID_OBRA: idObra,
    ENTIDADE: 'OBRAS',
    ID_REGISTRO: idObra,
    ACAO: 'ATUALIZAR',
    VALOR_ANTERIOR: JSON.stringify(atual),
    VALOR_NOVO: JSON.stringify(updated)
  });

  return updated;
}


// ============================================================
// apps-script/Api.gs
// ============================================================

/**
 * API HTTP do sistema.
 *
 * Rotas V1:
 * GET  ?action=health
 * GET  ?action=obras.list
 * GET  ?action=obras.get&id=OBR-...
 * POST ?action=obras.create
 * POST ?action=obras.update&id=OBR-...
 */

function doGet(e) {
  return handleApi_(e, 'GET');
}

function doPost(e) {
  return handleApi_(e, 'POST');
}

function handleApi_(e, method) {
  try {
    const params = Object.assign({}, (e && e.parameter) || {});
    const body = method === 'POST' ? parseRequestBody_(e) : {};
    const action = String(params.action || body.action || 'health').trim();

    let result;

    if (action !== 'health') {
      validarChaveAcesso_(Object.assign({}, params, body));
    }

    switch (action) {
      case 'health':
        result = {
          app: APP.NAME,
          schemaVersion: APP.SCHEMA_VERSION,
          spreadsheetId: APP.SPREADSHEET_ID,
          timestamp: formatDateIso_(now_())
        };
        break;

      case 'obras.list':
        result = listarObras_(Object.assign({}, params, body));
        break;

      case 'obras.get': {
        const id = params.id || body.id || body.ID_OBRA;
        if (!id) throw new Error('ID_OBRA_OBRIGATORIO');
        result = obterObra_(id);
        if (!result) throw new Error('OBRA_NAO_ENCONTRADA');
        break;
      }

      case 'obras.create':
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        result = criarObra_(body);
        break;

      case 'obras.update': {
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        const id = params.id || body.id || body.ID_OBRA;
        if (!id) throw new Error('ID_OBRA_OBRIGATORIO');
        result = atualizarObra_(id, body);
        break;
      }

      default:
        return jsonOutput_(fail_('ROTA_NAO_ENCONTRADA', 'Ação não reconhecida.', { action: action }));
    }

    return jsonOutput_(ok_(result, { action: action, method: method }));

  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return jsonOutput_(fail_(message, apiMessage_(message)));
  }
}

function apiMessage_(code) {
  const messages = {
    NOME_OBRA_OBRIGATORIO: 'Informe o nome da obra.',
    DATA_FIM_ANTERIOR_AO_INICIO: 'A data final contratual não pode ser anterior à data inicial.',
    OBRA_NAO_ENCONTRADA: 'Obra não encontrada.',
    ID_OBRA_OBRIGATORIO: 'Informe o ID da obra.',
    METODO_NAO_PERMITIDO: 'Método HTTP não permitido para esta ação.',
    PAYLOAD_JSON_INVALIDO: 'O corpo da requisição contém JSON inválido.',
    DATA_INVALIDA: 'Uma das datas informadas é inválida.',
    NUMERO_INVALIDO: 'Um dos valores numéricos informados é inválido.',
    CHAVE_ACESSO_NAO_CONFIGURADA: 'A chave de acesso do backend ainda não foi configurada.',
    ACESSO_NEGADO: 'Chave de acesso inválida.'
  };

  return messages[code] || code;
}
