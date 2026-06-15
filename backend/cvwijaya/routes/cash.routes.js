const express = require('express');
const pool = require('../utils/db');
const { success, paginated, error } = require('../utils/response');
const { auth } = require('../middleware/auth');
const { getPagination, buildSearchWhere } = require('../utils/helpers');
const { generateNumber } = require('../services/numberingService');
const {
  journalCashReceipt, journalCashPayment, journalCashTransfer,
  reverseJournalByReference, updateCashBalance,
} = require('../services/accountingService');

const router = express.Router();

router.get('/receipts', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['cr.receipt_no'], search);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM cash_receipts cr WHERE cr.company_id=?${clause}`, [req.user.company_id, ...params]);
  const [rows] = await pool.query(
    `SELECT cr.*, cba.name AS account_name FROM cash_receipts cr JOIN cash_bank_accounts cba ON cba.id=cr.cash_bank_id
     WHERE cr.company_id=?${clause} ORDER BY cr.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/receipts', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const receiptNo = await generateNumber(req.user.company_id, 'cash_receipt', conn);
    const [r] = await conn.query(
      `INSERT INTO cash_receipts (company_id, receipt_no, cash_bank_id, coa_id, receipt_date, amount, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', ?)`,
      [req.user.company_id, receiptNo, b.cash_bank_id, b.coa_id, b.receipt_date, b.amount, b.description, req.user.id]
    );
    await journalCashReceipt(conn, req.user.company_id, req.user.id, { id: r.insertId, receipt_no: receiptNo, ...b });
    await conn.commit();
    return success(res, { id: r.insertId, receipt_no: receiptNo }, 'Penerimaan kas berhasil', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.get('/payments', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['cp.payment_no'], search);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM cash_payments cp WHERE cp.company_id=?${clause}`, [req.user.company_id, ...params]);
  const [rows] = await pool.query(
    `SELECT cp.*, cba.name AS account_name FROM cash_payments cp JOIN cash_bank_accounts cba ON cba.id=cp.cash_bank_id
     WHERE cp.company_id=?${clause} ORDER BY cp.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.get('/payments/:id', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT cp.*, cba.name AS account_name FROM cash_payments cp
     JOIN cash_bank_accounts cba ON cba.id = cp.cash_bank_id
     WHERE cp.id = ? AND cp.company_id = ?`,
    [req.params.id, req.user.company_id]
  );
  if (!rows.length) return error(res, 'Not found', 404);
  return success(res, rows[0]);
});

router.post('/payments', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    if (!b.cash_bank_id || !b.coa_id || !b.payment_date || !b.amount) {
      return error(res, 'Data tidak lengkap');
    }
    const paymentNo = await generateNumber(req.user.company_id, 'cash_payment', conn);
    const [r] = await conn.query(
      `INSERT INTO cash_payments (company_id, payment_no, cash_bank_id, coa_id, payment_date, amount, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', ?)`,
      [req.user.company_id, paymentNo, b.cash_bank_id, b.coa_id, b.payment_date, b.amount, b.description, req.user.id]
    );
    await journalCashPayment(conn, req.user.company_id, req.user.id, { id: r.insertId, payment_no: paymentNo, ...b });
    await conn.commit();
    return success(res, { id: r.insertId, payment_no: paymentNo }, 'Pembayaran kas berhasil', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.put('/payments/:id', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const [rows] = await conn.query(
      'SELECT * FROM cash_payments WHERE id = ? AND company_id = ? AND status = ?',
      [req.params.id, req.user.company_id, 'posted']
    );
    if (!rows.length) return error(res, 'Data tidak ditemukan atau tidak dapat diedit');
    const old = rows[0];

    if (!b.cash_bank_id || !b.coa_id || !b.payment_date || !b.amount) {
      return error(res, 'Data tidak lengkap');
    }

    await updateCashBalance(conn, old.cash_bank_id, old.amount, 'in');
    await reverseJournalByReference(conn, req.user.company_id, req.user.id, 'cash_payment', old.id);

    await conn.query(
      `UPDATE cash_payments SET cash_bank_id = ?, coa_id = ?, payment_date = ?, amount = ?, description = ? WHERE id = ?`,
      [b.cash_bank_id, b.coa_id, b.payment_date, b.amount, b.description || null, old.id]
    );

    const updated = { ...old, ...b, id: old.id, payment_no: old.payment_no };
    await journalCashPayment(conn, req.user.company_id, req.user.id, updated);
    await conn.commit();
    return success(res, null, 'Pembayaran berhasil diperbarui');
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.get('/transfers', auth, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM cash_transfers WHERE company_id=?', [req.user.company_id]);
  const [rows] = await pool.query(
    `SELECT ct.*, fa.name AS from_account, ta.name AS to_account FROM cash_transfers ct
     JOIN cash_bank_accounts fa ON fa.id=ct.from_account_id JOIN cash_bank_accounts ta ON ta.id=ct.to_account_id
     WHERE ct.company_id=? ORDER BY ct.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/transfers', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    if (b.from_account_id === b.to_account_id) return error(res, 'Rekening asal dan tujuan tidak boleh sama');
    const transferNo = await generateNumber(req.user.company_id, 'cash_transfer', conn);
    const [r] = await conn.query(
      `INSERT INTO cash_transfers (company_id, transfer_no, from_account_id, to_account_id, transfer_date, amount, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', ?)`,
      [req.user.company_id, transferNo, b.from_account_id, b.to_account_id, b.transfer_date, b.amount, b.description, req.user.id]
    );
    await journalCashTransfer(conn, req.user.company_id, req.user.id, { id: r.insertId, transfer_no: transferNo, ...b });
    await conn.commit();
    return success(res, { id: r.insertId, transfer_no: transferNo }, 'Transfer berhasil', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

module.exports = router;
