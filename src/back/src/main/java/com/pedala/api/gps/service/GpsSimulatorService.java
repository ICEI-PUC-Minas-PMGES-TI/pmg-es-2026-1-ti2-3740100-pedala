package com.pedala.api.gps.service;

import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.repository.RentalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class GpsSimulatorService {

    private final RentalRepository rentalRepository;
    private final com.pedala.api.bike.repository.BikeRepository bikeRepository;

    private static final double[][] WAYPOINTS = {
        {-23.5505, -46.6333}, {-23.5519, -46.6355}, {-23.5538, -46.6381},
        {-23.5561, -46.6408}, {-23.5493, -46.6449}, {-23.5468, -46.6477},
        {-23.5444, -46.6510}, {-23.5414, -46.6545}, {-23.5380, -46.6570},
        {-23.5352, -46.6598}, {-23.5325, -46.6571}, {-23.5303, -46.6527},
        {-23.5278, -46.6491}, {-23.5315, -46.6455}, {-23.5350, -46.6428},
        {-23.5441, -46.6600}, {-23.5476, -46.6564}, {-23.5528, -46.6518},
        {-23.5591, -46.6478}, {-23.5630, -46.6438}, {-23.5655, -46.6398},
        {-23.5672, -46.6358}, {-23.5637, -46.6302}, {-23.5578, -46.6290}
    };

    private static final String[] ENDERECOS = {
        "Av. Paulista, 900", "MASP — Av. Paulista, 1578", "R. da Consolacao, 1287",
        "Largo do Arouche, 55", "Praca da Republica", "Vale do Anhangabau",
        "Viaduto do Cha", "Av. Sao Joao, 300", "R. Teodoro Sampaio, 200",
        "Praca Benedito Calixto", "R. Cardeal Arcoverde", "R. Wisard, 305",
        "R. Aspicuelta", "R. Girassol", "R. Mourato Coelho, 200",
        "Av. Faria Lima, 1000", "Av. Faria Lima, 2000", "R. Leopoldo C. Magalhaes Jr.",
        "R. Pamplona, 100", "Av. 9 de Julho, 3000", "R. Haddock Lobo, 1500",
        "Av. Reboucas, 400", "R. Oscar Freire, 100", "R. Augusta (sul), 2500"
    };

    private static final int[][] ROUTE_TEMPLATES = {
        {0,1,2,3,4,5,6,7}, {7,8,9,10,11,12,13,14}, {14,15,16,17,18,19,20},
        {20,21,22,23,0,1,2}, {4,5,6,7,8,9,10,11}, {15,16,17,18,19,20,21,22,23}
    };

    private final ConcurrentHashMap<Long, TrackData> tracks = new ConcurrentHashMap<>();
    private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private final Random random = new Random();

    public void startTracking(Long bikeId, Long rentalId, String bikeNome) {
        stopTracking(bikeId);
        int[] route = ROUTE_TEMPLATES[random.nextInt(ROUTE_TEMPLATES.length)];
        int startIdx = route[0];
        TrackData track = new TrackData(bikeId, rentalId, bikeNome, route, 0, 1,
                WAYPOINTS[startIdx][0], WAYPOINTS[startIdx][1], ENDERECOS[startIdx], 0, Instant.now(), false);
        tracks.put(bikeId, track);
        broadcastUpdate(buildPayload(track));
    }

    public void stopTracking(Long bikeId) {
        if (tracks.remove(bikeId) != null) {
            broadcastRemove(bikeId);
        }
    }

    public List<Map<String, Object>> getPositions() {
        return tracks.values().stream().map(this::buildPayload).toList();
    }

    public Map<String, Object> getPosition(Long bikeId) {
        TrackData t = tracks.get(bikeId);
        return t != null ? buildPayload(t) : null;
    }

    public SseEmitter createEmitter() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        return emitter;
    }

    @Scheduled(fixedRate = 4000)
    public void tick() {
        for (TrackData track : tracks.values()) {
            int next = track.index + track.direction;
            if (next >= track.route.length) { track.direction = -1; track.index = track.route.length - 2; }
            else if (next < 0) { track.direction = 1; track.index = 1; }
            else { track.index = next; }

            int wpIdx = track.route[track.index];
            track.lat = WAYPOINTS[wpIdx][0];
            track.lng = WAYPOINTS[wpIdx][1];
            track.endereco = ENDERECOS[wpIdx];
            track.speed = 8 + random.nextDouble() * 10;
            
            // Geofencing Check (Centro: MASP -23.5615, -46.6560)
            double distance = calculateDistance(-23.5615, -46.6560, track.lat, track.lng);
            if (distance > 2.5 && !track.isSuspeito) { // Using 2.5km to ensure it triggers with current waypoints
                track.isSuspeito = true;
                if (track.rentalId != null) {
                    rentalRepository.findById(track.rentalId).ifPresent(r -> {
                        r.setAlertaDesvio(true);
                        rentalRepository.save(r);
                    });
                }
            }
            
            // Verifica se a bike esta bloqueada
            boolean isBlocked = bikeRepository.findById(track.bikeId)
                    .map(com.pedala.api.bike.domain.Bike::getBloqueada)
                    .orElse(false);

            if (!isBlocked) {
                broadcastUpdate(buildPayload(track));
            }
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private Map<String, Object> buildPayload(TrackData t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("bikeId", t.bikeId); m.put("rentalId", t.rentalId); m.put("bikeNome", t.bikeNome);
        m.put("lat", t.lat); m.put("lng", t.lng); m.put("endereco", t.endereco);
        m.put("speed", Math.round(t.speed * 10.0) / 10.0);
        m.put("isSuspeito", t.isSuspeito);
        m.put("startedAt", t.startedAt.toString()); m.put("updatedAt", Instant.now().toString());
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

    private static class TrackData {
        Long bikeId, rentalId; String bikeNome; int[] route;
        int index, direction; double lat, lng, speed; String endereco; Instant startedAt; boolean isSuspeito;
        TrackData(Long bikeId, Long rentalId, String bikeNome, int[] route, int index, int direction,
                  double lat, double lng, String endereco, double speed, Instant startedAt, boolean isSuspeito) {
            this.bikeId = bikeId; this.rentalId = rentalId; this.bikeNome = bikeNome;
            this.route = route; this.index = index; this.direction = direction;
            this.lat = lat; this.lng = lng; this.endereco = endereco;
            this.speed = speed; this.startedAt = startedAt; this.isSuspeito = isSuspeito;
        }
    }
}
