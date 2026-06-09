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
import { formatCurrency, formatDate, statusBadge } from '../../utils/formatters';

export default function SalesDownPaymentsPage() {
  const crud = useCrudTable(API_ENDPOINTS.SALES.DOWN_PAYMENTS, () => '');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    Promise.all([get(API_ENDPOINTS.MASTER.CUSTOMERS, { limit: 100 }), get(API_ENDPOINTS.MASTER.CASH_BANK)])
      .then(([c, a]) => { setCustomers(c.data); setAccounts(a.data); });
  }, []);

  const columns = [
    { key: 'dp_no', label: 'No. DP' },
    { key: 'customer_name', label: 'Pelanggan' },
    { key: 'dp_date', label: 'Tanggal', render: (r) => formatDate(r.dp_date) },
    { key: 'amount', label: 'Nominal', render: (r) => formatCurrency(r.amount) },
    { key: 'status', label: 'Status', render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(r.status)}`}>{r.status}</span> },
  ];

  return (
    <div>
      <PageHeader title="Uang Muka Penjualan" onAdd={() => { setForm({ dp_date: new Date().toISOString().split('T')[0] }); setModal(true); }} search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} actions={(row) => row.status === 'draft' && (
        <Button size="sm" onClick={async () => { await post(API_ENDPOINTS.SALES.DOWN_PAYMENT_POST(row.id)); toast.success('DP diposting'); crud.refresh(); }}>Post</Button>
      )} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Uang Muka Penjualan">
        <div className="space-y-4">
          <Select label="Pelanggan" value={form.customer_id || ''} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} />
          <Input label="Tanggal" type="date" value={form.dp_date || ''} onChange={(e) => setForm({ ...form, dp_date: e.target.value })} />
          <Input label="Nominal" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label="Kas/Bank" value={form.cash_bank_id || ''} onChange={(e) => setForm({ ...form, cash_bank_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={async () => { await post(API_ENDPOINTS.SALES.DOWN_PAYMENTS, form); toast.success('DP dibuat'); setModal(false); crud.refresh(); }}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
