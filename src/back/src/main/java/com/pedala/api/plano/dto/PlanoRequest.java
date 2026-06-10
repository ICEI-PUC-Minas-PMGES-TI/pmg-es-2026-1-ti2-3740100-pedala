package com.pedala.api.plano.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record PlanoRequest(
    @NotBlank String nome,
    String descricao,
    BigDecimal valorAdicional,
    Boolean cobreManutencao,
    Boolean cobreAvaria,
    Boolean cobreDuvidaFatura,
    Boolean cobreOutros,
    Boolean ativo
) {}
