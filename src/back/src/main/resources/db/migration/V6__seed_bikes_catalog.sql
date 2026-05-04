-- Seed default bikes catalog
-- Passwords are hashed via CommandLineRunner (bcrypt cannot be done in SQL)

INSERT INTO bikes (nome, categoria, descricao, disponivel, bloqueada, removida, quantidade, quantidade_disponivel, preco_semanal, preco_quinzenal, preco_mensal, imagem) VALUES
('Pedala City Plus', 'Urbana', 'Ideal para o dia a dia na cidade. Confortavel, leve e pratica.', true, false, false, 4, 4, 89.90, 159.90, 279.90, '/assets/images/catalog/bike_city_plus.png'),
('Pedala MTB Pro', 'Mountain Bike', 'Robusta para trilhas e terrenos irregulares. Suspensao dianteira.', true, false, false, 3, 3, 129.90, 229.90, 399.90, '/assets/images/catalog/bike_mtb_pro.png'),
('Pedala Speed Carbon', 'Speed', 'Alta performance para ciclistas experientes. Leve e aerodinamica.', true, false, false, 2, 2, 149.90, 269.90, 469.90, '/assets/images/catalog/bike_speed_carbon.png'),
('Pedala Dobravel', 'Dobravel', 'Compacta e facil de transportar. Ideal para quem usa transporte publico.', true, false, false, 5, 5, 79.90, 139.90, 239.90, '/assets/images/catalog/bike_dobravel.png'),
('Pedala Electrica', 'Eletrica', 'Com motor auxiliar eletrico. Perfeita para percursos longos sem esforco.', true, false, false, 2, 2, 199.90, 369.90, 649.90, '/assets/images/catalog/bike_eletrica.png'),
('Pedala Infantil Kids', 'Infantil', 'Para criancas de 6 a 12 anos. Segura, colorida e divertida.', true, false, false, 6, 6, 59.90, 99.90, 169.90, '/assets/images/catalog/bike_infantil.png');
