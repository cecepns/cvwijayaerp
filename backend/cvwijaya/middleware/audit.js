const pool = require('../utils/db');

const auditLog = async (req, action, module, referenceType, referenceId, oldValues, newValues) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (company_id, admin_id, action, module, reference_type, reference_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user?.company_id || 1,
        req.user?.id || null,
        action,
        module,
        referenceType,
        referenceId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req.ip,
        req.headers['user-agent'] || null,
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { auditLog };
