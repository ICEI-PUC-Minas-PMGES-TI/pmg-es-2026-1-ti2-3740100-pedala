CREATE TABLE inspections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    aluguel_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    usuario_nome VARCHAR(100),
    bike_id BIGINT NOT NULL,
    bike_nome VARCHAR(100),
    status ENUM('pendente', 'aprovada', 'reprovada') NOT NULL DEFAULT 'pendente',
    observacao TEXT,
    funcionario_id BIGINT,
    funcionario_nome VARCHAR(100),
    criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    avaliada_em TIMESTAMP NULL,
    CONSTRAINT fk_inspection_rental FOREIGN KEY (aluguel_id) REFERENCES rentals(id),
    CONSTRAINT fk_inspection_user FOREIGN KEY (usuario_id) REFERENCES users(id),
    CONSTRAINT fk_inspection_bike FOREIGN KEY (bike_id) REFERENCES bikes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
