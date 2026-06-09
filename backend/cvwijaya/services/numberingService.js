const pool = require('../utils/db');

const prefixes = {
  purchase_invoice: 'PB',
  sales_invoice: 'PJ',
  purchase_payment: 'PP',
  sales_receipt: 'RP',
  goods_receipt: 'BM',
  goods_issue: 'BK',
  stock_opname: 'SO',
  stock_adjustment: 'SA',
  cash_receipt: 'KM',
  cash_payment: 'KK',
  cash_transfer: 'TF',
  purchase_dp: 'DPB',
  sales_dp: 'DPJ',
  employee_advance: 'KSB',
  journal: 'JRN',
};

const generateNumber = async (companyId, type, connection = pool) => {
  const prefix = prefixes[type] || 'DOC';
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;

  const tableMap = {
    purchase_invoice: 'purchase_invoices',
    sales_invoice: 'sales_invoices',
    purchase_payment: 'purchase_payments',
    sales_receipt: 'sales_receipts',
    goods_receipt: 'goods_receipts',
    goods_issue: 'goods_issues',
    stock_opname: 'stock_opnames',
    stock_adjustment: 'stock_adjustments',
    cash_receipt: 'cash_receipts',
    cash_payment: 'cash_payments',
    cash_transfer: 'cash_transfers',
    purchase_dp: 'purchase_down_payments',
    sales_dp: 'sales_down_payments',
    employee_advance: 'employee_advances',
    journal: 'journal_entries',
  };

  const colMap = {
    journal: 'journal_no',
    purchase_dp: 'dp_no',
    sales_dp: 'dp_no',
    employee_advance: 'advance_no',
    purchase_payment: 'payment_no',
    sales_receipt: 'receipt_no',
    goods_receipt: 'receipt_no',
    goods_issue: 'issue_no',
    stock_opname: 'opname_no',
    stock_adjustment: 'adjustment_no',
    cash_receipt: 'receipt_no',
    cash_payment: 'payment_no',
    cash_transfer: 'transfer_no',
    purchase_invoice: 'invoice_no',
    sales_invoice: 'invoice_no',
  };

  const table = tableMap[type];
  const col = colMap[type];
  const [rows] = await connection.query(
    `SELECT ${col} AS num FROM ${table} WHERE company_id = ? AND ${col} LIKE ? ORDER BY id DESC LIMIT 1`,
    [companyId, pattern]
  );

  let seq = 1;
  if (rows.length) {
    const parts = rows[0].num.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
};

module.exports = { generateNumber };
