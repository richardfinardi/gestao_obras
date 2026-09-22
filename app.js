const CONFIG = Object.freeze({
  API_URL: 'https://script.google.com/macros/s/AKfycbw6cRAPlwVzNOURoLNsTJ47xyezz0LStCuZyNpW2wT97f9pj3RADUn1L1MdqTq9Tm_b/exec',
  VERSION: '0.2.1'
});

const state = {
  obras: [],
  filtroObras: '',
  obraAtual: null,
  planejamento: null,
  filtroAtividades: ''
};

const el = {
  portfolioView: document.querySelector('#portfolioView'),
  planningView: document.querySelector('#planningView'),
  navObras: document.querySelector('#navObras'),
  navPlanejamento: document.querySelector('#navPlanejamento'),
  apiStatus: document.querySelector('#apiStatus'),
  activeCount: document.querySelector('#activeCount'),
  planningCount: document.querySelector('#planningCount'),
  loadingState: document.querySelector('#loadingState'),
  emptyState: document.querySelector('#emptyState'),
  errorState: document.querySelector('#errorState'),
  errorMessage: document.querySelector('#errorMessage'),
  projectGrid: document.querySelector('#projectGrid'),
  searchInput: document.querySelector('#searchInput'),
  newProjectBtn: document.querySelector('#newProjectBtn'),
  emptyCreateBtn: document.querySelector('#emptyCreateBtn'),
  retryBtn: document.querySelector('#retryBtn'),

  backToPortfolioBtn: document.querySelector('#backToPortfolioBtn'),
  planningProjectName: document.querySelector('#planningProjectName'),
  planningProjectMeta: document.querySelector('#planningProjectMeta'),
  newWbsBtn: document.querySelector('#newWbsBtn'),
  newActivityBtn: document.querySelector('#newActivityBtn'),
  newDependencyBtn: document.querySelector('#newDependencyBtn'),
  recalculateBtn: document.querySelector('#recalculateBtn'),
  activityCount: document.querySelector('#activityCount'),
  weightTotal: document.querySelector('#weightTotal'),
  weightHint: document.querySelector('#weightHint'),
  forecastEnd: document.querySelector('#forecastEnd'),
  criticalCount: document.querySelector('#criticalCount'),
  activitySearchInput: document.querySelector('#activitySearchInput'),
  planningLoading: document.querySelector('#planningLoading'),
  planningEmpty: document.querySelector('#planningEmpty'),
  planningTableWrap: document.querySelector('#planningTableWrap'),
  planningTableBody: document.querySelector('#planningTableBody'),
  dependencyList: document.querySelector('#dependencyList'),
  emptyWbsBtn: document.querySelector('#emptyWbsBtn'),
  emptyActivityBtn: document.querySelector('#emptyActivityBtn'),

  projectModal: document.querySelector('#projectModal'),
  closeProjectModalBtn: document.querySelector('#closeProjectModalBtn'),
  cancelProjectBtn: document.querySelector('#cancelProjectBtn'),
  projectForm: document.querySelector('#projectForm'),
  projectFormError: document.querySelector('#projectFormError'),
  saveProjectBtn: document.querySelector('#saveProjectBtn'),

  wbsModal: document.querySelector('#wbsModal'),
  closeWbsModalBtn: document.querySelector('#closeWbsModalBtn'),
  cancelWbsBtn: document.querySelector('#cancelWbsBtn'),
  wbsForm: document.querySelector('#wbsForm'),
  wbsFormError: document.querySelector('#wbsFormError'),
  saveWbsBtn: document.querySelector('#saveWbsBtn'),
  wbsParentSelect: document.querySelector('#wbsParentSelect'),

  activityModal: document.querySelector('#activityModal'),
  activityModalTitle: document.querySelector('#activityModalTitle'),
  closeActivityModalBtn: document.querySelector('#closeActivityModalBtn'),
  cancelActivityBtn: document.querySelector('#cancelActivityBtn'),
  activityForm: document.querySelector('#activityForm'),
  activityFormError: document.querySelector('#activityFormError'),
  saveActivityBtn: document.querySelector('#saveActivityBtn'),
  deleteActivityBtn: document.querySelector('#deleteActivityBtn'),
  activityWbsSelect: document.querySelector('#activityWbsSelect'),
  activityTypeSelect: document.querySelector('#activityTypeSelect'),

  dependencyModal: document.querySelector('#dependencyModal'),
  closeDependencyModalBtn: document.querySelector('#closeDependencyModalBtn'),
  cancelDependencyBtn: document.querySelector('#cancelDependencyBtn'),
  dependencyForm: document.querySelector('#dependencyForm'),
  dependencyFormError: document.querySelector('#dependencyFormError'),
  saveDependencyBtn: document.querySelector('#saveDependencyBtn'),
  dependencyParentSelect: document.querySelector('#dependencyParentSelect'),
  dependencyChildSelect: document.querySelector('#dependencyChildSelect'),

  toast: document.querySelector('#toast')
};

document.addEventListener('DOMContentLoaded', boot);

async function boot() {
  bindEvents();
  await checkHealth();
  await loadObras();
}

function bindEvents() {
  el.newProjectBtn.addEventListener('click', openProjectModal);
  el.emptyCreateBtn.addEventListener('click', openProjectModal);
  el.retryBtn.addEventListener('click', loadObras);
  el.searchInput.addEventListener('input', event => {
    state.filtroObras = event.target.value.trim().toLowerCase();
    renderObras();
  });

  el.backToPortfolioBtn.addEventListener('click', showPortfolio);
  el.navObras.addEventListener('click', showPortfolio);
  el.navPlanejamento.addEventListener('click', () => {
    if (state.obraAtual) showPlanningView();
  });

  el.newWbsBtn.addEventListener('click', openWbsModal);
  el.emptyWbsBtn.addEventListener('click', openWbsModal);
  el.newActivityBtn.addEventListener('click', () => openActivityModal());
  el.emptyActivityBtn.addEventListener('click', () => openActivityModal());
  el.newDependencyBtn.addEventListener('click', openDependencyModal);
  el.recalculateBtn.addEventListener('click', recalculateSchedule);

  el.activitySearchInput.addEventListener('input', event => {
    state.filtroAtividades = event.target.value.trim().toLowerCase();
    renderPlanning();
  });

  setupModal(el.projectModal, el.closeProjectModalBtn, el.cancelProjectBtn);
  setupModal(el.wbsModal, el.closeWbsModalBtn, el.cancelWbsBtn);
  setupModal(el.activityModal, el.closeActivityModalBtn, el.cancelActivityBtn);
  setupModal(el.dependencyModal, el.closeDependencyModalBtn, el.cancelDependencyBtn);

  el.projectForm.addEventListener('submit', createProject);
  el.wbsForm.addEventListener('submit', createWbs);
  el.activityForm.addEventListener('submit', saveActivity);
  el.deleteActivityBtn.addEventListener('click', deleteCurrentActivity);
  el.dependencyForm.addEventListener('submit', createDependency);
}

function setupModal(modal, closeButton, cancelButton) {
  closeButton.addEventListener('click', () => closeModal(modal));
  cancelButton.addEventListener('click', () => closeModal(modal));
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal(modal);
  });
}

async function checkHealth() {
  try {
    const response = await fetch(CONFIG.API_URL + '?action=health', {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload?.error?.message || 'API indisponível');
    setApiStatus(true, 'API online');
  } catch (error) {
    setApiStatus(false, 'API indisponível');
  }
}

async function api(action, data = {}) {
  const response = await fetch(CONFIG.API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...data })
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error('O backend não retornou JSON válido.');
  }

  if (!payload.ok) {
    throw new Error(payload?.error?.message || payload?.error?.code || 'Erro no backend.');
  }
  return payload.data;
}

async function loadObras() {
  showLoading(true);
  hideState(el.errorState);
  try {
    const obras = await api('obras.list');
    state.obras = Array.isArray(obras) ? obras : [];
    updatePortfolioSummary();
    renderObras();
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

function renderObras() {
  const filtro = state.filtroObras;
  const obras = state.obras.filter(obra => {
    if (!filtro) return true;
    return [obra.CODIGO, obra.NOME, obra.CLIENTE, obra.STATUS]
      .join(' ')
      .toLowerCase()
      .includes(filtro);
  });

  el.projectGrid.innerHTML = '';

  if (state.obras.length === 0) {
    hideState(el.projectGrid);
    showState(el.emptyState);
    return;
  }

  hideState(el.emptyState);
  showState(el.projectGrid);

  if (obras.length === 0) {
    el.projectGrid.innerHTML = '<div class="state-box"><strong>Nenhuma obra encontrada</strong><span>Tente outro termo de pesquisa.</span></div>';
    return;
  }

  obras.forEach(obra => {
    const card = document.createElement('article');
    card.className = 'project-card';
    const status = obra.STATUS || 'PLANEJAMENTO';
    const statusClass = status === 'EM_EXECUCAO' ? 'execution' : '';

    card.innerHTML = `
      <div class="project-card-top">
        <div>
          <span class="project-code">${escapeHtml(obra.CODIGO || 'SEM CÓDIGO')}</span>
          <h3>${escapeHtml(obra.NOME || '')}</h3>
          <div class="project-client">${escapeHtml(obra.CLIENTE || 'Cliente não informado')}</div>
        </div>
        <span class="badge ${statusClass}">${formatStatus(status)}</span>
      </div>
      <div class="project-dates">
        <div><span>Início contratual</span><strong>${formatDate(obra.DATA_INICIO_CONTRATUAL)}</strong></div>
        <div><span>Fim contratual</span><strong>${formatDate(obra.DATA_FIM_CONTRATUAL)}</strong></div>
      </div>
      <button class="primary-button project-action" type="button" data-open-project="${escapeHtml(obra.ID_OBRA)}">
        Abrir planejamento →
      </button>
    `;

    card.querySelector('[data-open-project]').addEventListener('click', () => openPlanning(obra.ID_OBRA));
    el.projectGrid.appendChild(card);
  });
}

function updatePortfolioSummary() {
  el.activeCount.textContent = String(state.obras.filter(o => isTrue(o.ATIVA)).length);
  el.planningCount.textContent = String(state.obras.filter(o => o.STATUS === 'PLANEJAMENTO').length);
}

async function openPlanning(idObra) {
  const obra = state.obras.find(item => String(item.ID_OBRA) === String(idObra));
  if (!obra) return;

  state.obraAtual = obra;
  state.filtroAtividades = '';
  el.activitySearchInput.value = '';
  showPlanningView();
  await loadPlanning();
}

function showPlanningView() {
  hideState(el.portfolioView);
  showState(el.planningView);
  el.navObras.classList.remove('active');
  el.navPlanejamento.classList.add('active');
  el.navPlanejamento.disabled = false;

  const obra = state.obraAtual;
  el.planningProjectName.textContent = obra?.NOME || 'Obra';
  el.planningProjectMeta.textContent = [
    obra?.CODIGO || '',
    obra?.CLIENTE || '',
    obra?.DATA_INICIO_CONTRATUAL ? 'Início ' + formatDate(obra.DATA_INICIO_CONTRATUAL) : ''
  ].filter(Boolean).join(' · ');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showPortfolio() {
  showState(el.portfolioView);
  hideState(el.planningView);
  el.navObras.classList.add('active');
  el.navPlanejamento.classList.remove('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadPlanning() {
  if (!state.obraAtual) return;
  showState(el.planningLoading);
  hideState(el.planningEmpty);
  hideState(el.planningTableWrap);

  try {
    state.planejamento = await api('planejamento.get', { id_obra: state.obraAtual.ID_OBRA });
    state.obraAtual = state.planejamento.obra || state.obraAtual;
    renderPlanning();
  } catch (error) {
    toast(error.message, true);
  } finally {
    hideState(el.planningLoading);
  }
}

function renderPlanning() {
  const p = state.planejamento;
  if (!p) return;

  const atividades = p.atividades || [];
  const wbs = p.wbs || [];
  const deps = p.dependencias || [];

  const peso = atividades.reduce((sum, a) => sum + Number(a.PESO_PERCENTUAL || 0), 0);
  const fim = atividades
    .map(a => a.DATA_FIM_FORECAST)
    .filter(Boolean)
    .sort()
    .at(-1);

  el.activityCount.textContent = String(atividades.length);
  el.weightTotal.textContent = formatPercent(peso);
  el.weightHint.textContent = atividades.length ? (Math.abs(peso - 100) < 0.01 ? 'peso fechado' : 'ideal: 100%') : '';
  el.weightTotal.classList.toggle('warning-text', atividades.length > 0 && Math.abs(peso - 100) >= 0.01);
  el.forecastEnd.textContent = fim ? formatDate(fim) : '—';
  el.criticalCount.textContent = String(atividades.filter(a => isTrue(a.CAMINHO_CRITICO)).length);

  populatePlanningSelects();

  if (!atividades.length && !wbs.length) {
    showState(el.planningEmpty);
    hideState(el.planningTableWrap);
  } else {
    hideState(el.planningEmpty);
    showState(el.planningTableWrap);
    renderPlanningRows();
  }

  renderDependencies();
}

function renderPlanningRows() {
  const p = state.planejamento;
  const wbs = p.wbs || [];
  const atividades = p.atividades || [];
  const filtro = state.filtroAtividades;

  el.planningTableBody.innerHTML = '';

  const wbsById = Object.fromEntries(wbs.map(w => [String(w.ID_WBS), w]));
  const depthMemo = {};
  const getDepth = id => {
    if (!id || !wbsById[id]) return 0;
    if (depthMemo[id] !== undefined) return depthMemo[id];
    const parent = String(wbsById[id].ID_WBS_PAI || '');
    depthMemo[id] = parent ? 1 + getDepth(parent) : 0;
    return depthMemo[id];
  };

  const atividadesVisiveis = atividades.filter(a => {
    if (!filtro) return true;
    const w = wbsById[String(a.ID_WBS || '')];
    return [a.CODIGO, a.NOME, a.STATUS, w?.NOME]
      .join(' ')
      .toLowerCase()
      .includes(filtro);
  });

  const renderedWbs = new Set();

  wbs.forEach(w => {
    const itens = atividadesVisiveis.filter(a => String(a.ID_WBS || '') === String(w.ID_WBS));
    if (filtro && itens.length === 0 && !String(w.NOME || '').toLowerCase().includes(filtro)) return;

    renderWbsRow(w, getDepth(String(w.ID_WBS)));
    renderedWbs.add(String(w.ID_WBS));
    itens.forEach(renderActivityRow);
  });

  const semWbs = atividadesVisiveis.filter(a => !a.ID_WBS || !renderedWbs.has(String(a.ID_WBS)));
  if (semWbs.length) {
    const tr = document.createElement('tr');
    tr.className = 'wbs-row';
    tr.innerHTML = '<td colspan="9"><div class="wbs-name"><strong>Sem etapa EAP</strong></div></td>';
    el.planningTableBody.appendChild(tr);
    semWbs.forEach(renderActivityRow);
  }

  if (!atividadesVisiveis.length && filtro) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="9" class="empty-table">Nenhuma atividade encontrada para este filtro.</td>';
    el.planningTableBody.appendChild(tr);
  }
}

function renderWbsRow(wbs, depth) {
  const tr = document.createElement('tr');
  tr.className = 'wbs-row';
  tr.innerHTML = `
    <td colspan="9">
      <div class="wbs-name" style="padding-left:${depth * 18}px">
        <span class="wbs-code">${escapeHtml(wbs.CODIGO_WBS || '')}</span>
        <strong>${escapeHtml(wbs.NOME || '')}</strong>
        <button class="tiny-button danger-link" type="button" title="Excluir etapa">Excluir</button>
      </div>
    </td>
  `;
  tr.querySelector('button').addEventListener('click', () => deleteWbs(wbs));
  el.planningTableBody.appendChild(tr);
}

function renderActivityRow(a) {
  const tr = document.createElement('tr');
  tr.className = isTrue(a.CAMINHO_CRITICO) ? 'activity-row critical-row' : 'activity-row';
  tr.innerHTML = `
    <td>
      <button class="activity-name-button" type="button">
        <span class="activity-code">${escapeHtml(a.CODIGO || '')}</span>
        <strong>${escapeHtml(a.NOME || '')}</strong>
        ${isTrue(a.CAMINHO_CRITICO) ? '<span class="critical-flag">CRÍTICA</span>' : ''}
      </button>
    </td>
    <td class="num">${Number(a.DURACAO_PLANEJADA_DIAS || 0)} d</td>
    <td class="num">${formatPercent(Number(a.PESO_PERCENTUAL || 0))}</td>
    <td class="num">${formatPercent(Number(a.PERCENTUAL_ATUAL || 0))}</td>
    <td>${formatDate(a.DATA_INICIO_FORECAST)}</td>
    <td>${formatDate(a.DATA_FIM_FORECAST)}</td>
    <td class="num">${Number(a.FOLGA_TOTAL_DIAS || 0)} d</td>
    <td><span class="status-pill ${statusClass(a.STATUS)}">${formatActivityStatus(a.STATUS)}</span></td>
    <td class="actions-col"><button class="tiny-button" type="button">Editar</button></td>
  `;
  tr.querySelector('.activity-name-button').addEventListener('click', () => openActivityModal(a));
  tr.querySelector('.actions-col button').addEventListener('click', () => openActivityModal(a));
  el.planningTableBody.appendChild(tr);
}

function renderDependencies() {
  const p = state.planejamento;
  const deps = p?.dependencias || [];
  const atividades = p?.atividades || [];
  const byId = Object.fromEntries(atividades.map(a => [String(a.ID_ATIVIDADE), a]));

  el.dependencyList.innerHTML = '';

  if (!deps.length) {
    el.dependencyList.innerHTML = '<div class="dependency-empty">Nenhuma dependência cadastrada.</div>';
    return;
  }

  deps.forEach(dep => {
    const pai = byId[String(dep.ID_ATIVIDADE_PAI)];
    const filha = byId[String(dep.ID_ATIVIDADE_FILHA)];
    const item = document.createElement('article');
    item.className = 'dependency-item';
    item.innerHTML = `
      <div class="dependency-flow">
        <strong>${escapeHtml(pai?.NOME || dep.ID_ATIVIDADE_PAI)}</strong>
        <span class="dependency-rule">${Number(dep.PERCENTUAL_LIBERACAO || 100)}% ${Number(dep.LAG_DIAS || 0) ? formatLag(dep.LAG_DIAS) : ''}</span>
        <span class="dependency-arrow">↓</span>
        <strong>${escapeHtml(filha?.NOME || dep.ID_ATIVIDADE_FILHA)}</strong>
      </div>
      <button class="tiny-button danger-link" type="button">Excluir</button>
    `;
    item.querySelector('button').addEventListener('click', () => deleteDependency(dep));
    el.dependencyList.appendChild(item);
  });
}

function populatePlanningSelects() {
  const p = state.planejamento || {};
  const wbs = p.wbs || [];
  const atividades = p.atividades || [];
  const tipos = p.cadastros?.tiposAtividade || [];

  const wbsOptions = wbs.map(w => `<option value="${escapeHtml(w.ID_WBS)}">${escapeHtml([w.CODIGO_WBS, w.NOME].filter(Boolean).join(' · '))}</option>`).join('');
  el.wbsParentSelect.innerHTML = '<option value="">Sem etapa pai</option>' + wbsOptions;
  el.activityWbsSelect.innerHTML = '<option value="">Sem etapa</option>' + wbsOptions;

  el.activityTypeSelect.innerHTML = '<option value="">Sem tipo</option>' + tipos
    .map(t => `<option value="${escapeHtml(t.ID_TIPO_ATIVIDADE)}">${escapeHtml(t.NOME)}</option>`)
    .join('');

  const activityOptions = atividades
    .map(a => `<option value="${escapeHtml(a.ID_ATIVIDADE)}">${escapeHtml([a.CODIGO, a.NOME].filter(Boolean).join(' · '))}</option>`)
    .join('');
  el.dependencyParentSelect.innerHTML = '<option value="">Selecione...</option>' + activityOptions;
  el.dependencyChildSelect.innerHTML = '<option value="">Selecione...</option>' + activityOptions;

  el.newDependencyBtn.disabled = atividades.length < 2;
}

async function createProject(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(el.projectForm).entries());

  if (!String(data.nome || '').trim()) {
    showInlineError(el.projectFormError, 'Informe o nome da obra.');
    return;
  }

  if (data.data_inicio_contratual && data.data_fim_contratual && data.data_fim_contratual < data.data_inicio_contratual) {
    showInlineError(el.projectFormError, 'A data final não pode ser anterior à data inicial.');
    return;
  }

  setBusy(el.saveProjectBtn, true, 'Salvando...');
  hideState(el.projectFormError);
  try {
    await api('obras.create', data);
    closeModal(el.projectModal);
    toast('Obra cadastrada com sucesso.');
    await loadObras();
  } catch (error) {
    showInlineError(el.projectFormError, error.message);
  } finally {
    setBusy(el.saveProjectBtn, false, 'Salvar obra');
  }
}

async function createWbs(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(el.wbsForm).entries());
  data.id_obra = state.obraAtual.ID_OBRA;

  setBusy(el.saveWbsBtn, true, 'Salvando...');
  hideState(el.wbsFormError);
  try {
    await api('wbs.create', data);
    closeModal(el.wbsModal);
    toast('Etapa da EAP criada.');
    await loadPlanning();
  } catch (error) {
    showInlineError(el.wbsFormError, error.message);
  } finally {
    setBusy(el.saveWbsBtn, false, 'Salvar etapa');
  }
}

async function saveActivity(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(el.activityForm).entries());
  data.id_obra = state.obraAtual.ID_OBRA;
  const editing = Boolean(data.id);

  setBusy(el.saveActivityBtn, true, 'Salvando...');
  hideState(el.activityFormError);
  try {
    await api(editing ? 'atividades.update' : 'atividades.create', data);
    closeModal(el.activityModal);
    toast(editing ? 'Atividade atualizada.' : 'Atividade criada.');
    await loadPlanning();
  } catch (error) {
    showInlineError(el.activityFormError, error.message);
  } finally {
    setBusy(el.saveActivityBtn, false, 'Salvar atividade');
  }
}

async function deleteCurrentActivity() {
  const id = el.activityForm.elements.id.value;
  if (!id) return;
  const atividade = state.planejamento?.atividades?.find(a => String(a.ID_ATIVIDADE) === String(id));
  if (!confirm(`Excluir a atividade "${atividade?.NOME || ''}" e suas dependências?`)) return;

  setBusy(el.deleteActivityBtn, true, 'Excluindo...');
  try {
    await api('atividades.delete', { id });
    closeModal(el.activityModal);
    toast('Atividade excluída.');
    await loadPlanning();
  } catch (error) {
    showInlineError(el.activityFormError, error.message);
  } finally {
    setBusy(el.deleteActivityBtn, false, 'Excluir');
  }
}

async function createDependency(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(el.dependencyForm).entries());
  data.id_obra = state.obraAtual.ID_OBRA;

  if (data.id_atividade_pai === data.id_atividade_filha) {
    showInlineError(el.dependencyFormError, 'A predecessora e a sucessora precisam ser diferentes.');
    return;
  }

  setBusy(el.saveDependencyBtn, true, 'Criando...');
  hideState(el.dependencyFormError);
  try {
    await api('dependencias.create', data);
    closeModal(el.dependencyModal);
    toast('Dependência criada e cronograma recalculado.');
    await loadPlanning();
  } catch (error) {
    showInlineError(el.dependencyFormError, error.message);
  } finally {
    setBusy(el.saveDependencyBtn, false, 'Criar dependência');
  }
}

async function deleteDependency(dep) {
  if (!confirm('Excluir esta dependência?')) return;
  try {
    await api('dependencias.delete', { id: dep.ID_DEPENDENCIA });
    toast('Dependência excluída.');
    await loadPlanning();
  } catch (error) {
    toast(error.message, true);
  }
}

async function deleteWbs(wbs) {
  if (!confirm(`Excluir a etapa "${wbs.NOME}"?`)) return;
  try {
    await api('wbs.delete', { id: wbs.ID_WBS });
    toast('Etapa excluída.');
    await loadPlanning();
  } catch (error) {
    toast(error.message, true);
  }
}

async function recalculateSchedule() {
  if (!state.obraAtual) return;
  setBusy(el.recalculateBtn, true, 'Calculando...');
  showState(el.planningLoading);
  try {
    await api('cronograma.recalcular', { id_obra: state.obraAtual.ID_OBRA });
    toast('Cronograma recalculado.');
    await loadPlanning();
  } catch (error) {
    toast(error.message, true);
  } finally {
    hideState(el.planningLoading);
    setBusy(el.recalculateBtn, false, '↻ Recalcular');
  }
}

function openProjectModal() {
  el.projectForm.reset();
  hideState(el.projectFormError);
  openModal(el.projectModal);
  setTimeout(() => el.projectForm.elements.nome.focus(), 30);
}

function openWbsModal() {
  if (!state.obraAtual) return;
  el.wbsForm.reset();
  el.wbsForm.elements.ordem.value = String((state.planejamento?.wbs?.length || 0) + 1);
  hideState(el.wbsFormError);
  populatePlanningSelects();
  openModal(el.wbsModal);
  setTimeout(() => el.wbsForm.elements.nome.focus(), 30);
}

function openActivityModal(activity = null) {
  if (!state.obraAtual) return;
  el.activityForm.reset();
  populatePlanningSelects();
  hideState(el.activityFormError);

  if (activity) {
    el.activityModalTitle.textContent = 'Editar atividade';
    el.activityForm.elements.id.value = activity.ID_ATIVIDADE || '';
    el.activityForm.elements.nome.value = activity.NOME || '';
    el.activityForm.elements.id_wbs.value = activity.ID_WBS || '';
    el.activityForm.elements.id_tipo_atividade.value = activity.ID_TIPO_ATIVIDADE || '';
    el.activityForm.elements.duracao_planejada_dias.value = Number(activity.DURACAO_PLANEJADA_DIAS || 1);
    el.activityForm.elements.peso_percentual.value = Number(activity.PESO_PERCENTUAL || 0);
    el.activityForm.elements.restricao_inicio_minimo.value = dateInputValue(activity.RESTRICAO_INICIO_MINIMO);
    el.activityForm.elements.ordem.value = Number(activity.ORDEM || 0);
    showState(el.deleteActivityBtn);
  } else {
    el.activityModalTitle.textContent = 'Nova atividade';
    el.activityForm.elements.id.value = '';
    el.activityForm.elements.duracao_planejada_dias.value = '1';
    el.activityForm.elements.peso_percentual.value = '0';
    el.activityForm.elements.ordem.value = String((state.planejamento?.atividades?.length || 0) + 1);
    hideState(el.deleteActivityBtn);
  }

  openModal(el.activityModal);
  setTimeout(() => el.activityForm.elements.nome.focus(), 30);
}

function openDependencyModal() {
  const atividades = state.planejamento?.atividades || [];
  if (atividades.length < 2) {
    toast('Cadastre pelo menos duas atividades.', true);
    return;
  }
  el.dependencyForm.reset();
  el.dependencyForm.elements.percentual_liberacao.value = '100';
  el.dependencyForm.elements.lag_dias.value = '0';
  hideState(el.dependencyFormError);
  populatePlanningSelects();
  openModal(el.dependencyModal);
}

function openModal(modal) {
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modal) {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function showLoading(show) {
  if (show) {
    showState(el.loadingState);
    hideState(el.emptyState);
    hideState(el.errorState);
    hideState(el.projectGrid);
  } else {
    hideState(el.loadingState);
  }
}

function showError(message) {
  el.errorMessage.textContent = message;
  hideState(el.emptyState);
  hideState(el.projectGrid);
  showState(el.errorState);
}

function setApiStatus(online, text) {
  el.apiStatus.classList.toggle('online', online);
  el.apiStatus.classList.toggle('offline', !online);
  el.apiStatus.querySelector('span:last-child').textContent = text;
}

function setBusy(button, busy, text) {
  button.disabled = busy;
  button.textContent = text;
}

function showInlineError(target, message) {
  target.textContent = message;
  showState(target);
}

function showState(target) {
  target.classList.remove('hidden');
}

function hideState(target) {
  target.classList.add('hidden');
}

function toast(message, error = false) {
  el.toast.textContent = message;
  el.toast.classList.toggle('error-toast', error);
  showState(el.toast);
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => hideState(el.toast), 3000);
}

function formatStatus(value) {
  const map = {
    PLANEJAMENTO: 'Planejamento',
    EM_EXECUCAO: 'Em execução',
    CONCLUIDA: 'Concluída',
    SUSPENSA: 'Suspensa',
    CANCELADA: 'Cancelada'
  };
  return map[value] || value || 'Planejamento';
}

function formatActivityStatus(value) {
  const map = {
    NAO_INICIADA: 'Não iniciada',
    BLOQUEADA: 'Bloqueada',
    EM_EXECUCAO: 'Em execução',
    CONCLUIDA: 'Concluída',
    ATRASADA: 'Atrasada'
  };
  return map[value] || value || 'Não iniciada';
}

function statusClass(value) {
  const map = {
    NAO_INICIADA: 'neutral',
    BLOQUEADA: 'blocked',
    EM_EXECUCAO: 'execution',
    CONCLUIDA: 'done',
    ATRASADA: 'late'
  };
  return map[value] || 'neutral';
}

function formatLag(value) {
  const n = Number(value || 0);
  if (!n) return '';
  return n > 0 ? `+ ${n}d` : `- ${Math.abs(n)}d`;
}

function formatPercent(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n) + '%';
}

function formatDate(value) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

function dateInputValue(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function isTrue(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'sim', 'yes'].includes(String(value || '').toLowerCase());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}