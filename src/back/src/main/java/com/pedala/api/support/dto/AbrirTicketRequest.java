package com.pedala.api.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AbrirTicketRequest(
    @NotNull Long rentalId,
    @NotBlank String tipo,
    @NotBlank @Size(min = 10, max = 1000) String descricao,
    String prioridade
) {}
