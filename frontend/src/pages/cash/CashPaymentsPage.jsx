import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import CurrencyInput from '../../components/ui/CurrencyInput';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useCrudTable } from '../../hooks/useCrudTable';
import { get, post, put } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate } from '../../utils/formatters';

const emptyForm = () => ({ payment_date: new Date().toISOString().split('T')[0] });

export default function CashPaymentsPage() {
  const crud = useCrudTable(API_ENDPOINTS.CASH.PAYMENTS, API_ENDPOINTS.CASH.PAYMENT_DETAIL);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [coaList, setCoaList] = useState([]);

  useEffect(() => {
    Promise.all([get(API_ENDPOINTS.MASTER.CASH_BANK), get(API_ENDPOINTS.SETTINGS.COA, { limit: 100 })])
      .then(([a, c]) => { setAccounts(a.data); setCoaList(c.data); });
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = async (row) => {
    try {
      const res = await get(API_ENDPOINTS.CASH.PAYMENT_DETAIL(row.id));
      const data = res.data;
      setEditing(data);
      setForm({
        cash_bank_id: data.cash_bank_id,
        coa_id: data.coa_id,
        payment_date: data.payment_date?.split('T')[0] || data.payment_date,
        amount: parseFloat(data.amount),
        description: data.description || '',
      });
      setModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    }
  };

  const handleSave = async () => {
    if (!form.cash_bank_id || !form.coa_id || !form.payment_date || !form.amount) {
      toast.error('Lengkapi semua field wajib');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await put(API_ENDPOINTS.CASH.PAYMENT_DETAIL(editing.id), form);
        toast.success('Pembayaran berhasil diperbarui');
      } else {
        await post(API_ENDPOINTS.CASH.PAYMENTS, form);
        toast.success('Pembayaran berhasil');
      }
      setModal(false);
      crud.refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'payment_no', label: 'No.' },
    { key: 'account_name', label: 'Rekening' },
    { key: 'payment_date', label: 'Tanggal', render: (r) => formatDate(r.payment_date) },
    { key: 'amount', label: 'Nominal', render: (r) => formatCurrency(r.amount) },
    { key: 'description', label: 'Keterangan' },
  ];

  return (
    <div>
      <PageHeader title="Pembayaran Kas/Bank" onAdd={openCreate} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} onEdit={openEdit} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Pembayaran Kas/Bank' : 'Pembayaran Kas/Bank'}>
        <div className="space-y-4">
          <Select label="Rekening Kas/Bank" value={form.cash_bank_id || ''} onChange={(e) => setForm({ ...form, cash_bank_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
          <Select label="Akun Beban" value={form.coa_id || ''} onChange={(e) => setForm({ ...form, coa_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...coaList.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))]} />
          <Input label="Tanggal" type="date" value={form.payment_date || ''} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
          <CurrencyInput label="Nominal" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
          <Input label="Keterangan" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={handleSave} loading={saving}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
