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

export default function CashPaymentsPage() {
  const crud = useCrudTable(API_ENDPOINTS.CASH.PAYMENTS, () => '');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [coaList, setCoaList] = useState([]);

  useEffect(() => {
    Promise.all([get(API_ENDPOINTS.MASTER.CASH_BANK), get(API_ENDPOINTS.SETTINGS.COA, { limit: 100 })])
      .then(([a, c]) => { setAccounts(a.data); setCoaList(c.data); });
  }, []);

  const columns = [
    { key: 'payment_no', label: 'No.' },
    { key: 'account_name', label: 'Rekening' },
    { key: 'payment_date', label: 'Tanggal', render: (r) => formatDate(r.payment_date) },
    { key: 'amount', label: 'Nominal', render: (r) => formatCurrency(r.amount) },
    { key: 'description', label: 'Keterangan' },
  ];

  return (
    <div>
      <PageHeader title="Pembayaran Kas/Bank" onAdd={() => { setForm({ payment_date: new Date().toISOString().split('T')[0] }); setModal(true); }} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Pembayaran Kas/Bank">
        <div className="space-y-4">
          <Select label="Rekening Kas/Bank" value={form.cash_bank_id || ''} onChange={(e) => setForm({ ...form, cash_bank_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
          <Select label="Akun Beban" value={form.coa_id || ''} onChange={(e) => setForm({ ...form, coa_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...coaList.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))]} />
          <Input label="Tanggal" type="date" value={form.payment_date || ''} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
          <Input label="Nominal" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Keterangan" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={async () => { await post(API_ENDPOINTS.CASH.PAYMENTS, form); toast.success('Pembayaran berhasil'); setModal(false); crud.refresh(); }}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
