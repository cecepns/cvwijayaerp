import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, Pencil, Wallet } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import InvoiceFormModal from '../../components/forms/InvoiceFormModal';
import Button from '../../components/ui/Button';
import { useCrudTable } from '../../hooks/useCrudTable';
import { get, post, put } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate, statusBadge } from '../../utils/formatters';

export default function SalesInvoicesPage() {
  const navigate = useNavigate();
  const crud = useCrudTable(API_ENDPOINTS.SALES.INVOICES, API_ENDPOINTS.SALES.INVOICE_DETAIL);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const getOutstanding = (row) => parseFloat(row.total) - parseFloat(row.paid_amount || 0);

  const openCreate = () => { setEditing(null); setInvoiceModal(true); };
  const openEdit = (row) => { setEditing(row); setInvoiceModal(true); };
  const closeModal = () => { setInvoiceModal(false); setEditing(null); };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editing) {
        await put(API_ENDPOINTS.SALES.INVOICE_DETAIL(editing.id), form);
        toast.success('Faktur berhasil diperbarui');
      } else {
        await post(API_ENDPOINTS.SALES.INVOICES, form);
        toast.success('Faktur dibuat');
      }
      closeModal();
      crud.refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan faktur');
    } finally {
      setSaving(false);
    }
  };

  const handlePay = (row) => {
    const outstanding = getOutstanding(row);
    if (outstanding <= 0) {
      toast.error('Faktur ini sudah lunas');
      return;
    }
    navigate('/sales/receipts', { state: { fromInvoice: { id: row.id } } });
  };

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
      <PageHeader title="Faktur Penjualan" onAdd={openCreate} addLabel="Buat Faktur" search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} actions={(row) => (
        <div className="flex items-center gap-1 justify-end">
          {row.status === 'draft' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => openEdit(row)} title="Edit">
                <Pencil size={14} /> Edit
              </Button>
              <Button size="sm" variant="success" onClick={async () => { await post(API_ENDPOINTS.SALES.INVOICE_POST(row.id)); toast.success('Faktur diposting'); crud.refresh(); }}>
                <CheckCircle size={14} /> Post
              </Button>
            </>
          )}
          {['posted', 'partial'].includes(row.status) && getOutstanding(row) > 0 && (
            <Button size="sm" variant="primary" onClick={() => handlePay(row)}>
              <Wallet size={14} /> Bayar
            </Button>
          )}
        </div>
      )} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <InvoiceFormModal open={invoiceModal} onClose={closeModal} type="sales" editing={editing} saving={saving} onSave={handleSave} />
    </div>
  );
}
