import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../../components/ui/PageHeader';
import DataTable from '../../../components/ui/DataTable';
import Pagination from '../../../components/ui/Pagination';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import CurrencyInput from '../../../components/ui/CurrencyInput';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import { useCrudTable } from '../../../hooks/useCrudTable';
import { get, post } from '../../../utils/request';
import { API_ENDPOINTS } from '../../../utils/endpoints';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/exportExcel';

const EXPORT_COLUMNS = [
  { key: 'transaction_no', label: 'No. Transaksi' },
  { key: 'transaction_date', label: 'Tanggal', value: (r) => formatDate(r.transaction_date) },
  { key: 'category', label: 'Kategori' },
  { key: 'employee_code', label: 'Kode Karyawan' },
  { key: 'employee_name', label: 'Karyawan' },
  { key: 'item_name', label: 'Nama Rokok' },
  { key: 'quantity', label: 'Jumlah' },
  { key: 'unit_price', label: 'Harga', value: (r) => formatCurrency(r.unit_price) },
  { key: 'total', label: 'Total', value: (r) => formatCurrency(r.total) },
  { key: 'notes', label: 'Catatan' },
];

const getToday = () => new Date().toISOString().split('T')[0];

export default function KasbonRokokTransactionsPage() {
  const crud = useCrudTable(API_ENDPOINTS.HRD.KASBON_ROKOK.TRANSACTIONS, () => '');
  const [modal, setModal] = useState(false);
  const [lastDate, setLastDate] = useState(getToday());
  const [form, setForm] = useState({ transaction_date: getToday(), category: 'mingguan' });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    Promise.all([
      get(API_ENDPOINTS.MASTER.EMPLOYEES, { limit: 100 }),
      get(API_ENDPOINTS.HRD.KASBON_ROKOK.ITEMS, { limit: 100 }),
    ]).then(([e, i]) => { setEmployees(e.data); setItems(i.data); });
  }, []);

  const selectedItem = items.find((i) => i.id == form.item_id);
  const lineTotal = selectedItem && form.quantity
    ? parseFloat(selectedItem.price) * parseInt(form.quantity, 10)
    : 0;

  const handleItemChange = (itemId) => {
    const item = items.find((i) => i.id == itemId);
    setForm({ ...form, item_id: itemId, unit_price: item ? parseFloat(item.price) : '' });
  };

  const openModal = () => {
    setForm({ transaction_date: lastDate, category: form.category || 'mingguan' });
    setModal(true);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await get(API_ENDPOINTS.HRD.KASBON_ROKOK.TRANSACTIONS_EXPORT, { search: crud.search });
      if (!res.data?.length) { toast.error('Tidak ada data untuk diekspor'); return; }
      exportToExcel({
        rows: res.data,
        columns: EXPORT_COLUMNS,
        filename: `transaksi-kasbon-rokok-${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Transaksi Kasbon',
      });
      toast.success('Data berhasil diekspor');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengekspor');
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (!form.employee_id || !form.item_id || !form.quantity) {
      toast.error('Lengkapi karyawan, barang, dan jumlah');
      return;
    }
    setSaving(true);
    try {
      await post(API_ENDPOINTS.HRD.KASBON_ROKOK.TRANSACTIONS, form);
      toast.success('Transaksi kasbon berhasil');
      setLastDate(form.transaction_date);
      setModal(false);
      setForm({ transaction_date: form.transaction_date, category: form.category || 'mingguan' });
      crud.refresh();
      get(API_ENDPOINTS.HRD.KASBON_ROKOK.ITEMS, { limit: 100 }).then((r) => setItems(r.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'transaction_no', label: 'No. Transaksi' },
    { key: 'transaction_date', label: 'Tanggal', render: (r) => formatDate(r.transaction_date) },
    { key: 'category', label: 'Kategori', render: (r) => r.category === 'bulanan' ? 'Bulanan' : 'Mingguan' },
    { key: 'employee_name', label: 'Karyawan' },
    { key: 'item_name', label: 'Nama Rokok' },
    { key: 'quantity', label: 'Jumlah' },
    { key: 'unit_price', label: 'Harga', render: (r) => formatCurrency(r.unit_price) },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
  ];

  return (
    <div>
      <Link to="/kasbon-rokok" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} /> Kembali ke Kasbon
      </Link>
      <PageHeader
        title="Transaksi Kasbon Rokok"
        onAdd={openModal}
        addLabel="Transaksi Baru"
        search={crud.search}
        onSearchChange={crud.setSearch}
        onExport={handleExport}
        exportLoading={exporting}
      />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Transaksi Kasbon Rokok" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Karyawan" value={form.employee_id || ''} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...employees.map((e) => ({ value: e.id, label: `${e.employee_code} - ${e.name}` }))]} />
          <Input label="Tanggal" type="date" value={form.transaction_date || ''} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
          <Select label="Kategori Kasbon" value={form.category || 'mingguan'} onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={[{ value: 'mingguan', label: 'Mingguan' }, { value: 'bulanan', label: 'Bulanan' }]} />
          <Select label="Nama Rokok" value={form.item_id || ''} onChange={(e) => handleItemChange(e.target.value)}
            options={[{ value: '', label: 'Pilih' }, ...items.map((i) => ({ value: i.id, label: `${i.name} (Stok: ${i.stock})` }))]} />
          <Input label="Jumlah" type="number" min="1" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <CurrencyInput label="Harga" value={form.unit_price ?? selectedItem?.price ?? ''} onChange={(unit_price) => setForm({ ...form, unit_price })} />
          <div className="flex items-end col-span-2">
            <div>
              <p className="text-sm text-slate-500 mb-1">Total</p>
              <p className="text-lg font-bold">{formatCurrency(lineTotal)}</p>
            </div>
          </div>
        </div>
        <Input label="Catatan" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-4" />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button loading={saving} onClick={handleSave}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
