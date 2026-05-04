package com.pedala.api.shared;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class TimeSimulator {

    private long offsetMillis = 0;

    public Instant now() {
        return Instant.now().plusMillis(offsetMillis);
    }

    public void addOffset(int days) {
        offsetMillis += (long) days * 24 * 60 * 60 * 1000;
    }

    public void setOffset(int days) {
        offsetMillis = (long) days * 24 * 60 * 60 * 1000;
    }

    public long daysUntil(Instant target) {
        return ChronoUnit.DAYS.between(now(), target);
    }

    public long daysSince(Instant past) {
        return ChronoUnit.DAYS.between(past, now());
    }
}
