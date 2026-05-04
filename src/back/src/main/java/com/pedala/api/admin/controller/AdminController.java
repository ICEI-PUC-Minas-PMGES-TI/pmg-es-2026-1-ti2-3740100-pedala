package com.pedala.api.admin.controller;

import com.pedala.api.admin.service.AdminService;
import com.pedala.api.security.UserPrincipal;
import com.pedala.api.shared.TimeSimulator;
import com.pedala.api.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Painel administrativo")
public class AdminController {

    private final AdminService adminService;
    private final UserService userService;
    private final TimeSimulator timeSimulator;

    @Operation(summary = "Dashboard de metricas")
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    @Operation(summary = "Bikes com detalhes de aluguel")
    @GetMapping("/bikes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> bikes() {
        return ResponseEntity.ok(adminService.getAdminBikes());
    }

    @Operation(summary = "Todos os alugueis")
    @GetMapping("/alugueis")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> alugueis(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.getAdminRentals(status));
    }

    @Operation(summary = "Listar usuarios")
    @GetMapping("/usuarios")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> usuarios() {
        List<Map<String, Object>> lista = userService.listAllUsers();
        return ResponseEntity.ok(Map.of("usuarios", lista, "total", lista.size()));
    }

    @Operation(summary = "Listar pagamentos")
    @GetMapping("/pagamentos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> pagamentos(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.getPayments(status));
    }

    @Operation(summary = "Aprovar pagamento")
    @PutMapping("/pagamentos/{aluguelId}/aprovar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> approvePayment(
            @PathVariable Long aluguelId, @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(adminService.approvePayment(aluguelId, p.getNome()));
    }

    @Operation(summary = "Rejeitar pagamento")
    @PutMapping("/pagamentos/{aluguelId}/rejeitar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> rejectPayment(
            @PathVariable Long aluguelId, @RequestBody(required = false) Map<String, String> body) {
        String motivo = body != null ? body.get("motivo") : null;
        return ResponseEntity.ok(adminService.rejectPayment(aluguelId, motivo));
    }

    @Operation(summary = "Aprovar fatura")
    @PutMapping("/pagamentos/{aluguelId}/faturas/{faturaId}/aprovar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> approveInvoice(
            @PathVariable Long aluguelId, @PathVariable String faturaId,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(adminService.approveInvoice(aluguelId, faturaId, p.getNome()));
    }

    @Operation(summary = "Avancar tempo (dev)")
    @PostMapping("/forward-time")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> forwardTime(@RequestBody Map<String, Integer> body) {
        int days = body.getOrDefault("days", 1);
        timeSimulator.addOffset(days);
        return ResponseEntity.ok(Map.of("message", "Time moved forward by " + days + " days", "newTime", timeSimulator.now().toString()));
    }
}
