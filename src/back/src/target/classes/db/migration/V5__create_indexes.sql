-- Indexes for performance on frequently queried columns

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_bikes_categoria ON bikes(categoria);
CREATE INDEX idx_bikes_disponivel ON bikes(disponivel);
CREATE INDEX idx_bikes_removida ON bikes(removida);

CREATE INDEX idx_rentals_usuario_id ON rentals(usuario_id);
CREATE INDEX idx_rentals_bike_id ON rentals(bike_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_pagamento_status ON rentals(pagamento_status);

CREATE INDEX idx_invoices_rental_id ON rental_invoices(rental_id);
CREATE INDEX idx_invoices_status ON rental_invoices(status);

CREATE INDEX idx_renewals_rental_id ON rental_renewals(rental_id);

CREATE INDEX idx_inspections_aluguel_id ON inspections(aluguel_id);
CREATE INDEX idx_inspections_status ON inspections(status);
