// ── Auth ──────────────────────────────────────────────
const token = localStorage.getItem('pedala_token');
const user = JSON.parse(localStorage.getItem('pedala_user') || '{}');
if (!token || user.role !== 'admin') { alert('Acesso negado.'); location.href = 'login.html'; }

document.getElementById('navAv').textContent = user.nome ? user.nome[0].toUpperCase() : 'A';
document.getElementById('navNm').textContent = user.nome ? user.nome.split(' ')[0] : 'Admin';

const authH = { Authorization: 'Bearer ' + token };
const authHJ = { ...authH, 'Content-Type': 'application/json' };

function sair() {
    localStorage.removeItem('pedala_token');
    localStorage.removeItem('pedala_user');
    location.href = 'login.html';
}

// ── Section Navigation ────────────────────────────────
function showSec(s, el) {
    document.querySelectorAll('.sec').forEach(x => x.classList.remove('show'));
    document.getElementById('sec-' + s).classList.add('show');
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    if (el) el.classList.add('active');
    const loaders = {
        dashboard: loadDash, bikes: loadBikes,
        locacoes: loadLocacoes, pagamentos: loadPagamentos,
        gps: initGpsMap, vistorias: loadVist, usuarios: loadUsers
    };
    if (loaders[s]) loaders[s]();
}

// ── Badge helpers ─────────────────────────────────────
function sBadge(s) {
    const m = { ativo: 'badge-warning', aguardando_locacao: 'badge-purple', agendada: 'badge-purple', aguardando_vistoria: 'badge-info', finalizado: 'badge-muted' };
    const l = { ativo: 'Em uso', aguardando_locacao: 'Pendente', agendada: 'Agendada', aguardando_vistoria: 'Vistoria', finalizado: 'Finalizado' };
    return `<span class="badge ${m[s] || 'badge-muted'}">${l[s] || s}</span>`;
}

function pBadge(p) {
    if (!p) return '-';
    const m = { nao_pago: 'badge-danger', pendente: 'badge-info', aguardando_aprovacao: 'badge-warning', aprovado: 'badge-success', pago: 'badge-success', rejeitado: 'badge-danger' };
    const l = { nao_pago: 'Não pago', pendente: 'Pendente', aguardando_aprovacao: 'Pendente', aprovado: 'Pago', pago: 'Pago', rejeitado: 'Recusado' };
    return `<span class="badge ${m[p.status]}">${l[p.status] || p.status}</span>`;
}

// ── Image Upload Helpers ──────────────────────────────
function previewUpload(input, previewId, zoneId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById(previewId);
        const zone = document.getElementById(zoneId);
        const img = document.getElementById(previewId + 'Img');
        if (img) img.src = e.target.result;
        if (preview) preview.style.display = 'flex';
        if (zone) zone.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removePreview(previewId, zoneId, inputId) {
    const preview = document.getElementById(previewId);
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    if (preview) preview.style.display = 'none';
    if (zone) zone.style.display = 'flex';
    if (input) input.value = '';
}

// ── Drag & Drop for Upload Zones ─────────────────────
function setupDragDrop(zoneId, inputId, previewId) {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragging'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragging');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const input = document.getElementById(inputId);
            if (input) {
                // Simular seleção de arquivo
                const dt = new DataTransfer();
                dt.items.add(files[0]);
                input.files = dt.files;
                previewUpload(input, previewId, zoneId);
            }
        }
    });
}

// ── Dashboard ─────────────────────────────────────────
let chartLocacoesInst = null;
let chartFrotaInst = null;

async function loadDash() {
    try {
        const d = await fetch(`${API_BASE}/admin/stats`, { headers: authH }).then(r => r.json());
        document.getElementById('stTot').textContent = d.bikes.total;
        document.getElementById('stDisp').textContent = d.bikes.disponiveis;
        document.getElementById('stAlug').textContent = d.bikes.alugadas;
        document.getElementById('stAtr').textContent = d.alugueis.atrasados;
        document.getElementById('stAtiv').textContent = d.alugueis.ativos;
        document.getElementById('stAL').textContent = d.alugueis.aguardandoEntrega || 0;
        document.getElementById('stVist').textContent = d.vistorias.pendentes;
        document.getElementById('stRec').textContent = 'R$' + Number(d.receitaTotal || 0).toFixed(2);

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#f8fafc';

        if (chartLocacoesInst) chartLocacoesInst.destroy();
        const ctxLocacoes = document.getElementById('chartLocacoes');
        if (ctxLocacoes && window.Chart) {
            chartLocacoesInst = new Chart(ctxLocacoes, {
                type: 'pie',
                data: {
                    labels: ['Ativas', 'Aguard. Entrega', 'Agendadas', 'Finalizadas'],
                    datasets: [{
                        data: [d.alugueis.ativos, d.alugueis.aguardandoEntrega, d.alugueis.agendadas, d.alugueis.finalizados],
                        backgroundColor: ['#10b981', '#f59e0b', '#8b5cf6', '#64748b'],
                        borderColor: 'transparent'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor } } } }
            });
        }

        if (chartFrotaInst) chartFrotaInst.destroy();
        const ctxFrota = document.getElementById('chartFrota');
        if (ctxFrota && window.Chart) {
            chartFrotaInst = new Chart(ctxFrota, {
                type: 'doughnut',
                data: {
                    labels: ['Disponíveis', 'Alugadas'],
                    datasets: [{
                        data: [d.bikes.disponiveis, d.bikes.alugadas],
                        backgroundColor: ['#3b82f6', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor } } } }
            });
        }
    } catch (e) { showToast('Erro ao carregar dashboard.', 'error'); }
}

// ── Bikes — state for search filter ──────────────────
let allBikes = [];
let selectedBikeId = null;
let pendingBikeAction = null;

function filterBikeCards() {
    const query = (document.getElementById('bikeSearch')?.value || '').toLowerCase().trim();
    const filtered = query
        ? allBikes.filter(b => b.nome.toLowerCase().includes(query) || b.categoria.toLowerCase().includes(query))
        : allBikes;
    renderBikeCards(filtered);
}

function getBikeById(id) {
    return allBikes.find(b => Number(b.id) === Number(id));
}

function getSelectedBike() {
    return selectedBikeId ? getBikeById(selectedBikeId) : null;
}

function bikeStatusBadge(bike) {
    const available = bike.quantidadeDisponivel > 0 && !bike.bloqueada;
    if (bike.bloqueada) return '<span class="badge badge-danger">Bloqueada</span>';
    if (available) return '<span class="badge badge-success">Disponível</span>';
    return '<span class="badge badge-muted">Sem estoque</span>';
}

function bikeQtyClass(bike) {
    if (bike.quantidadeDisponivel === 0) return 'qty-zero';
    return bike.quantidadeDisponivel <= 2 ? 'qty-low' : 'qty-ok';
}

function money(value) {
    return 'R$' + Number(value || 0).toFixed(2);
}

function noPhotoHtml() {
    return `<div class="no-photo"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg><span>Sem foto</span></div>`;
}

function bikePhotoHtml(bike) {
    const imgSrc = bike.imagem ? normalizeImagePath(bike.imagem) : null;
    if (!imgSrc) return noPhotoHtml();
    return `<img src="${escHtml(imgSrc)}" alt="${escHtml(bike.nome)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">${noPhotoHtml().replace('class="no-photo"', 'class="no-photo" style="display:none;"')}`;
}

function renderBikeCards(bikes) {
    const grid = document.getElementById('bikeGrid');
    if (!bikes.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">Nenhuma bike encontrada.</div>`;
        return;
    }

    grid.innerHTML = bikes.map(b => {
        const qColor = bikeQtyClass(b);

        return `
        <div class="admin-bike-card animate-in" id="bcard-${b.id}" onclick="openBikeDetailsModal(${b.id})" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openBikeDetailsModal(${b.id});}" title="Clique para gerenciar">
            <div class="admin-bike-thumb">
                ${bikePhotoHtml(b)}
            </div>
            <div class="admin-bike-summary">
                <div class="admin-bike-name">${escHtml(b.nome)}</div>
                <div class="admin-bike-card-status">
                    ${bikeStatusBadge(b)}
                    <span class="qty-badge">
                        <span class="${qColor}">${b.quantidadeDisponivel}</span>
                        <span style="color:var(--text-muted)">/</span>
                        <span>${b.quantidade}</span>
                    </span>
                </div>
                <span class="bike-card-action">Abrir detalhes</span>
            </div>
        </div>`;
    }).join('');
}

function renderBikeDetailsModal() {
    const bike = getSelectedBike();
    if (!bike) return;

    document.getElementById('bikeDetailTitle').textContent = bike.nome || 'Bike';
    document.getElementById('bikeDetailDesc').textContent = bike.descricao || 'Sem descrição cadastrada.';
    document.getElementById('bikeDetailPhoto').innerHTML = bikePhotoHtml(bike);
    document.getElementById('bikeDetailBadges').innerHTML = `
        ${bikeStatusBadge(bike)}
        <span class="badge badge-accent">${escHtml(bike.categoria || 'Sem categoria')}</span>
    `;
    document.getElementById('bikeDetailAvailable').textContent = String(bike.quantidadeDisponivel || 0);
    document.getElementById('bikeDetailTotal').textContent = String(bike.quantidade || 0);
    document.getElementById('bikeDetailPrices').innerHTML = `
        <div class="price-cell">
            <div class="price-label">Semanal</div>
            <div class="price-value">${money(bike.precos?.semanal)}</div>
        </div>
        <div class="price-cell">
            <div class="price-label">Quinzenal</div>
            <div class="price-value">${money(bike.precos?.quinzenal)}</div>
        </div>
        <div class="price-cell">
            <div class="price-label">Mensal</div>
            <div class="price-value">${money(bike.precos?.mensal)}</div>
        </div>
    `;

    const blockBtn = document.getElementById('btnBikeBlock');
    blockBtn.textContent = bike.bloqueada ? 'Ativar bike' : 'Bloquear bike';
    blockBtn.className = bike.bloqueada ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

    const stockInput = document.getElementById('stockIncrement');
    if (stockInput) stockInput.value = '1';
    cancelPendingBikeAction();
}

function openBikeDetailsModal(bikeId) {
    const bike = getBikeById(bikeId);
    if (!bike) return;
    selectedBikeId = Number(bike.id);
    pendingBikeAction = null;
    renderBikeDetailsModal();
    document.getElementById('bikeDetailsModalOverlay').classList.add('open');
}

function closeBikeDetailsModal(event) {
    if (event && event.target !== document.getElementById('bikeDetailsModalOverlay')) return;
    document.getElementById('bikeDetailsModalOverlay').classList.remove('open');
    selectedBikeId = null;
    pendingBikeAction = null;
    cancelPendingBikeAction();
}

async function loadBikes() {
    const grid = document.getElementById('bikeGrid');
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);"><div class="loading-pulse">Carregando bikes...</div></div>`;
    try {
        const d = await fetch(`${API_BASE}/bikes`).then(r => r.json());
        allBikes = d.bikes || [];
        const countEl = document.getElementById('bikeCount');
        if (countEl) countEl.textContent = `${allBikes.length} modelo(s)`;
        filterBikeCards();
    } catch (e) { showToast('Erro ao carregar bikes.', 'error'); }
}

// Escape HTML helper
function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Add Bike ──────────────────────────────────────────
async function addBike() {
    const nome = document.getElementById('bNome').value.trim();
    if (!nome) { showToast('Nome é obrigatório.', 'warning'); return; }
    const precoS = parseFloat(document.getElementById('bPS').value);
    const precoQ = parseFloat(document.getElementById('bPQ').value);
    const precoM = parseFloat(document.getElementById('bPM').value);
    if (!precoS || !precoQ || !precoM) { showToast('Preencha todos os preços.', 'warning'); return; }

    const btn = document.getElementById('btnAddBike');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('categoria', document.getElementById('bCat').value.trim() || 'Urbana');
    formData.append('descricao', document.getElementById('bDesc').value.trim());
    formData.append('quantidade', document.getElementById('bQtd').value || '1');
    formData.append('precoSemanal', precoS);
    formData.append('precoQuinzenal', precoQ);
    formData.append('precoMensal', precoM);

    const imagemInput = document.getElementById('bImagem');
    if (imagemInput.files.length > 0) {
        formData.append('imagem', imagemInput.files[0]);
    }

    try {
        const r = await fetch(`${API_BASE}/bikes`, { method: 'POST', headers: authH, body: formData });
        const d = await r.json();
        showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
        if (r.ok) {
            // Reset form
            ['bNome','bCat','bQtd','bPS','bPQ','bPM','bDesc'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = id === 'bQtd' ? '1' : '';
            });
            removePreview('uploadPreview','uploadZone','bImagem');
            loadBikes();
        }
    } catch (e) {
        showToast('Erro ao adicionar bike.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg> Adicionar ao catálogo';
    }
}

// ── Add Stock ─────────────────────────────────────────
function addEstoque(id) {
    openBikeDetailsModal(id);
    setTimeout(() => document.getElementById('stockIncrement')?.focus(), 0);
}

async function submitEstoque() {
    const bike = getSelectedBike();
    if (!bike) return;

    const input = document.getElementById('stockIncrement');
    const incremento = parseInt(input.value, 10);
    if (!Number.isFinite(incremento) || incremento < 1) {
        showToast('Informe uma quantidade válida para o estoque.', 'warning');
        return;
    }

    const btn = document.getElementById('btnAddStock');
    btn.disabled = true;
    btn.textContent = 'Adicionando...';

    try {
        const r = await fetch(`${API_BASE}/bikes/${bike.id}/estoque`, {
            method: 'PUT', headers: authHJ, body: JSON.stringify({ incremento })
        });
        const d = await r.json();
        showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
        if (r.ok) {
            await loadBikes();
            selectedBikeId = bike.id;
            renderBikeDetailsModal();
        }
    } catch (e) {
        showToast('Erro ao adicionar estoque.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Adicionar';
    }
}

// ── Block / Activate / Remove ─────────────────────────
function actionConfig(action, bike) {
    const name = bike ? bike.nome : 'esta bike';
    const configs = {
        bloquear: {
            title: 'Bloquear bike?',
            body: `O modelo "${name}" ficará indisponível para novas locações até ser ativado novamente.`,
            confirm: 'Bloquear bike',
            className: 'btn btn-secondary btn-sm'
        },
        ativar: {
            title: 'Ativar bike?',
            body: `O modelo "${name}" voltará a aparecer como disponível quando houver estoque.`,
            confirm: 'Ativar bike',
            className: 'btn btn-primary btn-sm'
        },
        remover: {
            title: 'Remover permanentemente?',
            body: `O modelo "${name}" será removido do catálogo. Essa ação não deve ser usada se você só quiser ocultar temporariamente.`,
            confirm: 'Remover',
            className: 'btn btn-danger btn-sm'
        }
    };
    return configs[action] || configs.bloquear;
}

function requestBikeAction(action) {
    const bike = getSelectedBike();
    if (!bike) return;

    pendingBikeAction = action;
    const config = actionConfig(action, bike);
    document.getElementById('bikeActionConfirmTitle').textContent = config.title;
    document.getElementById('bikeActionConfirmBody').textContent = config.body;

    const confirmBtn = document.getElementById('btnConfirmBikeAction');
    confirmBtn.textContent = config.confirm;
    confirmBtn.className = config.className;
    confirmBtn.disabled = false;

    document.getElementById('bikeActionConfirm').hidden = false;
}

function cancelPendingBikeAction() {
    pendingBikeAction = null;
    const confirm = document.getElementById('bikeActionConfirm');
    if (confirm) confirm.hidden = true;
}

function toggleSelectedBikeBlock() {
    const bike = getSelectedBike();
    if (!bike) return;
    requestBikeAction(bike.bloqueada ? 'ativar' : 'bloquear');
}

function requestBikeRemoval() {
    requestBikeAction('remover');
}

async function confirmPendingBikeAction() {
    const bike = getSelectedBike();
    const action = pendingBikeAction;
    if (!bike || !action) return;

    const btn = document.getElementById('btnConfirmBikeAction');
    btn.disabled = true;
    btn.textContent = 'Aplicando...';

    let url = `${API_BASE}/bikes/${bike.id}/${action}`, method = 'PUT';
    if (action === 'remover') { url = `${API_BASE}/bikes/${bike.id}`; method = 'DELETE'; }

    try {
        const r = await fetch(url, { method, headers: authH });
        const d = await r.json();
        showToast(d.message || d.error || '', r.ok ? 'success' : 'error');

        if (r.ok) {
            cancelPendingBikeAction();
            if (action === 'remover') closeBikeDetailsModal();
            await loadBikes();
            if (action !== 'remover') {
                selectedBikeId = bike.id;
                renderBikeDetailsModal();
            }
        }
    } catch (e) {
        showToast('Erro ao aplicar ação na bike.', 'error');
    } finally {
        btn.disabled = false;
    }
}

function bAction(id, action) {
    openBikeDetailsModal(id);
    requestBikeAction(action);
}

function editSelectedBike() {
    const bike = getSelectedBike();
    if (!bike) return;
    closeBikeDetailsModal();
    openEditModal(bike.id);
}

// ── Edit Modal ────────────────────────────────────────
function openEditModal(bikeId) {
    const bike = allBikes.find(b => b.id === bikeId);
    if (!bike) return;

    document.getElementById('editBikeId').value = bikeId;
    document.getElementById('editNome').value = bike.nome || '';
    document.getElementById('editCat').value = bike.categoria || '';
    document.getElementById('editDesc').value = bike.descricao || '';
    document.getElementById('editPS').value = bike.precos?.semanal || '';
    document.getElementById('editPQ').value = bike.precos?.quinzenal || '';
    document.getElementById('editPM').value = bike.precos?.mensal || '';

    // Reset upload state
    removePreview('editPreview','editUploadZone','editImagem');

    // Mostrar foto atual se existir
    const currentPhotoDiv = document.getElementById('editCurrentPhoto');
    const currentPhotoImg = document.getElementById('editCurrentPhotoImg');
    if (bike.imagem) {
        currentPhotoImg.src = normalizeImagePath(bike.imagem);
        currentPhotoDiv.style.display = 'block';
    } else {
        currentPhotoDiv.style.display = 'none';
    }

    document.getElementById('editModalOverlay').classList.add('open');
}

function closeEditModal(event) {
    if (event && event.target !== document.getElementById('editModalOverlay')) return;
    document.getElementById('editModalOverlay').classList.remove('open');
}

async function saveEditBike() {
    const id = document.getElementById('editBikeId').value;
    const nome = document.getElementById('editNome').value.trim();
    if (!nome) { showToast('Nome é obrigatório.', 'warning'); return; }

    const btn = document.getElementById('btnSaveEdit');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('categoria', document.getElementById('editCat').value.trim() || 'Urbana');
    formData.append('descricao', document.getElementById('editDesc').value.trim());
    formData.append('precoSemanal', document.getElementById('editPS').value);
    formData.append('precoQuinzenal', document.getElementById('editPQ').value);
    formData.append('precoMensal', document.getElementById('editPM').value);

    const imagemInput = document.getElementById('editImagem');
    if (imagemInput.files.length > 0) {
        formData.append('imagem', imagemInput.files[0]);
    }

    try {
        const r = await fetch(`${API_BASE}/bikes/${id}`, { method: 'PUT', headers: authH, body: formData });
        const d = await r.json();
        showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
        if (r.ok) {
            document.getElementById('editModalOverlay').classList.remove('open');
            loadBikes();
        }
    } catch (e) {
        showToast('Erro ao salvar edição.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar alterações';
    }
}

// ── Locações ──────────────────────────────────────────
async function loadLocacoes() {
    try {
        const d = await fetch(`${API_BASE}/admin/alugueis`, { headers: authH }).then(r => r.json());
        const tb = document.getElementById('locTbody');
        tb.innerHTML = (d.alugueis || []).map(a => {
            const di = new Date(a.dataInicio).toLocaleDateString('pt-BR');
            const dd = new Date(a.dataDevolucaoPrevista).toLocaleDateString('pt-BR');
            return `<tr>
        <td><strong>#${a.id}</strong></td><td>${a.usuarioNome || '—'}</td><td>${a.bikeNome || '—'}</td>
        <td>${a.planoLabel || a.tipo}</td><td>${di}</td><td>${dd}</td>
        <td>${sBadge(a.status)}</td><td>${pBadge(a.pagamento)}</td>
        <td>${['aguardando_locacao','agendada'].includes(a.status)
                ? `<button class="btn btn-primary btn-sm" onclick="ativarLoc(${a.id})">Ativar</button>`
                : ''}</td>
      </tr>`;
        }).join('') || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhuma locação.</td></tr>';
    } catch (e) { showToast('Erro ao carregar locações.', 'error'); }
}

async function ativarLoc(id) {
    const r = await fetch(`${API_BASE}/rentals/${id}/ativar`, { method: 'PUT', headers: authH });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) loadLocacoes();
}

// ── Pagamentos ────────────────────────────────────────
async function loadPagamentos() {
    try {
        const d = await fetch(`${API_BASE}/admin/pagamentos`, { headers: authH }).then(r => r.json());
        const pl = document.getElementById('pagList');
        let html = '';
        (d.pagamentos || []).forEach(p => {
            if (p.faturas && p.faturas.length > 0) {
                p.faturas.forEach(f => {
                    const isPend = f.status === 'aguardando_aprovacao';
                    html += `<div class="pag-item">
            <div>
              <div style="font-size:13px;font-weight:800;">Locação #${p.aluguelId} — ${p.bikeNome}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Fatura ${f.id} | Venc.: ${new Date(f.dataVencimento).toLocaleDateString('pt-BR')} | R$${f.valor.toFixed(2)}</div>
              <div style="margin-top:6px;">${pBadge({ status: f.status })}</div>
            </div>
            <div style="display:flex;gap:8px;">
              ${isPend ? `<button class="btn btn-success btn-sm" onclick="aprovFatura(${p.aluguelId},'${f.id}')">Aprovar Fatura</button>` : f.pagoEm ? `<span style="font-size:11px;color:var(--success);">Aprov. ${new Date(f.pagoEm).toLocaleDateString('pt-BR')}</span>` : ''}
            </div>
          </div>`;
                });
            } else {
                const pc = p.pagamento || {};
                const pend = pc.status === 'aguardando_aprovacao';
                html += `<div class="pag-item">
            <div>
              <div style="font-size:13px;font-weight:800;">Locação #${p.aluguelId} — ${p.bikeNome}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${p.usuarioNome} | ${p.planoLabel || p.tipo} | R$${(p.preco || 0).toFixed(2)}</div>
              <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">${pBadge(pc)}${pc.solicitadoEm ? `<span style="font-size:10px;color:var(--text-muted);">Sol. ${new Date(pc.solicitadoEm).toLocaleDateString('pt-BR')}</span>` : ''}</div>
            </div>
            <div style="display:flex;gap:8px;">
              ${pend ? `<button class="btn btn-success btn-sm" onclick="aprovPag(${p.aluguelId})">Aprovar</button><button class="btn btn-danger btn-sm" onclick="rejPag(${p.aluguelId})">Rejeitar</button>` : pc.aprovadoEm ? `<span style="font-size:11px;color:var(--success);">Aprov. ${new Date(pc.aprovadoEm).toLocaleDateString('pt-BR')}</span>` : ''}
            </div>
          </div>`;
            }
        });
        pl.innerHTML = html || '<p style="text-align:center;color:var(--text-muted);padding:24px;">Nenhum pagamento registrado.</p>';
    } catch (e) { showToast('Erro ao carregar pagamentos.', 'error'); }
}

async function aprovFatura(aluguelId, faturaId) {
    const r = await fetch(`${API_BASE}/admin/pagamentos/${aluguelId}/faturas/${faturaId}/aprovar`, { method: 'PUT', headers: authHJ });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) loadPagamentos();
}

async function aprovPag(id) {
    const r = await fetch(`${API_BASE}/admin/pagamentos/${id}/aprovar`, { method: 'PUT', headers: authHJ });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) loadPagamentos();
}

async function rejPag(id) {
    const m = prompt('Motivo da rejeição:');
    const r = await fetch(`${API_BASE}/admin/pagamentos/${id}/rejeitar`, { method: 'PUT', headers: authHJ, body: JSON.stringify({ motivo: m || 'Rejeitado' }) });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) loadPagamentos();
}

// ── GPS Map — Leaflet + SSE ───────────────────────────
let _gpsMap = null;          // instância Leaflet
let _gpsMarkers = {};        // bikeId → L.marker
let _gpsSSE = null;          // EventSource
let _gpsInitialized = false; // evitar dupla init

// Ícone personalizado de bike
function _bikeIcon(color) {
    return L.divIcon({
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
        html: `<div style="width:36px;height:36px;background:${color || '#F5C000'};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff;font-size:9px;font-weight:700;color:#3D2E00;letter-spacing:.04em;">BIKE</div>`
    });
}

function _gpsSetStatus(connected, text) {
    const dot  = document.getElementById('gpsDot');
    const span = document.getElementById('gpsStatusText');
    if (dot)  { dot.className = 'gps-status-dot' + (connected ? ' live' : ''); }
    if (span) { span.textContent = text; }
}

function _gpsUpdateSidebar() {
    const list  = document.getElementById('gpsBikeList');
    const count = document.getElementById('gpsActiveCount');
    if (!list) return;
    const active = Object.values(_gpsMarkers);
    if (count) count.textContent = active.length;
    if (!active.length) {
        list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.84rem;">
            Nenhuma bike em rastreamento ativo.<br>
            <span style="font-size:0.76rem;">Ative uma locação para iniciar.</span></div>`;
        return;
    }
    list.innerHTML = active.map(m => {
        const d = m._gpsData || {};
        return `<div class="gps-bike-item" onclick="_gpsFlyTo(${d.bikeId})">
            <div class="gps-bike-name">${escHtml(d.bikeNome || 'Bike #' + d.bikeId)}</div>
            <div class="gps-bike-addr">${escHtml(d.endereco || '—')}</div>
            <div class="gps-bike-speed">${d.speed ? d.speed + ' km/h' : 'Parada'}</div>
        </div>`;
    }).join('');
}

function _gpsFlyTo(bikeId) {
    const marker = _gpsMarkers[bikeId];
    if (marker && _gpsMap) {
        _gpsMap.flyTo(marker.getLatLng(), 15, { duration: 0.8 });
        marker.openPopup();
    }
}

function _gpsHandleEvent(evt) {
    let data;
    try { data = JSON.parse(evt.data); } catch { return; }

    if (data.type === 'connected') {
        _gpsSetStatus(true, `Conectado — ${data.activeBikes} bike(s) ativa(s)`);
        return;
    }

    if (data.type === 'remove') {
        const m = _gpsMarkers[data.bikeId];
        if (m && _gpsMap) _gpsMap.removeLayer(m);
        delete _gpsMarkers[data.bikeId];
        _gpsUpdateSidebar();
        return;
    }

    if (data.type === 'update') {
        const latlng = [data.lat, data.lng];
        if (_gpsMarkers[data.bikeId]) {
            _gpsMarkers[data.bikeId].setLatLng(latlng);
            _gpsMarkers[data.bikeId]._gpsData = data;
            // atualizar popup se aberto
            _gpsMarkers[data.bikeId].setPopupContent(_gpsPopupHtml(data));
        } else {
            const marker = L.marker(latlng, { icon: _bikeIcon('#F5C000') })
                .addTo(_gpsMap)
                .bindPopup(_gpsPopupHtml(data));
            marker._gpsData = data;
            _gpsMarkers[data.bikeId] = marker;
        }
        _gpsUpdateSidebar();
    }
}

function _gpsPopupHtml(d) {
    return `<div class="gps-popup-name">Bike: ${escHtml(d.bikeNome)}</div>
        <div class="gps-popup-row">Endereço: ${escHtml(d.endereco)}</div>
        <div class="gps-popup-row">Velocidade: ${d.speed ? d.speed + ' km/h' : 'Parada'}</div>
        <div class="gps-popup-row" style="color:var(--text-muted);font-size:0.72rem;">Locação #${d.rentalId}</div>`;
}

function initGpsMap() {
    // Inicializar mapa Leaflet na primeira abertura
    if (!_gpsInitialized) {
        _gpsInitialized = true;
        // Aguardar o container ficar visível (seção '.show' aplicada)
        setTimeout(() => {
            _gpsMap = L.map('gpsMapContainer', {
                center: [-23.5505, -46.6333],
                zoom: 13,
                zoomControl: true,
                attributionControl: true
            });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(_gpsMap);
            // Iniciar SSE após mapa criado
            _gpsStartSSE();
        }, 80);
    } else {
        // Seção reaberta: invalidar tamanho do mapa (Leaflet precisa disso)
        if (_gpsMap) setTimeout(() => _gpsMap.invalidateSize(), 80);
    }
}

function _gpsStartSSE() {
    if (_gpsSSE) { _gpsSSE.close(); _gpsSSE = null; }
    _gpsSetStatus(false, 'Conectando...');
    const url = `${API_BASE}/gps/stream?token=${encodeURIComponent(token)}`;
    _gpsSSE = new EventSource(url);
    _gpsSSE.addEventListener('message', _gpsHandleEvent);
    _gpsSSE.addEventListener('open', () => _gpsSetStatus(true, 'Conectado'));
    _gpsSSE.addEventListener('error', () => {
        _gpsSetStatus(false, 'Erro de conexão');
        // Tentar reconectar em 5s
        setTimeout(() => { if (_gpsSSE && _gpsSSE.readyState === EventSource.CLOSED) _gpsStartSSE(); }, 5000);
    });
}

function reconnectGPS() {
    // Limpar marcadores existentes
    Object.values(_gpsMarkers).forEach(m => { if (_gpsMap) _gpsMap.removeLayer(m); });
    _gpsMarkers = {};
    _gpsUpdateSidebar();
    _gpsStartSSE();
}

// ── Vistorias ─────────────────────────────────────────
async function loadVist() {
    const d = await fetch(`${API_BASE}/vistorias`, { headers: authH }).then(r => r.json());
    const m = { pendente: 'badge-warning', aprovada: 'badge-success', reprovada: 'badge-danger' };
    document.getElementById('vistTbody').innerHTML = (d.vistorias || []).map(v =>
        `<tr><td>#${v.id}</td><td>#${v.aluguelId}</td><td>${v.bikeNome || '—'}</td><td>${v.usuarioNome || '—'}</td><td><span class="badge ${m[v.status] || 'badge-muted'}">${v.status}</span></td><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">${v.observacao || '—'}</td><td>${v.criadaEm ? new Date(v.criadaEm).toLocaleDateString('pt-BR') : '—'}</td></tr>`
    ).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhuma vistoria.</td></tr>';
}

// ── Usuários ──────────────────────────────────────────
async function loadUsers() {
    const d = await fetch(`${API_BASE}/admin/usuarios`, { headers: authH }).then(r => r.json());
    const m = { user: 'badge-success', funcionario: 'badge-warning', admin: 'badge-purple' };
    document.getElementById('userTbody').innerHTML = (d.usuarios || []).map(u =>
        `<tr><td>#${u.id}</td><td><strong>${u.nome}</strong></td><td>${u.email}</td><td><span class="badge ${m[u.role] || 'badge-muted'}">${u.role}</span></td><td>${u.criadoEm ? new Date(u.criadoEm).toLocaleDateString('pt-BR') : '—'}</td></tr>`
    ).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhum usuário.</td></tr>';
}

// ── Close edit modal on Escape ────────────────────────
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.getElementById('editModalOverlay').classList.remove('open');
        closeBikeDetailsModal();
    }
});

// ── Setup drag & drop after DOM ready ────────────────
document.addEventListener('DOMContentLoaded', () => {
    setupDragDrop('uploadZone', 'bImagem', 'uploadPreview');
    setupDragDrop('editUploadZone', 'editImagem', 'editPreview');
    const stockInput = document.getElementById('stockIncrement');
    if (stockInput) {
        stockInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') submitEstoque();
        });
    }
});

// ── Init ──────────────────────────────────────────────
loadDash();
