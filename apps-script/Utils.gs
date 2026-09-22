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
