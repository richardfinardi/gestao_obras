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
