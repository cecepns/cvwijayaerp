const pool = require('../utils/db');

const createNotification = async (companyId, adminIds, type, title, message, referenceType, referenceId) => {
  const ids = Array.isArray(adminIds) ? adminIds : [adminIds];
  for (const adminId of ids) {
    await pool.query(
      `INSERT INTO notifications (company_id, admin_id, type, title, message, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [companyId, adminId, type, title, message, referenceType, referenceId]
    );
  }
};

const notifyByRole = async (companyId, roleSlug, type, title, message, referenceType, referenceId) => {
  const [admins] = await pool.query(
    `SELECT a.id FROM admins a
     JOIN roles r ON r.id = a.role_id
     WHERE a.company_id = ? AND r.slug = ? AND a.is_active = 1 AND a.deleted_at IS NULL`,
    [companyId, roleSlug]
  );
  if (admins.length) {
    await createNotification(
      companyId,
      admins.map((a) => a.id),
      type,
      title,
      message,
      referenceType,
      referenceId
    );
  }
};

module.exports = { createNotification, notifyByRole };
