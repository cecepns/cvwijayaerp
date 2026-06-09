import { useEffect, useState } from 'react';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency } from '../../utils/formatters';
import Loading from '../../components/ui/Loading';

export default function AdvanceReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { get(API_ENDPOINTS.HRD.REPORTS).then((r) => setData(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Laporan Kasbon</h1>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {[
          ['Total Kasbon', data?.summary?.total],
          ['Total Nominal', formatCurrency(data?.summary?.total_amount)],
          ['Total Dilunasi', formatCurrency(data?.summary?.total_paid)],
          ['Outstanding', formatCurrency(data?.summary?.outstanding)],
        ].map(([label, val]) => (
          <div key={label} className="bg-white rounded-xl border p-5"><p className="text-sm text-slate-500">{label}</p><p className="text-xl font-bold mt-1">{val}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-4">Per Karyawan</h3>
        {data?.by_employee?.map((e) => (
          <div key={e.employee_code} className="flex justify-between py-2 border-b text-sm">
            <span>{e.employee_code} - {e.name}</span>
            <span className="font-medium text-red-600">{formatCurrency(e.outstanding)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
