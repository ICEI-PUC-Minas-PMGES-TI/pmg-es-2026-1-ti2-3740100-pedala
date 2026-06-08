-- ============================================================
-- V11: Índices de performance na tabela bike_telemetry
-- (substitui V10 que falhou por timeout durante DELETE)
-- ============================================================

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_telemetry_rental_time'
    AND object_id = OBJECT_ID('bike_telemetry')
)
BEGIN
    CREATE INDEX idx_telemetry_rental_time
    ON bike_telemetry (rental_id, registrado_em DESC);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'idx_telemetry_bike_time'
    AND object_id = OBJECT_ID('bike_telemetry')
)
BEGIN
    CREATE INDEX idx_telemetry_bike_time
    ON bike_telemetry (bike_id, registrado_em DESC);
END
