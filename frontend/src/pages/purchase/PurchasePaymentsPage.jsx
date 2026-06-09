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

export default function PurchasePaymentsPage() {
  const crud = useCrudTable(API_ENDPOINTS.PURCHASE.PAYMENTS, () => '');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ allocations: [] });
  const [suppliers, setSuppliers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    get(API_ENDPOINTS.MASTER.CASH_BANK).then((r) => setAccounts(r.data));
    get(API_ENDPOINTS.MASTER.SUPPLIERS, { limit: 100 }).then((r) => setSuppliers(r.data));
  }, []);

  const loadInvoices = async (supplierId) => {
    const res = await get(API_ENDPOINTS.PURCHASE.INVOICES, { supplier_id: supplierId, status: 'posted', limit: 50 });
    setInvoices(res.data.filter((i) => parseFloat(i.total) > parseFloat(i.paid_amount)));
  };

  const columns = [
    { key: 'payment_no', label: 'No. Pembayaran' },
    { key: 'supplier_name', label: 'Pemasok' },
    { key: 'payment_date', label: 'Tanggal', render: (r) => formatDate(r.payment_date) },
    { key: 'amount', label: 'Nominal', render: (r) => formatCurrency(r.amount) },
  ];

  return (
    <div>
      <PageHeader title="Pembayaran Pembelian" onAdd={() => { setForm({ payment_date: new Date().toISOString().split('T')[0], allocations: [] }); setModal(true); }} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Pembayaran Pembelian" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Pemasok" value={form.supplier_id || ''} onChange={(e) => { setForm({ ...form, supplier_id: e.target.value }); loadInvoices(e.target.value); }}
            options={[{ value: '', label: 'Pilih' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
          <Input label="Tanggal" type="date" value={form.payment_date || ''} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
          <Input label="Nominal" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label="Kas/Bank" value={form.cash_bank_id || ''} onChange={(e) => setForm({ ...form, cash_bank_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
        </div>
        {invoices.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Alokasi ke Faktur</p>
            {invoices.map((inv) => (
              <label key={inv.id} className="flex items-center gap-2 text-sm py-1">
                <input type="checkbox" onChange={(e) => {
                  const allocs = e.target.checked
                    ? [...(form.allocations || []), { invoice_id: inv.id, amount: parseFloat(inv.total) - parseFloat(inv.paid_amount) }]
                    : (form.allocations || []).filter((a) => a.invoice_id !== inv.id);
                  setForm({ ...form, allocations: allocs });
                }} />
                {inv.invoice_no} — Sisa: {formatCurrency(parseFloat(inv.total) - parseFloat(inv.paid_amount))}
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={async () => { await post(API_ENDPOINTS.PURCHASE.PAYMENTS, form); toast.success('Pembayaran berhasil'); setModal(false); crud.refresh(); }}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
