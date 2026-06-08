package com.pedala.api.gps.service;

import com.pedala.api.gps.domain.BikeTelemetry;
import com.pedala.api.gps.repository.BikeTelemetryRepository;
import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.domain.RentalStatus;
import com.pedala.api.rental.repository.RentalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
@RequiredArgsConstructor
public class GpsSimulatorService {

    private final RentalRepository rentalRepository;
    private final BikeTelemetryRepository bikeTelemetryRepository;

    // ── Centro de referência e zona segura ────────────────────────────────────
    private static final double CENTER_LAT   = -23.5615;
    private static final double CENTER_LNG   = -46.6560;
    private static final double SAFE_ZONE_KM = 5.0;   // aumentado de 2.5 → 5 km

    // ── Waypoints por bairro — São Paulo ──────────────────────────────────────
    // {latitude, longitude}
    private static final double[][] WAYPOINTS = {
        /* 00 */ {-23.5615, -46.6560},   // Av. Paulista — MASP
        /* 01 */ {-23.5580, -46.6606},   // Av. Paulista — Trianon
        /* 02 */ {-23.5558, -46.6640},   // Av. Paulista — Consolação
        /* 03 */ {-23.5486, -46.6590},   // Higienópolis
        /* 04 */ {-23.5421, -46.6528},   // Santa Cecília
        /* 05 */ {-23.5388, -46.6480},   // Vila Buarque
        /* 06 */ {-23.5431, -46.6395},   // República
        /* 07 */ {-23.5445, -46.6354},   // Centro — Anhangabaú
        /* 08 */ {-23.5593, -46.6358},   // Liberdade
        /* 09 */ {-23.5631, -46.6441},   // Bela Vista
        /* 10 */ {-23.5581, -46.6631},   // Cerqueira César
        /* 11 */ {-23.5658, -46.6603},   // Jardins
        /* 12 */ {-23.5747, -46.6658},   // Jardim Paulista
        /* 13 */ {-23.5793, -46.6404},   // Paraíso
        /* 14 */ {-23.5886, -46.6385},   // Vila Mariana
        /* 15 */ {-23.5875, -46.6573},   // Parque Ibirapuera
        /* 16 */ {-23.6034, -46.6639},   // Moema
        /* 17 */ {-23.5987, -46.6498},   // Moema — leste
        /* 18 */ {-23.6020, -46.6350},   // Saúde
        /* 19 */ {-23.5861, -46.6780},   // Itaim Bibi
        /* 20 */ {-23.5725, -46.6876},   // Pinheiros — Faria Lima
        /* 21 */ {-23.5668, -46.6800},   // Pinheiros
        /* 22 */ {-23.5542, -46.6903},   // Vila Madalena
        /* 23 */ {-23.5483, -46.6921},   // Vila Madalena — norte
        /* 24 */ {-23.5388, -46.6840},   // Sumaré
        /* 25 */ {-23.5380, -46.6743},   // Perdizes
        /* 26 */ {-23.5320, -46.6842},   // Pompeia
        /* 27 */ {-23.5270, -46.7050},   // Lapa
        /* 28 */ {-23.5239, -46.6621},   // Barra Funda
        /* 29 */ {-23.5978, -46.6842},   // Vila Olímpia
        /* 30 */ {-23.6140, -46.6950},   // Brooklin
        /* 31 */ {-23.6170, -46.6670},   // Campo Belo
    };

    private static final String[] BAIRROS = {
        /* 00 */ "Av. Paulista — Bela Vista",
        /* 01 */ "Av. Paulista — Trianon",
        /* 02 */ "Av. Paulista — Consolação",
        /* 03 */ "Higienópolis",
        /* 04 */ "Santa Cecília",
        /* 05 */ "Vila Buarque",
        /* 06 */ "República",
        /* 07 */ "Centro — Anhangabaú",
        /* 08 */ "Liberdade",
        /* 09 */ "Bela Vista",
        /* 10 */ "Cerqueira César",
        /* 11 */ "Jardins",
        /* 12 */ "Jardim Paulista",
        /* 13 */ "Paraíso",
        /* 14 */ "Vila Mariana",
        /* 15 */ "Parque Ibirapuera",
        /* 16 */ "Moema",
        /* 17 */ "Moema — Leste",
        /* 18 */ "Saúde",
        /* 19 */ "Itaim Bibi",
        /* 20 */ "Pinheiros — Faria Lima",
        /* 21 */ "Pinheiros",
        /* 22 */ "Vila Madalena",
        /* 23 */ "Vila Madalena — Norte",
        /* 24 */ "Sumaré",
        /* 25 */ "Perdizes",
        /* 26 */ "Pompeia",
        /* 27 */ "Lapa",
        /* 28 */ "Barra Funda",
        /* 29 */ "Vila Olímpia",
        /* 30 */ "Brooklin",
        /* 31 */ "Campo Belo",
    };

    // ── Rotas por bairros vizinhos (loops fechados) ────────────────────────────
    private static final int[][] ROUTE_TEMPLATES = {
        // Rota 1 — Eixo Paulista: Paulista → Jardins → Paraíso → Ibirapuera → Bela Vista → volta
        {0, 1, 2, 10, 11, 12, 19, 15, 16, 13, 9, 8, 0},
        // Rota 2 — Vila Madalena / Pinheiros / Itaim
        {22, 23, 24, 25, 26, 21, 20, 12, 19, 29, 16, 15, 20, 21, 22},
        // Rota 3 — Centro histórico + Liberdade
        {7, 6, 5, 4, 3, 2, 10, 9, 8, 7},
        // Rota 4 — Barra Funda → Lapa → Pompeia → Perdizes → Pinheiros → Itaim → Moema
        {28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 29, 30, 31, 16, 15, 13, 14, 17, 18, 8, 7, 28},
        // Rota 5 — Moema / Vila Mariana / Saúde / Ibirapuera
        {16, 17, 18, 14, 13, 15, 16, 31, 29, 19, 20, 12, 11, 10, 9, 16},
        // Rota 6 — Curta: Paulista → Higienópolis → Santa Cecília → República → Bela Vista
        {0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 0},
    };

    // ── Estado em memória ──────────────────────────────────────────────────────
    private final ConcurrentHashMap<Long, TrackData>   tracks   = new ConcurrentHashMap<>();
    private final CopyOnWriteArrayList<SseEmitter>     emitters = new CopyOnWriteArrayList<>();
    private final AtomicInteger                        tickSeq  = new AtomicInteger(0);
    private final Random random = new Random();

    // ── Recovery no startup ────────────────────────────────────────────────────
    @EventListener(ApplicationReadyEvent.class)
    public void recoverActiveRentals() {
        // Retry até 3x com delay de 3s — Azure SQL pode resetar conexão após migrations longas
        int attempts = 0;
        while (attempts < 3) {
            try {
                List<Rental> ativos = rentalRepository.findByStatus(RentalStatus.ativo);
                if (ativos.isEmpty()) return;
                log.info("[GPS] Recuperando {} locacao(oes) ativa(s) apos startup", ativos.size());
                for (Rental rental : ativos) {
                    startTracking(rental.getBikeId(), rental.getId(), rental.getBikeNome());
                    log.info("[GPS] Tracking reiniciado: bikeId={}, rentalId={}", rental.getBikeId(), rental.getId());
                }
                return;
            } catch (Exception e) {
                attempts++;
                log.warn("[GPS] Falha ao recuperar locacoes (tentativa {}/3): {}", attempts, e.getMessage());
                if (attempts < 3) {
                    try { Thread.sleep(3000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); return; }
                }
            }
        }
        log.error("[GPS] Nao foi possivel recuperar locacoes ativas apos 3 tentativas. GPS iniciara vazio.");
    }

    // ── API pública ────────────────────────────────────────────────────────────
    public void startTracking(Long bikeId, Long rentalId, String bikeNome) {
        stopTracking(bikeId);
        int[] route    = ROUTE_TEMPLATES[random.nextInt(ROUTE_TEMPLATES.length)];
        int   startIdx = route[0];
        double startLat = WAYPOINTS[startIdx][0];
        double startLng = WAYPOINTS[startIdx][1];
        TrackData track = new TrackData(
                bikeId, rentalId, bikeNome, route,
                startLat, startLng,
                BAIRROS[startIdx], 10.0, Instant.now());
        tracks.put(bikeId, track);
        broadcastUpdate(buildPayload(track));
    }

    public void stopTracking(Long bikeId) {
        if (tracks.remove(bikeId) != null) broadcastRemove(bikeId);
    }

    public List<Map<String, Object>> getPositions() {
        return tracks.values().stream().map(this::buildPayload).toList();
    }

    public Map<String, Object> getPosition(Long bikeId) {
        TrackData t = tracks.get(bikeId);
        return t != null ? buildPayload(t) : null;
    }

    public List<Map<String, Object>> getHistory(Long rentalId, int horas) {
        List<com.pedala.api.gps.domain.BikeTelemetry> raw = horas > 0
                ? bikeTelemetryRepository.findByRentalIdAndRegistradoEmAfterOrderByRegistradoEmAsc(
                        rentalId, java.time.Instant.now().minusSeconds((long) horas * 3600))
                : bikeTelemetryRepository.findByRentalIdOrderByRegistradoEmAsc(rentalId);

        // Subsample: max 1000 pontos para não travar o browser
        int step = raw.size() > 1000 ? raw.size() / 1000 : 1;
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (int i = 0; i < raw.size(); i += step) {
            com.pedala.api.gps.domain.BikeTelemetry t = raw.get(i);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("lat",          t.getLatitude());
            m.put("lng",          t.getLongitude());
            m.put("speed",        t.getVelocidade());
            m.put("endereco",     t.getEndereco());
            m.put("registradoEm", t.getRegistradoEm().toString());
            result.add(m);
        }
        if (step > 1 && !raw.isEmpty()) {
            com.pedala.api.gps.domain.BikeTelemetry last = raw.get(raw.size() - 1);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("lat",          last.getLatitude());
            m.put("lng",          last.getLongitude());
            m.put("speed",        last.getVelocidade());
            m.put("endereco",     last.getEndereco());
            m.put("registradoEm", last.getRegistradoEm().toString());
            result.add(m);
        }
        return result;
    }

    public SseEmitter createEmitter() {
        // 5 minutos — frontend reconecta automaticamente em 5s
        SseEmitter emitter = new SseEmitter(300_000L);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(()    -> emitters.remove(emitter));
        emitter.onError(e       -> emitters.remove(emitter));
        return emitter;
    }

    public void lockBike(Long bikeId) {
        TrackData t = tracks.get(bikeId);
        if (t == null) return;
        t.bloqueada = true;
        t.speed     = 0.0;
        broadcastUpdate(buildPayload(t));
    }

    public void unlockBike(Long bikeId) {
        TrackData t = tracks.get(bikeId);
        if (t == null) return;
        t.bloqueada = false;
        broadcastUpdate(buildPayload(t));
    }

    // ── Tick de simulação — 1 segundo para movimento fluido ───────────────────
    @Scheduled(fixedRate = 1000)
    public void tick() {
        int seq = tickSeq.incrementAndGet();
        boolean saveTick = (seq % 4 == 0); // persiste no banco a cada 4 s

        for (TrackData track : tracks.values()) {
            if (!track.bloqueada) {
                advancePosition(track);
                checkGeofence(track);
            } else {
                track.speed = 0.0;
            }

            if (saveTick) persistTelemetry(track);
            broadcastUpdate(buildPayload(track));
        }
    }

    // ── Movimento fluido com interpolação ────────────────────────────────────
    private void advancePosition(TrackData track) {
        int   wpIdx    = track.route[track.targetWpIdx];
        double tgtLat  = WAYPOINTS[wpIdx][0];
        double tgtLng  = WAYPOINTS[wpIdx][1];

        double dlat    = tgtLat - track.lat;
        double dlng    = tgtLng - track.lng;
        // Distância aproximada em metros (1° lat ≈ 111 320 m)
        double distM   = Math.sqrt(dlat * dlat + dlng * dlng) * 111_320.0;

        if (distM < 18.0) {
            // Chegou ao waypoint — avança para o próximo
            track.lat        = tgtLat;
            track.lng        = tgtLng;
            track.targetWpIdx = (track.targetWpIdx + 1) % track.route.length;
            track.bairro     = BAIRROS[track.route[track.targetWpIdx]];
            // Desacelera ao "virar a esquina"
            track.speed = Math.max(8.0, track.speed * 0.65 + random.nextDouble() * 2);
        } else {
            // Velocidade alvo — varia com distância ao próximo waypoint
            double vTarget = distM < 60.0
                    ? 9.0  + random.nextDouble() * 6.0   // desacelera perto da curva
                    : 15.0 + random.nextDouble() * 10.0; // velocidade de cruzeiro

            // Transição suave de velocidade (filtro passa-baixo simples)
            track.speed = track.speed * 0.78 + vTarget * 0.22
                          + (random.nextDouble() - 0.5) * 1.2;
            track.speed = Math.max(5.0, Math.min(28.0, track.speed));

            // Quantidade de metros a percorrer neste tick (1 s)
            double stepM    = (track.speed * 1_000.0 / 3_600.0); // m/s
            double fraction = Math.min(stepM / distM, 0.95);

            track.lat += dlat * fraction;
            track.lng += dlng * fraction;

            // Micro-variação orgânica para simular irregularidades da pista
            track.lat += (random.nextDouble() - 0.5) * 0.000006;
            track.lng += (random.nextDouble() - 0.5) * 0.000006;
        }
    }

    // ── Geofencing ─────────────────────────────────────────────────────────────
    private void checkGeofence(TrackData track) {
        if (track.isSuspeito) return;
        double dist = calculateDistance(CENTER_LAT, CENTER_LNG, track.lat, track.lng);
        if (dist > SAFE_ZONE_KM) {
            track.isSuspeito = true;
            if (track.rentalId != null) {
                rentalRepository.findById(track.rentalId).ifPresent(r -> {
                    r.setAlertaDesvio(true);
                    rentalRepository.save(r);
                });
            }
        }
    }

    // ── Persistência ───────────────────────────────────────────────────────────
    private void persistTelemetry(TrackData track) {
        bikeTelemetryRepository.save(BikeTelemetry.builder()
                .bikeId(track.bikeId)
                .rentalId(track.rentalId)
                .latitude(round6(track.lat))
                .longitude(round6(track.lng))
                .velocidade(track.bloqueada ? 0.0 : track.speed)
                .endereco(track.bairro)
                .build());
    }

    // ── Haversine simplificado ─────────────────────────────────────────────────
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private double round6(double v) { return Math.round(v * 1_000_000.0) / 1_000_000.0; }

    // ── SSE broadcast ──────────────────────────────────────────────────────────
    private Map<String, Object> buildPayload(TrackData t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("bikeId",    t.bikeId);
        m.put("rentalId",  t.rentalId);
        m.put("bikeNome",  t.bikeNome);
        m.put("lat",       round6(t.lat));
        m.put("lng",       round6(t.lng));
        m.put("endereco",  t.bairro);
        m.put("speed",     Math.round(t.speed * 10.0) / 10.0);
        m.put("isSuspeito",t.isSuspeito);
        m.put("bloqueada", t.bloqueada);
        m.put("startedAt", t.startedAt.toString());
        m.put("updatedAt", Instant.now().toString());
        return m;
    }

    private void broadcastUpdate(Map<String, Object> payload) {
        payload.put("type", "update");
        broadcast(payload);
    }

    private void broadcastRemove(Long bikeId) {
        broadcast(Map.of("type", "remove", "bikeId", bikeId));
    }

    private void broadcast(Map<String, Object> data) {
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().data(data));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        emitters.removeAll(dead);
    }

    // ── TrackData ──────────────────────────────────────────────────────────────
    private static class TrackData {
        Long bikeId, rentalId;
        String bikeNome;
        int[] route;
        int targetWpIdx;   // índice dentro de route[] apontando para o próximo waypoint
        double lat, lng;   // posição interpolada atual
        double speed;      // km/h
        String bairro;
        Instant startedAt;
        boolean isSuspeito;
        boolean bloqueada;

        TrackData(Long bikeId, Long rentalId, String bikeNome, int[] route,
                  double lat, double lng, String bairro, double speed, Instant startedAt) {
            this.bikeId    = bikeId;   this.rentalId = rentalId; this.bikeNome = bikeNome;
            this.route     = route;    this.targetWpIdx = 1;
            this.lat       = lat;      this.lng      = lng;
            this.bairro    = bairro;   this.speed    = speed;
            this.startedAt = startedAt;
            this.isSuspeito = false;   this.bloqueada = false;
        }
    }
}
