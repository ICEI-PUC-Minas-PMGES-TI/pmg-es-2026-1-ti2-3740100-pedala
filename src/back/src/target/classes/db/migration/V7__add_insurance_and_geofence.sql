-- V7: Seguro e geofencing — colunas já incluídas em V3 para SQL Server.
-- Esta migration existe apenas para manter a numeração e compatibilidade de histórico.
-- As colunas tipo_seguro, valor_seguro e alerta_desvio foram inseridas diretamente na
-- instrução CREATE TABLE rentals (V3), que é a melhor prática em SQL Server
-- (ALTER TABLE ADD COLUMN com DEFAULT não aplicava DEFAULT em linhas existentes no MySQL legado).
SELECT 1 AS migration_applied;
