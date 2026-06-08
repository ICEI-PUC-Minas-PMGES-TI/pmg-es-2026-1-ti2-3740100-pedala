package com.pedala.api.support.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "support_tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rental_id", nullable = false)
    private Long rentalId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "usuario_nome", length = 100)
    private String usuarioNome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TicketTipo tipo;

    @Column(nullable = false, length = 1000)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TicketStatus status = TicketStatus.aberto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TicketPrioridade prioridade = TicketPrioridade.normal;

    @Column(name = "funcionario_id")
    private Long funcionarioId;

    @Column(name = "funcionario_nome", length = 100)
    private String funcionarioNome;

    @Column(length = 2000)
    private String resolucao;

    @Column(name = "coberto_plano", nullable = false)
    @Builder.Default
    private Boolean cobertoPLano = false;

    @Column(name = "custo_gerado", precision = 10, scale = 2)
    private BigDecimal custoGerado;

    @Column(name = "fatura_id", length = 50)
    private String faturaId;

    @Column(name = "criado_em", nullable = false, updatable = false)
    @Builder.Default
    private Instant criadoEm = Instant.now();

    @Column(name = "atualizado_em", nullable = false)
    @Builder.Default
    private Instant atualizadoEm = Instant.now();
}
