-- Добавление колонки fias_id в таблицу districts
ALTER TABLE districts 
ADD COLUMN IF NOT EXISTS fias_id VARCHAR(36);

-- Создание уникального индекса для fias_id в districts
CREATE UNIQUE INDEX IF NOT EXISTS ix_districts_fias_id 
ON districts(fias_id) 
WHERE fias_id IS NOT NULL;

-- Добавление колонки fias_id в таблицу settlements
ALTER TABLE settlements 
ADD COLUMN IF NOT EXISTS fias_id VARCHAR(36);

-- Создание уникального индекса для fias_id в settlements
CREATE UNIQUE INDEX IF NOT EXISTS ix_settlements_fias_id 
ON settlements(fias_id) 
WHERE fias_id IS NOT NULL;
