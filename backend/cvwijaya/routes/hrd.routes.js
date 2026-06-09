const express = require('express');
const pool = require('../utils/db');
const { success, paginated, error } = require('../utils/response');
const { auth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { getPagination, buildSearchWhere } = require('../utils/helpers');
const { generateNumber } = require('../services/numberingService');
const { journalAdvanceDisburse, journalAdvancePayment } = require('../services/accountingService');
const { notifyByRole, createNotification } = require('../services/notificationService');

const router = express.Router();

router.get('/advances', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['ea.advance_no'], search);
  const status = req.query.status;
  let statusClause = '';
  const qParams = [req.user.company_id, ...params];
  if (status) { statusClause = ' AND ea.status = ?'; qParams.splice(1, 0, status); }
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM employee_advances ea WHERE ea.company_id=?${statusClause}${clause}`,
    status ? [req.user.company_id, status, ...params] : [req.user.company_id, ...params]
  );
  const [rows] = await pool.query(
    `SELECT ea.*, e.name AS employee_name, e.employee_code FROM employee_advances ea
     JOIN employees e ON e.id=ea.employee_id WHERE ea.company_id=?${statusClause}${clause}
     ORDER BY ea.created_at DESC LIMIT ? OFFSET ?`,
    status ? [req.user.company_id, status, ...params, limit, offset] : [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/advances', auth, async (req, res) => {
  try {
    const b = req.body;
    if (!b.employee_id || !b.amount) return error(res, 'Karyawan dan nominal wajib diisi');
    const advanceNo = await generateNumber(req.user.company_id, 'employee_advance');
    const [prefs] = await pool.query('SELECT advance_approval_limit FROM company_preferences WHERE company_id=?', [req.user.company_id]);
    const status = parseFloat(b.amount) <= parseFloat(prefs[0]?.advance_approval_limit || 0) ? 'approved' : 'pending';

    const [r] = await pool.query(
      `INSERT INTO employee_advances (company_id, advance_no, employee_id, request_date, amount, purpose, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.company_id, advanceNo, b.employee_id, b.request_date || new Date().toISOString().split('T')[0], b.amount, b.purpose, status, req.user.id]
    );

    if (status === 'pending') {
      await notifyByRole(req.user.company_id, 'admin_keuangan', 'advance_pending', 'Pengajuan Kasbon Baru',
        `Kasbon ${advanceNo} menunggu persetujuan`, 'employee_advance', r.insertId);
    }

    return success(res, { id: r.insertId, advance_no: advanceNo, status }, 'Kasbon berhasil diajukan', 201);
  } catch (err) { return error(res, err.message, 500); }
});

router.patch('/advances/:id/approve', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM employee_advances WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
  if (!rows.length || rows[0].status !== 'pending') return error(res, 'Data tidak valid');
  await pool.query('UPDATE employee_advances SET status=?, approved_by=?, approved_at=NOW() WHERE id=?', ['approved', req.user.id, req.params.id]);
  await createNotification(req.user.company_id, rows[0].created_by, 'advance_approved', 'Kasbon Disetujui',
    `Kasbon ${rows[0].advance_no} telah disetujui`, 'employee_advance', rows[0].id);
  await auditLog(req, 'approve', 'hrd', 'employee_advances', req.params.id, rows[0], { status: 'approved' });
  return success(res, null, 'Kasbon disetujui');
});

router.patch('/advances/:id/reject', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM employee_advances WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
  if (!rows.length || rows[0].status !== 'pending') return error(res, 'Data tidak valid');
  await pool.query('UPDATE employee_advances SET status=? WHERE id=?', ['rejected', req.params.id]);
  await createNotification(req.user.company_id, rows[0].created_by, 'advance_rejected', 'Kasbon Ditolak',
    `Kasbon ${rows[0].advance_no} ditolak`, 'employee_advance', rows[0].id);
  return success(res, null, 'Kasbon ditolak');
});

router.post('/advances/:id/disburse', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const [rows] = await conn.query('SELECT * FROM employee_advances WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
    if (!rows.length || !['approved'].includes(rows[0].status)) return error(res, 'Kasbon belum disetujui');
    const advance = { ...rows[0], cash_bank_id: b.cash_bank_id };
    await journalAdvanceDisburse(conn, req.user.company_id, req.user.id, advance);
    await conn.query('UPDATE employee_advances SET status=?, disbursed_at=NOW(), cash_bank_id=? WHERE id=?',
      ['disbursed', b.cash_bank_id, req.params.id]);
    await conn.commit();
    return success(res, null, 'Kasbon berhasil dicairkan');
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.post('/advances/:id/payments', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const [rows] = await conn.query('SELECT * FROM employee_advances WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
    if (!rows.length || !['disbursed', 'partial'].includes(rows[0].status)) return error(res, 'Data tidak valid');
    const advance = rows[0];

    const [r] = await conn.query(
      `INSERT INTO employee_advance_payments (employee_advance_id, payment_date, amount, payment_method, cash_bank_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [advance.id, b.payment_date, b.amount, b.payment_method || 'cash', b.cash_bank_id, b.notes, req.user.id]
    );

    await journalAdvancePayment(conn, req.user.company_id, req.user.id, advance,
      { id: r.insertId, payment_date: b.payment_date, amount: b.amount, payment_method: b.payment_method }, b.cash_bank_id);

    const newPaid = parseFloat(advance.paid_amount) + parseFloat(b.amount);
    const newStatus = newPaid >= parseFloat(advance.amount) ? 'paid' : 'partial';
    await conn.query('UPDATE employee_advances SET paid_amount=?, status=? WHERE id=?', [newPaid, newStatus, advance.id]);
    await conn.commit();
    return success(res, null, 'Pelunasan kasbon berhasil');
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.get('/advances/reports', auth, async (req, res) => {
  const [summary] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(amount) AS total_amount, SUM(paid_amount) AS total_paid,
      SUM(amount - paid_amount) AS outstanding FROM employee_advances WHERE company_id=? AND status NOT IN ('rejected','draft')`,
    [req.user.company_id]
  );
  const [byEmployee] = await pool.query(
    `SELECT e.name, e.employee_code, COUNT(ea.id) AS count, SUM(ea.amount) AS total, SUM(ea.amount-ea.paid_amount) AS outstanding
     FROM employee_advances ea JOIN employees e ON e.id=ea.employee_id
     WHERE ea.company_id=? AND ea.status NOT IN ('rejected','draft') GROUP BY e.id ORDER BY outstanding DESC`,
    [req.user.company_id]
  );
  return success(res, { summary: summary[0], by_employee: byEmployee });
});

module.exports = router;
