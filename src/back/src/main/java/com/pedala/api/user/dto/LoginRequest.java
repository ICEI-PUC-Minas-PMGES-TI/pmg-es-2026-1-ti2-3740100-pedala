package com.pedala.api.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Email e obrigatorio") @Email String email,
        @NotBlank(message = "Senha e obrigatoria") String senha
) {}
