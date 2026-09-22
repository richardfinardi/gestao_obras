/**
 * Motor de cronograma V1.
 * Dependência por percentual assume distribuição linear dentro da atividade.
 */

function parseDateOnly_(value) {
  if (!value) return null;
  if (value instanceof Date) return normalizarData_(value);

  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);

  const d = new Date(text);
  if (Number.isNaN(d.getTime())) throw new Error('DATA_INVALIDA');
  return normalizarData_(d);
}

function normalizarData_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
}

function obterCalendarioObra_(obra) {
  const todos = listObjects_('CALENDARIOS').filter(function(c) { return asBoolean_(c.ATIVO, true); });
  const id = String(obra.ID_CALENDARIO || '').trim();
  let cal = id ? todos.find(function(c) { return String(c.ID_CALENDARIO) === id; }) : null;
  if (!cal) cal = todos.find(function(c) { return String(c.ID_CALENDARIO) === 'CAL-PADRAO'; });
  if (!cal) {
    cal = { ID_CALENDARIO:'CAL-PADRAO', SEG:true, TER:true, QUA:true, QUI:true, SEX:true, SAB:false, DOM:false };
  }

  const excecoes = listObjects_('CALENDARIO_EXCECOES')
    .filter(function(e) { return String(e.ID_CALENDARIO) === String(cal.ID_CALENDARIO); })
    .map(function(e) {
      return {
        DATA: formatDateKey_(parseDateOnly_(e.DATA)),
        TIPO: String(e.TIPO || '').toUpperCase()
      };
    });

  return { calendario:cal, excecoes:excecoes };
}

function formatDateKey_(date) {
  if (!date) return '';
  return Utilities.formatDate(date, APP.TIMEZONE, 'yyyy-MM-dd');
}

function ehDiaUtil_(date, contexto) {
  const key = formatDateKey_(date);
  const ex = contexto.excecoes.find(function(e) { return e.DATA === key; });
  if (ex) return ['UTIL','TRABALHO','DIA_UTIL'].includes(ex.TIPO);

  const day = date.getDay();
  const map = {
    0:'DOM',1:'SEG',2:'TER',3:'QUA',4:'QUI',5:'SEX',6:'SAB'
  };
  return asBoolean_(contexto.calendario[map[day]], false);
}

function proximoDiaUtil_(date, contexto) {
  let d = normalizarData_(date);
  let guard = 0;
  while (!ehDiaUtil_(d, contexto)) {
    d.setDate(d.getDate() + 1);
    if (++guard > 370) throw new Error('CALENDARIO_SEM_DIAS_UTEIS');
  }
  return d;
}

function adicionarDiasUteis_(date, quantidade, contexto) {
  let d = proximoDiaUtil_(date, contexto);
  let restante = Math.max(0, Math.round(quantidade));
  while (restante > 0) {
    d.setDate(d.getDate() + 1);
    if (ehDiaUtil_(d, contexto)) restante--;
  }
  return d;
}

function subtrairDiasUteis_(date, quantidade, contexto) {
  let d = normalizarData_(date);
  let restante = Math.max(0, Math.round(quantidade));
  while (restante > 0) {
    d.setDate(d.getDate() - 1);
    if (ehDiaUtil_(d, contexto)) restante--;
  }
  return d;
}

function diferencaDiasUteis_(inicio, fim, contexto) {
  let a = proximoDiaUtil_(inicio, contexto);
  const b = normalizarData_(fim);
  if (a > b) return -diferencaDiasUteis_(b, a, contexto);

  let count = 0;
  while (a < b) {
    a.setDate(a.getDate() + 1);
    if (ehDiaUtil_(a, contexto)) count++;
  }
  return count;
}

function maxData_(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function offsetLiberacao_(atividadePai, dependencia) {
  const duracao = Math.max(1, Math.round(Number(atividadePai.DURACAO_PROJETADA_DIAS || atividadePai.DURACAO_PLANEJADA_DIAS || 1)));
  const pct = Math.max(0, Math.min(100, Number(dependencia.PERCENTUAL_LIBERACAO || 100)));

  if (pct <= 0) return 0;
  if (pct >= 100) return Math.max(0, duracao - 1);

  return Math.max(0, Math.ceil(duracao * pct / 100) - 1);
}

function ordenarTopologicamente_(atividades, dependencias) {
  const ids = new Set(atividades.map(function(a) { return String(a.ID_ATIVIDADE); }));
  const indegree = {};
  const filhos = {};
  ids.forEach(function(id) { indegree[id] = 0; filhos[id] = []; });

  dependencias.forEach(function(d) {
    const p = String(d.ID_ATIVIDADE_PAI);
    const f = String(d.ID_ATIVIDADE_FILHA);
    if (!ids.has(p) || !ids.has(f)) return;
    indegree[f]++;
    filhos[p].push(f);
  });

  const fila = atividades
    .filter(function(a) { return indegree[String(a.ID_ATIVIDADE)] === 0; })
    .map(function(a) { return String(a.ID_ATIVIDADE); });

  const ordem = [];
  while (fila.length) {
    const id = fila.shift();
    ordem.push(id);
    filhos[id].forEach(function(f) {
      indegree[f]--;
      if (indegree[f] === 0) fila.push(f);
    });
  }

  if (ordem.length !== atividades.length) throw new Error('DEPENDENCIA_CICLICA');
  return ordem;
}

function recalcularCronograma_(idObra) {
  const obra = obterObra_(idObra);
  if (!obra) throw new Error('OBRA_NAO_ENCONTRADA');

  const atividades = listarAtividades_(idObra);
  const dependencias = listarDependencias_(idObra);
  if (!atividades.length) {
    return { atividades:[], dataFimForecast:null, pesoTotal:0, criticas:0 };
  }

  const contexto = obterCalendarioObra_(obra);
  const inicioProjeto = proximoDiaUtil_(
    parseDateOnly_(obra.DATA_INICIO_CONTRATUAL) || normalizarData_(new Date()),
    contexto
  );
  const hoje = proximoDiaUtil_(normalizarData_(new Date()), contexto);
  const porId = {};
  atividades.forEach(function(a) { porId[String(a.ID_ATIVIDADE)] = Object.assign({}, a); });

  const ordem = ordenarTopologicamente_(atividades, dependencias);
  const preds = {};
  const succ = {};
  ordem.forEach(function(id) { preds[id] = []; succ[id] = []; });
  dependencias.forEach(function(d) {
    const p = String(d.ID_ATIVIDADE_PAI);
    const f = String(d.ID_ATIVIDADE_FILHA);
    if (!porId[p] || !porId[f]) return;
    preds[f].push(d);
    succ[p].push(d);
  });

  ordem.forEach(function(id) {
    const a = porId[id];
    const pctAtual = Number(a.PERCENTUAL_ATUAL || 0);
    const duracao = Math.max(1, Math.round(Number(a.DURACAO_PROJETADA_DIAS || a.DURACAO_PLANEJADA_DIAS || 1)));
    const realInicio = parseDateOnly_(a.DATA_INICIO_REAL);
    let inicio = realInicio || inicioProjeto;

    const restricao = parseDateOnly_(a.RESTRICAO_INICIO_MINIMO);
    if (!realInicio && restricao) inicio = maxData_(inicio, proximoDiaUtil_(restricao, contexto));

    preds[id].forEach(function(dep) {
      const pai = porId[String(dep.ID_ATIVIDADE_PAI)];
      const paiInicio = parseDateOnly_(pai.DATA_INICIO_FORECAST) || inicioProjeto;
      const pctPai = Number(pai.PERCENTUAL_ATUAL || 0);
      const limiar = Number(dep.PERCENTUAL_LIBERACAO || 100);
      let liberacao;

      if (pctPai >= limiar && pctPai > 0) {
        liberacao = hoje;
      } else {
        liberacao = adicionarDiasUteis_(paiInicio, offsetLiberacao_(pai, dep), contexto);
        if (pctPai > 0 && pctPai < limiar && liberacao < hoje) liberacao = hoje;
      }

      const lag = Math.round(Number(dep.LAG_DIAS || 0));
      liberacao = lag >= 0
        ? adicionarDiasUteis_(liberacao, lag, contexto)
        : subtrairDiasUteis_(liberacao, Math.abs(lag), contexto);

      if (!realInicio) inicio = maxData_(inicio, liberacao);
    });

    inicio = proximoDiaUtil_(inicio, contexto);
    const fim = pctAtual >= 100 && a.DATA_FIM_REAL
      ? parseDateOnly_(a.DATA_FIM_REAL)
      : adicionarDiasUteis_(inicio, duracao - 1, contexto);

    a.DATA_INICIO_FORECAST = inicio;
    a.DATA_FIM_FORECAST = fim;
    a.DURACAO_PROJETADA_DIAS = duracao;

    if (pctAtual >= 100) {
      a.STATUS = 'CONCLUIDA';
    } else if (pctAtual > 0) {
      a.STATUS = 'EM_EXECUCAO';
    } else {
      const bloqueada = preds[id].some(function(dep) {
        const pai = porId[String(dep.ID_ATIVIDADE_PAI)];
        return Number(pai.PERCENTUAL_ATUAL || 0) < Number(dep.PERCENTUAL_LIBERACAO || 100);
      });
      a.STATUS = bloqueada && inicio > hoje ? 'BLOQUEADA' : 'NAO_INICIADA';
    }
  });

  let dataFimProjeto = null;
  ordem.forEach(function(id) {
    const fim = porId[id].DATA_FIM_FORECAST;
    if (!dataFimProjeto || fim > dataFimProjeto) dataFimProjeto = fim;
  });

  const latestStart = {};
  ordem.slice().reverse().forEach(function(id) {
    const a = porId[id];
    const duracao = Math.max(1, Number(a.DURACAO_PROJETADA_DIAS || 1));
    let limite = subtrairDiasUteis_(dataFimProjeto, duracao - 1, contexto);

    succ[id].forEach(function(dep) {
      const childId = String(dep.ID_ATIVIDADE_FILHA);
      if (!latestStart[childId]) return;
      const candidato = subtrairDiasUteis_(
        latestStart[childId],
        offsetLiberacao_(a, dep) + Math.round(Number(dep.LAG_DIAS || 0)),
        contexto
      );
      if (candidato < limite) limite = candidato;
    });

    latestStart[id] = limite;
    const early = porId[id].DATA_INICIO_FORECAST;
    const folga = Math.max(0, diferencaDiasUteis_(early, limite, contexto));
    porId[id].FOLGA_TOTAL_DIAS = folga;
    porId[id].CAMINHO_CRITICO = folga === 0;
  });

  const sheet = getSheet_('ATIVIDADES');
  const headers = getHeaders_(sheet);
  const idIndex = headers.indexOf('ID_ATIVIDADE');
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const dataRange = sheet.getRange(2, 1, lastRow - 1, headers.length);
    const values = dataRange.getValues();
    const rowById = {};

    values.forEach(function(row, index) {
      rowById[String(row[idIndex])] = index;
    });

    const cols = {
      inicio: headers.indexOf('DATA_INICIO_FORECAST'),
      fim: headers.indexOf('DATA_FIM_FORECAST'),
      duracao: headers.indexOf('DURACAO_PROJETADA_DIAS'),
      folga: headers.indexOf('FOLGA_TOTAL_DIAS'),
      critica: headers.indexOf('CAMINHO_CRITICO'),
      status: headers.indexOf('STATUS'),
      atualizado: headers.indexOf('ATUALIZADO_EM')
    };
    const atualizadoEm = now_();

    ordem.forEach(function(id) {
      const rowIndex = rowById[String(id)];
      if (rowIndex === undefined) return;

      const row = values[rowIndex];
      const a = porId[id];

      if (cols.inicio >= 0) row[cols.inicio] = a.DATA_INICIO_FORECAST;
      if (cols.fim >= 0) row[cols.fim] = a.DATA_FIM_FORECAST;
      if (cols.duracao >= 0) row[cols.duracao] = a.DURACAO_PROJETADA_DIAS;
      if (cols.folga >= 0) row[cols.folga] = a.FOLGA_TOTAL_DIAS;
      if (cols.critica >= 0) row[cols.critica] = a.CAMINHO_CRITICO;
      if (cols.status >= 0) row[cols.status] = a.STATUS;
      if (cols.atualizado >= 0) row[cols.atualizado] = atualizadoEm;
    });

    dataRange.setValues(values);
  }

  SpreadsheetApp.flush();

  const atualizadas = listarAtividades_(idObra);
  return {
    atividades: atualizadas,
    dataFimForecast: dataFimProjeto ? formatDateKey_(dataFimProjeto) : null,
    pesoTotal: atualizadas.reduce(function(s, a) { return s + obterPesoRelativo_(a); }, 0),
    criticas: atualizadas.filter(function(a) { return asBoolean_(a.CAMINHO_CRITICO, false); }).length
  };
}
