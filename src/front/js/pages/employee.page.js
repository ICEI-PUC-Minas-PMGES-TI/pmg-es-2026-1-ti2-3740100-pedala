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
        // alerta de zona apenas no histórico — não no live
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
let _historyMap    = null;
let _historyLayers = [];

// helpers visuais (mantidos)
function _bearing(la1, lo1, la2, lo2) {
    const r=Math.PI/180, dL=(lo2-lo1)*r;
    const y=Math.sin(dL)*Math.cos(la2*r);
    const x=Math.cos(la1*r)*Math.sin(la2*r)-Math.sin(la1*r)*Math.cos(la2*r)*Math.cos(dL);
    return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function _addArrows(map, ll, color, layers) {
    if (ll.length < 4) return;
    const step = Math.max(Math.floor(ll.length / 8), 4);
    for (let i = step; i < ll.length - 1; i += step) {
        const b = _bearing(ll[i-1][0],ll[i-1][1],ll[i][0],ll[i][1]);
        const icon = L.divIcon({ className:'', iconSize:[18,18], iconAnchor:[9,9],
            html:`<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;transform:rotate(${b}deg);color:${color};font-size:11px;filter:drop-shadow(0 0 3px rgba(0,0,0,.6));pointer-events:none;">▶</div>` });
        layers.push(L.marker(ll[i], { icon, interactive:false, zIndexOffset:300 }).addTo(map));
    }
}
function _glowPolyline(map, latlngs, color) {
    const layers = [
        L.polyline(latlngs, { color, weight:16, opacity:0.08, lineCap:'round', lineJoin:'round' }),
        L.polyline(latlngs, { color, weight:7,  opacity:0.30, lineCap:'round', lineJoin:'round' }),
        L.polyline(latlngs, { color:'#ddd6fe',  weight:2.5, opacity:1, lineCap:'round', lineJoin:'round' }),
    ];
    layers.forEach(l => l.addTo(map));
    _addArrows(map, latlngs, '#c4b5fd', layers);
    return layers;
}

async function verRotaGPS(rentalId) {
    const modal   = document.getElementById('gpsHistoryModal');
    const title   = document.getElementById('gpsHistoryTitle');
    const stats   = document.getElementById('gpsHistoryStats');
    const loading = document.getElementById('gpsHistoryLoading');
    const mapEl   = document.getElementById('gpsHistoryMapContainer');

    title.textContent       = 'Rota da Locação';
    stats.innerHTML         = '';
    loading.style.display   = 'block';
    loading.textContent     = 'Carregando rota...';
    mapEl.style.display     = 'none';
    modal.classList.add('open');

    try {
        const t0 = Date.now();
        const r  = await fetch(`${API_BASE}/gps/rota/${rentalId}`, { headers: h });
        if (!r.ok) throw new Error(await r.text());
        const d  = await r.json();
        const ms = Date.now() - t0;

        loading.style.display = 'none';

        // Converter GeoJSON coordinates [lng, lat] → Leaflet [lat, lng]
        const geojson  = typeof d.geojson === 'string' ? JSON.parse(d.geojson) : d.geojson;
        const latlngs  = geojson.coordinates.map(([lng, lat]) => [lat, lng]);

        const distStr  = d.distanciaKm ? `${d.distanciaKm} km` : '—';
        const durStr   = d.duracaoMin  ? (d.duracaoMin >= 60 ? `${Math.floor(d.duracaoMin/60)}h${d.duracaoMin%60?` ${d.duracaoMin%60}min`:''}` : `${d.duracaoMin}min`) : '—';
        const cachedBadge = d.cached
            ? `<span style="background:var(--success-bg);color:var(--success);border:1px solid var(--success-border);padding:1px 7px;border-radius:99px;font-size:10px;font-weight:600;">✓ Salva</span>`
            : `<span style="background:var(--info-bg);color:var(--info);border:1px solid var(--info-border);padding:1px 7px;border-radius:99px;font-size:10px;font-weight:600;">✦ Gerada agora</span>`;

        const card = (label, val) =>
            `<div style="background:var(--bg-secondary);border-radius:8px;padding:6px 14px;font-size:11px;border:1px solid var(--border);">
                <div style="color:var(--text-muted);margin-bottom:1px;">${label}</div>
                <div style="font-weight:700;font-size:15px;">${val}</div>
            </div>`;

        stats.innerHTML =
            `<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
                <span style="font-weight:700;font-size:0.92rem;">${escHtml(d.bikeNome || '')} — ${escHtml(d.usuarioNome || '')}</span>
                ${cachedBadge}
                <span style="margin-left:auto;font-size:10px;opacity:.35;">${ms}ms</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                ${card('Distância', distStr)}
                ${card('Tempo estimado', durStr)}
                ${card('Início', escHtml(d.bairroInicio || '—'))}
                ${card('Fim', escHtml(d.bairroFim || '—'))}
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

        // Glow polyline — rota nas ruas
        _historyLayers.push(..._glowPolyline(_historyMap, latlngs, '#818cf8'));

        // Marcador de partida (verde)
        const mkStart = L.divIcon({ className:'', iconSize:[24,24], iconAnchor:[12,12], popupAnchor:[0,-16],
            html:`<div style="width:24px;height:24px;background:#22c55e;border-radius:50%;border:3.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;"><div style="width:7px;height:7px;background:#fff;border-radius:50%;"></div></div>` });
        const startM = L.marker(latlngs[0], { icon: mkStart, zIndexOffset: 1000 })
            .addTo(_historyMap)
            .bindPopup(`<b style="color:#22c55e;">▶ Início</b><br><small>${escHtml(d.bairroInicio || '')}</small>`);
        _historyLayers.push(startM);

        // Marcador de destino (vermelho)
        const mkEnd = L.divIcon({ className:'', iconSize:[24,24], iconAnchor:[12,12], popupAnchor:[0,-16],
            html:`<div style="width:24px;height:24px;background:#ef4444;border-radius:50%;border:3.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;"><div style="width:7px;height:7px;background:#fff;border-radius:50%;"></div></div>` });
        const endM = L.marker(latlngs[latlngs.length - 1], { icon: mkEnd, zIndexOffset: 1000 })
            .addTo(_historyMap)
            .bindPopup(`<b style="color:#ef4444;">⬛ Fim</b><br><small>${escHtml(d.bairroFim || '')}</small>`);
        _historyLayers.push(endM);

        _historyMap.fitBounds(L.latLngBounds(latlngs), { padding: [32, 32] });
        setTimeout(() => _historyMap.invalidateSize(), 120);

    } catch (e) {
        loading.style.display = 'none';
        stats.innerHTML = `<p style="color:var(--danger);text-align:center;padding:24px;">${escHtml(e.message || 'Erro ao carregar rota.')}</p>`;
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
