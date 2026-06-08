CREATE TABLE inspection_damages (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    inspection_id BIGINT        NOT NULL REFERENCES inspections(id),
    tipo_avaria   NVARCHAR(50)  NOT NULL,
    coberto_plano BIT           NOT NULL DEFAULT 0,
    custo         DECIMAL(10,2) NOT NULL DEFAULT 0,
    fatura_id     NVARCHAR(50)  REFERENCES rental_invoices(id),
    criado_em     DATETIME2     NOT NULL DEFAULT GETDATE()
);
CREATE INDEX idx_id_inspection ON inspection_damages(inspection_id);
