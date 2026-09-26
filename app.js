const CONFIG = Object.freeze({
  API_URL: 'https://script.google.com/macros/s/AKfycbw6cRAPlwVzNOURoLNsTJ47xyezz0LStCuZyNpW2wT97f9pj3RADUn1L1MdqTq9Tm_b/exec',
  VERSION: '0.4.0',
  DRAFT_PREFIX: 'gestao_obras_draft_v3_'
});

const HELP = {
  tela: {
    title: 'Como montar o planejamento',
    html: `
      <p>Esta tela funciona como uma planilha de planejamento. Você pode criar, editar, excluir e reorganizar linhas sem esperar o banco a cada alteração.</p>
      <ol>
        <li><strong>Crie as etapas da obra</strong>, como Fundações, Estrutura e Acabamentos.</li>
        <li><strong>Inclua as atividades</strong> dentro de cada etapa.</li>
        <li>Informe duração, peso e restrições quando necessário.</li>
        <li>Defina as predecessoras das atividades.</li>
        <li>Quando estiver satisfeito, clique em <strong>Efetivar planejamento</strong>.</li>
      </ol>
      <p>Enquanto o planejamento estiver em rascunho, ele fica salvo neste navegador. Somente o botão Efetivar grava tudo no banco e recalcula as datas.</p>
    `
  },
  etapa: {
    title: 'O que é uma Etapa?',
    html: '<p>Etapa é um grupo usado para organizar o cronograma, por exemplo: <strong>Fundações</strong>, <strong>Estrutura</strong> ou <strong>Instalações</strong>.</p><p>O nome técnico é EAP/WBS, mas no sistema usamos “Etapa da Obra”. Uma etapa pode conter atividades e também subetapas.</p>'
  },
  atividade: {
    title: 'O que é uma Atividade?',
    html: '<p>É o serviço que realmente acontece na obra. Atividades possuem duração, peso, dependências, avanço e datas.</p><p>Exemplos: Escavação, Concretagem, Alvenaria, Instalação elétrica.</p>'
  },
  linha_tipo: {
    title: 'Etapa ou Atividade?',
    html: '<p><strong>Etapa</strong> serve para organizar. <strong>Atividade</strong> é o serviço executável.</p><p>Somente atividades recebem duração, peso e dependências.</p>'
  },
  tipo_atividade: {
    title: 'De onde vem a Classificação?',
    html: '<p>As opções vêm do cadastro mestre <strong>TIPOS_ATIVIDADE</strong> do banco.</p><p>Hoje existem Preliminar, Civil, Estrutura, Elétrica, Hidráulica e Acabamento. Elas servem para classificar, filtrar e futuramente analisar o cronograma. Não alteram a duração automaticamente.</p><p>Depois teremos uma tela de Cadastros para administrar essas opções sem abrir o Sheets.</p>'
  },
  duracao: {
    title: 'Duração',
    html: '<p>Quantidade planejada de <strong>dias úteis</strong> para executar a atividade. O calendário da obra define quais dias são úteis.</p>'
  },
  peso: {
    title: 'Peso relativo',
    html: '<p>Indica quanto uma atividade representa no avanço físico da obra em relação às outras.</p><p><strong>Não é porcentagem e não precisa somar 100.</strong> Você pode usar 5, 20, 100 etc. O sistema normaliza automaticamente.</p><p>Exemplo: pesos 10, 30 e 60 significam participações relativas de 10%, 30% e 60%. Se depois entrar uma atividade com peso 20, nenhum peso anterior precisa ser alterado.</p>'
  },
  restricao: {
    title: 'Não iniciar antes de',
    html: '<p>É uma restrição mínima. O sistema pode jogar a atividade para depois desta data por causa das dependências, mas nunca para antes.</p>'
  },
  dependencia: {
    title: 'Predecessora',
    html: '<p>É a atividade que precisa liberar outra atividade.</p><p>Exemplo: “Fundação” pode ser predecessora de “Estrutura”. Uma atividade pode ter várias predecessoras; use o botão de relações na própria linha para gerenciá-las.</p>'
  },
  liberacao: {
    title: 'Liberação (%)',
    html: '<p>Define com quanto de avanço da predecessora a sucessora pode começar.</p><p>Ex.: <strong>70%</strong> significa que a sucessora pode iniciar quando a predecessora atingir 70%.</p>'
  },
  lag: {
    title: 'Lag',
    html: '<p>É uma espera adicional em dias úteis depois da liberação.</p><p>Ex.: 70% + lag 2 significa: atingiu 70%, espere mais 2 dias úteis e então libere a sucessora.</p>'
  },
  previsto: {
    title: 'Início/Fim previsto',
    html: '<p>É a previsão atual calculada pelo sistema considerando dependências, duração, calendário e situação da obra.</p><p>Ela pode ser diferente do planejamento original. Internamente isso é chamado de forecast.</p>'
  },
  critica: {
    title: 'Atividade crítica',
    html: '<p>Atividade crítica é aquela sem folga no cronograma atual. Se ela atrasar, pode empurrar a data final da obra.</p>'
  }
};

const state = {
  obras: [],
  filtroObras: '',
  obraAtual: null,
  planejamento: null,
  draftRows: [],
  selectedKey: null,
  filterRows: '',
  dirty: false,
  tipos: [],
  frentes: [],
  equipes: [],
  atividadeEquipes: [],
  collapsed: new Set(),
  dependencyEditingKey: null
};

const el = {};
document.addEventListener('DOMContentLoaded', boot);

function cacheElements() {
  [
    'portfolioView','planningView','navObras','navPlanejamento','apiStatus',
    'activeCount','planningCount','loadingState','emptyState','errorState','errorMessage',
    'projectGrid','searchInput','newProjectBtn','emptyCreateBtn','retryBtn',
    'backToPortfolioBtn','planningProjectName','planningProjectMeta','screenHelpBtn',
    'effectivateTopBtn','activityCount','weightTotal','forecastEnd','criticalCount',
    'draftStatus','activitySearchInput','planningLoading','gridWrap','gridEmpty','plannerBody',
    'addStageBtn','addActivityBtn','addChildBtn','addSiblingBtn','duplicateBtn','deleteRowBtn',
    'moveUpBtn','moveDownBtn','expandAllBtn','collapseAllBtn','effectivateBtn',
    'projectModal','closeProjectModalBtn','cancelProjectBtn','projectForm','projectFormError','saveProjectBtn',
    'helpBackdrop','helpDrawer','helpTitle','helpContent','closeHelpBtn',
    'dependencyBackdrop','dependencyDrawer','dependencyDrawerTitle','closeDependencyDrawerBtn',
    'dependencyEditor','addDependencyRelationBtn',
    'helpPopover','helpPopoverClose','helpPopoverTitle','helpPopoverBody','toast'
  ].forEach(id => el[id] = document.querySelector('#' + id));
}

async function boot() {
  cacheElements();
  bindEvents();
  await checkHealth();
  await loadObras();
}

function bindEvents() {
  el.newProjectBtn.addEventListener('click', openProjectModal);
  el.emptyCreateBtn.addEventListener('click', openProjectModal);
  el.retryBtn.addEventListener('click', loadObras);
  el.searchInput.addEventListener('input', e => {
    state.filtroObras = e.target.value.trim().toLowerCase();
    renderObras();
  });

  el.navObras.addEventListener('click', showPortfolio);
  el.navPlanejamento.addEventListener('click', () => state.obraAtual && showPlanningView());
  el.backToPortfolioBtn.addEventListener('click', showPortfolio);

  el.activitySearchInput.addEventListener('input', e => {
    state.filterRows = e.target.value.trim().toLowerCase();
    renderGrid();
  });

  el.addStageBtn.addEventListener('click', addStage);
  el.addActivityBtn.addEventListener('click', addActivity);
  el.addChildBtn.addEventListener('click', addChild);
  el.addSiblingBtn.addEventListener('click', addSibling);
  el.duplicateBtn.addEventListener('click', duplicateSelected);
  el.deleteRowBtn.addEventListener('click', deleteSelected);
  el.moveUpBtn.addEventListener('click', () => moveSelected(-1));
  el.moveDownBtn.addEventListener('click', () => moveSelected(1));
  el.expandAllBtn.addEventListener('click', () => { state.collapsed.clear(); renderGrid(); });
  el.collapseAllBtn.addEventListener('click', collapseAll);

  el.effectivateBtn.addEventListener('click', effectivatePlanning);
  el.effectivateTopBtn.addEventListener('click', effectivatePlanning);

  el.plannerBody.addEventListener('click', handleGridClick);
  el.plannerBody.addEventListener('input', handleGridInput);
  el.plannerBody.addEventListener('change', handleGridInput);

  bindHelpButtons();
  el.screenHelpBtn.addEventListener('click', e => openHelpPopover('tela', e.currentTarget));
  el.helpPopoverClose.addEventListener('click', closeHelpPopover);

  document.addEventListener('pointerdown', e => {
    if (el.helpPopover.classList.contains('hidden')) return;
    if (e.target.closest('#helpPopover') || e.target.closest('[data-help]') || e.target.closest('#screenHelpBtn')) return;
    closeHelpPopover();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeHelpPopover();
  });

  el.closeDependencyDrawerBtn.addEventListener('click', closeDependencyDrawer);
  el.dependencyBackdrop.addEventListener('click', closeDependencyDrawer);
  el.addDependencyRelationBtn.addEventListener('click', addDependencyRelation);
  el.dependencyEditor.addEventListener('change', handleDependencyEditor);
  el.dependencyEditor.addEventListener('input', handleDependencyEditor);
  el.dependencyEditor.addEventListener('click', handleDependencyEditorClick);

  el.closeProjectModalBtn.addEventListener('click', () => closeModal(el.projectModal));
  el.cancelProjectBtn.addEventListener('click', () => closeModal(el.projectModal));
  el.projectModal.addEventListener('click', e => e.target === el.projectModal && closeModal(el.projectModal));
  el.projectForm.addEventListener('submit', createProject);

  window.addEventListener('beforeunload', e => {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
}

async function checkHealth() {
  try {
    const r = await fetch(CONFIG.API_URL + '?action=health', {cache:'no-store'});
    const p = await r.json();
    if (!p.ok) throw new Error();
    setApiStatus(true, 'API online');
  } catch (_) {
    setApiStatus(false, 'API indisponível');
  }
}

async function api(action, data = {}) {
  const response = await fetch(CONFIG.API_URL, {
    method:'POST',
    redirect:'follow',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({action, ...data})
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); }
  catch (_) { throw new Error('O backend não retornou uma resposta válida.'); }
  if (!payload.ok) throw new Error(payload?.error?.message || payload?.error?.code || 'Erro no backend.');
  return payload.data;
}

async function loadObras() {
  setPortfolioLoading(true);
  try {
    const data = await api('obras.list');
    state.obras = Array.isArray(data) ? data : [];
    el.activeCount.textContent = state.obras.filter(o => isTrue(o.ATIVA)).length;
    el.planningCount.textContent = state.obras.filter(o => o.STATUS === 'PLANEJAMENTO').length;
    renderObras();
  } catch (err) {
    el.errorMessage.textContent = err.message;
    show(el.errorState);
  } finally {
    setPortfolioLoading(false);
  }
}

function renderObras() {
  const list = state.obras.filter(o => {
    if (!state.filtroObras) return true;
    return [o.CODIGO,o.NOME,o.CLIENTE,o.STATUS].join(' ').toLowerCase().includes(state.filtroObras);
  });
  el.projectGrid.innerHTML = '';

  if (!state.obras.length) {
    show(el.emptyState); hide(el.projectGrid); return;
  }

  hide(el.emptyState); show(el.projectGrid);
  list.forEach(obra => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="project-card-top">
        <div>
          <span class="project-code">${escapeHtml(obra.CODIGO || '')}</span>
          <h3>${escapeHtml(obra.NOME || '')}</h3>
          <div class="project-client">${escapeHtml(obra.CLIENTE || 'Cliente não informado')}</div>
        </div>
        <span class="badge">${formatProjectStatus(obra.STATUS)}</span>
      </div>
      <div class="project-dates">
        <div><span>Início contratual</span><strong>${formatDate(obra.DATA_INICIO_CONTRATUAL)}</strong></div>
        <div><span>Fim contratual</span><strong>${formatDate(obra.DATA_FIM_CONTRATUAL)}</strong></div>
      </div>
      <button class="primary-button project-action" type="button">Abrir planejamento →</button>
    `;
    card.querySelector('button').addEventListener('click', () => openPlanning(obra.ID_OBRA));
    el.projectGrid.appendChild(card);
  });
}

async function openPlanning(idObra) {
  const obra = state.obras.find(o => String(o.ID_OBRA) === String(idObra));
  if (!obra) return;
  state.obraAtual = obra;
  state.filterRows = '';
  el.activitySearchInput.value = '';
  showPlanningView();
  await loadPlanning();
}

function showPlanningView() {
  hide(el.portfolioView); show(el.planningView);
  el.navObras.classList.remove('active');
  el.navPlanejamento.classList.add('active');
  el.navPlanejamento.disabled = false;
  el.planningProjectName.textContent = state.obraAtual?.NOME || 'Obra';
  el.planningProjectMeta.textContent = [
    state.obraAtual?.CODIGO,
    state.obraAtual?.CLIENTE,
    state.obraAtual?.DATA_INICIO_CONTRATUAL ? 'Início ' + formatDate(state.obraAtual.DATA_INICIO_CONTRATUAL) : ''
  ].filter(Boolean).join(' · ');
  window.scrollTo({top:0,behavior:'smooth'});
}

function showPortfolio() {
  show(el.portfolioView); hide(el.planningView);
  el.navObras.classList.add('active');
  el.navPlanejamento.classList.remove('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

async function loadPlanning() {
  show(el.planningLoading);
  try {
    const p = await api('planejamento.get', {id_obra:state.obraAtual.ID_OBRA});
    state.planejamento = p;
    state.obraAtual = p.obra || state.obraAtual;
    state.tipos = p.cadastros?.tiposAtividade || [];
    state.frentes = p.frentes || [];
    state.equipes = p.cadastros?.equipes || [];
    state.atividadeEquipes = p.atividadeEquipes || [];
    if (window.renderFrontOptionsV4) window.renderFrontOptionsV4();

    const saved = loadLocalDraft();
    if (saved?.rows?.length || saved?.dirty) {
      state.draftRows = saved.rows || [];
      state.dirty = true;
      toast('Rascunho não efetivado recuperado deste navegador.');
    } else {
      state.draftRows = effectiveToDraft(p);
      state.dirty = false;
    }

    state.selectedKey = state.draftRows[0]?.key || null;
    state.collapsed.clear();
    renderPlanning();
  } catch (err) {
    toast(err.message, true);
  } finally {
    hide(el.planningLoading);
  }
}

function effectiveToDraft(p) {
  const rows = [];
  const wbsById = Object.fromEntries((p.wbs || []).map(w => [String(w.ID_WBS), w]));
  const activityKeyById = {};
  const frontById = Object.fromEntries((p.frentes || []).map(f => [String(f.ID_FRENTE), f]));
  const teamsByActivity = {};
  (p.atividadeEquipes || []).forEach(link => {
    const id = String(link.ID_ATIVIDADE);
    if (!teamsByActivity[id]) teamsByActivity[id] = [];
    teamsByActivity[id].push(String(link.ID_EQUIPE));
  });

  (p.wbs || []).forEach((w, index) => {
    rows.push({
      key:'wbs:' + w.ID_WBS,
      sourceId:w.ID_WBS,
      kind:'ETAPA',
      parentKey:w.ID_WBS_PAI ? 'wbs:' + w.ID_WBS_PAI : '',
      name:w.NOME || '',
      order:Number(w.ORDEM || index + 1),
      code:w.CODIGO_WBS || '',
      collapsed:false
    });
  });

  (p.atividades || []).forEach((a, index) => {
    const key='act:' + a.ID_ATIVIDADE;
    activityKeyById[String(a.ID_ATIVIDADE)] = key;
    rows.push({
      key,
      sourceId:a.ID_ATIVIDADE,
      kind:'ATIVIDADE',
      parentKey:a.ID_WBS ? 'wbs:' + a.ID_WBS : '',
      name:a.NOME || '',
      activityTypeId:a.ID_TIPO_ATIVIDADE || '',
      frontName:frontById[String(a.ID_FRENTE || '')]?.NOME || '',
      teamIds:teamsByActivity[String(a.ID_ATIVIDADE)] || [],
      companyId:a.ID_EMPRESA || '',
      responsibleId:a.ID_RESPONSAVEL || '',
      duration:Number(a.DURACAO_PLANEJADA_DIAS || 1),
      weight:Number(a.PESO_RELATIVO !== '' && a.PESO_RELATIVO != null ? a.PESO_RELATIVO : (a.PESO_PERCENTUAL || 0)),
      restriction:dateInputValue(a.RESTRICAO_INICIO_MINIMO),
      order:Number(a.ORDEM || index + 1),
      code:a.CODIGO || '',
      dependencies:[],
      forecastStart:a.DATA_INICIO_FORECAST || '',
      forecastEnd:a.DATA_FIM_FORECAST || '',
      status:a.STATUS || '',
      critical:isTrue(a.CAMINHO_CRITICO),
      progress:Number(a.PERCENTUAL_ATUAL || 0)
    });
  });

  (p.dependencias || []).forEach(d => {
    const childKey=activityKeyById[String(d.ID_ATIVIDADE_FILHA)];
    const predKey=activityKeyById[String(d.ID_ATIVIDADE_PAI)];
    const row=rows.find(r=>r.key===childKey);
    if (!row || !predKey) return;
    if (!Array.isArray(row.dependencies)) row.dependencies=[];
    row.dependencies.push({
      predecessorKey:predKey,
      releasePercent:Number(d.PERCENTUAL_LIBERACAO ?? 100),
      lagDays:Number(d.LAG_DIAS || 0)
    });
  });

  return sortDraftByExistingCode(rows);
}

function sortDraftByExistingCode(rows) {
  return [...rows].sort((a,b) => naturalCodeCompare(a.code || '', b.code || ''));
}

function getOrderedRows() {
  const rows=state.draftRows;
  const children={};
  rows.forEach((row,index)=>{
    const parent=row.parentKey || '';
    if(!children[parent]) children[parent]=[];
    children[parent].push({...row,_idx:index});
  });
  Object.values(children).forEach(list=>list.sort((a,b)=>a._idx-b._idx));

  const ordered=[];
  const seen=new Set();
  function walk(parent,depth,prefix,hidden){
    const list=children[parent] || [];
    list.forEach((row,i)=>{
      const code=prefix ? prefix+'.'+(i+1) : String(i+1);
      const stageCollapsed=state.collapsed.has(row.key);
      ordered.push({...row, code, level:depth+1, hidden});
      seen.add(row.key);
      walk(row.key,depth+1,code,hidden || stageCollapsed);
    });
  }
  walk('',0,'',false);
  rows.filter(r=>!seen.has(r.key)).forEach(r=>ordered.push({...r,code:'?',level:1,hidden:false}));
  return ordered;
}

function renderPlanning() {
  const ordered=getOrderedRows();
  const activities=ordered.filter(r=>r.kind==='ATIVIDADE');
  const weight=activities.reduce((s,r)=>s+Number(r.weight||0),0);
  const effectiveActivities=state.planejamento?.atividades || [];
  const forecastEnds=effectiveActivities.map(a=>a.DATA_FIM_FORECAST).filter(Boolean).sort();
  el.activityCount.textContent=activities.length;
  el.weightTotal.textContent=formatNumber(weight);
  el.forecastEnd.textContent=forecastEnds.length ? formatDate(forecastEnds.at(-1)) : '—';
  el.criticalCount.textContent=effectiveActivities.filter(a=>isTrue(a.CAMINHO_CRITICO)).length;
  updateDraftStatus();
  renderGrid();
}

function renderGrid() {
  const ordered=getOrderedRows();
  const filter=state.filterRows;
  el.plannerBody.innerHTML='';

  const visible=ordered.filter(row=>{
    if(row.hidden) return false;
    if(!filter) return true;
    return [row.code,row.name,row.kind,getTypeName(row.activityTypeId)].join(' ').toLowerCase().includes(filter);
  });

  if(!visible.length){
    show(el.gridEmpty);
    return;
  }
  hide(el.gridEmpty);

  visible.forEach(row=>{
    const tr=document.createElement('tr');
    tr.dataset.key=row.key;
    tr.className=[
      row.kind==='ETAPA'?'grid-stage-row':'grid-activity-row',
      state.selectedKey===row.key?'selected':''
    ].join(' ');

    const deps=Array.isArray(row.dependencies)?row.dependencies:[];
    const firstDep=deps[0] || null;
    const activityOptions=getActivityOptions(row.key, firstDep?.predecessorKey || '');
    const typeOptions=getTypeOptions(row.activityTypeId);
    const stale=state.dirty?'stale-date':'';

    tr.innerHTML=`
      <td class="sel-col"><input type="radio" name="selected-row" data-select-row ${state.selectedKey===row.key?'checked':''}></td>
      <td class="code-cell">
        ${row.kind==='ETAPA'?'<button class="collapse-btn" data-collapse type="button">'+(state.collapsed.has(row.key)?'▸':'▾')+'</button>':''}
        <strong>${escapeHtml(row.code)}</strong>
      </td>
      <td class="level-cell">${row.level}</td>
      <td><span class="kind-pill ${row.kind==='ETAPA'?'stage':'activity'}">${row.kind==='ETAPA'?'Etapa':'Atividade'}</span></td>
      <td class="name-cell"><input data-field="name" value="${escapeAttr(row.name||'')}" placeholder="${row.kind==='ETAPA'?'Nome da etapa':'Nome da atividade'}" style="padding-left:${Math.max(0,row.level-1)*14}px"></td>
      <td>${row.kind==='ATIVIDADE'?'<input data-field="frontName" list="frontOptions" value="'+escapeAttr(row.frontName||'')+'" placeholder="Frente / área">':'<span class="cell-na">—</span>'}</td>
      <td>${row.kind==='ATIVIDADE'?'<button class="team-cell-button" data-teams type="button">'+escapeHtml((row.teamIds||[]).length ? getTeamNamesV4(row.teamIds) : 'Selecionar')+'</button>':'<span class="cell-na">—</span>'}</td>
      <td>${row.kind==='ATIVIDADE'?'<select data-field="activityTypeId">'+typeOptions+'</select>':'<span class="cell-na">—</span>'}</td>
      <td>${row.kind==='ATIVIDADE'?'<input class="grid-number" data-field="duration" type="number" min="1" step="1" value="'+Number(row.duration||1)+'">':'<span class="cell-na">—</span>'}</td>
      <td>${row.kind==='ATIVIDADE'?'<input class="grid-number" data-field="weight" type="number" min="0" step="0.01" value="'+Number(row.weight||0)+'">':'<span class="cell-na">—</span>'}</td>
      <td>${row.kind==='ATIVIDADE'?'<input data-field="restriction" type="date" value="'+escapeAttr(row.restriction||'')+'">':'<span class="cell-na">—</span>'}</td>
      <td>${row.kind==='ATIVIDADE'?'<div class="dependency-cell"><select data-field="predecessor">'+activityOptions+'</select><button class="relation-btn" data-relations type="button">'+(deps.length>1?'+'+(deps.length-1):'⋯')+'</button></div>':'<span class="cell-na">—</span>'}</td>
      <td>${row.kind==='ATIVIDADE'?'<input class="grid-number" data-field="releasePercent" type="number" min="0" max="100" step="1" value="'+Number(firstDep?.releasePercent ?? 100)+'" '+(!firstDep?'disabled':'')+'>':'<span class="cell-na">—</span>'}</td>
      <td>${row.kind==='ATIVIDADE'?'<input class="grid-number" data-field="lagDays" type="number" step="1" value="'+Number(firstDep?.lagDays ?? 0)+'" '+(!firstDep?'disabled':'')+'>':'<span class="cell-na">—</span>'}</td>
      <td class="${stale}">${row.kind==='ATIVIDADE'?formatDate(row.forecastStart):'—'}</td>
      <td class="${stale}">${row.kind==='ATIVIDADE'?formatDate(row.forecastEnd):'—'}</td>
      <td>${row.kind==='ATIVIDADE'?'<span class="status-pill '+statusClass(row.status)+'">'+formatActivityStatus(row.status)+(row.critical?' · crítica':'')+'</span>':'—'}</td>
    `;

    el.plannerBody.appendChild(tr);
  });
}

function getTeamNamesV4(ids){
  const names=(ids||[]).map(id=>state.equipes.find(e=>String(e.ID_EQUIPE)===String(id))?.NOME).filter(Boolean);
  return names.length<=2 ? names.join(' / ') : names.slice(0,2).join(' / ')+' +'+(names.length-2);
}

function getTypeOptions(selected){
  return '<option value="">Sem tipo</option>'+state.tipos.map(t=>
    `<option value="${escapeAttr(t.ID_TIPO_ATIVIDADE)}" ${String(selected)===String(t.ID_TIPO_ATIVIDADE)?'selected':''}>${escapeHtml(t.NOME)}</option>`
  ).join('');
}

function getTypeName(id){
  return state.tipos.find(t=>String(t.ID_TIPO_ATIVIDADE)===String(id))?.NOME || '';
}

function getActivityOptions(currentKey, selected){
  const options=getOrderedRows().filter(r=>r.kind==='ATIVIDADE' && r.key!==currentKey);
  return '<option value="">Sem predecessora</option>'+options.map(r=>
    `<option value="${escapeAttr(r.key)}" ${String(selected)===String(r.key)?'selected':''}>${escapeHtml(r.code+' · '+r.name)}</option>`
  ).join('');
}

function handleGridClick(e){
  const tr=e.target.closest('tr[data-key]');
  if(!tr) return;
  const key=tr.dataset.key;

  if(e.target.closest('[data-collapse]')){
    toggleCollapse(key);
    return;
  }
  if(e.target.closest('[data-relations]')){
    state.selectedKey=key;
    openDependencyDrawer(key);
    renderGrid();
    return;
  }
  if(e.target.matches('[data-select-row]') || e.target.closest('td')){
    state.selectedKey=key;
    updateActionButtons();
    if(!e.target.matches('input,select,button')) renderGrid();
  }
}

function handleGridInput(e){
  const field=e.target.dataset.field;
  if(!field) return;
  const tr=e.target.closest('tr[data-key]');
  const row=findRow(tr?.dataset.key);
  if(!row) return;

  if(field==='name') row.name=e.target.value;
  else if(field==='activityTypeId') row.activityTypeId=e.target.value;
  else if(field==='frontName') row.frontName=e.target.value;
  else if(field==='duration') row.duration=Math.max(1,Number(e.target.value||1));
  else if(field==='weight') row.weight=Math.max(0,Number(e.target.value||0));
  else if(field==='restriction') row.restriction=e.target.value;
  else if(field==='predecessor'){
    row.dependencies=Array.isArray(row.dependencies)?row.dependencies:[];
    if(!e.target.value){
      row.dependencies.shift();
    }else if(row.dependencies[0]){
      row.dependencies[0].predecessorKey=e.target.value;
    }else{
      row.dependencies.unshift({predecessorKey:e.target.value,releasePercent:100,lagDays:0});
    }
    renderGrid();
  }
  else if(field==='releasePercent' && row.dependencies?.[0]) row.dependencies[0].releasePercent=Math.min(100,Math.max(0,Number(e.target.value||0)));
  else if(field==='lagDays' && row.dependencies?.[0]) row.dependencies[0].lagDays=Number(e.target.value||0);

  markDirty();
}

function addStage(){
  const selected=findRow(state.selectedKey);
  const parentKey=selected?.kind==='ETAPA' ? selected.key : '';
  const row=newRow('ETAPA',parentKey);
  insertAfterRelated(selected,row);
  state.selectedKey=row.key;
  markDirty(true);
  focusRowName(row.key);
}

function addActivity(){
  const selected=findRow(state.selectedKey);
  const parentKey=selected?.kind==='ETAPA' ? selected.key : (selected?.parentKey || '');
  const row=newRow('ATIVIDADE',parentKey);
  insertAfterRelated(selected,row);
  state.selectedKey=row.key;
  markDirty(true);
  focusRowName(row.key);
}

function addChild(){
  const selected=findRow(state.selectedKey);
  if(!selected || selected.kind!=='ETAPA'){
    toast('Selecione uma etapa para adicionar um filho.',true); return;
  }
  const row=newRow('ATIVIDADE',selected.key);
  const idx=state.draftRows.indexOf(selected);
  state.draftRows.splice(idx+1,0,row);
  state.collapsed.delete(selected.key);
  state.selectedKey=row.key;
  markDirty(true);
  focusRowName(row.key);
}

function addSibling(){
  const selected=findRow(state.selectedKey);
  if(!selected){ toast('Selecione uma linha primeiro.',true); return; }
  const row=newRow(selected.kind,selected.parentKey||'');
  const idx=state.draftRows.indexOf(selected);
  state.draftRows.splice(idx+1,0,row);
  state.selectedKey=row.key;
  markDirty(true);
  focusRowName(row.key);
}

function newRow(kind,parentKey=''){
  return {
    key:'tmp:'+crypto.randomUUID(),
    kind,
    parentKey,
    name:'',
    activityTypeId:'',
    frontName:'',
    teamIds:[],
    duration:1,
    weight:0,
    restriction:'',
    dependencies:[],
    forecastStart:'',
    forecastEnd:'',
    status:'',
    critical:false,
    progress:0
  };
}

function insertAfterRelated(selected,row){
  if(!selected){ state.draftRows.push(row); return; }
  const idx=state.draftRows.indexOf(selected);
  state.draftRows.splice(idx+1,0,row);
}

function duplicateSelected(){
  const selected=findRow(state.selectedKey);
  if(!selected){ toast('Selecione uma linha para duplicar.',true); return; }
  const copy=structuredClone(selected);
  copy.key='tmp:'+crypto.randomUUID();
  copy.sourceId='';
  copy.name=(copy.name||'')+' (cópia)';
  copy.dependencies=[];
  copy.forecastStart=''; copy.forecastEnd=''; copy.status=''; copy.critical=false;
  const idx=state.draftRows.indexOf(selected);
  state.draftRows.splice(idx+1,0,copy);
  state.selectedKey=copy.key;
  markDirty(true);
  focusRowName(copy.key);
}

function deleteSelected(){
  const selected=findRow(state.selectedKey);
  if(!selected){ toast('Selecione uma linha para excluir.',true); return; }

  const toDelete=new Set([selected.key]);
  let changed=true;
  while(changed){
    changed=false;
    state.draftRows.forEach(r=>{
      if(r.parentKey && toDelete.has(r.parentKey) && !toDelete.has(r.key)){
        toDelete.add(r.key); changed=true;
      }
    });
  }

  state.draftRows=state.draftRows.filter(r=>!toDelete.has(r.key));
  state.draftRows.forEach(r=>{
    if(Array.isArray(r.dependencies)) r.dependencies=r.dependencies.filter(d=>!toDelete.has(d.predecessorKey));
  });
  state.selectedKey=state.draftRows[0]?.key||null;
  markDirty(true);
}

function moveSelected(direction){
  const row=findRow(state.selectedKey);
  if(!row) return;
  const siblings=state.draftRows.filter(r=>(r.parentKey||'')===(row.parentKey||''));
  const pos=siblings.indexOf(row);
  const target=siblings[pos+direction];
  if(!target) return;
  const i=state.draftRows.indexOf(row);
  const j=state.draftRows.indexOf(target);
  [state.draftRows[i],state.draftRows[j]]=[state.draftRows[j],state.draftRows[i]];
  markDirty(true);
}

function toggleCollapse(key){
  if(state.collapsed.has(key)) state.collapsed.delete(key);
  else state.collapsed.add(key);
  renderGrid();
}

function collapseAll(){
  state.draftRows.filter(r=>r.kind==='ETAPA').forEach(r=>state.collapsed.add(r.key));
  renderGrid();
}

function markDirty(render=false){
  state.dirty=true;
  saveLocalDraft();
  updateDraftStatus();
  updateActionButtons();
  if(render) renderPlanning();
  else updateSummaryFromDraft();
}

function updateSummaryFromDraft(){
  const activities=state.draftRows.filter(r=>r.kind==='ATIVIDADE');
  el.activityCount.textContent=activities.length;
  el.weightTotal.textContent=formatNumber(activities.reduce((s,r)=>s+Number(r.weight||0),0));
}

function updateDraftStatus(){
  el.draftStatus.textContent=state.dirty?'Rascunho com alterações':'Planejamento efetivado';
  el.draftStatus.classList.toggle('dirty',state.dirty);
  el.draftStatus.classList.toggle('saved',!state.dirty);
  el.effectivateBtn.disabled=!state.dirty;
  el.effectivateTopBtn.disabled=!state.dirty;
  updateActionButtons();
}

function updateActionButtons(){
  const selected=findRow(state.selectedKey);
  el.addChildBtn.disabled=!selected || selected.kind!=='ETAPA';
  el.addSiblingBtn.disabled=!selected;
  el.duplicateBtn.disabled=!selected;
  el.deleteRowBtn.disabled=!selected;
  el.moveUpBtn.disabled=!selected;
  el.moveDownBtn.disabled=!selected;
}

function draftStorageKey(){
  return CONFIG.DRAFT_PREFIX+(state.obraAtual?.ID_OBRA||'');
}

function saveLocalDraft(){
  if(!state.obraAtual) return;
  localStorage.setItem(draftStorageKey(),JSON.stringify({
    dirty:state.dirty,
    savedAt:new Date().toISOString(),
    rows:state.draftRows
  }));
}

function loadLocalDraft(){
  try{
    const raw=localStorage.getItem(draftStorageKey());
    return raw?JSON.parse(raw):null;
  }catch(_){return null;}
}

function clearLocalDraft(){
  localStorage.removeItem(draftStorageKey());
}

async function effectivatePlanning(){
  if(!state.dirty){ toast('Não há alterações para efetivar.'); return; }
  const error=validateDraft();
  if(error){ toast(error,true); return; }

  const payloadRows=state.draftRows.map((r,index)=>({
    key:r.key,
    kind:r.kind,
    parentKey:r.parentKey||'',
    name:String(r.name||'').trim(),
    activityTypeId:r.activityTypeId||'',
    frontName:r.frontName||'',
    teamIds:Array.isArray(r.teamIds)?r.teamIds:[],
    companyId:r.companyId||'',
    responsibleId:r.responsibleId||'',
    duration:Number(r.duration||1),
    weight:Number(r.weight||0),
    restriction:r.restriction||'',
    order:index+1,
    dependencies:(r.kind==='ATIVIDADE'?(r.dependencies||[]):[]).map(d=>({
      predecessorKey:d.predecessorKey,
      releasePercent:Number(d.releasePercent??100),
      lagDays:Number(d.lagDays||0)
    }))
  }));

  setEffectivating(true);
  try{
    const p=await api('planejamento.efetivar',{id_obra:state.obraAtual.ID_OBRA,rows:payloadRows});
    state.planejamento=p;
    state.tipos=p.cadastros?.tiposAtividade||state.tipos;
    state.frentes=p.frentes||state.frentes;
    state.equipes=p.cadastros?.equipes||state.equipes;
    state.atividadeEquipes=p.atividadeEquipes||[];
    state.draftRows=effectiveToDraft(p);
    if (window.renderFrontOptionsV4) window.renderFrontOptionsV4();
    state.dirty=false;
    state.selectedKey=state.draftRows[0]?.key||null;
    clearLocalDraft();
    renderPlanning();
    toast('Planejamento efetivado e cronograma recalculado.');
  }catch(err){
    toast(err.message,true);
  }finally{
    setEffectivating(false);
  }
}

function validateDraft(){
  for(const r of state.draftRows){
    if(!String(r.name||'').trim()) return 'Preencha o nome de todas as etapas e atividades.';
    if(r.kind==='ATIVIDADE'){
      if(Number(r.duration||0)<1) return 'Toda atividade precisa ter duração de pelo menos 1 dia útil.';
      if(Number(r.weight||0)<0) return 'O peso não pode ser negativo.';
      for(const d of (r.dependencies||[])){
        if(!findRow(d.predecessorKey)) return 'Existe uma dependência apontando para uma atividade inexistente.';
        if(d.predecessorKey===r.key) return 'Uma atividade não pode depender dela mesma.';
      }
    }
  }
  return '';
}

function setEffectivating(busy){
  [el.effectivateBtn,el.effectivateTopBtn].forEach(btn=>{
    btn.disabled=busy || !state.dirty;
    btn.textContent=busy?'Efetivando...':'✓ Efetivar planejamento';
  });
}

function openDependencyDrawer(key){
  const row=findRow(key);
  if(!row || row.kind!=='ATIVIDADE') return;
  state.dependencyEditingKey=key;
  el.dependencyDrawerTitle.textContent=(getCodeForKey(key)||'')+' · '+row.name;
  renderDependencyEditor();
  show(el.dependencyBackdrop); show(el.dependencyDrawer);
}

function closeDependencyDrawer(){
  hide(el.dependencyBackdrop); hide(el.dependencyDrawer);
  state.dependencyEditingKey=null;
}

function renderDependencyEditor(){
  const row=findRow(state.dependencyEditingKey);
  if(!row) return;
  const deps=row.dependencies||[];
  el.dependencyEditor.innerHTML=deps.length?'':'<div class="dependency-empty">Nenhuma predecessora. Esta atividade está livre de dependências.</div>';
  deps.forEach((d,index)=>{
    const block=document.createElement('div');
    block.className='dependency-edit-row';
    block.dataset.index=index;
    block.innerHTML=`
      <label><span>Predecessora</span><select data-dep-field="predecessorKey">${getActivityOptions(row.key,d.predecessorKey)}</select></label>
      <label><span>Liberação (%)</span><input data-dep-field="releasePercent" type="number" min="0" max="100" value="${Number(d.releasePercent??100)}"></label>
      <label><span>Lag (dias úteis)</span><input data-dep-field="lagDays" type="number" value="${Number(d.lagDays||0)}"></label>
      <button class="danger-button small-danger" data-remove-dep type="button">Excluir</button>
    `;
    el.dependencyEditor.appendChild(block);
  });
}

function addDependencyRelation(){
  const row=findRow(state.dependencyEditingKey);
  if(!row) return;
  row.dependencies=row.dependencies||[];
  row.dependencies.push({predecessorKey:'',releasePercent:100,lagDays:0});
  markDirty();
  renderDependencyEditor();
}

function handleDependencyEditor(e){
  const field=e.target.dataset.depField;
  if(!field) return;
  const row=findRow(state.dependencyEditingKey);
  const block=e.target.closest('[data-index]');
  const dep=row?.dependencies?.[Number(block?.dataset.index)];
  if(!dep) return;
  if(field==='predecessorKey') dep.predecessorKey=e.target.value;
  if(field==='releasePercent') dep.releasePercent=Math.min(100,Math.max(0,Number(e.target.value||0)));
  if(field==='lagDays') dep.lagDays=Number(e.target.value||0);
  markDirty();
  renderGrid();
}

function handleDependencyEditorClick(e){
  const btn=e.target.closest('[data-remove-dep]');
  if(!btn) return;
  const row=findRow(state.dependencyEditingKey);
  const block=btn.closest('[data-index]');
  if(!row||!block) return;
  row.dependencies.splice(Number(block.dataset.index),1);
  markDirty();
  renderDependencyEditor();
  renderGrid();
}

function bindHelpButtons(){
  document.querySelectorAll('[data-help]').forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openHelpPopover(button.dataset.help, button);
    });

    // Fallback nativo: se o JS do popover falhar, ainda há explicação ao passar o mouse.
    const h=HELP[button.dataset.help]||HELP.tela;
    if(!button.title) button.title=stripHtml(h.html);
  });
}

function openHelpPopover(topic, anchor){
  const h=HELP[topic]||HELP.tela;
  el.helpPopoverTitle.textContent=h.title;
  el.helpPopoverBody.innerHTML=h.html;
  show(el.helpPopover);

  const rect=anchor.getBoundingClientRect();
  const pop=el.helpPopover;
  const width=Math.min(360, window.innerWidth - 24);
  pop.style.width=width+'px';

  requestAnimationFrame(()=>{
    const popRect=pop.getBoundingClientRect();
    let left=rect.left + (rect.width/2) - (popRect.width/2);
    left=Math.max(12,Math.min(left,window.innerWidth-popRect.width-12));

    let top=rect.bottom+10;
    if(top+popRect.height>window.innerHeight-12){
      top=Math.max(12,rect.top-popRect.height-10);
    }

    pop.style.left=left+'px';
    pop.style.top=top+'px';
  });
}

function closeHelpPopover(){
  hide(el.helpPopover);
}

function stripHtml(html){
  const div=document.createElement('div');
  div.innerHTML=html;
  return (div.textContent||'').replace(/\s+/g,' ').trim();
}

async function createProject(e){
  e.preventDefault();
  const data=Object.fromEntries(new FormData(el.projectForm).entries());
  if(!String(data.nome||'').trim()){ showInlineError(el.projectFormError,'Informe o nome da obra.'); return; }
  if(data.data_inicio_contratual && data.data_fim_contratual && data.data_fim_contratual<data.data_inicio_contratual){
    showInlineError(el.projectFormError,'A data final não pode ser anterior à inicial.'); return;
  }
  setBusy(el.saveProjectBtn,true,'Salvando...');
  try{
    await api('obras.create',data);
    closeModal(el.projectModal);
    toast('Obra cadastrada.');
    await loadObras();
  }catch(err){
    showInlineError(el.projectFormError,err.message);
  }finally{
    setBusy(el.saveProjectBtn,false,'Salvar obra');
  }
}

function openProjectModal(){
  el.projectForm.reset();
  hide(el.projectFormError);
  openModal(el.projectModal);
  setTimeout(()=>el.projectForm.elements.nome.focus(),30);
}

function findRow(key){ return state.draftRows.find(r=>r.key===key)||null; }

function getCodeForKey(key){
  return getOrderedRows().find(r=>r.key===key)?.code||'';
}

function focusRowName(key){
  requestAnimationFrame(()=>{
    const input=el.plannerBody.querySelector(`tr[data-key="${CSS.escape(key)}"] input[data-field="name"]`);
    input?.focus();
  });
}

function naturalCodeCompare(a,b){
  const aa=String(a).split('.').map(Number);
  const bb=String(b).split('.').map(Number);
  const len=Math.max(aa.length,bb.length);
  for(let i=0;i<len;i++){
    const av=aa[i]??-1,bv=bb[i]??-1;
    if(av!==bv) return av-bv;
  }
  return 0;
}

function setPortfolioLoading(showIt){
  if(showIt){ show(el.loadingState); hide(el.emptyState); hide(el.errorState); hide(el.projectGrid); }
  else hide(el.loadingState);
}

function openModal(modal){ show(modal); modal.setAttribute('aria-hidden','false'); }
function closeModal(modal){ hide(modal); modal.setAttribute('aria-hidden','true'); }
function show(node){ node?.classList.remove('hidden'); }
function hide(node){ node?.classList.add('hidden'); }
function setBusy(btn,busy,text){ btn.disabled=busy; btn.textContent=text; }
function showInlineError(node,msg){ node.textContent=msg; show(node); }

function setApiStatus(online,text){
  el.apiStatus.classList.toggle('online',online);
  el.apiStatus.classList.toggle('offline',!online);
  el.apiStatus.querySelector('span:last-child').textContent=text;
}

function toast(message,error=false){
  el.toast.textContent=message;
  el.toast.classList.toggle('error-toast',error);
  show(el.toast);
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>hide(el.toast),3200);
}

function formatProjectStatus(v){
  return ({PLANEJAMENTO:'Planejamento',EM_EXECUCAO:'Em execução',CONCLUIDA:'Concluída',SUSPENSA:'Suspensa',CANCELADA:'Cancelada'})[v]||v||'Planejamento';
}

function formatActivityStatus(v){
  return ({NAO_INICIADA:'Não iniciada',BLOQUEADA:'Bloqueada',EM_EXECUCAO:'Em execução',CONCLUIDA:'Concluída',ATRASADA:'Atrasada'})[v]|| (state.dirty?'Rascunho':'Não iniciada');
}

function statusClass(v){
  return ({NAO_INICIADA:'neutral',BLOQUEADA:'blocked',EM_EXECUCAO:'execution',CONCLUIDA:'done',ATRASADA:'late'})[v]||'neutral';
}

function formatDate(v){
  if(!v) return '—';
  const raw=String(v).slice(0,10);
  const [y,m,d]=raw.split('-');
  if(!y||!m||!d) return '—';
  return `${d}/${m}/${y}`;
}

function dateInputValue(v){ return v?String(v).slice(0,10):''; }
function formatNumber(v){ return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(Number(v||0)); }
function isTrue(v){ return typeof v==='boolean'?v:['true','1','sim','yes'].includes(String(v||'').toLowerCase()); }
function escapeHtml(v){ return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function escapeAttr(v){ return escapeHtml(v); }
