package com.pedala.api.support.controller;

import com.pedala.api.security.UserPrincipal;
import com.pedala.api.support.dto.AbrirTicketRequest;
import com.pedala.api.support.dto.ResolverTicketRequest;
import com.pedala.api.support.service.SupportTicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chamados")
@RequiredArgsConstructor
@Tag(name = "Chamados", description = "Suporte e chamados de locação")
public class SupportTicketController {

    private final SupportTicketService service;

    @Operation(summary = "Abrir chamado (usuário)")
    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> abrir(
            @Valid @RequestBody AbrirTicketRequest req,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(service.abrir(req, p.getId(), p.getNome()));
    }

    @Operation(summary = "Listar meus chamados (usuário)")
    @GetMapping("/meus")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> listMeus(@AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(service.listMeus(p.getId()));
    }

    @Operation(summary = "Listar todos os chamados (funcionário/admin)")
    @GetMapping
    @PreAuthorize("hasAnyRole('FUNCIONARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> listAll(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(service.listAll(status));
    }

    @Operation(summary = "Atender chamado (funcionário)")
    @PutMapping("/{id}/atender")
    @PreAuthorize("hasAnyRole('FUNCIONARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> atender(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(service.atender(id, p.getId(), p.getNome()));
    }

    @Operation(summary = "Resolver chamado (funcionário)")
    @PutMapping("/{id}/resolver")
    @PreAuthorize("hasAnyRole('FUNCIONARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> resolver(
            @PathVariable Long id,
            @Valid @RequestBody ResolverTicketRequest req,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(service.resolver(id, req, p.getId(), p.getNome()));
    }

    @Operation(summary = "Cancelar chamado (usuário/admin)")
    @PutMapping("/{id}/cancelar")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Map<String, Object>> cancelar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal p) {
        boolean isAdmin = p.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return ResponseEntity.ok(service.cancelar(id, p.getId(), isAdmin));
    }

    @Operation(summary = "Estatísticas de chamados (admin)")
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(service.stats());
    }
}
