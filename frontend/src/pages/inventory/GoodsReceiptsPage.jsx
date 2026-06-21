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
import { formatDate, formatNumber } from '../../utils/formatters';
import { exportToExcel } from '../../utils/exportExcel';

const EXPORT_COLUMNS = [
  { key: 'receipt_no', label: 'No. BM' },
  { key: 'receipt_date', label: 'Tanggal', value: (r) => formatDate(r.receipt_date) },
  { key: 'warehouse_name', label: 'Gudang' },
  { key: 'status', label: 'Status' },
  { key: 'sku', label: 'SKU' },
  { key: 'product_name', label: 'Nama Barang' },
  { key: 'quantity', label: 'Qty', value: (r) => formatNumber(r.quantity) },
  { key: 'unit_cost', label: 'Harga Satuan', value: (r) => formatNumber(r.unit_cost) },
  { key: 'subtotal', label: 'Subtotal', value: (r) => formatNumber(r.subtotal) },
  { key: 'notes', label: 'Catatan' },
];

export default function GoodsReceiptsPage() {
  const crud = useCrudTable(API_ENDPOINTS.INVENTORY.GOODS_RECEIPTS, () => '');
  const [modal, setModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState({ items: [{ product_id: '', quantity: 1, unit_cost: 0 }] });
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    Promise.all([get(API_ENDPOINTS.MASTER.WAREHOUSES), get(API_ENDPOINTS.MASTER.PRODUCTS, { limit: 100 })])
      .then(([w, p]) => { setWarehouses(w.data); setProducts(p.data); });
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await get(API_ENDPOINTS.INVENTORY.GOODS_RECEIPTS_EXPORT, { search: crud.search });
      if (!res.data?.length) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }
      exportToExcel({
        rows: res.data,
        columns: EXPORT_COLUMNS,
        filename: `barang-masuk-${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Barang Masuk',
      });
      toast.success('Data berhasil diekspor');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengekspor data');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    { key: 'receipt_no', label: 'No. BM' },
    { key: 'warehouse_name', label: 'Gudang' },
    { key: 'receipt_date', label: 'Tanggal', render: (r) => formatDate(r.receipt_date) },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div>
      <PageHeader
        title="Barang Masuk"
        search={crud.search}
        onSearchChange={crud.setSearch}
        onExport={handleExport}
        exportLoading={exporting}
        onAdd={() => {
          setForm({ receipt_date: new Date().toISOString().split('T')[0], items: [{ product_id: '', quantity: 1, unit_cost: 0 }] });
          setModal(true);
        }}
      />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Barang Masuk" size="lg">
        <Select label="Gudang" value={form.warehouse_id || ''} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
          options={[{ value: '', label: 'Pilih' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]} className="mb-4" />
        <Input label="Tanggal" type="date" value={form.receipt_date || ''} onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} className="mb-4" />
        {form.items.map((item, i) => (
          <div key={i} className="grid grid-cols-3 gap-2 mb-2">
            <select className="border rounded px-2 py-2 text-sm" value={item.product_id} onChange={(e) => {
              const items = [...form.items]; items[i].product_id = e.target.value;
              const p = products.find((x) => x.id == e.target.value); if (p) items[i].unit_cost = p.purchase_price;
              setForm({ ...form, items });
            }}>
              <option value="">Pilih barang</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => { const items = [...form.items]; items[i].quantity = e.target.value; setForm({ ...form, items }); }} />
            <Input type="number" placeholder="Harga" value={item.unit_cost} onChange={(e) => { const items = [...form.items]; items[i].unit_cost = e.target.value; setForm({ ...form, items }); }} />
          </div>
        ))}
        <Button variant="secondary" size="sm" className="mb-4" onClick={() => setForm({ ...form, items: [...form.items, { product_id: '', quantity: 1, unit_cost: 0 }] })}>+ Item</Button>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={async () => { await post(API_ENDPOINTS.INVENTORY.GOODS_RECEIPTS, form); toast.success('Barang masuk tercatat'); setModal(false); crud.refresh(); }}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
