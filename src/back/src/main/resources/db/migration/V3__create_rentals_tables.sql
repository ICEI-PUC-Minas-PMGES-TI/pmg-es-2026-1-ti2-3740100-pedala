-- V3: Tabelas de locações, faturas e renovações (T-SQL - Azure SQL Server)
-- ENUM do MySQL é substituído por NVARCHAR + CHECK CONSTRAINT.
CREATE TABLE rentals (
    id                        BIGINT IDENTITY(1,1) PRIMARY KEY,
    usuario_id                BIGINT          NOT NULL,
    usuario_nome              NVARCHAR(100)   NOT NULL,
    usuario_email             NVARCHAR(150),
    bike_id                   BIGINT          NOT NULL,
    bike_nome                 NVARCHAR(100)   NOT NULL,
    bike_categoria            NVARCHAR(50),
    tipo                      NVARCHAR(20)    NOT NULL
                                  CONSTRAINT ck_rental_tipo CHECK (tipo IN ('semanal','quinzenal','mensal')),
    plano_label               NVARCHAR(100),
    ciclos_recorrencia        INT             NOT NULL DEFAULT 1,
    preco                     DECIMAL(10,2)   NOT NULL,
    status                    NVARCHAR(30)    NOT NULL DEFAULT 'aguardando_locacao'
                                  CONSTRAINT ck_rental_status CHECK (status IN ('agendada','aguardando_locacao','ativo','aguardando_vistoria','finalizado')),
    data_inicio               DATETIME2       NOT NULL,
    data_devolucao_prevista   DATETIME2       NOT NULL,
    criado_em                 DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    ativado_em                DATETIME2,
    devolvido_em              DATETIME2,
    finalizado_em             DATETIME2,
    devolucao_antecipada      BIT             DEFAULT 0,
    dias_nao_utilizados       INT,
    valor_nao_utilizado       DECIMAL(10,2),
    multa_aplicada            DECIMAL(10,2),
    tipo_seguro               NVARCHAR(50),
    valor_seguro              DECIMAL(10,2)   DEFAULT 0,
    alerta_desvio             BIT             NOT NULL DEFAULT 0,

    -- Endereço de entrega (embedded — mantido por compatibilidade)
    endereco_logradouro       NVARCHAR(200),
    endereco_numero           NVARCHAR(20),
    endereco_bairro           NVARCHAR(100),
    endereco_cidade           NVARCHAR(100),
    endereco_uf               NVARCHAR(2),
    endereco_complemento      NVARCHAR(100),

    -- Pagamento (embedded)
    pagamento_status          NVARCHAR(30)    NOT NULL DEFAULT 'nao_pago',
    pagamento_solicitado_em   DATETIME2,
    pagamento_aprovado_em     DATETIME2,
    pagamento_aprovado_por    NVARCHAR(100),
    pagamento_motivo_rejeicao NVARCHAR(500),

    CONSTRAINT fk_rental_user FOREIGN KEY (usuario_id) REFERENCES users(id),
    CONSTRAINT fk_rental_bike FOREIGN KEY (bike_id)    REFERENCES bikes(id)
);

CREATE TABLE rental_invoices (
    id              NVARCHAR(50)    PRIMARY KEY,
    rental_id       BIGINT          NOT NULL,
    data_vencimento DATETIME2       NOT NULL,
    valor           DECIMAL(10,2)   NOT NULL,
    status          NVARCHAR(30)    NOT NULL DEFAULT 'pendente'
                        CONSTRAINT ck_invoice_status CHECK (status IN ('pendente','aguardando_aprovacao','pago','rejeitado')),
    pago_em         DATETIME2,
    CONSTRAINT fk_invoice_rental FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE
);

CREATE TABLE rental_renewals (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    rental_id   BIGINT          NOT NULL,
    tipo        NVARCHAR(20)    NOT NULL,
    dias        INT             NOT NULL,
    preco       DECIMAL(10,2)   NOT NULL,
    data_de     DATETIME2       NOT NULL,
    data_para   DATETIME2       NOT NULL,
    criado_em   DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_renewal_rental FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE
);
