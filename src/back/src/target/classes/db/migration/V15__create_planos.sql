-- V15: Planos de cobertura (manutenção/avaria) por bike
-- Substitui o sistema hardcoded de seguro por entidades configuráveis

CREATE TABLE planos (
    id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
    nome                NVARCHAR(100) NOT NULL,
    descricao           NVARCHAR(500),
    valor_adicional     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cobre_manutencao    BIT          NOT NULL DEFAULT 0,
    cobre_avaria        BIT          NOT NULL DEFAULT 0,
    cobre_duvida_fatura BIT          NOT NULL DEFAULT 1,
    cobre_outros        BIT          NOT NULL DEFAULT 0,
    ativo               BIT          NOT NULL DEFAULT 1,
    criado_em           DATETIME2    NOT NULL DEFAULT GETUTCDATE()
);

-- Seed: equivalentes aos 3 tiers hardcoded anteriores
INSERT INTO planos (nome, descricao, valor_adicional, cobre_manutencao, cobre_avaria, cobre_duvida_fatura, cobre_outros)
VALUES
('Básico',
 'Cobre apenas dúvidas sobre fatura. Incluso no preço base, sem custo adicional.',
 0.00, 0, 0, 1, 0),
('Intermediário',
 'Cobre manutenções preventivas e dúvidas sobre fatura. Danos leves adicionais cobertos.',
 15.00, 1, 0, 1, 0),
('Premium',
 'Cobertura completa: manutenção, avarias, furto e qualquer outro incidente.',
 30.00, 1, 1, 1, 1);

-- Tabela de relacionamento bike ↔ plano (N:N)
CREATE TABLE bike_planos (
    bike_id   BIGINT NOT NULL,
    plano_id  BIGINT NOT NULL,
    CONSTRAINT pk_bike_planos  PRIMARY KEY (bike_id, plano_id),
    CONSTRAINT fk_bp_bike      FOREIGN KEY (bike_id)  REFERENCES bikes(id),
    CONSTRAINT fk_bp_plano     FOREIGN KEY (plano_id) REFERENCES planos(id)
);

-- Atribuir os 3 planos iniciais a todas as bikes existentes (não removidas)
INSERT INTO bike_planos (bike_id, plano_id)
SELECT b.id, p.id
FROM bikes b
CROSS JOIN planos p
WHERE b.removida = 0;

-- Adicionar FK de plano na tabela de locações (nullable para compatibilidade retroativa)
ALTER TABLE rentals ADD plano_id BIGINT NULL;
ALTER TABLE rentals ADD CONSTRAINT fk_rental_plano FOREIGN KEY (plano_id) REFERENCES planos(id);
