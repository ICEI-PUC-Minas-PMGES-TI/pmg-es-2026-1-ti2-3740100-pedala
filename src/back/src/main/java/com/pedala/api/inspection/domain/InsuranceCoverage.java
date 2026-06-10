package com.pedala.api.inspection.domain;

import com.pedala.api.plano.domain.Plano;

import java.math.BigDecimal;

public final class InsuranceCoverage {

    private InsuranceCoverage() {}

    /**
     * Verifica cobertura de chamado usando o novo sistema de Planos.
     * Prioridade: Plano (se disponível) > tipoSeguro legado (fallback).
     */
    public static boolean cobreChamadoPorPlano(Plano plano, String tipoTicket) {
        if (plano == null) return false;
        return plano.cobreTipoChamado(tipoTicket);
    }

    public static boolean cobre(String tipoSeguro, String tipoAvaria) {
        if (tipoSeguro == null || tipoAvaria == null) return false;
        return switch (tipoSeguro.toLowerCase()) {
            case "premium"       -> true;
            case "intermediario" -> "arranhao_leve".equals(tipoAvaria) || "amassado_leve".equals(tipoAvaria);
            default              -> false;
        };
    }

    public static boolean cobreChamado(String tipoSeguro, String tipoTicket) {
        if (tipoSeguro == null) return false;
        return switch (tipoSeguro.toLowerCase()) {
            case "premium"       -> true;
            case "intermediario" -> "manutencao".equals(tipoTicket) || "duvida_fatura".equals(tipoTicket);
            case "basico"        -> "duvida_fatura".equals(tipoTicket);
            default              -> false;
        };
    }

    public static BigDecimal custoAvaria(String tipoAvaria) {
        return switch (tipoAvaria != null ? tipoAvaria : "") {
            case "arranhao_leve"   -> BigDecimal.valueOf(50);
            case "amassado_leve"   -> BigDecimal.valueOf(150);
            case "pneu_furado"     -> BigDecimal.valueOf(120);
            case "quebra_acessorio"-> BigDecimal.valueOf(200);
            case "dano_mecanico"   -> BigDecimal.valueOf(500);
            case "dano_quadro"     -> BigDecimal.valueOf(800);
            case "roubo_parcial"   -> BigDecimal.valueOf(1200);
            case "perda_total"     -> BigDecimal.valueOf(3000);
            default                -> BigDecimal.ZERO;
        };
    }
}
