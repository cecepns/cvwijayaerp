const pool = require('../utils/db');

const updateStock = async (conn, companyId, productId, warehouseId, qty, unitCost, movementType, refType, refId, userId, date) => {
  const [stocks] = await conn.query(
    'SELECT * FROM product_stocks WHERE product_id = ? AND warehouse_id = ?',
    [productId, warehouseId]
  );

  let newQty, newAvgCost;
  const current = stocks[0] || { quantity: 0, avg_cost: 0 };

  if (movementType === 'in') {
    newQty = parseFloat(current.quantity) + parseFloat(qty);
    newAvgCost =
      newQty > 0
        ? (parseFloat(current.quantity) * parseFloat(current.avg_cost) + parseFloat(qty) * parseFloat(unitCost)) / newQty
        : parseFloat(unitCost);
  } else {
    newQty = parseFloat(current.quantity) - parseFloat(qty);
    newAvgCost = parseFloat(current.avg_cost);
    if (newQty < 0) throw new Error('Stok tidak mencukupi');
  }

  if (stocks.length) {
    await conn.query(
      'UPDATE product_stocks SET quantity = ?, avg_cost = ? WHERE product_id = ? AND warehouse_id = ?',
      [newQty, newAvgCost, productId, warehouseId]
    );
  } else {
    await conn.query(
      'INSERT INTO product_stocks (company_id, product_id, warehouse_id, quantity, avg_cost) VALUES (?, ?, ?, ?, ?)',
      [companyId, productId, warehouseId, newQty, newAvgCost]
    );
  }

  await conn.query(
    `INSERT INTO stock_movements (company_id, product_id, warehouse_id, movement_type, reference_type, reference_id, quantity, unit_cost, balance_after, movement_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [companyId, productId, warehouseId, movementType, refType, refId, qty, unitCost, newQty, date, userId]
  );

  return { quantity: newQty, avg_cost: newAvgCost };
};

const getStock = async (productId, warehouseId) => {
  const [rows] = await pool.query(
    'SELECT quantity, avg_cost FROM product_stocks WHERE product_id = ? AND warehouse_id = ?',
    [productId, warehouseId]
  );
  return rows[0] || { quantity: 0, avg_cost: 0 };
};

module.exports = { updateStock, getStock };
