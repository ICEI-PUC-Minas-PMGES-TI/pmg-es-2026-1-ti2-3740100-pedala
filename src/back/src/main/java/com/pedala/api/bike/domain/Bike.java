package com.pedala.api.bike.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "bikes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String categoria = "Urbana";

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(nullable = false)
    @Builder.Default
    private Boolean disponivel = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean bloqueada = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean removida = false;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantidade = 1;

    @Column(name = "quantidade_disponivel", nullable = false)
    @Builder.Default
    private Integer quantidadeDisponivel = 1;

    @Column(name = "preco_semanal", nullable = false, precision = 10, scale = 2)
    private BigDecimal precoSemanal;

    @Column(name = "preco_quinzenal", nullable = false, precision = 10, scale = 2)
    private BigDecimal precoQuinzenal;

    @Column(name = "preco_mensal", nullable = false, precision = 10, scale = 2)
    private BigDecimal precoMensal;

    @Column(length = 500)
    private String imagem;

    @Column(name = "motivo_bloqueio", length = 500)
    private String motivoBloqueio;

    @Column(name = "bloqueada_em")
    private Instant bloqueadaEm;

    @Column(name = "adicionada_em", nullable = false, updatable = false)
    @Builder.Default
    private Instant adicionadaEm = Instant.now();

    public boolean isDisponivel() {
        return !bloqueada && !removida && quantidadeDisponivel > 0;
    }

    public void decrementarEstoque() {
        this.quantidadeDisponivel = Math.max(0, this.quantidadeDisponivel - 1);
        this.disponivel = this.quantidadeDisponivel > 0;
    }

    public void incrementarEstoque() {
        this.quantidadeDisponivel = Math.min(this.quantidade, this.quantidadeDisponivel + 1);
        this.disponivel = this.quantidadeDisponivel > 0 && !this.bloqueada;
    }
}
