package com.pedala.api.rental.repository;

import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.domain.RentalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RentalRepository extends JpaRepository<Rental, Long> {

    List<Rental> findByUsuarioId(Long usuarioId);

    List<Rental> findByStatus(RentalStatus status);

    List<Rental> findByUsuarioIdAndStatusNot(Long usuarioId, RentalStatus status);

    List<Rental> findByBikeIdAndStatusIn(Long bikeId, List<RentalStatus> statuses);

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
}
