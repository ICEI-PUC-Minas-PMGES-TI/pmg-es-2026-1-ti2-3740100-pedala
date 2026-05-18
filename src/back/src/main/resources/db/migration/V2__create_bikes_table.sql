-- V2: Tabela de bicicletas (T-SQL - Azure SQL Server)
-- Inclui categoria como NVARCHAR — será validada pela tabela bike_categories criada em V8.
CREATE TABLE bikes (
    id                    BIGINT IDENTITY(1,1) PRIMARY KEY,
    nome                  NVARCHAR(100)   NOT NULL,
    categoria             NVARCHAR(50)    NOT NULL DEFAULT 'Urbana',
    descricao             NVARCHAR(MAX),
    disponivel            BIT             NOT NULL DEFAULT 1,
    bloqueada             BIT             NOT NULL DEFAULT 0,
    removida              BIT             NOT NULL DEFAULT 0,
    quantidade            INT             NOT NULL DEFAULT 1,
    quantidade_disponivel INT             NOT NULL DEFAULT 1,
    preco_semanal         DECIMAL(10,2)   NOT NULL,
    preco_quinzenal       DECIMAL(10,2)   NOT NULL,
    preco_mensal          DECIMAL(10,2)   NOT NULL,
    imagem                NVARCHAR(500),
    motivo_bloqueio       NVARCHAR(500),
    bloqueada_em          DATETIME2,
    adicionada_em         DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);
