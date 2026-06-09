import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import { useCrudTable } from '../../hooks/useCrudTable';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function StockOverviewPage() {
  const crud = useCrudTable(API_ENDPOINTS.INVENTORY.STOCKS, () => '');

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Nama Barang' },
    { key: 'total_stock', label: 'Stok', render: (r) => formatNumber(r.total_stock) },
    { key: 'min_stock', label: 'Stok Min' },
    { key: 'stock_value', label: 'Nilai Stok', render: (r) => formatCurrency(r.stock_value) },
    { key: 'status', label: 'Status', render: (r) => parseFloat(r.total_stock) <= parseFloat(r.min_stock) ? <span className="text-red-600 font-medium">Rendah</span> : <span className="text-green-600">Aman</span> },
  ];

  return (
    <div>
      <PageHeader title="Data Barang (Stok Realtime)" search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
    </div>
  );
}
