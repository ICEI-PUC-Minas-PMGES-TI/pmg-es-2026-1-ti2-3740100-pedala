package com.pedala.api.rental.repository;

import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.domain.RentalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RentalRepository extends JpaRepository<Rental, Long> {

    List<Rental> findByUsuarioId(Long usuarioId);

    List<Rental> findByStatus(RentalStatus status);

    List<Rental> findByUsuarioIdAndStatusNot(Long usuarioId, RentalStatus status);

    List<Rental> findByBikeIdAndStatusIn(Long bikeId, List<RentalStatus> statuses);

    // Busca TODOS os aluguéis em determinados statuses — evita N+1 em getAdminBikes()
    List<Rental> findByStatusIn(List<RentalStatus> statuses);

    Optional<Rental> findByIdAndUsuarioId(Long id, Long usuarioId);

    long countByStatus(RentalStatus status);

    @Query("SELECT r FROM Rental r LEFT JOIN FETCH r.faturas LEFT JOIN FETCH r.renovacoes WHERE r.id = :id")
    Optional<Rental> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT r FROM Rental r LEFT JOIN FETCH r.faturas LEFT JOIN FETCH r.renovacoes WHERE r.usuarioId = :userId")
    List<Rental> findByUsuarioIdWithDetails(@Param("userId") Long userId);

    @Query("SELECT r FROM Rental r LEFT JOIN FETCH r.faturas LEFT JOIN FETCH r.renovacoes")
    List<Rental> findAllWithDetails();

    @Query("SELECT r FROM Rental r LEFT JOIN FETCH r.faturas WHERE r.pagamentoStatus IN :statuses")
    List<Rental> findByPagamentoStatusIn(@Param("statuses") List<String> statuses);

    // ── KPI queries ───────────────────────────────────────

    @Query(value = "SELECT COUNT(DISTINCT bike_id) FROM rentals WHERE data_inicio >= :start AND data_inicio < :end", nativeQuery = true)
    long countDistinctBikesRentedInPeriod(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT COUNT(r) FROM Rental r WHERE r.status = com.pedala.api.rental.domain.RentalStatus.finalizado AND SIZE(r.renovacoes) > 0")
    long countFinalizedWithRenovations();

    @Query(value = "SELECT AVG(CAST(DATEDIFF(minute, criado_em, data_inicio) AS FLOAT)) FROM rentals WHERE data_inicio IS NOT NULL AND criado_em IS NOT NULL AND data_inicio >= criado_em", nativeQuery = true)
    Double avgDeliveryTimeMinutes();
}
