const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db');
const { success, error } = require('../utils/response');
const { auth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { sanitize } = require('../utils/helpers');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email dan password wajib diisi');

    const [rows] = await pool.query(
      `SELECT a.*, r.slug AS role_slug, r.name AS role_name
       FROM admins a JOIN roles r ON r.id = a.role_id
       WHERE a.email = ? AND a.is_active = 1 AND a.deleted_at IS NULL`,
      [email]
    );

    if (!rows.length) return error(res, 'Email atau password salah', 401);

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return error(res, 'Email atau password salah', 401);

    const [perms] = await pool.query(
      `SELECT p.key_name FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id WHERE rp.role_id = ?`,
      [admin.role_id]
    );

    await pool.query('UPDATE admins SET last_login_at = NOW() WHERE id = ?', [admin.id]);

    const token = jwt.sign({ id: admin.id, company_id: admin.company_id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    const { password: _, ...user } = admin;
    return success(res, {
      token,
      user: { ...user, permissions: perms.map((p) => p.key_name) },
    }, 'Login berhasil');
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.get('/profile', auth, async (req, res) => {
  const { password, ...user } = req.user;
  return success(res, user);
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    await pool.query('UPDATE admins SET name = ?, phone = ? WHERE id = ?', [
      sanitize(name), sanitize(phone), req.user.id,
    ]);
    return success(res, null, 'Profile berhasil diperbarui');
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.put('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return error(res, 'Password wajib diisi');
    if (new_password.length < 6) return error(res, 'Password minimal 6 karakter');

    const [rows] = await pool.query('SELECT password FROM admins WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, rows[0].password);
    if (!valid) return error(res, 'Password lama salah');

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE admins SET password = ? WHERE id = ?', [hash, req.user.id]);
    await auditLog(req, 'update', 'auth', 'admins', req.user.id, null, { action: 'change_password' });
    return success(res, null, 'Password berhasil diubah');
  } catch (err) {
    return error(res, err.message, 500);
  }
});

router.post('/logout', auth, async (req, res) => {
  await auditLog(req, 'logout', 'auth', 'admins', req.user.id, null, null);
  return success(res, null, 'Logout berhasil');
});

module.exports = router;
