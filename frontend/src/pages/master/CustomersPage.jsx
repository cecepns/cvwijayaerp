import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useCrudTable } from '../../hooks/useCrudTable';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency } from '../../utils/formatters';

export default function CustomersPage() {
  const crud = useCrudTable(API_ENDPOINTS.MASTER.CUSTOMERS, API_ENDPOINTS.MASTER.CUSTOMER_DETAIL);
  const [form, setForm] = useState({});

  const openModal = (row) => {
    setForm(row || { code: '', name: '', email: '', phone: '', address: '', credit_limit: 0, payment_term: 30, is_active: true });
    row ? crud.openEdit(row) : crud.openCreate();
  };

  const columns = [
    { key: 'code', label: 'Kode' },
    { key: 'name', label: 'Nama' },
    { key: 'phone', label: 'Telepon' },
    { key: 'credit_limit', label: 'Limit Kredit', render: (r) => formatCurrency(r.credit_limit) },
    { key: 'payment_term', label: 'Termin (hari)' },
    { key: 'is_active', label: 'Status', render: (r) => r.is_active ? 'Aktif' : 'Nonaktif' },
  ];

  return (
    <div>
      <PageHeader title="Data Pelanggan" onAdd={() => openModal(null)} search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} onEdit={openModal} onDelete={crud.remove} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={crud.modalOpen} onClose={crud.closeModal} title={crud.editing ? 'Edit Pelanggan' : 'Tambah Pelanggan'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Kode" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Input label="Nama" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Telepon" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Limit Kredit" type="number" value={form.credit_limit || ''} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} />
          <Input label="Termin Bayar (hari)" type="number" value={form.payment_term || ''} onChange={(e) => setForm({ ...form, payment_term: e.target.value })} />
          <div className="sm:col-span-2"><Input label="Alamat" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={crud.closeModal}>Batal</Button>
          <Button loading={crud.saving} onClick={() => crud.save(form)}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
