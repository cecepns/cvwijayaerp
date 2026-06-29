const express = require('express');
const pool = require('../utils/db');
const { success, paginated, error } = require('../utils/response');
const { auth } = require('../middleware/auth');
const { getPagination, buildSearchWhere } = require('../utils/helpers');
const { generateNumber } = require('../services/numberingService');
const { updateStock, getStock } = require('../services/stockService');
const { journalStockAdjustment } = require('../services/accountingService');

const router = express.Router();

router.get('/goods-receipts', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['gr.receipt_no', 'w.name'], search);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM goods_receipts gr JOIN warehouses w ON w.id=gr.warehouse_id WHERE gr.company_id=?${clause}`,
    [req.user.company_id, ...params]
  );
  const [rows] = await pool.query(
    `SELECT gr.*, w.name AS warehouse_name FROM goods_receipts gr JOIN warehouses w ON w.id=gr.warehouse_id
     WHERE gr.company_id=?${clause} ORDER BY gr.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.get('/goods-receipts/export', auth, async (req, res) => {
  const { search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['gr.receipt_no', 'w.name', 'p.sku', 'p.name'], search);
  const [rows] = await pool.query(
    `SELECT gr.receipt_no, gr.receipt_date, w.name AS warehouse_name, gr.status, gr.notes,
            p.sku, p.name AS product_name, gri.quantity, gri.unit_cost,
            (gri.quantity * gri.unit_cost) AS subtotal
     FROM goods_receipts gr
     JOIN warehouses w ON w.id = gr.warehouse_id
     JOIN goods_receipt_items gri ON gri.goods_receipt_id = gr.id
     JOIN products p ON p.id = gri.product_id
     WHERE gr.company_id = ?${clause}
     ORDER BY gr.receipt_date DESC, gr.receipt_no DESC, p.name ASC`,
    [req.user.company_id, ...params]
  );
  return success(res, rows);
});

router.get('/goods-issues/export', auth, async (req, res) => {
  const { search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['gi.issue_no', 'w.name', 'p.sku', 'p.name'], search);
  const [rows] = await pool.query(
    `SELECT gi.issue_no, gi.issue_date, w.name AS warehouse_name, gi.status, gi.notes,
            p.sku, p.name AS product_name, gii.quantity, gii.unit_cost,
            (gii.quantity * gii.unit_cost) AS subtotal
     FROM goods_issues gi
     JOIN warehouses w ON w.id = gi.warehouse_id
     JOIN goods_issue_items gii ON gii.goods_issue_id = gi.id
     JOIN products p ON p.id = gii.product_id
     WHERE gi.company_id = ?${clause}
     ORDER BY gi.issue_date DESC, gi.issue_no DESC, p.name ASC`,
    [req.user.company_id, ...params]
  );
  return success(res, rows);
});

router.get('/stocks/export', auth, async (req, res) => {
  const { search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['p.sku', 'p.name'], search);
  const [rows] = await pool.query(
    `SELECT p.sku, p.name, p.unit, p.min_stock,
      COALESCE(SUM(ps.quantity), 0) AS total_stock,
      COALESCE(SUM(ps.quantity * ps.avg_cost), 0) AS stock_value
     FROM products p
     LEFT JOIN product_stocks ps ON ps.product_id = p.id
     WHERE p.company_id = ? AND p.deleted_at IS NULL AND p.type = 'goods'${clause}
     GROUP BY p.id
     ORDER BY p.name ASC`,
    [req.user.company_id, ...params]
  );
  return success(res, rows);
});

router.get('/goods-issues', auth, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM goods_issues WHERE company_id=?', [req.user.company_id]);
  const [rows] = await pool.query(
    `SELECT gi.*, w.name AS warehouse_name FROM goods_issues gi JOIN warehouses w ON w.id=gi.warehouse_id
     WHERE gi.company_id=? ORDER BY gi.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/goods-receipts', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const receiptNo = await generateNumber(req.user.company_id, 'goods_receipt', conn);
    const [r] = await conn.query(
      `INSERT INTO goods_receipts (company_id, receipt_no, warehouse_id, receipt_date, notes, status, created_by) VALUES (?, ?, ?, ?, ?, 'posted', ?)`,
      [req.user.company_id, receiptNo, b.warehouse_id, b.receipt_date, b.notes, req.user.id]
    );
    for (const item of b.items || []) {
      await conn.query('INSERT INTO goods_receipt_items (goods_receipt_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)',
        [r.insertId, item.product_id, item.quantity, item.unit_cost]);
      await updateStock(conn, req.user.company_id, item.product_id, b.warehouse_id,
        item.quantity, item.unit_cost, 'in', 'goods_receipt', r.insertId, req.user.id, b.receipt_date);
    }
    await conn.commit();
    return success(res, { id: r.insertId, receipt_no: receiptNo }, 'Barang masuk berhasil', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.post('/goods-issues', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const issueNo = await generateNumber(req.user.company_id, 'goods_issue', conn);
    const [r] = await conn.query(
      `INSERT INTO goods_issues (company_id, issue_no, warehouse_id, issue_date, notes, status, created_by) VALUES (?, ?, ?, ?, ?, 'posted', ?)`,
      [req.user.company_id, issueNo, b.warehouse_id, b.issue_date, b.notes, req.user.id]
    );
    for (const item of b.items || []) {
      const stock = await getStock(item.product_id, b.warehouse_id);
      await conn.query('INSERT INTO goods_issue_items (goods_issue_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)',
        [r.insertId, item.product_id, item.quantity, stock.avg_cost]);
      await updateStock(conn, req.user.company_id, item.product_id, b.warehouse_id,
        item.quantity, stock.avg_cost, 'out', 'goods_issue', r.insertId, req.user.id, b.issue_date);
    }
    await conn.commit();
    return success(res, { id: r.insertId, issue_no: issueNo }, 'Barang keluar berhasil', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.get('/stock-opnames', auth, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM stock_opnames WHERE company_id=?', [req.user.company_id]);
  const [rows] = await pool.query(
    `SELECT so.*, w.name AS warehouse_name FROM stock_opnames so JOIN warehouses w ON w.id=so.warehouse_id
     WHERE so.company_id=? ORDER BY so.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.get('/stock-opnames/:id', auth, async (req, res) => {
  const [op] = await pool.query('SELECT * FROM stock_opnames WHERE id=?', [req.params.id]);
  if (!op.length) return error(res, 'Not found', 404);
  const [items] = await pool.query(
    `SELECT soi.*, p.sku, p.name AS product_name FROM stock_opname_items soi JOIN products p ON p.id=soi.product_id WHERE soi.stock_opname_id=?`,
    [req.params.id]
  );
  op[0].items = items;
  return success(res, op[0]);
});

router.post('/stock-opnames', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const opnameNo = await generateNumber(req.user.company_id, 'stock_opname', conn);
    const [r] = await conn.query(
      `INSERT INTO stock_opnames (company_id, opname_no, warehouse_id, opname_date, notes, status, created_by) VALUES (?, ?, ?, ?, ?, 'in_progress', ?)`,
      [req.user.company_id, opnameNo, b.warehouse_id, b.opname_date, b.notes, req.user.id]
    );

    const [products] = await conn.query(
      `SELECT p.id, COALESCE(ps.quantity,0) AS system_qty, COALESCE(ps.avg_cost,0) AS avg_cost
       FROM products p LEFT JOIN product_stocks ps ON ps.product_id=p.id AND ps.warehouse_id=?
       WHERE p.company_id=? AND p.type='goods' AND p.is_active=1 AND p.deleted_at IS NULL`,
      [b.warehouse_id, req.user.company_id]
    );

    for (const p of products) {
      const physical = b.items?.find((i) => i.product_id === p.id)?.physical_qty ?? p.system_qty;
      const diff = parseFloat(physical) - parseFloat(p.system_qty);
      await conn.query(
        `INSERT INTO stock_opname_items (stock_opname_id, product_id, system_qty, physical_qty, difference_qty, unit_cost) VALUES (?, ?, ?, ?, ?, ?)`,
        [r.insertId, p.id, p.system_qty, physical, diff, p.avg_cost]
      );
    }
    await conn.commit();
    return success(res, { id: r.insertId, opname_no: opnameNo }, 'Stok opname berhasil dibuat', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.post('/stock-opnames/:id/complete', auth, async (req, res) => {
  await pool.query('UPDATE stock_opnames SET status=?, completed_at=NOW() WHERE id=? AND company_id=?', ['completed', req.params.id, req.user.company_id]);
  return success(res, null, 'Stok opname selesai');
});

router.get('/stock-adjustments', auth, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM stock_adjustments WHERE company_id=?', [req.user.company_id]);
  const [rows] = await pool.query(
    `SELECT sa.*, w.name AS warehouse_name FROM stock_adjustments sa JOIN warehouses w ON w.id=sa.warehouse_id
     WHERE sa.company_id=? ORDER BY sa.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.post('/stock-adjustments', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const adjNo = await generateNumber(req.user.company_id, 'stock_adjustment', conn);
    const [r] = await conn.query(
      `INSERT INTO stock_adjustments (company_id, adjustment_no, stock_opname_id, warehouse_id, adjustment_date, notes, status, created_by) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [req.user.company_id, adjNo, b.stock_opname_id, b.warehouse_id, b.adjustment_date, b.notes, req.user.id]
    );

    let totalValue = 0;
    let isSurplus = true;
    for (const item of b.items || []) {
      const sub = Math.abs(parseFloat(item.difference_qty)) * parseFloat(item.unit_cost);
      totalValue += sub;
      if (parseFloat(item.difference_qty) < 0) isSurplus = false;
      await conn.query(
        `INSERT INTO stock_adjustment_items (stock_adjustment_id, product_id, difference_qty, unit_cost, subtotal) VALUES (?, ?, ?, ?, ?)`,
        [r.insertId, item.product_id, item.difference_qty, item.unit_cost, sub]
      );
    }
    await conn.commit();
    return success(res, { id: r.insertId, adjustment_no: adjNo }, 'Penyesuaian stok diajukan', 201);
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.post('/stock-adjustments/:id/approve', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [adj] = await conn.query('SELECT * FROM stock_adjustments WHERE id=? AND company_id=?', [req.params.id, req.user.company_id]);
    if (!adj.length || adj[0].status !== 'pending') return error(res, 'Data tidak valid');

    const [items] = await conn.query('SELECT * FROM stock_adjustment_items WHERE stock_adjustment_id=?', [adj[0].id]);
    let totalValue = 0;
    let isSurplus = true;

    for (const item of items) {
      const sub = Math.abs(parseFloat(item.difference_qty)) * parseFloat(item.unit_cost);
      totalValue += sub;
      if (parseFloat(item.difference_qty) < 0) isSurplus = false;
      const movType = parseFloat(item.difference_qty) > 0 ? 'in' : 'out';
      await updateStock(conn, req.user.company_id, item.product_id, adj[0].warehouse_id,
        Math.abs(item.difference_qty), item.unit_cost, movType, 'stock_adjustment', adj[0].id, req.user.id, adj[0].adjustment_date);
    }

    if (totalValue > 0) {
      await journalStockAdjustment(conn, req.user.company_id, req.user.id, adj[0], totalValue, isSurplus);
    }

    await conn.query('UPDATE stock_adjustments SET status=?, approved_by=?, approved_at=NOW() WHERE id=?', ['posted', req.user.id, adj[0].id]);
    await conn.commit();
    return success(res, null, 'Penyesuaian stok disetujui');
  } catch (err) { await conn.rollback(); return error(res, err.message, 500); }
  finally { conn.release(); }
});

router.get('/stock-movements', auth, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM stock_movements WHERE company_id=?', [req.user.company_id]);
  const [rows] = await pool.query(
    `SELECT sm.*, p.sku, p.name AS product_name, w.name AS warehouse_name FROM stock_movements sm
     JOIN products p ON p.id=sm.product_id JOIN warehouses w ON w.id=sm.warehouse_id
     WHERE sm.company_id=? ORDER BY sm.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.company_id, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

router.get('/stocks', auth, async (req, res) => {
  const { page, limit, offset, search } = getPagination(req.query);
  const { clause, params } = buildSearchWhere(['p.sku', 'p.name'], search);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) AS total FROM products p WHERE p.company_id=? AND p.type='goods' AND p.deleted_at IS NULL${clause}`,
    [req.user.company_id, ...params]
  );
  const [rows] = await pool.query(
    `SELECT p.id, p.sku, p.name, p.min_stock, COALESCE(SUM(ps.quantity),0) AS total_stock
     FROM products p LEFT JOIN product_stocks ps ON ps.product_id=p.id
     WHERE p.company_id=? AND p.type='goods' AND p.deleted_at IS NULL${clause}
     GROUP BY p.id ORDER BY p.name LIMIT ? OFFSET ?`,
    [req.user.company_id, ...params, limit, offset]
  );
  return paginated(res, rows, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

module.exports = router;
