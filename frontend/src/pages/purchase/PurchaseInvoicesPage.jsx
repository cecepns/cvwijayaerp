import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, Wallet } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import InvoiceFormModal from '../../components/forms/InvoiceFormModal';
import { useCrudTable } from '../../hooks/useCrudTable';
import { post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate, statusBadge } from '../../utils/formatters';
import Button from '../../components/ui/Button';

export default function PurchaseInvoicesPage() {
  const navigate = useNavigate();
  const crud = useCrudTable(API_ENDPOINTS.PURCHASE.INVOICES, API_ENDPOINTS.PURCHASE.INVOICE_DETAIL);
  const [invoiceModal, setInvoiceModal] = useState(false);

  const getOutstanding = (row) => parseFloat(row.total) - parseFloat(row.paid_amount || 0);

  const handlePost = async (row) => {
    if (!window.confirm(`Post faktur ${row.invoice_no}?`)) return;
    try {
      await post(API_ENDPOINTS.PURCHASE.INVOICE_POST(row.id));
      toast.success('Faktur berhasil diposting');
      crud.refresh();
    } catch (err) { toast.error(err.response?.data?.message); }
  };

  const handlePay = (row) => {
    const outstanding = getOutstanding(row);
    if (outstanding <= 0) {
      toast.error('Faktur ini sudah lunas');
      return;
    }
    navigate('/purchase/payments', { state: { fromInvoice: { id: row.id } } });
  };

  const columns = [
    { key: 'invoice_no', label: 'No. Faktur' },
    { key: 'supplier_name', label: 'Pemasok' },
    { key: 'invoice_date', label: 'Tanggal', render: (r) => formatDate(r.invoice_date) },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'paid_amount', label: 'Dibayar', render: (r) => formatCurrency(r.paid_amount) },
    { key: 'status', label: 'Status', render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>{r.status}</span> },
  ];

  return (
    <div>
      <PageHeader title="Faktur Pembelian" onAdd={() => setInvoiceModal(true)} addLabel="Buat Faktur" search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} actions={(row) => (
        <div className="flex items-center gap-1 justify-end">
          {row.status === 'draft' && (
            <Button size="sm" variant="success" onClick={() => handlePost(row)}><CheckCircle size={14} /> Post</Button>
          )}
          {['posted', 'partial'].includes(row.status) && getOutstanding(row) > 0 && (
            <Button size="sm" variant="primary" onClick={() => handlePay(row)}>
              <Wallet size={14} /> Bayar
            </Button>
          )}
        </div>
      )} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <InvoiceFormModal open={invoiceModal} onClose={() => setInvoiceModal(false)} type="purchase" saving={crud.saving}
        onSave={async (form) => { await post(API_ENDPOINTS.PURCHASE.INVOICES, form); toast.success('Faktur dibuat'); setInvoiceModal(false); crud.refresh(); }} />
    </div>
  );
}
