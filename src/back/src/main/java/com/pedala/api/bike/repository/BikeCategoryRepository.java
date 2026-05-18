package com.pedala.api.bike.repository;

import com.pedala.api.bike.domain.BikeCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BikeCategoryRepository extends JpaRepository<BikeCategory, Integer> {

    Optional<BikeCategory> findByNomeIgnoreCase(String nome);

    boolean existsByNomeIgnoreCase(String nome);
}
