const express = require('express');
const pool = require('../utils/db');
const { success, paginated, error } = require('../utils/response');
const { auth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { getPagination, buildSearchWhere } = require('../utils/helpers');
const { generateNumber } = require('../services/numberingService');
const { journalSalesInvoice, journalSalesReceipt, journalSalesDownPayment, journalCogs } = require('../services/accountingService');
const { updateStock, getStock } = require('../services/stockService');
const { notifyByRole } = require('../services/notificationService');

const router = express.Router();

const getInvoiceItems = async (invoiceId) => {
  const [items] = await pool.query(
    `SELECT sii.*, p.name AS product_name, p.sku, p.type FROM sales_invoice_items sii
     JOIN products p ON p.id = sii.product_id WHERE sii.sales_invoice_id = ?`,
    [invoiceId]
  );
  return items;
};

router.get('/down-payments', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['dp.dp_no'], search);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM sales_down_payments dp WHERE dp.company_id=?${clause}`, [req.user.company_id, ...params]);
  const [rows] = await pool.query(
    `SELECT dp.*, c.name AS customer_name FROM sales_down_payments dp JOIN customers c ON c.id=dp.customer_id
     WHERE dp.company_id=?${clause} ORDER BY dp.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/down-payments', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const dpNo = await generateNumber(req.user.company_id, 'sales_dp', conn);
    const [r] = await conn.query(
      `INSERT INTO sales_down_payments (company_id, dp_no, customer_id, dp_date, amount, cash_bank_id, notes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [req.user.company_id, dpNo, b.customer_id, b.dp_date, b.amount, b.cash_bank_id, b.notes, req.user.id]
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
    const [rows] = await conn.query('SELECT * FROM sales_down_payments WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
    if (!rows.length || rows[0].status !== 'draft') return error(res, 'Data tidak valid');
    const dp = rows[0];
    await journalSalesDownPayment(conn, req.user.company_id, req.user.id, dp, dp.cash_bank_id);
    await conn.query('UPDATE sales_down_payments SET status=? WHERE id=?', ['posted', dp.id]);
    await conn.commit();
    return success(res, null, 'Uang muka berhasil diposting');
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.get('/invoices', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['si.invoice_no'], search);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM sales_invoices si WHERE si.company_id=?${clause}`, [req.user.company_id, ...params]);
  const [rows] = await pool.query(
    `SELECT si.*, c.name AS customer_name FROM sales_invoices si JOIN customers c ON c.id=si.customer_id
     WHERE si.company_id=?${clause} ORDER BY si.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.get('/invoices/:id', auth, async (req, res) => {
  const [inv] = await pool.query(`SELECT si.*, c.name AS customer_name FROM sales_invoices si JOIN customers c ON c.id=si.customer_id WHERE si.id=?`, [req.params.id]);
  if (!inv.length) return error(res, 'Not found', 404);
  inv[0].items = await getInvoiceItems(req.params.id);
  return success(res, inv[0]);
});

router.post('/invoices', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const invoiceNo = await generateNumber(req.user.company_id, 'sales_invoice', conn);
    let subtotal = 0;
    for (const item of b.items || []) subtotal += parseFloat(item.quantity) * parseFloat(item.unit_price);
    const taxAmount = subtotal * ((b.tax_rate || 0) / 100);
    const total = subtotal + taxAmount - (b.discount || 0);

    const [r] = await conn.query(
      `INSERT INTO sales_invoices (company_id, invoice_no, customer_id, invoice_date, due_date, warehouse_id, subtotal, discount, tax_amount, total, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [req.user.company_id, invoiceNo, b.customer_id, b.invoice_date, b.due_date, b.warehouse_id,
        subtotal, b.discount || 0, taxAmount, total, b.notes, req.user.id]
    );

    for (const item of b.items || []) {
      const itemSub = parseFloat(item.quantity) * parseFloat(item.unit_price);
      await conn.query(
        `INSERT INTO sales_invoice_items (sales_invoice_id, product_id, quantity, unit_price, discount, tax_amount, subtotal) VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [r.insertId, item.product_id, item.quantity, item.unit_price, item.discount || 0, itemSub]
      );
    }
    await conn.commit();
    return success(res, { id: r.insertId, invoice_no: invoiceNo }, 'Faktur penjualan berhasil dibuat', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.post('/invoices/:id/post', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM sales_invoices WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
    if (!rows.length || rows[0].status !== 'draft') return error(res, 'Faktur tidak valid');
    const invoice = rows[0];
    const items = await getInvoiceItems(invoice.id);

    for (const item of items) {
      if (item.type === 'goods') {
        const stock = await getStock(item.product_id, invoice.warehouse_id);
        if (parseFloat(stock.quantity) < parseFloat(item.quantity)) {
          return error(res, `Stok ${item.product_name} tidak mencukupi`);
        }
      }
    }

    await journalSalesInvoice(conn, req.user.company_id, req.user.id, invoice);

    const issueNo = await generateNumber(req.user.company_id, 'goods_issue', conn);
    const [gi] = await conn.query(
      `INSERT INTO goods_issues (company_id, issue_no, sales_invoice_id, warehouse_id, issue_date, status, created_by) VALUES (?, ?, ?, ?, ?, 'posted', ?)`,
      [req.user.company_id, issueNo, invoice.id, invoice.warehouse_id, invoice.invoice_date, req.user.id]
    );

    const issueItems = [];
    for (const item of items) {
      if (item.type !== 'goods') continue;
      const stock = await getStock(item.product_id, invoice.warehouse_id);
      await conn.query('INSERT INTO goods_issue_items (goods_issue_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)',
        [gi.insertId, item.product_id, item.quantity, stock.avg_cost]);
      await updateStock(conn, req.user.company_id, item.product_id, invoice.warehouse_id,
        item.quantity, stock.avg_cost, 'out', 'goods_issue', gi.insertId, req.user.id, invoice.invoice_date);
      await conn.query('UPDATE sales_invoice_items SET issued_qty=? WHERE id=?', [item.quantity, item.id]);
      issueItems.push({ quantity: item.quantity, unit_cost: stock.avg_cost });
    }

    if (issueItems.length) {
      await journalCogs(conn, req.user.company_id, req.user.id, { id: gi.insertId, issue_no: issueNo, issue_date: invoice.invoice_date }, issueItems);
    }

    await conn.query('UPDATE sales_invoices SET status=?, posted_at=NOW() WHERE id=?', ['posted', invoice.id]);
    await auditLog(req, 'post', 'sales', 'sales_invoices', invoice.id, null, invoice);
    await notifyByRole(req.user.company_id, 'admin_gudang', 'sales_posted', 'Faktur Penjualan Diposting',
      `Faktur ${invoice.invoice_no} telah diposting`, 'sales_invoice', invoice.id);

    await conn.commit();
    return success(res, null, 'Faktur penjualan berhasil diposting');
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.get('/receipts', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['sr.receipt_no'], search);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM sales_receipts sr WHERE sr.company_id=?${clause}`, [req.user.company_id, ...params]);
  const [rows] = await pool.query(
    `SELECT sr.*, c.name AS customer_name FROM sales_receipts sr JOIN customers c ON c.id=sr.customer_id
     WHERE sr.company_id=?${clause} ORDER BY sr.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/receipts', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const receiptNo = await generateNumber(req.user.company_id, 'sales_receipt', conn);
    const [r] = await conn.query(
      `INSERT INTO sales_receipts (company_id, receipt_no, customer_id, receipt_date, cash_bank_id, amount, notes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', ?)`,
      [req.user.company_id, receiptNo, b.customer_id, b.receipt_date, b.cash_bank_id, b.amount, b.notes, req.user.id]
    );

    for (const alloc of b.allocations || []) {
      await conn.query('INSERT INTO sales_receipt_allocations (sales_receipt_id, sales_invoice_id, amount) VALUES (?, ?, ?)',
        [r.insertId, alloc.invoice_id, alloc.amount]);
      await conn.query(
        `UPDATE sales_invoices SET paid_amount = paid_amount + ?,
         status = CASE WHEN paid_amount + ? >= total THEN 'paid' ELSE 'partial' END WHERE id = ?`,
        [alloc.amount, alloc.amount, alloc.invoice_id]
      );
    }

    await journalSalesReceipt(conn, req.user.company_id, req.user.id,
      { id: r.insertId, receipt_no: receiptNo, receipt_date: b.receipt_date, amount: b.amount }, b.cash_bank_id);
    await conn.commit();
    return success(res, { id: r.insertId, receipt_no: receiptNo }, 'Penerimaan berhasil', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.get('/reports', auth, async (req, res) => {
  const { date_from, date_to } = req.query;
  let clause = ' AND si.status != ?';
  const params = [req.user.company_id, 'cancelled'];
  if (date_from) { clause += ' AND si.invoice_date >= ?'; params.push(date_from); }
  if (date_to) { clause += ' AND si.invoice_date <= ?'; params.push(date_to); }
  const [summary] = await pool.query(
    `SELECT COUNT(*) AS total_invoices, SUM(si.total) AS total_amount, SUM(si.paid_amount) AS total_paid,
      SUM(si.total - si.paid_amount) AS total_outstanding FROM sales_invoices si WHERE si.company_id=?${clause}`, params
  );
  const [byCustomer] = await pool.query(
    `SELECT c.name, COUNT(si.id) AS count, SUM(si.total) AS total FROM sales_invoices si
     JOIN customers c ON c.id=si.customer_id WHERE si.company_id=?${clause} GROUP BY c.id ORDER BY total DESC LIMIT 10`, params
  );
  return success(res, { summary: summary[0], by_customer: byCustomer });
});

module.exports = router;
