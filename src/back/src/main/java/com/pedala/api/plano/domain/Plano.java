package com.pedala.api.plano.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "planos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Plano {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(length = 500)
    private String descricao;

    @Column(name = "valor_adicional", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal valorAdicional = BigDecimal.ZERO;

    @Column(name = "cobre_manutencao", nullable = false)
    @Builder.Default
    private Boolean cobreManutencao = false;

    @Column(name = "cobre_avaria", nullable = false)
    @Builder.Default
    private Boolean cobreAvaria = false;

    @Column(name = "cobre_duvida_fatura", nullable = false)
    @Builder.Default
    private Boolean cobreDuvidaFatura = true;

    @Column(name = "cobre_outros", nullable = false)
    @Builder.Default
    private Boolean cobreOutros = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    @Column(name = "criado_em", nullable = false, updatable = false)
    @Builder.Default
    private Instant criadoEm = Instant.now();

    /** Verifica se este plano cobre o tipo de chamado informado. */
    public boolean cobreTipoChamado(String tipoTicket) {
        if (tipoTicket == null) return false;
        return switch (tipoTicket) {
            case "manutencao"    -> Boolean.TRUE.equals(this.cobreManutencao);
            case "avaria"        -> Boolean.TRUE.equals(this.cobreAvaria);
            case "duvida_fatura" -> Boolean.TRUE.equals(this.cobreDuvidaFatura);
            case "outros"        -> Boolean.TRUE.equals(this.cobreOutros);
            default              -> false;
        };
    }
}
