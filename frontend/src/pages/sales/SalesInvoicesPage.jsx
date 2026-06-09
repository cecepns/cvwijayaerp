import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import InvoiceFormModal from '../../components/forms/InvoiceFormModal';
import Button from '../../components/ui/Button';
import { useCrudTable } from '../../hooks/useCrudTable';
import { post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate, statusBadge } from '../../utils/formatters';

export default function SalesInvoicesPage() {
  const crud = useCrudTable(API_ENDPOINTS.SALES.INVOICES, API_ENDPOINTS.SALES.INVOICE_DETAIL);
  const [invoiceModal, setInvoiceModal] = useState(false);

  const columns = [
    { key: 'invoice_no', label: 'No. Faktur' },
    { key: 'customer_name', label: 'Pelanggan' },
    { key: 'invoice_date', label: 'Tanggal', render: (r) => formatDate(r.invoice_date) },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'paid_amount', label: 'Diterima', render: (r) => formatCurrency(r.paid_amount) },
    { key: 'status', label: 'Status', render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>{r.status}</span> },
  ];

  return (
    <div>
      <PageHeader title="Faktur Penjualan" onAdd={() => setInvoiceModal(true)} addLabel="Buat Faktur" search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} actions={(row) => row.status === 'draft' && (
        <Button size="sm" variant="success" onClick={async () => { await post(API_ENDPOINTS.SALES.INVOICE_POST(row.id)); toast.success('Faktur diposting'); crud.refresh(); }}>
          <CheckCircle size={14} /> Post
        </Button>
      )} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <InvoiceFormModal open={invoiceModal} onClose={() => setInvoiceModal(false)} type="sales"
        onSave={async (form) => { await post(API_ENDPOINTS.SALES.INVOICES, form); toast.success('Faktur dibuat'); setInvoiceModal(false); crud.refresh(); }} />
    </div>
  );
}
