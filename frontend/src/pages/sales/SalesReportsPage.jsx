import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportExcel';
import { printReport } from '../../utils/printReport';
import DateRangeFilter from '../../components/ui/DateRangeFilter';
import ReportToolbar from '../../components/ui/ReportToolbar';
import InvoiceDrilldownModal from '../../components/ui/InvoiceDrilldownModal';
import Loading from '../../components/ui/Loading';

const defaultDateFrom = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
};
const defaultDateTo = () => new Date().toISOString().split('T')[0];

export default function SalesReportsPage() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [drilldown, setDrilldown] = useState({ open: false, title: '', invoices: [], loading: false });

  const fetchData = useCallback(() => {
    setLoading(true);
    get(API_ENDPOINTS.SALES.REPORTS, { date_from: dateFrom, date_to: dateTo })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const periodLabel = `Dari ${dateFrom} s/d ${dateTo}`;

  const handleDrilldown = async (customer) => {
    setDrilldown({ open: true, title: `Faktur - ${customer.name}`, invoices: [], loading: true });
    try {
      const res = await get(API_ENDPOINTS.SALES.REPORT_INVOICES, {
        customer_id: customer.id, date_from: dateFrom, date_to: dateTo,
      });
      setDrilldown((d) => ({ ...d, invoices: res.data, loading: false }));
    } catch {
      toast.error('Gagal memuat detail faktur');
      setDrilldown((d) => ({ ...d, loading: false }));
    }
  };

  const handleExportExcel = () => {
    if (!data?.by_customer?.length) { toast.error('Tidak ada data'); return; }
    setExporting(true);
    try {
      exportToExcel({
        filename: `laporan-penjualan-${dateFrom}-${dateTo}.xlsx`,
        sheetName: 'Penjualan per Pelanggan',
        rows: data.by_customer,
        columns: [
          { key: 'name', label: 'Pelanggan' },
          { key: 'count', label: 'Jumlah Faktur' },
          { key: 'total', label: 'Total', value: (r) => formatCurrency(r.total) },
        ],
      });
      toast.success('Berhasil diekspor');
    } catch { toast.error('Gagal mengekspor'); }
    finally { setExporting(false); }
  };

  const handlePrint = () => {
    if (!data?.by_customer?.length) { toast.error('Tidak ada data'); return; }
    printReport({
      title: 'Laporan Penjualan per Pelanggan',
      subtitle: periodLabel,
      headers: ['Pelanggan', 'Jumlah Faktur', 'Total'],
      rows: data.by_customer.map((c) => [c.name, c.count, formatCurrency(c.total)]),
    });
  };

  if (loading && !data) return <Loading />;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Laporan Penjualan</h1>
        <ReportToolbar onExportExcel={handleExportExcel} onPrint={handlePrint} exportLoading={exporting} disabled={loading} />
      </div>

      <div className="bg-white rounded-xl border p-4 mb-6">
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
        <p className="text-xs text-slate-400 mt-2">{periodLabel}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {[
          ['Total Faktur', data?.summary?.total_invoices],
          ['Total Penjualan', formatCurrency(data?.summary?.total_amount)],
          ['Total Diterima', formatCurrency(data?.summary?.total_paid)],
          ['Piutang', formatCurrency(data?.summary?.total_outstanding)],
        ].map(([label, val]) => (
          <div key={label} className="bg-white rounded-xl border p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-xl font-bold mt-1">{val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold mb-4">Top Pelanggan</h3>
        {data?.by_customer?.length ? data.by_customer.map((c) => (
          <button
            key={c.id || c.name}
            type="button"
            onClick={() => handleDrilldown(c)}
            className="w-full flex justify-between py-2 border-b text-sm hover:bg-slate-50 px-2 rounded transition text-left"
          >
            <span>{c.name} ({c.count} faktur)</span>
            <span className="font-medium text-blue-600">{formatCurrency(c.total)}</span>
          </button>
        )) : <p className="text-sm text-slate-400">Belum ada data</p>}
      </div>

      <InvoiceDrilldownModal
        open={drilldown.open}
        onClose={() => setDrilldown((d) => ({ ...d, open: false }))}
        title={drilldown.title}
        loading={drilldown.loading}
        invoices={drilldown.invoices}
      />
    </div>
  );
}
