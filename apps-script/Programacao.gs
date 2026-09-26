/**
 * Programação diária V4.
 */
function listarProgramacao_(idObra) {
  return listObjects_('PROGRAMACAO_DIARIA').filter(function(x) {
    return String(x.ID_OBRA) === String(idObra) && asBoolean_(x.ATIVA, true);
  });
}

function listarProgramacaoEquipes_(idObra) {
  return listObjects_('PROGRAMACAO_EQUIPE').filter(function(x) {
    return String(x.ID_OBRA) === String(idObra) && asBoolean_(x.ATIVA, true);
  });
}

function obterProgramacao_(idObra) {
  const obra = obterObra_(idObra);
  if (!obra) throw new Error('OBRA_NAO_ENCONTRADA');
  const cal = obterCalendarioObra_(obra);
  return {
    obra:obra,
    atividades:listarAtividades_(idObra),
    frentes:listarFrentes_(idObra),
    equipes:listarEquipes_(),
    atividadeEquipes:listarAtividadeEquipes_(idObra),
    programacao:listarProgramacao_(idObra),
    programacaoEquipes:listarProgramacaoEquipes_(idObra),
    calendario:cal
  };
}

function desativarPorCampo_(sheetName, fieldName, value) {
  const sheet=getSheet_(sheetName);
  const headers=getHeaders_(sheet);
  const fieldIndex=headers.indexOf(fieldName);
  const activeIndex=headers.indexOf('ATIVA');
  const lastRow=sheet.getLastRow();
  if(lastRow<2 || fieldIndex<0 || activeIndex<0) return;
  const range=sheet.getRange(2,1,lastRow-1,headers.length);
  const values=range.getValues();
  let changed=false;
  values.forEach(function(row){
    if(String(row[fieldIndex])===String(value) && row[activeIndex]!==false){
      row[activeIndex]=false; changed=true;
    }
  });
  if(changed) range.setValues(values);
}

function efetivarProgramacao_(payload) {
  const idObra=String(payload.id_obra||payload.ID_OBRA||'').trim();
  const idAtividade=String(payload.id_atividade||payload.ID_ATIVIDADE||'').trim();
  const rows=Array.isArray(payload.rows)?payload.rows:[];
  if(!idObra || !idAtividade) throw new Error('PROGRAMACAO_DADOS_OBRIGATORIOS');

  const atividade=obterAtividade_(idAtividade);
  if(!atividade || String(atividade.ID_OBRA)!==idObra) throw new Error('ATIVIDADE_NAO_ENCONTRADA');

  const soma=rows.reduce(function(s,r){ return s+asNumber_(r.percent,0); },0);
  if(rows.length && Math.abs(soma-100)>0.02) throw new Error('PROGRAMACAO_DEVE_FECHAR_100');

  rows.forEach(function(r){
    if(!r.date) throw new Error('PROGRAMACAO_DATA_OBRIGATORIA');
    const pct=asNumber_(r.percent,0);
    if(pct<0 || pct>100) throw new Error('PROGRAMACAO_PERCENTUAL_INVALIDO');
  });

  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    desativarPorCampo_('PROGRAMACAO_DIARIA','ID_ATIVIDADE',idAtividade);
    desativarPorCampo_('PROGRAMACAO_EQUIPE','ID_ATIVIDADE',idAtividade);

    const agora=now_();
    const prog=[];
    const recursos=[];
    rows.forEach(function(r){
      const idProg=uid_('PRG');
      prog.push({
        ID_PROGRAMACAO:idProg, ID_OBRA:idObra, ID_ATIVIDADE:idAtividade,
        DATA:parseDateOnly_(r.date), PERCENTUAL_PLANEJADO:asNumber_(r.percent,0),
        OBSERVACAO:String(r.note||''), ATIVA:true, CRIADO_EM:agora, ATUALIZADO_EM:agora
      });
      (Array.isArray(r.teams)?r.teams:[]).forEach(function(t){
        const people=Math.max(0,asNumber_(t.people,0));
        if(!t.teamId || people<=0) return;
        recursos.push({
          ID_PROGRAMACAO_EQUIPE:uid_('PRE'), ID_PROGRAMACAO:idProg, ID_OBRA:idObra,
          ID_ATIVIDADE:idAtividade, ID_EQUIPE:String(t.teamId),
          QUANTIDADE_PESSOAS:people, ATIVA:true, CRIADO_EM:agora, ATUALIZADO_EM:agora
        });
      });
    });
    appendObjectsBulk_('PROGRAMACAO_DIARIA',prog);
    appendObjectsBulk_('PROGRAMACAO_EQUIPE',recursos);
  } finally { lock.releaseLock(); }

  appendAudit_({ID_OBRA:idObra,ENTIDADE:'PROGRAMACAO',ID_REGISTRO:idAtividade,ACAO:'EFETIVAR',VALOR_NOVO:JSON.stringify({dias:rows.length})});
  return obterProgramacao_(idObra);
}
