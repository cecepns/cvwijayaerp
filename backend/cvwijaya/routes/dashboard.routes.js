const express = require('express');
const pool = require('../utils/db');
const { success } = require('../utils/response');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', auth, async (req, res) => {
  try {
    const cid = req.user.company_id;
    const [[sales]] = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS total FROM sales_invoices WHERE company_id = ? AND status IN ('posted','partial','paid') AND MONTH(invoice_date) = MONTH(CURDATE())`,
      [cid]
    );
    const [[purchases]] = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS total FROM purchase_invoices WHERE company_id = ? AND status IN ('posted','partial','paid') AND MONTH(invoice_date) = MONTH(CURDATE())`,
      [cid]
    );
    const [[inventory]] = await pool.query(
      `SELECT COALESCE(SUM(ps.quantity * ps.avg_cost),0) AS total FROM product_stocks ps WHERE ps.company_id = ?`,
      [cid]
    );
    const [[receivable]] = await pool.query(
      `SELECT COALESCE(SUM(total - paid_amount),0) AS total, COUNT(*) AS count FROM sales_invoices WHERE company_id = ? AND status IN ('posted','partial')`,
      [cid]
    );
    const [[payable]] = await pool.query(
      `SELECT COALESCE(SUM(total - paid_amount),0) AS total, COUNT(*) AS count FROM purchase_invoices WHERE company_id = ? AND status IN ('posted','partial')`,
      [cid]
    );
    const [[cash]] = await pool.query(
      `SELECT COALESCE(SUM(balance),0) AS total FROM cash_bank_accounts WHERE company_id = ? AND is_active = 1`,
      [cid]
    );

    return success(res, {
      total_sales: parseFloat(sales.total),
      total_purchases: parseFloat(purchases.total),
      inventory_value: parseFloat(inventory.total),
      receivable: parseFloat(receivable.total),
      receivable_count: receivable.count,
      payable: parseFloat(payable.total),
      payable_count: payable.count,
      cash_balance: parseFloat(cash.total),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/sales-chart', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(invoice_date,'%Y-%m') AS period, SUM(total) AS total
     FROM sales_invoices WHERE company_id = ? AND status != 'cancelled'
     GROUP BY period ORDER BY period DESC LIMIT 12`,
    [req.user.company_id]
  );
  return success(res, rows.reverse());
});

router.get('/purchase-chart', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(invoice_date,'%Y-%m') AS period, SUM(total) AS total
     FROM purchase_invoices WHERE company_id = ? AND status != 'cancelled'
     GROUP BY period ORDER BY period DESC LIMIT 12`,
    [req.user.company_id]
  );
  return success(res, rows.reverse());
});

router.get('/top-products', auth, async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const [rows] = await pool.query(
    `SELECT p.id, p.sku, p.name, SUM(sii.quantity) AS total_qty, SUM(sii.subtotal) AS total_sales
     FROM sales_invoice_items sii
     JOIN sales_invoices si ON si.id = sii.sales_invoice_id
     JOIN products p ON p.id = sii.product_id
     WHERE si.company_id = ? AND si.status != 'cancelled'
     GROUP BY p.id ORDER BY total_qty DESC LIMIT ?`,
    [req.user.company_id, limit]
  );
  return success(res, rows);
});

router.get('/low-stock', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.sku, p.name, p.min_stock, COALESCE(SUM(ps.quantity),0) AS stock
     FROM products p
     LEFT JOIN product_stocks ps ON ps.product_id = p.id
     WHERE p.company_id = ? AND p.type = 'goods' AND p.is_active = 1 AND p.deleted_at IS NULL
     GROUP BY p.id HAVING stock <= p.min_stock ORDER BY stock ASC LIMIT 20`,
    [req.user.company_id]
  );
  return success(res, rows);
});

router.get('/activities', auth, async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const [rows] = await pool.query(
    `SELECT al.*, a.name AS admin_name FROM audit_logs al
     LEFT JOIN admins a ON a.id = al.admin_id
     WHERE al.company_id = ? ORDER BY al.created_at DESC LIMIT ?`,
    [req.user.company_id, limit]
  );
  return success(res, rows);
});

module.exports = router;
