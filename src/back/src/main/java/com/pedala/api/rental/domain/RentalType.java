package com.pedala.api.rental.domain;

public enum RentalType {
    semanal,
    quinzenal,
    mensal;

    public int getDias() {
        return switch (this) {
            case semanal -> 7;
            case quinzenal -> 15;
            case mensal -> 30;
        };
    }

    public String getLabel() {
        return switch (this) {
            case semanal -> "Semanal (7 dias)";
            case quinzenal -> "Quinzenal (15 dias)";
            case mensal -> "Mensal (30 dias)";
        };
    }
}
