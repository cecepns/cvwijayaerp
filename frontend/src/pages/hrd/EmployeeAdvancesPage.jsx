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
import { get, post, patch } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency, formatDate, statusBadge } from '../../utils/formatters';

export default function EmployeeAdvancesPage() {
  const crud = useCrudTable(API_ENDPOINTS.HRD.ADVANCES, () => '');
  const [modal, setModal] = useState(false);
  const [disburseModal, setDisburseModal] = useState(null);
  const [form, setForm] = useState({});
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    Promise.all([get(API_ENDPOINTS.MASTER.EMPLOYEES, { limit: 100 }), get(API_ENDPOINTS.MASTER.CASH_BANK)])
      .then(([e, a]) => { setEmployees(e.data); setAccounts(a.data); });
  }, []);

  const columns = [
    { key: 'advance_no', label: 'No. Kasbon' },
    { key: 'employee_name', label: 'Karyawan' },
    { key: 'request_date', label: 'Tanggal', render: (r) => formatDate(r.request_date) },
    { key: 'amount', label: 'Nominal', render: (r) => formatCurrency(r.amount) },
    { key: 'paid_amount', label: 'Dilunasi', render: (r) => formatCurrency(r.paid_amount) },
    { key: 'status', label: 'Status', render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(r.status)}`}>{r.status}</span> },
  ];

  return (
    <div>
      <PageHeader title="Transaksi Kasbon Karyawan" onAdd={() => { setForm({ request_date: new Date().toISOString().split('T')[0] }); setModal(true); }} search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} actions={(row) => (
        <>
          {row.status === 'pending' && <>
            <Button size="sm" variant="success" onClick={async () => { await patch(API_ENDPOINTS.HRD.ADVANCE_APPROVE(row.id)); toast.success('Disetujui'); crud.refresh(); }}>Approve</Button>
            <Button size="sm" variant="danger" onClick={async () => { await patch(API_ENDPOINTS.HRD.ADVANCE_REJECT(row.id)); toast.success('Ditolak'); crud.refresh(); }}>Reject</Button>
          </>}
          {row.status === 'approved' && <Button size="sm" onClick={() => setDisburseModal(row)}>Cairkan</Button>}
        </>
      )} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={modal} onClose={() => setModal(false)} title="Pengajuan Kasbon">
        <div className="space-y-4">
          <Select label="Karyawan" value={form.employee_id || ''} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            options={[{ value: '', label: 'Pilih' }, ...employees.map((e) => ({ value: e.id, label: `${e.employee_code} - ${e.name}` }))]} />
          <Input label="Nominal" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Keperluan" value={form.purpose || ''} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Batal</Button>
          <Button onClick={async () => { await post(API_ENDPOINTS.HRD.ADVANCES, form); toast.success('Kasbon diajukan'); setModal(false); crud.refresh(); }}>Ajukan</Button>
        </div>
      </Modal>
      <Modal open={!!disburseModal} onClose={() => setDisburseModal(null)} title="Pencairan Kasbon">
        <Select label="Kas/Bank" value={form.cash_bank_id || ''} onChange={(e) => setForm({ ...form, cash_bank_id: e.target.value })}
          options={[{ value: '', label: 'Pilih' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={async () => { await post(API_ENDPOINTS.HRD.ADVANCE_DISBURSE(disburseModal.id), { cash_bank_id: form.cash_bank_id }); toast.success('Kasbon dicairkan'); setDisburseModal(null); crud.refresh(); }}>Cairkan</Button>
        </div>
      </Modal>
    </div>
  );
}
