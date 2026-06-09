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

export default function EmployeesPage() {
  const crud = useCrudTable(API_ENDPOINTS.MASTER.EMPLOYEES, API_ENDPOINTS.MASTER.EMPLOYEE_DETAIL);
  const [form, setForm] = useState({});

  const openModal = (row) => {
    setForm(row || { employee_code: '', name: '', email: '', phone: '', position: '', salary: 0, is_active: true });
    row ? crud.openEdit(row) : crud.openCreate();
  };

  const columns = [
    { key: 'employee_code', label: 'Kode' },
    { key: 'name', label: 'Nama' },
    { key: 'position', label: 'Jabatan' },
    { key: 'department_name', label: 'Departemen' },
    { key: 'salary', label: 'Gaji', render: (r) => formatCurrency(r.salary) },
    { key: 'is_active', label: 'Status', render: (r) => r.is_active ? 'Aktif' : 'Nonaktif' },
  ];

  return (
    <div>
      <PageHeader title="Data Karyawan" onAdd={() => openModal(null)} search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} onEdit={openModal} onDelete={crud.remove} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={crud.modalOpen} onClose={crud.closeModal} title={crud.editing ? 'Edit Karyawan' : 'Tambah Karyawan'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Kode Karyawan" value={form.employee_code || ''} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} />
          <Input label="Nama" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Telepon" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Jabatan" value={form.position || ''} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <Input label="Gaji" type="number" value={form.salary || ''} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={crud.closeModal}>Batal</Button>
          <Button loading={crud.saving} onClick={() => crud.save(form)}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
