package com.pedala.api.gps.repository;

import com.pedala.api.gps.domain.BikeTelemetry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface BikeTelemetryRepository extends JpaRepository<BikeTelemetry, Long> {

    List<BikeTelemetry> findByRentalIdOrderByRegistradoEmAsc(Long rentalId);

    List<BikeTelemetry> findByRentalIdAndRegistradoEmAfterOrderByRegistradoEmAsc(Long rentalId, Instant after);

    List<BikeTelemetry> findByBikeIdOrderByRegistradoEmAsc(Long bikeId);
}
