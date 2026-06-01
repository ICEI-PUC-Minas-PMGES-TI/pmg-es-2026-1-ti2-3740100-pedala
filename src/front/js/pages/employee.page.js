// @ts-check

const empToken = localStorage.getItem('pedala_token');
const empUser = window.readStoredJson ? window.readStoredJson('pedala_user') : JSON.parse(localStorage.getItem('pedala_user') || '{}');
const empRole = window.normalizeUserRole ? window.normalizeUserRole(empUser.role) : String(empUser.role || '').trim().toLowerCase();
if (!empToken || !['funcionario', 'admin'].includes(empRole)) { alert('Acesso negado.'); location.href = 'login.html'; }
document.getElementById('navAv').textContent = empUser.nome ? empUser.nome[0].toUpperCase() : 'F';
document.getElementById('navNm').textContent = empUser.nome ? empUser.nome.split(' ')[0] : 'Funcionário';
const h = { Authorization: 'Bearer ' + empToken }, hj = { ...h, 'Content-Type': 'application/json' };
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
    const obs = document.getElementById('obs-' + id)?.value?.trim() || '';
    if (!obs) { showToast('Informe a observação técnica ao aprovar a vistoria.', 'warning'); return; }
    const r = await fetch(`${API_BASE}/vistorias/${id}/aprovar`, { method: 'PUT', headers: hj, body: JSON.stringify({ observacao: obs }) });
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
function _pagBadge(pagStatus) {
    const map = {
        aprovado:              '<span class="badge badge-success">Pago ✓</span>',
        aguardando_aprovacao:  '<span class="badge badge-warning">Pag. pendente</span>',
        rejeitado:             '<span class="badge badge-danger">Pag. rejeitado</span>',
        nao_pago:              '<span class="badge badge-muted">Não pago</span>',
    };
    return map[pagStatus] || '<span class="badge badge-muted">—</span>';
}

async function loadLoc() {
    const el = document.getElementById('locList');
    try {
        // /api/rentals aceita FUNCIONARIO e ADMIN (diferente de /api/admin/alugueis que é só ADMIN)
        const d = await fetch(`${API_BASE}/rentals`, { headers: h }).then(r => r.json());
        const pending = (d.alugueis || []).filter(a => ['aguardando_locacao', 'agendada'].includes(a.status));
        if (!pending.length) {
            el.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;padding:40px;">
        <p style="font-size:15px;font-weight:700;color:var(--text-primary);">Nenhuma locação aguardando ativação</p>
        <p style="font-size:13px;color:var(--text-secondary);">Quando um cliente criar uma locação ela aparecerá aqui.</p>
      </div></div>`; return;
        }
        el.innerHTML = pending.map(a => {
            const end = a.enderecoEntrega || {};
            const endStr = end.logradouro ? `${end.logradouro}, ${end.numero} — ${end.bairro}, ${end.cidade}/${end.uf}` : 'Endereço não informado';
            const pagStatus = a.pagamento?.status || 'nao_pago';
            const pagAprovado = pagStatus === 'aprovado';
            const aviso = !pagAprovado
                ? `<div style="background:var(--warning-bg,#fffbeb);border:1px solid var(--warning-border,#fcd34d);border-radius:6px;padding:8px 12px;font-size:11px;color:#92400e;margin-bottom:10px;">
                     ⚠️ Pagamento ainda não aprovado. Confirme apenas após o admin aprovar o pagamento.
                   </div>`
                : '';
            return `<div class="card" style="margin-bottom:12px;">
        <div class="card-header">
          <span class="card-title">#${a.id} — ${escHtml(a.bikeNome || '-')}</span>
          <div style="display:flex;gap:6px;align-items:center;">
            ${_pagBadge(pagStatus)}
            <span class="badge badge-purple">${a.status === 'agendada' ? 'Agendada' : 'Ag. Entrega'}</span>
          </div>
        </div>
        <div class="card-body">
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">
            ${escHtml(a.usuarioNome || '-')} | ${escHtml(a.planoLabel || a.tipo)} | R$${(a.preco || 0).toFixed(2)} | Início: ${new Date(a.dataInicio).toLocaleDateString('pt-BR')}
          </div>
          <div style="background:var(--bg-muted);border:1px solid var(--bg-border);border-radius:var(--r-md);padding:10px 14px;font-size:12px;color:var(--text-secondary);margin-bottom:10px;">${escHtml(endStr)}</div>
          ${aviso}
          <button class="btn btn-primary" onclick="ativarLoc(${a.id})" title="Confirmar entrega e iniciar rastreamento GPS"
            ${!pagAprovado ? 'style="opacity:0.6;"' : ''}>
            Confirmar entrega
          </button>
        </div>
      </div>`;
        }).join('');
    } catch (e) { showToast('Erro ao carregar locações.', 'error'); }
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
        const r = await fetch(`${API_BASE}/rentals`, { headers: h });
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
        const homeIcon = L.divIcon({
            className: '',
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -36],
            html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.5));">🏠</div>`
        });
        const marker = L.marker([parseFloat(lat), parseFloat(lon)], { icon: homeIcon })
            .addTo(_gpsMap)
            .bindPopup(`<b>Casa do Cliente</b><br>${escHtml(rental.usuarioNome || '—')}<br><small style="color:#666;">${escHtml(q)}</small>`)
            .openPopup();
        _homeMarkers[bikeId] = marker;
        _gpsMap.flyTo([parseFloat(lat), parseFloat(lon)], 16, { duration: 1 });
    } catch (e) {
        showToast('Erro ao localizar endereço.', 'error');
    }
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
        const r = await fetch(`${API_BASE}/bikes/${id}/bloquear`, { method: 'PUT', headers: hj, body: JSON.stringify({}) });
        const d = await r.json();
        showToast(d.message || d.error || 'Ação concluída', r.ok ? 'success' : 'error');
    } catch(e) {
        showToast('Erro ao bloquear a bike.', 'error');
    }
}

async function desbloquearBikeGPS(id) {
    if(!confirm('Deseja desbloquear esta bike remotamente?')) return;
    try {
        const r = await fetch(`${API_BASE}/bikes/${id}/ativar`, { method: 'PUT', headers: hj });
        const d = await r.json();
        showToast(d.message || d.error || 'Bike desbloqueada', r.ok ? 'success' : 'error');
    } catch(e) {
        showToast('Erro ao desbloquear a bike.', 'error');
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
        const prev = _gpsMarkers[data.bikeId]?._gpsData;
        if (data.isSuspeito && (!prev || !prev.isSuspeito)) {
            showToast(`Alerta: ${data.bikeNome} saiu da zona segura!`, 'error');
        }
        const iconColor = data.bloqueada ? '#ef4444' : (data.isSuspeito ? '#f59e0b' : '#6366f1');
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

function initGpsMap() {
    if (!_gpsInitialized) {
        _gpsInitialized = true;
        setTimeout(() => {
            // injetar CSS de animações GPS
            if (!document.getElementById('gps-styles')) {
                const s = document.createElement('style');
                s.id = 'gps-styles';
                s.textContent = `
                    @keyframes gps-pulse{0%{transform:scale(1);opacity:.7}70%{transform:scale(3.5);opacity:0}100%{transform:scale(3.5);opacity:0}}
                    @keyframes spin{to{transform:rotate(360deg)}}
                `;
                document.head.appendChild(s);
            }

            _gpsMap = L.map('gpsMapContainer', {
                center: [-23.5505, -46.6333],
                zoom: 13,
                zoomControl: true
            });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(_gpsMap);

            // ── Zona de Segurança redesenhada ──
            const ZONE = [-23.5615, -46.6560];
            // Anel externo (5km)
            L.circle(ZONE, {
                color: '#f97316', fillColor: '#f97316', fillOpacity: 0.04,
                radius: 5000, weight: 1.5, dashArray: '8 5'
            }).addTo(_gpsMap).bindPopup('<b>Zona de Monitoramento</b><br>Raio de 5km a partir do MASP');
            // Anel interno de referência (2.5km)
            L.circle(ZONE, {
                color: '#f97316', fillColor: 'transparent',
                radius: 2500, weight: 1, dashArray: '3 9', opacity: 0.35
            }).addTo(_gpsMap);
            // Marcador pulsante no centro (MASP)
            L.marker(ZONE, {
                icon: L.divIcon({
                    className: '',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    html: `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
                        <div style="position:absolute;width:12px;height:12px;background:#f97316;border-radius:50%;animation:gps-pulse 2.5s ease-out infinite;"></div>
                        <div style="position:absolute;width:10px;height:10px;background:#f97316;border-radius:50%;border:2.5px solid #fff;z-index:2;box-shadow:0 1px 5px rgba(0,0,0,.5);"></div>
                    </div>`
                }),
                interactive: false
            }).addTo(_gpsMap);
            // Label da zona
            L.marker([-23.516, -46.656], {
                icon: L.divIcon({
                    className: '',
                    iconSize: [150, 18],
                    iconAnchor: [75, 9],
                    html: `<div style="font-size:10px;font-weight:600;color:#f97316;background:rgba(0,0,0,.6);padding:2px 8px;border-radius:4px;white-space:nowrap;text-align:center;">● Zona Segura — 5 km</div>`
                }),
                interactive: false
            }).addTo(_gpsMap);

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
    const url = `${API_BASE}/gps/stream?token=${encodeURIComponent(empToken)}`;
    _gpsSSE = new EventSource(url);
    _gpsSSE.addEventListener('message', _gpsHandleEvent);
    _gpsSSE.addEventListener('open', () => _gpsSetStatus(true, 'Conectado'));
    _gpsSSE.addEventListener('error', () => {
        _gpsSetStatus(false, 'Erro de conexão');
        setTimeout(() => { if (_gpsSSE && _gpsSSE.readyState === EventSource.CLOSED) _gpsStartSSE(); }, 5000);
    });
}

// ── GPS Route History ─────────────────────────────────
let _historyMap = null;
let _historyLayers = [];

async function _osrmMatch(points) {
    // 1. remover pontos estacionários (duplicatas consecutivas) e teleportes
    const MIN_MOVE = 0.00012;  // ~13m — ignora ponto se não se moveu
    const MAX_JUMP = 0.004;    // ~440m — ignora salto de teleporte do simulador
    const clean = [points[0]];
    for (let i = 1; i < points.length; i++) {
        const prev = clean[clean.length - 1];
        const dlat = points[i].lat - prev.lat;
        const dlng = points[i].lng - prev.lng;
        const d    = Math.sqrt(dlat * dlat + dlng * dlng);
        if (d < MIN_MOVE || d > MAX_JUMP) continue;
        clean.push(points[i]);
    }
    if (clean.length < 6) return [];

    // 2. subsample para no máximo 75 pontos antes de enviar ao OSRM
    const step = clean.length > 75 ? Math.ceil(clean.length / 75) : 1;
    const sub  = clean.filter((_, i) => i % step === 0);
    if (sub[sub.length - 1] !== clean[clean.length - 1]) sub.push(clean[clean.length - 1]);

    // 3. chunks de 25 com overlap de 1 ponto (URL curta para o servidor público)
    const MAX_PER_CHUNK = 25;
    const chunks = [];
    for (let i = 0; i < sub.length; i += MAX_PER_CHUNK - 1) {
        chunks.push(sub.slice(i, Math.min(i + MAX_PER_CHUNK, sub.length)));
    }

    // requests sequenciais para evitar rate-limit do servidor público
    const results = [];
    for (const chunk of chunks) {
        const coords = chunk.map(p => `${p.lng},${p.lat}`).join(';');
        const radii  = chunk.map(() => '100').join(';');
        const url    = `https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&radiuses=${radii}`;
        const ctrl   = new AbortController();
        const t      = setTimeout(() => ctrl.abort(), 9000);
        try {
            const r = await fetch(url, { signal: ctrl.signal });
            clearTimeout(t);
            if (!r.ok) continue;
            const data = await r.json();
            if (data.matchings?.length) {
                results.push(...data.matchings.flatMap(m => m.geometry.coordinates.map(([lng, lat]) => [lat, lng])));
            }
        } catch (_) { clearTimeout(t); }
        // pausa de 300ms entre chunks para não rate-limitar
        await new Promise(res => setTimeout(res, 300));
    }

    return results;
}

function _bearing(lat1, lng1, lat2, lng2) {
    const r = Math.PI / 180;
    const dLon = (lng2 - lng1) * r;
    const y = Math.sin(dLon) * Math.cos(lat2 * r);
    const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function _addArrows(map, latlngs, color, layers) {
    if (latlngs.length < 4) return;
    const step = Math.max(Math.floor(latlngs.length / 9), 3);
    for (let i = step; i < latlngs.length - 1; i += step) {
        const [lat1, lng1] = latlngs[i - 1];
        const [lat2, lng2] = latlngs[i];
        const b = _bearing(lat1, lng1, lat2, lng2);
        const icon = L.divIcon({
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            html: `<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;transform:rotate(${b}deg);color:${color || '#a78bfa'};font-size:12px;filter:drop-shadow(0 0 3px rgba(0,0,0,.7));pointer-events:none;">▶</div>`
        });
        layers.push(L.marker([lat2, lng2], { icon, interactive: false, zIndexOffset: 300 }).addTo(map));
    }
}

function _glowPolyline(map, latlngs, color) {
    const layers = [
        L.polyline(latlngs, { color, weight: 14, opacity: 0.10, lineCap: 'round', lineJoin: 'round' }),
        L.polyline(latlngs, { color, weight: 6,  opacity: 0.35, lineCap: 'round', lineJoin: 'round' }),
        L.polyline(latlngs, { color: '#e0d7ff',  weight: 2.5, opacity: 1, lineCap: 'round', lineJoin: 'round' }),
    ];
    layers.forEach(l => l.addTo(map));
    _addArrows(map, latlngs, '#c4b5fd', layers);
    return layers;
}

function _rawPolyline(map, points) {
    const layers = [];
    const latlngs = points.map(p => [p.lat, p.lng]);
    // glow base
    layers.push(L.polyline(latlngs, { color: '#6366f1', weight: 12, opacity: 0.09, lineCap: 'round', lineJoin: 'round' }).addTo(map));
    // segmentos coloridos por velocidade
    for (let i = 0; i < latlngs.length - 1; i++) {
        const speed = points[i].speed || 0;
        const color = speed >= 20 ? '#22c55e' : speed >= 12 ? '#eab308' : speed >= 5 ? '#f97316' : '#ef4444';
        layers.push(L.polyline([latlngs[i], latlngs[i + 1]], { color, weight: 3.5, opacity: 0.9, lineCap: 'round' }).addTo(map));
    }
    _addArrows(map, latlngs, '#fff', layers);
    return layers;
}

const _FILTERS = [['30min', 0.5], ['1h', 1], ['2h', 2], ['4h', 4], ['1 dia', 24], ['3 dias', 72]];

async function verRotaGPS(rentalId, horas = 1) {
    const modal   = document.getElementById('gpsHistoryModal');
    const title   = document.getElementById('gpsHistoryTitle');
    const stats   = document.getElementById('gpsHistoryStats');
    const loading = document.getElementById('gpsHistoryLoading');
    const mapEl   = document.getElementById('gpsHistoryMapContainer');

    title.textContent = `Rota — Locação #${rentalId}`;
    stats.innerHTML   = '';
    loading.style.display = 'block';
    loading.textContent   = 'Carregando histórico...';
    mapEl.style.display   = 'none';
    modal.classList.add('open');

    const filterHtml = `<div style="display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">
        <span style="font-size:11px;color:var(--text-muted);">Período:</span>
        ${_FILTERS.map(([label, val]) => {
            const active = val == horas;
            return `<button onclick="verRotaGPS(${rentalId},${val})" style="padding:3px 11px;font-size:11px;border-radius:99px;border:1px solid ${active ? 'transparent' : 'var(--border)'};background:${active ? 'var(--primary)' : 'var(--bg-secondary)'};color:${active ? '#000' : 'var(--text-secondary)'};cursor:pointer;font-weight:${active ? '600' : '400'};">${label}</button>`;
        }).join('')}
    </div>`;

    try {
        const horasApi = horas < 1 ? 1 : Math.round(horas);
        const t0 = Date.now();
        const r  = await fetch(`${API_BASE}/gps/historico/${rentalId}?horas=${horasApi}`, { headers: h });
        const d  = await r.json();
        const responseMs = Date.now() - t0;
        let points = d.history || [];

        if (horas === 0.5 && points.length) {
            const cutoff = Date.now() - 30 * 60 * 1000;
            points = points.filter(p => new Date(p.registradoEm).getTime() >= cutoff);
        }

        loading.style.display = 'none';

        if (!points.length) {
            stats.innerHTML = filterHtml + `<p style="color:var(--text-muted);text-align:center;padding:24px;">Nenhum ponto GPS neste período.<br><small>Tente ampliar o intervalo acima.</small></p>`;
            return;
        }

        const speeds   = points.map(p => p.speed || 0).filter(s => s > 0);
        const avgSpeed = speeds.length ? (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1) : '—';
        const maxSpeed = speeds.length ? Math.max(...speeds).toFixed(1) : '—';
        const firstTs  = new Date(points[0].registradoEm);
        const lastTs   = new Date(points[points.length - 1].registradoEm);
        const durMin   = Math.round((lastTs - firstTs) / 60000);
        const durStr   = durMin >= 60 ? `${Math.floor(durMin / 60)}h${durMin % 60 ? ` ${durMin % 60}min` : ''}` : `${durMin}min`;

        const card = (label, value) =>
            `<div style="background:var(--bg-secondary);border-radius:8px;padding:5px 12px;font-size:11px;border:1px solid var(--border);min-width:60px;">
                <div style="color:var(--text-muted);margin-bottom:2px;">${label}</div>
                <div style="font-weight:700;font-size:14px;">${value}</div>
            </div>`;

        const fmtTime = ts => ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const fmtDate = ts => ts.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const sameDay = firstTs.toDateString() === lastTs.toDateString();

        stats.innerHTML = filterHtml +
            `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                ${card('Duração', durStr)}
                ${card('Vel. Média', avgSpeed + ' km/h')}
                ${card('Vel. Máx', maxSpeed + ' km/h')}
                ${card('Pontos GPS', points.length)}
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:11px;">
                <span style="display:inline-flex;align-items:center;gap:4px;background:#166534;color:#bbf7d0;padding:3px 8px;border-radius:99px;font-weight:600;">
                    <span style="width:7px;height:7px;background:#4ade80;border-radius:50%;display:inline-block;"></span>
                    Partida ${sameDay ? '' : fmtDate(firstTs) + ' '}${fmtTime(firstTs)} — ${escHtml(points[0].endereco || '?')}
                </span>
                <span style="color:var(--text-muted);">→</span>
                <span style="display:inline-flex;align-items:center;gap:4px;background:#7f1d1d;color:#fecaca;padding:3px 8px;border-radius:99px;font-weight:600;">
                    <span style="width:7px;height:7px;background:#f87171;border-radius:50%;display:inline-block;"></span>
                    Chegada ${sameDay ? '' : fmtDate(lastTs) + ' '}${fmtTime(lastTs)} — ${escHtml(points[points.length-1].endereco || '?')}
                </span>
            </div>
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;display:flex;align-items:center;">
                <span id="osrmStatus" style="opacity:.6;">▶ setas indicam direção de percurso</span>
                <span style="margin-left:auto;opacity:.3;">${responseMs}ms</span>
            </div>`;

        mapEl.style.display = '';

        if (!_historyMap) {
            _historyMap = L.map('gpsHistoryMapContainer', { zoomControl: true });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
                maxZoom: 19
            }).addTo(_historyMap);
        }

        _historyLayers.forEach(l => _historyMap.removeLayer(l));
        _historyLayers = [];

        const rawLatLngs = points.map(p => [p.lat, p.lng]);

        // mostrar rota bruta imediatamente enquanto OSRM carrega
        _historyLayers.push(..._rawPolyline(_historyMap, points));
        _historyMap.fitBounds(L.latLngBounds(rawLatLngs), { padding: [30, 30] });
        setTimeout(() => _historyMap.invalidateSize(), 100);

        // marcador de partida
        const startIcon = L.divIcon({
            className: '',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            popupAnchor: [0, -14],
            html: `<div style="width:22px;height:22px;background:#22c55e;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:#fff;border-radius:50%;"></div></div>`
        });
        const startM = L.marker(rawLatLngs[0], { icon: startIcon, zIndexOffset: 1000 })
            .addTo(_historyMap)
            .bindPopup(`<b style="color:#22c55e;">▶ Partida</b><br>${escHtml(points[0].endereco || '—')}<br><small style="color:#666;">${firstTs.toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small>`);
        _historyLayers.push(startM);

        // marcador de chegada
        let endM = null;
        if (rawLatLngs.length > 1) {
            const endIcon = L.divIcon({
                className: '',
                iconSize: [22, 22],
                iconAnchor: [11, 11],
                popupAnchor: [0, -14],
                html: `<div style="width:22px;height:22px;background:#ef4444;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:#fff;border-radius:50%;"></div></div>`
            });
            endM = L.marker(rawLatLngs[rawLatLngs.length - 1], { icon: endIcon, zIndexOffset: 1000 })
                .addTo(_historyMap)
                .bindPopup(`<b style="color:#ef4444;">⬛ Última posição</b><br>${escHtml(points[points.length - 1].endereco || '—')}<br><small style="color:#666;">${lastTs.toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small>`);
            _historyLayers.push(endM);
        }

        // OSRM map matching em background
        try {
            const matched = await _osrmMatch(points);
            if (matched.length > 5) {
                // remover rota bruta, adicionar glow com rota ajustada
                _historyLayers.forEach(l => {
                    if (l !== startM && l !== endM) _historyMap.removeLayer(l);
                });
                _historyLayers = _historyLayers.filter(l => l === startM || l === endM);

                const glowLayers = _glowPolyline(_historyMap, matched, '#818cf8');
                _historyLayers.push(...glowLayers);

                // re-raise markers para ficarem acima da polyline
                if (startM) startM.bringToFront();
                if (endM)   endM.bringToFront();

                _historyMap.fitBounds(L.latLngBounds(matched), { padding: [30, 30] });

                const statusEl = document.getElementById('osrmStatus');
                if (statusEl) statusEl.innerHTML = '▶ setas indicam direção de percurso · rota ajustada às ruas';
            }
        } catch (_) { /* silently fallback */ }

    } catch (e) {
        loading.style.display = 'none';
        stats.innerHTML = filterHtml + `<p style="color:var(--danger);text-align:center;padding:24px;">Erro ao carregar o histórico GPS.</p>`;
    }
}

function closeGpsHistory() {
    document.getElementById('gpsHistoryModal').classList.remove('open');
}

function reconnectGPS() {
    Object.values(_gpsMarkers).forEach(m => { if (_gpsMap) _gpsMap.removeLayer(m); });
    _gpsMarkers = {};
    _gpsUpdateSidebar();
    _gpsStartSSE();
}

window.bloquearBikeGPS = bloquearBikeGPS;
window.desbloquearBikeGPS = desbloquearBikeGPS;
window.verRotaGPS = verRotaGPS;
window.closeGpsHistory = closeGpsHistory;
window._gpsFlyTo = _gpsFlyTo;
window._toggleHomeMarker = _toggleHomeMarker;

// ── Init ──────────────────────────────────────────────
loadVist();
