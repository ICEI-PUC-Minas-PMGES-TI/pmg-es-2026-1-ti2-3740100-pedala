package com.pedala.api.inspection.service;

import com.pedala.api.bike.domain.Bike;
import com.pedala.api.bike.repository.BikeRepository;
import com.pedala.api.exception.BusinessException;
import com.pedala.api.exception.ResourceNotFoundException;
import com.pedala.api.gps.service.GpsSimulatorService;
import com.pedala.api.inspection.domain.Inspection;
import com.pedala.api.inspection.domain.InspectionStatus;
import com.pedala.api.inspection.repository.InspectionRepository;
import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.domain.RentalStatus;
import com.pedala.api.rental.repository.RentalRepository;
import com.pedala.api.shared.TimeSimulator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class InspectionService {

    private final InspectionRepository inspectionRepository;
    private final RentalRepository rentalRepository;
    private final BikeRepository bikeRepository;
    private final GpsSimulatorService gpsSimulatorService;
    private final TimeSimulator timeSimulator;

    @Transactional(readOnly = true)
    public Map<String, Object> listInspections(String statusFilter) {
        List<Inspection> lista;
        if (statusFilter != null && !statusFilter.isBlank()) {
            lista = inspectionRepository.findByStatus(InspectionStatus.valueOf(statusFilter));
        } else {
            lista = inspectionRepository.findAll();
        }
        lista.sort((a, b) -> {
            if (a.getStatus() == InspectionStatus.pendente && b.getStatus() != InspectionStatus.pendente) return -1;
            if (a.getStatus() != InspectionStatus.pendente && b.getStatus() == InspectionStatus.pendente) return 1;
            return b.getCriadaEm().compareTo(a.getCriadaEm());
        });
        long pendentes = lista.stream().filter(v -> v.getStatus() == InspectionStatus.pendente).count();
        List<Map<String, Object>> mapped = lista.stream().map(this::toMap).toList();
        return Map.of("vistorias", mapped, "total", mapped.size(), "pendentes", pendentes);
    }

    @Transactional
    public Map<String, Object> approve(Long id, String observacao, Long funcionarioId, String funcionarioNome) {
        Inspection v = inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vistoria nao encontrada."));
        if (v.getStatus() != InspectionStatus.pendente) throw new BusinessException("Vistoria ja avaliada.");

        v.setStatus(InspectionStatus.aprovada);
        v.setObservacao(observacao != null ? observacao : "Bicicleta devolvida em boas condicoes.");
        v.setFuncionarioId(funcionarioId);
        v.setFuncionarioNome(funcionarioNome);
        v.setAvaliadaEm(timeSimulator.now());
        inspectionRepository.save(v);

        Rental rental = rentalRepository.findById(v.getAluguelId()).orElse(null);
        if (rental != null) {
            rental.setStatus(RentalStatus.finalizado);
            rental.setFinalizadoEm(timeSimulator.now());
            rentalRepository.save(rental);

            Bike bike = bikeRepository.findById(rental.getBikeId()).orElse(null);
            if (bike != null) { bike.incrementarEstoque(); bikeRepository.save(bike); }
            try { gpsSimulatorService.stopTracking(rental.getBikeId()); } catch (Exception e) {}
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Vistoria aprovada! Aluguel finalizado e bicicleta liberada.");
        result.put("vistoria", toMap(v));
        return result;
    }

    @Transactional
    public Map<String, Object> reject(Long id, String observacao, Long funcionarioId, String funcionarioNome) {
        if (observacao == null || observacao.isBlank()) throw new BusinessException("Observacao e obrigatoria ao reprovar a vistoria.");
        Inspection v = inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vistoria nao encontrada."));
        if (v.getStatus() != InspectionStatus.pendente) throw new BusinessException("Vistoria ja avaliada.");

        v.setStatus(InspectionStatus.reprovada);
        v.setObservacao(observacao);
        v.setFuncionarioId(funcionarioId);
        v.setFuncionarioNome(funcionarioNome);
        v.setAvaliadaEm(timeSimulator.now());
        inspectionRepository.save(v);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Vistoria reprovada. O cliente sera notificado das pendencias.");
        result.put("vistoria", toMap(v));
        return result;
    }

    private Map<String, Object> toMap(Inspection v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId()); m.put("aluguelId", v.getAluguelId());
        m.put("usuarioId", v.getUsuarioId()); m.put("usuarioNome", v.getUsuarioNome());
        m.put("bikeId", v.getBikeId()); m.put("bikeNome", v.getBikeNome());
        m.put("status", v.getStatus().name());
        m.put("observacao", v.getObservacao());
        m.put("funcionarioId", v.getFuncionarioId()); m.put("funcionarioNome", v.getFuncionarioNome());
        m.put("criadaEm", v.getCriadaEm().toString());
        m.put("avaliadaEm", v.getAvaliadaEm() != null ? v.getAvaliadaEm().toString() : null);
        return m;
    }
}
