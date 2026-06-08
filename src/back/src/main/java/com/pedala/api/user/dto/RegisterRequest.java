package com.pedala.api.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Nome é obrigatório") 
        @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres") 
        String nome,

        @NotBlank(message = "Email é obrigatório") 
        @Email(message = "Email inválido") 
        String email,

        @NotBlank(message = "Senha é obrigatória") 
        @Size(min = 3, max = 100, message = "A senha deve ter entre 3 e 100 caracteres") 
        String senha,

        String cpf,
        String telefone,
        AddressDto endereco
) {}