import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { put } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' });
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await put(API_ENDPOINTS.AUTH.PROFILE, profile);
      toast.success('Profile diperbarui');
    } catch (err) { toast.error(err.response?.data?.message); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    try {
      await put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, passwords);
      toast.success('Password diubah');
      setPasswords({ current_password: '', new_password: '' });
    } catch (err) { toast.error(err.response?.data?.message); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Profile Saya</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Informasi Akun</h3>
          <div className="space-y-4">
            <Input label="Nama" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Input label="Email" value={user?.email || ''} disabled />
            <Input label="Telepon" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <Input label="Role" value={user?.role_name || ''} disabled />
            <Button loading={saving} onClick={saveProfile}>Simpan Profile</Button>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Ganti Password</h3>
          <div className="space-y-4">
            <Input label="Password Lama" type="password" value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} />
            <Input label="Password Baru" type="password" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} />
            <Button onClick={changePassword}>Ubah Password</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
