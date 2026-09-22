/**
 * API HTTP do sistema.
 *
 * Rotas V1:
 * GET  ?action=health
 * GET  ?action=obras.list
 * GET  ?action=obras.get&id=OBR-...
 * POST ?action=obras.create
 * POST ?action=obras.update&id=OBR-...
 * POST ?action=planejamento.get&id_obra=OBR-...
 * POST ?action=wbs.create|wbs.update|wbs.delete
 * POST ?action=atividades.create|atividades.update|atividades.delete
 * POST ?action=dependencias.create|dependencias.delete
 * POST ?action=cronograma.recalcular
 * POST ?action=planejamento.efetivar
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

      case 'planejamento.get': {
        const idObra = params.id_obra || body.id_obra || body.ID_OBRA;
        if (!idObra) throw new Error('ID_OBRA_OBRIGATORIO');
        result = obterPlanejamento_(idObra);
        break;
      }

      case 'wbs.create':
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        result = criarWbs_(body);
        break;

      case 'wbs.update': {
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        const id = body.id || body.ID_WBS;
        if (!id) throw new Error('ID_WBS_OBRIGATORIO');
        result = atualizarWbs_(id, body);
        break;
      }

      case 'wbs.delete': {
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        const id = body.id || body.ID_WBS;
        if (!id) throw new Error('ID_WBS_OBRIGATORIO');
        result = excluirWbs_(id);
        break;
      }

      case 'atividades.create':
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        result = criarAtividade_(body);
        break;

      case 'atividades.update': {
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        const id = body.id || body.ID_ATIVIDADE;
        if (!id) throw new Error('ID_ATIVIDADE_OBRIGATORIO');
        result = atualizarAtividade_(id, body);
        break;
      }

      case 'atividades.delete': {
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        const id = body.id || body.ID_ATIVIDADE;
        if (!id) throw new Error('ID_ATIVIDADE_OBRIGATORIO');
        result = excluirAtividade_(id);
        break;
      }

      case 'dependencias.create':
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        result = criarDependencia_(body);
        break;

      case 'dependencias.delete': {
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        const id = body.id || body.ID_DEPENDENCIA;
        if (!id) throw new Error('ID_DEPENDENCIA_OBRIGATORIO');
        result = excluirDependencia_(id);
        break;
      }

      case 'cronograma.recalcular': {
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        const idObra = body.id_obra || body.ID_OBRA;
        if (!idObra) throw new Error('ID_OBRA_OBRIGATORIO');
        result = recalcularCronograma_(idObra);
        break;
      }

      case 'planejamento.efetivar': {
        if (method !== 'POST') throw new Error('METODO_NAO_PERMITIDO');
        result = efetivarPlanejamento_(body);
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
    NOME_WBS_OBRIGATORIO: 'Informe o nome da etapa da EAP.',
    ID_WBS_OBRIGATORIO: 'Informe a etapa da EAP.',
    WBS_NAO_ENCONTRADA: 'Etapa da EAP não encontrada.',
    WBS_PAI_INVALIDA: 'A etapa pai informada é inválida.',
    WBS_EM_USO: 'Esta etapa possui subetapas ou atividades e não pode ser excluída.',
    WBS_INVALIDA: 'A etapa da EAP informada é inválida.',
    NOME_ATIVIDADE_OBRIGATORIO: 'Informe o nome da atividade.',
    ID_ATIVIDADE_OBRIGATORIO: 'Informe a atividade.',
    ATIVIDADE_NAO_ENCONTRADA: 'Atividade não encontrada.',
    PESO_INVALIDO: 'O peso da atividade não pode ser negativo.',
    PLANEJAMENTO_INVALIDO: 'O rascunho do planejamento é inválido.',
    PLANEJAMENTO_LINHA_SEM_CHAVE: 'Existe uma linha sem identificador interno.',
    PLANEJAMENTO_CHAVE_DUPLICADA: 'Existe uma linha duplicada no planejamento.',
    PLANEJAMENTO_TIPO_INVALIDO: 'Cada linha precisa ser uma Etapa ou Atividade.',
    PLANEJAMENTO_NOME_OBRIGATORIO: 'Informe o nome de todas as etapas e atividades.',
    PLANEJAMENTO_PAI_INVALIDO: 'Existe uma linha vinculada a um item pai inexistente.',
    PLANEJAMENTO_HIERARQUIA_INVALIDA: 'A hierarquia do planejamento possui uma referência inválida.',
    PLANEJAMENTO_REVISAO_NECESSARIA: 'Esta obra já possui execução ou baseline. Alterações estruturais deverão ser feitas por uma revisão do planejamento.',
    DURACAO_INVALIDA: 'A duração deve ser de pelo menos 1 dia útil.',
    DEPENDENCIA_ATIVIDADE_INVALIDA: 'Dependências só podem ligar atividades.',
    DEPENDENCIA_DADOS_OBRIGATORIOS: 'Informe atividade predecessora e sucessora.',
    DEPENDENCIA_AUTO_REFERENCIA: 'Uma atividade não pode depender dela mesma.',
    DEPENDENCIA_OBRA_INVALIDA: 'As duas atividades precisam pertencer à mesma obra.',
    PERCENTUAL_LIBERACAO_INVALIDO: 'O percentual de liberação deve estar entre 0 e 100%.',
    DEPENDENCIA_DUPLICADA: 'Esta dependência já existe.',
    DEPENDENCIA_NAO_ENCONTRADA: 'Dependência não encontrada.',
    ID_DEPENDENCIA_OBRIGATORIO: 'Informe a dependência.',
    DEPENDENCIA_CICLICA: 'A dependência criaria um ciclo no cronograma.',
    CALENDARIO_SEM_DIAS_UTEIS: 'O calendário da obra não possui dias úteis válidos.'
  };

  return messages[code] || code;
}
