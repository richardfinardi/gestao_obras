/**
 * Diário de obra V4.
 */
function obterDiario_(idObra, dataRef) {
  const data=formatDateKey_(parseDateOnly_(dataRef)||normalizarData_(new Date()));
  const atividades=listarAtividades_(idObra);
  const programacao=listarProgramacao_(idObra).filter(function(x){ return String(x.DATA).slice(0,10)===data; });
  const programacaoEquipes=listarProgramacaoEquipes_(idObra);
  const execucoes=listObjects_('EXECUCOES').filter(function(x){ return String(x.ID_OBRA)===String(idObra); });
  const execEquipes=listObjects_('EXECUCAO_EQUIPE').filter(function(x){ return String(x.ID_OBRA)===String(idObra); });

  const programadas=new Set(programacao.map(function(x){ return String(x.ID_ATIVIDADE); }));
  const emExecucao=new Set(atividades.filter(function(a){ return Number(a.PERCENTUAL_ATUAL||0)>0 && Number(a.PERCENTUAL_ATUAL||0)<100; }).map(function(a){return String(a.ID_ATIVIDADE);}));

  const ids=new Set(Array.from(programadas).concat(Array.from(emExecucao)));
  const items=atividades.filter(function(a){ return ids.has(String(a.ID_ATIVIDADE)); }).map(function(a){
    const p=programacao.find(function(x){ return String(x.ID_ATIVIDADE)===String(a.ID_ATIVIDADE); });
    const existing=execucoes.filter(function(x){
      return String(x.ID_ATIVIDADE)===String(a.ID_ATIVIDADE) && String(x.DATA_REFERENCIA).slice(0,10)===data;
    });
    const atualDia=existing.reduce(function(s,x){ return s+Number(x.AVANCO_PERIODO||0); },0);
    const latest=existing.slice().sort(function(x,y){ return String(x.CRIADO_EM).localeCompare(String(y.CRIADO_EM)); }).pop();
    const teams=latest ? execEquipes.filter(function(x){ return String(x.ID_EXECUCAO)===String(latest.ID_EXECUCAO); }) : [];
    return {
      atividade:a,
      planejadoDia:Number(p&&p.PERCENTUAL_PLANEJADO||0),
      programacaoEquipes:p?programacaoEquipes.filter(function(x){return String(x.ID_PROGRAMACAO)===String(p.ID_PROGRAMACAO);}):[],
      executadoDia:atualDia,
      observacao:latest?latest.OBSERVACAO||'':'',
      execucaoEquipes:teams
    };
  });

  return {data:data,obra:obterObra_(idObra),equipes:listarEquipes_(),items:items};
}

function salvarDiario_(payload) {
  const idObra=String(payload.id_obra||'').trim();
  const data=formatDateKey_(parseDateOnly_(payload.data)||normalizarData_(new Date()));
  const entries=Array.isArray(payload.entries)?payload.entries:[];
  if(!idObra) throw new Error('ID_OBRA_OBRIGATORIO');

  const atividades=listarAtividades_(idObra);
  const byId={}; atividades.forEach(function(a){byId[String(a.ID_ATIVIDADE)]=a;});
  const execExistentes=listObjects_('EXECUCOES').filter(function(x){return String(x.ID_OBRA)===idObra;});
  const agora=now_();
  const novasExec=[];
  const novosRecursos=[];
  const deltas={};

  entries.forEach(function(e){
    const id=String(e.activityId||'');
    const a=byId[id];
    if(!a) return;
    const desejado=asNumber_(e.progressDay,0);
    if(desejado<0 || desejado>100) throw new Error('EXECUCAO_PERCENTUAL_INVALIDO');
    const atualDia=execExistentes.filter(function(x){
      return String(x.ID_ATIVIDADE)===id && String(x.DATA_REFERENCIA).slice(0,10)===data;
    }).reduce(function(s,x){return s+Number(x.AVANCO_PERIODO||0);},0);
    const delta=desejado-atualDia;
    const anterior=Number(a.PERCENTUAL_ATUAL||0);
    const novo=Math.max(0,Math.min(100,anterior+delta));
    const idExec=uid_('EXE');
    novasExec.push({
      ID_EXECUCAO:idExec,ID_OBRA:idObra,ID_ATIVIDADE:id,DATA_REFERENCIA:parseDateOnly_(data),
      PERCENTUAL_ANTERIOR:anterior,PERCENTUAL_NOVO:novo,AVANCO_PERIODO:delta,
      OBSERVACAO:String(e.note||''),REGISTRADO_POR:String(e.user||'USUARIO'),CRIADO_EM:agora
    });
    deltas[id]={novo:novo,note:String(e.note||'')};
    (Array.isArray(e.teams)?e.teams:[]).forEach(function(t){
      const people=Math.max(0,asNumber_(t.people,0));
      if(!t.teamId || people<=0) return;
      novosRecursos.push({
        ID_EXECUCAO_EQUIPE:uid_('EXR'),ID_EXECUCAO:idExec,ID_OBRA:idObra,ID_ATIVIDADE:id,
        ID_EQUIPE:String(t.teamId),QUANTIDADE_PESSOAS:people,CRIADO_EM:agora
      });
    });
  });

  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try{
    appendObjectsBulk_('EXECUCOES',novasExec);
    appendObjectsBulk_('EXECUCAO_EQUIPE',novosRecursos);

    const sheet=getSheet_('ATIVIDADES'), headers=getHeaders_(sheet), last=sheet.getLastRow();
    if(last>=2){
      const range=sheet.getRange(2,1,last-1,headers.length), values=range.getValues();
      const idIdx=headers.indexOf('ID_ATIVIDADE'), pctIdx=headers.indexOf('PERCENTUAL_ATUAL');
      const iniIdx=headers.indexOf('DATA_INICIO_REAL'), fimIdx=headers.indexOf('DATA_FIM_REAL');
      const medIdx=headers.indexOf('ULTIMA_MEDICAO_EM'), obsIdx=headers.indexOf('ULTIMA_OBSERVACAO');
      values.forEach(function(row){
        const id=String(row[idIdx]); if(!deltas[id]) return;
        const novo=deltas[id].novo; row[pctIdx]=novo;
        if(novo>0 && iniIdx>=0 && !row[iniIdx]) row[iniIdx]=parseDateOnly_(data);
        if(novo>=100 && fimIdx>=0 && !row[fimIdx]) row[fimIdx]=parseDateOnly_(data);
        if(medIdx>=0) row[medIdx]=agora;
        if(obsIdx>=0) row[obsIdx]=deltas[id].note;
      });
      range.setValues(values);
    }
  } finally {lock.releaseLock();}

  recalcularCronograma_(idObra);
  appendAudit_({ID_OBRA:idObra,ENTIDADE:'DIARIO',ID_REGISTRO:data,ACAO:'SALVAR',VALOR_NOVO:JSON.stringify({registros:entries.length})});
  return obterDiario_(idObra,data);
}
