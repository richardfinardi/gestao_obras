const CONFIG = Object.freeze({
  API_URL: 'https://script.google.com/macros/s/AKfycbw6cRAPlwVzNOURoLNsTJ47xyezz0LStCuZyNpW2wT97f9pj3RADUn1L1MdqTq9Tm_b/exec',
  VERSION: '0.1.0'
});

const state = {
  obras: [],
  filtro: ''
};

const el = {
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
  projectModal: document.querySelector('#projectModal'),
  closeProjectModalBtn: document.querySelector('#closeProjectModalBtn'),
  cancelProjectBtn: document.querySelector('#cancelProjectBtn'),
  projectForm: document.querySelector('#projectForm'),
  projectFormError: document.querySelector('#projectFormError'),
  saveProjectBtn: document.querySelector('#saveProjectBtn'),
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
  el.closeProjectModalBtn.addEventListener('click', closeProjectModal);
  el.cancelProjectBtn.addEventListener('click', closeProjectModal);
  el.retryBtn.addEventListener('click', loadObras);

  el.projectForm.addEventListener('submit', createProject);

  el.searchInput.addEventListener('input', event => {
    state.filtro = event.target.value.trim().toLowerCase();
    renderObras();
  });

  [el.projectModal].forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === el.projectModal) closeProjectModal();
    });
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
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      action,
      ...data
    })
  });

  const text = await response.text();
  let payload;

  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error('O backend não retornou JSON válido. Confirme a implantação do Apps Script.');
  }

  if (!payload.ok) {
    const code = payload?.error?.code || '';
    const message = payload?.error?.message || 'Erro no backend.';

    throw new Error(message);
  }

  return payload.data;
}

async function loadObras() {
  showLoading(true);
  hideState(el.errorState);

  try {
    const obras = await api('obras.list');
    state.obras = Array.isArray(obras) ? obras : [];
    updateSummary();
    renderObras();
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

function renderObras() {
  const filtro = state.filtro;

  const obras = state.obras.filter(obra => {
    if (!filtro) return true;

    const haystack = [
      obra.CODIGO,
      obra.NOME,
      obra.CLIENTE,
      obra.STATUS
    ].join(' ').toLowerCase();

    return haystack.includes(filtro);
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
        <div>
          <span>Início contratual</span>
          <strong>${formatDate(obra.DATA_INICIO_CONTRATUAL)}</strong>
        </div>
        <div>
          <span>Fim contratual</span>
          <strong>${formatDate(obra.DATA_FIM_CONTRATUAL)}</strong>
        </div>
      </div>

      <button class="secondary-button project-action" type="button" disabled>
        Planejamento será a próxima etapa
      </button>
    `;

    el.projectGrid.appendChild(card);
  });
}

function updateSummary() {
  const ativas = state.obras.filter(obra => isTrue(obra.ATIVA)).length;
  const planejamento = state.obras.filter(obra => obra.STATUS === 'PLANEJAMENTO').length;

  el.activeCount.textContent = String(ativas);
  el.planningCount.textContent = String(planejamento);
}

async function createProject(event) {
  event.preventDefault();

  const formData = new FormData(el.projectForm);
  const data = Object.fromEntries(formData.entries());

  if (!data.nome.trim()) {
    showInlineError(el.projectFormError, 'Informe o nome da obra.');
    return;
  }

  if (
    data.data_inicio_contratual &&
    data.data_fim_contratual &&
    data.data_fim_contratual < data.data_inicio_contratual
  ) {
    showInlineError(el.projectFormError, 'A data final não pode ser anterior à data inicial.');
    return;
  }

  el.saveProjectBtn.disabled = true;
  el.saveProjectBtn.textContent = 'Salvando...';
  hideState(el.projectFormError);

  try {
    await api('obras.create', data);
    closeProjectModal();
    toast('Obra cadastrada com sucesso.');
    await loadObras();
  } catch (error) {
    showInlineError(el.projectFormError, error.message);
  } finally {
    el.saveProjectBtn.disabled = false;
    el.saveProjectBtn.textContent = 'Salvar obra';
  }
}

function openProjectModal() {
  el.projectForm.reset();
  hideState(el.projectFormError);
  el.projectModal.classList.remove('hidden');
  el.projectModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => el.projectForm.elements.nome.focus(), 30);
}

function closeProjectModal() {
  el.projectModal.classList.add('hidden');
  el.projectModal.setAttribute('aria-hidden', 'true');
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

function toast(message) {
  el.toast.textContent = message;
  showState(el.toast);
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => hideState(el.toast), 2600);
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

function formatDate(value) {
  if (!value) return '—';

  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split('-');

  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
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
