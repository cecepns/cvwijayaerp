import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { useCrudTable } from '../../hooks/useCrudTable';
import { post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatDate, statusBadge } from '../../utils/formatters';

export default function StockAdjustmentsPage() {
  const crud = useCrudTable(API_ENDPOINTS.INVENTORY.STOCK_ADJUSTMENTS, () => '');

  const columns = [
    { key: 'adjustment_no', label: 'No. Penyesuaian' },
    { key: 'warehouse_name', label: 'Gudang' },
    { key: 'adjustment_date', label: 'Tanggal', render: (r) => formatDate(r.adjustment_date) },
    { key: 'status', label: 'Status', render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(r.status)}`}>{r.status}</span> },
  ];

  return (
    <div>
      <PageHeader title="Penyesuaian Stok" subtitle="Penyesuaian dibuat otomatis dari selisih stok opname" />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} actions={(row) => row.status === 'pending' && (
        <Button size="sm" variant="success" onClick={async () => { await post(API_ENDPOINTS.INVENTORY.STOCK_ADJUSTMENT_APPROVE(row.id)); toast.success('Penyesuaian disetujui'); crud.refresh(); }}>Approve</Button>
      )} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
    </div>
  );
}
