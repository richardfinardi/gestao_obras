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
  DEFAULT_ORGANIZATION_ID: 'ORG-001'
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
 * Cria e atualiza a estrutura do banco.
 * Não remove abas, colunas nem dados existentes.
 */
function setupSistema() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Este script deve estar vinculado a uma planilha Google Sheets.');
  }

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
  const ss = SpreadsheetApp.getActiveSpreadsheet();

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
