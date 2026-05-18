-- V4: Tabela de vistorias (T-SQL - Azure SQL Server)
CREATE TABLE inspections (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    aluguel_id      BIGINT          NOT NULL,
    usuario_id      BIGINT          NOT NULL,
    usuario_nome    NVARCHAR(100),
    bike_id         BIGINT          NOT NULL,
    bike_nome       NVARCHAR(100),
    status          NVARCHAR(20)    NOT NULL DEFAULT 'pendente'
                        CONSTRAINT ck_inspection_status CHECK (status IN ('pendente','aprovada','reprovada')),
    observacao      NVARCHAR(MAX),
    funcionario_id  BIGINT,
    funcionario_nome NVARCHAR(100),
    criada_em       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    avaliada_em     DATETIME2,
    CONSTRAINT fk_inspection_rental FOREIGN KEY (aluguel_id) REFERENCES rentals(id),
    CONSTRAINT fk_inspection_user   FOREIGN KEY (usuario_id) REFERENCES users(id),
    CONSTRAINT fk_inspection_bike   FOREIGN KEY (bike_id)    REFERENCES bikes(id)
);
