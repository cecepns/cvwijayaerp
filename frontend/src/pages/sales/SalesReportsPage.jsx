import { useEffect, useState } from 'react';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency } from '../../utils/formatters';
import Loading from '../../components/ui/Loading';

export default function SalesReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { get(API_ENDPOINTS.SALES.REPORTS).then((r) => setData(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Laporan Penjualan</h1>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {[
          ['Total Faktur', data?.summary?.total_invoices],
          ['Total Penjualan', formatCurrency(data?.summary?.total_amount)],
          ['Total Diterima', formatCurrency(data?.summary?.total_paid)],
          ['Piutang', formatCurrency(data?.summary?.total_outstanding)],
        ].map(([label, val]) => (
          <div key={label} className="bg-white rounded-xl border p-5"><p className="text-sm text-slate-500">{label}</p><p className="text-xl font-bold mt-1">{val}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-4">Top Pelanggan</h3>
        {data?.by_customer?.map((c) => (
          <div key={c.name} className="flex justify-between py-2 border-b text-sm"><span>{c.name}</span><span className="font-medium">{formatCurrency(c.total)}</span></div>
        ))}
      </div>
    </div>
  );
}
