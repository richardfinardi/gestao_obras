/**
 * Gestão de Obras V4
 * Programação diária, diário, dashboard, cadastros e equipes múltiplas.
 */

HELP.frente = {
  title:'Frente / Área',
  html:'<p>É a região ou frente física onde o serviço acontece, por exemplo <strong>Beleza x Calçados</strong>, DML ou Sala VM.</p><p>Serve para filtrar e acompanhar partes da obra separadamente. Você pode simplesmente digitar uma nova frente; o sistema cadastra ao efetivar.</p>'
};
HELP.equipes = {
  title:'Equipes',
  html:'<p>São as equipes que podem participar da atividade. Uma atividade pode ter <strong>várias equipes</strong>.</p><p>Na Programação diária você informa quantas pessoas de cada equipe estarão trabalhando em cada dia.</p>'
};
HELP.programacao = {
  title:'Programação diária',
  html:'<p>Aqui você distribui os <strong>100% da própria atividade</strong> pelos dias em que pretende executá-la.</p><p>Isso é diferente do Peso: o Peso compara uma atividade com as outras; a programação diária divide a própria atividade no tempo.</p><p>Você também informa quantas pessoas de cada equipe estarão alocadas por dia.</p>'
};
HELP.distribuir_programacao = {
  title:'Distribuir automaticamente',
  html:'<p>Preenche os dias úteis entre o início e o fim previstos e divide os 100% igualmente.</p><p>Depois você pode ajustar qualquer dia manualmente antes de efetivar.</p>'
};
HELP.diario = {
  title:'Diário de obra',
  html:'<p>É o registro do que <strong>realmente aconteceu</strong> em uma data.</p><p>Informe o avanço executado naquele dia, a quantidade real de pessoas por equipe e uma observação quando necessário.</p>'
};
HELP.previsto_dia = {
  title:'Previsto hoje',
  html:'<p>Percentual da atividade que estava programado para ser executado nesta data.</p>'
};
HELP.executado_dia = {
  title:'Executado hoje',
  html:'<p>Percentual da própria atividade que foi efetivamente executado neste dia. O sistema acumula os lançamentos e atualiza o avanço da atividade.</p>'
};
HELP.equipe_real = {
  title:'Equipe real',
  html:'<p>Quantidade de pessoas que realmente trabalhou na atividade naquele dia, separada por equipe.</p>'
};
HELP.dashboard = {
  title:'Resumo executivo',
  html:'<p>Consolida automaticamente planejamento, programação e execução: avanço previsto, avanço real, desvio, fim previsto, atividades críticas e carga de equipes.</p>'
};
HELP.curva_s = {
  title:'Curva de avanço',
  html:'<p>Compara o avanço físico <strong>planejado</strong> com o <strong>realizado</strong> ao longo do tempo. O cálculo usa o Peso relativo de cada atividade.</p>'
};
HELP.carga_equipe = {
  title:'Carga por equipe',
  html:'<p>Soma a quantidade de pessoas programadas por equipe ao longo da obra. Ajuda a enxergar concentração e conflito de recursos.</p>'
};
HELP.gantt = {
  title:'Linha do tempo',
  html:'<p>Mostra visualmente quando cada atividade está prevista para começar e terminar.</p>'
};
HELP.cadastros = {
  title:'Cadastros',
  html:'<p>São listas reutilizadas pelo sistema, como Tipos de atividade e Equipes. Você cadastra uma vez e depois apenas seleciona nas obras.</p>'
};

const v4state = {
  programmingData:null,
  programmingActivityId:null,
  programmingRows:[],
  programmingDirty:false,
  diaryData:null,
  dashboardData:null,
  cadastros:null,
  teamEditingKey:null
};

const v4el = {};

window.enableProjectNavV4 = function(){
  ['navProgramacao','navDiario','navDashboard'].forEach(id=>{
    const node=document.querySelector('#'+id);
    if(node) node.disabled=!state.obraAtual;
  });
};

window.renderFrontOptionsV4 = function(){
  const list=document.querySelector('#frontOptions');
  if(!list) return;
  list.innerHTML=(state.frentes||[]).map(f=>'<option value="'+escapeAttr(f.NOME)+'"></option>').join('');
};

document.addEventListener('DOMContentLoaded', bootV4);

function bootV4(){
  [
    'navProgramacao','navDiario','navDashboard','navCadastros',
    'programmingView','diaryView','dashboardView','cadastrosView',
    'backFromProgrammingBtn','backFromDiaryBtn','backFromDashboardBtn',
    'programmingProjectName','programmingSearch','programmingActivityList','programmingEmpty','programmingEditor',
    'programmingCode','programmingActivityName','programmingActivityMeta','autoDistributeBtn','saveProgrammingBtn',
    'programmingSum','programmingValidation','programmingHead','programmingBody','addProgrammingDayBtn',
    'diaryProjectName','diaryDate','saveDiaryBtn','diaryPlannedCount','diaryBody','diaryEmpty',
    'dashboardProjectName','dashboardKpis','curveChart','teamLoadChart','ganttChart',
    'typesList','teamsList','newTypeName','newTeamName','addTypeBtn','addTeamBtn',
    'teamBackdrop','teamDrawer','teamDrawerTitle','closeTeamDrawerBtn','teamCheckboxList'
  ].forEach(id=>v4el[id]=document.querySelector('#'+id));

  bindNavigationV4();
  bindTeamDrawerV4();
  bindProgrammingV4();
  bindDiaryV4();
  bindCadastrosV4();

  document.addEventListener('click',e=>{
    const help=e.target.closest('[data-help]');
    if(!help || e.defaultPrevented) return;
    e.preventDefault();
    openHelpPopover(help.dataset.help,help);
  });

  // A tela principal já registrou estes eventos; este bloco garante que as novas telas sumam ao voltar.
  document.querySelector('#navObras')?.addEventListener('click',hideOperationalViewsV4);
  document.querySelector('#backToPortfolioBtn')?.addEventListener('click',hideOperationalViewsV4);
  document.querySelector('#navPlanejamento')?.addEventListener('click',()=>{
    hideOperationalViewsV4();
    show(el.planningView);
    hide(el.portfolioView);
  });

  el.plannerBody?.addEventListener('click',e=>{
    const btn=e.target.closest('[data-teams]');
    if(!btn) return;
    const tr=btn.closest('tr[data-key]');
    if(!tr) return;
    openTeamDrawerV4(tr.dataset.key);
  });
}

function bindNavigationV4(){
  v4el.navProgramacao?.addEventListener('click',openProgrammingV4);
  v4el.navDiario?.addEventListener('click',openDiaryV4);
  v4el.navDashboard?.addEventListener('click',openDashboardV4);
  v4el.navCadastros?.addEventListener('click',openCadastrosV4);
  v4el.backFromProgrammingBtn?.addEventListener('click',showPlanningFromV4);
  v4el.backFromDiaryBtn?.addEventListener('click',showPlanningFromV4);
  v4el.backFromDashboardBtn?.addEventListener('click',showPlanningFromV4);
}

function hideOperationalViewsV4(){
  [v4el.programmingView,v4el.diaryView,v4el.dashboardView,v4el.cadastrosView].forEach(hide);
  ['navProgramacao','navDiario','navDashboard','navCadastros'].forEach(id=>v4el[id]?.classList.remove('active'));
}

function hideAllMainViewsV4(){
  hide(el.portfolioView); hide(el.planningView); hideOperationalViewsV4();
  el.navObras.classList.remove('active');
  el.navPlanejamento.classList.remove('active');
}

function activateNavV4(id){
  ['navProgramacao','navDiario','navDashboard','navCadastros'].forEach(x=>v4el[x]?.classList.toggle('active',x===id));
}

function showPlanningFromV4(){
  hideOperationalViewsV4();
  hide(el.portfolioView); show(el.planningView);
  el.navObras.classList.remove('active');
  el.navPlanejamento.classList.add('active');
}

async function openProgrammingV4(){
  if(!state.obraAtual) return;
  hideAllMainViewsV4(); show(v4el.programmingView); activateNavV4('navProgramacao');
  v4el.programmingProjectName.textContent=state.obraAtual.NOME||'Obra';
  v4el.programmingActivityList.innerHTML='<div class="mini-loading">Carregando...</div>';
  try{
    v4state.programmingData=await api('programacao.get',{id_obra:state.obraAtual.ID_OBRA});
    renderProgrammingActivityListV4();
    const first=v4state.programmingData.atividades?.[0];
    if(first) selectProgrammingActivityV4(first.ID_ATIVIDADE);
  }catch(err){ toast(err.message,true); }
}

function renderProgrammingActivityListV4(){
  const q=(v4el.programmingSearch?.value||'').toLowerCase();
  const list=(v4state.programmingData?.atividades||[]).filter(a=>
    !q || [a.CODIGO,a.NOME].join(' ').toLowerCase().includes(q)
  );
  v4el.programmingActivityList.innerHTML='';
  list.forEach(a=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='activity-selector-item'+(String(a.ID_ATIVIDADE)===String(v4state.programmingActivityId)?' active':'');
    b.innerHTML='<span>'+escapeHtml(a.CODIGO||'')+'</span><strong>'+escapeHtml(a.NOME||'')+'</strong><small>'+formatDate(a.DATA_INICIO_FORECAST)+' → '+formatDate(a.DATA_FIM_FORECAST)+'</small>';
    b.addEventListener('click',()=>selectProgrammingActivityV4(a.ID_ATIVIDADE));
    v4el.programmingActivityList.appendChild(b);
  });
}

function bindProgrammingV4(){
  v4el.programmingSearch?.addEventListener('input',renderProgrammingActivityListV4);
  v4el.autoDistributeBtn?.addEventListener('click',autoDistributeV4);
  v4el.saveProgrammingBtn?.addEventListener('click',saveProgrammingV4);
  v4el.addProgrammingDayBtn?.addEventListener('click',addProgrammingDayV4);
  v4el.programmingBody?.addEventListener('input',handleProgrammingInputV4);
  v4el.programmingBody?.addEventListener('click',e=>{
    const btn=e.target.closest('[data-remove-program-day]');
    if(!btn) return;
    v4state.programmingRows.splice(Number(btn.dataset.removeProgramDay),1);
    markProgrammingDirtyV4(); renderProgrammingEditorV4();
  });
}

function selectProgrammingActivityV4(id){
  v4state.programmingActivityId=String(id);
  renderProgrammingActivityListV4();
  const a=v4state.programmingData.atividades.find(x=>String(x.ID_ATIVIDADE)===String(id));
  if(!a) return;

  const stored=loadProgrammingDraftV4(id);
  if(stored){
    v4state.programmingRows=stored;
    v4state.programmingDirty=true;
  }else{
    const prog=(v4state.programmingData.programacao||[]).filter(p=>String(p.ID_ATIVIDADE)===String(id));
    const resources=v4state.programmingData.programacaoEquipes||[];
    v4state.programmingRows=prog.map(p=>({
      date:String(p.DATA).slice(0,10),
      percent:Number(p.PERCENTUAL_PLANEJADO||0),
      note:p.OBSERVACAO||'',
      teams:resources.filter(r=>String(r.ID_PROGRAMACAO)===String(p.ID_PROGRAMACAO)).map(r=>({teamId:String(r.ID_EQUIPE),people:Number(r.QUANTIDADE_PESSOAS||0)}))
    })).sort((x,y)=>x.date.localeCompare(y.date));
    v4state.programmingDirty=false;
  }
  show(v4el.programmingEditor); hide(v4el.programmingEmpty);
  v4el.programmingCode.textContent=a.CODIGO||'';
  v4el.programmingActivityName.textContent=a.NOME||'';
  v4el.programmingActivityMeta.textContent='Previsto: '+formatDate(a.DATA_INICIO_FORECAST)+' → '+formatDate(a.DATA_FIM_FORECAST)+' · Peso '+formatNumber(a.PESO_RELATIVO||0);
  renderProgrammingEditorV4();
}

function assignedTeamsForActivityV4(idAtividade){
  const links=(v4state.programmingData?.atividadeEquipes||[]).filter(x=>String(x.ID_ATIVIDADE)===String(idAtividade));
  const ids=links.map(x=>String(x.ID_EQUIPE));
  return (v4state.programmingData?.equipes||[]).filter(e=>ids.includes(String(e.ID_EQUIPE)));
}

function renderProgrammingEditorV4(){
  const teams=assignedTeamsForActivityV4(v4state.programmingActivityId);
  v4el.programmingHead.innerHTML='<tr><th>Data</th><th>Evolução planejada %</th>'+teams.map(t=>'<th>'+escapeHtml(t.NOME)+' · pessoas</th>').join('')+'<th>Observação</th><th></th></tr>';
  v4el.programmingBody.innerHTML='';
  v4state.programmingRows.forEach((r,index)=>{
    const teamMap=Object.fromEntries((r.teams||[]).map(t=>[String(t.teamId),t.people]));
    const tr=document.createElement('tr');
    tr.dataset.index=index;
    tr.innerHTML='<td><input data-pfield="date" type="date" value="'+escapeAttr(r.date||'')+'"></td>'+
      '<td><input class="grid-number" data-pfield="percent" type="number" min="0" max="100" step="0.01" value="'+Number(r.percent||0)+'"></td>'+
      teams.map(t=>'<td><input class="grid-number" data-team-people="'+escapeAttr(t.ID_EQUIPE)+'" type="number" min="0" step="1" value="'+Number(teamMap[String(t.ID_EQUIPE)]||0)+'"></td>').join('')+
      '<td><input data-pfield="note" value="'+escapeAttr(r.note||'')+'" placeholder="Opcional"></td>'+
      '<td><button class="tiny-button danger-link" data-remove-program-day="'+index+'" type="button">×</button></td>';
    v4el.programmingBody.appendChild(tr);
  });
  updateProgrammingSumV4();
}

function handleProgrammingInputV4(e){
  const tr=e.target.closest('tr[data-index]'); if(!tr) return;
  const row=v4state.programmingRows[Number(tr.dataset.index)]; if(!row) return;
  if(e.target.dataset.pfield==='date') row.date=e.target.value;
  if(e.target.dataset.pfield==='percent') row.percent=Math.max(0,Math.min(100,Number(e.target.value||0)));
  if(e.target.dataset.pfield==='note') row.note=e.target.value;
  if(e.target.dataset.teamPeople){
    row.teams=row.teams||[];
    const id=String(e.target.dataset.teamPeople);
    let t=row.teams.find(x=>String(x.teamId)===id);
    if(!t){t={teamId:id,people:0};row.teams.push(t);}
    t.people=Math.max(0,Number(e.target.value||0));
  }
  markProgrammingDirtyV4(); updateProgrammingSumV4();
}

function markProgrammingDirtyV4(){
  v4state.programmingDirty=true;
  localStorage.setItem(programmingDraftKeyV4(v4state.programmingActivityId),JSON.stringify(v4state.programmingRows));
}
function programmingDraftKeyV4(id){return 'gestao_obras_program_v4_'+state.obraAtual.ID_OBRA+'_'+id;}
function loadProgrammingDraftV4(id){try{const x=localStorage.getItem(programmingDraftKeyV4(id));return x?JSON.parse(x):null;}catch(_){return null;}}

function updateProgrammingSumV4(){
  const sum=v4state.programmingRows.reduce((s,r)=>s+Number(r.percent||0),0);
  v4el.programmingSum.textContent=formatNumber(sum)+'%';
  const ok=Math.abs(sum-100)<0.02;
  v4el.programmingValidation.textContent=ok?'Fechado em 100%':'Faltam '+formatNumber(100-sum)+' p.p.';
  v4el.programmingValidation.className=ok?'valid-text':'warning-text';
  v4el.saveProgrammingBtn.disabled=!v4state.programmingDirty || !ok;
}

function isWorkdayV4(date){
  const cal=v4state.programmingData?.calendario;
  if(!cal) return ![0,6].includes(date.getDay());
  const key=date.toISOString().slice(0,10);
  const ex=(cal.excecoes||[]).find(x=>String(x.DATA).slice(0,10)===key);
  if(ex) return ['UTIL','TRABALHO','DIA_UTIL'].includes(String(ex.TIPO||'').toUpperCase());
  const names=['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
  return isTrue(cal.calendario?.[names[date.getDay()]]);
}

function autoDistributeV4(){
  const a=v4state.programmingData?.atividades?.find(x=>String(x.ID_ATIVIDADE)===String(v4state.programmingActivityId));
  if(!a?.DATA_INICIO_FORECAST || !a?.DATA_FIM_FORECAST){toast('A atividade ainda não possui datas previstas.',true);return;}
  const start=new Date(String(a.DATA_INICIO_FORECAST).slice(0,10)+'T12:00:00');
  const end=new Date(String(a.DATA_FIM_FORECAST).slice(0,10)+'T12:00:00');
  const days=[]; const d=new Date(start);
  while(d<=end){if(isWorkdayV4(d)) days.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}
  if(!days.length){toast('Nenhum dia útil encontrado.',true);return;}
  const teams=assignedTeamsForActivityV4(v4state.programmingActivityId);
  const base=Math.floor((100/days.length)*100)/100;
  let used=0;
  v4state.programmingRows=days.map((date,i)=>{
    const pct=i===days.length-1?Number((100-used).toFixed(2)):base; used+=pct;
    return {date,percent:pct,note:'',teams:teams.map(t=>({teamId:String(t.ID_EQUIPE),people:0}))};
  });
  markProgrammingDirtyV4(); renderProgrammingEditorV4();
}

function addProgrammingDayV4(){
  let date=new Date();
  if(v4state.programmingRows.length){
    date=new Date(v4state.programmingRows.at(-1).date+'T12:00:00');date.setDate(date.getDate()+1);
  }
  v4state.programmingRows.push({date:date.toISOString().slice(0,10),percent:0,note:'',teams:assignedTeamsForActivityV4(v4state.programmingActivityId).map(t=>({teamId:String(t.ID_EQUIPE),people:0}))});
  markProgrammingDirtyV4();renderProgrammingEditorV4();
}

async function saveProgrammingV4(){
  if(!v4state.programmingActivityId) return;
  const sum=v4state.programmingRows.reduce((s,r)=>s+Number(r.percent||0),0);
  if(Math.abs(sum-100)>=0.02){toast('A programação precisa fechar 100%.',true);return;}
  setBusy(v4el.saveProgrammingBtn,true,'Efetivando...');
  try{
    v4state.programmingData=await api('programacao.efetivar',{
      id_obra:state.obraAtual.ID_OBRA,id_atividade:v4state.programmingActivityId,rows:v4state.programmingRows
    });
    localStorage.removeItem(programmingDraftKeyV4(v4state.programmingActivityId));
    v4state.programmingDirty=false;
    selectProgrammingActivityV4(v4state.programmingActivityId);
    toast('Programação efetivada.');
  }catch(err){toast(err.message,true);}
  finally{setBusy(v4el.saveProgrammingBtn,false,'✓ Efetivar programação');updateProgrammingSumV4();}
}

function bindDiaryV4(){
  v4el.diaryDate?.addEventListener('change',loadDiaryV4);
  v4el.saveDiaryBtn?.addEventListener('click',saveDiaryV4);
}

async function openDiaryV4(){
  if(!state.obraAtual) return;
  hideAllMainViewsV4(); show(v4el.diaryView); activateNavV4('navDiario');
  v4el.diaryProjectName.textContent=state.obraAtual.NOME||'Obra';
  if(!v4el.diaryDate.value) v4el.diaryDate.value=new Date().toISOString().slice(0,10);
  await loadDiaryV4();
}

async function loadDiaryV4(){
  try{
    v4state.diaryData=await api('diario.get',{id_obra:state.obraAtual.ID_OBRA,data:v4el.diaryDate.value});
    renderDiaryV4();
  }catch(err){toast(err.message,true);}
}

function renderDiaryV4(){
  const data=v4state.diaryData;
  const items=data?.items||[];
  v4el.diaryPlannedCount.textContent=items.filter(x=>Number(x.planejadoDia||0)>0).length+' atividades';
  v4el.diaryBody.innerHTML='';
  if(!items.length){show(v4el.diaryEmpty);return;} hide(v4el.diaryEmpty);
  items.forEach(item=>{
    const a=item.atividade;
    const plannedTeams=item.programacaoEquipes||[];
    const existing=Object.fromEntries((item.execucaoEquipes||[]).map(x=>[String(x.ID_EQUIPE),Number(x.QUANTIDADE_PESSOAS||0)]));
    const teamIds=Array.from(new Set(plannedTeams.map(x=>String(x.ID_EQUIPE)).concat(Object.keys(existing))));
    const teamHtml=teamIds.length?teamIds.map(id=>{
      const name=data.equipes.find(e=>String(e.ID_EQUIPE)===id)?.NOME||id;
      return '<label class="people-inline"><span>'+escapeHtml(name)+'</span><input data-dteam="'+escapeAttr(id)+'" type="number" min="0" value="'+Number(existing[id]||0)+'"></label>';
    }).join(''):'<span class="cell-na">Sem equipe</span>';
    const tr=document.createElement('tr');tr.dataset.activity=a.ID_ATIVIDADE;
    tr.innerHTML='<td><span class="project-code">'+escapeHtml(a.CODIGO||'')+'</span><strong>'+escapeHtml(a.NOME||'')+'</strong></td>'+
      '<td class="num">'+formatNumber(item.planejadoDia||0)+'%</td>'+
      '<td class="num">'+formatNumber(a.PERCENTUAL_ATUAL||0)+'%</td>'+
      '<td><input class="grid-number" data-dfield="progressDay" type="number" min="0" max="100" step="0.01" value="'+Number(item.executadoDia||0)+'"></td>'+
      '<td><div class="people-grid">'+teamHtml+'</div></td>'+
      '<td><input data-dfield="note" value="'+escapeAttr(item.observacao||'')+'" placeholder="Ocorrência, impedimento..."></td>';
    v4el.diaryBody.appendChild(tr);
  });
}

async function saveDiaryV4(){
  const entries=[];
  v4el.diaryBody.querySelectorAll('tr[data-activity]').forEach(tr=>{
    const teams=[];tr.querySelectorAll('[data-dteam]').forEach(inp=>teams.push({teamId:inp.dataset.dteam,people:Number(inp.value||0)}));
    entries.push({
      activityId:tr.dataset.activity,
      progressDay:Number(tr.querySelector('[data-dfield="progressDay"]')?.value||0),
      note:tr.querySelector('[data-dfield="note"]')?.value||'',
      teams
    });
  });
  setBusy(v4el.saveDiaryBtn,true,'Salvando...');
  try{
    v4state.diaryData=await api('diario.salvar',{id_obra:state.obraAtual.ID_OBRA,data:v4el.diaryDate.value,entries});
    renderDiaryV4();toast('Diário salvo e cronograma recalculado.');
  }catch(err){toast(err.message,true);}
  finally{setBusy(v4el.saveDiaryBtn,false,'✓ Salvar diário');}
}

async function openDashboardV4(){
  if(!state.obraAtual) return;
  hideAllMainViewsV4();show(v4el.dashboardView);activateNavV4('navDashboard');
  v4el.dashboardProjectName.textContent=state.obraAtual.NOME||'Obra';
  v4el.dashboardKpis.innerHTML='<div class="mini-loading">Calculando indicadores...</div>';
  try{
    v4state.dashboardData=await api('dashboard.get',{id_obra:state.obraAtual.ID_OBRA});
    renderDashboardV4();
  }catch(err){toast(err.message,true);}
}

function renderDashboardV4(){
  const d=v4state.dashboardData,k=d.kpis||{};
  const cards=[
    ['Avanço previsto',formatNumber(k.planejado)+'%','previsto_dia'],
    ['Avanço realizado',formatNumber(k.realizado)+'%','curva_s'],
    ['Desvio',(k.desvio>=0?'+':'')+formatNumber(k.desvio)+' p.p.','curva_s'],
    ['Fim previsto',formatDate(k.fimPrevisto),'previsto'],
    ['Atividades críticas',String(k.criticas||0),'critica'],
    ['Frentes / Equipes',(k.frentes||0)+' / '+(k.equipes||0),'frente']
  ];
  v4el.dashboardKpis.innerHTML=cards.map(c=>'<article><span>'+c[0]+' <button class="help-dot" type="button" data-help="'+c[2]+'">?</button></span><strong>'+c[1]+'</strong></article>').join('');
  renderCurveV4(d.curve||[]);
  renderTeamLoadV4(d);
  renderGanttV4(d);
}

function renderCurveV4(points){
  if(!points.length){v4el.curveChart.innerHTML='<div class="empty-mini">Efetive a programação diária para formar a curva planejada.</div>';return;}
  const w=680,h=250,pad=30;
  const x=i=>pad+(i*(w-pad*2)/Math.max(1,points.length-1));
  const y=v=>h-pad-(Math.max(0,Math.min(100,v))*(h-pad*2)/100);
  const p1=points.map((p,i)=>x(i)+','+y(p.planned)).join(' ');
  const p2=points.map((p,i)=>x(i)+','+y(p.actual)).join(' ');
  v4el.curveChart.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" class="curve-svg"><line x1="'+pad+'" y1="'+(h-pad)+'" x2="'+(w-pad)+'" y2="'+(h-pad)+'"/><line x1="'+pad+'" y1="'+pad+'" x2="'+pad+'" y2="'+(h-pad)+'"/><polyline class="planned-line" points="'+p1+'"/><polyline class="actual-line" points="'+p2+'"/></svg><div class="chart-legend"><span>— Planejado</span><span>— Realizado</span></div>';
}

function renderTeamLoadV4(d){
  const totals={};
  Object.values(d.teamLoad||{}).forEach(day=>Object.entries(day).forEach(([id,n])=>totals[id]=(totals[id]||0)+Number(n||0)));
  const max=Math.max(1,...Object.values(totals));
  v4el.teamLoadChart.innerHTML=Object.entries(totals).sort((a,b)=>b[1]-a[1]).map(([id,n])=>{
    const name=d.equipes.find(e=>String(e.ID_EQUIPE)===String(id))?.NOME||id;
    return '<div class="load-row"><span>'+escapeHtml(name)+'</span><div><i style="width:'+(n/max*100)+'%"></i></div><strong>'+formatNumber(n)+' pessoa-dia</strong></div>';
  }).join('') || '<div class="empty-mini">Sem carga programada.</div>';
}

function renderGanttV4(d){
  const acts=(d.atividades||[]).filter(a=>a.DATA_INICIO_FORECAST&&a.DATA_FIM_FORECAST);
  if(!acts.length){v4el.ganttChart.innerHTML='<div class="empty-mini">Sem datas previstas.</div>';return;}
  const min=Math.min(...acts.map(a=>new Date(String(a.DATA_INICIO_FORECAST).slice(0,10)).getTime()));
  const max=Math.max(...acts.map(a=>new Date(String(a.DATA_FIM_FORECAST).slice(0,10)).getTime()));
  const span=Math.max(86400000,max-min+86400000);
  v4el.ganttChart.innerHTML=acts.map(a=>{
    const s=new Date(String(a.DATA_INICIO_FORECAST).slice(0,10)).getTime();
    const e=new Date(String(a.DATA_FIM_FORECAST).slice(0,10)).getTime();
    const left=(s-min)/span*100,width=Math.max(1,(e-s+86400000)/span*100);
    return '<div class="gantt-row"><span>'+escapeHtml(a.CODIGO+' · '+a.NOME)+'</span><div class="gantt-track"><i style="left:'+left+'%;width:'+width+'%"></i></div><small>'+formatDate(a.DATA_INICIO_FORECAST)+' → '+formatDate(a.DATA_FIM_FORECAST)+'</small></div>';
  }).join('');
}

function bindCadastrosV4(){
  v4el.addTypeBtn?.addEventListener('click',async()=>{
    const nome=v4el.newTypeName.value.trim();if(!nome)return;
    try{await api('tipos.save',{nome});v4el.newTypeName.value='';await loadCadastrosV4();toast('Tipo adicionado.');}catch(err){toast(err.message,true);}
  });
  v4el.addTeamBtn?.addEventListener('click',async()=>{
    const nome=v4el.newTeamName.value.trim();if(!nome)return;
    try{await api('equipes.save',{nome});v4el.newTeamName.value='';await loadCadastrosV4();toast('Equipe adicionada.');}catch(err){toast(err.message,true);}
  });
}

async function openCadastrosV4(){
  hideAllMainViewsV4();show(v4el.cadastrosView);activateNavV4('navCadastros');
  await loadCadastrosV4();
}

async function loadCadastrosV4(){
  try{
    v4state.cadastros=await api('cadastros.get');
    v4el.typesList.innerHTML=(v4state.cadastros.tiposAtividade||[]).map(x=>'<span>'+escapeHtml(x.NOME)+'</span>').join('');
    v4el.teamsList.innerHTML=(v4state.cadastros.equipes||[]).map(x=>'<span>'+escapeHtml(x.NOME)+'</span>').join('');
    state.tipos=v4state.cadastros.tiposAtividade||state.tipos;
    state.equipes=v4state.cadastros.equipes||state.equipes;
  }catch(err){toast(err.message,true);}
}

function bindTeamDrawerV4(){
  v4el.closeTeamDrawerBtn?.addEventListener('click',closeTeamDrawerV4);
  v4el.teamBackdrop?.addEventListener('click',closeTeamDrawerV4);
  v4el.teamCheckboxList?.addEventListener('change',e=>{
    const input=e.target.closest('input[data-team-id]');if(!input)return;
    const row=findRow(v4state.teamEditingKey);if(!row)return;
    row.teamIds=Array.isArray(row.teamIds)?row.teamIds:[];
    const id=String(input.dataset.teamId);
    if(input.checked && !row.teamIds.includes(id)) row.teamIds.push(id);
    if(!input.checked) row.teamIds=row.teamIds.filter(x=>String(x)!==id);
    markDirty();renderGrid();
  });
}

function openTeamDrawerV4(key){
  const row=findRow(key);if(!row||row.kind!=='ATIVIDADE')return;
  v4state.teamEditingKey=key;
  v4el.teamDrawerTitle.textContent=(getCodeForKey(key)||'')+' · '+row.name;
  v4el.teamCheckboxList.innerHTML=(state.equipes||[]).map(team=>{
    const checked=(row.teamIds||[]).map(String).includes(String(team.ID_EQUIPE));
    return '<label class="team-check"><input type="checkbox" data-team-id="'+escapeAttr(team.ID_EQUIPE)+'" '+(checked?'checked':'')+'><span><strong>'+escapeHtml(team.NOME)+'</strong><small>'+escapeHtml(team.CODIGO||'')+'</small></span></label>';
  }).join('')||'<div class="empty-mini">Cadastre equipes em Cadastros.</div>';
  show(v4el.teamBackdrop);show(v4el.teamDrawer);
}

function closeTeamDrawerV4(){hide(v4el.teamBackdrop);hide(v4el.teamDrawer);v4state.teamEditingKey=null;}
