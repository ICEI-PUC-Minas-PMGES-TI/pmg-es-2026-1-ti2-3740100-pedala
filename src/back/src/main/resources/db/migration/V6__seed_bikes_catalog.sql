-- V6: Seed do catálogo inicial de bicicletas (T-SQL - Azure SQL Server)
-- BIT usa 1/0 em vez de true/false do MySQL.
-- As categorias aqui devem corresponder às inseridas na tabela bike_categories (V8).

INSERT INTO bikes (nome, categoria, descricao, disponivel, bloqueada, removida, quantidade, quantidade_disponivel, preco_semanal, preco_quinzenal, preco_mensal, imagem)
VALUES
('Pedala City Plus',     'Urbana',        N'Ideal para o dia a dia na cidade. Confortavel, leve e pratica.',                   1, 0, 0, 4, 4, 89.90,  159.90, 279.90, '/assets/images/catalog/bike_city_plus.png'),
('Pedala MTB Pro',       'Mountain',      N'Robusta para trilhas e terrenos irregulares. Suspensao dianteira.',               1, 0, 0, 3, 3, 129.90, 229.90, 399.90, '/assets/images/catalog/bike_mtb_pro.png'),
('Pedala Speed Carbon',  'Speed',         N'Alta performance para ciclistas experientes. Leve e aerodinamica.',              1, 0, 0, 2, 2, 149.90, 269.90, 469.90, '/assets/images/catalog/bike_speed_carbon.png'),
('Pedala Dobravel',      'Dobravel',      N'Compacta e facil de transportar. Ideal para quem usa transporte publico.',       1, 0, 0, 5, 5, 79.90,  139.90, 239.90, '/assets/images/catalog/bike_dobravel.png'),
('Pedala Eletrica',      'Eletrica',      N'Com motor auxiliar eletrico. Perfeita para percursos longos sem esforco.',      1, 0, 0, 2, 2, 199.90, 369.90, 649.90, '/assets/images/catalog/bike_eletrica.png'),
('Pedala Infantil Kids', 'Infantil',      N'Para criancas de 6 a 12 anos. Segura, colorida e divertida.',                   1, 0, 0, 6, 6, 59.90,  99.90,  169.90, '/assets/images/catalog/bike_infantil.png');
