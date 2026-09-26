/**
 * Dashboard V4.
 */
function obterDashboard_(idObra) {
  const obra=obterObra_(idObra);
  if(!obra) throw new Error('OBRA_NAO_ENCONTRADA');
  const atividades=listarAtividades_(idObra);
  const programacao=listarProgramacao_(idObra);
  const progEquipes=listarProgramacaoEquipes_(idObra);
  const exec=listObjects_('EXECUCOES').filter(function(x){return String(x.ID_OBRA)===String(idObra);});
  const equipes=listarEquipes_();
  const frentes=listarFrentes_(idObra);
  const vinculos=listarAtividadeEquipes_(idObra);
  const hoje=formatDateKey_(normalizarData_(new Date()));
  const pesoTotal=atividades.reduce(function(s,a){return s+obterPesoRelativo_(a);},0)||1;

  const realizado=atividades.reduce(function(s,a){
    return s + obterPesoRelativo_(a)*(Number(a.PERCENTUAL_ATUAL||0)/100);
  },0)/pesoTotal*100;

  const planByAtv={};
  programacao.forEach(function(p){
    if(String(p.DATA).slice(0,10)<=hoje){
      const id=String(p.ID_ATIVIDADE);
      planByAtv[id]=(planByAtv[id]||0)+Number(p.PERCENTUAL_PLANEJADO||0);
    }
  });
  const planejado=atividades.reduce(function(s,a){
    return s+obterPesoRelativo_(a)*(Math.min(100,planByAtv[String(a.ID_ATIVIDADE)]||0)/100);
  },0)/pesoTotal*100;

  let fimPrevisto='';
  atividades.forEach(function(a){if(a.DATA_FIM_FORECAST && (!fimPrevisto || String(a.DATA_FIM_FORECAST)>fimPrevisto)) fimPrevisto=String(a.DATA_FIM_FORECAST);});

  const dates=new Set(programacao.map(function(x){return String(x.DATA).slice(0,10);}).concat(exec.map(function(x){return String(x.DATA_REFERENCIA).slice(0,10);})));
  const sortedDates=Array.from(dates).filter(Boolean).sort();
  const curve=[];
  const actualCum={};
  sortedDates.forEach(function(date){
    let plan=0;
    programacao.forEach(function(p){
      if(String(p.DATA).slice(0,10)<=date) {
        const a=atividades.find(function(x){return String(x.ID_ATIVIDADE)===String(p.ID_ATIVIDADE);});
        if(a) plan += obterPesoRelativo_(a)*(Number(p.PERCENTUAL_PLANEJADO||0)/100);
      }
    });
    const byAct={};
    exec.forEach(function(e){
      if(String(e.DATA_REFERENCIA).slice(0,10)<=date){
        const id=String(e.ID_ATIVIDADE); byAct[id]=(byAct[id]||0)+Number(e.AVANCO_PERIODO||0);
      }
    });
    let act=0;
    atividades.forEach(function(a){act+=obterPesoRelativo_(a)*(Math.max(0,Math.min(100,byAct[String(a.ID_ATIVIDADE)]||0))/100);});
    curve.push({date:date,planned:Math.min(100,plan/pesoTotal*100),actual:Math.min(100,act/pesoTotal*100)});
  });

  const teamLoad={};
  progEquipes.forEach(function(r){
    const p=programacao.find(function(x){return String(x.ID_PROGRAMACAO)===String(r.ID_PROGRAMACAO);});
    if(!p) return;
    const date=String(p.DATA).slice(0,10), id=String(r.ID_EQUIPE);
    if(!teamLoad[date]) teamLoad[date]={};
    teamLoad[date][id]=(teamLoad[date][id]||0)+Number(r.QUANTIDADE_PESSOAS||0);
  });

  return {
    obra:obra,
    kpis:{
      atividades:atividades.length,frentes:frentes.length,
      equipes:new Set(vinculos.map(function(x){return String(x.ID_EQUIPE);})).size,
      planejado:planejado,realizado:realizado,desvio:realizado-planejado,
      fimContratual:obra.DATA_FIM_CONTRATUAL||'',fimPrevisto:fimPrevisto,
      criticas:atividades.filter(function(a){return asBoolean_(a.CAMINHO_CRITICO,false);}).length,
      bloqueadas:atividades.filter(function(a){return a.STATUS==='BLOQUEADA';}).length
    },
    curve:curve,
    teamLoad:teamLoad,
    equipes:equipes,
    frentes:frentes,
    atividades:atividades,
    atividadeEquipes:vinculos
  };
}
