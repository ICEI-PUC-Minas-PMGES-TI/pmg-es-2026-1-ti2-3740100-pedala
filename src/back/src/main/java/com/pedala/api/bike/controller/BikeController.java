package com.pedala.api.bike.controller;

import com.pedala.api.bike.service.BikeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/bikes")
@RequiredArgsConstructor
@Tag(name = "Bikes", description = "Gerenciamento de bicicletas")
public class BikeController {

    private final BikeService bikeService;

    @Operation(summary = "Listar bikes (publico)")
    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String disponivel) {
        return ResponseEntity.ok(bikeService.listBikes(categoria, disponivel));
    }

    @Operation(summary = "Detalhe de bike (publico)")
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        return ResponseEntity.ok(bikeService.getBike(id));
    }

    @Operation(summary = "Adicionar bike (admin)")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> create(
            @RequestParam String nome,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String descricao,
            @RequestParam BigDecimal precoSemanal,
            @RequestParam BigDecimal precoQuinzenal,
            @RequestParam BigDecimal precoMensal,
            @RequestParam(required = false) Integer quantidade,
            @RequestPart(required = false) MultipartFile imagem) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bikeService.createBike(nome, categoria, descricao, precoSemanal, precoQuinzenal, precoMensal, quantidade, imagem));
    }

    @Operation(summary = "Editar bike (admin)")
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable Long id,
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String descricao,
            @RequestParam(required = false) BigDecimal precoSemanal,
            @RequestParam(required = false) BigDecimal precoQuinzenal,
            @RequestParam(required = false) BigDecimal precoMensal,
            @RequestPart(required = false) MultipartFile imagem) {
        return ResponseEntity.ok(bikeService.updateBike(id, nome, categoria, descricao, precoSemanal, precoQuinzenal, precoMensal, imagem));
    }

    @Operation(summary = "Upload de foto (admin)")
    @PostMapping(value = "/{id}/imagem", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadImage(
            @PathVariable Long id,
            @RequestPart MultipartFile imagem) {
        return ResponseEntity.ok(bikeService.uploadImage(id, imagem));
    }

    @Operation(summary = "Incrementar estoque (admin)")
    @PutMapping("/{id}/estoque")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> incrementStock(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(bikeService.incrementStock(id, body.get("incremento")));
    }

    @Operation(summary = "Bloquear bike (admin/funcionario)")
    @PutMapping("/{id}/bloquear")
    @PreAuthorize("hasRole('ADMIN') or hasRole('FUNCIONARIO')")
    public ResponseEntity<Map<String, Object>> block(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String motivo = body != null ? body.get("motivo") : null;
        return ResponseEntity.ok(bikeService.blockBike(id, motivo));
    }

    @Operation(summary = "Ativar bike (admin/funcionario)")
    @PutMapping("/{id}/ativar")
    @PreAuthorize("hasRole('ADMIN') or hasRole('FUNCIONARIO')")
    public ResponseEntity<Map<String, Object>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(bikeService.activateBike(id));
    }

    @Operation(summary = "Remover bike (admin)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        return ResponseEntity.ok(bikeService.deleteBike(id));
    }
}
