CREATE TABLE support_tickets (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    rental_id       BIGINT         NOT NULL REFERENCES rentals(id),
    usuario_id      BIGINT         NOT NULL REFERENCES users(id),
    usuario_nome    NVARCHAR(100),
    tipo            NVARCHAR(50)   NOT NULL,
    descricao       NVARCHAR(1000) NOT NULL,
    status          NVARCHAR(30)   NOT NULL DEFAULT 'aberto',
    prioridade      NVARCHAR(20)   NOT NULL DEFAULT 'normal',
    funcionario_id  BIGINT         REFERENCES users(id),
    funcionario_nome NVARCHAR(100),
    resolucao       NVARCHAR(2000),
    coberto_plano   BIT            NOT NULL DEFAULT 0,
    custo_gerado    DECIMAL(10,2),
    fatura_id       NVARCHAR(50)   REFERENCES rental_invoices(id),
    criado_em       DATETIME2      NOT NULL DEFAULT GETDATE(),
    atualizado_em   DATETIME2      NOT NULL DEFAULT GETDATE()
);
CREATE INDEX idx_st_rental   ON support_tickets(rental_id);
CREATE INDEX idx_st_usuario  ON support_tickets(usuario_id);
CREATE INDEX idx_st_status   ON support_tickets(status);
