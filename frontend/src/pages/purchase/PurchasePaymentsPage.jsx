import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import CurrencyInput from '../../components/ui/CurrencyInput';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useCrudTable } from '../../hooks/useCrudTable';
import { get, post } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate } from '../../utils/formatters';

const emptyForm = () => ({ payment_date: new Date().toISOString().split('T')[0], allocations: [] });

const getOutstanding = (inv) => parseFloat(inv.total) - parseFloat(inv.paid_amount || 0);

export default function PurchasePaymentsPage() {
  const location = useLocation();
  const crud = useCrudTable(API_ENDPOINTS.PURCHASE.PAYMENTS, () => '');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    get(API_ENDPOINTS.MASTER.CASH_BANK).then((r) => setAccounts(r.data));
    get(API_ENDPOINTS.MASTER.SUPPLIERS, { limit: 100 }).then((r) => setSuppliers(r.data));
  }, []);

  useEffect(() => {
    const fromInvoice = location.state?.fromInvoice;
    if (!fromInvoice?.id) return;

    const initFromInvoice = async () => {
      try {
        const res = await get(API_ENDPOINTS.PURCHASE.INVOICE_DETAIL(fromInvoice.id));
        const inv = res.data;
        const outstanding = getOutstanding(inv);
        if (outstanding <= 0) {
          toast.error('Faktur ini sudah lunas');
          return;
        }
        setInvoices([inv]);
        setForm({
          payment_date: new Date().toISOString().split('T')[0],
          supplier_id: inv.supplier_id,
          amount: outstanding,
          allocations: [{ invoice_id: inv.id, amount: outstanding }],
        });
        setModal(true);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Gagal memuat faktur');
      }
    };

    initFromInvoice();
    window.history.replaceState({}, document.title);
  }, [location.state]);

  const loadInvoices = async (supplierId) => {
    const res = await get(API_ENDPOINTS.PURCHASE.INVOICES, { supplier_id: supplierId, status: 'posted', limit: 50 });
    const partial = await get(API_ENDPOINTS.PURCHASE.INVOICES, { supplier_id: supplierId, status: 'partial', limit: 50 });
    const all = [...res.data, ...partial.data.filter((p) => !res.data.some((r) => r.id === p.id))];
    setInvoices(all.filter((i) => getOutstanding(i) > 0));
  };

  const isInvoiceSelected = (invoiceId) => (form.allocations || []).some((a) => a.invoice_id === invoiceId);

  const getAllocAmount = (invoiceId) => {
    const alloc = (form.allocations || []).find((a) => a.invoice_id === invoiceId);
    return alloc?.amount ?? '';
  };

  const toggleInvoice = (inv, checked) => {
    const outstanding = getOutstanding(inv);
    const allocs = checked
      ? [...(form.allocations || []).filter((a) => a.invoice_id !== inv.id), { invoice_id: inv.id, amount: outstanding }]
      : (form.allocations || []).filter((a) => a.invoice_id !== inv.id);
    const totalAlloc = allocs.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
    setForm({ ...form, allocations: allocs, amount: totalAlloc || form.amount });
    setErrors({});
  };

  const updateAllocAmount = (inv, value) => {
    const amount = typeof value === 'number' ? value : parseFloat(value) || 0;
    const outstanding = getOutstanding(inv);
    const allocs = (form.allocations || []).map((a) =>
      a.invoice_id === inv.id ? { ...a, amount } : a
    );
    setForm({ ...form, allocations: allocs });
    if (amount > outstanding) {
      setErrors({ alloc: `Nominal melebihi sisa faktur ${inv.invoice_no} (${formatCurrency(outstanding)})` });
    } else {
      setErrors({});
    }
  };

  const validateForm = () => {
    if (!form.supplier_id || !form.payment_date || !form.cash_bank_id || !form.amount) {
      toast.error('Lengkapi semua field wajib');
      return false;
    }
    if (!(form.allocations || []).length) {
      toast.error('Pilih minimal satu faktur');
      return false;
    }

    const paymentAmount = parseFloat(form.amount);
    let totalAlloc = 0;
    for (const alloc of form.allocations) {
      const inv = invoices.find((i) => i.id === alloc.invoice_id);
      if (!inv) continue;
      const allocAmount = parseFloat(alloc.amount || 0);
      const outstanding = getOutstanding(inv);
      if (allocAmount > outstanding) {
        toast.error(`Nominal alokasi faktur ${inv.invoice_no} melebihi sisa tagihan (${formatCurrency(outstanding)})`);
        return false;
      }
      totalAlloc += allocAmount;
    }

    if (totalAlloc > paymentAmount) {
      toast.error('Total alokasi faktur melebihi nominal pembayaran');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await post(API_ENDPOINTS.PURCHASE.PAYMENTS, form);
      toast.success('Pembayaran berhasil');
      setModal(false);
      setForm(emptyForm());
      setInvoices([]);
      crud.refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'payment_no', label: 'No. Pembayaran' },
    { key: 'supplier_name', label: 'Pemasok' },
    { key: 'payment_date', label: 'Tanggal', render: (r) => formatDate(r.payment_date) },
    { key: 'amount', label: 'Nominal', render: (r) => formatCurrency(r.amount) },
  ];

  return (
    <div>
      <PageHeader title="Pembayaran Pembelian" onAdd={() => { setForm(emptyForm()); setInvoices([]); setErrors({}); setModal(true); }} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Pembayaran Pembelian" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Pemasok" value={form.supplier_id || ''} onChange={(e) => {
            const supplierId = e.target.value;
            setForm({ ...form, supplier_id: supplierId, allocations: [] });
            if (supplierId) loadInvoices(supplierId);
            else setInvoices([]);
          }}
            options={[{ value: '', label: 'Pilih' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
          <Input label="Tanggal" type="date" value={form.payment_date || ''} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
          <CurrencyInput label="Nominal" value={form.amount} onChange={(amount) => { setForm({ ...form, amount }); setErrors({}); }} />
          <Select label="Kas/Bank" value={form.cash_bank_id || ''} onChange={(e) => setForm({ ...form, cash_bank_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
        </div>
        {invoices.length > 0 && (
          <div className="mt-4 border rounded-lg p-3">
            <p className="text-sm font-medium mb-2">Alokasi ke Faktur</p>
            {invoices.map((inv) => {
              const outstanding = getOutstanding(inv);
              const selected = isInvoiceSelected(inv.id);
              return (
                <div key={inv.id} className="py-2 border-b last:border-b-0">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected} onChange={(e) => toggleInvoice(inv, e.target.checked)} />
                    <span>{inv.invoice_no} — Sisa: {formatCurrency(outstanding)}</span>
                  </label>
                  {selected && (
                    <div className="mt-2 ml-6 max-w-xs">
                      <CurrencyInput
                        label="Nominal Alokasi"
                        value={getAllocAmount(inv.id)}
                        onChange={(amount) => updateAllocAmount(inv, amount)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {errors.alloc && <p className="text-red-500 text-xs mt-2">{errors.alloc}</p>}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={handleSave} loading={saving}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
