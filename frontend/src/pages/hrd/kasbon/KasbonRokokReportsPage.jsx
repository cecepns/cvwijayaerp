import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Download } from 'lucide-react';
import { get } from '../../../utils/request';
import { API_ENDPOINTS } from '../../../utils/endpoints';
import { formatCurrency } from '../../../utils/formatters';
import { exportToExcelSheets } from '../../../utils/exportExcel';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';

export default function KasbonRokokReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    get(API_ENDPOINTS.HRD.KASBON_ROKOK.REPORTS).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    if (!data) {
      toast.error('Data belum tersedia');
      return;
    }

    const hasData =
      (data.by_employee?.length || 0) +
      (data.by_item?.length || 0) +
      (data.stock?.length || 0) > 0 ||
      Number(data.summary?.total_transactions) > 0;

    if (!hasData) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    setExporting(true);
    try {
      exportToExcelSheets({
        filename: `laporan-kasbon-rokok-${new Date().toISOString().split('T')[0]}.xlsx`,
        sheets: [
          {
            sheetName: 'Ringkasan',
            rows: [
              { label: 'Total Transaksi', value: data.summary?.total_transactions || 0 },
              { label: 'Total Qty Terjual', value: data.summary?.total_qty || 0 },
              { label: 'Total Nilai Kasbon', value: formatCurrency(data.summary?.total_amount) },
            ],
            columns: [
              { key: 'label', label: 'Keterangan' },
              { key: 'value', label: 'Nilai' },
            ],
          },
          {
            sheetName: 'Per Karyawan',
            rows: data.by_employee || [],
            columns: [
              { key: 'employee_code', label: 'Kode Karyawan' },
              { key: 'name', label: 'Karyawan' },
              { key: 'count', label: 'Transaksi' },
              { key: 'total_qty', label: 'Qty' },
              { key: 'total_amount', label: 'Total', value: (r) => formatCurrency(r.total_amount) },
            ],
          },
          {
            sheetName: 'Per Barang',
            rows: data.by_item || [],
            columns: [
              { key: 'name', label: 'Nama Rokok' },
              { key: 'total_qty', label: 'Qty Terjual' },
              { key: 'total_amount', label: 'Total', value: (r) => formatCurrency(r.total_amount) },
              { key: 'current_stock', label: 'Stok Saat Ini' },
            ],
          },
          {
            sheetName: 'Stok Barang',
            rows: data.stock || [],
            columns: [
              { key: 'name', label: 'Nama Rokok' },
              { key: 'price', label: 'Harga', value: (r) => formatCurrency(r.price) },
              { key: 'stock', label: 'Stok' },
            ],
          },
        ],
      });
      toast.success('Laporan berhasil diekspor');
    } catch {
      toast.error('Gagal mengekspor laporan');
    } finally {
      setExporting(false);
    }
  };

  const summaryCards = [
    ['Total Transaksi', data?.summary?.total_transactions || 0],
    ['Total Qty Terjual', data?.summary?.total_qty || 0],
    ['Total Nilai Kasbon', formatCurrency(data?.summary?.total_amount)],
  ];

  return (
    <div>
      <Link to="/kasbon-rokok" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} /> Kembali ke Kasbon
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Laporan Kasbon Rokok</h1>
        <Button variant="secondary" loading={exporting} disabled={loading} onClick={handleExport}>
          <Download size={16} /> Export Excel
        </Button>
      </div>

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
