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
    NUMERO_INVALIDO: 'Um dos valores numéricos informados é inválido.'
  };

  return messages[code] || code;
}
