const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const { success, paginated, error } = require('../utils/response');
const { auth, checkPermission } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { getPagination, buildSearchWhere, sanitize } = require('../utils/helpers');

const router = express.Router();

router.get('/company', auth, async (req, res) => {
  const [companies] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.user.company_id]);
  const [prefs] = await pool.query('SELECT * FROM company_preferences WHERE company_id = ?', [req.user.company_id]);
  return success(res, { company: companies[0], preferences: prefs[0] });
});

router.put('/company', auth, checkPermission('settings.company.update'), async (req, res) => {
  try {
    const { company, preferences } = req.body;
    if (company) {
      await pool.query(
        `UPDATE companies SET name=?, npwp=?, address=?, city=?, province=?, postal_code=?, phone=?, email=?, website=? WHERE id=?`,
        [sanitize(company.name), sanitize(company.npwp), company.address, sanitize(company.city),
          sanitize(company.province), sanitize(company.postal_code), sanitize(company.phone),
          sanitize(company.email), sanitize(company.website), req.user.company_id]
      );
    }
    if (preferences) {
      await pool.query(
        `UPDATE company_preferences SET currency=?, tax_rate=?, fiscal_year_start=?, document_prefix_sales=?, document_prefix_purchase=?, advance_approval_limit=? WHERE company_id=?`,
        [preferences.currency, preferences.tax_rate, preferences.fiscal_year_start,
          preferences.document_prefix_sales, preferences.document_prefix_purchase,
          preferences.advance_approval_limit, req.user.company_id]
      );
    }
    await auditLog(req, 'update', 'settings', 'companies', req.user.company_id, null, req.body);
    return success(res, null, 'Preferensi perusahaan berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.get('/coa', auth, async (req, res) => {
  const { page, limit, offset, search, sort, order } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['code', 'name'], search);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM chart_of_accounts WHERE company_id = ? AND deleted_at IS NULL${clause}`,
    [req.user.company_id, ...params]
  );
  const [rows] = await pool.query(
    `SELECT * FROM chart_of_accounts WHERE company_id = ? AND deleted_at IS NULL${clause} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/coa', auth, checkPermission('settings.coa.create'), async (req, res) => {
  try {
    const { code, name, account_type, normal_balance, parent_id, is_header, description } = req.body;
    if (!code || !name || !account_type) return error(res, 'Code, nama, dan tipe akun wajib diisi');
    const [result] = await pool.query(
      `INSERT INTO chart_of_accounts (company_id, parent_id, code, name, account_type, normal_balance, is_header, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.company_id, parent_id || null, sanitize(code), sanitize(name), account_type,
        normal_balance || 'debit', is_header ? 1 : 0, description]
    );
    await auditLog(req, 'create', 'settings', 'chart_of_accounts', result.insertId, null, req.body);
    return success(res, { id: result.insertId }, 'Akun berhasil ditambahkan', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.put('/coa/:id', auth, checkPermission('settings.coa.update'), async (req, res) => {
  try {
    const { name, account_type, normal_balance, is_active, description } = req.body;
    await pool.query(
      `UPDATE chart_of_accounts SET name=?, account_type=?, normal_balance=?, is_active=?, description=? WHERE id=? AND company_id=?`,
      [sanitize(name), account_type, normal_balance, is_active ? 1 : 0, description, req.params.id, req.user.company_id]
    );
    return success(res, null, 'Akun berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.delete('/coa/:id', auth, checkPermission('settings.coa.delete'), async (req, res) => {
  await pool.query('UPDATE chart_of_accounts SET deleted_at = NOW() WHERE id = ? AND company_id = ?', [req.params.id, req.user.company_id]);
  return success(res, null, 'Akun berhasil dihapus');
});

router.get('/roles', auth, async (req, res) => {
  const [roles] = await pool.query(
    'SELECT * FROM roles WHERE company_id = ? AND deleted_at IS NULL ORDER BY name',
    [req.user.company_id]
  );
  for (const role of roles) {
    const [perms] = await pool.query(
      `SELECT p.* FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id WHERE rp.role_id = ?`,
      [role.id]
    );
    role.permissions = perms;
  }
  return success(res, roles);
});

router.post('/roles', auth, checkPermission('settings.role.create'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, slug, description, permission_ids } = req.body;
    const [result] = await conn.query(
      'INSERT INTO roles (company_id, name, slug, description) VALUES (?, ?, ?, ?)',
      [req.user.company_id, sanitize(name), sanitize(slug), description]
    );
    if (permission_ids?.length) {
      for (const pid of permission_ids) {
        await conn.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [result.insertId, pid]);
      }
    }
    await conn.commit();
    return success(res, { id: result.insertId }, 'Role berhasil ditambahkan', 201);
  } catch (err) {
    await conn.rollback();
    return error(res, err.message, 500);
  } finally {
    conn.release();
  }
});

router.put('/roles/:id', auth, checkPermission('settings.role.update'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { name, description, permission_ids } = req.body;
    await conn.query('UPDATE roles SET name=?, description=? WHERE id=? AND company_id=?', [sanitize(name), description, req.params.id, req.user.company_id]);
    await conn.query('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);
    if (permission_ids?.length) {
      for (const pid of permission_ids) {
        await conn.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [req.params.id, pid]);
      }
    }
    await conn.commit();
    return success(res, null, 'Role berhasil diperbarui');
  } catch (err) {
    await conn.rollback();
    return error(res, err.message, 500);
  } finally {
    conn.release();
  }
});

router.get('/permissions', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM permissions ORDER BY module, action');
  return success(res, rows);
});

router.get('/admins', auth, checkPermission('settings.admin.view'), async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['a.name', 'a.email'], search);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM admins a WHERE a.company_id = ? AND a.deleted_at IS NULL${clause}`,
    [req.user.company_id, ...params]
  );
  const [rows] = await pool.query(
    `SELECT a.id, a.name, a.email, a.phone, a.is_active, a.last_login_at, a.created_at, r.name AS role_name, r.id AS role_id
     FROM admins a JOIN roles r ON r.id = a.role_id
     WHERE a.company_id = ? AND a.deleted_at IS NULL${clause} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/admins', auth, checkPermission('settings.admin.create'), async (req, res) => {
  try {
    const { name, email, password, role_id, phone } = req.body;
    if (!name || !email || !password || !role_id) return error(res, 'Data tidak lengkap');
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO admins (company_id, role_id, name, email, password, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.company_id, role_id, sanitize(name), sanitize(email), hash, sanitize(phone)]
    );
    return success(res, { id: result.insertId }, 'Admin berhasil ditambahkan', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.put('/admins/:id', auth, checkPermission('settings.admin.update'), async (req, res) => {
  try {
    const { name, email, role_id, phone, is_active, password } = req.body;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE admins SET name=?, email=?, role_id=?, phone=?, is_active=?, password=? WHERE id=? AND company_id=?',
        [sanitize(name), sanitize(email), role_id, sanitize(phone), is_active ? 1 : 0, hash, req.params.id, req.user.company_id]);
    } else {
      await pool.query('UPDATE admins SET name=?, email=?, role_id=?, phone=?, is_active=? WHERE id=? AND company_id=?',
        [sanitize(name), sanitize(email), role_id, sanitize(phone), is_active ? 1 : 0, req.params.id, req.user.company_id]);
    }
    return success(res, null, 'Admin berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.delete('/admins/:id', auth, checkPermission('settings.admin.delete'), async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return error(res, 'Tidak dapat menghapus akun sendiri');
  await pool.query('UPDATE admins SET deleted_at = NOW() WHERE id = ? AND company_id = ?', [req.params.id, req.user.company_id]);
  return success(res, null, 'Admin berhasil dihapus');
});

module.exports = router;
