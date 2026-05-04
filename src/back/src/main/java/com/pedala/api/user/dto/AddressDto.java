package com.pedala.api.user.dto;

public record AddressDto(
        String cep,
        String logradouro,
        String numero,
        String bairro,
        String cidade,
        String uf,
        String complemento
) {}
