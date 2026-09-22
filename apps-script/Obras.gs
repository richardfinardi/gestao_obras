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
