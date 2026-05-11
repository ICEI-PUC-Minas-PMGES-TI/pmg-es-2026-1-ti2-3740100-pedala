package com.pedala.api.rental.controller;

import com.pedala.api.security.UserPrincipal;
import com.pedala.api.rental.service.RentalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rentals")
@RequiredArgsConstructor
@Tag(name = "Rentals", description = "Locacoes de bicicletas")
public class RentalController {

    private final RentalService rentalService;

    @Operation(summary = "Criar locacao (user)")
    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> create(
            @AuthenticationPrincipal UserPrincipal p,
            @RequestBody Map<String, Object> body) {
        Long bikeId = body.get("bikeId") != null ? Long.valueOf(body.get("bikeId").toString()) : null;
        String tipo = (String) body.get("tipo");
        String dataInicio = (String) body.get("dataInicio");
        Integer recorrencia = body.get("recorrenciaMeses") != null ? Integer.valueOf(body.get("recorrenciaMeses").toString()) : null;
        String tipoSeguro = (String) body.get("tipoSeguro");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(rentalService.createRental(p.getId(), p.getNome(), p.getEmail(), bikeId, tipo, dataInicio, recorrencia, tipoSeguro));
    }

    @Operation(summary = "Minhas locacoes")
    @GetMapping("/meus")
    public ResponseEntity<Map<String, Object>> myRentals(@AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(rentalService.getMyRentals(p.getId()));
    }

    @Operation(summary = "Listar todas (funcionario/admin)")
    @GetMapping
    @PreAuthorize("hasAnyRole('FUNCIONARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> all(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(rentalService.getAllRentals(status));
    }

    @Operation(summary = "Ativar locacao (funcionario/admin)")
    @PutMapping("/{id}/ativar")
    @PreAuthorize("hasAnyRole('FUNCIONARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(rentalService.activateRental(id));
    }

    @Operation(summary = "Finalizar locacao (funcionario/admin)")
    @PutMapping("/{id}/finalizar")
    @PreAuthorize("hasAnyRole('FUNCIONARIO','ADMIN')")
    public ResponseEntity<Map<String, Object>> finalize(@PathVariable Long id) {
        return ResponseEntity.ok(rentalService.finalizeRental(id));
    }

    @Operation(summary = "Solicitar devolucao (user)")
    @PutMapping("/{id}/solicitar-devolucao")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> requestReturn(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(rentalService.requestReturn(id, p.getId()));
    }

    @Operation(summary = "Solicitar pagamento (user)")
    @PostMapping("/{id}/pagar")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> pay(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(rentalService.requestPayment(id, p.getId()));
    }

    @Operation(summary = "Pagar fatura especifica (user)")
    @PostMapping("/{id}/faturas/{faturaId}/pagar")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> payInvoice(
            @PathVariable Long id, @PathVariable String faturaId,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(rentalService.payInvoice(id, faturaId, p.getId()));
    }

    @Operation(summary = "Renovar contrato (user)")
    @PutMapping("/{id}/renovar")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> renew(
            @PathVariable Long id, @AuthenticationPrincipal UserPrincipal p,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(rentalService.renewRental(id, p.getId(), body.get("tipo")));
    }
}
