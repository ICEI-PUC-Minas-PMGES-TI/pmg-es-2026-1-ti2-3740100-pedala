CREATE TABLE rentals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    usuario_nome VARCHAR(100) NOT NULL,
    usuario_email VARCHAR(150),
    bike_id BIGINT NOT NULL,
    bike_nome VARCHAR(100) NOT NULL,
    bike_categoria VARCHAR(50),
    tipo ENUM('semanal', 'quinzenal', 'mensal') NOT NULL,
    plano_label VARCHAR(100),
    ciclos_recorrencia INT NOT NULL DEFAULT 1,
    preco DECIMAL(10,2) NOT NULL,
    status ENUM('agendada', 'aguardando_locacao', 'ativo', 'aguardando_vistoria', 'finalizado') NOT NULL DEFAULT 'aguardando_locacao',
    data_inicio TIMESTAMP NOT NULL,
    data_devolucao_prevista TIMESTAMP NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ativado_em TIMESTAMP NULL,
    devolvido_em TIMESTAMP NULL,
    finalizado_em TIMESTAMP NULL,
    devolucao_antecipada BOOLEAN DEFAULT FALSE,
    dias_nao_utilizados INT,
    valor_nao_utilizado DECIMAL(10,2),
    multa_aplicada DECIMAL(10,2),

    -- Endereco de entrega (embedded)
    endereco_logradouro VARCHAR(200),
    endereco_numero VARCHAR(20),
    endereco_bairro VARCHAR(100),
    endereco_cidade VARCHAR(100),
    endereco_uf VARCHAR(2),
    endereco_complemento VARCHAR(100),

    -- Pagamento (embedded)
    pagamento_status VARCHAR(30) NOT NULL DEFAULT 'nao_pago',
    pagamento_solicitado_em TIMESTAMP NULL,
    pagamento_aprovado_em TIMESTAMP NULL,
    pagamento_aprovado_por VARCHAR(100),
    pagamento_motivo_rejeicao VARCHAR(500),

    CONSTRAINT fk_rental_user FOREIGN KEY (usuario_id) REFERENCES users(id),
    CONSTRAINT fk_rental_bike FOREIGN KEY (bike_id) REFERENCES bikes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rental_invoices (
    id VARCHAR(50) PRIMARY KEY,
    rental_id BIGINT NOT NULL,
    data_vencimento TIMESTAMP NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status ENUM('pendente', 'aguardando_aprovacao', 'pago', 'rejeitado') NOT NULL DEFAULT 'pendente',
    pago_em TIMESTAMP NULL,
    CONSTRAINT fk_invoice_rental FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rental_renewals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rental_id BIGINT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    dias INT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    data_de TIMESTAMP NOT NULL,
    data_para TIMESTAMP NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_renewal_rental FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
