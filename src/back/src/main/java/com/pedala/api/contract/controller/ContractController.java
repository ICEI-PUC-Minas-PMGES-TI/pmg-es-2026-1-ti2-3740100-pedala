package com.pedala.api.contract.controller;

import com.pedala.api.contract.service.ContractService;
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
@RequestMapping("/api/contratos")
@RequiredArgsConstructor
@Tag(name = "Contratos", description = "Geracao de contratos de locacao")
public class ContractController {

    private final ContractService contractService;

    @Operation(summary = "Gerar contrato HTML")
    @GetMapping("/{aluguelId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getContract(
            @PathVariable Long aluguelId,
            @AuthenticationPrincipal UserPrincipal p) {
        return ResponseEntity.ok(contractService.generateContract(aluguelId, p.getId(), p.getRole()));
    }
}
