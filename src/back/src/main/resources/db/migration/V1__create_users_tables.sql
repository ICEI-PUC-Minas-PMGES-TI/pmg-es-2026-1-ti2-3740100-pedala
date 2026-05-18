-- V1: Tabelas de usuários (T-SQL - Azure SQL Server)
CREATE TABLE users (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    nome        NVARCHAR(100)   NOT NULL,
    email       NVARCHAR(150)   NOT NULL UNIQUE,
    senha       NVARCHAR(255)   NOT NULL,
    cpf         NVARCHAR(14),
    telefone    NVARCHAR(20),
    role        NVARCHAR(20)    NOT NULL DEFAULT 'USER'
                    CONSTRAINT ck_user_role CHECK (role IN ('USER', 'FUNCIONARIO', 'ADMIN')),
    plano       NVARCHAR(50),
    criado_em   DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE user_addresses (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id     BIGINT          NOT NULL UNIQUE,
    cep         NVARCHAR(10),
    logradouro  NVARCHAR(200),
    numero      NVARCHAR(20),
    bairro      NVARCHAR(100),
    cidade      NVARCHAR(100),
    uf          NVARCHAR(2),
    complemento NVARCHAR(100),
    CONSTRAINT fk_address_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
