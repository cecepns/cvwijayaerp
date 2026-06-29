import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../../components/ui/PageHeader';
import DataTable from '../../../components/ui/DataTable';
import Pagination from '../../../components/ui/Pagination';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import CurrencyInput from '../../../components/ui/CurrencyInput';
import Button from '../../../components/ui/Button';
import { useCrudTable } from '../../../hooks/useCrudTable';
import { get, post, put, del } from '../../../utils/request';
import { API_ENDPOINTS } from '../../../utils/endpoints';
import { formatCurrency } from '../../../utils/formatters';
import { exportToExcel } from '../../../utils/exportExcel';

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Nama Rokok' },
  { key: 'price', label: 'Harga', value: (r) => formatCurrency(r.price) },
  { key: 'stock', label: 'Stok' },
];

export default function KasbonRokokItemsPage() {
  const crud = useCrudTable(API_ENDPOINTS.HRD.KASBON_ROKOK.ITEMS, API_ENDPOINTS.HRD.KASBON_ROKOK.ITEM_DETAIL);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', stock: '' });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const openCreate = () => { setEditing(null); setForm({ name: '', price: '', stock: '' }); setModal(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ name: row.name, price: parseFloat(row.price), stock: parseInt(row.stock, 10) });
    setModal(true);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await get(API_ENDPOINTS.HRD.KASBON_ROKOK.ITEMS_EXPORT, { search: crud.search });
      if (!res.data?.length) { toast.error('Tidak ada data untuk diekspor'); return; }
      exportToExcel({
        rows: res.data,
        columns: EXPORT_COLUMNS,
        filename: `data-barang-rokok-${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Barang Rokok',
      });
      toast.success('Data berhasil diekspor');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengekspor');
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || form.price === '' || form.stock === '') {
      toast.error('Lengkapi semua field');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await put(API_ENDPOINTS.HRD.KASBON_ROKOK.ITEM_DETAIL(editing.id), form);
        toast.success('Barang diperbarui');
      } else {
        await post(API_ENDPOINTS.HRD.KASBON_ROKOK.ITEMS, form);
        toast.success('Barang ditambahkan');
      }
      setModal(false);
      crud.refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus ${row.name}?`)) return;
    try {
      await del(API_ENDPOINTS.HRD.KASBON_ROKOK.ITEM_DETAIL(row.id));
      toast.success('Barang dihapus');
      crud.refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  const columns = [
    { key: 'name', label: 'Nama Rokok' },
    { key: 'price', label: 'Harga', render: (r) => formatCurrency(r.price) },
    { key: 'stock', label: 'Stok' },
  ];

  return (
    <div>
      <Link to="/kasbon-rokok" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} /> Kembali ke Kasbon
      </Link>
      <PageHeader title="Data Barang Rokok" onAdd={openCreate} addLabel="Tambah Barang" search={crud.search} onSearchChange={crud.setSearch} onExport={handleExport} exportLoading={exporting} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} onEdit={openEdit} onDelete={handleDelete} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Barang Rokok' : 'Tambah Barang Rokok'}>
        <div className="space-y-4">
          <Input label="Nama Rokok" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <CurrencyInput label="Harga" value={form.price} onChange={(price) => setForm({ ...form, price })} />
          <Input label="Stok" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button loading={saving} onClick={handleSave}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
