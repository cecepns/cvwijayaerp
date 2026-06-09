import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useCrudTable } from '../../hooks/useCrudTable';
import { get, post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatDate, statusBadge } from '../../utils/formatters';

export default function StockOpnamePage() {
  const crud = useCrudTable(API_ENDPOINTS.INVENTORY.STOCK_OPNAMES, API_ENDPOINTS.INVENTORY.STOCK_OPNAME_DETAIL);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => { get(API_ENDPOINTS.MASTER.WAREHOUSES).then((r) => setWarehouses(r.data)); }, []);

  const columns = [
    { key: 'opname_no', label: 'No. Opname' },
    { key: 'warehouse_name', label: 'Gudang' },
    { key: 'opname_date', label: 'Tanggal', render: (r) => formatDate(r.opname_date) },
    { key: 'status', label: 'Status', render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(r.status)}`}>{r.status}</span> },
  ];

  return (
    <div>
      <PageHeader title="Stok Opname" onAdd={() => { setForm({ opname_date: new Date().toISOString().split('T')[0] }); setModal(true); }} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} actions={(row) => row.status === 'in_progress' && (
        <Button size="sm" onClick={async () => { await post(API_ENDPOINTS.INVENTORY.STOCK_OPNAME_COMPLETE(row.id)); toast.success('Opname selesai'); crud.refresh(); }}>Selesai</Button>
      )} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Buat Stok Opname">
        <Select label="Gudang" value={form.warehouse_id || ''} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
          options={[{ value: '', label: 'Pilih' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]} className="mb-4" />
        <Input label="Tanggal" type="date" value={form.opname_date || ''} onChange={(e) => setForm({ ...form, opname_date: e.target.value })} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={async () => { await post(API_ENDPOINTS.INVENTORY.STOCK_OPNAMES, form); toast.success('Opname dibuat'); setModal(false); crud.refresh(); }}>Buat Opname</Button>
        </div>
      </Modal>
    </div>
  );
}
