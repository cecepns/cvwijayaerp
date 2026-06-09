import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useCrudTable } from '../../hooks/useCrudTable';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency } from '../../utils/formatters';

export default function ProductsPage() {
  const crud = useCrudTable(API_ENDPOINTS.MASTER.PRODUCTS, API_ENDPOINTS.MASTER.PRODUCT_DETAIL);
  const [form, setForm] = useState({});

  const openModal = (row) => {
    setForm(row || { sku: '', name: '', type: 'goods', unit: 'pcs', purchase_price: 0, selling_price: 0, min_stock: 0, is_active: true });
    row ? crud.openEdit(row) : crud.openCreate();
  };

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Nama' },
    { key: 'type', label: 'Tipe', render: (r) => r.type === 'goods' ? 'Barang' : 'Jasa' },
    { key: 'unit', label: 'Satuan' },
    { key: 'purchase_price', label: 'Harga Beli', render: (r) => formatCurrency(r.purchase_price) },
    { key: 'selling_price', label: 'Harga Jual', render: (r) => formatCurrency(r.selling_price) },
    { key: 'min_stock', label: 'Stok Min' },
  ];

  return (
    <div>
      <PageHeader title="Barang & Jasa" onAdd={() => openModal(null)} search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} onEdit={openModal} onDelete={crud.remove} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={crud.modalOpen} onClose={crud.closeModal} title={crud.editing ? 'Edit Barang' : 'Tambah Barang'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="SKU" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Input label="Nama" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Tipe" value={form.type || 'goods'} onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={[{ value: 'goods', label: 'Barang' }, { value: 'service', label: 'Jasa' }]} />
          <Input label="Satuan" value={form.unit || 'pcs'} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <Input label="Harga Beli" type="number" value={form.purchase_price || ''} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
          <Input label="Harga Jual" type="number" value={form.selling_price || ''} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
          <Input label="Stok Minimum" type="number" value={form.min_stock || ''} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={crud.closeModal}>Batal</Button>
          <Button loading={crud.saving} onClick={() => crud.save(form)}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
