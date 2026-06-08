package com.pedala.api.inspection.dto;

import java.util.List;

public record AprovarVistoriaRequest(
    String observacao,
    List<String> avarias
) {}
