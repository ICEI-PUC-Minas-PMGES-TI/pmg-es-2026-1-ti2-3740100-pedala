package com.pedala.api.gps.controller;

import com.pedala.api.gps.service.GpsSimulatorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gps")
@RequiredArgsConstructor
@Tag(name = "GPS", description = "Rastreamento GPS em tempo real")
public class GpsController {

    private final GpsSimulatorService gpsService;

    @Operation(summary = "Snapshot de posicoes")
    @GetMapping("/positions")
    @PreAuthorize("hasAnyRole('ADMIN','FUNCIONARIO')")
    public ResponseEntity<Map<String, Object>> positions() {
        List<Map<String, Object>> pos = gpsService.getPositions();
        return ResponseEntity.ok(Map.of("positions", pos, "total", pos.size()));
    }

    @Operation(summary = "Posicao de uma bike")
    @GetMapping("/bike/{bikeId}")
    @PreAuthorize("hasAnyRole('ADMIN','FUNCIONARIO')")
    public ResponseEntity<Map<String, Object>> bikePosition(@PathVariable Long bikeId) {
        Map<String, Object> pos = gpsService.getPosition(bikeId);
        if (pos == null) return ResponseEntity.status(404).body(Map.of("error", "Bike nao esta em rastreamento ativo."));
        return ResponseEntity.ok(pos);
    }

    @Operation(summary = "Stream SSE em tempo real")
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','FUNCIONARIO')")
    public SseEmitter stream() {
        SseEmitter emitter = gpsService.createEmitter();
        try {
            List<Map<String, Object>> initial = gpsService.getPositions();
            for (Map<String, Object> pos : initial) {
                Map<String, Object> event = new java.util.LinkedHashMap<>(pos);
                event.put("type", "update");
                emitter.send(SseEmitter.event().data(event));
            }
            emitter.send(SseEmitter.event().data(Map.of("type", "connected", "activeBikes", initial.size())));
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
        return emitter;
    }
}
