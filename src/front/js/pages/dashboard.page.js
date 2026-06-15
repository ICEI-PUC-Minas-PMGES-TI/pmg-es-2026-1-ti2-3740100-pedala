const dashboardToken = localStorage.getItem('pedala_token');
const dashboardUser = window.readStoredJson ? window.readStoredJson('pedala_user') : JSON.parse(localStorage.getItem('pedala_user') || '{}');
const dashboardApi = window.PEDALA_API_BASE;
const dashboardRole = window.normalizeUserRole ? window.normalizeUserRole(dashboardUser.role) : String(dashboardUser.role || '').trim().toLowerCase();

if (!dashboardToken || !['user', 'cliente'].includes(dashboardRole)) {
  alert('Acesso restrito.');
  window.location.href = 'login.html';
}

const dashboardHeaders = { Authorization: `Bearer ${dashboardToken}` };
const dashboardJsonHeaders = { ...dashboardHeaders, 'Content-Type': 'application/json' };
const dashboardState = {
  bikes: [],
  activeCategory: '',
  selectedBike: null,
  selectedPlan: '',
  selectedInsurance: 'Basico',
  renewalRentalId: null,
  selectedRenewPlan: 'mensal',
  pendingBikeId: Number(new URLSearchParams(window.location.search).get('bike')) || null
};

function dashEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDashboardDate(value, fallback = 'Data indisponível') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('pt-BR');
}

function getRentalPlanDays(type) {
  const daysByType = { semanal: 7, quinzenal: 15, mensal: 30 };
  return daysByType[type] || 30;
}

function getRentalPlanOptions() {
  return [
    { key: 'semanal', label: 'Semanal', description: '7 dias' },
    { key: 'quinzenal', label: 'Quinzenal', description: '15 dias' },
    { key: 'mensal', label: 'Mensal', description: '30 dias' }
  ];
}

function getInsuranceOptions() {
  return [
    { key: 'Basico', label: 'Básico', price: 0, description: 'Defeitos de fabricação' },
    { key: 'Intermediario', label: 'Intermediário', price: 15, description: 'Danos acidentais leves' },
    { key: 'Premium', label: 'Premium', price: 30, description: 'Cobertura ampliada' }
  ];
}

function formatInsuranceLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const labels = {
    basico: 'Básico',
    'básico': 'Básico',
    intermediario: 'Intermediário',
    'intermediário': 'Intermediário',
    premium: 'Premium'
  };
  return labels[normalized] || value;
}

function getRentalDaysRemaining(rental) {
  if (rental.diasRestantes !== null && rental.diasRestantes !== undefined) {
    const explicitDays = Number(rental.diasRestantes);
    if (Number.isFinite(explicitDays)) return explicitDays;
  }

  const dueDate = new Date(rental.dataDevolucaoPrevista);
  if (Number.isNaN(dueDate.getTime())) return null;
  return Math.ceil((dueDate.getTime() - Date.now()) / 864e5);
}

function getRentalProgress(rental) {
  const daysRemaining = getRentalDaysRemaining(rental);
  if (daysRemaining === null) return 0;
  const totalDays = getRentalPlanDays(rental.tipo);
  return Math.max(0, Math.min(100, 100 - (daysRemaining / totalDays) * 100));
}

function formatRentalDaysRemaining(rental) {
  const daysRemaining = getRentalDaysRemaining(rental);
  if (daysRemaining === null) {
    return rental.status === 'finalizado' ? 'Finalizado' : 'Não informado';
  }
  if (daysRemaining > 0) return `${daysRemaining} dias`;
  return rental.status === 'finalizado' ? 'Finalizado' : 'Vencida';
}

function bikeTraits(category) {
  const key = String(category || '').toLowerCase();
  if (key.includes('speed')) return ['Leve', 'Rapida', 'Performance'];
  if (key.includes('mountain')) return ['Suspensao', 'Tracao', 'Controle'];
  if (key.includes('eletrica')) return ['Assistida', 'Autonomia', 'Conforto'];
  if (key.includes('dobravel')) return ['Compacta', 'Portatil', 'Facil de guardar'];
  if (key.includes('infantil')) return ['Segura', 'Menor porte', 'Uso recreativo'];
  return ['Urbana', 'Confortavel', 'Uso diario'];
}

function statusBadge(status) {
  const tone = {
    ativo: 'badge-warning',
    aguardando_locacao: 'badge-purple',
    agendada: 'badge-purple',
    aguardando_vistoria: 'badge-info',
    finalizado: 'badge-muted'
  };
  const label = {
    ativo: 'Em uso',
    aguardando_locacao: 'Pendente',
    agendada: 'Agendada',
    aguardando_vistoria: 'Vistoria',
    finalizado: 'Finalizado'
  };
  return `<span class="badge ${tone[status] || 'badge-muted'}">${label[status] || dashEscape(status)}</span>`;
}

function paymentBadge(payment) {
  if (!payment) return '';
  const tone = {
    nao_pago: 'badge-danger',
    aguardando_aprovacao: 'badge-warning',
    aprovado: 'badge-success',
    rejeitado: 'badge-danger'
  };
  const label = {
    nao_pago: 'Pendente',
    aguardando_aprovacao: 'Pendente',
    aprovado: 'Pago',
    rejeitado: 'Recusado'
  };
  return `<span class="badge ${tone[payment.status] || 'badge-muted'}">${label[payment.status] || dashEscape(payment.status)}</span>`;
}

function sair() {
  localStorage.removeItem('pedala_token');
  localStorage.removeItem('pedala_user');
  window.location.href = 'login.html';
}

function showSec(section, element) {
  document.querySelectorAll('.sec').forEach(item => item.classList.remove('show'));
  document.getElementById(`sec-${section}`)?.classList.add('show');
  document.querySelectorAll('.sidebar-nav a').forEach(link => link.classList.remove('active'));
  const navMap = { inicio: 'nav-inicio', locar: 'nav-locar', locacoes: 'nav-locacoes', perfil: 'nav-perfil' };
  const activeLink = element || document.getElementById(navMap[section]);
  activeLink?.classList.add('active');

  const loaders = {
    inicio: loadInicio,
    locar: loadLocar,
    locacoes: loadLocacoes,
    perfil: loadPerfil,
    suporte: loadSuporte
  };

  loaders[section]?.();
}

async function loadInicio() {
  try {
    const [bikeResponse, rentalResponse] = await Promise.all([
      fetch(`${dashboardApi}/bikes`).then(response => response.json()),
      fetch(`${dashboardApi}/rentals/meus`, { headers: dashboardHeaders }).then(response => response.json())
    ]);

    const rentals = rentalResponse.alugueis || [];
    const available = (bikeResponse.bikes || []).filter(bike => bike.quantidadeDisponivel > 0 && !bike.bloqueada).length;
    const active = rentals.filter(rental => ['ativo', 'aguardando_locacao', 'agendada'].includes(rental.status)).length;

    document.getElementById('navAv').textContent = dashboardUser.nome ? dashboardUser.nome[0].toUpperCase() : 'U';
    document.getElementById('navNm').textContent = dashboardUser.nome ? dashboardUser.nome.split(' ')[0] : 'Usuário';
    (function(){ const el = document.getElementById('navRole'); if (el) el.textContent = { admin:'ADMIN', funcionario:'FUNC.', user:'USUÁRIO', cliente:'USUÁRIO' }[dashboardRole] || 'USUÁRIO'; })();
    document.getElementById('greetMsg').textContent = `Olá, ${dashboardUser.nome ? dashboardUser.nome.split(' ')[0] : 'ciclista'}.`;
    document.getElementById('wBikes').textContent = String(available);
    document.getElementById('wLoc').textContent = String(rentals.length);
    document.getElementById('wAtiv').textContent = String(active);

    const highlight = rentals.find(rental => ['ativo', 'aguardando_locacao', 'agendada', 'aguardando_vistoria'].includes(rental.status));
    const target = document.getElementById('locAtivaResume');

    if (!highlight) {
      target.innerHTML = `
        <div class="empty-state">
          <strong>Nenhum aluguel ativo</strong>
          <span>Escolha uma bicicleta em nosso catálogo para começar.</span>
          <button class="btn btn-primary" type="button" onclick="showSec('locar',document.getElementById('nav-locar'))">Ver catálogo</button>
        </div>
      `;
      return;
    }

    const progress = getRentalProgress(highlight);
    target.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Seu aluguel atual</span>
          ${statusBadge(highlight.status)}
        </div>
        <div class="card-body">
          <div class="rental-bike-name">${dashEscape(highlight.bikeNome)}</div>
          <div class="rental-meta">${dashEscape(highlight.planoLabel)} | Devolução prevista em ${formatDashboardDate(highlight.dataDevolucaoPrevista)}</div>
          <div class="rental-progress-bar" style="margin:16px 0 10px;"><div class="rental-progress-fill" style="width:${progress}%"></div></div>
          <div class="rental-actions">
            ${paymentBadge(highlight.pagamento)}
            <button class="btn btn-secondary btn-sm" type="button" onclick="showSec('locacoes',document.getElementById('nav-locacoes'))">Ver detalhes</button>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showToast('Erro ao carregar o painel inicial.', 'error');
  }
}

function renderDashboardFilters() {
  const container = document.getElementById('filterBtns');
  if (!container) return;
  const categories = [...new Set(dashboardState.bikes.map(bike => bike.categoria))];
  const buttons = [{ label: 'Todos', value: '' }, ...categories.map(category => ({ label: category, value: category }))];
  container.innerHTML = buttons
    .map(button => `<button class="filter-btn ${button.value === dashboardState.activeCategory ? 'active' : ''}" type="button" data-cat="${dashEscape(button.value)}">${dashEscape(button.label)}</button>`)
    .join('');
}

function renderDashboardGrid() {
  const grid = document.getElementById('dashBikeGrid');
  if (!grid) return;
  const visibleBikes = dashboardState.activeCategory ? dashboardState.bikes.filter(bike => bike.categoria === dashboardState.activeCategory) : dashboardState.bikes;

  if (!visibleBikes.length) {
    grid.innerHTML = `<div class="empty-state"><strong>Nenhuma bike encontrada</strong><span>Tente outra categoria.</span></div>`;
    return;
  }

  grid.innerHTML = visibleBikes
    .map(bike => {
      const available = bike.quantidadeDisponivel > 0;
      const specs = bikeTraits(bike.categoria).map(item => `<span class="bike-spec">${dashEscape(item)}</span>`).join('');
      return `
        <article class="bike-card">
          <div class="bike-img">
            <span class="bike-badge ${available ? 'disponivel' : 'esgotado'}">${available ? '● Disponível' : '● Esgotado'}</span>
            <img src="${dashEscape(normalizeImagePath(bike.imagem))}" alt="${dashEscape(bike.nome)}" loading="lazy" onerror="this.outerHTML='<span class=&quot;bike-photo-label&quot;>Imagem indisponível</span>'">
          </div>
          <div class="bike-body">
            <div class="bike-cat">${dashEscape(bike.categoria)}</div>
            <div class="bike-name">${dashEscape(bike.nome)}</div>
            <div class="bike-desc">${dashEscape(bike.descricao || 'Bike pronta para uso com entrega em casa.')}</div>
            <div class="bike-specs">${specs}</div>
            <div class="bike-footer">
              <div>
                <div class="bike-price">${dashEscape(formatCurrency(bike.precos?.semanal))}<span> / semana</span></div>
                <div class="bike-qty">${available ? `${bike.quantidadeDisponivel} unidade${bike.quantidadeDisponivel !== 1 ? 's' : ''} disponível` : '<span style="color:var(--danger)">Sem estoque</span>'}</div>
              </div>
              <button class="btn ${available ? 'btn-primary' : 'btn-secondary'} btn-sm" type="button" onclick="openModal(${bike.id})" ${available ? '' : 'disabled'}>
                ${available ? 'Assinar' : 'Indisponível'}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  if (dashboardState.pendingBikeId) {
    const targetBike = dashboardState.bikes.find(bike => bike.id === dashboardState.pendingBikeId);
    if (targetBike) openModal(targetBike.id);
    dashboardState.pendingBikeId = null;
  }
}

async function loadLocar() {
  const lock = document.getElementById('locBloq');
  const grid = document.getElementById('dashBikeGrid');
  lock.style.display = 'none';

  try {
    const rentals = await fetch(`${dashboardApi}/rentals/meus`, { headers: dashboardHeaders }).then(response => response.json());
    const now = new Date();
    const overdueRental = (rentals.alugueis || []).find(rental =>
      rental.status === 'ativo' &&
      rental.dataDevolucaoPrevista &&
      new Date(rental.dataDevolucaoPrevista) < now
    );
    if (overdueRental) {
      lock.textContent = `Você possui a locação #${overdueRental.id} em atraso. Devolva a bike atual antes de contratar outra.`;
      lock.style.display = 'block';
      grid.innerHTML = '';
      return;
    }
  } catch (error) {
    lock.textContent = 'Não foi possível validar suas locações existentes. Tente novamente em instantes.';
    lock.style.display = 'block';
  }

  try {
    const data = await fetch(`${dashboardApi}/bikes`).then(response => response.json());
    let bikes = (data.bikes || []).filter(bike => !bike.removida && !bike.bloqueada);

    // MOCK DATA FOR PREVIEW
    if (bikes.length === 0) {
      bikes = [
        { id: 1, nome: 'Pedala Pro Trail', categoria: 'Mountain Bike', preco: 259.90, quantidadeDisponivel: 5, imagem: 'assets/images/hero-bike.png', precos: { semanal: 89, quinzenal: 159, mensal: 259 } },
        { id: 2, nome: 'Pedala City Plus', categoria: 'Urbana', preco: 189.90, quantidadeDisponivel: 3, imagem: 'assets/images/hero-bike.png', precos: { semanal: 59, quinzenal: 109, mensal: 189 } },
        { id: 3, nome: 'Pedala Kids', categoria: 'Infantil', preco: 99.90, quantidadeDisponivel: 0, imagem: 'assets/images/hero-bike.png', precos: { semanal: 39, quinzenal: 69, mensal: 99 } }
      ];
    }
    dashboardState.bikes = bikes;
    dashboardState.activeCategory = '';
    renderDashboardFilters();
    renderDashboardGrid();
  } catch (error) {
    grid.innerHTML = `<div class="empty-state"><strong>Falha ao carregar o catálogo</strong><span>Confira se o backend está ativo e tente novamente.</span></div>`;
  }
}

async function loadLocacoes() {
  const target = document.getElementById('locList');
  try {
    const response = await fetch(`${dashboardApi}/rentals/meus`, { headers: dashboardHeaders }).then(request => request.json());
    const rentals = response.alugueis || [];

    if (!rentals.length) {
      target.innerHTML = `<div class="empty-state"><strong>Nenhum aluguel encontrado</strong><span>Escolha sua bicicleta e comece a pedalar.</span><button class="btn btn-primary" type="button" onclick="showSec('locar',document.getElementById('nav-locar'))">Ver catálogo</button></div>`;
      return;
    }

    target.innerHTML = rentals
      .map(rental => {
        const progress = getRentalProgress(rental);
        const pendingBill = (rental.faturas || []).find(bill => bill.status === 'pendente' || bill.status === 'rejeitado');
        const insuranceInfo = rental.tipoSeguro
          ? `${formatInsuranceLabel(rental.tipoSeguro)}${Number(rental.valorSeguro) > 0 ? ` (${formatCurrency(rental.valorSeguro)} por ciclo)` : ''}`
          : '';
        return `
          <article class="rental-card">
            <div class="rental-header">
              <div>
                <div class="rental-bike-name">${dashEscape(rental.bikeNome)}</div>
                <div class="rental-meta">${dashEscape(rental.planoLabel)} | Início em ${formatDashboardDate(rental.dataInicio)}</div>
              </div>
              <div class="rental-actions">${statusBadge(rental.status)}${paymentBadge(rental.pagamento)}</div>
            </div>
            <div class="info-row"><span class="info-label">Devolução prevista</span><span class="info-value">${formatDashboardDate(rental.dataDevolucaoPrevista)}</span></div>
            <div class="info-row"><span class="info-label">Valor atual</span><span class="info-value">${dashEscape(formatCurrency(rental.preco))}</span></div>
            ${insuranceInfo ? `<div class="info-row"><span class="info-label">Seguro</span><span class="info-value">${dashEscape(insuranceInfo)}</span></div>` : ''}
            <div class="info-row"><span class="info-label">Dias restantes</span><span class="info-value">${formatRentalDaysRemaining(rental)}</span></div>
            ${pendingBill ? `<div class="info-row"><span class="info-label">Proxima fatura</span><span class="info-value">${dashEscape(formatCurrency(pendingBill.valor))}</span></div>` : ''}
            ${['ativo', 'aguardando_locacao', 'agendada'].includes(rental.status) ? `<div class="rental-progress-bar" style="margin:16px 0 10px;"><div class="rental-progress-fill" style="width:${progress}%"></div></div>` : ''}
            <div class="rental-actions">
              ${pendingBill ? `<button class="btn btn-primary btn-sm" type="button" onclick="solicitarPagFatura(${rental.id},'${pendingBill.id}')">Solicitar pagamento</button>` : ''}
              ${rental.status === 'ativo' ? `<button class="btn btn-secondary btn-sm" type="button" onclick="solicDevol(${rental.id})">Solicitar devolução</button>` : ''}
              ${rental.status === 'ativo' && rental.diasRestantes <= 2 ? `<button class="btn btn-secondary btn-sm" type="button" onclick="renovar(${rental.id})">Renovar contrato</button>` : ''}
              <button class="btn btn-ghost btn-sm" type="button" onclick="baixarContrato(${rental.id})">Ver contrato</button>
            </div>
          </article>
        `;
      })
      .join('');
  } catch (error) {
    target.innerHTML = `<div class="empty-state"><strong>Falha ao carregar locacoes</strong><span>Tente atualizar novamente.</span></div>`;
  }
}

async function loadPerfil() {
  try {
    const { ok, data } = await apiJson('/auth/me', { auth: true });
    if (!ok) throw new Error();
    const user = data.usuario || data;
    const addr = user.endereco || {};
    const addrStr = addr.logradouro
      ? `${addr.logradouro}, ${addr.numero || 'S/N'}${addr.complemento ? ' ' + addr.complemento : ''} — ${addr.bairro}, ${addr.cidade}/${addr.uf}`
      : null;

    document.getElementById('perfilContent').innerHTML = `
      <div class="info-row"><span class="info-label">Nome</span><span class="info-value">${dashEscape(user.nome || '-')}</span></div>
      <div class="info-row"><span class="info-label">E-mail</span><span class="info-value">${dashEscape(user.email || '-')}</span></div>
      <div class="info-row"><span class="info-label">CPF</span><span class="info-value">${dashEscape(user.cpf || '-')}</span></div>
      <div class="info-row"><span class="info-label">Telefone</span><span class="info-value">${dashEscape(user.telefone || '-')}</span></div>
      <div class="info-row" style="align-items:flex-start;">
        <span class="info-label">Endereço de entrega</span>
        <div style="display:flex;flex-direction:column;gap:6px;flex:1;">
          ${addrStr
            ? `<span class="info-value">${dashEscape(addrStr)}</span>`
            : `<span class="info-value" style="color:var(--text-muted);">⚠ Não informado — necessário para entrega</span>`
          }
          <button class="btn btn-ghost btn-sm" style="align-self:flex-start;font-size:0.78rem;padding:2px 10px;" onclick="toggleAddrForm()">
            ${addrStr ? '✏ Editar endereço' : '📍 Adicionar endereço'}
          </button>
          <div id="addrForm" style="display:none;margin-top:4px;">
            <div style="display:grid;grid-template-columns:1fr 80px;gap:8px;margin-bottom:8px;">
              <input type="text" id="pfLogradouro" placeholder="Rua / Avenida" class="form-input" style="font-size:0.85rem;" value="${dashEscape(addr.logradouro || '')}">
              <input type="text" id="pfNumero" placeholder="Nº" class="form-input" style="font-size:0.85rem;" value="${dashEscape(addr.numero || '')}">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
              <input type="text" id="pfBairro" placeholder="Bairro" class="form-input" style="font-size:0.85rem;" value="${dashEscape(addr.bairro || '')}">
              <input type="text" id="pfCidade" placeholder="Cidade" class="form-input" style="font-size:0.85rem;" value="${dashEscape(addr.cidade || 'São Paulo')}">
            </div>
            <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;margin-bottom:10px;">
              <input type="text" id="pfCep" placeholder="CEP" class="form-input" style="font-size:0.85rem;" maxlength="9" value="${dashEscape(addr.cep || '')}">
              <input type="text" id="pfComplemento" placeholder="Complemento (opcional)" class="form-input" style="font-size:0.85rem;" value="${dashEscape(addr.complemento || '')}">
            </div>
            <button class="btn btn-primary btn-sm" onclick="salvarEndereco()">Salvar endereço</button>
          </div>
        </div>
      </div>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="openSenhaModal()">Alterar senha</button>
        <button class="btn btn-danger btn-sm" onclick="openExcluirContaModal()">Excluir minha conta</button>
      </div>
    `;
  } catch (error) {
    document.getElementById('perfilContent').innerHTML = `<div class="empty-state"><strong>Falha ao carregar perfil</strong><span>Tente novamente em instantes.</span></div>`;
  }
}

function toggleAddrForm() {
  const f = document.getElementById('addrForm');
  if (f) f.style.display = f.style.display === 'none' ? '' : 'none';
}

async function salvarEndereco() {
  const logradouro = document.getElementById('pfLogradouro')?.value?.trim();
  if (!logradouro) { showToast('Informe o logradouro.', 'error'); return; }
  try {
    const r = await fetch(`${dashboardApi}/auth/me`, {
      method: 'PUT',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({
        endereco: {
          cep:         document.getElementById('pfCep')?.value?.trim() || '',
          logradouro,
          numero:      document.getElementById('pfNumero')?.value?.trim() || 'S/N',
          bairro:      document.getElementById('pfBairro')?.value?.trim() || '',
          cidade:      document.getElementById('pfCidade')?.value?.trim() || 'São Paulo',
          uf:          'SP',
          complemento: document.getElementById('pfComplemento')?.value?.trim() || ''
        }
      })
    });
    if (r.ok) {
      showToast('Endereço salvo com sucesso!', 'success');
      loadPerfil();
    } else {
      showToast('Erro ao salvar endereço.', 'error');
    }
  } catch (_) {
    showToast('Erro de conexão.', 'error');
  }
}

async function openModal(id) {
  const bike = dashboardState.bikes.find(item => item.id === Number(id));
  if (!bike) return;

  dashboardState.selectedBike = bike;
  dashboardState.selectedPlan = '';
  dashboardState.selectedInsurance = null;
  dashboardState.selectedPlanoId   = null;
  document.getElementById('modalBikeImage').src = normalizeImagePath(bike.imagem);
  document.getElementById('modalBikeName').textContent = bike.nome;
  document.getElementById('modalBikeDesc').textContent = bike.descricao || 'Bike pronta para assinatura com entrega em casa.';
  document.getElementById('modalBikeDescStep2').textContent = bike.descricao || 'Defina o plano e a data de início para concluir a solicitação.';
  document.getElementById('modalBikeCatBadge').textContent = bike.categoria;
  document.getElementById('modalBikeAvailability').textContent = `${bike.quantidadeDisponivel} unidade(s) disponível(is)`;
  document.getElementById('modalBikePriceHint').textContent = formatCurrency(bike.precos?.semanal);
  document.getElementById('modalError').style.display = 'none';

  const today = new Date().toISOString().split('T')[0];
  const max = new Date(Date.now() + 4 * 864e5).toISOString().split('T')[0];
  const dateInput = document.getElementById('dataInicio');
  dateInput.min = today;
  dateInput.max = max;
  dateInput.value = today;

  document.getElementById('planOptions').innerHTML = getRentalPlanOptions()
    .map(option => `
      <div class="plan-option" data-plan="${option.key}" onclick="selPlan('${option.key}',this)">
        <div class="plan-option-name">${option.label}</div>
        <div class="plan-option-price">${formatCurrency(bike.precos?.[option.key])}</div>
        <div style="color:var(--text-secondary);font-size:0.9rem;margin-top:6px;">${option.description}</div>
      </div>
    `)
    .join('');

  // Carrega planos dinâmicos da API para esta bike
  const seguroEl = document.getElementById('seguroOptions');
  if (seguroEl) {
    seguroEl.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">Carregando planos…</p>';
    try {
      const r = await fetch(`${dashboardApi}/planos/bike/${bike.id}`);
      const planos = r.ok ? await r.json() : [];
      if (planos.length) {
        seguroEl.innerHTML = planos.map((p, i) => `
          <div class="plan-option ${i === 0 ? 'selected' : ''}" data-plano-id="${p.id}" onclick="selPlano(${p.id},'${dashEscape(p.nome)}',this)">
            <div class="plan-option-name">${dashEscape(p.nome)}</div>
            <div class="plan-option-price">${Number(p.valorAdicional) > 0 ? `+ ${formatCurrency(p.valorAdicional)}` : 'Incluso'}</div>
            <div style="color:var(--text-secondary);font-size:0.82rem;margin-top:6px;">${dashEscape(p.descricao || _coberturaResumo(p))}</div>
          </div>
        `).join('');
        // Pré-seleciona o primeiro plano
        selPlano(planos[0].id, planos[0].nome, seguroEl.querySelector('.plan-option'));
      } else {
        // Fallback: planos legados hardcoded
        seguroEl.innerHTML = _renderInsuranceLegado();
        selSeguro('Basico', seguroEl.querySelector('.plan-option'));
      }
    } catch {
      seguroEl.innerHTML = _renderInsuranceLegado();
      selSeguro('Basico', seguroEl.querySelector('.plan-option'));
    }
  }

  document.getElementById('modalStep1').style.display = '';
  document.getElementById('modalStep2').style.display = 'none';
  document.getElementById('modalOverlay').classList.add('open');
}

function _coberturaResumo(p) {
  const tags = [];
  if (p.cobreDuvidaFatura) tags.push('Fatura');
  if (p.cobreManutencao)   tags.push('Manutenção');
  if (p.cobreAvaria)       tags.push('Avaria');
  if (p.cobreOutros)       tags.push('Outros');
  return tags.length ? `Cobre: ${tags.join(', ')}` : 'Apenas consultas básicas';
}

function _renderInsuranceLegado() {
  return getInsuranceOptions().map((option, i) => `
    <div class="plan-option ${i === 0 ? 'selected' : ''}" data-insurance="${dashEscape(option.key)}" onclick="selSeguro(this.dataset.insurance,this)">
      <div class="plan-option-name">${dashEscape(option.label)}</div>
      <div class="plan-option-price">${option.price > 0 ? `+ ${formatCurrency(option.price)}` : 'Incluso'}</div>
      <div style="color:var(--text-secondary);font-size:0.9rem;margin-top:6px;">${dashEscape(option.description)}</div>
    </div>
  `).join('');
}

function selPlano(planoId, planoNome, element) {
  dashboardState.selectedPlanoId   = planoId;
  dashboardState.selectedInsurance = planoNome;
  document.querySelectorAll('.plan-option[data-plano-id]').forEach(el => el.classList.remove('selected'));
  if (element) element.classList.add('selected');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('modalStep1').style.display = '';
  document.getElementById('modalStep2').style.display = 'none';
}

async function goToLocacao() {
  document.getElementById('modalStep1').style.display = 'none';
  document.getElementById('modalStep2').style.display = '';
  // mostrar form de endereço somente se o usuário não tiver endereço salvo
  try {
    const r = await fetch(`${dashboardApi}/auth/me`, { headers: dashboardHeaders });
    const d = await r.json();
    const user = d.usuario || d;
    const hasAddr = user.endereco?.logradouro;
    const section = document.getElementById('enderecoSection');
    if (section) section.style.display = hasAddr ? 'none' : '';
    // se já tem endereço, pré-preencher campos ocultos pra não sobrescrever
    if (hasAddr && section) {
      document.getElementById('endLogradouro').value = user.endereco.logradouro || '';
      document.getElementById('endNumero').value    = user.endereco.numero || '';
      document.getElementById('endBairro').value    = user.endereco.bairro || '';
      document.getElementById('endCidade').value    = user.endereco.cidade || 'São Paulo';
      document.getElementById('endCep').value       = user.endereco.cep || '';
    }
  } catch (_) {}
}

function backToBikeInfo() {
  document.getElementById('modalStep2').style.display = 'none';
  document.getElementById('modalStep1').style.display = '';
}

function selPlan(plan, element) {
  dashboardState.selectedPlan = plan;
  document.querySelectorAll('.plan-option[data-plan]').forEach(option => option.classList.remove('selected'));
  element.classList.add('selected');
}

function selSeguro(tipoSeguro, element) {
  dashboardState.selectedInsurance = tipoSeguro;
  document.querySelectorAll('.plan-option[data-insurance]').forEach(option => option.classList.remove('selected'));
  element.classList.add('selected');
}

function ensureRenewModal() {
  if (document.getElementById('renewModalOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'renewModalOverlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:560px;">
      <h2 class="modal-title">Renovar contrato</h2>
      <p style="color:var(--text-secondary);margin:8px 0 18px;">Escolha por quanto tempo deseja estender a locação atual.</p>
      <div class="plan-options" id="renewPlanOptions"></div>
      <div id="renewModalError" class="form-block" style="display:none;color:var(--danger);background:var(--danger-bg);border-color:var(--danger-border);margin-top:12px;"></div>
      <div class="hero-actions" style="justify-content:flex-end;margin-top:18px;">
        <button class="btn btn-secondary" type="button" onclick="closeRenewModal()">Cancelar</button>
        <button class="btn btn-primary" type="button" id="renewConfirmBtn" onclick="confirmarRenovacao()">Confirmar renovação</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', event => {
    if (event.target === event.currentTarget) closeRenewModal();
  });
  document.body.appendChild(overlay);
}

function renderRenewPlanOptions() {
  const container = document.getElementById('renewPlanOptions');
  if (!container) return;
  container.innerHTML = getRentalPlanOptions()
    .map(option => `
      <div class="plan-option ${option.key === dashboardState.selectedRenewPlan ? 'selected' : ''}" data-renew-plan="${option.key}" onclick="selRenewPlan('${option.key}',this)">
        <div class="plan-option-name">${option.label}</div>
        <div class="plan-option-price">${option.description}</div>
        <div style="color:var(--text-secondary);font-size:0.9rem;margin-top:6px;">Adicionar ao contrato</div>
      </div>
    `)
    .join('');
}

function closeRenewModal() {
  document.getElementById('renewModalOverlay')?.classList.remove('open');
  dashboardState.renewalRentalId = null;
}

function selRenewPlan(plan, element) {
  dashboardState.selectedRenewPlan = plan;
  document.querySelectorAll('.plan-option[data-renew-plan]').forEach(option => option.classList.remove('selected'));
  element.classList.add('selected');
}

async function confirmarLocacao() {
  const errorBox = document.getElementById('modalError');
  const button = document.getElementById('confirmBtn');

  errorBox.style.display = 'none';
  if (!dashboardState.selectedBike || !dashboardState.selectedPlan) {
    errorBox.textContent = 'Selecione um plano antes de continuar.';
    errorBox.style.display = 'block';
    return;
  }

  button.disabled = true;
  button.textContent = 'Confirmando...';

  // salvar endereço no perfil se o form estiver visível e preenchido
  const endSection = document.getElementById('enderecoSection');
  if (endSection && endSection.style.display !== 'none') {
    const logradouro = document.getElementById('endLogradouro')?.value?.trim();
    if (!logradouro) {
      errorBox.textContent = 'Informe o endereço de entrega para continuar.';
      errorBox.style.display = 'block';
      button.disabled = false;
      button.textContent = 'Confirmar locação';
      return;
    }
    try {
      await fetch(`${dashboardApi}/auth/me`, {
        method: 'PUT',
        headers: dashboardJsonHeaders,
        body: JSON.stringify({
          endereco: {
            cep:          document.getElementById('endCep')?.value?.trim() || '',
            logradouro,
            numero:       document.getElementById('endNumero')?.value?.trim() || 'S/N',
            bairro:       document.getElementById('endBairro')?.value?.trim() || '',
            cidade:       document.getElementById('endCidade')?.value?.trim() || 'São Paulo',
            uf:           'SP',
            complemento:  document.getElementById('endComplemento')?.value?.trim() || ''
          }
        })
      });
    } catch (_) { /* salva best-effort */ }
  }

  try {
    const rentalBody = {
      bikeId:    dashboardState.selectedBike.id,
      tipo:      dashboardState.selectedPlan,
      dataInicio: document.getElementById('dataInicio').value,
    };
    // Novo sistema: planoId; fallback legado: tipoSeguro
    if (dashboardState.selectedPlanoId) {
      rentalBody.planoId = dashboardState.selectedPlanoId;
    } else {
      rentalBody.tipoSeguro = dashboardState.selectedInsurance || 'Basico';
    }
    const response = await fetch(`${dashboardApi}/rentals`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify(rentalBody)
    });

    const data = await response.json();
    if (!response.ok) {
      errorBox.textContent = data.error || 'Não foi possível criar a locação.';
      errorBox.style.display = 'block';
      return;
    }

    closeModal();
    showToast(data.message || 'Locação criada com sucesso.', 'success');
    showSec('locacoes', document.getElementById('nav-locacoes'));
    loadInicio();
  } catch (error) {
    errorBox.textContent = 'Erro de conexão com o servidor.';
    errorBox.style.display = 'block';
  } finally {
    button.disabled = false;
    button.textContent = 'Confirmar locação';
  }
}

async function solicitarPagFatura(id, billId) {
  const response = await fetch(`${dashboardApi}/rentals/${id}/faturas/${billId}/pagar`, { method: 'POST', headers: dashboardHeaders });
  const data = await response.json();
  showToast(data.message || data.error || 'Atualização realizada.', response.ok ? 'success' : 'error');
  if (response.ok) loadLocacoes();
}

async function solicDevol(id) {
  const response = await fetch(`${dashboardApi}/rentals/${id}/solicitar-devolucao`, { method: 'PUT', headers: dashboardHeaders });
  const data = await response.json();
  showToast(data.message || data.error || 'Solicitacao enviada.', response.ok ? 'success' : 'error');
  if (response.ok) {
    loadLocacoes();
    loadInicio();
  }
}

function renovar(id) {
  dashboardState.renewalRentalId = Number(id);
  dashboardState.selectedRenewPlan = 'mensal';
  ensureRenewModal();
  renderRenewPlanOptions();

  const errorBox = document.getElementById('renewModalError');
  const button = document.getElementById('renewConfirmBtn');
  if (errorBox) errorBox.style.display = 'none';
  if (button) {
    button.disabled = false;
    button.textContent = 'Confirmar renovação';
  }
  document.getElementById('renewModalOverlay')?.classList.add('open');
}

async function confirmarRenovacao() {
  const errorBox = document.getElementById('renewModalError');
  const button = document.getElementById('renewConfirmBtn');
  const rentalId = dashboardState.renewalRentalId;

  if (!rentalId || !dashboardState.selectedRenewPlan) {
    if (errorBox) {
      errorBox.textContent = 'Selecione um plano para renovar.';
      errorBox.style.display = 'block';
    }
    return;
  }

  if (errorBox) errorBox.style.display = 'none';
  if (button) {
    button.disabled = true;
    button.textContent = 'Renovando...';
  }

  try {
    const response = await fetch(`${dashboardApi}/rentals/${rentalId}/renovar`, {
      method: 'PUT',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ tipo: dashboardState.selectedRenewPlan })
    });
    const data = await response.json();
    showToast(data.message || data.error || 'Atualização realizada.', response.ok ? 'success' : 'error');
    if (response.ok) {
      closeRenewModal();
      loadLocacoes();
      loadInicio();
    } else if (errorBox) {
      errorBox.textContent = data.error || 'Não foi possível renovar o contrato.';
      errorBox.style.display = 'block';
    }
  } catch (error) {
    if (errorBox) {
      errorBox.textContent = 'Erro de conexão com o servidor.';
      errorBox.style.display = 'block';
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Confirmar renovação';
    }
  }
}

async function baixarContrato(id) {
  const response = await fetch(`${dashboardApi}/contratos/${id}`, { headers: dashboardHeaders });
  const data = await response.json();
  if (!response.ok) {
    showToast(data.error || 'Contrato não disponível.', 'error');
    return;
  }
  const popup = window.open('', '_blank');
  if (!popup) {
    showToast('Permita pop-ups para visualizar o contrato.', 'warning');
    return;
  }
  popup.document.write(data.contrato || data.html || '<p>Contrato não disponível.</p>');
  popup.document.close();
}

// ── Suporte / Chamados ────────────────────────────────

async function loadSuporte() {
  const target = document.getElementById('suporteList');
  try {
    const r = await fetch(`${dashboardApi}/chamados/meus`, { headers: dashboardHeaders });
    const data = await r.json();
    const chamados = Array.isArray(data) ? data : (data.tickets || []);

    if (!chamados.length) {
      target.innerHTML = `<div class="empty-state"><strong>Nenhum chamado encontrado</strong><span>Clique em "+ Abrir chamado" para solicitar suporte.</span></div>`;
      return;
    }

    const statusLabel = { aberto: 'Aberto', em_atendimento: 'Em atendimento', aguardando_pagamento: 'Aguard. pagamento', resolvido: 'Resolvido', cancelado: 'Cancelado' };
    const statusTone  = { aberto: 'badge-warning', em_atendimento: 'badge-info', aguardando_pagamento: 'badge-danger', resolvido: 'badge-success', cancelado: 'badge-muted' };
    const tipoLabel   = { manutencao: 'Manutenção', duvida_fatura: 'Dúvida na fatura', avaria: 'Avaria', outros: 'Outros' };

    target.innerHTML = chamados.map(c => `
      <article class="card" style="margin-bottom:12px;${c.status === 'aguardando_pagamento' ? 'border-color:rgba(255,100,50,.35);' : ''}">
        <div class="card-body" style="padding:14px 16px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;">
            <div>
              <div style="font-weight:600;font-size:0.95rem;">#${c.id} — ${dashEscape(tipoLabel[c.tipo] || c.tipo)}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${formatDashboardDate(c.criadoEm)}</div>
            </div>
            <span class="badge ${statusTone[c.status] || 'badge-muted'}">${statusLabel[c.status] || dashEscape(c.status)}</span>
          </div>
          <div style="font-size:0.87rem;color:var(--text-secondary);margin-bottom:10px;">${dashEscape(c.descricao)}</div>
          ${c.resolucao ? `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:10px 12px;font-size:0.84rem;"><strong>Resolução:</strong> ${dashEscape(c.resolucao)}</div>` : ''}
          ${c.custoGerado ? `<div style="margin-top:8px;font-size:0.84rem;color:${c.cobertoPLano ? 'var(--success)' : 'var(--danger)'};">
            Custo: <strong>${formatCurrency(c.custoGerado)}</strong>${c.cobertoPLano ? ' — coberto pelo plano ✓' : ''}
          </div>` : ''}
          ${c.status === 'aguardando_pagamento' ? `
            <div style="margin-top:10px;padding:10px 12px;background:rgba(255,100,50,.06);border:1px solid rgba(255,100,50,.25);border-radius:6px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
              <span style="font-size:0.84rem;color:var(--danger);font-weight:600;">⚠️ Pagamento de <strong>${formatCurrency(c.custoGerado)}</strong> necessário para concluir o chamado.</span>
              <button class="btn btn-primary btn-sm" onclick="solicitarPagamentoChamado(${c.id})">Solicitar pagamento</button>
            </div>` : ''}
        </div>
      </article>
    `).join('');
  } catch (_) {
    target.innerHTML = `<div class="empty-state"><strong>Falha ao carregar chamados</strong><span>Tente novamente em instantes.</span></div>`;
  }
}

let _suporteRentalId = null;
let _suporteTipoSelecionado = '';
let _suportePresetSelecionado = '';

const _CHAMADO_PRESETS = {
  manutencao: [
    { key: 'Freio não funciona corretamente', icon: '🛑' },
    { key: 'Câmbio com problemas', icon: '⚙️' },
    { key: 'Pneu com ar baixo ou furado', icon: '🔩' },
    { key: 'Guidão ou selim solto', icon: '🔧' },
    { key: 'Corrente solta ou quebrada', icon: '🔗' },
    { key: 'Outro problema mecânico', icon: '🔨' },
  ],
  duvida_fatura: [
    { key: 'Valor cobrado incorreto', icon: '💰' },
    { key: 'Fatura não reconhecida', icon: '❓' },
    { key: 'Dúvida sobre desconto aplicado', icon: '🏷️' },
    { key: 'Prazo de pagamento', icon: '📅' },
    { key: 'Cobrança em duplicidade', icon: '🔄' },
  ],
  avaria: [
    { key: 'Arranhão ou amassado na estrutura', icon: '⚠️' },
    { key: 'Acessório quebrado (cesta, lanterna, etc.)', icon: '💥' },
    { key: 'Dano mecânico grave', icon: '🚨' },
    { key: 'Roubo ou furto de parte da bike', icon: '🔒' },
    { key: 'Bike perdida ou roubada completamente', icon: '🚨' },
  ],
  outros: [
    { key: 'Dúvida sobre o contrato', icon: '📄' },
    { key: 'Solicitação de troca de bike', icon: '🔄' },
    { key: 'Problema no aplicativo ou portal', icon: '📱' },
    { key: 'Outro assunto', icon: '💬' },
  ],
};

const _CHAMADO_TIPO_INFO = {
  manutencao:    { icon: '🔧', label: 'Manutenção', prioridade: 'alta' },
  duvida_fatura: { icon: '💳', label: 'Dúvida na fatura', prioridade: 'normal' },
  avaria:        { icon: '⚠️', label: 'Avaria / Dano', prioridade: 'alta' },
  outros:        { icon: '💬', label: 'Outros', prioridade: 'normal' },
};

async function openAbrirChamadoModal() {
  const info = document.getElementById('abrirChamadoLocacaoInfo');
  _suporteRentalId = null;
  _suporteTipoSelecionado = '';
  _suportePresetSelecionado = '';

  document.getElementById('chamadoStep1').style.display = '';
  document.getElementById('chamadoStep2').style.display = 'none';
  document.querySelectorAll('.chamado-tipo-card').forEach(b => b.classList.remove('selected'));

  const erro = document.getElementById('abrirChamadoErro');
  if (erro) { erro.style.display = 'none'; erro.textContent = ''; }
  const desc = document.getElementById('chamadoDescricao');
  if (desc) desc.value = '';

  try {
    const r = await fetch(`${dashboardApi}/rentals/meus`, { headers: dashboardHeaders });
    const d = await r.json();
    const active = (d.alugueis || []).find(al => al.status !== 'finalizado');
    if (active) {
      _suporteRentalId = active.id;
      if (info) {
        info.style.display = '';
        info.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><strong>Locação #${active.id}</strong> — ${dashEscape(active.bikeNome)}`;
      }
    } else {
      if (info) {
        info.style.display = '';
        info.innerHTML = `<span style="color:var(--danger);">Nenhuma locação ativa. É necessário ter uma locação para abrir um chamado.</span>`;
      }
    }
  } catch (_) {
    if (info) info.style.display = 'none';
  }

  document.getElementById('abrirChamadoModal').classList.add('open');
}

function selecionarTipoChamado(tipo, el) {
  _suporteTipoSelecionado = tipo;
  _suportePresetSelecionado = '';
  document.querySelectorAll('.chamado-tipo-card').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');

  const info = _CHAMADO_TIPO_INFO[tipo];
  const badge = document.getElementById('chamadoTipoSelecionadoBadge');
  if (badge) badge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:6px 12px;font-size:0.84rem;font-weight:600;">${info.icon} ${dashEscape(info.label)}</span>`;

  const presets = _CHAMADO_PRESETS[tipo] || [];
  const container = document.getElementById('chamadoPresets');
  container.innerHTML = presets.map(p => `
    <button type="button" class="chamado-preset-btn" onclick="selecionarPreset(this,'${dashEscape(p.key)}')">
      <span class="preset-check"></span>
      <span>${p.icon} ${dashEscape(p.key)}</span>
    </button>
  `).join('');

  const descLabel = document.getElementById('chamadoDescLabel');
  if (descLabel) descLabel.innerHTML = tipo === 'outros'
    ? 'Descreva o problema <span style="font-size:0.76rem;color:var(--text-muted);">(obrigatório)</span>'
    : 'Detalhes adicionais <span style="font-size:0.76rem;color:var(--text-muted);">(opcional)</span>';

  document.getElementById('chamadoStep1').style.display = 'none';
  document.getElementById('chamadoStep2').style.display = '';
}

function selecionarPreset(el, texto) {
  _suportePresetSelecionado = texto;
  document.querySelectorAll('.chamado-preset-btn').forEach(b => {
    b.classList.remove('selected');
    const chk = b.querySelector('.preset-check');
    if (chk) chk.textContent = '';
  });
  el.classList.add('selected');
  const chk = el.querySelector('.preset-check');
  if (chk) chk.textContent = '✓';
}

function voltarTipoChamado() {
  _suporteTipoSelecionado = '';
  _suportePresetSelecionado = '';
  document.getElementById('chamadoStep2').style.display = 'none';
  document.getElementById('chamadoStep1').style.display = '';
  document.querySelectorAll('.chamado-tipo-card').forEach(b => b.classList.remove('selected'));
}

function closeAbrirChamadoModal() {
  document.getElementById('abrirChamadoModal').classList.remove('open');
}

async function confirmarAbrirChamado() {
  const tipo       = _suporteTipoSelecionado;
  const preset     = _suportePresetSelecionado;
  const detalhes   = document.getElementById('chamadoDescricao')?.value?.trim() || '';
  const erro       = document.getElementById('abrirChamadoErro');
  const btn        = document.getElementById('btnConfirmarChamado');

  if (erro) erro.style.display = 'none';

  if (!tipo) {
    if (erro) { erro.textContent = 'Selecione o tipo do chamado.'; erro.style.display = ''; }
    return;
  }
  if (!preset && tipo !== 'outros') {
    if (erro) { erro.textContent = 'Selecione uma opção de problema.'; erro.style.display = ''; }
    return;
  }
  if (tipo === 'outros' && detalhes.length < 10) {
    if (erro) { erro.textContent = 'Descreva o problema com ao menos 10 caracteres.'; erro.style.display = ''; }
    return;
  }
  if (!_suporteRentalId) {
    if (erro) { erro.textContent = 'Nenhuma locação ativa para associar ao chamado.'; erro.style.display = ''; }
    return;
  }

  const descricao = preset
    ? (detalhes ? `${preset}. ${detalhes}` : preset)
    : detalhes;
  const prioridade = _CHAMADO_TIPO_INFO[tipo]?.prioridade || 'normal';

  btn.disabled = true;
  btn.textContent = 'Abrindo...';

  try {
    const r = await fetch(`${dashboardApi}/chamados`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ rentalId: _suporteRentalId, tipo, descricao, prioridade })
    });
    const d = await r.json();
    if (r.ok) {
      showToast(d.message || 'Chamado aberto com sucesso!', 'success');
      closeAbrirChamadoModal();
      loadSuporte();
    } else {
      if (erro) { erro.textContent = d.error || d.message || 'Erro ao abrir chamado.'; erro.style.display = ''; }
    }
  } catch (_) {
    if (erro) { erro.textContent = 'Erro de conexão.'; erro.style.display = ''; }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Abrir chamado';
  }
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (typeof closeAbrirChamadoModal === 'function') closeAbrirChamadoModal();
});

document.getElementById('filterBtns')?.addEventListener('click', event => {
  const button = event.target.closest('[data-cat]');
  if (!button) return;
  dashboardState.activeCategory = button.dataset.cat || '';
  renderDashboardFilters();
  renderDashboardGrid();
});

document.getElementById('modalOverlay')?.addEventListener('click', event => {
  if (event.target === event.currentTarget) closeModal();
});

window.sair = sair;
window.showSec = showSec;
window.openModal = openModal;
window.closeModal = closeModal;
window.goToLocacao = goToLocacao;
window.backToBikeInfo = backToBikeInfo;
window.selPlan = selPlan;
window.selSeguro = selSeguro;
window.selPlano = selPlano;
window.selRenewPlan = selRenewPlan;
window.confirmarLocacao = confirmarLocacao;
window.closeRenewModal = closeRenewModal;
window.confirmarRenovacao = confirmarRenovacao;
window.solicitarPagFatura = solicitarPagFatura;
window.solicDevol = solicDevol;
window.renovar = renovar;
// ── Alterar senha ─────────────────────────────────────
function openSenhaModal() {
  document.getElementById('pfSenhaAtual').value = '';
  document.getElementById('pfNovaSenha').value = '';
  document.getElementById('pfNovaSenhaConf').value = '';
  document.getElementById('pfSenhaErro').style.display = 'none';
  document.getElementById('senhaModal').classList.add('open');
  setTimeout(() => document.getElementById('pfSenhaAtual').focus(), 60);
}

function closeSenhaModal() {
  document.getElementById('senhaModal').classList.remove('open');
}

async function confirmarAlterarSenha() {
  const senhaAtual = document.getElementById('pfSenhaAtual').value.trim();
  const novaSenha  = document.getElementById('pfNovaSenha').value.trim();
  const conf       = document.getElementById('pfNovaSenhaConf').value.trim();
  const erroEl     = document.getElementById('pfSenhaErro');

  if (!senhaAtual || !novaSenha || !conf) {
    erroEl.textContent = 'Preencha todos os campos.'; erroEl.style.display = ''; return;
  }
  if (novaSenha.length < 3) {
    erroEl.textContent = 'A nova senha deve ter ao menos 3 caracteres.'; erroEl.style.display = ''; return;
  }
  if (novaSenha !== conf) {
    erroEl.textContent = 'As senhas não coincidem.'; erroEl.style.display = ''; return;
  }

  const btn = document.getElementById('btnConfirmarSenha');
  btn.disabled = true; btn.textContent = 'Salvando...';
  try {
    const r = await fetch(`${dashboardApi}/auth/me/senha`, {
      method: 'PUT',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({ senhaAtual, novaSenha })
    });
    const d = await r.json();
    if (r.ok) {
      showToast(d.message || 'Senha alterada com sucesso!', 'success');
      closeSenhaModal();
    } else {
      erroEl.textContent = d.message || d.error || 'Erro ao alterar senha.';
      erroEl.style.display = '';
    }
  } catch (_) {
    erroEl.textContent = 'Erro de conexão.'; erroEl.style.display = '';
  }
  btn.disabled = false; btn.textContent = 'Salvar nova senha';
}

// ── Excluir conta ─────────────────────────────────────
function openExcluirContaModal() {
  document.getElementById('excluirContaModal').classList.add('open');
}

function closeExcluirContaModal() {
  document.getElementById('excluirContaModal').classList.remove('open');
}

async function confirmarExcluirConta() {
  const btn = document.getElementById('btnConfirmarExcluir');
  btn.disabled = true; btn.textContent = 'Excluindo...';
  try {
    const r = await fetch(`${dashboardApi}/auth/me`, { method: 'DELETE', headers: dashboardHeaders });
    const d = await r.json();
    if (r.ok) {
      showToast(d.message || 'Conta excluída.', 'success');
      setTimeout(() => {
        localStorage.removeItem('pedala_token');
        localStorage.removeItem('pedala_user');
        window.location.href = 'login.html';
      }, 1200);
    } else {
      showToast(d.message || d.error || 'Não foi possível excluir a conta.', 'error');
      closeExcluirContaModal();
    }
  } catch (_) {
    showToast('Erro de conexão.', 'error');
  }
  btn.disabled = false; btn.textContent = 'Excluir permanentemente';
}

// ── Solicitar pagamento de chamado ─────────────────────
async function solicitarPagamentoChamado(chamadoId) {
  try {
    const r = await fetch(`${dashboardApi}/chamados/${chamadoId}/pagar`, {
      method: 'PUT', headers: dashboardJsonHeaders
    });
    const d = await r.json();
    showToast(d.message || (r.ok ? 'Solicitação enviada!' : (d.error || 'Erro.')), r.ok ? 'success' : 'error');
    if (r.ok) loadSuporte();
  } catch (_) {
    showToast('Erro de conexão.', 'error');
  }
}

window.baixarContrato = baixarContrato;
window.loadLocacoes = loadLocacoes;
window.loadSuporte = loadSuporte;
window.solicitarPagamentoChamado = solicitarPagamentoChamado;
window.openAbrirChamadoModal = openAbrirChamadoModal;
window.closeAbrirChamadoModal = closeAbrirChamadoModal;
window.confirmarAbrirChamado = confirmarAbrirChamado;
window.selecionarTipoChamado = selecionarTipoChamado;
window.selecionarPreset = selecionarPreset;
window.voltarTipoChamado = voltarTipoChamado;
window.toggleAddrForm = toggleAddrForm;
window.salvarEndereco = salvarEndereco;
window.openSenhaModal = openSenhaModal;
window.closeSenhaModal = closeSenhaModal;
window.confirmarAlterarSenha = confirmarAlterarSenha;
window.openExcluirContaModal = openExcluirContaModal;
window.closeExcluirContaModal = closeExcluirContaModal;
window.confirmarExcluirConta = confirmarExcluirConta;

if (dashboardState.pendingBikeId) showSec('locar', document.getElementById('nav-locar'));
else loadInicio();
