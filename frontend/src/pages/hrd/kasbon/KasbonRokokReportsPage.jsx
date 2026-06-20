import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { get } from '../../../utils/request';
import { API_ENDPOINTS } from '../../../utils/endpoints';
import { formatCurrency } from '../../../utils/formatters';
import DataTable from '../../../components/ui/DataTable';

export default function KasbonRokokReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(API_ENDPOINTS.HRD.KASBON_ROKOK.REPORTS).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const summaryCards = [
    ['Total Transaksi', data?.summary?.total_transactions || 0],
    ['Total Qty Terjual', data?.summary?.total_qty || 0],
    ['Total Nilai Kasbon', formatCurrency(data?.summary?.total_amount)],
  ];

  return (
    <div>
      <Link to="/hrd/kasbon" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} /> Kembali ke Kasbon
      </Link>
      <h1 className="text-2xl font-bold mb-6">Laporan Kasbon Rokok</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {summaryCards.map(([label, value]) => (
          <div key={label} className="bg-white border rounded-xl p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-3">Per Karyawan</h2>
      <DataTable loading={loading} columns={[
        { key: 'name', label: 'Karyawan' },
        { key: 'count', label: 'Transaksi' },
        { key: 'total_qty', label: 'Qty' },
        { key: 'total_amount', label: 'Total', render: (r) => formatCurrency(r.total_amount) },
      ]} data={data?.by_employee || []} />

      <h2 className="font-semibold mb-3 mt-8">Per Barang</h2>
      <DataTable loading={loading} columns={[
        { key: 'name', label: 'Nama Rokok' },
        { key: 'total_qty', label: 'Qty Terjual' },
        { key: 'total_amount', label: 'Total', render: (r) => formatCurrency(r.total_amount) },
        { key: 'current_stock', label: 'Stok Saat Ini' },
      ]} data={data?.by_item || []} />

      <h2 className="font-semibold mb-3 mt-8">Stok Barang</h2>
      <DataTable loading={loading} columns={[
        { key: 'name', label: 'Nama Rokok' },
        { key: 'price', label: 'Harga', render: (r) => formatCurrency(r.price) },
        { key: 'stock', label: 'Stok' },
      ]} data={data?.stock || []} />
    </div>
  );
}
