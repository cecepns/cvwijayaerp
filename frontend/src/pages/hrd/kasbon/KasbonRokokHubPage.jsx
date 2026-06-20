import { Link } from 'react-router-dom';
import { Users, Package, ArrowLeftRight, BarChart3 } from 'lucide-react';

const cards = [
  { path: '/master/employees', label: 'Karyawan', icon: Users, color: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100' },
  { path: '/hrd/kasbon-rokok/items', label: 'Barang', icon: Package, color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  { path: '/hrd/kasbon-rokok/transactions', label: 'Transaksi', icon: ArrowLeftRight, color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
  { path: '/hrd/kasbon-rokok/reports', label: 'Laporan', icon: BarChart3, color: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100' },
];

export default function KasbonRokokHubPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Kasbon Rokok</h1>
      <p className="text-slate-500 text-sm mb-8">Kelola kasbon pembelian rokok karyawan</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl">
        {cards.map(({ path, label, icon: Icon, color }) => (
          <Link key={path} to={path} className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 transition ${color}`}>
            <Icon size={36} strokeWidth={1.5} />
            <span className="font-semibold text-lg">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
