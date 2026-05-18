package com.pedala.api.bike.controller;

import com.pedala.api.bike.domain.BikeCategory;
import com.pedala.api.bike.repository.BikeCategoryRepository;
import com.pedala.api.exception.BusinessException;
import com.pedala.api.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints para gerenciamento de categorias de bicicletas.
 * Apenas ADMIN pode criar e remover categorias.
 * A listagem é pública, pois o formulário de cadastro de bike (cliente) precisa das opções.
 */
@RestController
@RequestMapping("/api/bike-categories")
@RequiredArgsConstructor
@Tag(name = "Categorias de Bikes", description = "Gerenciamento das categorias disponíveis para bicicletas")
public class BikeCategoryController {

    private final BikeCategoryRepository bikeCategoryRepository;

    // ── Listar (público — necessário para preencher o <select> no formulário) ──
    @Operation(summary = "Listar todas as categorias (público)")
    @GetMapping
    public ResponseEntity<Map<String, Object>> list() {
        List<BikeCategory> cats = bikeCategoryRepository.findAll();
        List<Map<String, Object>> result = cats.stream()
                .map(c -> Map.<String, Object>of("id", c.getId(), "nome", c.getNome()))
                .toList();
        return ResponseEntity.ok(Map.of("categorias", result, "total", result.size()));
    }

    // ── Criar (somente ADMIN) ─────────────────────────────────────────────────
    @Operation(summary = "Criar nova categoria (admin)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, String> body) {
        String nome = body == null ? null : body.get("nome");
        if (nome == null || nome.isBlank()) {
            throw new BusinessException("O nome da categoria é obrigatório.");
        }
        nome = nome.trim();
        if (bikeCategoryRepository.existsByNomeIgnoreCase(nome)) {
            throw new BusinessException("Já existe uma categoria com o nome \"" + nome + "\".");
        }
        BikeCategory cat = bikeCategoryRepository.save(BikeCategory.builder().nome(nome).build());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Categoria \"" + cat.getNome() + "\" criada!", "categoria", Map.of("id", cat.getId(), "nome", cat.getNome())));
    }

    // ── Remover (somente ADMIN) ───────────────────────────────────────────────
    @Operation(summary = "Remover categoria (admin)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Integer id) {
        BikeCategory cat = bikeCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada."));
        bikeCategoryRepository.delete(cat);
        return ResponseEntity.ok(Map.of("message", "Categoria \"" + cat.getNome() + "\" removida."));
    }
}
