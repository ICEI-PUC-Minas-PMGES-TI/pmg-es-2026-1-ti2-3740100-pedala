package com.pedala.api.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank(message = "Nome é obrigatório") String nome,
        @NotBlank(message = "Email é obrigatório") @Email(message = "Email inválido") String email,
        @NotBlank(message = "Senha é obrigatória") @Size(min = 3, message = "A senha deve ter ao menos 3 caracteres") String senha,
        @NotBlank(message = "Role é obrigatória") String role  // "user" ou "funcionario"
) {}