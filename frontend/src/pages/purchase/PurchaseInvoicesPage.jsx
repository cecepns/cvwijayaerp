import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
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
  const crud = useCrudTable(API_ENDPOINTS.PURCHASE.INVOICES, API_ENDPOINTS.PURCHASE.INVOICE_DETAIL);
  const [invoiceModal, setInvoiceModal] = useState(false);

  const handlePost = async (row) => {
    if (!window.confirm(`Post faktur ${row.invoice_no}?`)) return;
    try {
      await post(API_ENDPOINTS.PURCHASE.INVOICE_POST(row.id));
      toast.success('Faktur berhasil diposting');
      crud.refresh();
    } catch (err) { toast.error(err.response?.data?.message); }
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
      <DataTable columns={columns} data={crud.data} loading={crud.loading} actions={(row) => row.status === 'draft' && (
        <Button size="sm" variant="success" onClick={() => handlePost(row)}><CheckCircle size={14} /> Post</Button>
      )} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <InvoiceFormModal open={invoiceModal} onClose={() => setInvoiceModal(false)} type="purchase" saving={crud.saving}
        onSave={async (form) => { await post(API_ENDPOINTS.PURCHASE.INVOICES, form); toast.success('Faktur dibuat'); setInvoiceModal(false); crud.refresh(); }} />
    </div>
  );
}
