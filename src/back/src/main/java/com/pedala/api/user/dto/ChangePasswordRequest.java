package com.pedala.api.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Informe a senha atual.")
        String senhaAtual,

        @NotBlank(message = "Informe a nova senha.")
        @Size(min = 3, message = "A nova senha deve ter ao menos 3 caracteres.")
        String novaSenha
) {}
