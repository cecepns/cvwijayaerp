-- Migration: Kasbon Rokok
-- Date: 2026-06-15

CREATE TABLE IF NOT EXISTS cigarette_kasbon_items (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(255) NOT NULL,
  price         DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  stock         INT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cigarette_kasbon_transactions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  transaction_no  VARCHAR(50) NOT NULL,
  employee_id     BIGINT UNSIGNED NOT NULL,
  item_id         BIGINT UNSIGNED NOT NULL,
  transaction_date DATE NOT NULL,
  quantity        INT NOT NULL,
  unit_price      DECIMAL(18,2) NOT NULL,
  total           DECIMAL(18,2) NOT NULL,
  notes           TEXT NULL,
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cigarette_kasbon_trx (company_id, transaction_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (item_id) REFERENCES cigarette_kasbon_items(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;
