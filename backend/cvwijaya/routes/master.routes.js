const express = require('express');
const pool = require('../utils/db');
const { success, paginated, error } = require('../utils/response');
const { auth, checkPermission } = require('../middleware/auth');
const { getPagination, buildSearchWhere, sanitize } = require('../utils/helpers');

const router = express.Router();

const crudList = async (req, res, table, fields, joins = '', extraWhere = '') => {
  const { page, limit, offset, search, sort, order } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(fields, search);
  const cid = req.user.company_id;
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM ${table} t ${joins} WHERE t.company_id = ? AND t.deleted_at IS NULL${extraWhere}${clause}`,
    [cid, ...params]
  );
  const [rows] = await pool.query(
    `SELECT t.* ${joins ? ', d.name AS department_name' : ''} FROM ${table} t ${joins}
     WHERE t.company_id = ? AND t.deleted_at IS NULL${extraWhere}${clause}
     ORDER BY t.${sort} ${order} LIMIT ? OFFSET ?`,
    [cid, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
};

// Employees
router.get('/employees', auth, (req, res) =>
  crudList(req, res, 'employees', ['t.employee_code', 't.name', 't.email'], 'LEFT JOIN departments d ON d.id = t.department_id')
);

router.post('/employees', auth, async (req, res) => {
  try {
    const { employee_code, name, email, phone, position, department_id, hire_date, salary, address } = req.body;
    if (!employee_code || !name) return error(res, 'Kode dan nama wajib diisi');
    const [r] = await pool.query(
      `INSERT INTO employees (company_id, department_id, employee_code, name, email, phone, position, hire_date, salary, address, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.company_id, department_id, sanitize(employee_code), sanitize(name), sanitize(email),
        sanitize(phone), sanitize(position), hire_date, salary, address, req.user.id]
    );
    return success(res, { id: r.insertId }, 'Karyawan berhasil ditambahkan', 201);
  } catch (err) { return error(res, err.message, 500); }
});

router.put('/employees/:id', auth, async (req, res) => {
  const b = req.body;
  await pool.query(
    `UPDATE employees SET department_id=?, employee_code=?, name=?, email=?, phone=?, position=?, hire_date=?, salary=?, address=?, is_active=? WHERE id=? AND company_id=?`,
    [b.department_id, sanitize(b.employee_code), sanitize(b.name), sanitize(b.email), sanitize(b.phone),
      sanitize(b.position), b.hire_date, b.salary, b.address, b.is_active ? 1 : 0, req.params.id, req.user.company_id]
  );
  return success(res, null, 'Karyawan berhasil diperbarui');
});

router.delete('/employees/:id', auth, async (req, res) => {
  await pool.query('UPDATE employees SET deleted_at=NOW() WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
  return success(res, null, 'Karyawan berhasil dihapus');
});

// Customers
router.get('/customers', auth, (req, res) => crudList(req, res, 'customers', ['t.code', 't.name', 't.email']));

router.post('/customers', auth, async (req, res) => {
  const b = req.body;
  if (!b.code || !b.name) return error(res, 'Kode dan nama wajib diisi');
  const [r] = await pool.query(
    `INSERT INTO customers (company_id, code, name, contact_person, email, phone, address, npwp, credit_limit, payment_term, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.company_id, sanitize(b.code), sanitize(b.name), sanitize(b.contact_person), sanitize(b.email),
      sanitize(b.phone), b.address, sanitize(b.npwp), b.credit_limit || 0, b.payment_term || 30, req.user.id]
  );
  return success(res, { id: r.insertId }, 'Pelanggan berhasil ditambahkan', 201);
});

router.put('/customers/:id', auth, async (req, res) => {
  const b = req.body;
  await pool.query(
    `UPDATE customers SET code=?, name=?, contact_person=?, email=?, phone=?, address=?, npwp=?, credit_limit=?, payment_term=?, is_active=? WHERE id=? AND company_id=?`,
    [sanitize(b.code), sanitize(b.name), sanitize(b.contact_person), sanitize(b.email), sanitize(b.phone),
      b.address, sanitize(b.npwp), b.credit_limit, b.payment_term, b.is_active ? 1 : 0, req.params.id, req.user.company_id]
  );
  return success(res, null, 'Pelanggan berhasil diperbarui');
});

router.delete('/customers/:id', auth, async (req, res) => {
  await pool.query('UPDATE customers SET deleted_at=NOW() WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
  return success(res, null, 'Pelanggan berhasil dihapus');
});

// Suppliers
router.get('/suppliers', auth, (req, res) => crudList(req, res, 'suppliers', ['t.code', 't.name', 't.email']));

router.post('/suppliers', auth, async (req, res) => {
  const b = req.body;
  if (!b.code || !b.name) return error(res, 'Kode dan nama wajib diisi');
  const [r] = await pool.query(
    `INSERT INTO suppliers (company_id, code, name, contact_person, email, phone, address, npwp, payment_term, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.company_id, sanitize(b.code), sanitize(b.name), sanitize(b.contact_person), sanitize(b.email),
      sanitize(b.phone), b.address, sanitize(b.npwp), b.payment_term || 30, req.user.id]
  );
  return success(res, { id: r.insertId }, 'Pemasok berhasil ditambahkan', 201);
});

router.put('/suppliers/:id', auth, async (req, res) => {
  const b = req.body;
  await pool.query(
    `UPDATE suppliers SET code=?, name=?, contact_person=?, email=?, phone=?, address=?, npwp=?, payment_term=?, is_active=? WHERE id=? AND company_id=?`,
    [sanitize(b.code), sanitize(b.name), sanitize(b.contact_person), sanitize(b.email), sanitize(b.phone),
      b.address, sanitize(b.npwp), b.payment_term, b.is_active ? 1 : 0, req.params.id, req.user.company_id]
  );
  return success(res, null, 'Pemasok berhasil diperbarui');
});

router.delete('/suppliers/:id', auth, async (req, res) => {
  await pool.query('UPDATE suppliers SET deleted_at=NOW() WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
  return success(res, null, 'Pemasok berhasil dihapus');
});

// Products
router.get('/products', auth, async (req, res) => {
  const result = await crudList(req, res, 'products', ['t.sku', 't.name', 't.barcode']);
  return result;
});

router.get('/products/:id/stock', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ps.*, w.name AS warehouse_name FROM product_stocks ps
     JOIN warehouses w ON w.id = ps.warehouse_id WHERE ps.product_id = ?`,
    [req.params.id]
  );
  return success(res, rows);
});

router.post('/products', auth, async (req, res) => {
  const b = req.body;
  if (!b.sku || !b.name) return error(res, 'SKU dan nama wajib diisi');
  const [r] = await pool.query(
    `INSERT INTO products (company_id, sku, barcode, name, type, unit, purchase_price, selling_price, min_stock, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.company_id, sanitize(b.sku), sanitize(b.barcode), sanitize(b.name), b.type || 'goods',
      b.unit || 'pcs', b.purchase_price || 0, b.selling_price || 0, b.min_stock || 0, b.description, req.user.id]
  );
  return success(res, { id: r.insertId }, 'Barang berhasil ditambahkan', 201);
});

router.put('/products/:id', auth, async (req, res) => {
  const b = req.body;
  await pool.query(
    `UPDATE products SET sku=?, barcode=?, name=?, type=?, unit=?, purchase_price=?, selling_price=?, min_stock=?, description=?, is_active=? WHERE id=? AND company_id=?`,
    [sanitize(b.sku), sanitize(b.barcode), sanitize(b.name), b.type, b.unit, b.purchase_price, b.selling_price,
      b.min_stock, b.description, b.is_active ? 1 : 0, req.params.id, req.user.company_id]
  );
  return success(res, null, 'Barang berhasil diperbarui');
});

router.delete('/products/:id', auth, async (req, res) => {
  await pool.query('UPDATE products SET deleted_at=NOW() WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
  return success(res, null, 'Barang berhasil dihapus');
});

// Warehouses & Cash accounts
router.get('/warehouses', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM warehouses WHERE company_id=? AND deleted_at IS NULL', [req.user.company_id]);
  return success(res, rows);
});

router.get('/cash-bank-accounts', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT cba.*, coa.code AS coa_code, coa.name AS coa_name FROM cash_bank_accounts cba
     JOIN chart_of_accounts coa ON coa.id = cba.coa_id WHERE cba.company_id=? AND cba.is_active=1`,
    [req.user.company_id]
  );
  return success(res, rows);
});

router.get('/departments', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM departments WHERE company_id=? AND deleted_at IS NULL', [req.user.company_id]);
  return success(res, rows);
});

// Stock overview
router.get('/stocks', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['p.sku', 'p.name'], search);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) AS total FROM products p WHERE p.company_id=? AND p.deleted_at IS NULL AND p.type='goods'${clause}`,
    [req.user.company_id, ...params]
  );
  const [rows] = await pool.query(
    `SELECT p.id, p.sku, p.name, p.unit, p.min_stock, COALESCE(SUM(ps.quantity),0) AS total_stock,
      COALESCE(SUM(ps.quantity * ps.avg_cost),0) AS stock_value
     FROM products p LEFT JOIN product_stocks ps ON ps.product_id = p.id
     WHERE p.company_id=? AND p.deleted_at IS NULL AND p.type='goods'${clause}
     GROUP BY p.id ORDER BY p.name LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

module.exports = router;
