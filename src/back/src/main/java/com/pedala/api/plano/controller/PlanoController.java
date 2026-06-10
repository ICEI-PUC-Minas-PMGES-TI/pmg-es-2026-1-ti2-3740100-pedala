package com.pedala.api.plano.controller;

import com.pedala.api.plano.dto.PlanoRequest;
import com.pedala.api.plano.service.PlanoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Planos", description = "Planos de cobertura e proteção de bikes")
public class PlanoController {

    private final PlanoService service;

    // ── Endpoints públicos / autenticados ──────────────────────────────────────

    @Operation(summary = "Listar planos ativos (público)")
    @GetMapping("/api/planos")
    public ResponseEntity<List<Map<String, Object>>> listAtivos() {
        return ResponseEntity.ok(service.listAtivos());
    }

    @Operation(summary = "Listar planos disponíveis para uma bike (público)")
    @GetMapping("/api/planos/bike/{bikeId}")
    public ResponseEntity<List<Map<String, Object>>> listByBike(@PathVariable Long bikeId) {
        return ResponseEntity.ok(service.listByBike(bikeId));
    }

    @Operation(summary = "Buscar plano por ID (público)")
    @GetMapping("/api/planos/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.toMap(service.findById(id), false));
    }

    // ── Endpoints admin ────────────────────────────────────────────────────────

    @Operation(summary = "Listar todos os planos (admin)")
    @GetMapping("/api/admin/planos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listAll() {
        return ResponseEntity.ok(service.listAll());
    }

    @Operation(summary = "Criar plano (admin)")
    @PostMapping("/api/admin/planos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody PlanoRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @Operation(summary = "Atualizar plano (admin)")
    @PutMapping("/api/admin/planos/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id,
                                                       @Valid @RequestBody PlanoRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @Operation(summary = "Desativar plano (admin)")
    @DeleteMapping("/api/admin/planos/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> desativar(@PathVariable Long id) {
        return ResponseEntity.ok(service.desativar(id));
    }

    @Operation(summary = "Listar bikes de um plano com estado de vínculo (admin)")
    @GetMapping("/api/admin/planos/{id}/bikes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listBikes(@PathVariable Long id) {
        return ResponseEntity.ok(service.listBikesForPlano(id));
    }

    @Operation(summary = "Vincular bike ao plano (admin)")
    @PostMapping("/api/admin/planos/{id}/bikes/{bikeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> assignBike(@PathVariable Long id,
                                                           @PathVariable Long bikeId) {
        return ResponseEntity.ok(service.assignBike(id, bikeId));
    }

    @Operation(summary = "Desvincular bike do plano (admin)")
    @DeleteMapping("/api/admin/planos/{id}/bikes/{bikeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> removeBike(@PathVariable Long id,
                                                           @PathVariable Long bikeId) {
        return ResponseEntity.ok(service.removeBike(id, bikeId));
    }
}
