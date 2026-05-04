package com.pedala.api.inspection.controller;

import com.pedala.api.inspection.service.InspectionService;
import com.pedala.api.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/vistorias")
@RequiredArgsConstructor
@Tag(name = "Vistorias", description = "Vistorias de bicicletas")
public class InspectionController {

    private final InspectionService inspectionService;

    @Operation(summary = "Listar vistorias")
    @GetMapping
    @PreAuthorize("hasAnyRole('FUNCIONARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> list(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(inspectionService.listInspections(status));
    }

    @Operation(summary = "Aprovar vistoria")
    @PutMapping("/{id}/aprovar")
    @PreAuthorize("hasAnyRole('FUNCIONARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> approve(
            @PathVariable Long id, @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal p) {
        String obs = body != null ? body.get("observacao") : null;
        return ResponseEntity.ok(inspectionService.approve(id, obs, p.getId(), p.getNome()));
    }

    @Operation(summary = "Reprovar vistoria")
    @PutMapping("/{id}/reprovar")
    @PreAuthorize("hasAnyRole('FUNCIONARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> reject(
            @PathVariable Long id, @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(inspectionService.reject(id, body.get("observacao"), p.getId(), p.getNome()));
    }
}
