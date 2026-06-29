-- ============================================================
-- CV WIJAYA ERP - Database Schema
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS cvwijaya_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cvwijaya_erp;

-- ============================================================
-- A. SISTEM & PENGATURAN
-- ============================================================

CREATE TABLE companies (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  npwp          VARCHAR(30) NULL,
  address       TEXT NULL,
  city          VARCHAR(100) NULL,
  province      VARCHAR(100) NULL,
  postal_code   VARCHAR(10) NULL,
  phone         VARCHAR(30) NULL,
  email         VARCHAR(150) NULL,
  website       VARCHAR(255) NULL,
  logo          VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE company_preferences (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id            BIGINT UNSIGNED NOT NULL,
  currency              VARCHAR(10) NOT NULL DEFAULT 'IDR',
  tax_rate              DECIMAL(5,2) NOT NULL DEFAULT 11.00,
  fiscal_year_start     TINYINT NOT NULL DEFAULT 1,
  document_prefix_sales VARCHAR(10) DEFAULT 'PJ',
  document_prefix_purchase VARCHAR(10) DEFAULT 'PB',
  document_prefix_journal VARCHAR(10) DEFAULT 'JRN',
  period_lock_date      DATE NULL,
  advance_approval_limit DECIMAL(18,2) DEFAULT 5000000.00,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE roles (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  description TEXT NULL,
  is_system   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  UNIQUE KEY uk_roles_slug (company_id, slug),
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  module      VARCHAR(50) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  key_name    VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_role_perm (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE admins (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  role_id       BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  password      VARCHAR(255) NOT NULL,
  phone         VARCHAR(30) NULL,
  avatar        VARCHAR(255) NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  UNIQUE KEY uk_admins_email (company_id, email),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id     BIGINT UNSIGNED NOT NULL,
  admin_id       BIGINT UNSIGNED NULL,
  action         ENUM('create','update','delete','post','approve','reject','login','logout') NOT NULL,
  module         VARCHAR(50) NOT NULL,
  reference_type VARCHAR(100) NULL,
  reference_id   BIGINT UNSIGNED NULL,
  old_values     JSON NULL,
  new_values     JSON NULL,
  ip_address     VARCHAR(45) NULL,
  user_agent     TEXT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_module (module, created_at),
  INDEX idx_audit_ref (reference_type, reference_id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (admin_id) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id     BIGINT UNSIGNED NOT NULL,
  admin_id       BIGINT UNSIGNED NOT NULL,
  type           VARCHAR(50) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  message        TEXT NOT NULL,
  reference_type VARCHAR(100) NULL,
  reference_id   BIGINT UNSIGNED NULL,
  is_read        TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_admin (admin_id, is_read, created_at),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (admin_id) REFERENCES admins(id)
) ENGINE=InnoDB;

-- ============================================================
-- B. AKUNTANSI
-- ============================================================

CREATE TABLE chart_of_accounts (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id  BIGINT UNSIGNED NOT NULL,
  parent_id   BIGINT UNSIGNED NULL,
  code        VARCHAR(20) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  account_type ENUM('asset','liability','equity','revenue','expense') NOT NULL,
  normal_balance ENUM('debit','credit') NOT NULL,
  is_header   TINYINT(1) NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  description TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  UNIQUE KEY uk_coa_code (company_id, code),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id)
) ENGINE=InnoDB;

CREATE TABLE cash_bank_accounts (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id  BIGINT UNSIGNED NOT NULL,
  coa_id      BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(150) NOT NULL,
  account_no  VARCHAR(50) NULL,
  bank_name   VARCHAR(100) NULL,
  type        ENUM('cash','bank') NOT NULL DEFAULT 'cash',
  balance     DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id)
) ENGINE=InnoDB;

CREATE TABLE journal_entries (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id     BIGINT UNSIGNED NOT NULL,
  journal_no     VARCHAR(50) NOT NULL,
  journal_date   DATE NOT NULL,
  reference_type VARCHAR(100) NULL,
  reference_id   BIGINT UNSIGNED NULL,
  description    TEXT NULL,
  total_debit    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  total_credit   DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  status         ENUM('draft','posted','reversed') NOT NULL DEFAULT 'posted',
  created_by     BIGINT UNSIGNED NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_journal_no (company_id, journal_no),
  UNIQUE KEY uk_journal_ref (company_id, reference_type, reference_id),
  INDEX idx_journal_date (journal_date),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE journal_entry_lines (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  journal_entry_id BIGINT UNSIGNED NOT NULL,
  coa_id           BIGINT UNSIGNED NOT NULL,
  description      VARCHAR(255) NULL,
  debit            DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  credit           DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id)
) ENGINE=InnoDB;

-- ============================================================
-- C. MASTER DATA
-- ============================================================

CREATE TABLE departments (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE employees (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  department_id   BIGINT UNSIGNED NULL,
  employee_code   VARCHAR(30) NOT NULL,
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(150) NULL,
  phone           VARCHAR(30) NULL,
  position        VARCHAR(100) NULL,
  hire_date       DATE NULL,
  salary          DECIMAL(18,2) NULL,
  address         TEXT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  UNIQUE KEY uk_employee_code (company_id, employee_code),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  code          VARCHAR(30) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  contact_person VARCHAR(150) NULL,
  email         VARCHAR(150) NULL,
  phone         VARCHAR(30) NULL,
  address       TEXT NULL,
  npwp          VARCHAR(30) NULL,
  payment_term  INT NOT NULL DEFAULT 30,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  UNIQUE KEY uk_supplier_code (company_id, code),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE customers (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  code          VARCHAR(30) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  contact_person VARCHAR(150) NULL,
  email         VARCHAR(150) NULL,
  phone         VARCHAR(30) NULL,
  address       TEXT NULL,
  npwp          VARCHAR(30) NULL,
  credit_limit  DECIMAL(18,2) DEFAULT 0.00,
  payment_term  INT NOT NULL DEFAULT 30,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  UNIQUE KEY uk_customer_code (company_id, code),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE warehouses (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id  BIGINT UNSIGNED NOT NULL,
  code        VARCHAR(20) NOT NULL,
  name        VARCHAR(150) NOT NULL,
  address     TEXT NULL,
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  UNIQUE KEY uk_warehouse_code (company_id, code),
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

CREATE TABLE products (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id        BIGINT UNSIGNED NOT NULL,
  sku               VARCHAR(50) NOT NULL,
  barcode           VARCHAR(50) NULL,
  name              VARCHAR(255) NOT NULL,
  type              ENUM('goods','service') NOT NULL DEFAULT 'goods',
  category          VARCHAR(100) NULL,
  default_warehouse_id BIGINT UNSIGNED NULL,
  unit              VARCHAR(30) NOT NULL DEFAULT 'pcs',
  purchase_price    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  selling_price     DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  min_stock         INT NOT NULL DEFAULT 0,
  coa_inventory_id  BIGINT UNSIGNED NULL,
  coa_cogs_id       BIGINT UNSIGNED NULL,
  coa_revenue_id    BIGINT UNSIGNED NULL,
  image             VARCHAR(255) NULL,
  description       TEXT NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  created_by        BIGINT UNSIGNED NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME NULL,
  UNIQUE KEY uk_product_sku (company_id, sku),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (default_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (coa_inventory_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (coa_cogs_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (coa_revenue_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE product_stocks (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED NOT NULL,
  warehouse_id  BIGINT UNSIGNED NOT NULL,
  quantity      DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  avg_cost      DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_stock (product_id, warehouse_id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB;

-- ============================================================
-- D. PEMBELIAN
-- ============================================================

CREATE TABLE purchase_down_payments (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id        BIGINT UNSIGNED NOT NULL,
  dp_no             VARCHAR(50) NOT NULL,
  supplier_id       BIGINT UNSIGNED NOT NULL,
  dp_date           DATE NOT NULL,
  amount            DECIMAL(18,2) NOT NULL,
  cash_bank_id      BIGINT UNSIGNED NOT NULL,
  notes             TEXT NULL,
  status            ENUM('draft','posted','applied','cancelled') NOT NULL DEFAULT 'draft',
  created_by        BIGINT UNSIGNED NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_purchase_dp_no (company_id, dp_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (cash_bank_id) REFERENCES cash_bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_invoices (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  invoice_no      VARCHAR(50) NOT NULL,
  supplier_id     BIGINT UNSIGNED NOT NULL,
  supplier_invoice_no VARCHAR(50) NULL,
  invoice_date    DATE NOT NULL,
  due_date        DATE NOT NULL,
  warehouse_id    BIGINT UNSIGNED NOT NULL,
  subtotal        DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  discount        DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  tax_amount      DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  total           DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  paid_amount     DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  dp_amount       DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  notes           TEXT NULL,
  status          ENUM('draft','posted','partial','paid','cancelled') NOT NULL DEFAULT 'draft',
  created_by      BIGINT UNSIGNED NULL,
  posted_at       DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_purchase_inv_no (company_id, invoice_no),
  INDEX idx_purchase_inv_status (status, due_date),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_invoice_items (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_invoice_id BIGINT UNSIGNED NOT NULL,
  product_id          BIGINT UNSIGNED NOT NULL,
  quantity            DECIMAL(18,4) NOT NULL,
  unit_price          DECIMAL(18,4) NOT NULL,
  discount            DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  tax_amount          DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  subtotal            DECIMAL(18,2) NOT NULL,
  received_qty        DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_payments (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  payment_no      VARCHAR(50) NOT NULL,
  supplier_id     BIGINT UNSIGNED NOT NULL,
  payment_date    DATE NOT NULL,
  cash_bank_id    BIGINT UNSIGNED NOT NULL,
  amount          DECIMAL(18,2) NOT NULL,
  notes           TEXT NULL,
  status          ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_purchase_pay_no (company_id, payment_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (cash_bank_id) REFERENCES cash_bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_payment_allocations (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_payment_id BIGINT UNSIGNED NOT NULL,
  purchase_invoice_id BIGINT UNSIGNED NOT NULL,
  amount              DECIMAL(18,2) NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_payment_id) REFERENCES purchase_payments(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id)
) ENGINE=InnoDB;

-- ============================================================
-- E. PENJUALAN
-- ============================================================

CREATE TABLE sales_down_payments (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  dp_no         VARCHAR(50) NOT NULL,
  customer_id   BIGINT UNSIGNED NOT NULL,
  dp_date       DATE NOT NULL,
  amount        DECIMAL(18,2) NOT NULL,
  cash_bank_id  BIGINT UNSIGNED NOT NULL,
  notes         TEXT NULL,
  status        ENUM('draft','posted','applied','cancelled') NOT NULL DEFAULT 'draft',
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sales_dp_no (company_id, dp_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (cash_bank_id) REFERENCES cash_bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE sales_invoices (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  invoice_no      VARCHAR(50) NOT NULL,
  customer_id     BIGINT UNSIGNED NOT NULL,
  invoice_date    DATE NOT NULL,
  due_date        DATE NOT NULL,
  warehouse_id    BIGINT UNSIGNED NOT NULL,
  subtotal        DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  discount        DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  tax_amount      DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  total           DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  paid_amount     DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  dp_amount       DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  notes           TEXT NULL,
  status          ENUM('draft','posted','partial','paid','cancelled') NOT NULL DEFAULT 'draft',
  created_by      BIGINT UNSIGNED NULL,
  posted_at       DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sales_inv_no (company_id, invoice_no),
  INDEX idx_sales_inv_status (status, due_date),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE sales_invoice_items (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sales_invoice_id BIGINT UNSIGNED NOT NULL,
  product_id       BIGINT UNSIGNED NOT NULL,
  quantity         DECIMAL(18,4) NOT NULL,
  unit_price       DECIMAL(18,4) NOT NULL,
  discount         DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  tax_amount       DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  subtotal         DECIMAL(18,2) NOT NULL,
  issued_qty       DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE sales_receipts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  receipt_no    VARCHAR(50) NOT NULL,
  customer_id   BIGINT UNSIGNED NOT NULL,
  receipt_date  DATE NOT NULL,
  cash_bank_id  BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(18,2) NOT NULL,
  notes         TEXT NULL,
  status        ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sales_receipt_no (company_id, receipt_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (cash_bank_id) REFERENCES cash_bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE sales_receipt_allocations (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sales_receipt_id BIGINT UNSIGNED NOT NULL,
  sales_invoice_id BIGINT UNSIGNED NOT NULL,
  amount           DECIMAL(18,2) NOT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_receipt_id) REFERENCES sales_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id)
) ENGINE=InnoDB;

-- ============================================================
-- F. INVENTORY
-- ============================================================

CREATE TABLE goods_receipts (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id          BIGINT UNSIGNED NOT NULL,
  receipt_no          VARCHAR(50) NOT NULL,
  purchase_invoice_id BIGINT UNSIGNED NULL,
  warehouse_id        BIGINT UNSIGNED NOT NULL,
  receipt_date        DATE NOT NULL,
  notes               TEXT NULL,
  status              ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  created_by          BIGINT UNSIGNED NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_goods_receipt_no (company_id, receipt_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE goods_receipt_items (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  goods_receipt_id BIGINT UNSIGNED NOT NULL,
  product_id       BIGINT UNSIGNED NOT NULL,
  quantity         DECIMAL(18,4) NOT NULL,
  unit_cost        DECIMAL(18,4) NOT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE goods_issues (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id       BIGINT UNSIGNED NOT NULL,
  issue_no         VARCHAR(50) NOT NULL,
  sales_invoice_id BIGINT UNSIGNED NULL,
  warehouse_id     BIGINT UNSIGNED NOT NULL,
  issue_date       DATE NOT NULL,
  notes            TEXT NULL,
  status           ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  created_by       BIGINT UNSIGNED NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_goods_issue_no (company_id, issue_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE goods_issue_items (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  goods_issue_id BIGINT UNSIGNED NOT NULL,
  product_id     BIGINT UNSIGNED NOT NULL,
  quantity       DECIMAL(18,4) NOT NULL,
  unit_cost      DECIMAL(18,4) NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goods_issue_id) REFERENCES goods_issues(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id     BIGINT UNSIGNED NOT NULL,
  product_id     BIGINT UNSIGNED NOT NULL,
  warehouse_id   BIGINT UNSIGNED NOT NULL,
  movement_type  ENUM('in','out','adjustment','opname') NOT NULL,
  reference_type VARCHAR(100) NOT NULL,
  reference_id   BIGINT UNSIGNED NOT NULL,
  quantity       DECIMAL(18,4) NOT NULL,
  unit_cost      DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  balance_after  DECIMAL(18,4) NOT NULL,
  movement_date  DATE NOT NULL,
  created_by     BIGINT UNSIGNED NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_mov_product (product_id, warehouse_id, movement_date),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE stock_opnames (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id   BIGINT UNSIGNED NOT NULL,
  opname_no    VARCHAR(50) NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  opname_date  DATE NOT NULL,
  notes        TEXT NULL,
  status       ENUM('draft','in_progress','completed','cancelled') NOT NULL DEFAULT 'draft',
  created_by   BIGINT UNSIGNED NULL,
  completed_at DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_opname_no (company_id, opname_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE stock_opname_items (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stock_opname_id BIGINT UNSIGNED NOT NULL,
  product_id      BIGINT UNSIGNED NOT NULL,
  system_qty      DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  physical_qty    DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  difference_qty  DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  unit_cost       DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_opname_id) REFERENCES stock_opnames(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE stock_adjustments (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  adjustment_no   VARCHAR(50) NOT NULL,
  stock_opname_id BIGINT UNSIGNED NULL,
  warehouse_id    BIGINT UNSIGNED NOT NULL,
  adjustment_date DATE NOT NULL,
  notes           TEXT NULL,
  status          ENUM('draft','pending','approved','posted','rejected') NOT NULL DEFAULT 'draft',
  approved_by     BIGINT UNSIGNED NULL,
  approved_at     DATETIME NULL,
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_adjustment_no (company_id, adjustment_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (stock_opname_id) REFERENCES stock_opnames(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (approved_by) REFERENCES admins(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE stock_adjustment_items (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stock_adjustment_id BIGINT UNSIGNED NOT NULL,
  product_id          BIGINT UNSIGNED NOT NULL,
  difference_qty      DECIMAL(18,4) NOT NULL,
  unit_cost           DECIMAL(18,4) NOT NULL,
  subtotal            DECIMAL(18,2) NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_adjustment_id) REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ============================================================
-- G. KAS & BANK
-- ============================================================

CREATE TABLE cash_receipts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  receipt_no    VARCHAR(50) NOT NULL,
  cash_bank_id  BIGINT UNSIGNED NOT NULL,
  coa_id        BIGINT UNSIGNED NOT NULL,
  receipt_date  DATE NOT NULL,
  amount        DECIMAL(18,2) NOT NULL,
  description   TEXT NULL,
  status        ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cash_receipt_no (company_id, receipt_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (cash_bank_id) REFERENCES cash_bank_accounts(id),
  FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE cash_payments (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  payment_no    VARCHAR(50) NOT NULL,
  cash_bank_id  BIGINT UNSIGNED NOT NULL,
  coa_id        BIGINT UNSIGNED NOT NULL,
  payment_date  DATE NOT NULL,
  amount        DECIMAL(18,2) NOT NULL,
  description   TEXT NULL,
  status        ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cash_payment_no (company_id, payment_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (cash_bank_id) REFERENCES cash_bank_accounts(id),
  FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE cash_transfers (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  transfer_no     VARCHAR(50) NOT NULL,
  from_account_id BIGINT UNSIGNED NOT NULL,
  to_account_id   BIGINT UNSIGNED NOT NULL,
  transfer_date   DATE NOT NULL,
  amount          DECIMAL(18,2) NOT NULL,
  description     TEXT NULL,
  status          ENUM('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_transfer_no (company_id, transfer_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (from_account_id) REFERENCES cash_bank_accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES cash_bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

-- ============================================================
-- H. HRD - KASBON
-- ============================================================

CREATE TABLE employee_advances (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  advance_no    VARCHAR(50) NOT NULL,
  employee_id   BIGINT UNSIGNED NOT NULL,
  request_date  DATE NOT NULL,
  amount        DECIMAL(18,2) NOT NULL,
  paid_amount   DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  purpose       TEXT NULL,
  status        ENUM('draft','pending','approved','rejected','disbursed','partial','paid') NOT NULL DEFAULT 'draft',
  approved_by   BIGINT UNSIGNED NULL,
  approved_at   DATETIME NULL,
  disbursed_at  DATETIME NULL,
  cash_bank_id  BIGINT UNSIGNED NULL,
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_advance_no (company_id, advance_no),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (approved_by) REFERENCES admins(id),
  FOREIGN KEY (cash_bank_id) REFERENCES cash_bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE employee_advance_payments (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_advance_id BIGINT UNSIGNED NOT NULL,
  payment_date        DATE NOT NULL,
  amount              DECIMAL(18,2) NOT NULL,
  payment_method      ENUM('cash','salary_deduction') NOT NULL DEFAULT 'cash',
  cash_bank_id        BIGINT UNSIGNED NULL,
  notes               TEXT NULL,
  created_by          BIGINT UNSIGNED NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_advance_id) REFERENCES employee_advances(id) ON DELETE CASCADE,
  FOREIGN KEY (cash_bank_id) REFERENCES cash_bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

CREATE TABLE cigarette_kasbon_items (
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

CREATE TABLE cigarette_kasbon_transactions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  transaction_no  VARCHAR(50) NOT NULL,
  employee_id     BIGINT UNSIGNED NOT NULL,
  item_id         BIGINT UNSIGNED NOT NULL,
  transaction_date DATE NOT NULL,
  category        ENUM('mingguan','bulanan') NOT NULL DEFAULT 'mingguan',
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

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO companies (name, npwp, address, city, phone, email) VALUES
('CV Wijaya', '01.234.567.8-901.000', 'Jl. Industri Raya No. 10', 'Jakarta', '021-1234567', 'info@cvwijaya.com');

INSERT INTO company_preferences (company_id, currency, tax_rate) VALUES (1, 'IDR', 11.00);

INSERT INTO roles (company_id, name, slug, is_system) VALUES
(1, 'Super Admin', 'super_admin', 1),
(1, 'Admin Gudang', 'admin_gudang', 1),
(1, 'Admin Penjualan', 'admin_penjualan', 1),
(1, 'Admin Pembelian', 'admin_pembelian', 1),
(1, 'Admin Keuangan', 'admin_keuangan', 1),
(1, 'HRD', 'hrd', 1);

INSERT INTO chart_of_accounts (company_id, code, name, account_type, normal_balance) VALUES
(1, '1-1001', 'Kas', 'asset', 'debit'),
(1, '1-1002', 'Bank BCA', 'asset', 'debit'),
(1, '1-2001', 'Piutang Dagang', 'asset', 'debit'),
(1, '1-2002', 'Piutang Karyawan', 'asset', 'debit'),
(1, '1-3001', 'Persediaan Barang', 'asset', 'debit'),
(1, '1-4001', 'Uang Muka Pembelian', 'asset', 'debit'),
(1, '2-1001', 'Hutang Dagang', 'liability', 'credit'),
(1, '2-2001', 'Uang Muka Penjualan', 'liability', 'credit'),
(1, '4-1001', 'Pendapatan Penjualan', 'revenue', 'credit'),
(1, '5-1001', 'Harga Pokok Penjualan', 'expense', 'debit'),
(1, '5-2001', 'Beban Selisih Stok', 'expense', 'debit');

INSERT INTO cash_bank_accounts (company_id, coa_id, name, type, balance) VALUES
(1, 1, 'Kas Utama', 'cash', 50000000.00),
(1, 2, 'Bank BCA Operasional', 'bank', 150000000.00);

INSERT INTO warehouses (company_id, code, name, is_default) VALUES
(1, 'GDG-01', 'Gudang Utama', 1);

INSERT INTO departments (company_id, name) VALUES
(1, 'Operasional'),
(1, 'Keuangan'),
(1, 'Gudang');

-- Password: admin123 (bcrypt hash placeholder - ganti saat production)
INSERT INTO admins (company_id, role_id, name, email, password) VALUES
(1, 1, 'Super Administrator', 'admin@cvwijaya.com', '$2b$10$placeholder_hash_ganti_saat_setup');
