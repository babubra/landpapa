-- Добавление колонки type в таблицу settlements
ALTER TABLE settlements 
ADD COLUMN IF NOT EXISTS type VARCHAR(20);

-- На всякий случай проверим и sort_order, так как в модели он есть
ALTER TABLE settlements
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE districts
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
