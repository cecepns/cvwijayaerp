import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { get } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency } from '../../utils/formatters';

export default function InvoiceFormModal({ open, onClose, onSave, saving, type = 'purchase', editing }) {
  const isPurchase = type === 'purchase';
  const [partners, setPartners] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    items: [{ product_id: '', quantity: 1, unit_price: 0 }],
    tax_rate: 0,
    discount: 0,
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      get(isPurchase ? API_ENDPOINTS.MASTER.SUPPLIERS : API_ENDPOINTS.MASTER.CUSTOMERS, { limit: 100 }),
      get(API_ENDPOINTS.MASTER.PRODUCTS, { limit: 100 }),
      get(API_ENDPOINTS.MASTER.WAREHOUSES),
    ]).then(([p, pr, w]) => {
      setPartners(p.data);
      setProducts(pr.data);
      setWarehouses(w.data);
    });
    if (!editing) {
      setForm({
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        items: [{ product_id: '', quantity: 1, unit_price: 0 }],
        tax_rate: 0, discount: 0, notes: '',
        [isPurchase ? 'supplier_id' : 'customer_id']: '',
        warehouse_id: '',
      });
    }
  }, [open, isPurchase, editing]);

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: '', quantity: 1, unit_price: 0 }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === 'product_id') {
      const prod = products.find((p) => p.id === parseInt(value));
      if (prod) items[i].unit_price = isPurchase ? prod.purchase_price : prod.selling_price;
    }
    setForm({ ...form, items });
  };

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const tax = subtotal * ((parseFloat(form.tax_rate) || 0) / 100);
  const total = subtotal + tax - (parseFloat(form.discount) || 0);

  return (
    <Modal open={open} onClose={onClose} title={`Buat Faktur ${isPurchase ? 'Pembelian' : 'Penjualan'}`} size="xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Select label={isPurchase ? 'Pemasok' : 'Pelanggan'} value={form[isPurchase ? 'supplier_id' : 'customer_id'] || ''}
          onChange={(e) => setForm({ ...form, [isPurchase ? 'supplier_id' : 'customer_id']: e.target.value })}
          options={[{ value: '', label: 'Pilih...' }, ...partners.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))]} />
        <Input label="Tanggal Faktur" type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
        <Input label="Jatuh Tempo" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        <Select label="Gudang" value={form.warehouse_id || ''} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
          options={[{ value: '', label: 'Pilih...' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]} />
        <Input label="Pajak (%)" type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
        <Input label="Diskon" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
      </div>
      <div className="border rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="text-left p-2">Barang</th><th className="p-2">Qty</th><th className="p-2">Harga</th><th className="p-2">Subtotal</th><th></th>
          </tr></thead>
          <tbody>
            {form.items.map((item, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">
                  <select className="w-full border rounded px-2 py-1" value={item.product_id} onChange={(e) => updateItem(i, 'product_id', e.target.value)}>
                    <option value="">Pilih barang</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                  </select>
                </td>
                <td className="p-2"><input type="number" className="w-20 border rounded px-2 py-1" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} /></td>
                <td className="p-2"><input type="number" className="w-28 border rounded px-2 py-1" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} /></td>
                <td className="p-2 text-right">{formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</td>
                <td className="p-2">{form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-500"><Trash2 size={16} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addItem} className="flex items-center gap-1 text-sm text-blue-600 p-2 hover:bg-blue-50 w-full"><Plus size={16} /> Tambah Item</button>
      </div>
      <div className="text-right space-y-1 mb-4">
        <p className="text-sm">Subtotal: <strong>{formatCurrency(subtotal)}</strong></p>
        <p className="text-sm">Pajak: <strong>{formatCurrency(tax)}</strong></p>
        <p className="text-lg font-bold">Total: {formatCurrency(total)}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button loading={saving} onClick={() => onSave(form)}>Simpan Faktur</Button>
      </div>
    </Modal>
  );
}
