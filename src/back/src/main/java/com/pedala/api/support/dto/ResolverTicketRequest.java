package com.pedala.api.support.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record ResolverTicketRequest(
    @NotBlank String resolucao,
    BigDecimal custo
) {}
