/**
 * Planejamento em lote (V3)
 * A grade trabalha como rascunho no navegador e só grava ao "Efetivar".
 */

function obterPesoRelativo_(atividade) {
  const rel = Number(atividade.PESO_RELATIVO);
  if (!Number.isNaN(rel) && rel !== 0) return rel;
  return Number(atividade.PESO_PERCENTUAL || 0);
}

function validarPlanejamentoBatch_(idObra, rows) {
  if (!Array.isArray(rows)) throw new Error('PLANEJAMENTO_INVALIDO');

  const keys = new Set();
  rows.forEach(function(row) {
    const key = String(row.key || '').trim();
    const kind = String(row.kind || '').toUpperCase();
    const name = String(row.name || '').trim();

    if (!key) throw new Error('PLANEJAMENTO_LINHA_SEM_CHAVE');
    if (keys.has(key)) throw new Error('PLANEJAMENTO_CHAVE_DUPLICADA');
    keys.add(key);

    if (!['ETAPA','ATIVIDADE'].includes(kind)) throw new Error('PLANEJAMENTO_TIPO_INVALIDO');
    if (!name) throw new Error('PLANEJAMENTO_NOME_OBRIGATORIO');

    if (kind === 'ATIVIDADE') {
      const duracao = Math.round(asNumber_(row.duration, 1));
      const peso = asNumber_(row.weight, 0);
      if (duracao < 1) throw new Error('DURACAO_INVALIDA');
      if (peso < 0) throw new Error('PESO_INVALIDO');
    }
  });

  rows.forEach(function(row) {
    const parentKey = String(row.parentKey || '').trim();
    if (parentKey && !keys.has(parentKey)) throw new Error('PLANEJAMENTO_PAI_INVALIDO');

    if (String(row.kind || '').toUpperCase() === 'ATIVIDADE') {
      const deps = Array.isArray(row.dependencies) ? row.dependencies : [];
      deps.forEach(function(dep) {
        const predecessorKey = String(dep.predecessorKey || '').trim();
        if (!predecessorKey || !keys.has(predecessorKey)) throw new Error('DEPENDENCIA_ATIVIDADE_INVALIDA');
        if (predecessorKey === String(row.key)) throw new Error('DEPENDENCIA_AUTO_REFERENCIA');
        const pct = asNumber_(dep.releasePercent, 100);
        if (pct < 0 || pct > 100) throw new Error('PERCENTUAL_LIBERACAO_INVALIDO');
      });
    }
  });

  // Só permitimos "replace" enquanto ainda não existe execução/baseline.
  const temExecucao = listObjects_('EXECUCOES').some(function(x) {
    return String(x.ID_OBRA) === String(idObra);
  });
  const temBaseline = listObjects_('BASELINES').some(function(x) {
    return String(x.ID_OBRA) === String(idObra) && asBoolean_(x.ATIVA, true);
  });

  if (temExecucao || temBaseline) {
    throw new Error('PLANEJAMENTO_REVISAO_NECESSARIA');
  }
}

function calcularCodigosGrade_(rows) {
  const byKey = {};
  rows.forEach(function(row) { byKey[String(row.key)] = row; });

  const children = {};
  rows.forEach(function(row) {
    const parent = String(row.parentKey || '');
    if (!children[parent]) children[parent] = [];
    children[parent].push(row);
  });

  Object.keys(children).forEach(function(parent) {
    children[parent].sort(function(a, b) {
      const oa = Number(a.order || 0);
      const ob = Number(b.order || 0);
      if (oa !== ob) return oa - ob;
      return Number(a._sourceIndex || 0) - Number(b._sourceIndex || 0);
    });
  });

  const codes = {};
  function walk(parentKey, prefix) {
    const list = children[String(parentKey || '')] || [];
    list.forEach(function(row, index) {
      const code = prefix ? prefix + '.' + (index + 1) : String(index + 1);
      codes[String(row.key)] = code;
      walk(String(row.key), code);
    });
  }
  walk('', '');

  if (Object.keys(codes).length !== rows.length) {
    throw new Error('PLANEJAMENTO_HIERARQUIA_INVALIDA');
  }

  return codes;
}

function desativarPlanejamentoAtualBulk_(idObra) {
  [
    ['WBS','ID_OBRA','ATIVA'],
    ['ATIVIDADES','ID_OBRA','ATIVA'],
    ['DEPENDENCIAS','ID_OBRA','ATIVA'],
    ['ATIVIDADE_EQUIPES','ID_OBRA','ATIVA']
  ].forEach(function(config) {
    const sheet = getSheet_(config[0]);
    const headers = getHeaders_(sheet);
    const obraIndex = headers.indexOf(config[1]);
    const ativaIndex = headers.indexOf(config[2]);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2 || obraIndex < 0 || ativaIndex < 0) return;

    const range = sheet.getRange(2, 1, lastRow - 1, headers.length);
    const values = range.getValues();
    let changed = false;

    values.forEach(function(row) {
      if (String(row[obraIndex]) === String(idObra) && row[ativaIndex] !== false) {
        row[ativaIndex] = false;
        changed = true;
      }
    });

    if (changed) range.setValues(values);
  });
}

function appendObjectsBulk_(sheetName, objects) {
  if (!objects.length) return;

  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  const startRow = Math.max(sheet.getLastRow() + 1, 2);
  const rows = objects.map(function(obj) {
    return headers.map(function(header) {
      const value = Object.prototype.hasOwnProperty.call(obj, header) ? obj[header] : '';
      return value === undefined || value === null ? '' : value;
    });
  });

  ['CODIGO','CODIGO_WBS'].forEach(function(textHeader) {
    const index = headers.indexOf(textHeader);
    if (index >= 0) {
      sheet.getRange(startRow, index + 1, rows.length, 1).setNumberFormat('@');
    }
  });

  sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
}

function efetivarPlanejamento_(payload) {
  const idObra = String(payload.ID_OBRA || payload.id_obra || '').trim();
  if (!idObra) throw new Error('ID_OBRA_OBRIGATORIO');
  if (!obterObra_(idObra)) throw new Error('OBRA_NAO_ENCONTRADA');

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  rows.forEach(function(row, index) { row._sourceIndex = index; });
  validarPlanejamentoBatch_(idObra, rows);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const codes = calcularCodigosGrade_(rows);
    const agora = now_();
    const idByKey = {};
    const kindByKey = {};
    const wbs = [];
    const atividades = [];
    const dependencias = [];
    const atividadeEquipes = [];
    const frontNames = rows
      .filter(function(r){ return String(r.kind).toUpperCase() === 'ATIVIDADE'; })
      .map(function(r){ return String(r.frontName || '').trim(); })
      .filter(Boolean);
    const frenteMap = obterOuCriarFrenteMap_(idObra, frontNames);
    const validTeamIds = new Set(listarEquipes_().map(function(e){ return String(e.ID_EQUIPE); }));

    rows.forEach(function(row) {
      const key = String(row.key);
      const kind = String(row.kind).toUpperCase();
      kindByKey[key] = kind;
      idByKey[key] = uid_(kind === 'ETAPA' ? 'WBS' : 'ATV');
    });

    rows.forEach(function(row, index) {
      const key = String(row.key);
      const parentKey = String(row.parentKey || '');
      const kind = String(row.kind).toUpperCase();

      if (kind === 'ETAPA') {
        const parentId = parentKey && kindByKey[parentKey] === 'ETAPA' ? idByKey[parentKey] : '';
        wbs.push({
          ID_WBS: idByKey[key],
          ID_OBRA: idObra,
          ID_WBS_PAI: parentId,
          CODIGO_WBS: codes[key],
          NOME: String(row.name || '').trim(),
          ORDEM: index + 1,
          ATIVA: true,
          CRIADO_EM: agora,
          ATUALIZADO_EM: agora
        });
        return;
      }

      let parentWbsId = '';
      let cursor = parentKey;
      while (cursor) {
        if (kindByKey[cursor] === 'ETAPA') {
          parentWbsId = idByKey[cursor];
          break;
        }
        const parentRow = rows.find(function(r) { return String(r.key) === String(cursor); });
        cursor = parentRow ? String(parentRow.parentKey || '') : '';
      }

      const duracao = Math.max(1, Math.round(asNumber_(row.duration, 1)));
      const peso = Math.max(0, asNumber_(row.weight, 0));
      const restriction = parseDateOnly_(row.restriction);

      atividades.push({
        ID_ATIVIDADE: idByKey[key],
        ID_OBRA: idObra,
        ID_WBS: parentWbsId,
        ID_FRENTE: frenteMap[String(row.frontName || '').trim().toLowerCase()] || '',
        CODIGO: codes[key],
        NOME: String(row.name || '').trim(),
        ID_TIPO_ATIVIDADE: String(row.activityTypeId || '').trim(),
        ID_EMPRESA: String(row.companyId || '').trim(),
        ID_RESPONSAVEL: String(row.responsibleId || '').trim(),
        DURACAO_PLANEJADA_DIAS: duracao,
        PESO_PERCENTUAL: '',
        PESO_RELATIVO: peso,
        RESTRICAO_INICIO_MINIMO: restriction || '',
        PERCENTUAL_ATUAL: 0,
        DATA_INICIO_FORECAST: '',
        DATA_FIM_FORECAST: '',
        DATA_INICIO_REAL: '',
        DATA_FIM_REAL: '',
        DURACAO_PROJETADA_DIAS: duracao,
        FOLGA_TOTAL_DIAS: '',
        CAMINHO_CRITICO: false,
        STATUS: 'NAO_INICIADA',
        ULTIMA_MEDICAO_EM: '',
        ULTIMA_OBSERVACAO: '',
        ORDEM: index + 1,
        ATIVA: true,
        CRIADO_EM: agora,
        ATUALIZADO_EM: agora
      });

      (Array.isArray(row.teamIds) ? row.teamIds : []).forEach(function(teamId) {
        const idEquipe = String(teamId || '');
        if (!validTeamIds.has(idEquipe)) return;
        atividadeEquipes.push({
          ID_ATIVIDADE_EQUIPE: uid_('ATE'),
          ID_OBRA: idObra,
          ID_ATIVIDADE: idByKey[key],
          ID_EQUIPE: idEquipe,
          ATIVA: true,
          CRIADO_EM: agora,
          ATUALIZADO_EM: agora
        });
      });
    });

    rows.forEach(function(row) {
      if (String(row.kind).toUpperCase() !== 'ATIVIDADE') return;
      const childKey = String(row.key);
      const deps = Array.isArray(row.dependencies) ? row.dependencies : [];

      deps.forEach(function(dep) {
        const predecessorKey = String(dep.predecessorKey || '');
        if (kindByKey[predecessorKey] !== 'ATIVIDADE') throw new Error('DEPENDENCIA_ATIVIDADE_INVALIDA');

        dependencias.push({
          ID_DEPENDENCIA: uid_('DEP'),
          ID_OBRA: idObra,
          ID_ATIVIDADE_PAI: idByKey[predecessorKey],
          ID_ATIVIDADE_FILHA: idByKey[childKey],
          PERCENTUAL_LIBERACAO: asNumber_(dep.releasePercent, 100),
          LAG_DIAS: Math.round(asNumber_(dep.lagDays, 0)),
          ATIVA: true,
          CRIADO_EM: agora,
          ATUALIZADO_EM: agora
        });
      });
    });

    // Valida ciclo usando IDs que ainda serão gravados.
    ordenarTopologicamente_(atividades, dependencias);

    desativarPlanejamentoAtualBulk_(idObra);
    appendObjectsBulk_('WBS', wbs);
    appendObjectsBulk_('ATIVIDADES', atividades);
    appendObjectsBulk_('DEPENDENCIAS', dependencias);
    appendObjectsBulk_('ATIVIDADE_EQUIPES', atividadeEquipes);
    SpreadsheetApp.flush();

  } finally {
    lock.releaseLock();
  }

  appendAudit_({
    ID_OBRA: idObra,
    ENTIDADE: 'PLANEJAMENTO',
    ID_REGISTRO: idObra,
    ACAO: 'EFETIVAR',
    VALOR_NOVO: JSON.stringify({
      linhas: rows.length
    })
  });

  recalcularCronograma_(idObra);
  return obterPlanejamento_(idObra);
}
