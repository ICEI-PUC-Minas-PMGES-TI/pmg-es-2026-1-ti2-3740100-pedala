package com.pedala.api.gps.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "bike_telemetry")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BikeTelemetry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bike_id", nullable = false)
    private Long bikeId;

    @Column(name = "rental_id")
    private Long rentalId;

    @Column(nullable = false, columnDefinition = "DECIMAL(10,6)")
    private Double latitude;

    @Column(nullable = false, columnDefinition = "DECIMAL(10,6)")
    private Double longitude;

    @Column(nullable = false, columnDefinition = "DECIMAL(5,2)")
    @Builder.Default
    private Double velocidade = 0.0;

    @Column(length = 255)
    private String endereco;

    @Column(name = "registrado_em", nullable = false, updatable = false)
    @Builder.Default
    private Instant registradoEm = Instant.now();
}
