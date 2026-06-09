const jwt = require('jsonwebtoken');
const pool = require('../utils/db');
const { error } = require('../utils/response');

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return error(res, 'Unauthorized', 401);
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    const [rows] = await pool.query(
      `SELECT a.*, r.slug AS role_slug, r.name AS role_name
       FROM admins a
       JOIN roles r ON r.id = a.role_id
       WHERE a.id = ? AND a.is_active = 1 AND a.deleted_at IS NULL`,
      [decoded.id]
    );

    if (!rows.length) return error(res, 'Unauthorized', 401);

    const [perms] = await pool.query(
      `SELECT p.key_name FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = ?`,
      [rows[0].role_id]
    );

    req.user = {
      ...rows[0],
      permissions: perms.map((p) => p.key_name),
    };
    next();
  } catch (err) {
    return error(res, 'Invalid token', 401);
  }
};

const checkPermission = (...keys) => (req, res, next) => {
  if (req.user.role_slug === 'super_admin') return next();
  const has = keys.some((k) => req.user.permissions.includes(k));
  if (!has) return error(res, 'Forbidden', 403);
  next();
};

module.exports = { auth, checkPermission };
