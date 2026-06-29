const express = require('express');
const pool = require('../utils/db');
const { success, paginated, error } = require('../utils/response');
const { auth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { getPagination, buildSearchWhere } = require('../utils/helpers');
const { generateNumber } = require('../services/numberingService');
const {
  journalPurchaseInvoice, journalPurchasePayment, journalPurchaseDownPayment,
} = require('../services/accountingService');
const { updateStock } = require('../services/stockService');
const { notifyByRole } = require('../services/notificationService');

const router = express.Router();

const validatePurchasePaymentAllocations = async (conn, allocations, paymentAmount) => {
  if (!allocations?.length) throw new Error('Pilih minimal satu faktur untuk dialokasikan');
  const amount = parseFloat(paymentAmount);
  if (!amount || amount <= 0) throw new Error('Nominal pembayaran harus lebih dari 0');

  let totalAllocated = 0;
  for (const alloc of allocations) {
    const allocAmount = parseFloat(alloc.amount);
    if (!allocAmount || allocAmount <= 0) throw new Error('Nominal alokasi faktur tidak valid');

    const [invoices] = await conn.query(
      'SELECT id, invoice_no, total, paid_amount, status FROM purchase_invoices WHERE id = ?',
      [alloc.invoice_id]
    );
    if (!invoices.length) throw new Error('Faktur tidak ditemukan');
    const inv = invoices[0];
    if (!['posted', 'partial'].includes(inv.status)) {
      throw new Error(`Faktur ${inv.invoice_no} tidak dapat dibayar`);
    }

    const outstanding = parseFloat(inv.total) - parseFloat(inv.paid_amount);
    if (allocAmount > outstanding + 0.01) {
      throw new Error(`Nominal alokasi faktur ${inv.invoice_no} melebihi sisa tagihan (${outstanding.toLocaleString('id-ID')})`);
    }
    totalAllocated += allocAmount;
  }

  if (totalAllocated > amount + 0.01) {
    throw new Error('Total alokasi faktur melebihi nominal pembayaran');
  }
};

const getInvoiceItems = async (invoiceId) => {
  const [items] = await pool.query(
    `SELECT pii.*, p.name AS product_name, p.sku FROM purchase_invoice_items pii
     JOIN products p ON p.id = pii.product_id WHERE pii.purchase_invoice_id = ?`,
    [invoiceId]
  );
  return items;
};

// Down payments
router.get('/down-payments', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['dp.dp_no'], search);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM purchase_down_payments dp WHERE dp.company_id=?${clause}`,
    [req.user.company_id, ...params]
  );
  const [rows] = await pool.query(
    `SELECT dp.*, s.name AS supplier_name FROM purchase_down_payments dp
     JOIN suppliers s ON s.id = dp.supplier_id WHERE dp.company_id=?${clause} ORDER BY dp.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/down-payments', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const dpNo = await generateNumber(req.user.company_id, 'purchase_dp', conn);
    const [r] = await conn.query(
      `INSERT INTO purchase_down_payments (company_id, dp_no, supplier_id, dp_date, amount, cash_bank_id, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [req.user.company_id, dpNo, b.supplier_id, b.dp_date, b.amount, b.cash_bank_id, b.notes, req.user.id]
    );
    await conn.commit();
    return success(res, { id: r.insertId, dp_no: dpNo }, 'Uang muka berhasil dibuat', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.post('/down-payments/:id/post', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM purchase_down_payments WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
    if (!rows.length || rows[0].status !== 'draft') return error(res, 'Data tidak valid');
    const dp = rows[0];
    await journalPurchaseDownPayment(conn, req.user.company_id, req.user.id, dp, dp.cash_bank_id);
    await conn.query('UPDATE purchase_down_payments SET status=? WHERE id=?', ['posted', dp.id]);
    await conn.commit();
    return success(res, null, 'Uang muka berhasil diposting');
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

// Invoices
router.get('/invoices', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const status = req.query.status;
  const supplierId = req.query.supplier_id;
  const dateFrom = req.query.date_from;
  const dateTo = req.query.date_to;
  const paymentStatus = req.query.payment_status;

  let extraClause = '';
  const params = [req.user.company_id];
  if (status) { extraClause += ' AND pi.status = ?'; params.push(status); }
  if (supplierId) { extraClause += ' AND pi.supplier_id = ?'; params.push(supplierId); }
  if (dateFrom) { extraClause += ' AND pi.invoice_date >= ?'; params.push(dateFrom); }
  if (dateTo) { extraClause += ' AND pi.invoice_date <= ?'; params.push(dateTo); }
  if (paymentStatus === 'paid') { extraClause += ' AND pi.paid_amount >= pi.total AND pi.status NOT IN (?, ?)'; params.push('draft', 'cancelled'); }
  if (paymentStatus === 'unpaid') { extraClause += ' AND pi.paid_amount < pi.total AND pi.status NOT IN (?, ?)'; params.push('draft', 'cancelled'); }

  const { clause, params: sp } = buildSearchWhere(['pi.invoice_no'], search, params.length + 1);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM purchase_invoices pi WHERE pi.company_id=?${extraClause}${clause}`,
    [...params, ...sp]
  );
  const [rows] = await pool.query(
    `SELECT pi.*, s.name AS supplier_name,
      CASE WHEN pi.paid_amount >= pi.total THEN 'Lunas' ELSE 'Belum Lunas' END AS payment_label
     FROM purchase_invoices pi
     JOIN suppliers s ON s.id = pi.supplier_id WHERE pi.company_id=?${extraClause}${clause}
     ORDER BY pi.created_at DESC LIMIT ? OFFSET ?`,
    [...params, ...sp, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.get('/invoices/:id', auth, async (req, res) => {
  const [inv] = await pool.query(
    `SELECT pi.*, s.name AS supplier_name FROM purchase_invoices pi JOIN suppliers s ON s.id=pi.supplier_id WHERE pi.id=?`,
    [req.params.id]
  );
  if (!inv.length) return error(res, 'Not found', 404);
  inv[0].items = await getInvoiceItems(req.params.id);
  return success(res, inv[0]);
});

router.post('/invoices', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const invoiceNo = await generateNumber(req.user.company_id, 'purchase_invoice', conn);
    let subtotal = 0;
    for (const item of b.items || []) subtotal += parseFloat(item.quantity) * parseFloat(item.unit_price);
    const taxAmount = subtotal * ((b.tax_rate || 0) / 100);
    const total = subtotal + taxAmount - (b.discount || 0);

    const [r] = await conn.query(
      `INSERT INTO purchase_invoices (company_id, invoice_no, supplier_id, supplier_invoice_no, invoice_date, due_date, warehouse_id, subtotal, discount, tax_amount, total, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [req.user.company_id, invoiceNo, b.supplier_id, b.supplier_invoice_no, b.invoice_date, b.due_date,
        b.warehouse_id, subtotal, b.discount || 0, taxAmount, total, b.notes, req.user.id]
    );

    for (const item of b.items || []) {
      const itemSub = parseFloat(item.quantity) * parseFloat(item.unit_price);
      await conn.query(
        `INSERT INTO purchase_invoice_items (purchase_invoice_id, product_id, quantity, unit_price, discount, tax_amount, subtotal)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [r.insertId, item.product_id, item.quantity, item.unit_price, item.discount || 0, itemSub]
      );
    }
    await conn.commit();
    return success(res, { id: r.insertId, invoice_no: invoiceNo }, 'Faktur pembelian berhasil dibuat', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.put('/invoices/:id', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const [rows] = await conn.query('SELECT * FROM purchase_invoices WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
    if (!rows.length || rows[0].status !== 'draft') return error(res, 'Faktur tidak dapat diedit');
    if (!b.supplier_id || !b.warehouse_id || !(b.items || []).length) return error(res, 'Data faktur tidak lengkap');

    let subtotal = 0;
    for (const item of b.items) subtotal += parseFloat(item.quantity) * parseFloat(item.unit_price);
    const taxAmount = subtotal * ((b.tax_rate || 0) / 100);
    const total = subtotal + taxAmount - (parseFloat(b.discount) || 0);

    await conn.query(
      `UPDATE purchase_invoices SET supplier_id=?, supplier_invoice_no=?, invoice_date=?, due_date=?, warehouse_id=?, subtotal=?, discount=?, tax_amount=?, total=?, notes=? WHERE id=?`,
      [b.supplier_id, b.supplier_invoice_no || null, b.invoice_date, b.due_date, b.warehouse_id, subtotal, b.discount || 0, taxAmount, total, b.notes || null, req.params.id]
    );

    await conn.query('DELETE FROM purchase_invoice_items WHERE purchase_invoice_id=?', [req.params.id]);
    for (const item of b.items) {
      const itemSub = parseFloat(item.quantity) * parseFloat(item.unit_price);
      await conn.query(
        `INSERT INTO purchase_invoice_items (purchase_invoice_id, product_id, quantity, unit_price, discount, tax_amount, subtotal) VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [req.params.id, item.product_id, item.quantity, item.unit_price, item.discount || 0, itemSub]
      );
    }

    await auditLog(req, 'update', 'purchase', 'purchase_invoices', req.params.id, rows[0], b);
    await conn.commit();
    return success(res, null, 'Faktur pembelian berhasil diperbarui');
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.post('/invoices/:id/post', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM purchase_invoices WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
    if (!rows.length || rows[0].status !== 'draft') return error(res, 'Faktur tidak valid');
    const invoice = rows[0];

    await journalPurchaseInvoice(conn, req.user.company_id, req.user.id, invoice);
    await conn.query('UPDATE purchase_invoices SET status=?, posted_at=NOW() WHERE id=?', ['posted', invoice.id]);

    const receiptNo = await generateNumber(req.user.company_id, 'goods_receipt', conn);
    const [gr] = await conn.query(
      `INSERT INTO goods_receipts (company_id, receipt_no, purchase_invoice_id, warehouse_id, receipt_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'posted', ?)`,
      [req.user.company_id, receiptNo, invoice.id, invoice.warehouse_id, invoice.invoice_date, req.user.id]
    );

    const items = await getInvoiceItems(invoice.id);
    for (const item of items) {
      await conn.query(
        'INSERT INTO goods_receipt_items (goods_receipt_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)',
        [gr.insertId, item.product_id, item.quantity, item.unit_price]
      );
      await updateStock(conn, req.user.company_id, item.product_id, invoice.warehouse_id,
        item.quantity, item.unit_price, 'in', 'goods_receipt', gr.insertId, req.user.id, invoice.invoice_date);
      await conn.query('UPDATE purchase_invoice_items SET received_qty=? WHERE id=?', [item.quantity, item.id]);
    }

    await auditLog(req, 'post', 'purchase', 'purchase_invoices', invoice.id, null, invoice);
    await notifyByRole(req.user.company_id, 'admin_gudang', 'purchase_posted', 'Faktur Pembelian Diposting',
      `Faktur ${invoice.invoice_no} telah diposting`, 'purchase_invoice', invoice.id);

    await conn.commit();
    return success(res, null, 'Faktur pembelian berhasil diposting');
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

// Payments
router.get('/payments', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['pp.payment_no'], search);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM purchase_payments pp WHERE pp.company_id=?${clause}`, [req.user.company_id, ...params]);
  const [rows] = await pool.query(
    `SELECT pp.*, s.name AS supplier_name FROM purchase_payments pp JOIN suppliers s ON s.id=pp.supplier_id
     WHERE pp.company_id=?${clause} ORDER BY pp.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/payments', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    await validatePurchasePaymentAllocations(conn, b.allocations, b.amount);

    const paymentNo = await generateNumber(req.user.company_id, 'purchase_payment', conn);
    const [r] = await conn.query(
      `INSERT INTO purchase_payments (company_id, payment_no, supplier_id, payment_date, cash_bank_id, amount, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', ?)`,
      [req.user.company_id, paymentNo, b.supplier_id, b.payment_date, b.cash_bank_id, b.amount, b.notes, req.user.id]
    );

    let remaining = parseFloat(b.amount);
    for (const alloc of b.allocations || []) {
      const payAmt = Math.min(remaining, parseFloat(alloc.amount));
      await conn.query('INSERT INTO purchase_payment_allocations (purchase_payment_id, purchase_invoice_id, amount) VALUES (?, ?, ?)',
        [r.insertId, alloc.invoice_id, payAmt]);
      await conn.query(
        `UPDATE purchase_invoices SET paid_amount = paid_amount + ?,
         status = CASE WHEN paid_amount + ? >= total THEN 'paid' ELSE 'partial' END WHERE id = ?`,
        [payAmt, payAmt, alloc.invoice_id]
      );
      remaining -= payAmt;
    }

    await journalPurchasePayment(conn, req.user.company_id, req.user.id, { id: r.insertId, payment_no: paymentNo, payment_date: b.payment_date, amount: b.amount }, b.cash_bank_id);
    await conn.commit();
    return success(res, { id: r.insertId, payment_no: paymentNo }, 'Pembayaran berhasil', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

// Reports
router.get('/reports', auth, async (req, res) => {
  const { date_from, date_to } = req.query;
  let clause = ' AND pi.status != ?';
  const params = [req.user.company_id, 'cancelled'];
  if (date_from) { clause += ' AND pi.invoice_date >= ?'; params.push(date_from); }
  if (date_to) { clause += ' AND pi.invoice_date <= ?'; params.push(date_to); }
  const [summary] = await pool.query(
    `SELECT COUNT(*) AS total_invoices, SUM(pi.total) AS total_amount, SUM(pi.paid_amount) AS total_paid,
      SUM(pi.total - pi.paid_amount) AS total_outstanding FROM purchase_invoices pi WHERE pi.company_id=?${clause}`,
    params
  );
  const [bySupplier] = await pool.query(
    `SELECT s.id, s.name, COUNT(pi.id) AS count, SUM(pi.total) AS total FROM purchase_invoices pi
     JOIN suppliers s ON s.id=pi.supplier_id WHERE pi.company_id=?${clause} GROUP BY s.id ORDER BY total DESC LIMIT 10`,
    params
  );
  return success(res, { summary: summary[0], by_supplier: bySupplier });
});

router.get('/reports/invoices', auth, async (req, res) => {
  const { supplier_id, date_from, date_to } = req.query;
  if (!supplier_id) return error(res, 'supplier_id wajib diisi');
  let clause = ' AND pi.status != ? AND pi.supplier_id = ?';
  const params = [req.user.company_id, 'cancelled', supplier_id];
  if (date_from) { clause += ' AND pi.invoice_date >= ?'; params.push(date_from); }
  if (date_to) { clause += ' AND pi.invoice_date <= ?'; params.push(date_to); }
  const [rows] = await pool.query(
    `SELECT pi.id, pi.invoice_no, pi.invoice_date, pi.total, pi.paid_amount, pi.status
     FROM purchase_invoices pi WHERE pi.company_id=?${clause} ORDER BY pi.invoice_date DESC`,
    params
  );
  return success(res, rows);
});

module.exports = router;
