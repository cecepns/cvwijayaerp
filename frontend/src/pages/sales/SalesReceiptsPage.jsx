import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useCrudTable } from '../../hooks/useCrudTable';
import { get, post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function SalesReceiptsPage() {
  const crud = useCrudTable(API_ENDPOINTS.SALES.RECEIPTS, () => '');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ allocations: [] });
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    get(API_ENDPOINTS.MASTER.CASH_BANK).then((r) => setAccounts(r.data));
    get(API_ENDPOINTS.MASTER.CUSTOMERS, { limit: 100 }).then((r) => setCustomers(r.data));
  }, []);

  const columns = [
    { key: 'receipt_no', label: 'No. Penerimaan' },
    { key: 'customer_name', label: 'Pelanggan' },
    { key: 'receipt_date', label: 'Tanggal', render: (r) => formatDate(r.receipt_date) },
    { key: 'amount', label: 'Nominal', render: (r) => formatCurrency(r.amount) },
  ];

  return (
    <div>
      <PageHeader title="Penerimaan Penjualan" onAdd={() => { setForm({ receipt_date: new Date().toISOString().split('T')[0], allocations: [] }); setModal(true); }} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Penerimaan Penjualan" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Pelanggan" value={form.customer_id || ''} onChange={async (e) => {
            setForm({ ...form, customer_id: e.target.value });
            const res = await get(API_ENDPOINTS.SALES.INVOICES, { limit: 50 });
            setInvoices(res.data.filter((i) => i.customer_id == e.target.value && parseFloat(i.total) > parseFloat(i.paid_amount)));
          }} options={[{ value: '', label: 'Pilih' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} />
          <Input label="Tanggal" type="date" value={form.receipt_date || ''} onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} />
          <Input label="Nominal" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label="Kas/Bank" value={form.cash_bank_id || ''} onChange={(e) => setForm({ ...form, cash_bank_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
        </div>
        {invoices.map((inv) => (
          <label key={inv.id} className="flex items-center gap-2 text-sm py-1 mt-2">
            <input type="checkbox" onChange={(e) => {
              const allocs = e.target.checked ? [...(form.allocations || []), { invoice_id: inv.id, amount: parseFloat(inv.total) - parseFloat(inv.paid_amount) }]
                : (form.allocations || []).filter((a) => a.invoice_id !== inv.id);
              setForm({ ...form, allocations: allocs });
            }} />
            {inv.invoice_no} — Sisa: {formatCurrency(parseFloat(inv.total) - parseFloat(inv.paid_amount))}
          </label>
        ))}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={async () => { await post(API_ENDPOINTS.SALES.RECEIPTS, form); toast.success('Penerimaan berhasil'); setModal(false); crud.refresh(); }}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
