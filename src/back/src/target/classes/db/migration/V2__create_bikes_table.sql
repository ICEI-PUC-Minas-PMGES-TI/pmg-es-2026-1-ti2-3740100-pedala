CREATE TABLE bikes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'Urbana',
    descricao TEXT,
    disponivel BOOLEAN NOT NULL DEFAULT TRUE,
    bloqueada BOOLEAN NOT NULL DEFAULT FALSE,
    removida BOOLEAN NOT NULL DEFAULT FALSE,
    quantidade INT NOT NULL DEFAULT 1,
    quantidade_disponivel INT NOT NULL DEFAULT 1,
    preco_semanal DECIMAL(10,2) NOT NULL,
    preco_quinzenal DECIMAL(10,2) NOT NULL,
    preco_mensal DECIMAL(10,2) NOT NULL,
    imagem VARCHAR(500),
    motivo_bloqueio VARCHAR(500),
    bloqueada_em TIMESTAMP NULL,
    adicionada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
