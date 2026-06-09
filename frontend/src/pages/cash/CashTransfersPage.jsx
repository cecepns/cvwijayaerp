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

export default function CashTransfersPage() {
  const crud = useCrudTable(API_ENDPOINTS.CASH.TRANSFERS, () => '');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [accounts, setAccounts] = useState([]);

  useEffect(() => { get(API_ENDPOINTS.MASTER.CASH_BANK).then((r) => setAccounts(r.data)); }, []);

  const columns = [
    { key: 'transfer_no', label: 'No.' },
    { key: 'from_account', label: 'Dari' },
    { key: 'to_account', label: 'Ke' },
    { key: 'transfer_date', label: 'Tanggal', render: (r) => formatDate(r.transfer_date) },
    { key: 'amount', label: 'Nominal', render: (r) => formatCurrency(r.amount) },
  ];

  return (
    <div>
      <PageHeader title="Transfer Kas/Bank" onAdd={() => { setForm({ transfer_date: new Date().toISOString().split('T')[0] }); setModal(true); }} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Transfer Kas/Bank">
        <div className="space-y-4">
          <Select label="Dari Rekening" value={form.from_account_id || ''} onChange={(e) => setForm({ ...form, from_account_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
          <Select label="Ke Rekening" value={form.to_account_id || ''} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
          <Input label="Tanggal" type="date" value={form.transfer_date || ''} onChange={(e) => setForm({ ...form, transfer_date: e.target.value })} />
          <Input label="Nominal" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Keterangan" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={async () => { await post(API_ENDPOINTS.CASH.TRANSFERS, form); toast.success('Transfer berhasil'); setModal(false); crud.refresh(); }}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
