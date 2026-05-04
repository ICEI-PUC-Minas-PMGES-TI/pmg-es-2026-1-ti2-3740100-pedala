/**
 * PEDALA GPS SIMULATOR
 * ====================
 * Simula rastreamento GPS de bicicletas em locacao.
 * Execucao: node gps_simulator.js
 *
 * O que faz:
 * - Consulta /api/bikes para pegar bikes indisponiveis (em locacao)
 * - Gera rotas simuladas em Sao Paulo e outras cidades
 * - Posta atualizacoes de posicao a cada 5 segundos via /api/gps/:bikeId
 * - Simula velocidade, paradas e rotas realistas
 */

const http = require('http');

const API_BASE = 'http://localhost:8080/api';
const GPS_API_KEY = process.env.GPS_API_KEY || 'pedala-gps-2025';
const INTERVAL_MS = 5000; // 5 segundos

// Rotas simuladas por regiao (lat, lng)
const ROTAS = {
    centro_sp: {
        nome: 'Centro de Sao Paulo',
        waypoints: [
            { lat: -23.5505, lng: -46.6333 },
            { lat: -23.5487, lng: -46.6380 },
            { lat: -23.5470, lng: -46.6420 },
            { lat: -23.5455, lng: -46.6460 },
            { lat: -23.5440, lng: -46.6500 },
            { lat: -23.5455, lng: -46.6540 },
            { lat: -23.5470, lng: -46.6580 },
            { lat: -23.5490, lng: -46.6610 },
        ]
    },
    paulista: {
        nome: 'Av. Paulista',
        waypoints: [
            { lat: -23.5628, lng: -46.6544 },
            { lat: -23.5618, lng: -46.6568 },
            { lat: -23.5609, lng: -46.6592 },
            { lat: -23.5599, lng: -46.6616 },
            { lat: -23.5590, lng: -46.6640 },
            { lat: -23.5599, lng: -46.6616 },
            { lat: -23.5609, lng: -46.6592 },
        ]
    },
    ibirapuera: {
        nome: 'Parque Ibirapuera',
        waypoints: [
            { lat: -23.5874, lng: -46.6576 },
            { lat: -23.5881, lng: -46.6548 },
            { lat: -23.5895, lng: -46.6521 },
            { lat: -23.5910, lng: -46.6500 },
            { lat: -23.5895, lng: -46.6521 },
            { lat: -23.5881, lng: -46.6548 },
        ]
    },
    jardins: {
        nome: 'Jardins',
        waypoints: [
            { lat: -23.5725, lng: -46.6668 },
            { lat: -23.5740, lng: -46.6640 },
            { lat: -23.5760, lng: -46.6615 },
            { lat: -23.5780, lng: -46.6590 },
            { lat: -23.5760, lng: -46.6615 },
            { lat: -23.5740, lng: -46.6640 },
        ]
    }
};

const bikeRouteMap = {}; // bikeId -> { rota, waypointIndex, step, parada }

function lerRotaParaBike(bikeId) {
    if (!bikeRouteMap[bikeId]) {
        const rotaKeys = Object.keys(ROTAS);
        const rotaKey = rotaKeys[bikeId % rotaKeys.length];
        bikeRouteMap[bikeId] = {
            rota: ROTAS[rotaKey],
            nomeRota: ROTAS[rotaKey].nome,
            waypointIndex: 0,
            step: 0,
            parada: false,
            paradaContar: 0
        };
        console.log(`[GPS] Bike ${bikeId} → Rota: ${ROTAS[rotaKey].nome}`);
    }
    return bikeRouteMap[bikeId];
}

function interpolar(p1, p2, t) {
    return {
        lat: p1.lat + (p2.lat - p1.lat) * t,
        lng: p1.lng + (p2.lng - p1.lng) * t
    };
}

function calcularPosicao(bikeId) {
    const estado = lerRotaParaBike(bikeId);
    const waypoints = estado.rota.waypoints;

    // Simular parada ocasional (20% de chance a cada 10 steps)
    if (!estado.parada && estado.step % 10 === 0 && Math.random() < 0.2) {
        estado.parada = true;
        estado.paradaContar = Math.floor(Math.random() * 4) + 2; // 2-5 ciclos parado
        console.log(`[GPS] Bike ${bikeId} → Parada em ${estado.nomeRota}`);
    }

    if (estado.parada) {
        estado.paradaContar--;
        if (estado.paradaContar <= 0) estado.parada = false;
        const waypointAtual = waypoints[estado.waypointIndex];
        return { ...waypointAtual, speed: 0 };
    }

    const wIdx = estado.waypointIndex;
    const nextIdx = (wIdx + 1) % waypoints.length;
    const t = (estado.step % 5) / 5;

    const pos = interpolar(waypoints[wIdx], waypoints[nextIdx], t);

    estado.step++;
    if (estado.step % 5 === 0) {
        estado.waypointIndex = nextIdx;
        if (estado.waypointIndex === 0) {
            console.log(`[GPS] Bike ${bikeId} → Completou volta em ${estado.nomeRota}`);
        }
    }

    const speed = 10 + Math.random() * 10; // 10-20 km/h
    return { ...pos, speed: parseFloat(speed.toFixed(1)) };
}

function request(url, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const urlParsed = new URL(url);
        const options = {
            hostname: urlParsed.hostname,
            port: urlParsed.port || 80,
            path: urlParsed.pathname,
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve(data); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function getBikesAlugadas() {
    try {
        const data = await request(`${API_BASE}/bikes?disponivel=false`);
        return (data.bikes || []).filter(b => !b.bloqueada && !b.removida);
    } catch (e) {
        return [];
    }
}

let ciclo = 0;
async function simularCiclo() {
    ciclo++;
    const bikes = await getBikesAlugadas();

    if (bikes.length === 0) {
        if (ciclo % 12 === 0) console.log('[GPS] Nenhuma bike em locacao no momento. Aguardando...');
        return;
    }

    for (const bike of bikes) {
        try {
            const pos = calcularPosicao(bike.id);
            await request(`${API_BASE}/gps/${bike.id}`, 'POST', {
                lat: parseFloat(pos.lat.toFixed(6)),
                lng: parseFloat(pos.lng.toFixed(6)),
                speed: pos.speed,
                apiKey: GPS_API_KEY
            });
            console.log(`[GPS] Bike ${bike.id} (${bike.nome}) → lat:${pos.lat.toFixed(4)} lng:${pos.lng.toFixed(4)} | ${pos.speed}km/h`);
        } catch (e) {
            console.error(`[GPS] Erro na bike ${bike.id}:`, e.message);
        }
    }
}

// Verificar se o backend esta rodando antes de iniciar
async function iniciar() {
    console.log('\n=================================================');
    console.log('   PEDALA GPS SIMULATOR v1.0');
    console.log('=================================================');
    console.log(`  API: ${API_BASE}`);
    console.log(`  Intervalo: ${INTERVAL_MS / 1000}s`);
    console.log('  Ctrl+C para parar\n');

    try {
        const health = await request(`${API_BASE}/health`);
        console.log('[GPS] Backend conectado:', health.message);
    } catch (e) {
        console.error('[GPS] ERRO: Backend nao encontrado! Inicie o backend primeiro: cd backend && node server.js');
        process.exit(1);
    }

    console.log('[GPS] Iniciando simulacao...\n');
    simularCiclo();
    setInterval(simularCiclo, INTERVAL_MS);
}

iniciar().catch(console.error);
