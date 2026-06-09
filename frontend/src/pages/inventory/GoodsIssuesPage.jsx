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
import { formatDate } from '../../utils/formatters';

export default function GoodsIssuesPage() {
  const crud = useCrudTable(API_ENDPOINTS.INVENTORY.GOODS_ISSUES, () => '');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ items: [{ product_id: '', quantity: 1 }] });
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    Promise.all([get(API_ENDPOINTS.MASTER.WAREHOUSES), get(API_ENDPOINTS.MASTER.PRODUCTS, { limit: 100, type: 'goods' })])
      .then(([w, p]) => { setWarehouses(w.data); setProducts(p.data); });
  }, []);

  const columns = [
    { key: 'issue_no', label: 'No. BK' },
    { key: 'warehouse_name', label: 'Gudang' },
    { key: 'issue_date', label: 'Tanggal', render: (r) => formatDate(r.issue_date) },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div>
      <PageHeader title="Barang Keluar" onAdd={() => { setForm({ issue_date: new Date().toISOString().split('T')[0], items: [{ product_id: '', quantity: 1 }] }); setModal(true); }} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Barang Keluar" size="lg">
        <Select label="Gudang" value={form.warehouse_id || ''} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
          options={[{ value: '', label: 'Pilih' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]} className="mb-4" />
        <Input label="Tanggal" type="date" value={form.issue_date || ''} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="mb-4" />
        {form.items.map((item, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 mb-2">
            <select className="border rounded px-2 py-2 text-sm" value={item.product_id} onChange={(e) => { const items = [...form.items]; items[i].product_id = e.target.value; setForm({ ...form, items }); }}>
              <option value="">Pilih barang</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => { const items = [...form.items]; items[i].quantity = e.target.value; setForm({ ...form, items }); }} />
          </div>
        ))}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={async () => { await post(API_ENDPOINTS.INVENTORY.GOODS_ISSUES, form); toast.success('Barang keluar tercatat'); setModal(false); crud.refresh(); }}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
