/**
 * PEDALA - GPS Mock Route Database
 * =================================
 * Banco de dados de rotas simuladas para bikes em locacao.
 * Cada rota tem: ponto de inicio, pontos de parada (com duracao), e ponto de fim.
 * Dados representam rotas reais em Sao Paulo, SP.
 *
 * Esta pasta (GPS/) e independente do backend e frontend.
 * O backend importa este arquivo via require('../GPS/routes_mock.js')
 * ou usa o arquivo copiado em backend/data/gps_routes.js
 */

// ─── Tipos de parada ───────────────────────────────────────────────
// 'semaforo'    : parada curta em semaforo (1-3 min)
// 'descanso'    : pausa para descanso (5-15 min)
// 'comercio'    : visita a comercio/servico (10-30 min)
// 'destino'     : chegou ao destino parcial (15-60 min)
// ───────────────────────────────────────────────────────────────────

const rotasMock = [
    {
        id: 'rota_001',
        bikeId: 1,
        locacaoId: null,               // preenchido dinamicamente
        nomeRota: 'Centro → Paulista',
        data: '2026-03-01',
        distanciaTotalKm: 4.2,
        duracaoTotalMin: 38,
        velocidadeMediaKmh: 14.5,
        startPoint: {
            lat: -23.5505, lng: -46.6333,
            endereco: 'Praca da Se, Centro, Sao Paulo - SP',
            timestamp: '2026-03-01T08:00:00-03:00'
        },
        stopPoints: [
            {
                lat: -23.5487, lng: -46.6380,
                endereco: 'R. Libero Badaro, 119 - Centro, SP',
                tipo: 'semaforo',
                duracaoMin: 2,
                inicioParada: '2026-03-01T08:07:00-03:00',
                fimParada: '2026-03-01T08:09:00-03:00'
            },
            {
                lat: -23.5510, lng: -46.6460,
                endereco: 'Viaduto do Cha, Centro, SP',
                tipo: 'descanso',
                duracaoMin: 8,
                inicioParada: '2026-03-01T08:14:00-03:00',
                fimParada: '2026-03-01T08:22:00-03:00'
            },
            {
                lat: -23.5575, lng: -46.6520,
                endereco: 'R. da Consolacao, 900 - Consolacao, SP',
                tipo: 'comercio',
                duracaoMin: 12,
                inicioParada: '2026-03-01T08:29:00-03:00',
                fimParada: '2026-03-01T08:41:00-03:00'
            }
        ],
        endPoint: {
            lat: -23.5628, lng: -46.6544,
            endereco: 'Av. Paulista, 1374 - Bela Vista, Sao Paulo - SP',
            timestamp: '2026-03-01T08:51:00-03:00'
        },
        waypoints: [
            { lat: -23.5505, lng: -46.6333 },
            { lat: -23.5487, lng: -46.6380 },
            { lat: -23.5499, lng: -46.6415 },
            { lat: -23.5510, lng: -46.6460 },
            { lat: -23.5525, lng: -46.6480 },
            { lat: -23.5540, lng: -46.6495 },
            { lat: -23.5555, lng: -46.6505 },
            { lat: -23.5575, lng: -46.6520 },
            { lat: -23.5590, lng: -46.6530 },
            { lat: -23.5605, lng: -46.6538 },
            { lat: -23.5628, lng: -46.6544 }
        ]
    },
    {
        id: 'rota_002',
        bikeId: 2,
        locacaoId: null,
        nomeRota: 'Ibirapuera → Jardins',
        data: '2026-03-01',
        distanciaTotalKm: 6.8,
        duracaoTotalMin: 55,
        velocidadeMediaKmh: 16.2,
        startPoint: {
            lat: -23.5874, lng: -46.6576,
            endereco: 'Parque Ibirapuera, Entrada 3 - Vila Mariana, SP',
            timestamp: '2026-03-01T09:30:00-03:00'
        },
        stopPoints: [
            {
                lat: -23.5860, lng: -46.6610,
                endereco: 'Av. Pedro Alvares Cabral - Vila Mariana, SP',
                tipo: 'semaforo',
                duracaoMin: 1,
                inicioParada: '2026-03-01T09:38:00-03:00',
                fimParada: '2026-03-01T09:39:00-03:00'
            },
            {
                lat: -23.5810, lng: -46.6640,
                endereco: 'Supermercado Extra - Moema, SP',
                tipo: 'comercio',
                duracaoMin: 22,
                inicioParada: '2026-03-01T09:47:00-03:00',
                fimParada: '2026-03-01T10:09:00-03:00'
            },
            {
                lat: -23.5760, lng: -46.6615,
                endereco: 'Padaria Bela Vista - Moema, SP',
                tipo: 'comercio',
                duracaoMin: 8,
                inicioParada: '2026-03-01T10:15:00-03:00',
                fimParada: '2026-03-01T10:23:00-03:00'
            }
        ],
        endPoint: {
            lat: -23.5725, lng: -46.6668,
            endereco: 'R. Oscar Freire, 900 - Jardins, Sao Paulo - SP',
            timestamp: '2026-03-01T10:32:00-03:00'
        },
        waypoints: [
            { lat: -23.5874, lng: -46.6576 },
            { lat: -23.5860, lng: -46.6610 },
            { lat: -23.5845, lng: -46.6622 },
            { lat: -23.5830, lng: -46.6630 },
            { lat: -23.5810, lng: -46.6640 },
            { lat: -23.5795, lng: -46.6635 },
            { lat: -23.5780, lng: -46.6625 },
            { lat: -23.5760, lng: -46.6615 },
            { lat: -23.5745, lng: -46.6638 },
            { lat: -23.5725, lng: -46.6668 }
        ]
    },
    {
        id: 'rota_003',
        bikeId: 3,
        locacaoId: null,
        nomeRota: 'Paulista → Pinheiros (loop)',
        data: '2026-03-02',
        distanciaTotalKm: 9.1,
        duracaoTotalMin: 72,
        velocidadeMediaKmh: 13.8,
        startPoint: {
            lat: -23.5617, lng: -46.6560,
            endereco: 'MASP, Av. Paulista, 1578 - Bela Vista, SP',
            timestamp: '2026-03-02T07:15:00-03:00'
        },
        stopPoints: [
            {
                lat: -23.5650, lng: -46.6580,
                endereco: 'R. Augusta, 1000 - Consolacao, SP',
                tipo: 'descanso',
                duracaoMin: 10,
                inicioParada: '2026-03-02T07:24:00-03:00',
                fimParada: '2026-03-02T07:34:00-03:00'
            },
            {
                lat: -23.5640, lng: -46.6760,
                endereco: 'Shopping Pinheiros - Pinheiros, SP',
                tipo: 'destino',
                duracaoMin: 35,
                inicioParada: '2026-03-02T07:51:00-03:00',
                fimParada: '2026-03-02T08:26:00-03:00'
            },
            {
                lat: -23.5610, lng: -46.6700,
                endereco: 'Ciclovia Augusta - Pinheiros, SP',
                tipo: 'descanso',
                duracaoMin: 7,
                inicioParada: '2026-03-02T08:33:00-03:00',
                fimParada: '2026-03-02T08:40:00-03:00'
            }
        ],
        endPoint: {
            lat: -23.5617, lng: -46.6560,
            endereco: 'MASP, Av. Paulista, 1578 - Bela Vista, SP (retorno)',
            timestamp: '2026-03-02T08:52:00-03:00'
        },
        waypoints: [
            { lat: -23.5617, lng: -46.6560 },
            { lat: -23.5630, lng: -46.6570 },
            { lat: -23.5650, lng: -46.6580 },
            { lat: -23.5657, lng: -46.6620 },
            { lat: -23.5648, lng: -46.6660 },
            { lat: -23.5640, lng: -46.6760 },
            { lat: -23.5622, lng: -46.6730 },
            { lat: -23.5610, lng: -46.6700 },
            { lat: -23.5613, lng: -46.6650 },
            { lat: -23.5615, lng: -46.6610 },
            { lat: -23.5617, lng: -46.6560 }
        ]
    },
    {
        id: 'rota_004',
        bikeId: 4,
        locacaoId: null,
        nomeRota: 'Santana → Tiete',
        data: '2026-03-02',
        distanciaTotalKm: 3.7,
        duracaoTotalMin: 28,
        velocidadeMediaKmh: 17.1,
        startPoint: {
            lat: -23.5003, lng: -46.6234,
            endereco: 'Shopping Center Norte - Santana, SP',
            timestamp: '2026-03-02T13:00:00-03:00'
        },
        stopPoints: [
            {
                lat: -23.5020, lng: -46.6270,
                endereco: 'R. Voluntarios da Patria, 3000 - Santana, SP',
                tipo: 'semaforo',
                duracaoMin: 3,
                inicioParada: '2026-03-02T13:08:00-03:00',
                fimParada: '2026-03-02T13:11:00-03:00'
            },
            {
                lat: -23.5042, lng: -46.6318,
                endereco: 'Terminal Tiete (Rodoviaria), SP',
                tipo: 'destino',
                duracaoMin: 15,
                inicioParada: '2026-03-02T13:18:00-03:00',
                fimParada: '2026-03-02T13:33:00-03:00'
            }
        ],
        endPoint: {
            lat: -23.5055, lng: -46.6340,
            endereco: 'Av. Cruzeiro do Sul, 1800 - Canindé, SP',
            timestamp: '2026-03-02T13:38:00-03:00'
        },
        waypoints: [
            { lat: -23.5003, lng: -46.6234 },
            { lat: -23.5012, lng: -46.6252 },
            { lat: -23.5020, lng: -46.6270 },
            { lat: -23.5028, lng: -46.6288 },
            { lat: -23.5035, lng: -46.6305 },
            { lat: -23.5042, lng: -46.6318 },
            { lat: -23.5048, lng: -46.6328 },
            { lat: -23.5055, lng: -46.6340 }
        ]
    },
    {
        id: 'rota_005',
        bikeId: 5,
        locacaoId: null,
        nomeRota: 'Vila Mariana → Saude',
        data: '2026-03-03',
        distanciaTotalKm: 5.3,
        duracaoTotalMin: 41,
        velocidadeMediaKmh: 15.4,
        startPoint: {
            lat: -23.5880, lng: -46.6310,
            endereco: 'Metrô Ana Rosa - Vila Mariana, SP',
            timestamp: '2026-03-03T06:45:00-03:00'
        },
        stopPoints: [
            {
                lat: -23.5905, lng: -46.6340,
                endereco: 'R. Domingos de Morais, 2160 - Vila Mariana, SP',
                tipo: 'comercio',
                duracaoMin: 14,
                inicioParada: '2026-03-03T06:56:00-03:00',
                fimParada: '2026-03-03T07:10:00-03:00'
            },
            {
                lat: -23.5940, lng: -46.6380,
                endereco: 'Largo do Paraiso - Saude, SP',
                tipo: 'descanso',
                duracaoMin: 9,
                inicioParada: '2026-03-03T07:18:00-03:00',
                fimParada: '2026-03-03T07:27:00-03:00'
            }
        ],
        endPoint: {
            lat: -23.5960, lng: -46.6420,
            endereco: 'R. Afonso Braz, 1400 - Saude, SP',
            timestamp: '2026-03-03T07:35:00-03:00'
        },
        waypoints: [
            { lat: -23.5880, lng: -46.6310 },
            { lat: -23.5890, lng: -46.6322 },
            { lat: -23.5905, lng: -46.6340 },
            { lat: -23.5918, lng: -46.6353 },
            { lat: -23.5928, lng: -46.6362 },
            { lat: -23.5940, lng: -46.6380 },
            { lat: -23.5950, lng: -46.6400 },
            { lat: -23.5960, lng: -46.6420 }
        ]
    },
    {
        id: 'rota_006',
        bikeId: 6,
        locacaoId: null,
        nomeRota: 'Tatuape → Mooca',
        data: '2026-03-03',
        distanciaTotalKm: 4.9,
        duracaoTotalMin: 35,
        velocidadeMediaKmh: 16.7,
        startPoint: {
            lat: -23.5430, lng: -46.5780,
            endereco: 'Shopping Analia Franco - Tatuape, SP',
            timestamp: '2026-03-03T10:00:00-03:00'
        },
        stopPoints: [
            {
                lat: -23.5480, lng: -46.5840,
                endereco: 'R. Taquari, 546 - Mooca, SP',
                tipo: 'semaforo',
                duracaoMin: 2,
                inicioParada: '2026-03-03T10:11:00-03:00',
                fimParada: '2026-03-03T10:13:00-03:00'
            },
            {
                lat: -23.5510, lng: -46.5900,
                endereco: 'Mercado Municipal Mooca - SP',
                tipo: 'comercio',
                duracaoMin: 18,
                inicioParada: '2026-03-03T10:19:00-03:00',
                fimParada: '2026-03-03T10:37:00-03:00'
            }
        ],
        endPoint: {
            lat: -23.5534, lng: -46.5960,
            endereco: 'R. da Mooca, 2200 - Mooca, SP',
            timestamp: '2026-03-03T10:43:00-03:00'
        },
        waypoints: [
            { lat: -23.5430, lng: -46.5780 },
            { lat: -23.5448, lng: -46.5800 },
            { lat: -23.5460, lng: -46.5820 },
            { lat: -23.5480, lng: -46.5840 },
            { lat: -23.5492, lng: -46.5863 },
            { lat: -23.5498, lng: -46.5878 },
            { lat: -23.5510, lng: -46.5900 },
            { lat: -23.5520, lng: -46.5928 },
            { lat: -23.5534, lng: -46.5960 }
        ]
    }
];

// Indice por bikeId para lookup rapido
const rotasPorBike = {};
rotasMock.forEach(r => {
    if (!rotasPorBike[r.bikeId]) rotasPorBike[r.bikeId] = [];
    rotasPorBike[r.bikeId].push(r);
});

module.exports = { rotasMock, rotasPorBike };
