import { useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import { useCrudTable } from '../../hooks/useCrudTable';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportExcel';

const EXPORT_COLUMNS = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Nama Barang' },
  { key: 'unit', label: 'Satuan' },
  { key: 'total_stock', label: 'Stok', value: (r) => formatNumber(r.total_stock) },
  { key: 'min_stock', label: 'Stok Min' },
  { key: 'stock_value', label: 'Nilai Stok', value: (r) => formatNumber(r.stock_value) },
];

export default function StockOverviewPage() {
  const crud = useCrudTable(API_ENDPOINTS.INVENTORY.STOCKS, () => '');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await get(API_ENDPOINTS.INVENTORY.STOCKS_EXPORT, { search: crud.search });
      if (!res.data?.length) { toast.error('Tidak ada data untuk diekspor'); return; }
      exportToExcel({
        rows: res.data,
        columns: EXPORT_COLUMNS,
        filename: `data-barang-${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Data Barang',
      });
      toast.success('Data berhasil diekspor');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengekspor data');
    } finally {
      setExporting(false);
    }
  };

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
      <PageHeader title="Data Barang (Stok Realtime)" search={crud.search} onSearchChange={crud.setSearch} onExport={handleExport} exportLoading={exporting} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
    </div>
  );
}
