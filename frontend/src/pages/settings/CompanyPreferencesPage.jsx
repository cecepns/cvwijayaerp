import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { get, put } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';

export default function CompanyPreferencesPage() {
  const [company, setCompany] = useState({});
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get(API_ENDPOINTS.SETTINGS.COMPANY).then((res) => {
      setCompany(res.data.company || {});
      setPreferences(res.data.preferences || {});
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await put(API_ENDPOINTS.SETTINGS.COMPANY, { company, preferences });
      toast.success('Preferensi berhasil disimpan');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Preferensi Perusahaan</h1>
      <div className="bg-white rounded-xl border p-6 max-w-3xl">
        <h3 className="font-semibold mb-4">Data Perusahaan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Input label="Nama Perusahaan" value={company.name || ''} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
          <Input label="NPWP" value={company.npwp || ''} onChange={(e) => setCompany({ ...company, npwp: e.target.value })} />
          <Input label="Telepon" value={company.phone || ''} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
          <Input label="Email" value={company.email || ''} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
          <div className="sm:col-span-2"><Input label="Alamat" value={company.address || ''} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></div>
        </div>
        <h3 className="font-semibold mb-4">Pengaturan Sistem</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Mata Uang" value={preferences.currency || 'IDR'} onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })} />
          <Input label="Pajak (%)" type="number" value={preferences.tax_rate || ''} onChange={(e) => setPreferences({ ...preferences, tax_rate: e.target.value })} />
          <Input label="Limit Auto Approve Kasbon" type="number" value={preferences.advance_approval_limit || ''} onChange={(e) => setPreferences({ ...preferences, advance_approval_limit: e.target.value })} />
        </div>
        <div className="mt-6"><Button loading={saving} onClick={handleSave}>Simpan Perubahan</Button></div>
      </div>
    </div>
  );
}
