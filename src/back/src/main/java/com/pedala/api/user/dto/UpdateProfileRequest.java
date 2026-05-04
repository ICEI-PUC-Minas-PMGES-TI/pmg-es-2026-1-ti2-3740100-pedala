package com.pedala.api.user.dto;

public record UpdateProfileRequest(
        String nome,
        String telefone,
        AddressDto endereco
) {}
