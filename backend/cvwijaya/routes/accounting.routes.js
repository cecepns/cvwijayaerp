const express = require('express');
const pool = require('../utils/db');
const { success, paginated } = require('../utils/response');
const { auth } = require('../middleware/auth');
const { getPagination, buildSearchWhere } = require('../utils/helpers');

const router = express.Router();

router.get('/journals', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['je.journal_no', 'je.description'], search);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM journal_entries je WHERE je.company_id=?${clause}`,
    [req.user.company_id, ...params]
  );
  const [rows] = await pool.query(
    `SELECT je.*, a.name AS created_by_name FROM journal_entries je
     LEFT JOIN admins a ON a.id=je.created_by WHERE je.company_id=?${clause}
     ORDER BY je.journal_date DESC, je.id DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.get('/journals/:id', auth, async (req, res) => {
  const [journal] = await pool.query('SELECT * FROM journal_entries WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
  if (!journal.length) return res.status(404).json({ success: false, message: 'Not found' });
  const [lines] = await pool.query(
    `SELECT jel.*, coa.code, coa.name AS account_name FROM journal_entry_lines jel
     JOIN chart_of_accounts coa ON coa.id=jel.coa_id WHERE jel.journal_entry_id=?`,
    [req.params.id]
  );
  journal[0].lines = lines;
  return success(res, journal[0]);
});

router.get('/notifications', auth, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM notifications WHERE admin_id=?', [req.user.id]);
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE admin_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [req.user.id, limit, offset]
  );
  const [[{ unread }]] = await pool.query('SELECT COUNT(*) AS unread FROM notifications WHERE admin_id=? AND is_read=0', [req.user.id]);
  return paginated(res, { items: rows, unread_count: unread.unread }, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.patch('/notifications/:id/read', auth, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=1 WHERE id=? AND admin_id=?', [req.params.id, req.user.id]);
  return success(res, null, 'Notifikasi ditandai dibaca');
});

router.get('/audit-logs', auth, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM audit_logs WHERE company_id=?', [req.user.company_id]);
  const [rows] = await pool.query(
    `SELECT al.*, a.name AS admin_name FROM audit_logs al LEFT JOIN admins a ON a.id=al.admin_id
     WHERE al.company_id=? ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

module.exports = router;
