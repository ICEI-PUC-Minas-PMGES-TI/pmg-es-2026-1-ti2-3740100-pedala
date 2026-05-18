-- V8: Tabela de categorias de bicicletas (T-SQL - Azure SQL Server)
-- Permite que o administrador gerencie as categorias de forma dinâmica,
-- sem depender de texto livre no cadastro de bikes.

CREATE TABLE bike_categories (
    id    INT IDENTITY(1,1) PRIMARY KEY,
    nome  NVARCHAR(50) NOT NULL UNIQUE
);

-- Seed das categorias padrão (devem corresponder às bikes inseridas em V6)
INSERT INTO bike_categories (nome) VALUES
    (N'Urbana'),
    (N'Mountain'),
    (N'Speed'),
    (N'Dobravel'),
    (N'Eletrica'),
    (N'Infantil');
