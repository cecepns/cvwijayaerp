-- Migration: Client revisions (product category/warehouse, kasbon category)
-- Date: 2026-06-29

ALTER TABLE products
  ADD COLUMN category VARCHAR(100) NULL AFTER type,
  ADD COLUMN default_warehouse_id BIGINT UNSIGNED NULL AFTER category,
  ADD CONSTRAINT fk_products_default_warehouse FOREIGN KEY (default_warehouse_id) REFERENCES warehouses(id);

ALTER TABLE cigarette_kasbon_transactions
  ADD COLUMN category ENUM('mingguan','bulanan') NOT NULL DEFAULT 'mingguan' AFTER transaction_date;
