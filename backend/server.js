require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./cvwijaya/utils/db');

const authRoutes = require('./cvwijaya/routes/auth.routes');
const dashboardRoutes = require('./cvwijaya/routes/dashboard.routes');
const settingsRoutes = require('./cvwijaya/routes/settings.routes');
const masterRoutes = require('./cvwijaya/routes/master.routes');
const purchaseRoutes = require('./cvwijaya/routes/purchase.routes');
const salesRoutes = require('./cvwijaya/routes/sales.routes');
const inventoryRoutes = require('./cvwijaya/routes/inventory.routes');
const cashRoutes = require('./cvwijaya/routes/cash.routes');
const hrdRoutes = require('./cvwijaya/routes/hrd.routes');
const accountingRoutes = require('./cvwijaya/routes/accounting.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads-cvwijaya')));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'CV Wijaya ERP API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/hrd', hrdRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/notifications', accountingRoutes);
app.use('/api/audit-logs', accountingRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PERMISSIONS = [
  ['dashboard', 'view', 'dashboard.view'],
  ['settings', 'company.update', 'settings.company.update'],
  ['settings', 'coa.create', 'settings.coa.create'],
  ['settings', 'coa.update', 'settings.coa.update'],
  ['settings', 'coa.delete', 'settings.coa.delete'],
  ['settings', 'role.create', 'settings.role.create'],
  ['settings', 'role.update', 'settings.role.update'],
  ['settings', 'admin.view', 'settings.admin.view'],
  ['settings', 'admin.create', 'settings.admin.create'],
  ['settings', 'admin.update', 'settings.admin.update'],
  ['settings', 'admin.delete', 'settings.admin.delete'],
  ['master', 'employee', 'master.employee'],
  ['master', 'customer', 'master.customer'],
  ['master', 'supplier', 'master.supplier'],
  ['master', 'product', 'master.product'],
  ['inventory', 'receipt', 'inventory.receipt'],
  ['inventory', 'issue', 'inventory.issue'],
  ['inventory', 'opname', 'inventory.opname'],
  ['inventory', 'adjustment', 'inventory.adjustment'],
  ['sales', 'down_payment', 'sales.down_payment'],
  ['sales', 'invoice', 'sales.invoice'],
  ['sales', 'receipt', 'sales.receipt'],
  ['sales', 'report', 'sales.report'],
  ['purchase', 'down_payment', 'purchase.down_payment'],
  ['purchase', 'invoice', 'purchase.invoice'],
  ['purchase', 'payment', 'purchase.payment'],
  ['purchase', 'report', 'purchase.report'],
  ['cash', 'receipt', 'cash.receipt'],
  ['cash', 'payment', 'cash.payment'],
  ['cash', 'transfer', 'cash.transfer'],
  ['hrd', 'advance', 'hrd.advance'],
  ['hrd', 'kasbon_rokok', 'hrd.kasbon_rokok'],
  ['hrd', 'report', 'hrd.report'],
  ['audit', 'view', 'audit.view'],
];

const ROLE_PERMISSIONS = {
  super_admin: 'ALL',
  admin_gudang: ['dashboard.view', 'master.product', 'inventory.receipt', 'inventory.issue', 'inventory.opname', 'inventory.adjustment'],
  admin_penjualan: ['dashboard.view', 'master.customer', 'sales.down_payment', 'sales.invoice', 'sales.receipt', 'sales.report'],
  admin_pembelian: ['dashboard.view', 'master.supplier', 'purchase.down_payment', 'purchase.invoice', 'purchase.payment', 'purchase.report'],
  admin_keuangan: ['dashboard.view', 'settings.coa.create', 'settings.coa.update', 'cash.receipt', 'cash.payment', 'cash.transfer', 'sales.receipt', 'purchase.payment', 'hrd.advance', 'hrd.kasbon_rokok', 'hrd.report', 'audit.view'],
  hrd: ['dashboard.view', 'master.employee', 'hrd.advance', 'hrd.kasbon_rokok', 'hrd.report'],
};

async function seedDatabase() {
  try {
    const [companies] = await pool.query('SELECT id FROM companies LIMIT 1');
    if (companies.length) {
      const [admins] = await pool.query('SELECT id, password FROM admins WHERE email = ?', ['admin@cvwijaya.com']);
      if (admins.length) {
        const valid = await bcrypt.compare('admin123', admins[0].password).catch(() => false);
        if (!valid) {
          const hash = await bcrypt.hash('admin123', 10);
          await pool.query('UPDATE admins SET password=? WHERE id=?', [hash, admins[0].id]);
        }
      }
      return;
    }

    console.log('Seeding database...');
    const [comp] = await pool.query(
      `INSERT INTO companies (name, npwp, address, city, phone, email) VALUES (?, ?, ?, ?, ?, ?)`,
      ['CV Wijaya', '01.234.567.8-901.000', 'Jl. Industri Raya No. 10', 'Jakarta', '021-1234567', 'info@cvwijaya.com']
    );
    const companyId = comp.insertId;
    await pool.query('INSERT INTO company_preferences (company_id) VALUES (?)', [companyId]);

    for (const [module, action, key] of PERMISSIONS) {
      await pool.query('INSERT IGNORE INTO permissions (module, action, key_name) VALUES (?, ?, ?)', [module, action, key]);
    }

    const [allPerms] = await pool.query('SELECT id, key_name FROM permissions');
    const permMap = Object.fromEntries(allPerms.map((p) => [p.key_name, p.id]));

    const roles = [
      ['Super Admin', 'super_admin'],
      ['Admin Gudang', 'admin_gudang'],
      ['Admin Penjualan', 'admin_penjualan'],
      ['Admin Pembelian', 'admin_pembelian'],
      ['Admin Keuangan', 'admin_keuangan'],
      ['HRD', 'hrd'],
    ];

    const roleIds = {};
    for (const [name, slug] of roles) {
      const [r] = await pool.query(
        'INSERT INTO roles (company_id, name, slug, is_system) VALUES (?, ?, ?, 1)',
        [companyId, name, slug]
      );
      roleIds[slug] = r.insertId;

      const keys = ROLE_PERMISSIONS[slug] === 'ALL' ? allPerms.map((p) => p.key_name) : ROLE_PERMISSIONS[slug];
      for (const key of keys) {
        if (permMap[key]) {
          await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleIds[slug], permMap[key]]);
        }
      }
    }

    const coaData = [
      ['1-1001', 'Kas', 'asset', 'debit'],
      ['1-1002', 'Bank BCA', 'asset', 'debit'],
      ['1-2001', 'Piutang Dagang', 'asset', 'debit'],
      ['1-2002', 'Piutang Karyawan', 'asset', 'debit'],
      ['1-3001', 'Persediaan Barang', 'asset', 'debit'],
      ['1-4001', 'Uang Muka Pembelian', 'asset', 'debit'],
      ['2-1001', 'Hutang Dagang', 'liability', 'credit'],
      ['2-2001', 'Uang Muka Penjualan', 'liability', 'credit'],
      ['4-1001', 'Pendapatan Penjualan', 'revenue', 'credit'],
      ['5-1001', 'Harga Pokok Penjualan', 'expense', 'debit'],
      ['5-2001', 'Beban Selisih Stok', 'expense', 'debit'],
    ];
    const coaIds = {};
    for (const [code, name, type, balance] of coaData) {
      const [c] = await pool.query(
        'INSERT INTO chart_of_accounts (company_id, code, name, account_type, normal_balance) VALUES (?, ?, ?, ?, ?)',
        [companyId, code, name, type, balance]
      );
      coaIds[code] = c.insertId;
    }

    await pool.query('INSERT INTO cash_bank_accounts (company_id, coa_id, name, type, balance) VALUES (?, ?, ?, ?, ?)',
      [companyId, coaIds['1-1001'], 'Kas Utama', 'cash', 50000000]);
    await pool.query('INSERT INTO cash_bank_accounts (company_id, coa_id, name, type, balance) VALUES (?, ?, ?, ?, ?)',
      [companyId, coaIds['1-1002'], 'Bank BCA Operasional', 'bank', 150000000]);

    await pool.query('INSERT INTO warehouses (company_id, code, name, is_default) VALUES (?, ?, ?, 1)', [companyId, 'GDG-01', 'Gudang Utama']);
    await pool.query('INSERT INTO departments (company_id, name) VALUES (?, ?), (?, ?), (?, ?)',
      [companyId, 'Operasional', companyId, 'Keuangan', companyId, 'Gudang']);

    const hash = await bcrypt.hash('admin123', 10);
    await pool.query('INSERT INTO admins (company_id, role_id, name, email, password) VALUES (?, ?, ?, ?, ?)',
      [companyId, roleIds.super_admin, 'Super Administrator', 'admin@cvwijaya.com', hash]);

    console.log('Database seeded. Login: admin@cvwijaya.com / admin123');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

seedDatabase().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
