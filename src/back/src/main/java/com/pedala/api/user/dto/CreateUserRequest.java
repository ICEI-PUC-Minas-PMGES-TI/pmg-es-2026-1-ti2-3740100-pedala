package com.pedala.api.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank(message = "Nome e obrigatorio") String nome,
        @NotBlank(message = "Email e obrigatorio") @Email(message = "Email invalido") String email,
        @NotBlank(message = "Senha e obrigatoria") @Size(min = 3, message = "Senha deve ter ao menos 3 caracteres") String senha,
        @NotBlank(message = "Role e obrigatoria") String role  // "user" ou "funcionario"
) {}
