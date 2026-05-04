package com.pedala.api.inspection.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "inspections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "aluguel_id", nullable = false)
    private Long aluguelId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "usuario_nome", length = 100)
    private String usuarioNome;

    @Column(name = "bike_id", nullable = false)
    private Long bikeId;

    @Column(name = "bike_nome", length = 100)
    private String bikeNome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InspectionStatus status = InspectionStatus.pendente;

    @Column(columnDefinition = "TEXT")
    private String observacao;

    @Column(name = "funcionario_id")
    private Long funcionarioId;

    @Column(name = "funcionario_nome", length = 100)
    private String funcionarioNome;

    @Column(name = "criada_em", nullable = false, updatable = false)
    @Builder.Default
    private Instant criadaEm = Instant.now();

    @Column(name = "avaliada_em")
    private Instant avaliadaEm;
}
