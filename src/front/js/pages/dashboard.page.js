const dashboardToken = localStorage.getItem('pedala_token');
const dashboardUser = JSON.parse(localStorage.getItem('pedala_user') || '{}');
const dashboardApi = window.PEDALA_API_BASE;

if (!dashboardToken || dashboardUser.role !== 'user') {
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
    perfil: loadPerfil
  };

  loaders[section]?.();
}

async function loadInicio() {
  try {
    const [bikeResponse, rentalResponse] = await Promise.all([
      fetch(`${dashboardApi}/bikes`).then(response => response.json()),
      fetch(`${dashboardApi}/rentals/meus`, { headers: dashboardHeaders }).then(response => response.json())
    ]);

    let rentals = rentalResponse.alugueis || [];

    // MOCK DATA 
    if (rentals.length === 0) {
      rentals = [
        {
          id: 101,
          bikeNome: 'Pedala Pro Trail',
          planoLabel: 'Plano Mensal',
          tipo: 'mensal',
          dataInicio: new Date(Date.now() - 10 * 864e5).toISOString(),
          dataDevolucaoPrevista: new Date(Date.now() + 20 * 864e5).toISOString(),
          status: 'ativo',
          preco: 259.90,
          diasRestantes: 20,
          pagamento: { status: 'aprovado' }
        }
      ];
    }
    const available = (bikeResponse.bikes || []).filter(bike => bike.quantidadeDisponivel > 0 && !bike.bloqueada).length;
    const active = rentals.filter(rental => ['ativo', 'aguardando_locacao', 'agendada'].includes(rental.status)).length;

    document.getElementById('navAv').textContent = dashboardUser.nome ? dashboardUser.nome[0].toUpperCase() : 'U';
    document.getElementById('navNm').textContent = dashboardUser.nome ? dashboardUser.nome.split(' ')[0] : 'Usuário';
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

    const totalDays = highlight.tipo === 'semanal' ? 7 : highlight.tipo === 'quinzenal' ? 15 : 30;
    const progress = Math.max(0, Math.min(100, 100 - ((highlight.diasRestantes || 0) / totalDays) * 100));
    target.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Seu aluguel atual</span>
          ${statusBadge(highlight.status)}
        </div>
        <div class="card-body">
          <div class="rental-bike-name">${dashEscape(highlight.bikeNome)}</div>
          <div class="rental-meta">${dashEscape(highlight.planoLabel)} | Devolucao prevista em ${new Date(highlight.dataDevolucaoPrevista).toLocaleDateString('pt-BR')}</div>
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
          <div class="bike-photo">
            <span class="bike-signal">${available ? 'Disponivel' : 'Sem estoque'}</span>
            <img src="${dashEscape(normalizeImagePath(bike.imagem))}" alt="${dashEscape(bike.nome)}" loading="lazy" onerror="this.outerHTML='<span class=&quot;bike-photo-label&quot;>Imagem indisponivel</span>'">
          </div>
          <div class="bike-info">
            <div class="bike-head">
              <div>
                <div class="bike-name">${dashEscape(bike.nome)}</div>
                <div class="bike-cat">${dashEscape(bike.categoria)}</div>
              </div>
            </div>
            <div class="bike-desc">${dashEscape(bike.descricao || 'Bike pronta para uso com entrega em casa.')}</div>
            <div class="bike-specs">${specs}</div>
            <div class="bike-footer">
              <div>
                <div class="bike-price">${dashEscape(formatCurrency(bike.precos?.semanal))}<span class="bike-price-label">/ semana</span></div>
                <div class="bike-qty" style="${available ? '' : 'color:var(--danger);'}">${available ? `${bike.quantidadeDisponivel} disponivel(is)` : 'Indisponivel'}</div>
              </div>
              <button class="btn ${available ? 'btn-primary' : 'btn-secondary'} btn-sm" type="button" onclick="openModal(${bike.id})" ${available ? '' : 'disabled'}>${available ? 'Ver detalhes' : 'Sem estoque'}</button>
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
    const activeRental = (rentals.alugueis || []).find(rental => rental.status !== 'finalizado');
    if (activeRental) {
      lock.textContent = `Voce ja possui a locacao #${activeRental.id}. Finalize ou devolva a atual antes de contratar outra bike.`;
      lock.style.display = 'block';
      grid.innerHTML = '';
      return;
    }
  } catch (error) {
    lock.textContent = 'Nao foi possivel validar locacoes existentes.';
    lock.style.display = 'block';
  }

  try {
    const data = await fetch(`${dashboardApi}/bikes`).then(response => response.json());
    let bikes = (data.bikes || []).filter(bike => !bike.removida && !bike.bloqueada);

    // MOCK DATA 
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
    grid.innerHTML = `<div class="empty-state"><strong>Falha ao carregar o catalogo</strong><span>Confira se o backend esta ativo.</span></div>`;
  }
}

async function loadLocacoes() {
  const target = document.getElementById('locList');
  try {
    const response = await fetch(`${dashboardApi}/rentals/meus`, { headers: dashboardHeaders }).then(request => request.json());
    let rentals = response.alugueis || [];

    // MOCK DATA 
    if (rentals.length === 0) {
      rentals = [
        {
          id: 101,
          bikeNome: 'Pedala Pro Trail',
          planoLabel: 'Plano Mensal',
          tipo: 'mensal',
          dataInicio: new Date(Date.now() - 10 * 864e5).toISOString(),
          dataDevolucaoPrevista: new Date(Date.now() + 20 * 864e5).toISOString(),
          status: 'ativo',
          preco: 259.90,
          diasRestantes: 20,
          pagamento: { status: 'aprovado' }
        },
        {
          id: 102,
          bikeNome: 'Pedala City Plus',
          planoLabel: 'Plano Semanal',
          tipo: 'semanal',
          dataInicio: new Date().toISOString(),
          dataDevolucaoPrevista: new Date(Date.now() + 7 * 864e5).toISOString(),
          status: 'aguardando_locacao',
          preco: 89.00,
          diasRestantes: 7,
          pagamento: { status: 'nao_pago' },
          faturas: [{ id: 'f_1', valor: 89.00, status: 'pendente' }]
        }
      ];
    }

    if (!rentals.length) {
      target.innerHTML = `<div class="empty-state"><strong>Nenhum aluguel encontrado</strong><span>Escolha sua bicicleta e comece a pedalar.</span><button class="btn btn-primary" type="button" onclick="showSec('locar',document.getElementById('nav-locar'))">Ver catálogo</button></div>`;
      return;
    }

    target.innerHTML = rentals
      .map(rental => {
        const totalDays = rental.tipo === 'semanal' ? 7 : rental.tipo === 'quinzenal' ? 15 : 30;
        const progress = Math.max(0, Math.min(100, 100 - ((rental.diasRestantes || 0) / totalDays) * 100));
        const pendingBill = (rental.faturas || []).find(bill => bill.status === 'pendente' || bill.status === 'rejeitado');
        return `
          <article class="rental-card">
            <div class="rental-header">
              <div>
                <div class="rental-bike-name">${dashEscape(rental.bikeNome)}</div>
                <div class="rental-meta">${dashEscape(rental.planoLabel)} | Inicio em ${new Date(rental.dataInicio).toLocaleDateString('pt-BR')}</div>
              </div>
              <div class="rental-actions">${statusBadge(rental.status)}${paymentBadge(rental.pagamento)}</div>
            </div>
            <div class="info-row"><span class="info-label">Devolucao prevista</span><span class="info-value">${new Date(rental.dataDevolucaoPrevista).toLocaleDateString('pt-BR')}</span></div>
            <div class="info-row"><span class="info-label">Valor atual</span><span class="info-value">${dashEscape(formatCurrency(rental.preco))}</span></div>
            <div class="info-row"><span class="info-label">Dias restantes</span><span class="info-value">${rental.diasRestantes > 0 ? `${rental.diasRestantes} dias` : rental.status === 'finalizado' ? 'Finalizado' : 'Vencida'}</span></div>
            ${pendingBill ? `<div class="info-row"><span class="info-label">Proxima fatura</span><span class="info-value">${dashEscape(formatCurrency(pendingBill.valor))}</span></div>` : ''}
            ${['ativo', 'aguardando_locacao', 'agendada'].includes(rental.status) ? `<div class="rental-progress-bar" style="margin:16px 0 10px;"><div class="rental-progress-fill" style="width:${progress}%"></div></div>` : ''}
            <div class="rental-actions">
              ${pendingBill ? `<button class="btn btn-primary btn-sm" type="button" onclick="solicitarPagFatura(${rental.id},'${pendingBill.id}')">Solicitar pagamento</button>` : ''}
              ${rental.status === 'ativo' ? `<button class="btn btn-secondary btn-sm" type="button" onclick="solicDevol(${rental.id})">Solicitar devolucao</button>` : ''}
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
    const address = user.endereco || {};
    document.getElementById('perfilContent').innerHTML = `
      <div class="info-row"><span class="info-label">Nome</span><span class="info-value">${dashEscape(user.nome || '-')}</span></div>
      <div class="info-row"><span class="info-label">E-mail</span><span class="info-value">${dashEscape(user.email || '-')}</span></div>
      <div class="info-row"><span class="info-label">CPF</span><span class="info-value">${dashEscape(user.cpf || '-')}</span></div>
      <div class="info-row"><span class="info-label">Telefone</span><span class="info-value">${dashEscape(user.telefone || '-')}</span></div>
      <div class="info-row"><span class="info-label">Endereco</span><span class="info-value">${dashEscape(address.logradouro ? `${address.logradouro}, ${address.numero} - ${address.bairro}, ${address.cidade}/${address.uf}` : 'Nao informado')}</span></div>
    `;
  } catch (error) {
    document.getElementById('perfilContent').innerHTML = `<div class="empty-state"><strong>Falha ao carregar perfil</strong><span>Tente novamente em instantes.</span></div>`;
  }
}

function openModal(id) {
  const bike = dashboardState.bikes.find(item => item.id === Number(id));
  if (!bike) return;

  dashboardState.selectedBike = bike;
  dashboardState.selectedPlan = '';
  document.getElementById('modalBikeImage').src = normalizeImagePath(bike.imagem);
  document.getElementById('modalBikeName').textContent = bike.nome;
  document.getElementById('modalBikeDesc').textContent = bike.descricao || 'Bike pronta para assinatura com entrega em casa.';
  document.getElementById('modalBikeDescStep2').textContent = bike.descricao || 'Defina o plano e a data de inicio para concluir a solicitacao.';
  document.getElementById('modalBikeCatBadge').textContent = bike.categoria;
  document.getElementById('modalBikeAvailability').textContent = `${bike.quantidadeDisponivel} unidade(s) disponivel(is)`;
  document.getElementById('modalBikePriceHint').textContent = formatCurrency(bike.precos?.semanal);
  document.getElementById('modalError').style.display = 'none';

  const today = new Date().toISOString().split('T')[0];
  const max = new Date(Date.now() + 4 * 864e5).toISOString().split('T')[0];
  const dateInput = document.getElementById('dataInicio');
  dateInput.min = today;
  dateInput.max = max;
  dateInput.value = today;

  document.getElementById('planOptions').innerHTML = [
    ['semanal', 'Semanal', '7 dias'],
    ['quinzenal', 'Quinzenal', '15 dias'],
    ['mensal', 'Mensal', '30 dias']
  ]
    .map(([key, label, text]) => `
      <div class="plan-option" data-plan="${key}" onclick="selPlan('${key}',this)">
        <div class="plan-option-name">${label}</div>
        <div class="plan-option-price">${formatCurrency(bike.precos?.[key])}</div>
        <div style="color:var(--text-secondary);font-size:0.9rem;margin-top:6px;">${text}</div>
      </div>
    `)
    .join('');

  document.getElementById('modalStep1').style.display = '';
  document.getElementById('modalStep2').style.display = 'none';
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('modalStep1').style.display = '';
  document.getElementById('modalStep2').style.display = 'none';
}

function goToLocacao() {
  document.getElementById('modalStep1').style.display = 'none';
  document.getElementById('modalStep2').style.display = '';
}

function backToBikeInfo() {
  document.getElementById('modalStep2').style.display = 'none';
  document.getElementById('modalStep1').style.display = '';
}

function selPlan(plan, element) {
  dashboardState.selectedPlan = plan;
  document.querySelectorAll('.plan-option').forEach(option => option.classList.remove('selected'));
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

  try {
    const response = await fetch(`${dashboardApi}/rentals`, {
      method: 'POST',
      headers: dashboardJsonHeaders,
      body: JSON.stringify({
        bikeId: dashboardState.selectedBike.id,
        tipo: dashboardState.selectedPlan,
        dataInicio: document.getElementById('dataInicio').value
      })
    });

    const data = await response.json();
    if (!response.ok) {
      errorBox.textContent = data.error || 'Nao foi possivel criar a locacao.';
      errorBox.style.display = 'block';
      return;
    }

    closeModal();
    showToast(data.message || 'Locacao criada com sucesso.', 'success');
    showSec('locacoes', document.getElementById('nav-locacoes'));
    loadInicio();
  } catch (error) {
    errorBox.textContent = 'Erro de conexao com o servidor.';
    errorBox.style.display = 'block';
  } finally {
    button.disabled = false;
    button.textContent = 'Confirmar locacao';
  }
}

async function solicitarPagFatura(id, billId) {
  const response = await fetch(`${dashboardApi}/rentals/${id}/faturas/${billId}/pagar`, { method: 'POST', headers: dashboardHeaders });
  const data = await response.json();
  showToast(data.message || data.error || 'Atualizacao realizada.', response.ok ? 'success' : 'error');
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

async function renovar(id) {
  const tipo = window.prompt('Tipo de renovacao: semanal, quinzenal ou mensal');
  if (!tipo) return;
  const response = await fetch(`${dashboardApi}/rentals/${id}/renovar`, {
    method: 'PUT',
    headers: dashboardJsonHeaders,
    body: JSON.stringify({ tipo })
  });
  const data = await response.json();
  showToast(data.message || data.error || 'Atualizacao realizada.', response.ok ? 'success' : 'error');
  if (response.ok) loadLocacoes();
}

async function baixarContrato(id) {
  const response = await fetch(`${dashboardApi}/contratos/${id}`, { headers: dashboardHeaders });
  const data = await response.json();
  if (!response.ok) {
    showToast(data.error || 'Contrato nao disponivel.', 'error');
    return;
  }
  const popup = window.open('', '_blank');
  popup.document.write(data.contrato || data.html || '<p>Contrato nao disponivel.</p>');
  popup.document.close();
}

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
window.confirmarLocacao = confirmarLocacao;
window.solicitarPagFatura = solicitarPagFatura;
window.solicDevol = solicDevol;
window.renovar = renovar;
window.baixarContrato = baixarContrato;
window.loadLocacoes = loadLocacoes;

if (dashboardState.pendingBikeId) showSec('locar', document.getElementById('nav-locar'));
else loadInicio();
