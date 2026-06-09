import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Package, Wallet, AlertTriangle } from 'lucide-react';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Loading from '../../components/ui/Loading';

function KpiCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}><Icon size={22} /></div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get(API_ENDPOINTS.DASHBOARD.SUMMARY),
      get(API_ENDPOINTS.DASHBOARD.TOP_PRODUCTS, { limit: 5 }),
      get(API_ENDPOINTS.DASHBOARD.LOW_STOCK),
      get(API_ENDPOINTS.DASHBOARD.ACTIVITIES, { limit: 8 }),
    ]).then(([s, t, l, a]) => {
      setSummary(s.data);
      setTopProducts(t.data);
      setLowStock(l.data);
      setActivities(a.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Penjualan" value={formatCurrency(summary?.total_sales)} icon={TrendingUp} color="bg-green-100 text-green-600" />
        <KpiCard title="Total Pembelian" value={formatCurrency(summary?.total_purchases)} icon={TrendingDown} color="bg-orange-100 text-orange-600" />
        <KpiCard title="Nilai Persediaan" value={formatCurrency(summary?.inventory_value)} icon={Package} color="bg-blue-100 text-blue-600" />
        <KpiCard title="Saldo Kas/Bank" value={formatCurrency(summary?.cash_balance)} icon={Wallet} color="bg-indigo-100 text-indigo-600" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <KpiCard title="Piutang Belum Lunas" value={formatCurrency(summary?.receivable)} icon={TrendingUp} color="bg-amber-100 text-amber-600" />
        <KpiCard title="Hutang Belum Lunas" value={formatCurrency(summary?.payable)} icon={TrendingDown} color="bg-red-100 text-red-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4">Top Produk Terjual</h3>
          {topProducts.length ? topProducts.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm"><span className="font-bold text-blue-700 mr-2">{i + 1}.</span>{p.name}</span>
              <span className="text-sm font-medium">{p.total_qty} unit</span>
            </div>
          )) : <p className="text-sm text-slate-400">Belum ada data</p>}
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Barang Hampir Habis</h3>
          {lowStock.length ? lowStock.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm">{p.sku} - {p.name}</span>
              <span className="text-sm text-red-600 font-medium">Stok: {p.stock} / Min: {p.min_stock}</span>
            </div>
          )) : <p className="text-sm text-slate-400">Semua stok aman</p>}
        </div>
      </div>
      <div className="bg-white rounded-xl border p-5 mt-6">
        <h3 className="font-semibold mb-4">Aktivitas Terbaru</h3>
        {activities.length ? activities.map((a) => (
          <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
            <span><span className="font-medium">{a.admin_name}</span> — {a.action} {a.module}</span>
            <span className="text-slate-400">{formatDate(a.created_at)}</span>
          </div>
        )) : <p className="text-sm text-slate-400">Belum ada aktivitas</p>}
      </div>
    </div>
  );
}
