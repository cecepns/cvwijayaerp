import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({ pagination, onPageChange, onLimitChange }) {
  if (!pagination) return null;
  const { page, limit, total, totalPages } = pagination;
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span>Per halaman:</span>
        <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="ml-2">Total: {total}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={16} /> Prev
        </Button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? 'bg-blue-700 text-white' : 'hover:bg-slate-100'}`}
          >
            {p}
          </button>
        ))}
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Next <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
