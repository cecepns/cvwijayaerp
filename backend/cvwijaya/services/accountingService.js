const pool = require('../utils/db');
const { generateNumber } = require('./numberingService');

const getCoaByCode = async (conn, companyId, code) => {
  const [rows] = await conn.query(
    'SELECT id FROM chart_of_accounts WHERE company_id = ? AND code = ? AND deleted_at IS NULL',
    [companyId, code]
  );
  if (!rows.length) throw new Error(`Akun ${code} tidak ditemukan`);
  return rows[0].id;
};

const createJournal = async (conn, companyId, userId, { date, description, referenceType, referenceId, lines }) => {
  const totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error('Jurnal tidak balance');
  }

  const journalNo = await generateNumber(companyId, 'journal', conn);

  const [result] = await conn.query(
    `INSERT INTO journal_entries (company_id, journal_no, journal_date, reference_type, reference_id, description, total_debit, total_credit, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?)`,
    [companyId, journalNo, date, referenceType, referenceId, description, totalDebit, totalCredit, userId]
  );

  const journalId = result.insertId;

  for (const line of lines) {
    await conn.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, coa_id, description, debit, credit)
       VALUES (?, ?, ?, ?, ?)`,
      [journalId, line.coa_id, line.description || description, line.debit || 0, line.credit || 0]
    );
  }

  return journalId;
};

const updateCashBalance = async (conn, cashBankId, amount, type) => {
  const operator = type === 'in' ? '+' : '-';
  await conn.query(
    `UPDATE cash_bank_accounts SET balance = balance ${operator} ? WHERE id = ?`,
    [Math.abs(amount), cashBankId]
  );
};

const reverseJournalByReference = async (conn, companyId, userId, referenceType, referenceId) => {
  const [journals] = await conn.query(
    `SELECT * FROM journal_entries WHERE company_id = ? AND reference_type = ? AND reference_id = ? AND status = 'posted'`,
    [companyId, referenceType, referenceId]
  );

  for (const journal of journals) {
    const [lines] = await conn.query('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?', [journal.id]);
    await createJournal(conn, companyId, userId, {
      date: journal.journal_date,
      description: `Pembalikan: ${journal.description}`,
      referenceType: `${referenceType}_reversal`,
      referenceId: journal.id,
      lines: lines.map((l) => ({
        coa_id: l.coa_id,
        debit: l.credit,
        credit: l.debit,
        description: l.description,
      })),
    });
    await conn.query('UPDATE journal_entries SET status = ? WHERE id = ?', ['reversed', journal.id]);
  }
};

const journalPurchaseInvoice = async (conn, companyId, userId, invoice) => {
  const inventoryCoa = await getCoaByCode(conn, companyId, '1-3001');
  const payableCoa = await getCoaByCode(conn, companyId, '2-1001');

  return createJournal(conn, companyId, userId, {
    date: invoice.invoice_date,
    description: `Faktur Pembelian ${invoice.invoice_no}`,
    referenceType: 'purchase_invoice',
    referenceId: invoice.id,
    lines: [
      { coa_id: inventoryCoa, debit: invoice.subtotal, credit: 0 },
      { coa_id: payableCoa, debit: 0, credit: invoice.total },
    ],
  });
};

const journalPurchasePayment = async (conn, companyId, userId, payment, cashBankId) => {
  const payableCoa = await getCoaByCode(conn, companyId, '2-1001');
  const [cash] = await conn.query('SELECT coa_id FROM cash_bank_accounts WHERE id = ?', [cashBankId]);

  await createJournal(conn, companyId, userId, {
    date: payment.payment_date,
    description: `Pembayaran Pembelian ${payment.payment_no}`,
    referenceType: 'purchase_payment',
    referenceId: payment.id,
    lines: [
      { coa_id: payableCoa, debit: payment.amount, credit: 0 },
      { coa_id: cash[0].coa_id, debit: 0, credit: payment.amount },
    ],
  });

  await updateCashBalance(conn, cashBankId, payment.amount, 'out');
};

const journalSalesInvoice = async (conn, companyId, userId, invoice) => {
  const receivableCoa = await getCoaByCode(conn, companyId, '1-2001');
  const revenueCoa = await getCoaByCode(conn, companyId, '4-1001');

  return createJournal(conn, companyId, userId, {
    date: invoice.invoice_date,
    description: `Faktur Penjualan ${invoice.invoice_no}`,
    referenceType: 'sales_invoice',
    referenceId: invoice.id,
    lines: [
      { coa_id: receivableCoa, debit: invoice.total, credit: 0 },
      { coa_id: revenueCoa, debit: 0, credit: invoice.subtotal },
    ],
  });
};

const journalSalesReceipt = async (conn, companyId, userId, receipt, cashBankId) => {
  const receivableCoa = await getCoaByCode(conn, companyId, '1-2001');
  const [cash] = await conn.query('SELECT coa_id FROM cash_bank_accounts WHERE id = ?', [cashBankId]);

  await createJournal(conn, companyId, userId, {
    date: receipt.receipt_date,
    description: `Penerimaan Penjualan ${receipt.receipt_no}`,
    referenceType: 'sales_receipt',
    referenceId: receipt.id,
    lines: [
      { coa_id: cash[0].coa_id, debit: receipt.amount, credit: 0 },
      { coa_id: receivableCoa, debit: 0, credit: receipt.amount },
    ],
  });

  await updateCashBalance(conn, cashBankId, receipt.amount, 'in');
};

const journalCogs = async (conn, companyId, userId, issue, items) => {
  const cogsCoa = await getCoaByCode(conn, companyId, '5-1001');
  const inventoryCoa = await getCoaByCode(conn, companyId, '1-3001');
  const totalCogs = items.reduce((s, i) => s + parseFloat(i.quantity) * parseFloat(i.unit_cost), 0);

  if (totalCogs <= 0) return;

  return createJournal(conn, companyId, userId, {
    date: issue.issue_date,
    description: `HPP Barang Keluar ${issue.issue_no}`,
    referenceType: 'goods_issue',
    referenceId: issue.id,
    lines: [
      { coa_id: cogsCoa, debit: totalCogs, credit: 0 },
      { coa_id: inventoryCoa, debit: 0, credit: totalCogs },
    ],
  });
};

const journalStockAdjustment = async (conn, companyId, userId, adjustment, totalValue, isSurplus) => {
  const inventoryCoa = await getCoaByCode(conn, companyId, '1-3001');
  const expenseCoa = await getCoaByCode(conn, companyId, '5-2001');

  const lines = isSurplus
    ? [
        { coa_id: inventoryCoa, debit: totalValue, credit: 0 },
        { coa_id: expenseCoa, debit: 0, credit: totalValue },
      ]
    : [
        { coa_id: expenseCoa, debit: totalValue, credit: 0 },
        { coa_id: inventoryCoa, debit: 0, credit: totalValue },
      ];

  return createJournal(conn, companyId, userId, {
    date: adjustment.adjustment_date,
    description: `Penyesuaian Stok ${adjustment.adjustment_no}`,
    referenceType: 'stock_adjustment',
    referenceId: adjustment.id,
    lines,
  });
};

const journalCashReceipt = async (conn, companyId, userId, receipt) => {
  const [cash] = await conn.query('SELECT coa_id FROM cash_bank_accounts WHERE id = ?', [receipt.cash_bank_id]);

  await createJournal(conn, companyId, userId, {
    date: receipt.receipt_date,
    description: receipt.description || `Penerimaan Kas ${receipt.receipt_no}`,
    referenceType: 'cash_receipt',
    referenceId: receipt.id,
    lines: [
      { coa_id: cash[0].coa_id, debit: receipt.amount, credit: 0 },
      { coa_id: receipt.coa_id, debit: 0, credit: receipt.amount },
    ],
  });

  await updateCashBalance(conn, receipt.cash_bank_id, receipt.amount, 'in');
};

const journalCashPayment = async (conn, companyId, userId, payment) => {
  const [cash] = await conn.query('SELECT coa_id FROM cash_bank_accounts WHERE id = ?', [payment.cash_bank_id]);

  await createJournal(conn, companyId, userId, {
    date: payment.payment_date,
    description: payment.description || `Pembayaran Kas ${payment.payment_no}`,
    referenceType: 'cash_payment',
    referenceId: payment.id,
    lines: [
      { coa_id: payment.coa_id, debit: payment.amount, credit: 0 },
      { coa_id: cash[0].coa_id, debit: 0, credit: payment.amount },
    ],
  });

  await updateCashBalance(conn, payment.cash_bank_id, payment.amount, 'out');
};

const journalCashTransfer = async (conn, companyId, userId, transfer) => {
  const [fromAcc] = await conn.query('SELECT coa_id FROM cash_bank_accounts WHERE id = ?', [transfer.from_account_id]);
  const [toAcc] = await conn.query('SELECT coa_id FROM cash_bank_accounts WHERE id = ?', [transfer.to_account_id]);

  await createJournal(conn, companyId, userId, {
    date: transfer.transfer_date,
    description: transfer.description || `Transfer ${transfer.transfer_no}`,
    referenceType: 'cash_transfer',
    referenceId: transfer.id,
    lines: [
      { coa_id: toAcc[0].coa_id, debit: transfer.amount, credit: 0 },
      { coa_id: fromAcc[0].coa_id, debit: 0, credit: transfer.amount },
    ],
  });

  await updateCashBalance(conn, transfer.from_account_id, transfer.amount, 'out');
  await updateCashBalance(conn, transfer.to_account_id, transfer.amount, 'in');
};

const journalAdvanceDisburse = async (conn, companyId, userId, advance) => {
  const employeeCoa = await getCoaByCode(conn, companyId, '1-2002');
  const [cash] = await conn.query('SELECT coa_id FROM cash_bank_accounts WHERE id = ?', [advance.cash_bank_id]);

  await createJournal(conn, companyId, userId, {
    date: advance.request_date,
    description: `Pencairan Kasbon ${advance.advance_no}`,
    referenceType: 'employee_advance',
    referenceId: advance.id,
    lines: [
      { coa_id: employeeCoa, debit: advance.amount, credit: 0 },
      { coa_id: cash[0].coa_id, debit: 0, credit: advance.amount },
    ],
  });

  await updateCashBalance(conn, advance.cash_bank_id, advance.amount, 'out');
};

const journalAdvancePayment = async (conn, companyId, userId, advance, payment, cashBankId) => {
  const employeeCoa = await getCoaByCode(conn, companyId, '1-2002');

  if (payment.payment_method === 'cash' && cashBankId) {
    const [cash] = await conn.query('SELECT coa_id FROM cash_bank_accounts WHERE id = ?', [cashBankId]);
    await createJournal(conn, companyId, userId, {
      date: payment.payment_date,
      description: `Pelunasan Kasbon ${advance.advance_no}`,
      referenceType: 'employee_advance_payment',
      referenceId: payment.id,
      lines: [
        { coa_id: cash[0].coa_id, debit: payment.amount, credit: 0 },
        { coa_id: employeeCoa, debit: 0, credit: payment.amount },
      ],
    });
    await updateCashBalance(conn, cashBankId, payment.amount, 'in');
  } else {
    await createJournal(conn, companyId, userId, {
      date: payment.payment_date,
      description: `Pelunasan Kasbon (Potong Gaji) ${advance.advance_no}`,
      referenceType: 'employee_advance_payment',
      referenceId: payment.id,
      lines: [
        { coa_id: employeeCoa, debit: payment.amount, credit: 0 },
        { coa_id: employeeCoa, debit: 0, credit: payment.amount },
      ],
    });
  }
};

const journalPurchaseDownPayment = async (conn, companyId, userId, dp, cashBankId) => {
  const dpCoa = await getCoaByCode(conn, companyId, '1-4001');
  const [cash] = await conn.query('SELECT coa_id FROM cash_bank_accounts WHERE id = ?', [cashBankId]);

  await createJournal(conn, companyId, userId, {
    date: dp.dp_date,
    description: `Uang Muka Pembelian ${dp.dp_no}`,
    referenceType: 'purchase_down_payment',
    referenceId: dp.id,
    lines: [
      { coa_id: dpCoa, debit: dp.amount, credit: 0 },
      { coa_id: cash[0].coa_id, debit: 0, credit: dp.amount },
    ],
  });

  await updateCashBalance(conn, cashBankId, dp.amount, 'out');
};

const journalSalesDownPayment = async (conn, companyId, userId, dp, cashBankId) => {
  const dpCoa = await getCoaByCode(conn, companyId, '2-2001');
  const [cash] = await conn.query('SELECT coa_id FROM cash_bank_accounts WHERE id = ?', [cashBankId]);

  await createJournal(conn, companyId, userId, {
    date: dp.dp_date,
    description: `Uang Muka Penjualan ${dp.dp_no}`,
    referenceType: 'sales_down_payment',
    referenceId: dp.id,
    lines: [
      { coa_id: cash[0].coa_id, debit: dp.amount, credit: 0 },
      { coa_id: dpCoa, debit: 0, credit: dp.amount },
    ],
  });

  await updateCashBalance(conn, cashBankId, dp.amount, 'in');
};

module.exports = {
  createJournal,
  reverseJournalByReference,
  journalPurchaseInvoice,
  journalPurchasePayment,
  journalSalesInvoice,
  journalSalesReceipt,
  journalCogs,
  journalStockAdjustment,
  journalCashReceipt,
  journalCashPayment,
  journalCashTransfer,
  journalAdvanceDisburse,
  journalAdvancePayment,
  journalPurchaseDownPayment,
  journalSalesDownPayment,
  updateCashBalance,
};
