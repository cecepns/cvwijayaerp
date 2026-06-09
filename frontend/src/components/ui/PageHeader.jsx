import { Plus, Search } from 'lucide-react';
import Button from './Button';

export default function PageHeader({ title, subtitle, onAdd, addLabel = 'Tambah', search, onSearchChange }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {onSearchChange && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari..."
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        {onAdd && (
          <Button onClick={onAdd}><Plus size={16} /> {addLabel}</Button>
        )}
      </div>
    </div>
  );
}
