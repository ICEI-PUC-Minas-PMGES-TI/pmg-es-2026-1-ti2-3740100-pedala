package com.pedala.api.inspection.repository;

import com.pedala.api.inspection.domain.Inspection;
import com.pedala.api.inspection.domain.InspectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InspectionRepository extends JpaRepository<Inspection, Long> {

    List<Inspection> findByStatus(InspectionStatus status);

    long countByStatus(InspectionStatus status);

    Optional<Inspection> findByAluguelId(Long aluguelId);
}
