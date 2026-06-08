package com.pedala.api.inspection.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "inspection_damages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InspectionDamage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inspection_id", nullable = false)
    private Long inspectionId;

    @Column(name = "tipo_avaria", nullable = false, length = 50)
    private String tipoAvaria;

    @Column(name = "coberto_plano", nullable = false)
    @Builder.Default
    private Boolean cobertoPLano = false;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal custo = BigDecimal.ZERO;

    @Column(name = "fatura_id", length = 50)
    private String faturaId;

    @Column(name = "criado_em", nullable = false, updatable = false)
    @Builder.Default
    private Instant criadoEm = Instant.now();
}
