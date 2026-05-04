// @ts-check

const token = localStorage.getItem('pedala_token');
const user = JSON.parse(localStorage.getItem('pedala_user') || '{}');
if (!token || !['funcionario', 'admin'].includes(user.role)) { alert('Acesso negado.'); location.href = 'login.html'; }
document.getElementById('navAv').textContent = user.nome ? user.nome[0].toUpperCase() : 'F';
document.getElementById('navNm').textContent = user.nome ? user.nome.split(' ')[0] : 'Funcionário';
const h = { Authorization: 'Bearer ' + token }, hj = { ...h, 'Content-Type': 'application/json' };
function sair() { localStorage.removeItem('pedala_token'); localStorage.removeItem('pedala_user'); location.href = 'login.html'; }

function escHtml(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showSec(s, el) {
    document.querySelectorAll('.sec').forEach(x => x.classList.remove('show'));
    document.getElementById('sec-' + s).classList.add('show');
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    if (el) el.classList.add('active');
    const m = { vistorias: loadVist, locacoes: loadLoc, gps: initGpsMap };
    if (m[s]) m[s]();
}

// ── Vistorias ─────────────────────────────────────────
async function loadVist() {
    const el = document.getElementById('vistList');
    try {
        const d = await fetch(`${API_BASE}/vistorias`, { headers: h }).then(r => r.json());
        const pending = (d.vistorias || []).filter(v => v.status === 'pendente');
        if (!pending.length) {
            el.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;padding:40px;">
        <p style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">Nenhuma vistoria pendente</p>
        <p style="font-size:13px;color:var(--text-secondary);">As solicitações de devolução aparecerão aqui.</p>
      </div></div>`; return;
        }
        el.innerHTML = pending.map(v => `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-header">
          <span class="card-title">${escHtml(v.bikeNome || 'Bike #' + v.bikeId)}</span>
          <span class="badge badge-warning">Pendente</span>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;font-size:12px;">
            <div><span style="color:var(--text-secondary);">Locação</span><br><strong>#${v.aluguelId}</strong></div>
            <div><span style="color:var(--text-secondary);">Usuário</span><br><strong>${escHtml(v.usuarioNome || '-')}</strong></div>
          </div>
          <label class="form-label">Observação</label>
          <textarea class="form-input form-textarea" id="obs-${v.id}" placeholder="Detalhes técnicos sobre o estado da bicicleta..." rows="2"></textarea>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn btn-primary" onclick="aprovVist(${v.id})">Aprovar vistoria</button>
            <button class="btn btn-secondary" onclick="reprovVist(${v.id})">Reprovar</button>
          </div>
        </div>
      </div>`).join('');
    } catch (e) { showToast('Erro ao carregar vistorias.', 'error'); }
}

async function aprovVist(id) {
    const obs = document.getElementById('obs-' + id)?.value || '';
    const r = await fetch(`${API_BASE}/vistorias/${id}/aprovar`, { method: 'PUT', headers: hj, body: JSON.stringify({ observacao: obs || 'Aprovada pelo funcionário' }) });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) loadVist();
}

async function reprovVist(id) {
    const obs = document.getElementById('obs-' + id)?.value?.trim() || '';
    if (!obs) { showToast('Informe o motivo da reprova no campo de observação.', 'warning'); return; }
    const r = await fetch(`${API_BASE}/vistorias/${id}/reprovar`, { method: 'PUT', headers: hj, body: JSON.stringify({ observacao: obs }) });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) loadVist();
}

// ── Ativar Locações ───────────────────────────────────
async function loadLoc() {
    const el = document.getElementById('locList');
    try {
        const d = await fetch(`${API_BASE}/admin/alugueis`, { headers: h }).then(r => r.json());
        const pending = (d.alugueis || []).filter(a => ['aguardando_locacao', 'agendada'].includes(a.status));
        if (!pending.length) {
            el.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;padding:40px;">
        <p style="font-size:15px;font-weight:700;color:var(--text-primary);">Nenhuma locação aguardando ativação</p>
      </div></div>`; return;
        }
        el.innerHTML = pending.map(a => {
            const end = a.enderecoEntrega || {};
            const endStr = end.logradouro ? `${end.logradouro}, ${end.numero} — ${end.bairro}, ${end.cidade}/${end.uf}` : 'Endereço não informado';
            return `<div class="card" style="margin-bottom:12px;">
        <div class="card-header">
          <span class="card-title">#${a.id} — ${escHtml(a.bikeNome || '-')}</span>
          <span class="badge badge-purple">${a.status === 'agendada' ? 'Agendada' : 'Ag. Ativação'}</span>
        </div>
        <div class="card-body">
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">${escHtml(a.usuarioNome || '-')} | ${a.planoLabel || a.tipo} | R$${(a.preco || 0).toFixed(2)} | Início: ${new Date(a.dataInicio).toLocaleDateString('pt-BR')}</div>
          <div style="background:var(--bg-muted);border:1px solid var(--bg-border);border-radius:var(--r-md);padding:10px 14px;font-size:12px;color:var(--text-secondary);margin-bottom:12px;">${escHtml(endStr)}</div>
          <button class="btn btn-primary" onclick="ativarLoc(${a.id})" title="Confirmar entrega">Confirmar entrega</button>
        </div>
      </div>`;
        }).join('');
    } catch (e) { showToast('Erro.', 'error'); }
}

async function ativarLoc(id) {
    const r = await fetch(`${API_BASE}/rentals/${id}/ativar`, { method: 'PUT', headers: h });
    const d = await r.json();
    showToast(d.message || d.error || '', r.ok ? 'success' : 'error');
    if (r.ok) loadLoc();
}

// ── GPS Map — Leaflet + SSE ───────────────────────────
let _gpsMap = null;
let _gpsMarkers = {};
let _gpsSSE = null;
let _gpsInitialized = false;

function _bikeIcon() {
    return L.divIcon({
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
        html: `<div style="width:36px;height:36px;background:#6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.35);border:3px solid #fff;font-size:10px;font-weight:800;color:#fff;letter-spacing:.04em;">BIKE</div>`
    });
}

function _gpsSetStatus(connected, text) {
    const dot = document.getElementById('gpsDot');
    const span = document.getElementById('gpsStatusText');
    if (dot) dot.className = 'gps-status-dot' + (connected ? ' live' : '');
    if (span) span.textContent = text;
}

function _gpsUpdateSidebar() {
    const list = document.getElementById('gpsBikeList');
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

function _gpsPopupHtml(d) {
    return `<div class="gps-popup-name">Bike: ${escHtml(d.bikeNome)}</div>
        <div class="gps-popup-row">Endereço: ${escHtml(d.endereco)}</div>
        <div class="gps-popup-row">Velocidade: ${d.speed ? d.speed + ' km/h' : 'Parada'}</div>
        <div class="gps-popup-row" style="color:var(--text-muted);font-size:0.72rem;">Locação #${d.rentalId}</div>`;
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
            _gpsMarkers[data.bikeId].setPopupContent(_gpsPopupHtml(data));
        } else {
            const marker = L.marker(latlng, { icon: _bikeIcon() })
                .addTo(_gpsMap)
                .bindPopup(_gpsPopupHtml(data));
            marker._gpsData = data;
            _gpsMarkers[data.bikeId] = marker;
        }
        _gpsUpdateSidebar();
    }
}

function initGpsMap() {
    if (!_gpsInitialized) {
        _gpsInitialized = true;
        setTimeout(() => {
            _gpsMap = L.map('gpsMapContainer', {
                center: [-23.5505, -46.6333],
                zoom: 13,
                zoomControl: true
            });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(_gpsMap);
            _gpsStartSSE();
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
        setTimeout(() => { if (_gpsSSE && _gpsSSE.readyState === EventSource.CLOSED) _gpsStartSSE(); }, 5000);
    });
}

function reconnectGPS() {
    Object.values(_gpsMarkers).forEach(m => { if (_gpsMap) _gpsMap.removeLayer(m); });
    _gpsMarkers = {};
    _gpsUpdateSidebar();
    _gpsStartSSE();
}

// ── Init ──────────────────────────────────────────────
loadVist();
