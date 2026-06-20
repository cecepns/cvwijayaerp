-- Migration: Permissions & Role Permissions
-- Sync dari backend/server.js (PERMISSIONS & ROLE_PERMISSIONS)
-- Aman dijalankan berulang (INSERT IGNORE)

-- ============================================================
-- 1. Master permissions
-- ============================================================

INSERT IGNORE INTO permissions (module, action, key_name) VALUES
('dashboard', 'view', 'dashboard.view'),
('settings', 'company.update', 'settings.company.update'),
('settings', 'coa.create', 'settings.coa.create'),
('settings', 'coa.update', 'settings.coa.update'),
('settings', 'coa.delete', 'settings.coa.delete'),
('settings', 'role.create', 'settings.role.create'),
('settings', 'role.update', 'settings.role.update'),
('settings', 'admin.view', 'settings.admin.view'),
('settings', 'admin.create', 'settings.admin.create'),
('settings', 'admin.update', 'settings.admin.update'),
('settings', 'admin.delete', 'settings.admin.delete'),
('master', 'employee', 'master.employee'),
('master', 'customer', 'master.customer'),
('master', 'supplier', 'master.supplier'),
('master', 'product', 'master.product'),
('inventory', 'receipt', 'inventory.receipt'),
('inventory', 'issue', 'inventory.issue'),
('inventory', 'opname', 'inventory.opname'),
('inventory', 'adjustment', 'inventory.adjustment'),
('sales', 'down_payment', 'sales.down_payment'),
('sales', 'invoice', 'sales.invoice'),
('sales', 'receipt', 'sales.receipt'),
('sales', 'report', 'sales.report'),
('purchase', 'down_payment', 'purchase.down_payment'),
('purchase', 'invoice', 'purchase.invoice'),
('purchase', 'payment', 'purchase.payment'),
('purchase', 'report', 'purchase.report'),
('cash', 'receipt', 'cash.receipt'),
('cash', 'payment', 'cash.payment'),
('cash', 'transfer', 'cash.transfer'),
('hrd', 'advance', 'hrd.advance'),
('hrd', 'kasbon_rokok', 'hrd.kasbon_rokok'),
('hrd', 'report', 'hrd.report'),
('audit', 'view', 'audit.view');

-- ============================================================
-- 2. Role permissions (per slug role sistem)
-- ============================================================

-- super_admin: semua permission
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'super_admin';

-- admin_gudang
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key_name IN (
  'dashboard.view',
  'master.product',
  'inventory.receipt',
  'inventory.issue',
  'inventory.opname',
  'inventory.adjustment'
)
WHERE r.slug = 'admin_gudang';

-- admin_penjualan
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key_name IN (
  'dashboard.view',
  'master.customer',
  'sales.down_payment',
  'sales.invoice',
  'sales.receipt',
  'sales.report'
)
WHERE r.slug = 'admin_penjualan';

-- admin_pembelian
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key_name IN (
  'dashboard.view',
  'master.supplier',
  'purchase.down_payment',
  'purchase.invoice',
  'purchase.payment',
  'purchase.report'
)
WHERE r.slug = 'admin_pembelian';

-- admin_keuangan
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key_name IN (
  'dashboard.view',
  'settings.coa.create',
  'settings.coa.update',
  'cash.receipt',
  'cash.payment',
  'cash.transfer',
  'sales.receipt',
  'purchase.payment',
  'hrd.advance',
  'hrd.kasbon_rokok',
  'hrd.report',
  'audit.view'
)
WHERE r.slug = 'admin_keuangan';

-- hrd
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key_name IN (
  'dashboard.view',
  'master.employee',
  'hrd.advance',
  'hrd.kasbon_rokok',
  'hrd.report'
)
WHERE r.slug = 'hrd';
