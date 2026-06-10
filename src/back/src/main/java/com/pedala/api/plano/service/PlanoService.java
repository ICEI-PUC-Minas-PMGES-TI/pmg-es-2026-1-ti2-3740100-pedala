package com.pedala.api.plano.service;

import com.pedala.api.bike.domain.Bike;
import com.pedala.api.bike.repository.BikeRepository;
import com.pedala.api.exception.ResourceNotFoundException;
import com.pedala.api.plano.domain.Plano;
import com.pedala.api.plano.dto.PlanoRequest;
import com.pedala.api.plano.repository.PlanoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PlanoService {

    private final PlanoRepository planoRepository;
    private final BikeRepository bikeRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAll() {
        return planoRepository.findAll().stream()
                .map(p -> toMap(p, true)).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAtivos() {
        return planoRepository.findByAtivoTrueOrderByValorAdicionalAsc().stream()
                .map(p -> toMap(p, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listByBike(Long bikeId) {
        return planoRepository.findByBikeId(bikeId).stream()
                .map(p -> toMap(p, false)).toList();
    }

    @Transactional
    public Map<String, Object> create(PlanoRequest req) {
        Plano plano = Plano.builder()
                .nome(req.nome())
                .descricao(req.descricao())
                .valorAdicional(req.valorAdicional() != null ? req.valorAdicional() : BigDecimal.ZERO)
                .cobreManutencao(Boolean.TRUE.equals(req.cobreManutencao()))
                .cobreAvaria(Boolean.TRUE.equals(req.cobreAvaria()))
                .cobreDuvidaFatura(req.cobreDuvidaFatura() == null || req.cobreDuvidaFatura())
                .cobreOutros(Boolean.TRUE.equals(req.cobreOutros()))
                .build();
        plano = planoRepository.save(plano);
        return Map.of("message", "Plano criado com sucesso.", "plano", toMap(plano, false));
    }

    @Transactional
    public Map<String, Object> update(Long id, PlanoRequest req) {
        Plano plano = findById(id);
        if (req.nome() != null && !req.nome().isBlank()) plano.setNome(req.nome());
        if (req.descricao() != null) plano.setDescricao(req.descricao());
        if (req.valorAdicional() != null) plano.setValorAdicional(req.valorAdicional());
        if (req.cobreManutencao() != null) plano.setCobreManutencao(req.cobreManutencao());
        if (req.cobreAvaria() != null) plano.setCobreAvaria(req.cobreAvaria());
        if (req.cobreDuvidaFatura() != null) plano.setCobreDuvidaFatura(req.cobreDuvidaFatura());
        if (req.cobreOutros() != null) plano.setCobreOutros(req.cobreOutros());
        if (req.ativo() != null) plano.setAtivo(req.ativo());
        plano = planoRepository.save(plano);
        return Map.of("message", "Plano atualizado com sucesso.", "plano", toMap(plano, false));
    }

    @Transactional
    public Map<String, Object> desativar(Long id) {
        Plano plano = findById(id);
        plano.setAtivo(false);
        planoRepository.save(plano);
        return Map.of("message", "Plano desativado com sucesso.");
    }

    @Transactional
    public Map<String, Object> assignBike(Long planoId, Long bikeId) {
        findById(planoId);
        bikeRepository.findById(bikeId)
                .orElseThrow(() -> new ResourceNotFoundException("Bike não encontrada."));
        if (planoRepository.existsBikePlano(bikeId, planoId) == 0) {
            planoRepository.insertBikePlano(bikeId, planoId);
        }
        return Map.of("message", "Bike associada ao plano com sucesso.");
    }

    @Transactional
    public Map<String, Object> removeBike(Long planoId, Long bikeId) {
        findById(planoId);
        planoRepository.deleteBikePlano(bikeId, planoId);
        return Map.of("message", "Bike removida do plano.");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listBikesForPlano(Long planoId) {
        findById(planoId);
        List<Bike> allBikes = bikeRepository.findAll();
        Set<Long> assignedIds = new HashSet<>(planoRepository.findBikeIdsByPlanoId(planoId));
        return allBikes.stream()
                .filter(b -> !Boolean.TRUE.equals(b.getRemovida()))
                .map(b -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", b.getId());
                    m.put("nome", b.getNome());
                    m.put("categoria", b.getCategoria());
                    m.put("disponivel", b.getQuantidadeDisponivel() > 0 && !Boolean.TRUE.equals(b.getBloqueada()));
                    m.put("assigned", assignedIds.contains(b.getId()));
                    return m;
                }).toList();
    }

    // ── helpers ─────────────────────────────────────────

    public Plano findById(Long id) {
        return planoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plano não encontrado."));
    }

    public Map<String, Object> toMap(Plano p, boolean includeBikeIds) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("nome", p.getNome());
        m.put("descricao", p.getDescricao());
        m.put("valorAdicional", p.getValorAdicional());
        m.put("cobreManutencao", p.getCobreManutencao());
        m.put("cobreAvaria", p.getCobreAvaria());
        m.put("cobreDuvidaFatura", p.getCobreDuvidaFatura());
        m.put("cobreOutros", p.getCobreOutros());
        m.put("ativo", p.getAtivo());
        m.put("criadoEm", p.getCriadoEm().toString());
        if (includeBikeIds) {
            m.put("bikeIds", planoRepository.findBikeIdsByPlanoId(p.getId()));
        }
        return m;
    }
}
