-- V12: Colunas de rota gerada para locações
-- Rota gerada via OSRM na primeira solicitação e salva aqui
ALTER TABLE rentals ADD rota_geojson        NVARCHAR(MAX)   NULL;
ALTER TABLE rentals ADD rota_distancia_km   DECIMAL(6,2)    NULL;
ALTER TABLE rentals ADD rota_duracao_min    INT             NULL;
ALTER TABLE rentals ADD rota_bairro_inicio  NVARCHAR(100)   NULL;
ALTER TABLE rentals ADD rota_bairro_fim     NVARCHAR(100)   NULL;
