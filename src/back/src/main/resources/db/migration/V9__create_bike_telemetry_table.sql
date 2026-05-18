-- V9: Tabela Fato de Telemetria (GPS) - Azure SQL Server
-- Armazena o historico de movimentacao das bicicletas.

CREATE TABLE bike_telemetry (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    bike_id       BIGINT          NOT NULL,
    rental_id     BIGINT,
    latitude      DECIMAL(10,6)   NOT NULL,
    longitude     DECIMAL(10,6)   NOT NULL,
    velocidade    DECIMAL(5,2)    NOT NULL DEFAULT 0,
    endereco      NVARCHAR(255),
    registrado_em DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    
    CONSTRAINT fk_telemetry_bike FOREIGN KEY (bike_id) REFERENCES bikes(id) ON DELETE CASCADE,
    CONSTRAINT fk_telemetry_rental FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE SET NULL
);

-- Indice para buscas rapidas do trajeto de uma locacao especifica ou bike especifica
CREATE INDEX idx_telemetry_bike ON bike_telemetry(bike_id);
CREATE INDEX idx_telemetry_rental ON bike_telemetry(rental_id);
CREATE INDEX idx_telemetry_data ON bike_telemetry(registrado_em);
