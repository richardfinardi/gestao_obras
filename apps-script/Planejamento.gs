/**
 * Planejamento físico: WBS, atividades e dependências.
 */

function obterPlanejamento_(idObra) {
  const obra = obterObra_(idObra);
  if (!obra) throw new Error('OBRA_NAO_ENCONTRADA');

  return {
    obra: obra,
    wbs: listarWbs_(idObra),
    atividades: listarAtividades_(idObra),
    dependencias: listarDependencias_(idObra),
    cadastros: {
      tiposAtividade: listObjects_('TIPOS_ATIVIDADE').filter(function(x) { return asBoolean_(x.ATIVO, true); }),
      empresas: listObjects_('EMPRESAS_EXECUTORAS').filter(function(x) { return asBoolean_(x.ATIVA, true); }),
      responsaveis: listObjects_('RESPONSAVEIS').filter(function(x) { return asBoolean_(x.ATIVO, true); })
    }
  };
}

function listarWbs_(idObra) {
  return listObjects_('WBS')
    .filter(function(item) {
      return String(item.ID_OBRA) === String(idObra) && asBoolean_(item.ATIVA, true);
    })
    .map(function(item) {
      if (item.PESO_RELATIVO === '' || item.PESO_RELATIVO === null || item.PESO_RELATIVO === undefined) {
        item.PESO_RELATIVO = Number(item.PESO_PERCENTUAL || 0);
      }
      return item;
    })
    .sort(function(a, b) {
      const oa = Number(a.ORDEM || 0);
      const ob = Number(b.ORDEM || 0);
      if (oa !== ob) return oa - ob;
      return String(a.CODIGO_WBS || '').localeCompare(String(b.CODIGO_WBS || ''), 'pt-BR', { numeric: true });
    });
}

function criarWbs_(payload) {
  const idObra = String(payload.ID_OBRA || payload.id_obra || '').trim();
  const nome = String(payload.NOME || payload.nome || '').trim();
  if (!idObra) throw new Error('ID_OBRA_OBRIGATORIO');
  if (!obterObra_(idObra)) throw new Error('OBRA_NAO_ENCONTRADA');
  if (!nome) throw new Error('NOME_WBS_OBRIGATORIO');

  const idPai = String(payload.ID_WBS_PAI || payload.id_wbs_pai || '').trim();
  if (idPai) {
    const pai = findObjectById_('WBS', 'ID_WBS', idPai);
    if (!pai || String(pai.ID_OBRA) !== idObra) throw new Error('WBS_PAI_INVALIDA');
  }

  const agora = now_();
  const item = {
    ID_WBS: uid_('WBS'),
    ID_OBRA: idObra,
    ID_WBS_PAI: idPai,
    CODIGO_WBS: proximoCodigoWbs_(idObra, idPai),
    NOME: nome,
    ORDEM: asNumber_(payload.ORDEM || payload.ordem, 0),
    ATIVA: true,
    CRIADO_EM: agora,
    ATUALIZADO_EM: agora
  };

  appendObject_('WBS', item);
  appendAudit_({
    ID_OBRA: idObra,
    ENTIDADE: 'WBS',
    ID_REGISTRO: item.ID_WBS,
    ACAO: 'CRIAR',
    VALOR_NOVO: JSON.stringify(item)
  });
  return item;
}

function listarAtividades_(idObra) {
  return listObjects_('ATIVIDADES')
    .filter(function(item) {
      return String(item.ID_OBRA) === String(idObra) && asBoolean_(item.ATIVA, true);
    })
    .sort(function(a, b) {
      const oa = Number(a.ORDEM || 0);
      const ob = Number(b.ORDEM || 0);
      if (oa !== ob) return oa - ob;
      return String(a.CODIGO || '').localeCompare(String(b.CODIGO || ''), 'pt-BR', { numeric: true });
    });
}

function criarAtividade_(payload) {
  const idObra = String(payload.ID_OBRA || payload.id_obra || '').trim();
  const idWbs = String(payload.ID_WBS || payload.id_wbs || '').trim();
  const nome = String(payload.NOME || payload.nome || '').trim();

  if (!idObra) throw new Error('ID_OBRA_OBRIGATORIO');
  if (!obterObra_(idObra)) throw new Error('OBRA_NAO_ENCONTRADA');
  if (!nome) throw new Error('NOME_ATIVIDADE_OBRIGATORIO');

  if (idWbs) {
    const wbs = findObjectById_('WBS', 'ID_WBS', idWbs);
    if (!wbs || String(wbs.ID_OBRA) !== idObra) throw new Error('WBS_INVALIDA');
  }

  const duracao = Math.max(1, Math.round(asNumber_(payload.DURACAO_PLANEJADA_DIAS || payload.duracao_planejada_dias, 1)));
  const peso = asNumber_(
    payload.PESO_RELATIVO !== undefined ? payload.PESO_RELATIVO :
    (payload.peso_relativo !== undefined ? payload.peso_relativo :
    (payload.PESO_PERCENTUAL !== undefined ? payload.PESO_PERCENTUAL : payload.peso_percentual)),
    0
  );
  if (peso < 0) throw new Error('PESO_INVALIDO');

  const restricao = parseDateOnly_(payload.RESTRICAO_INICIO_MINIMO || payload.restricao_inicio_minimo);
  const agora = now_();

  const item = {
    ID_ATIVIDADE: uid_('ATV'),
    ID_OBRA: idObra,
    ID_WBS: idWbs,
    CODIGO: proximoCodigoAtividade_(idObra, idWbs),
    NOME: nome,
    ID_TIPO_ATIVIDADE: String(payload.ID_TIPO_ATIVIDADE || payload.id_tipo_atividade || '').trim(),
    ID_EMPRESA: String(payload.ID_EMPRESA || payload.id_empresa || '').trim(),
    ID_RESPONSAVEL: String(payload.ID_RESPONSAVEL || payload.id_responsavel || '').trim(),
    DURACAO_PLANEJADA_DIAS: duracao,
    PESO_PERCENTUAL: '',
    PESO_RELATIVO: peso,
    RESTRICAO_INICIO_MINIMO: restricao || '',
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
    ORDEM: asNumber_(payload.ORDEM || payload.ordem, 0),
    ATIVA: true,
    CRIADO_EM: agora,
    ATUALIZADO_EM: agora
  };

  appendObject_('ATIVIDADES', item);
  appendAudit_({
    ID_OBRA: idObra,
    ENTIDADE: 'ATIVIDADES',
    ID_REGISTRO: item.ID_ATIVIDADE,
    ACAO: 'CRIAR',
    VALOR_NOVO: JSON.stringify(item)
  });

  recalcularCronograma_(idObra);
  return obterAtividade_(item.ID_ATIVIDADE);
}

function obterAtividade_(idAtividade) {
  const item = findObjectById_('ATIVIDADES', 'ID_ATIVIDADE', idAtividade);
  if (item) delete item.__ROW_NUMBER;
  return item;
}

function atualizarAtividade_(idAtividade, payload) {
  const atual = obterAtividade_(idAtividade);
  if (!atual) throw new Error('ATIVIDADE_NAO_ENCONTRADA');

  const changes = {};
  const map = {
    ID_WBS: ['ID_WBS','id_wbs'],
    NOME: ['NOME','nome'],
    ID_TIPO_ATIVIDADE: ['ID_TIPO_ATIVIDADE','id_tipo_atividade'],
    ID_EMPRESA: ['ID_EMPRESA','id_empresa'],
    ID_RESPONSAVEL: ['ID_RESPONSAVEL','id_responsavel'],
    DURACAO_PLANEJADA_DIAS: ['DURACAO_PLANEJADA_DIAS','duracao_planejada_dias'],
    PESO_RELATIVO: ['PESO_RELATIVO','peso_relativo','PESO_PERCENTUAL','peso_percentual'],
    RESTRICAO_INICIO_MINIMO: ['RESTRICAO_INICIO_MINIMO','restricao_inicio_minimo'],
    ORDEM: ['ORDEM','ordem'],
    ATIVA: ['ATIVA','ativa']
  };

  Object.keys(map).forEach(function(target) {
    const alias = map[target].find(function(k) { return Object.prototype.hasOwnProperty.call(payload, k); });
    if (!alias) return;
    let value = payload[alias];

    if (target === 'DURACAO_PLANEJADA_DIAS') value = Math.max(1, Math.round(asNumber_(value, 1)));
    if (target === 'PESO_RELATIVO') {
      value = asNumber_(value, 0);
      if (value < 0) throw new Error('PESO_INVALIDO');
    }
    if (target === 'RESTRICAO_INICIO_MINIMO') value = parseDateOnly_(value) || '';
    if (target === 'ORDEM') value = asNumber_(value, 0);
    if (target === 'ATIVA') value = asBoolean_(value, true);
    if (target === 'NOME' && !String(value || '').trim()) throw new Error('NOME_ATIVIDADE_OBRIGATORIO');

    changes[target] = value;
  });

  if (Object.prototype.hasOwnProperty.call(changes, 'DURACAO_PLANEJADA_DIAS')) {
    changes.DURACAO_PROJETADA_DIAS = changes.DURACAO_PLANEJADA_DIAS;
  }
  changes.ATUALIZADO_EM = now_();

  const updated = updateObjectById_(
    'ATIVIDADES','ID_ATIVIDADE',idAtividade,changes,
    ['ID_WBS','NOME','ID_TIPO_ATIVIDADE','ID_EMPRESA','ID_RESPONSAVEL',
     'DURACAO_PLANEJADA_DIAS','PESO_RELATIVO','RESTRICAO_INICIO_MINIMO',
     'DURACAO_PROJETADA_DIAS','ORDEM','ATIVA','ATUALIZADO_EM']
  );

  appendAudit_({
    ID_OBRA: atual.ID_OBRA,
    ENTIDADE: 'ATIVIDADES',
    ID_REGISTRO: idAtividade,
    ACAO: 'ATUALIZAR',
    VALOR_ANTERIOR: JSON.stringify(atual),
    VALOR_NOVO: JSON.stringify(updated)
  });

  recalcularCronograma_(atual.ID_OBRA);
  return obterAtividade_(idAtividade);
}

function listarDependencias_(idObra) {
  return listObjects_('DEPENDENCIAS')
    .filter(function(item) {
      return String(item.ID_OBRA) === String(idObra) && asBoolean_(item.ATIVA, true);
    });
}

function criarDependencia_(payload) {
  const idObra = String(payload.ID_OBRA || payload.id_obra || '').trim();
  const pai = String(payload.ID_ATIVIDADE_PAI || payload.id_atividade_pai || '').trim();
  const filha = String(payload.ID_ATIVIDADE_FILHA || payload.id_atividade_filha || '').trim();
  if (!idObra || !pai || !filha) throw new Error('DEPENDENCIA_DADOS_OBRIGATORIOS');
  if (pai === filha) throw new Error('DEPENDENCIA_AUTO_REFERENCIA');

  const atividadePai = obterAtividade_(pai);
  const atividadeFilha = obterAtividade_(filha);
  if (!atividadePai || !atividadeFilha) throw new Error('ATIVIDADE_NAO_ENCONTRADA');
  if (String(atividadePai.ID_OBRA) !== idObra || String(atividadeFilha.ID_OBRA) !== idObra) {
    throw new Error('DEPENDENCIA_OBRA_INVALIDA');
  }

  const percentual = asNumber_(payload.PERCENTUAL_LIBERACAO || payload.percentual_liberacao, 100);
  const lag = Math.round(asNumber_(payload.LAG_DIAS || payload.lag_dias, 0));
  if (percentual < 0 || percentual > 100) throw new Error('PERCENTUAL_LIBERACAO_INVALIDO');

  const existente = listarDependencias_(idObra).some(function(d) {
    return String(d.ID_ATIVIDADE_PAI) === pai && String(d.ID_ATIVIDADE_FILHA) === filha;
  });
  if (existente) throw new Error('DEPENDENCIA_DUPLICADA');

  const item = {
    ID_DEPENDENCIA: uid_('DEP'),
    ID_OBRA: idObra,
    ID_ATIVIDADE_PAI: pai,
    ID_ATIVIDADE_FILHA: filha,
    PERCENTUAL_LIBERACAO: percentual,
    LAG_DIAS: lag,
    ATIVA: true,
    CRIADO_EM: now_(),
    ATUALIZADO_EM: now_()
  };

  appendObject_('DEPENDENCIAS', item);

  try {
    recalcularCronograma_(idObra);
  } catch (err) {
    updateObjectById_('DEPENDENCIAS','ID_DEPENDENCIA',item.ID_DEPENDENCIA,{ ATIVA:false, ATUALIZADO_EM:now_() },['ATIVA','ATUALIZADO_EM']);
    throw err;
  }

  appendAudit_({
    ID_OBRA: idObra,
    ENTIDADE: 'DEPENDENCIAS',
    ID_REGISTRO: item.ID_DEPENDENCIA,
    ACAO: 'CRIAR',
    VALOR_NOVO: JSON.stringify(item)
  });
  return item;
}

function excluirDependencia_(idDependencia) {
  const atual = findObjectById_('DEPENDENCIAS','ID_DEPENDENCIA',idDependencia);
  if (!atual) throw new Error('DEPENDENCIA_NAO_ENCONTRADA');

  updateObjectById_(
    'DEPENDENCIAS','ID_DEPENDENCIA',idDependencia,
    { ATIVA:false, ATUALIZADO_EM:now_() },
    ['ATIVA','ATUALIZADO_EM']
  );
  recalcularCronograma_(atual.ID_OBRA);

  appendAudit_({
    ID_OBRA: atual.ID_OBRA,
    ENTIDADE: 'DEPENDENCIAS',
    ID_REGISTRO: idDependencia,
    ACAO: 'EXCLUIR',
    VALOR_ANTERIOR: JSON.stringify(atual)
  });
  return { ID_DEPENDENCIA:idDependencia, ATIVA:false };
}


function atualizarWbs_(idWbs, payload) {
  const atual = findObjectById_('WBS','ID_WBS',idWbs);
  if (!atual) throw new Error('WBS_NAO_ENCONTRADA');

  const changes = {};
  if (Object.prototype.hasOwnProperty.call(payload,'nome') || Object.prototype.hasOwnProperty.call(payload,'NOME')) {
    const nome = String(payload.NOME || payload.nome || '').trim();
    if (!nome) throw new Error('NOME_WBS_OBRIGATORIO');
    changes.NOME = nome;
  }
  if (Object.prototype.hasOwnProperty.call(payload,'ordem') || Object.prototype.hasOwnProperty.call(payload,'ORDEM')) {
    changes.ORDEM = asNumber_(payload.ORDEM || payload.ordem, 0);
  }
  if (Object.prototype.hasOwnProperty.call(payload,'id_wbs_pai') || Object.prototype.hasOwnProperty.call(payload,'ID_WBS_PAI')) {
    const idPai = String(payload.ID_WBS_PAI || payload.id_wbs_pai || '').trim();
    if (idPai === idWbs) throw new Error('WBS_PAI_INVALIDA');
    if (idPai) {
      const pai = findObjectById_('WBS','ID_WBS',idPai);
      if (!pai || String(pai.ID_OBRA) !== String(atual.ID_OBRA)) throw new Error('WBS_PAI_INVALIDA');
    }
    changes.ID_WBS_PAI = idPai;
  }
  changes.ATUALIZADO_EM = now_();

  const updated = updateObjectById_(
    'WBS','ID_WBS',idWbs,changes,
    ['NOME','ORDEM','ID_WBS_PAI','ATUALIZADO_EM']
  );

  appendAudit_({
    ID_OBRA: atual.ID_OBRA,
    ENTIDADE: 'WBS',
    ID_REGISTRO: idWbs,
    ACAO: 'ATUALIZAR',
    VALOR_ANTERIOR: JSON.stringify(atual),
    VALOR_NOVO: JSON.stringify(updated)
  });
  return updated;
}

function excluirWbs_(idWbs) {
  const atual = findObjectById_('WBS','ID_WBS',idWbs);
  if (!atual) throw new Error('WBS_NAO_ENCONTRADA');

  const temFilhas = listarWbs_(atual.ID_OBRA).some(function(w) {
    return String(w.ID_WBS_PAI) === String(idWbs) && String(w.ID_WBS) !== String(idWbs);
  });
  const temAtividades = listarAtividades_(atual.ID_OBRA).some(function(a) {
    return String(a.ID_WBS) === String(idWbs);
  });
  if (temFilhas || temAtividades) throw new Error('WBS_EM_USO');

  const updated = updateObjectById_(
    'WBS','ID_WBS',idWbs,
    { ATIVA:false, ATUALIZADO_EM:now_() },
    ['ATIVA','ATUALIZADO_EM']
  );

  appendAudit_({
    ID_OBRA: atual.ID_OBRA,
    ENTIDADE:'WBS',
    ID_REGISTRO:idWbs,
    ACAO:'EXCLUIR',
    VALOR_ANTERIOR:JSON.stringify(atual)
  });
  return updated;
}

function excluirAtividade_(idAtividade) {
  const atual = obterAtividade_(idAtividade);
  if (!atual) throw new Error('ATIVIDADE_NAO_ENCONTRADA');

  listarDependencias_(atual.ID_OBRA)
    .filter(function(d) {
      return String(d.ID_ATIVIDADE_PAI) === String(idAtividade) ||
             String(d.ID_ATIVIDADE_FILHA) === String(idAtividade);
    })
    .forEach(function(d) {
      updateObjectById_(
        'DEPENDENCIAS','ID_DEPENDENCIA',d.ID_DEPENDENCIA,
        { ATIVA:false, ATUALIZADO_EM:now_() },
        ['ATIVA','ATUALIZADO_EM']
      );
    });

  const updated = updateObjectById_(
    'ATIVIDADES','ID_ATIVIDADE',idAtividade,
    { ATIVA:false, ATUALIZADO_EM:now_() },
    ['ATIVA','ATUALIZADO_EM']
  );

  appendAudit_({
    ID_OBRA: atual.ID_OBRA,
    ENTIDADE:'ATIVIDADES',
    ID_REGISTRO:idAtividade,
    ACAO:'EXCLUIR',
    VALOR_ANTERIOR:JSON.stringify(atual)
  });

  recalcularCronograma_(atual.ID_OBRA);
  return updated;
}
