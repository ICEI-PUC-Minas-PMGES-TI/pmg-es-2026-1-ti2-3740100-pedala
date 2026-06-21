// ── Auth ──────────────────────────────────────────────
const token = localStorage.getItem('pedala_token');
const user = window.readStoredJson ? window.readStoredJson('pedala_user') : JSON.parse(localStorage.getItem('pedala_user') || '{}');
const adminRole = window.normalizeUserRole ? window.normalizeUserRole(user.role) : String(user.role || '').trim().toLowerCase();
if (!token || adminRole !== 'admin') { alert('Acesso negado.'); location.href = 'login.html'; }

document.getElementById('navAv').textContent = user.nome ? user.nome[0].toUpperCase() : 'A';
document.getElementById('navNm').textContent = user.nome ? user.nome.split(' ')[0] : 'Admin';
(function(){ const el = document.getElementById('navRole'); if (el) el.textContent = { admin:'ADMIN', funcionario:'FUNC.', user:'USUÁRIO' }[adminRole] || 'ADMIN'; })();

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
        locacoes: loadLocacoes, pagamentos: loadPagamentos, planos: loadPlanos,
        gps: initGpsMap, vistorias: loadVist, chamados: loadChamadosAdmin,
        usuarios: loadUsers, configuracoes: loadCategories, indicadores: loadIndicadores
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

function _counterUp(el, target, duration) {
    if (!el) return;
    const start = performance.now();
    const from = 0;
    function step(now) {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (target - from) * ease);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
    }
    requestAnimationFrame(step);
}

async function loadDash() {
    try {
        const d = await fetch(`${API_BASE}/admin/stats`, { headers: authH }).then(r => r.json());
        _counterUp(document.getElementById('stTot'),  d.bikes.total,                         700);
        _counterUp(document.getElementById('stDisp'), d.bikes.disponiveis,                   700);
        _counterUp(document.getElementById('stAlug'), d.bikes.alugadas,                      700);
        _counterUp(document.getElementById('stAtr'),  d.alugueis.atrasados,                  700);
        _counterUp(document.getElementById('stAtiv'), d.alugueis.ativos,                     700);
        _counterUp(document.getElementById('stAL'),   d.alugueis.aguardandoEntrega || 0,     700);
        _counterUp(document.getElementById('stVist'), d.vistorias.pendentes,                 700);
        document.getElementById('stRec').textContent = 'R$' + Number(d.receitaTotal || 0).toFixed(2);

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const textColor  = isDark ? '#e2e8f0' : '#1e293b';
        const mutedColor = isDark ? '#64748b' : '#94a3b8';
        const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

        // ── Gráfico 1: Locações — barra horizontal ──
        if (chartLocacoesInst) chartLocacoesInst.destroy();
        const ctxLocacoes = document.getElementById('chartLocacoes');
        if (ctxLocacoes && window.Chart) {
            const locData = [d.alugueis.ativos, d.alugueis.aguardandoEntrega, d.alugueis.agendadas, d.alugueis.finalizados];
            chartLocacoesInst = new Chart(ctxLocacoes, {
                type: 'bar',
                data: {
                    labels: ['Ativas', 'Ag. Entrega', 'Agendadas', 'Finalizadas'],
                    datasets: [{
                        data: locData,
                        backgroundColor: ['rgba(52,211,153,0.85)', 'rgba(251,191,36,0.85)', 'rgba(167,139,250,0.85)', 'rgba(100,116,139,0.55)'],
                        borderRadius: 6,
                        borderSkipped: false,
                        barThickness: 22,
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: isDark ? '#1e293b' : '#fff',
                            titleColor: textColor,
                            bodyColor: mutedColor,
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderWidth: 1,
                            padding: 10,
                            callbacks: { label: ctx => ` ${ctx.raw} locaç${ctx.raw === 1 ? 'ão' : 'ões'}` }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: mutedColor, font: { size: 11 } },
                            beginAtZero: true
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: textColor, font: { size: 12 } }
                        }
                    }
                }
            });
        }

        // ── Gráfico 2: Frota — doughnut com total no centro ──
        if (chartFrotaInst) chartFrotaInst.destroy();
        const ctxFrota = document.getElementById('chartFrota');
        if (ctxFrota && window.Chart) {
            const total = (d.bikes.disponiveis || 0) + (d.bikes.alugadas || 0);
            const centerTextPlugin = {
                id: 'centerText',
                afterDraw(chart) {
                    if (chart.config.type !== 'doughnut') return;
                    const { ctx, chartArea: { width, height, left, top } } = chart;
                    const cx = left + width / 2, cy = top + height / 2;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = textColor;
                    ctx.font = `bold ${Math.min(width, height) * 0.22}px sans-serif`;
                    ctx.fillText(total, cx, cy - 8);
                    ctx.fillStyle = mutedColor;
                    ctx.font = `${Math.min(width, height) * 0.1}px sans-serif`;
                    ctx.fillText('bikes', cx, cy + 14);
                    ctx.restore();
                }
            };
            chartFrotaInst = new Chart(ctxFrota, {
                type: 'doughnut',
                plugins: [centerTextPlugin],
                data: {
                    labels: ['Disponíveis', 'Alugadas'],
                    datasets: [{
                        data: [d.bikes.disponiveis, d.bikes.alugadas],
                        backgroundColor: ['rgba(52,211,153,0.85)', 'rgba(248,113,113,0.85)'],
                        hoverBackgroundColor: ['#34d399', '#f87171'],
                        borderWidth: 0,
                        spacing: 3,
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: textColor,
                                padding: 16,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#1e293b' : '#fff',
                            titleColor: textColor,
                            bodyColor: mutedColor,
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderWidth: 1,
                            padding: 10,
                            callbacks: { label: ctx => ` ${ctx.raw} bikes (${total ? Math.round(ctx.raw/total*100) : 0}%)` }
                        }
                    }
                }
            });
        }
        // ── Atrasadas ──
        try {
            if (!allLocacoes.length) {
                const ld = await fetch(`${API_BASE}/admin/alugueis`, { headers: authH }).then(r => r.json());
                allLocacoes = ld.alugueis || [];
            }
            const atrasadas = allLocacoes.filter(a => a.atrasado);
            const atEl = document.getElementById('dashAtrasadas');
            if (atEl) {
                if (!atrasadas.length) {
                    atEl.innerHTML = '<p style="color:var(--success,#22c55e);font-size:0.85rem;text-align:center;padding:10px 0;">Nenhuma locação em atraso ✓</p>';
                } else {
                    atEl.innerHTML = atrasadas.map(a => {
                        const dd = new Date(a.dataDevolucaoPrevista).toLocaleDateString('pt-BR');
                        const dias = a.diasRestantes != null ? Math.abs(a.diasRestantes) : '?';
                        return `<div onclick="showSec('locacoes',null);setTimeout(()=>openLocacaoModal(${a.id}),120)" style="display:flex;align-items:center;justify-content:space-between;background:var(--danger-bg,#fef2f2);border:1px solid var(--danger-border,#fca5a5);border-radius:6px;padding:8px 12px;font-size:0.82rem;cursor:pointer;margin-bottom:6px;gap:8px;" onmouseenter="this.style.opacity='.82'" onmouseleave="this.style.opacity='1'">
                            <div>
                                <strong>${escHtml(a.bikeNome || '—')}</strong> — ${escHtml(a.usuarioNome || '—')}
                                <div style="color:var(--danger,#ef4444);font-size:0.77rem;margin-top:1px;">Devol. ${dd} · ${dias} dias em atraso</div>
                            </div>
                            <span class="badge badge-danger">#${a.id}</span>
                        </div>`;
                    }).join('');
                }
            }
        } catch (_) {}
        // ── Chamados stats ──
        try {
            const cs = await fetch(`${API_BASE}/chamados/stats`, { headers: authH }).then(r => r.json());
            const ca = document.getElementById('dashChamAbertos');
            const cb = document.getElementById('dashChamAtend');
            const cc = document.getElementById('dashChamResolvidos');
            if (ca) ca.textContent = cs.abertos ?? 0;
            if (cb) cb.textContent = cs.emAtendimento ?? 0;
            if (cc) cc.textContent = cs.resolvidos ?? 0;
        } catch (_) {}
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
        _fillCategorySelects(); // preenche os selects de categoria
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
async function openEditModal(bikeId) {
    const bike = allBikes.find(b => b.id === bikeId);
    if (!bike) return;

    document.getElementById('editBikeId').value = bikeId;
    document.getElementById('editNome').value = bike.nome || '';
    document.getElementById('editDesc').value = bike.descricao || '';
    document.getElementById('editPS').value = bike.precos?.semanal || '';
    document.getElementById('editPQ').value = bike.precos?.quinzenal || '';
    document.getElementById('editPM').value = bike.precos?.mensal || '';

    // Preenche o select de categoria e seleciona o valor atual da bike
    _fillCategorySelects();
    const editCat = document.getElementById('editCat');
    if (editCat && bike.categoria) editCat.value = bike.categoria;

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
let allLocacoes = [];

function filterLocacoes() {
    const q = (document.getElementById('locQ')?.value || '').toLowerCase();
    const sf = document.getElementById('locSF')?.value || 'todos';
    const filtered = allLocacoes.filter(a => {
        const matchS = sf === 'todos' || a.status === sf;
        const matchQ = !q || (a.usuarioNome || '').toLowerCase().includes(q) ||
            (a.bikeNome || '').toLowerCase().includes(q) || String(a.id).includes(q);
        return matchS && matchQ;
    });
    const cnt = document.getElementById('locCount');
    if (cnt) cnt.textContent = `${filtered.length} de ${allLocacoes.length}`;
    renderLocacoes(filtered);
}

function renderLocacoes(list) {
    const tb = document.getElementById('locTbody');
    tb.innerHTML = list.map(a => {
        const di = new Date(a.dataInicio).toLocaleDateString('pt-BR');
        const dd = new Date(a.dataDevolucaoPrevista).toLocaleDateString('pt-BR');
        const atrasadoBadge = a.atrasado ? ' <span class="badge badge-danger" style="font-size:0.62rem;padding:1px 5px;">ATRASO</span>' : '';
        return `<tr class="clickable-row" onclick="openLocacaoModal(${a.id})" title="Clique para ver detalhes" style="cursor:pointer;">
            <td><strong>#${a.id}</strong></td>
            <td>${escHtml(a.usuarioNome || '—')}</td>
            <td>${escHtml(a.bikeNome || '—')}</td>
            <td>${escHtml(a.planoLabel || a.tipo)}</td>
            <td>${di}</td>
            <td>${dd}${atrasadoBadge}</td>
            <td>${sBadge(a.status)}</td>
            <td>${pBadge(a.pagamento)}</td>
            <td onclick="event.stopPropagation()" style="white-space:nowrap;">
                ${['aguardando_locacao', 'agendada'].includes(a.status)
                    ? `<button class="btn btn-primary btn-sm" onclick="ativarLoc(${a.id})">Ativar</button>`
                    : (a.status === 'ativo' || a.status === 'aguardando_vistoria')
                    ? `<button class="btn btn-secondary btn-sm" onclick="finalizarLoc(${a.id})">Finalizar</button>`
                    : '—'}
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhuma locação encontrada.</td></tr>';
}

async function loadLocacoes() {
    try {
        const d = await fetch(`${API_BASE}/admin/alugueis`, { headers: authH }).then(r => r.json());
        allLocacoes = d.alugueis || [];
        filterLocacoes();
    } catch (e) { showToast('Erro ao carregar locações.', 'error'); }
}

async function ativarLoc(id) {
    const r = await fetch(`${API_BASE}/rentals/${id}/ativar`, { method: 'PUT', headers: authH });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) loadLocacoes();
}

async function finalizarLoc(id) {
    if (!confirm('Finalizar esta locação permanentemente? Esta ação não pode ser desfeita.')) return;
    const r = await fetch(`${API_BASE}/rentals/${id}/finalizar`, { method: 'PUT', headers: authH });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) { closeLocacaoModal(); loadLocacoes(); }
}

function openLocacaoModal(id) {
    const a = allLocacoes.find(x => x.id === id);
    if (!a) return;

    document.getElementById('locModalId').textContent = `Locação #${a.id}`;
    const pag = a.pagamento || {};
    document.getElementById('locModalBadges').innerHTML =
        sBadge(a.status) + ' ' + pBadge({ status: pag.status || 'nao_pago' }) +
        (a.atrasado ? ' <span class="badge badge-danger">Atrasado</span>' : '');

    const fmt = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    const mon = v => v != null ? 'R$' + Number(v).toFixed(2) : '—';
    const row = (lbl, val) =>
        `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:3px 0;">
            <span style="color:var(--text-muted);font-size:0.82rem;flex-shrink:0;">${lbl}</span>
            <span style="font-weight:600;font-size:0.85rem;text-align:right;">${val}</span>
         </div>`;
    const divider = `<div style="border-top:1px solid var(--border);margin:6px 0;"></div>`;

    document.getElementById('locModalInfo').innerHTML = [
        row('Usuário', escHtml(a.usuarioNome || '—')),
        a.usuarioEmail ? row('E-mail', `<span style="font-size:0.78rem;">${escHtml(a.usuarioEmail)}</span>`) : '',
        row('Bike', escHtml(a.bikeNome || '—')),
        a.bikeCategoria ? row('Categoria', escHtml(a.bikeCategoria)) : '',
        divider,
        row('Plano', escHtml(a.planoLabel || a.tipo || '—')),
        row('Seguro', escHtml(a.tipoSeguro || 'Básico') + (Number(a.valorSeguro) > 0
            ? ` <span style="color:var(--text-muted);font-weight:400;">(+${mon(a.valorSeguro)}/ciclo)</span>`
            : ' <span style="color:var(--text-muted);font-weight:400;">(grátis)</span>')),
        row('Valor total', `<span style="color:var(--primary,#F5C000);font-size:1rem;">${mon(a.preco)}</span>`),
        divider,
        row('Início', fmt(a.dataInicio)),
        row('Devolução', fmt(a.dataDevolucaoPrevista)),
        a.ativadoEm ? row('Ativado em', fmt(a.ativadoEm)) : '',
        a.diasEmUso != null ? row('Dias em uso', a.diasEmUso + ' dias') : '',
        a.diasRestantes != null ? row('Dias restantes',
            a.diasRestantes < 0
                ? `<span style="color:var(--danger,#ef4444);">${Math.abs(a.diasRestantes)} dias de atraso</span>`
                : `${a.diasRestantes} dias`) : '',
        divider,
        row('Criado em', fmt(a.criadoEm)),
    ].filter(Boolean).join('');

    document.getElementById('locModalPayment').innerHTML = [
        pag.solicitadoEm ? row('Solicitado em', fmt(pag.solicitadoEm)) : '',
        pag.aprovadoEm ? row('Aprovado em', fmt(pag.aprovadoEm)) : '',
        pag.aprovadoPor ? row('Aprovado por', escHtml(pag.aprovadoPor)) : '',
        pag.motivoRejeicao ? `<div style="background:var(--danger-bg,#fef2f2);color:var(--danger,#dc2626);border:1px solid var(--danger-border,#fca5a5);border-radius:6px;padding:8px 10px;font-size:0.8rem;margin-top:6px;"><strong>Motivo rejeição:</strong> ${escHtml(pag.motivoRejeicao)}</div>` : '',
        (!pag.solicitadoEm && !pag.aprovadoEm) ? `<p style="color:var(--text-muted);font-size:0.83rem;margin:0;">Nenhuma ação de pagamento registrada.</p>` : '',
    ].filter(Boolean).join('');

    // Faturas
    const fatSec = document.getElementById('locModalFaturasSec');
    const faturas = a.faturas || [];
    if (faturas.length) {
        const fsm = { pendente: 'badge-warning', aguardando_aprovacao: 'badge-info', pago: 'badge-success', rejeitado: 'badge-danger' };
        const fsl = { pendente: 'Pendente', aguardando_aprovacao: 'Ag. aprovação', pago: 'Pago', rejeitado: 'Rejeitado' };
        document.getElementById('locModalFaturas').innerHTML = faturas.map(f => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:0.82rem;gap:8px;">
                <div>
                    <div style="font-weight:700;font-size:0.77rem;color:var(--text-muted);">${escHtml(f.id)}</div>
                    <div style="color:var(--text-muted);margin-top:1px;">Venc. ${fmt(f.dataVencimento)}${f.pagoEm ? ` · Pago ${fmt(f.pagoEm)}` : ''}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    <strong>${mon(f.valor)}</strong>
                    <span class="badge ${fsm[f.status] || 'badge-muted'}">${fsl[f.status] || f.status}</span>
                </div>
            </div>`).join('');
        fatSec.hidden = false;
    } else {
        fatSec.hidden = true;
    }

    // Renovações
    const renSec = document.getElementById('locModalRenovacoesSec');
    const renovacoes = a.renovacoes || [];
    if (renovacoes.length) {
        document.getElementById('locModalRenovacoes').innerHTML = renovacoes.map(rn => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:7px 12px;font-size:0.82rem;">
                <div>
                    <strong>${rn.tipo}</strong> — ${rn.dias} dias
                    <div style="color:var(--text-muted);font-size:0.77rem;margin-top:1px;">${fmt(rn.de)} → ${fmt(rn.para)}</div>
                </div>
                <span style="font-weight:700;">${mon(rn.preco)}</span>
            </div>`).join('');
        renSec.hidden = false;
    } else {
        renSec.hidden = true;
    }

    // Endereço
    const addrSec = document.getElementById('locModalAddrSec');
    const addr = a.enderecoEntrega;
    if (addr && addr.logradouro) {
        document.getElementById('locModalAddr').textContent =
            [addr.logradouro, addr.numero, addr.bairro, addr.cidade, addr.uf].filter(Boolean).join(', ');
        addrSec.hidden = false;
    } else {
        addrSec.hidden = true;
    }

    // Ações
    const acts = [];
    if (['aguardando_locacao', 'agendada'].includes(a.status)) {
        acts.push(`<button class="btn btn-primary btn-sm" onclick="ativarLoc(${a.id});closeLocacaoModal()">Ativar locação</button>`);
    }
    if (a.status === 'ativo' || a.status === 'aguardando_vistoria') {
        acts.push(`<button class="btn btn-secondary btn-sm" onclick="finalizarLoc(${a.id})">Finalizar locação</button>`);
    }
    if (a.status === 'ativo') {
        acts.push(`<button class="btn btn-ghost btn-sm" onclick="closeLocacaoModal();setTimeout(()=>{showSec('gps',null);verRotaGPS(${a.id})},100)">Ver rota GPS</button>`);
    }
    acts.push(`<button class="btn btn-ghost btn-sm" onclick="closeLocacaoModal()">Fechar</button>`);
    document.getElementById('locModalActions').innerHTML = acts.join('');

    document.getElementById('locacaoModal').classList.add('open');
}

function closeLocacaoModal() {
    document.getElementById('locacaoModal').classList.remove('open');
}

// ── Export CSV ────────────────────────────────────────
function exportLocacoesCsv() {
    const q = (document.getElementById('locQ')?.value || '').toLowerCase();
    const sf = document.getElementById('locSF')?.value || 'todos';
    const list = allLocacoes.filter(a => {
        const matchS = sf === 'todos' || a.status === sf;
        const matchQ = !q || (a.usuarioNome || '').toLowerCase().includes(q) ||
            (a.bikeNome || '').toLowerCase().includes(q) || String(a.id).includes(q);
        return matchS && matchQ;
    });
    if (!list.length) { showToast('Nenhuma locação para exportar.', 'warning'); return; }
    const header = ['ID', 'Usuário', 'E-mail', 'Bike', 'Plano', 'Início', 'Devolução', 'Status', 'Pagamento', 'Valor (R$)', 'Seguro'];
    const toDate = d => d ? new Date(d).toLocaleDateString('pt-BR') : '';
    const rows = list.map(a => [
        `#${a.id}`, a.usuarioNome || '', a.usuarioEmail || '', a.bikeNome || '',
        a.planoLabel || a.tipo || '', toDate(a.dataInicio), toDate(a.dataDevolucaoPrevista),
        a.status || '', a.pagamento?.status || '',
        a.preco != null ? Number(a.preco).toFixed(2).replace('.', ',') : '',
        a.tipoSeguro || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));
    const csv = [header.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    link.href = url; link.download = `locacoes_${dateStr}.csv`;
    link.click(); URL.revokeObjectURL(url);
    showToast(`${list.length} locações exportadas em CSV.`, 'success');
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

let _rejPagId = null;

function rejPag(id) { openRejPagModal(id); }

function openRejPagModal(id) {
    _rejPagId = id;
    document.getElementById('rejPagMotivo').value = '';
    document.getElementById('rejPagModal').classList.add('open');
    setTimeout(() => document.getElementById('rejPagMotivo').focus(), 50);
}

function closeRejPagModal() {
    document.getElementById('rejPagModal').classList.remove('open');
    _rejPagId = null;
}

async function confirmRejPag() {
    if (!_rejPagId) return;
    const motivo = document.getElementById('rejPagMotivo').value.trim();
    if (!motivo) { showToast('Informe o motivo da rejeição.', 'warning'); return; }
    const btn = document.getElementById('btnConfirmRejPag');
    btn.disabled = true; btn.textContent = 'Rejeitando...';
    const r = await fetch(`${API_BASE}/admin/pagamentos/${_rejPagId}/rejeitar`, { method: 'PUT', headers: authHJ, body: JSON.stringify({ motivo }) });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) { closeRejPagModal(); loadPagamentos(); }
    btn.disabled = false; btn.textContent = 'Rejeitar';
}

// ── GPS Map — Leaflet + SSE ───────────────────────────
let _gpsMap = null;
let _gpsMarkers = {};
let _gpsSSE = null;
let _gpsInitialized = false;
let _rentalCache = {};
let _homeMarkers = {};

function _bikeIcon(color) {
    const c = color || '#6366f1';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="19" height="19"><path d="M5 20.5A3.5 3.5 0 0 1 1.5 17 3.5 3.5 0 0 1 5 13.5 3.5 3.5 0 0 1 8.5 17 3.5 3.5 0 0 1 5 20.5M5 12A5 5 0 0 0 0 17a5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5m9.8-2H19V8.2h-3.2l-1.94-3.07C13.57 4.43 13 4.1 12.4 4.1c-.47 0-.9.19-1.2.5L7.5 8.29C7.19 8.6 7 9 7 9.5c0 .63.33 1.16.85 1.47L11.2 13V18h2v-6.5l-2.25-1.65 2.32-2.35M19 20.5A3.5 3.5 0 0 1 15.5 17 3.5 3.5 0 0 1 19 13.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5M19 12a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5z"/></svg>`;
    return L.divIcon({
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
        html: `<div style="width:38px;height:38px;background:${c};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.4);border:2.5px solid #fff;">${svg}</div>`
    });
}

async function _loadRentalCache() {
    try {
        const r = await fetch(`${API_BASE}/rentals`, { headers: authH });
        if (!r.ok) return;
        const data = await r.json();
        const list = Array.isArray(data) ? data : (data.alugueis || data.rentals || data.content || []);
        list.forEach(rental => { _rentalCache[rental.id] = rental; });
    } catch (_) {}
}

async function _toggleHomeMarker(bikeId, rentalId) {
    if (_homeMarkers[bikeId]) {
        _gpsMap.removeLayer(_homeMarkers[bikeId]);
        delete _homeMarkers[bikeId];
        return;
    }
    const rental = _rentalCache[rentalId];
    if (!rental?.enderecoEntrega) { showToast('Endereço do cliente não disponível.', 'error'); return; }
    const addr = rental.enderecoEntrega;
    const q = [addr.logradouro, addr.numero, addr.bairro, addr.cidade || 'São Paulo'].filter(Boolean).join(', ');
    try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`);
        const results = await r.json();
        if (!results?.length) { showToast('Endereço não encontrado no mapa.', 'error'); return; }
        const { lat, lon } = results[0];
        const homeIcon = L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -36], html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.5));">🏠</div>` });
        const marker = L.marker([parseFloat(lat), parseFloat(lon)], { icon: homeIcon })
            .addTo(_gpsMap)
            .bindPopup(`<b>Casa do Cliente</b><br>${escHtml(rental.usuarioNome || '—')}<br><small style="color:#666;">${escHtml(q)}</small>`)
            .openPopup();
        _homeMarkers[bikeId] = marker;
        _gpsMap.flyTo([parseFloat(lat), parseFloat(lon)], 16, { duration: 1 });
    } catch (e) { showToast('Erro ao localizar endereço.', 'error'); }
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
        const statusHtml = d.bloqueada
            ? `<span style="color:#ef4444;font-size:0.7rem;font-weight:700;">&#128274; Bloqueada</span>`
            : (d.isSuspeito ? `<span style="color:#f59e0b;font-size:0.7rem;font-weight:700;">&#9888; Fora da zona</span>` : '');
        return `<div class="gps-bike-item">
            <div onclick="_gpsFlyTo(${d.bikeId})" style="cursor:pointer;">
                <div class="gps-bike-name">${escHtml(d.bikeNome || 'Bike #' + d.bikeId)} ${statusHtml}</div>
                <div class="gps-bike-addr">${escHtml(d.endereco || '—')}</div>
                <div class="gps-bike-speed">${d.speed ? d.speed + ' km/h' : 'Parada'}</div>
            </div>
            <button class="btn btn-ghost btn-sm" style="margin-top:6px;width:100%;font-size:0.72rem;padding:3px;" onclick="verRotaGPS(${d.rentalId})">&#128506; Ver rota</button>
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

// ── GPS Zone Alert ────────────────────────────────────
const _gpsPrevSuspeito = {};

function _playGpsAlert() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.28, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.45);
    } catch (_) {}
}

function _flashNavItem(keyword) {
    document.querySelectorAll('.sidebar-nav a').forEach(a => {
        if (a.textContent.includes(keyword)) {
            a.style.color = '#f59e0b';
            setTimeout(() => a.style.color = '', 4000);
        }
    });
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
        const prev = _gpsMarkers[data.bikeId]?._gpsData;
        if (data.isSuspeito && !_gpsPrevSuspeito[data.bikeId]) {
            showToast(`⚠ ${data.bikeNome || 'Bike #' + data.bikeId} saiu da zona segura!`, 'warning');
            _playGpsAlert();
            _flashNavItem('GPS');
        }
        _gpsPrevSuspeito[data.bikeId] = data.isSuspeito;
        const iconColor = data.bloqueada ? '#ef4444' : (data.isSuspeito ? '#f59e0b' : '#F5C000');
        if (_gpsMarkers[data.bikeId]) {
            _gpsMarkers[data.bikeId].setLatLng(latlng);
            _gpsMarkers[data.bikeId]._gpsData = data;
            _gpsMarkers[data.bikeId].setIcon(_bikeIcon(iconColor));
            _gpsMarkers[data.bikeId].setPopupContent(_gpsPopupHtml(data));
        } else {
            const marker = L.marker(latlng, { icon: _bikeIcon(iconColor) })
                .addTo(_gpsMap)
                .bindPopup(_gpsPopupHtml(data));
            marker._gpsData = data;
            _gpsMarkers[data.bikeId] = marker;
        }
        _gpsUpdateSidebar();
    }
}

function _gpsPopupHtml(d) {
    const rental = _rentalCache[d.rentalId];
    const alertHtml = d.isSuspeito
        ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:4px;padding:4px 6px;margin-bottom:6px;font-size:0.72rem;color:#92400e;">⚠ Fora da zona segura!</div>`
        : '';
    const clientHtml = rental?.usuarioNome
        ? `<div class="gps-popup-row" style="font-size:0.75rem;">👤 <b>${escHtml(rental.usuarioNome)}</b></div>`
        : '';
    const addrBtn = rental?.enderecoEntrega?.logradouro
        ? `<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:3px;padding:3px;font-size:0.7rem;" onclick="_toggleHomeMarker(${d.bikeId},${d.rentalId})">🏠 ${_homeMarkers[d.bikeId] ? 'Ocultar casa' : 'Ver casa do cliente'}</button>`
        : '';
    const btnHtml = d.bloqueada
        ? `<button class="btn btn-success btn-sm" style="width:100%;margin-top:6px;padding:4px;" onclick="desbloquearBikeGPS(${d.bikeId})">🔓 Desbloquear</button>`
        : `<button class="btn btn-danger btn-sm" style="width:100%;margin-top:6px;padding:4px;" onclick="bloquearBikeGPS(${d.bikeId})">🔒 Bloquear</button>`;
    return `${alertHtml}
        <div class="gps-popup-name" style="display:flex;align-items:center;gap:5px;">🚲 ${escHtml(d.bikeNome)}</div>
        ${clientHtml}
        <div class="gps-popup-row" style="color:var(--text-muted);font-size:0.71rem;">📋 Contrato #${d.rentalId}</div>
        <div class="gps-popup-row">📍 ${escHtml(d.endereco)}</div>
        <div class="gps-popup-row">⚡ ${d.speed ? d.speed + ' km/h' : 'Parada'}</div>
        <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:5px;padding:3px;font-size:0.71rem;" onclick="verRotaGPS(${d.rentalId})">🗺 Ver rota histórica</button>
        ${addrBtn}
        ${btnHtml}`;
}

async function bloquearBikeGPS(id) {
    if(!confirm('Tem certeza que deseja bloquear esta bike remotamente?')) return;
    try {
        const r = await fetch(`${API_BASE}/bikes/${id}/bloquear`, { method: 'PUT', headers: authHJ, body: JSON.stringify({}) });
        const d = await r.json();
        showToast(d.message || d.error || 'Ação concluída', r.ok ? 'success' : 'error');
    } catch(e) {
        showToast('Erro ao bloquear a bike.', 'error');
    }
}

async function desbloquearBikeGPS(id) {
    if(!confirm('Deseja desbloquear esta bike remotamente?')) return;
    try {
        const r = await fetch(`${API_BASE}/bikes/${id}/ativar`, { method: 'PUT', headers: authHJ });
        const d = await r.json();
        showToast(d.message || d.error || 'Bike desbloqueada', r.ok ? 'success' : 'error');
    } catch(e) {
        showToast('Erro ao desbloquear a bike.', 'error');
    }
}

function initGpsMap() {
    if (!_gpsInitialized) {
        _gpsInitialized = true;
        setTimeout(() => {
            if (!document.getElementById('gps-styles')) {
                const s = document.createElement('style');
                s.id = 'gps-styles';
                s.textContent = `@keyframes gps-pulse{0%{transform:scale(1);opacity:.7}70%{transform:scale(3.5);opacity:0}100%{transform:scale(3.5);opacity:0}}@keyframes spin{to{transform:rotate(360deg)}}`;
                document.head.appendChild(s);
            }
            _gpsMap = L.map('gpsMapContainer', { center: [-23.5505, -46.6333], zoom: 13, zoomControl: true });
            const _agDark = document.documentElement.getAttribute('data-theme') === 'dark';
            L.tileLayer(
                _agDark
                    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                { attribution: '© <a href="https://openstreetmap.org">OSM</a> © <a href="https://carto.com">CARTO</a>', maxZoom: 19 }
            ).addTo(_gpsMap);

            const ZONE = [-23.5615, -46.6560];
            L.circle(ZONE, { color: '#f97316', fillColor: '#f97316', fillOpacity: 0.04, radius: 5000, weight: 1.5, dashArray: '8 5' })
                .addTo(_gpsMap).bindPopup('<b>Zona de Monitoramento</b><br>Raio de 5km a partir do MASP');
            L.circle(ZONE, { color: '#f97316', fillColor: 'transparent', radius: 2500, weight: 1, dashArray: '3 9', opacity: 0.35 }).addTo(_gpsMap);
            L.marker(ZONE, { icon: L.divIcon({ className: '', iconSize: [40,40], iconAnchor: [20,20], html: `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:12px;height:12px;background:#f97316;border-radius:50%;animation:gps-pulse 2.5s ease-out infinite;"></div><div style="position:absolute;width:10px;height:10px;background:#f97316;border-radius:50%;border:2.5px solid #fff;z-index:2;box-shadow:0 1px 5px rgba(0,0,0,.5);"></div></div>` }), interactive: false }).addTo(_gpsMap);
            L.marker([-23.516, -46.656], { icon: L.divIcon({ className: '', iconSize: [150,18], iconAnchor: [75,9], html: `<div style="font-size:10px;font-weight:600;color:#f97316;background:rgba(0,0,0,.6);padding:2px 8px;border-radius:4px;white-space:nowrap;text-align:center;">● Zona Segura — 5 km</div>` }), interactive: false }).addTo(_gpsMap);

            _gpsStartSSE();
            _loadRentalCache();
        }, 80);
    } else {
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
    Object.values(_gpsMarkers).forEach(m => { if (_gpsMap) _gpsMap.removeLayer(m); });
    _gpsMarkers = {};
    _gpsUpdateSidebar();
    _gpsStartSSE();
}

// ── GPS Route History (mesma implementação do employee) ──
let _historyMap = null;
let _historyLayers = [];

async function _osrmMatch(points) {
    const MIN_MOVE = 0.00012, MAX_JUMP = 0.004;
    const clean = [points[0]];
    for (let i = 1; i < points.length; i++) {
        const p = clean[clean.length-1], dlat = points[i].lat-p.lat, dlng = points[i].lng-p.lng;
        const d = Math.sqrt(dlat*dlat+dlng*dlng);
        if (d < MIN_MOVE || d > MAX_JUMP) continue;
        clean.push(points[i]);
    }
    if (clean.length < 6) return [];
    const step = clean.length > 75 ? Math.ceil(clean.length/75) : 1;
    const sub = clean.filter((_,i) => i%step===0);
    if (sub[sub.length-1] !== clean[clean.length-1]) sub.push(clean[clean.length-1]);
    const chunks = [];
    for (let i = 0; i < sub.length; i += 24) chunks.push(sub.slice(i, Math.min(i+25, sub.length)));
    const results = [];
    for (const chunk of chunks) {
        const coords = chunk.map(p=>`${p.lng},${p.lat}`).join(';');
        const radii  = chunk.map(()=>'100').join(';');
        const url    = `https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&radiuses=${radii}`;
        const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(),9000);
        try { const r=await fetch(url,{signal:ctrl.signal}); clearTimeout(t); if(!r.ok) continue; const data=await r.json(); if(data.matchings?.length) results.push(...data.matchings.flatMap(m=>m.geometry.coordinates.map(([lng,lat])=>[lat,lng]))); } catch(_){clearTimeout(t);}
        await new Promise(res=>setTimeout(res,300));
    }
    return results;
}

function _bearing(lat1,lng1,lat2,lng2){const r=Math.PI/180,dL=(lng2-lng1)*r,y=Math.sin(dL)*Math.cos(lat2*r),x=Math.cos(lat1*r)*Math.sin(lat2*r)-Math.sin(lat1*r)*Math.cos(lat2*r)*Math.cos(dL);return(Math.atan2(y,x)*180/Math.PI+360)%360;}

function _addArrows(map,latlngs,color,layers){
    if(latlngs.length<4)return;
    const step=Math.max(Math.floor(latlngs.length/9),3);
    for(let i=step;i<latlngs.length-1;i+=step){
        const b=_bearing(latlngs[i-1][0],latlngs[i-1][1],latlngs[i][0],latlngs[i][1]);
        layers.push(L.marker(latlngs[i],{icon:L.divIcon({className:'',iconSize:[20,20],iconAnchor:[10,10],html:`<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;transform:rotate(${b}deg);color:${color||'#a78bfa'};font-size:12px;filter:drop-shadow(0 0 3px rgba(0,0,0,.7));pointer-events:none;">▶</div>`}),interactive:false,zIndexOffset:300}).addTo(map));
    }
}

function _glowPolyline(map,latlngs,color){
    const layers=[L.polyline(latlngs,{color,weight:14,opacity:.10,lineCap:'round',lineJoin:'round'}),L.polyline(latlngs,{color,weight:6,opacity:.35,lineCap:'round',lineJoin:'round'}),L.polyline(latlngs,{color:'#e0d7ff',weight:2.5,opacity:1,lineCap:'round',lineJoin:'round'})];
    layers.forEach(l=>l.addTo(map));_addArrows(map,latlngs,'#c4b5fd',layers);return layers;
}

function _rawPolyline(map,points){
    const layers=[],latlngs=points.map(p=>[p.lat,p.lng]);
    layers.push(L.polyline(latlngs,{color:'#6366f1',weight:12,opacity:.09,lineCap:'round',lineJoin:'round'}).addTo(map));
    for(let i=0;i<latlngs.length-1;i++){const s=points[i].speed||0,c=s>=20?'#22c55e':s>=12?'#eab308':s>=5?'#f97316':'#ef4444';layers.push(L.polyline([latlngs[i],latlngs[i+1]],{color:c,weight:3.5,opacity:.9,lineCap:'round'}).addTo(map));}
    _addArrows(map,latlngs,'#fff',layers);return layers;
}

const _FILTERS=[['30min',.5],['1h',1],['2h',2],['4h',4],['1 dia',24],['3 dias',72]];

async function verRotaGPS(rentalId, horas=1) {
    const modal=document.getElementById('gpsHistoryModal'),title=document.getElementById('gpsHistoryTitle'),
          stats=document.getElementById('gpsHistoryStats'),loading=document.getElementById('gpsHistoryLoading'),
          mapEl=document.getElementById('gpsHistoryMapContainer');
    title.textContent=`Rota — Locação #${rentalId}`;
    stats.innerHTML=''; loading.style.display='block'; loading.textContent='Carregando histórico...'; mapEl.style.display='none';
    modal.classList.add('open');

    const filterHtml=`<div style="display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap;align-items:center;"><span style="font-size:11px;color:var(--text-muted);">Período:</span>${_FILTERS.map(([label,val])=>{const active=val==horas;return`<button onclick="verRotaGPS(${rentalId},${val})" style="padding:3px 11px;font-size:11px;border-radius:99px;border:1px solid ${active?'transparent':'var(--border)'};background:${active?'var(--primary)':'var(--bg-secondary)'};color:${active?'#000':'var(--text-secondary)'};cursor:pointer;font-weight:${active?'600':'400'};">${label}</button>`;}).join('')}</div>`;

    try {
        const horasApi=horas<1?1:Math.round(horas),t0=Date.now();
        const r=await fetch(`${API_BASE}/gps/historico/${rentalId}?horas=${horasApi}`,{headers:authH});
        const d=await r.json(); const responseMs=Date.now()-t0;
        let points=d.history||[];
        if(horas===.5&&points.length){const cutoff=Date.now()-30*60*1000;points=points.filter(p=>new Date(p.registradoEm).getTime()>=cutoff);}
        loading.style.display='none';
        if(!points.length){stats.innerHTML=filterHtml+`<p style="color:var(--text-muted);text-align:center;padding:24px;">Nenhum ponto GPS neste período.<br><small>Tente ampliar o intervalo acima.</small></p>`;return;}

        const speeds=points.map(p=>p.speed||0).filter(s=>s>0);
        const avgSpeed=speeds.length?(speeds.reduce((a,b)=>a+b,0)/speeds.length).toFixed(1):'—';
        const maxSpeed=speeds.length?Math.max(...speeds).toFixed(1):'—';
        const firstTs=new Date(points[0].registradoEm),lastTs=new Date(points[points.length-1].registradoEm);
        const durMin=Math.round((lastTs-firstTs)/60000);
        const durStr=durMin>=60?`${Math.floor(durMin/60)}h${durMin%60?` ${durMin%60}min`:''}`:`${durMin}min`;
        const fmtTime=ts=>ts.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        const fmtDate=ts=>ts.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
        const sameDay=firstTs.toDateString()===lastTs.toDateString();
        const card=(label,value)=>`<div style="background:var(--bg-secondary);border-radius:8px;padding:5px 12px;font-size:11px;border:1px solid var(--border);min-width:60px;"><div style="color:var(--text-muted);margin-bottom:2px;">${label}</div><div style="font-weight:700;font-size:14px;">${value}</div></div>`;

        const _hav=(la1,lo1,la2,lo2)=>{const R=6371,r=Math.PI/180,a=Math.sin((la2-la1)*r/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin((lo2-lo1)*r/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));};
        const ZONE_LAT=-23.5615,ZONE_LNG=-46.6560,ZONE_KM=5;
        const zoneExits=[];let exitTs=null;
        for(const p of points){const out=_hav(p.lat,p.lng,ZONE_LAT,ZONE_LNG)>ZONE_KM;if(out&&!exitTs)exitTs=new Date(p.registradoEm);else if(!out&&exitTs){zoneExits.push({exitTs,returnTs:new Date(p.registradoEm),dMin:Math.round((new Date(p.registradoEm)-exitTs)/60000)});exitTs=null;}}
        if(exitTs)zoneExits.push({exitTs,returnTs:null,dMin:Math.round((lastTs-exitTs)/60000)});
        const zoneShow=zoneExits.slice(-5);const zoneMore=zoneExits.length-zoneShow.length;
        const zoneHtml=zoneExits.length?`<div style="margin-bottom:10px;"><span style="font-size:11px;color:var(--warning);font-weight:600;">⚠ Fora da zona${zoneExits.length>1?' ('+zoneExits.length+'x)':''}:</span><div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;">${zoneMore>0?`<span style="background:var(--bg-secondary);color:var(--text-muted);border:1px solid var(--border);padding:2px 9px;border-radius:99px;font-size:11px;">... e mais ${zoneMore} ocorrência${zoneMore>1?'s':''}</span>`:''}${zoneShow.map(e=>`<span style="background:var(--warning-bg);color:var(--warning);border:1px solid var(--warning-border);padding:2px 9px;border-radius:99px;font-size:11px;font-weight:600;">${fmtTime(e.exitTs)} — ${e.dMin<1?'<1':e.dMin}min fora${e.returnTs?` · voltou ${fmtTime(e.returnTs)}`:'  (ainda fora)'}</span>`).join('')}</div></div>`:'';

        stats.innerHTML=filterHtml+
            `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">${card('Duração',durStr)}${card('Vel. Média',avgSpeed+' km/h')}${card('Vel. Máx',maxSpeed+' km/h')}${card('Pontos GPS',points.length)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:11px;flex-wrap:wrap;">
                <span style="display:inline-flex;align-items:center;gap:4px;background:var(--success-bg);color:var(--success);border:1px solid var(--success-border);padding:3px 8px;border-radius:99px;font-weight:600;"><span style="width:7px;height:7px;background:var(--success);border-radius:50%;display:inline-block;"></span>Partida ${sameDay?'':fmtDate(firstTs)+' '}${fmtTime(firstTs)} — ${escHtml(points[0].endereco||'?')}</span>
                <span style="color:var(--text-muted);">→</span>
                <span style="display:inline-flex;align-items:center;gap:4px;background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger-border);padding:3px 8px;border-radius:99px;font-weight:600;"><span style="width:7px;height:7px;background:var(--danger);border-radius:50%;display:inline-block;"></span>Chegada ${sameDay?'':fmtDate(lastTs)+' '}${fmtTime(lastTs)} — ${escHtml(points[points.length-1].endereco||'?')}</span>
            </div>
            ${zoneHtml}
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;display:flex;align-items:center;"><span id="osrmStatus" style="opacity:.6;">▶ setas indicam direção de percurso</span><span style="margin-left:auto;opacity:.3;">${responseMs}ms</span></div>`;

        mapEl.style.display='';
        if(_historyMap){_historyMap.remove();_historyMap=null;}
        _historyLayers=[];
        _historyMap=L.map('gpsHistoryMapContainer',{zoomControl:true});
        const _adDark=document.documentElement.getAttribute('data-theme')==='dark';
        L.tileLayer(_adDark?'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png':'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{attribution:'© <a href="https://openstreetmap.org">OSM</a> © <a href="https://carto.com">CARTO</a>',maxZoom:19}).addTo(_historyMap);
        const rawLatLngs=points.map(p=>[p.lat,p.lng]);
        _historyLayers.push(..._rawPolyline(_historyMap,points));
        _historyMap.fitBounds(L.latLngBounds(rawLatLngs),{padding:[30,30]});
        setTimeout(()=>_historyMap.invalidateSize(),300);

        const startIcon=L.divIcon({className:'',iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-14],html:`<div style="width:22px;height:22px;background:#22c55e;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:#fff;border-radius:50%;"></div></div>`});
        const startM=L.marker(rawLatLngs[0],{icon:startIcon,zIndexOffset:1000}).addTo(_historyMap).bindPopup(`<b style="color:#22c55e;">▶ Partida</b><br>${escHtml(points[0].endereco||'—')}<br><small style="color:#666;">${firstTs.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small>`);
        _historyLayers.push(startM);
        let endM=null;
        if(rawLatLngs.length>1){const endIcon=L.divIcon({className:'',iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-14],html:`<div style="width:22px;height:22px;background:#ef4444;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:#fff;border-radius:50%;"></div></div>`});endM=L.marker(rawLatLngs[rawLatLngs.length-1],{icon:endIcon,zIndexOffset:1000}).addTo(_historyMap).bindPopup(`<b style="color:#ef4444;">⬛ Última posição</b><br>${escHtml(points[points.length-1].endereco||'—')}<br><small style="color:#666;">${lastTs.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small>`);_historyLayers.push(endM);}

        // Marcador 🏠 casa do cliente no mapa histórico
        const rental=_rentalCache[rentalId];
        if(rental?.enderecoEntrega?.logradouro){
            const addr=rental.enderecoEntrega;
            const q=[addr.logradouro,addr.numero,addr.bairro,addr.cidade||'São Paulo'].filter(Boolean).join(', ');
            fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`)
                .then(r=>r.json()).then(results=>{
                    if(!results?.length)return;
                    const {lat,lon}=results[0];
                    const homeIcon=L.divIcon({className:'',iconSize:[34,34],iconAnchor:[17,34],popupAnchor:[0,-36],html:`<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.5));">🏠</div>`});
                    const hm=L.marker([parseFloat(lat),parseFloat(lon)],{icon:homeIcon}).addTo(_historyMap).bindPopup(`<b>Casa — ${escHtml(rental.usuarioNome||'—')}</b><br><small style="color:#666;">${escHtml(q)}</small>`);
                    _historyLayers.push(hm);
                }).catch(()=>{});
        }

        try{
            const matched=await _osrmMatch(points);
            if(matched.length>5){
                _historyLayers.forEach(l=>{if(l!==startM&&l!==endM)_historyMap.removeLayer(l);});
                _historyLayers=_historyLayers.filter(l=>l===startM||l===endM);
                _historyLayers.push(..._glowPolyline(_historyMap,matched,'#818cf8'));
                if(startM)startM.bringToFront();if(endM)endM.bringToFront();
                _historyMap.fitBounds(L.latLngBounds(matched),{padding:[30,30]});
                const s=document.getElementById('osrmStatus');if(s)s.innerHTML='▶ setas indicam direção de percurso · rota ajustada às ruas';
            }
        }catch(_){}
    }catch(e){loading.style.display='none';stats.innerHTML=filterHtml+`<p style="color:var(--danger);text-align:center;padding:24px;">Erro ao carregar o histórico GPS.</p>`;}
}

function closeGpsHistory(){document.getElementById('gpsHistoryModal')?.classList.remove('open');}

// ── Vistorias ─────────────────────────────────────────
let allVistorias = [];
let _vistId = null;

function filterVistorias() {
    const sf = document.getElementById('vistSF')?.value || 'todos';
    const filtered = sf === 'todos' ? allVistorias : allVistorias.filter(v => v.status === sf);
    const cnt = document.getElementById('vistCount');
    if (cnt) cnt.textContent = `${filtered.length} de ${allVistorias.length}`;
    renderVistorias(filtered);
}

function renderVistorias(list) {
    const m = { pendente: 'badge-warning', aprovada: 'badge-success', reprovada: 'badge-danger' };
    const lbl = { pendente: 'Pendente', aprovada: 'Aprovada', reprovada: 'Reprovada' };
    document.getElementById('vistTbody').innerHTML = list.map(v =>
        `<tr class="clickable-row" onclick="openVistModal(${v.id})" style="cursor:pointer;" title="Clique para gerenciar">
            <td><strong>#${v.id}</strong></td>
            <td>#${v.aluguelId}</td>
            <td>${escHtml(v.bikeNome || '—')}</td>
            <td>${escHtml(v.usuarioNome || '—')}</td>
            <td><span class="badge ${m[v.status] || 'badge-muted'}">${lbl[v.status] || v.status}</span></td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(v.observacao || '')}">${escHtml(v.observacao || '—')}</td>
            <td>${v.criadaEm ? new Date(v.criadaEm).toLocaleDateString('pt-BR') : '—'}</td>
            <td onclick="event.stopPropagation()">
                ${v.status === 'pendente' ? `<button class="btn btn-primary btn-sm" onclick="openVistModal(${v.id})">Gerenciar</button>` : '—'}
            </td>
        </tr>`
    ).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhuma vistoria encontrada.</td></tr>';
}

async function loadVist() {
    try {
        const d = await fetch(`${API_BASE}/vistorias`, { headers: authH }).then(r => r.json());
        allVistorias = d.vistorias || [];
        filterVistorias();
    } catch (e) { showToast('Erro ao carregar vistorias.', 'error'); }
}

function openVistModal(id) {
    const v = allVistorias.find(x => x.id === id);
    if (!v) return;
    _vistId = id;
    const m = { pendente: 'badge-warning', aprovada: 'badge-success', reprovada: 'badge-danger' };
    const lbl = { pendente: 'Pendente', aprovada: 'Aprovada', reprovada: 'Reprovada' };
    document.getElementById('vistModalTitle').textContent = `Vistoria #${v.id}`;
    document.getElementById('vistModalBadge').innerHTML = `<span class="badge ${m[v.status] || 'badge-muted'}">${lbl[v.status] || v.status}</span>`;
    const row = (label, val) => `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.85rem;"><span style="color:var(--text-muted);">${label}</span><strong>${val}</strong></div>`;
    document.getElementById('vistModalInfo').innerHTML = [
        row('Locação', `#${v.aluguelId}`),
        row('Bike', escHtml(v.bikeNome || '—')),
        row('Usuário', escHtml(v.usuarioNome || '—')),
        row('Data', v.criadaEm ? new Date(v.criadaEm).toLocaleDateString('pt-BR') : '—'),
        v.observacao ? `<div style="margin-top:8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:10px;font-size:0.82rem;"><strong>Observação anterior:</strong><br><span style="color:var(--text-secondary);">${escHtml(v.observacao)}</span></div>` : '',
    ].filter(Boolean).join('');
    const obsEl = document.getElementById('vistModalObs');
    obsEl.value = '';
    const obsWrap = document.getElementById('vistModalObsWrap');
    const actionsEl = document.getElementById('vistModalActions');
    if (v.status === 'pendente') {
        if (obsWrap) obsWrap.hidden = false;
        actionsEl.innerHTML = `
            <button class="btn btn-success btn-sm" onclick="confirmVist('aprovar')">Aprovar vistoria</button>
            <button class="btn btn-danger btn-sm" onclick="confirmVist('reprovar')">Reprovar vistoria</button>
            <button class="btn btn-ghost btn-sm" onclick="closeVistModal()">Fechar</button>`;
    } else {
        if (obsWrap) obsWrap.hidden = true;
        actionsEl.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="closeVistModal()">Fechar</button>`;
    }
    document.getElementById('vistModal').classList.add('open');
    if (v.status === 'pendente') setTimeout(() => obsEl.focus(), 80);
}

function closeVistModal() {
    document.getElementById('vistModal').classList.remove('open');
    _vistId = null;
}

async function confirmVist(action) {
    if (!_vistId) return;
    const obs = document.getElementById('vistModalObs')?.value?.trim();
    if (!obs) { showToast('Informe a observação técnica antes de confirmar.', 'warning'); return; }
    const btns = document.querySelectorAll('#vistModalActions button');
    btns.forEach(b => b.disabled = true);
    const r = await fetch(`${API_BASE}/vistorias/${_vistId}/${action}`, { method: 'PUT', headers: authHJ, body: JSON.stringify({ observacao: obs }) });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) { closeVistModal(); loadVist(); }
    btns.forEach(b => b.disabled = false);
}

// ── Chamados Admin ────────────────────────────────────
let _allChamadosAdmin = [];
let _chamadoAdminId = null;

const _aTipoChamado = { manutencao:'Manutenção', duvida_fatura:'Dúvida na fatura', avaria:'Avaria', outros:'Outros' };
const _aPrioridade  = { baixa:'🔵 Baixa', normal:'🟡 Normal', alta:'🟠 Alta', urgente:'🔴 Urgente' };

function filterChamadosAdmin() { loadChamadosAdmin(); }

async function loadChamadosAdmin() {
    const sf = document.getElementById('chamadoAdminSF')?.value || '';
    const tf = document.getElementById('chamadoAdminTF')?.value || '';
    try {
        const url = sf ? `${API_BASE}/chamados?status=${sf}` : `${API_BASE}/chamados`;
        const d = await fetch(url, { headers: authH }).then(r => r.json());
        _allChamadosAdmin = (d.tickets || []).filter(t => !tf || t.tipo === tf);
        const cnt = document.getElementById('chamadoAdminCount');
        if (cnt) cnt.textContent = `${_allChamadosAdmin.length} chamados`;
        renderChamadosAdmin(_allChamadosAdmin);
    } catch (e) { showToast('Erro ao carregar chamados.', 'error'); }
}

function renderChamadosAdmin(list) {
    const sMap = { aberto:'badge-danger', em_atendimento:'badge-warning', aguardando_pagamento:'badge-info', resolvido:'badge-success', cancelado:'badge-muted' };
    const sLbl = { aberto:'Aberto', em_atendimento:'Em atendimento', aguardando_pagamento:'Aguard. pagamento', resolvido:'Resolvido', cancelado:'Cancelado' };
    const segB = s => { const c = { premium:'badge-success', intermediario:'badge-warning', basico:'badge-muted' }; return s ? `<span class="badge ${c[s]||'badge-muted'}" style="font-size:10px;">${s}</span>` : '—'; };
    document.getElementById('chamadoAdminTbody').innerHTML = list.map(t =>
        `<tr class="clickable-row" onclick="openChamadoAdminModal(${t.id})" style="cursor:pointer;">
            <td><strong>#${t.id}</strong></td>
            <td>${escHtml(t.usuarioNome||'—')}</td>
            <td>${escHtml(_aTipoChamado[t.tipo]||t.tipo)}</td>
            <td>${segB(t.tipoSeguro)}</td>
            <td style="font-size:11px;">${_aPrioridade[t.prioridade]||t.prioridade}</td>
            <td><span class="badge ${sMap[t.status]||'badge-muted'}">${sLbl[t.status]||t.status}</span></td>
            <td>${escHtml(t.funcionarioNome||'—')}</td>
            <td>${t.criadoEm ? new Date(t.criadoEm).toLocaleDateString('pt-BR') : '—'}</td>
            <td onclick="event.stopPropagation()">
                ${t.status !== 'resolvido' && t.status !== 'cancelado'
                    ? `<button class="btn btn-danger btn-sm" onclick="cancelarChamadoAdmin(${t.id})">Cancelar</button>` : '—'}
            </td>
        </tr>`
    ).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhum chamado encontrado.</td></tr>';
}

function openChamadoAdminModal(id) {
    const t = _allChamadosAdmin.find(x => x.id === id);
    if (!t) return;
    _chamadoAdminId = id;
    const sMap = { aberto:'badge-danger', em_atendimento:'badge-warning', aguardando_pagamento:'badge-info', resolvido:'badge-success', cancelado:'badge-muted' };
    const sLbl = { aberto:'Aberto', em_atendimento:'Em atendimento', aguardando_pagamento:'Aguard. pagamento', resolvido:'Resolvido', cancelado:'Cancelado' };
    document.getElementById('chamadoAdminModalTitle').textContent = `Chamado #${t.id}`;
    document.getElementById('chamadoAdminModalBadge').innerHTML = `<span class="badge ${sMap[t.status]||'badge-muted'}">${sLbl[t.status]||t.status}</span>`;
    const row = (l,v) => `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.84rem;"><span style="color:var(--text-muted);">${l}</span><strong>${v}</strong></div>`;
    const segB = s => { const c = {premium:'badge-success',intermediario:'badge-warning',basico:'badge-muted'}; return s?`<span class="badge ${c[s]||'badge-muted'}">${s}</span>`:'—'; };
    document.getElementById('chamadoAdminModalInfo').innerHTML = [
        row('Tipo', escHtml(_aTipoChamado[t.tipo]||t.tipo)),
        row('Usuário', escHtml(t.usuarioNome||'—')),
        row('Locação', `#${t.rentalId}` + (t.bikeNome?` · ${escHtml(t.bikeNome)}`:'')),
        row('Plano seguro', segB(t.tipoSeguro)),
        row('Prioridade', _aPrioridade[t.prioridade]||t.prioridade),
        row('Atendente', escHtml(t.funcionarioNome||'—')),
        t.custoGerado ? row('Custo gerado', `R$ ${Number(t.custoGerado).toFixed(2)} ${t.cobertoPLano?'(coberto pelo plano)':'(fatura gerada)'}`) : '',
        `<div style="margin-top:8px;background:var(--bg-primary,var(--bg-main));border:1px solid var(--border);border-radius:6px;padding:10px;font-size:0.82rem;"><strong>Descrição:</strong><br><span style="color:var(--text-secondary);">${escHtml(t.descricao)}</span></div>`,
        t.resolucao ? `<div style="margin-top:6px;background:var(--bg-primary,var(--bg-main));border:1px solid var(--border);border-radius:6px;padding:10px;font-size:0.82rem;"><strong>Resolução:</strong><br><span style="color:var(--text-secondary);">${escHtml(t.resolucao)}</span></div>` : '',
    ].filter(Boolean).join('');
    const actEl = document.getElementById('chamadoAdminModalActions');
    actEl.innerHTML = t.status !== 'resolvido' && t.status !== 'cancelado'
        ? `<button class="btn btn-danger btn-sm" onclick="cancelarChamadoAdmin(${t.id})">Cancelar chamado</button><button class="btn btn-ghost btn-sm" onclick="closeChamadoAdminModal()">Fechar</button>`
        : `<button class="btn btn-ghost btn-sm" onclick="closeChamadoAdminModal()">Fechar</button>`;
    document.getElementById('chamadoAdminModal').classList.add('open');
}

function closeChamadoAdminModal() {
    document.getElementById('chamadoAdminModal')?.classList.remove('open');
    _chamadoAdminId = null;
}

async function cancelarChamadoAdmin(id) {
    if (!confirm('Cancelar este chamado?')) return;
    const r = await fetch(`${API_BASE}/chamados/${id}/cancelar`, { method: 'PUT', headers: authH });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) { closeChamadoAdminModal(); loadChamadosAdmin(); }
}

// ── Usuários ──────────────────────────────────────────
let allUsers = [];

function filterUsers() {
    const q = (document.getElementById('userQ')?.value || '').toLowerCase();
    const filtered = q
        ? allUsers.filter(u => (u.nome || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
        : allUsers;
    const cnt = document.getElementById('userCount');
    if (cnt) cnt.textContent = `${filtered.length} de ${allUsers.length}`;
    renderUsers(filtered);
}

function renderUsers(list) {
    const m = { user: 'badge-success', funcionario: 'badge-warning', admin: 'badge-purple' };
    const label = { user: 'Usuário', funcionario: 'Funcionário', admin: 'Admin' };
    document.getElementById('userTbody').innerHTML = list.map(u =>
        `<tr class="clickable-row" onclick="openUserModal(${u.id})" style="cursor:pointer;" title="Ver detalhes">
          <td>#${u.id}</td>
          <td><strong>${escHtml(u.nome)}</strong></td>
          <td>${escHtml(u.email)}</td>
          <td><span class="badge ${m[u.role] || 'badge-muted'}">${label[u.role] || u.role}</span></td>
          <td>${u.criadoEm ? new Date(u.criadoEm).toLocaleDateString('pt-BR') : '—'}</td>
          <td onclick="event.stopPropagation()">
            ${u.role !== 'admin' ? `<button class="btn btn-danger btn-sm" style="padding:3px 10px;" onclick="excluirUsuario(${u.id},'${escHtml(u.nome)}')">Excluir</button>` : '—'}
          </td>
        </tr>`
    ).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhum usuário encontrado.</td></tr>';
}

async function loadUsers() {
    const d = await fetch(`${API_BASE}/admin/usuarios`, { headers: authH }).then(r => r.json());
    allUsers = d.usuarios || [];
    filterUsers();
}

async function openUserModal(id) {
    const u = allUsers.find(x => x.id === id);
    if (!u) return;
    const roleLabel = { user: 'Usuário', funcionario: 'Funcionário', admin: 'Admin' };
    const roleBadge = { user: 'badge-success', funcionario: 'badge-warning', admin: 'badge-purple' };
    document.getElementById('userModalName').textContent = u.nome || '—';
    document.getElementById('userModalBadge').innerHTML = `<span class="badge ${roleBadge[u.role] || 'badge-muted'}">${roleLabel[u.role] || u.role}</span>`;
    document.getElementById('userModalInfo').innerHTML =
        `<span style="font-size:0.82rem;color:var(--text-muted);">${escHtml(u.email)}</span>` +
        (u.criadoEm ? `<span style="font-size:0.79rem;color:var(--text-muted);margin-left:10px;">Membro desde ${new Date(u.criadoEm).toLocaleDateString('pt-BR')}</span>` : '');
    if (!allLocacoes.length) {
        try {
            const ld = await fetch(`${API_BASE}/admin/alugueis`, { headers: authH }).then(r => r.json());
            allLocacoes = ld.alugueis || [];
        } catch (_) {}
    }
    const userLoc = allLocacoes.filter(a => String(a.usuarioId) === String(u.id) || a.usuarioNome === u.nome);
    const locList = document.getElementById('userModalLocacoes');
    if (!userLoc.length) {
        locList.innerHTML = `<p style="color:var(--text-muted);font-size:0.83rem;text-align:center;padding:16px 0;">Nenhuma locação registrada.</p>`;
    } else {
        locList.innerHTML = userLoc.slice(0, 10).map(a => {
            const di = new Date(a.dataInicio).toLocaleDateString('pt-BR');
            const dd = new Date(a.dataDevolucaoPrevista).toLocaleDateString('pt-BR');
            return `<div onclick="closeUserModal();openLocacaoModal(${a.id})" style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:9px 12px;font-size:0.82rem;cursor:pointer;gap:8px;margin-bottom:6px;transition:border-color .15s;" onmouseenter="this.style.borderColor='var(--primary,#F5C000)'" onmouseleave="this.style.borderColor='var(--border)'">
                <div>
                    <strong>#${a.id}</strong> — ${escHtml(a.bikeNome || '—')}
                    <div style="color:var(--text-muted);font-size:0.77rem;margin-top:1px;">${escHtml(a.planoLabel || a.tipo)} · ${di} → ${dd}</div>
                </div>
                <div style="flex-shrink:0;">${sBadge(a.status)}</div>
            </div>`;
        }).join('') + (userLoc.length > 10 ? `<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;margin-top:4px;">+${userLoc.length - 10} locações anteriores</p>` : '');
    }
    const actEl = document.getElementById('userModalActions');
    actEl.innerHTML = u.role !== 'admin'
        ? `<button class="btn btn-danger btn-sm" onclick="excluirUsuario(${u.id},'${escHtml(u.nome)}');closeUserModal()">Excluir usuário</button>
           <button class="btn btn-ghost btn-sm" onclick="closeUserModal()">Fechar</button>`
        : `<button class="btn btn-ghost btn-sm" onclick="closeUserModal()">Fechar</button>`;
    document.getElementById('userModal').classList.add('open');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('open');
}

// ── Criar Usuário ─────────────────────────────────────
function abrirModalCriarUsuario() {
    document.getElementById('cuNome').value = '';
    document.getElementById('cuEmail').value = '';
    document.getElementById('cuSenha').value = '';
    document.getElementById('cuRole').value = 'user';
    document.getElementById('cuErro').style.display = 'none';
    const btn = document.getElementById('cuBtn');
    btn.disabled = false;
    btn.textContent = 'Criar';
    document.getElementById('criarUsuarioModal').classList.add('open');
}

function fecharModalCriarUsuario() {
    document.getElementById('criarUsuarioModal').classList.remove('open');
}

async function confirmarCriarUsuario() {
    const nome  = document.getElementById('cuNome').value.trim();
    const email = document.getElementById('cuEmail').value.trim();
    const senha = document.getElementById('cuSenha').value;
    const role  = document.getElementById('cuRole').value;
    const erro  = document.getElementById('cuErro');
    const btn   = document.getElementById('cuBtn');

    erro.style.display = 'none';
    if (!nome || !email || !senha) {
        erro.textContent = 'Preencha todos os campos obrigatórios.';
        erro.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Criando...';

    try {
        const r = await fetch(`${API_BASE}/admin/usuarios`, {
            method: 'POST',
            headers: authHJ,
            body: JSON.stringify({ nome, email, senha, role })
        });
        const d = await r.json();
        if (!r.ok) {
            erro.textContent = d.error || d.message || 'Erro ao criar usuário.';
            erro.style.display = 'block';
            return;
        }
        fecharModalCriarUsuario();
        showToast(d.message || 'Usuário criado com sucesso!', 'success');
        loadUsers();
    } catch (e) {
        erro.textContent = 'Erro de conexão com o servidor.';
        erro.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Criar';
    }
}

async function excluirUsuario(id, nome) {
    if (!confirm(`Excluir o usuário "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const r = await fetch(`${API_BASE}/admin/usuarios/${id}`, { method: 'DELETE', headers: authH });
    const d = await r.json();
    showToast(d.message || d.error || 'Ação concluída.', r.ok ? 'success' : 'error');
    if (r.ok) loadUsers();
}

// ── Categorias (stub — implementação completa no bloco final) ─

// ── Close modals on Escape ────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.getElementById('editModalOverlay').classList.remove('open');
        closeBikeDetailsModal();
        closeLocacaoModal();
        if (typeof closeVistModal === 'function') closeVistModal();
        if (typeof closeUserModal === 'function') closeUserModal();
        if (typeof closeRejPagModal === 'function') closeRejPagModal();
        if (typeof closeChamadoAdminModal === 'function') closeChamadoAdminModal();
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
    // Pré-carrega categorias para que o select já esteja pronto ao abrir a seção Bikes
    loadCategories();
});

window.bloquearBikeGPS = bloquearBikeGPS;
window.desbloquearBikeGPS = desbloquearBikeGPS;
window.verRotaGPS = verRotaGPS;
window.closeGpsHistory = closeGpsHistory;
window._gpsFlyTo = _gpsFlyTo;
window._toggleHomeMarker = _toggleHomeMarker;
window.abrirModalCriarUsuario = abrirModalCriarUsuario;
window.fecharModalCriarUsuario = fecharModalCriarUsuario;
window.confirmarCriarUsuario = confirmarCriarUsuario;
window.excluirUsuario = excluirUsuario;
// ── Seguros por Bicicleta ─────────────────────────────
let _coberturaPlanos = [];
let _segurosAllBikes  = [];
let _planoEditingId   = null;

async function loadPlanos() {
    const listEl  = document.getElementById('coberturaPlanosList');
    const bikesEl = document.getElementById('segurosPosBikeList');
    if (listEl)  listEl.innerHTML  = '<p style="color:var(--text-secondary);">Carregando...</p>';
    if (bikesEl) bikesEl.innerHTML = '<p style="color:var(--text-secondary);">Carregando...</p>';
    try {
        const [planosRes, bikesRes] = await Promise.all([
            fetch(`${API_BASE}/admin/planos`, { headers: authH }),
            fetch(`${API_BASE}/bikes`)
        ]);
        const planosData = await planosRes.json();
        const bikesData  = await bikesRes.json();
        _coberturaPlanos = Array.isArray(planosData) ? planosData : [];
        _segurosAllBikes = bikesData.bikes || [];
        renderCoberturaPlanos();
        renderSegurosPosBike(_segurosAllBikes);
    } catch {
        if (listEl) listEl.innerHTML = '<p style="color:var(--danger);">Erro ao carregar seguros.</p>';
    }
}

function renderCoberturaPlanos() {
    const el = document.getElementById('coberturaPlanosList');
    if (!el) return;
    if (!_coberturaPlanos.length) {
        el.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">Nenhum plano cadastrado. Clique em "+ Novo seguro" para criar.</p>`;
        return;
    }
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;">
      ${_coberturaPlanos.map(p => {
        const cobList = [
            p.cobreManutencao   && '🔧 Manutenção',
            p.cobreAvaria       && '💥 Avaria',
            p.cobreDuvidaFatura && '📄 Fatura',
            p.cobreOutros       && '📦 Outros'
        ].filter(Boolean).join(', ') || 'Sem coberturas';
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;${p.ativo ? '' : 'opacity:0.55;'}">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.88rem;">
              ${escHtml(p.nome)}
              ${!p.ativo ? '<span class="badge badge-muted" style="font-size:0.7rem;margin-left:6px;">Inativo</span>' : ''}
            </div>
            <div style="font-size:0.74rem;color:var(--text-muted);margin-top:2px;">
              ${Number(p.valorAdicional) > 0 ? `+ R$ ${Number(p.valorAdicional).toFixed(2).replace('.',',')} / ciclo · ` : 'Sem custo adicional · '}${cobList}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <span class="badge badge-muted" style="font-size:0.72rem;">${(p.bikeIds||[]).length} bike${(p.bikeIds||[]).length !== 1 ? 's' : ''}</span>
            <button class="btn btn-ghost btn-sm" onclick="openEditarPlanoModal(${p.id})">Editar</button>
            ${p.ativo ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="desativarPlano(${p.id})">Desativar</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderSegurosPosBike(bikes) {
    const el = document.getElementById('segurosPosBikeList');
    if (!el) return;
    const activeBikes = (bikes || []).filter(b => !b.removida);
    if (!activeBikes.length) {
        el.innerHTML = `<div class="empty-state"><strong>Nenhuma bike cadastrada</strong><span>Cadastre bikes na aba Bikes para associar seguros.</span></div>`;
        return;
    }
    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
      ${activeBikes.map(b => {
        const assignedPlans = _coberturaPlanos.filter(p => (p.bikeIds || []).includes(b.id));
        const nomeSafe = escHtml(b.nome).replace(/'/g, "\\'");
        return `<div class="card">
          <div class="card-body" style="padding:16px 18px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">
              <div>
                <div style="font-weight:700;font-size:0.95rem;">${escHtml(b.nome)}</div>
                <div style="font-size:0.76rem;color:var(--text-muted);margin-top:2px;">${escHtml(b.categoria || '')}</div>
              </div>
              <span class="badge ${assignedPlans.length > 0 ? 'badge-success' : 'badge-muted'}" style="flex-shrink:0;">
                ${assignedPlans.length} seguro${assignedPlans.length !== 1 ? 's' : ''}
              </span>
            </div>
            ${assignedPlans.length > 0
              ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">
                  ${assignedPlans.map(p => `<span class="badge badge-accent" style="font-size:0.72rem;">${escHtml(p.nome)}</span>`).join('')}
                 </div>`
              : `<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">Nenhum seguro vinculado.</p>`
            }
            <button class="btn btn-secondary btn-sm" style="width:100%;" onclick="abrirBikePlanos(${b.id},'${nomeSafe}')">
              ⚙️ Gerenciar seguros
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ── Modal criar/editar plano ──────────────────────────

function openCriarPlanoModal() {
    _planoEditingId = null;
    document.getElementById('planoModalTitle').textContent = 'Novo plano de cobertura';
    document.getElementById('planoModalSaveBtn').textContent = 'Criar plano';
    document.getElementById('planoModalId').value   = '';
    document.getElementById('planoModalNome').value = '';
    document.getElementById('planoModalDesc').value = '';
    document.getElementById('planoModalValor').value = '0';
    document.getElementById('pCM').checked   = false;
    document.getElementById('pCA').checked   = false;
    document.getElementById('pCDF').checked  = true;
    document.getElementById('pCO').checked   = false;
    document.getElementById('planoModalError').style.display = 'none';
    document.getElementById('planoModal').style.display = 'flex';
}

function openEditarPlanoModal(id) {
    const p = _coberturaPlanos.find(x => x.id === id);
    if (!p) return;
    _planoEditingId = id;
    document.getElementById('planoModalTitle').textContent = 'Editar plano';
    document.getElementById('planoModalSaveBtn').textContent = 'Salvar';
    document.getElementById('planoModalId').value   = id;
    document.getElementById('planoModalNome').value = p.nome;
    document.getElementById('planoModalDesc').value = p.descricao || '';
    document.getElementById('planoModalValor').value = p.valorAdicional || 0;
    document.getElementById('pCM').checked   = !!p.cobreManutencao;
    document.getElementById('pCA').checked   = !!p.cobreAvaria;
    document.getElementById('pCDF').checked  = !!p.cobreDuvidaFatura;
    document.getElementById('pCO').checked   = !!p.cobreOutros;
    document.getElementById('planoModalError').style.display = 'none';
    document.getElementById('planoModal').style.display = 'flex';
}

function closePlanoModal() {
    document.getElementById('planoModal').style.display = 'none';
}

async function salvarPlano() {
    const nome = document.getElementById('planoModalNome').value.trim();
    if (!nome) {
        const errEl = document.getElementById('planoModalError');
        errEl.textContent = 'Informe um nome para o plano.';
        errEl.style.display = 'block';
        return;
    }
    const body = {
        nome,
        descricao:         document.getElementById('planoModalDesc').value.trim() || null,
        valorAdicional:    parseFloat(document.getElementById('planoModalValor').value) || 0,
        cobreManutencao:   document.getElementById('pCM').checked,
        cobreAvaria:       document.getElementById('pCA').checked,
        cobreDuvidaFatura: document.getElementById('pCDF').checked,
        cobreOutros:       document.getElementById('pCO').checked,
        ativo:             true,
    };
    try {
        const url    = _planoEditingId ? `${API_BASE}/admin/planos/${_planoEditingId}` : `${API_BASE}/admin/planos`;
        const method = _planoEditingId ? 'PUT' : 'POST';
        const r = await fetch(url, { method, headers: authHJ, body: JSON.stringify(body) });
        const d = await r.json();
        showToast(d.message || (r.ok ? 'Salvo!' : (d.error || 'Erro.')), r.ok ? 'success' : 'error');
        if (r.ok) { closePlanoModal(); loadPlanos(); }
    } catch {
        showToast('Erro ao salvar plano.', 'error');
    }
}

async function desativarPlano(id) {
    if (!confirm('Desativar este plano? Ele não aparecerá para novas locações.')) return;
    try {
        const r = await fetch(`${API_BASE}/admin/planos/${id}`, { method: 'DELETE', headers: authH });
        const d = await r.json();
        showToast(d.message || (r.ok ? 'Plano desativado.' : (d.error || 'Erro.')), r.ok ? 'success' : 'error');
        if (r.ok) loadPlanos();
    } catch {
        showToast('Erro ao desativar plano.', 'error');
    }
}

// ── Gerenciar seguros de uma bike ─────────────────────

let _planoBikesId = null;

async function abrirBikePlanos(bikeId, bikeNome) {
    _planoBikesId = bikeId;
    document.getElementById('planoBikesTitle').textContent = `Seguros de: ${bikeNome}`;
    document.getElementById('planoBikesWrap').style.display = '';
    document.getElementById('planoBikesList').innerHTML = '<p style="color:var(--text-secondary);">Carregando...</p>';
    document.getElementById('planoBikesWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
        const r = await fetch(`${API_BASE}/planos/bike/${bikeId}`);
        const assignedArr = await r.json();
        const assignedIds = new Set((Array.isArray(assignedArr) ? assignedArr : []).map(p => p.id));
        const plans = _coberturaPlanos.map(p => ({ ...p, assigned: assignedIds.has(p.id) }));
        renderPlanoBikes(bikeId, plans);
    } catch {
        document.getElementById('planoBikesList').innerHTML = '<p style="color:var(--danger);">Erro ao carregar seguros.</p>';
    }
}

function fecharPlanoBikes() {
    _planoBikesId = null;
    document.getElementById('planoBikesWrap').style.display = 'none';
}

function renderPlanoBikes(bikeId, plans) {
    const el = document.getElementById('planoBikesList');
    if (!el) return;
    if (!plans.length) {
        el.innerHTML = `<div class="empty-state"><strong>Nenhum plano disponível</strong><span>Crie um seguro clicando em "+ Novo seguro".</span></div>`;
        return;
    }
    const cobTagSm = (on, label) => on
        ? `<span class="badge badge-success" style="font-size:0.70rem;padding:2px 7px;">${label}</span>`
        : `<span class="badge badge-muted"   style="font-size:0.70rem;padding:2px 7px;">${label}</span>`;

    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;">
      ${plans.map(p => `
        <div class="plano-bike-card${p.assigned ? ' assigned' : ''}" id="bike-plano-card-${p.id}" style="${p.ativo ? '' : 'opacity:0.55;'}">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.88rem;">${escHtml(p.nome)}</div>
            <div style="font-size:0.75rem;color:var(--color-primary,#F5C000);font-weight:700;margin-top:3px;">
              ${Number(p.valorAdicional) > 0 ? `+ R$ ${Number(p.valorAdicional).toFixed(2).replace('.',',')} / ciclo` : 'Sem custo adicional'}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:7px;">
              ${cobTagSm(p.cobreManutencao,   '🔧 Manutenção')}
              ${cobTagSm(p.cobreAvaria,       '💥 Avaria')}
              ${cobTagSm(p.cobreDuvidaFatura, '📄 Fatura')}
              ${cobTagSm(p.cobreOutros,       '📦 Outros')}
            </div>
          </div>
          <button class="plano-bike-toggle${p.assigned ? ' on' : ''}" id="toggle-${bikeId}-${p.id}"
            onclick="toggleBikePlano(${p.id},${bikeId},${!p.assigned})"
            title="${p.assigned ? 'Remover da bike' : 'Adicionar à bike'}">
          </button>
        </div>`).join('')}
    </div>`;
}

async function toggleBikePlano(planoId, bikeId, assign) {
    try {
        const url    = `${API_BASE}/admin/planos/${planoId}/bikes/${bikeId}`;
        const method = assign ? 'POST' : 'DELETE';
        const r = await fetch(url, { method, headers: authH });
        const d = await r.json();
        if (r.ok) {
            const card   = document.getElementById(`bike-plano-card-${planoId}`);
            const toggle = document.getElementById(`toggle-${bikeId}-${planoId}`);
            if (assign) {
                card?.classList.add('assigned');
                toggle?.classList.add('on');
                toggle?.setAttribute('onclick', `toggleBikePlano(${planoId},${bikeId},false)`);
                toggle?.setAttribute('title', 'Remover da bike');
            } else {
                card?.classList.remove('assigned');
                toggle?.classList.remove('on');
                toggle?.setAttribute('onclick', `toggleBikePlano(${planoId},${bikeId},true)`);
                toggle?.setAttribute('title', 'Adicionar à bike');
            }
            showToast(d.message || 'Salvo!', 'success');
            loadPlanos();
        } else {
            showToast(d.message || d.error || 'Erro.', 'error');
        }
    } catch {
        showToast('Erro ao atualizar seguro.', 'error');
    }
}

window.loadChamadosAdmin = loadChamadosAdmin;
window.filterChamadosAdmin = filterChamadosAdmin;
window.openChamadoAdminModal = openChamadoAdminModal;
window.closeChamadoAdminModal = closeChamadoAdminModal;
window.cancelarChamadoAdmin = cancelarChamadoAdmin;
window.loadPlanos           = loadPlanos;
window.openCriarPlanoModal  = openCriarPlanoModal;
window.openEditarPlanoModal = openEditarPlanoModal;
window.closePlanoModal      = closePlanoModal;
window.salvarPlano          = salvarPlano;
window.desativarPlano       = desativarPlano;
window.abrirBikePlanos      = abrirBikePlanos;
window.fecharPlanoBikes     = fecharPlanoBikes;
window.toggleBikePlano      = toggleBikePlano;
window.renderSegurosPosBike = renderSegurosPosBike;

// ── Categorias de Bicicletas ─────────────────────────
let _allCategories = [];

async function loadCategories() {
    const list = document.getElementById('categoryList');
    if (list) list.innerHTML = '<p style="color:var(--text-muted);font-size:0.84rem;">Carregando...</p>';
    try {
        const d = await fetch(`${API_BASE}/bike-categories`, { headers: authH }).then(r => r.json());
        _allCategories = d.categorias || [];
        _renderCategories();
        _fillCategorySelects();
    } catch {
        if (list) list.innerHTML = '<p style="color:var(--text-muted);">Erro ao carregar categorias.</p>';
    }
    _loadSimTime();
}

function _fillCategorySelects() {
    ['bCat', 'editCat'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel || sel.tagName !== 'SELECT') return;
        const current = sel.value;
        sel.innerHTML = _allCategories.map(c =>
            `<option value="${escHtml(c.nome)}" ${c.nome === current ? 'selected' : ''}>${escHtml(c.nome)}</option>`
        ).join('');
    });
}

function _renderCategories() {
    const list = document.getElementById('categoryList');
    if (!list) return;
    if (!_allCategories.length) {
        list.innerHTML = '<p style="color:var(--text-muted);font-size:0.84rem;">Nenhuma categoria cadastrada ainda.</p>';
        return;
    }
    list.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${_allCategories.map(c => `
            <span style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary);padding:5px 14px 5px 16px;border-radius:99px;font-size:0.82rem;font-weight:600;">
                ${escHtml(c.nome)}
                <button onclick="deleteCategory(${c.id})" title="Remover" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;line-height:1;padding:0 2px;display:inline-flex;align-items:center;opacity:.7;" onmouseover="this.style.opacity=1;this.style.color='var(--danger)'" onmouseout="this.style.opacity=.7;this.style.color='var(--text-muted)'">×</button>
            </span>
        `).join('')}
    </div>`;
}

async function addCategory() {
    const input = document.getElementById('newCategoryName');
    const nome = input?.value?.trim();
    if (!nome) { showToast('Digite o nome da categoria.', 'error'); return; }
    try {
        const r = await fetch(`${API_BASE}/bike-categories`, {
            method: 'POST', headers: authHJ, body: JSON.stringify({ nome })
        });
        const d = await r.json();
        if (r.ok) {
            input.value = '';
            showToast('Categoria adicionada!', 'success');
            loadCategories();
        } else {
            showToast(d.message || d.error || 'Erro ao adicionar.', 'error');
        }
    } catch {
        showToast('Erro ao adicionar categoria.', 'error');
    }
}

async function deleteCategory(id) {
    if (!confirm('Remover esta categoria?')) return;
    try {
        const r = await fetch(`${API_BASE}/bike-categories/${id}`, { method: 'DELETE', headers: authH });
        if (r.ok) {
            showToast('Categoria removida.', 'success');
            loadCategories();
        } else {
            const d = await r.json().catch(() => ({}));
            showToast(d.message || d.error || 'Erro ao remover.', 'error');
        }
    } catch {
        showToast('Erro ao remover categoria.', 'error');
    }
}

// ── Simulador de Tempo ────────────────────────────────
async function _loadSimTime() {
    try {
        const r = await fetch(`${API_BASE}/admin/forward-time`, {
            method: 'POST', headers: authHJ, body: JSON.stringify({ days: 0 })
        });
        const d = await r.json();
        if (r.ok) _updateSimTimeDisplay(d.newTime);
    } catch { /* silencioso */ }
}

function _updateSimTimeDisplay(isoTime) {
    const el = document.getElementById('currentSimTime');
    if (!el || !isoTime) return;
    const dt = new Date(isoTime);
    const now = new Date();
    const diffDays = Math.round((dt - now) / 86400000);
    const formatted = dt.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
    el.innerHTML = diffDays > 0
        ? `<span style="color:var(--warning);">+${diffDays}d</span> &nbsp; ${formatted}`
        : `<span style="color:var(--text-muted);">Tempo real</span> &nbsp; ${formatted}`;
}

async function forwardTime() {
    const days = parseInt(document.getElementById('fwdDays')?.value || '1', 10);
    if (isNaN(days) || days < 1) { showToast('Informe um número válido de dias.', 'error'); return; }
    try {
        const r = await fetch(`${API_BASE}/admin/forward-time`, {
            method: 'POST', headers: authHJ, body: JSON.stringify({ days })
        });
        const d = await r.json();
        if (r.ok) {
            showToast(`Avançou ${days} dia(s).`, 'success');
            _updateSimTimeDisplay(d.newTime);
        } else {
            showToast(d.message || 'Erro.', 'error');
        }
    } catch {
        showToast('Erro ao avançar tempo.', 'error');
    }
}

async function resetTime() {
    try {
        const r = await fetch(`${API_BASE}/admin/reset-time`, { method: 'POST', headers: authH });
        const d = await r.json();
        if (r.ok) {
            showToast('Tempo resetado para o real.', 'success');
            _updateSimTimeDisplay(d.newTime);
        } else {
            showToast(d.message || 'Erro.', 'error');
        }
    } catch {
        showToast('Erro ao resetar tempo.', 'error');
    }
}

window.loadCategories = loadCategories;
window.addCategory    = addCategory;
window.deleteCategory = deleteCategory;
window.forwardTime    = forwardTime;
window.resetTime      = resetTime;

// ── Indicadores de Desempenho ─────────────────────────
let _chartOcupacao = null;

async function loadIndicadores() {
    const grid    = document.getElementById('kpiGrid');
    const tableEl = document.getElementById('kpiTableBody');
    if (tableEl) tableEl.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--text-muted);">Carregando...</td></tr>';

    let d;
    try {
        const r = await fetch(`${API_BASE}/admin/performance-kpis`, { headers: authH });
        if (!r.ok) throw new Error(r.status);
        d = await r.json();
    } catch (e) {
        showToast('Erro ao carregar indicadores.', 'error');
        if (tableEl) tableEl.innerHTML = '<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--danger);">Erro ao carregar dados.</td></tr>';
        return;
    }

    const oc  = d.taxaOcupacaoMensal;
    const ren = d.taxaRenovacao;
    const ent = d.tempoMedioEntrega;

    // ── KPI 1: Ocupação ──
    const ocMeta = oc.valor >= oc.meta;
    document.getElementById('kpiOcupVal').textContent = oc.valor + '%';
    document.getElementById('kpiOcupVal').style.color = ocMeta ? 'var(--success,#22c55e)' : 'var(--warning,#f59e0b)';
    document.getElementById('kpiOcupSub').textContent = `${oc.bikesOcupadas} de ${oc.totalBikes} bikes com locação este mês`;
    _kpiBar('kpiOcupBar', oc.valor, 100, ocMeta ? '#22c55e' : '#f59e0b');
    const ocBadge = document.getElementById('kpiOcupBadge');
    if (ocBadge) { ocBadge.textContent = ocMeta ? '✓ META' : '↓ ABAIXO'; ocBadge.style.cssText = ocMeta ? 'background:rgba(34,197,94,.15);color:#22c55e;font-size:11px;' : 'background:rgba(245,158,11,.15);color:#f59e0b;font-size:11px;'; }

    // ── KPI 2: Renovação ──
    const renMeta = ren.valor >= ren.meta;
    document.getElementById('kpiRenVal').textContent = ren.valor + '%';
    document.getElementById('kpiRenVal').style.color = renMeta ? '#22c55e' : '#f59e0b';
    document.getElementById('kpiRenSub').textContent = `${ren.rentalsComRenovacao} de ${ren.totalEncerrados} contratos renovaram`;
    _kpiBar('kpiRenBar', ren.valor, 100, renMeta ? '#22c55e' : '#f59e0b');
    const renBadge = document.getElementById('kpiRenBadge');
    if (renBadge) { renBadge.textContent = renMeta ? '✓ META' : '↓ ABAIXO'; renBadge.style.cssText = renMeta ? 'background:rgba(34,197,94,.15);color:#22c55e;font-size:11px;' : 'background:rgba(245,158,11,.15);color:#f59e0b;font-size:11px;'; }

    // ── KPI 3: Entrega ──
    const entEl = document.getElementById('kpiEntVal');
    entEl.textContent = ent.valorFormatado;
    entEl.style.color = ent.valorFormatado === 'N/D' ? 'var(--text-muted,#64748b)' : '#06b6d4';
    entEl.style.fontSize = ent.valorFormatado === 'N/D' ? '1.6rem' : '2.4rem';

    // ── Gráfico de Tendência ──
    _renderOcupChart(oc.historico);

    // ── Tabela Resumo ──
    if (tableEl) tableEl.innerHTML = [
        _kpiRow('Taxa de Ocupação Mensal',
            oc.valor + '%', '≥ 70%', ocMeta,
            `(${oc.bikesOcupadas} bikes c/ locação ÷ ${oc.totalBikes} bikes) × 100`),
        _kpiRow('Taxa de Renovação de Aluguéis',
            ren.valor + '%', '≥ 25%', renMeta,
            `(${ren.rentalsComRenovacao} com renovação ÷ ${ren.totalEncerrados} encerrados) × 100`),
        _kpiRow('Tempo Médio de Entrega',
            ent.valorFormatado, '—', null,
            `AVG(data_inicio − criado_em) sobre contratos com início registrado`),
    ].join('');
}

function _kpiBar(id, val, max, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.background = color;
    setTimeout(() => { el.style.width = Math.min((val / max) * 100, 100) + '%'; }, 80);
}

function _kpiRow(label, resultado, meta, atingiu, formula) {
    const statusHtml = atingiu === null
        ? '<span class="badge badge-muted">—</span>'
        : atingiu
            ? '<span class="badge" style="background:rgba(34,197,94,.15);color:#22c55e;">✓ Atingida</span>'
            : '<span class="badge" style="background:rgba(245,158,11,.15);color:#f59e0b;">↓ Abaixo</span>';
    return `<tr style="border-bottom:1px solid var(--border);">
        <td style="padding:12px 16px;font-weight:600;">${label}</td>
        <td style="padding:12px 16px;text-align:center;font-weight:700;font-size:1.05rem;">${resultado}</td>
        <td style="padding:12px 16px;text-align:center;color:var(--text-muted);">${meta}</td>
        <td style="padding:12px 16px;text-align:center;">${statusHtml}</td>
        <td style="padding:12px 16px;color:var(--text-muted);font-size:0.78rem;font-family:monospace;">${formula}</td>
    </tr>`;
}

function _renderOcupChart(historico) {
    const ctx = document.getElementById('chartOcupacao');
    if (!ctx || !window.Chart) return;
    if (_chartOcupacao) { _chartOcupacao.destroy(); _chartOcupacao = null; }

    const isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor  = isDark ? '#e2e8f0' : '#1e293b';
    const mutedColor = isDark ? '#64748b' : '#94a3b8';
    const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const accentColor = '#f7b84c';

    _chartOcupacao = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historico.map(h => h.label),
            datasets: [{
                label: 'Ocupação (%)',
                data: historico.map(h => h.valor),
                borderColor: accentColor,
                backgroundColor: isDark ? 'rgba(247,184,76,0.12)' : 'rgba(247,184,76,0.1)',
                borderWidth: 2.5,
                pointBackgroundColor: accentColor,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4,
            }, {
                label: 'Meta (70%)',
                data: historico.map(() => 70),
                borderColor: isDark ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.7)',
                borderWidth: 1.5,
                borderDash: [6, 4],
                pointRadius: 0,
                fill: false,
                tension: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: mutedColor, font: { size: 12 }, boxWidth: 14 } },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    titleColor: textColor,
                    bodyColor: mutedColor,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: { label: ctx => ` ${ctx.raw}%` }
                }
            },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: mutedColor, font: { size: 12 } } },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: mutedColor, font: { size: 11 }, callback: v => v + '%' },
                    min: 0, max: 100,
                    beginAtZero: true
                }
            }
        }
    });
}

window.loadIndicadores = loadIndicadores;

// ── Init ──────────────────────────────────────────────
loadDash();
