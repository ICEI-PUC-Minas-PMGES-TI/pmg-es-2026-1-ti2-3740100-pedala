package com.pedala.api.gps.repository;

import com.pedala.api.gps.domain.BikeTelemetry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BikeTelemetryRepository extends JpaRepository<BikeTelemetry, Long> {

    // Buscar o histórico de uma locação específica, ordenado do mais antigo para o mais recente (para desenhar a rota)
    List<BikeTelemetry> findByRentalIdOrderByRegistradoEmAsc(Long rentalId);

    // Opcional: buscar o histórico de uma bike específica
    List<BikeTelemetry> findByBikeIdOrderByRegistradoEmAsc(Long bikeId);
}
