import Modal from './Modal';
import DataTable from './DataTable';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function InvoiceDrilldownModal({ open, onClose, title, loading, invoices }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <DataTable
        loading={loading}
        columns={[
          { key: 'invoice_no', label: 'No. Faktur' },
          { key: 'invoice_date', label: 'Tanggal', render: (r) => formatDate(r.invoice_date) },
          { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
          { key: 'paid_amount', label: 'Dibayar', render: (r) => formatCurrency(r.paid_amount) },
          { key: 'status', label: 'Status' },
        ]}
        data={invoices}
      />
    </Modal>
  );
}
