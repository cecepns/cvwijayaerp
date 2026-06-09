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
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';

export default function AdminManagementPage() {
  const crud = useCrudTable(API_ENDPOINTS.SETTINGS.ADMINS, API_ENDPOINTS.SETTINGS.ADMIN_DETAIL);
  const [form, setForm] = useState({});
  const [roles, setRoles] = useState([]);

  useEffect(() => { get(API_ENDPOINTS.SETTINGS.ROLES).then((r) => setRoles(r.data)); }, []);

  const openModal = (row) => {
    setForm(row || { name: '', email: '', password: '', role_id: '', phone: '', is_active: true });
    row ? crud.openEdit(row) : crud.openCreate();
  };

  const columns = [
    { key: 'name', label: 'Nama' },
    { key: 'email', label: 'Email' },
    { key: 'role_name', label: 'Role' },
    { key: 'is_active', label: 'Status', render: (r) => r.is_active ? 'Aktif' : 'Nonaktif' },
  ];

  return (
    <div>
      <PageHeader title="Manajemen Admin" onAdd={() => openModal(null)} search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} onEdit={openModal} onDelete={crud.remove} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={crud.modalOpen} onClose={crud.closeModal} title={crud.editing ? 'Edit Admin' : 'Tambah Admin'}>
        <div className="grid grid-cols-1 gap-4">
          <Input label="Nama" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label={crud.editing ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'} type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="Role" value={form.role_id || ''} onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            options={[{ value: '', label: 'Pilih Role' }, ...roles.map((r) => ({ value: r.id, label: r.name }))]} />
          <Input label="Telepon" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={crud.closeModal}>Batal</Button>
          <Button loading={crud.saving} onClick={() => crud.save(form)}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
