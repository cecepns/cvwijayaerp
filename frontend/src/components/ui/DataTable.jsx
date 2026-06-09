import { Pencil, Trash2 } from 'lucide-react';
import EmptyState from './EmptyState';
import Loading from './Loading';

export default function DataTable({ columns, data, loading, onEdit, onDelete, actions }) {
  if (loading) return <Loading />;
  if (!data?.length) return <EmptyState />;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">{col.label}</th>
            ))}
            {(onEdit || onDelete || actions) && <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id || idx} className="border-b last:border-0 hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {(onEdit || onDelete || actions) && (
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {actions?.(row)}
                    {onEdit && (
                      <button onClick={() => onEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                        <Pencil size={16} />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(row)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
