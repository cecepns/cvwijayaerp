import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { get, post, put } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Loading from '../../components/ui/Loading';

export default function RoleManagementPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', permission_ids: [] });
  const [editing, setEditing] = useState(null);

  const fetchData = () => {
    Promise.all([get(API_ENDPOINTS.SETTINGS.ROLES), get(API_ENDPOINTS.SETTINGS.PERMISSIONS)])
      .then(([r, p]) => { setRoles(r.data); setPermissions(p.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openEdit = (role) => {
    setEditing(role);
    setForm({ name: role.name, slug: role.slug, description: role.description, permission_ids: role.permissions?.map((p) => p.id) || [] });
    setModalOpen(true);
  };

  const togglePerm = (id) => {
    setForm((f) => ({
      ...f,
      permission_ids: f.permission_ids.includes(id) ? f.permission_ids.filter((x) => x !== id) : [...f.permission_ids, id],
    }));
  };

  const save = async () => {
    try {
      if (editing) await put(API_ENDPOINTS.SETTINGS.ROLE_DETAIL(editing.id), form);
      else await post(API_ENDPOINTS.SETTINGS.ROLES, form);
      toast.success('Role berhasil disimpan');
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const grouped = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  if (loading) return <Loading />;
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Role Admin</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: '', slug: '', permission_ids: [] }); setModalOpen(true); }}>Tambah Role</Button>
      </div>
      <div className="grid gap-4">
        {roles.map((role) => (
          <div key={role.id} className="bg-white rounded-xl border p-5 flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{role.name} <span className="text-sm text-slate-400">({role.slug})</span></h3>
              <p className="text-sm text-slate-500 mt-1">{role.permissions?.length || 0} permission</p>
            </div>
            {!role.is_system && <Button variant="secondary" size="sm" onClick={() => openEdit(role)}>Edit</Button>}
          </div>
        ))}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Role' : 'Tambah Role'} size="lg">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input label="Nama Role" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editing} />
        </div>
        <p className="font-medium mb-2">Permissions</p>
        <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-3">
          {Object.entries(grouped).map(([mod, perms]) => (
            <div key={mod}>
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">{mod}</p>
              {perms.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                  <input type="checkbox" checked={form.permission_ids.includes(p.id)} onChange={() => togglePerm(p.id)} />
                  {p.key_name}
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
