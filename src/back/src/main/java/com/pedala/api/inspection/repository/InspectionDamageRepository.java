package com.pedala.api.inspection.repository;

import com.pedala.api.inspection.domain.InspectionDamage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InspectionDamageRepository extends JpaRepository<InspectionDamage, Long> {
    List<InspectionDamage> findByInspectionId(Long inspectionId);
}
