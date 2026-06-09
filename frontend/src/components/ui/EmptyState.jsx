import { Inbox } from 'lucide-react';

export default function EmptyState({ message = 'Belum ada data' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Inbox size={48} className="mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
