package com.pedala.api.bike.repository;

import com.pedala.api.bike.domain.Bike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BikeRepository extends JpaRepository<Bike, Long> {

    List<Bike> findByRemovidaFalse();

    List<Bike> findByCategoriaIgnoreCaseAndRemovidaFalse(String categoria);

    long countByRemovidaFalse();

    long countByDisponivelTrueAndBloqueadaFalseAndRemovidaFalse();

    long countByDisponivelFalseAndRemovidaFalse();
}
