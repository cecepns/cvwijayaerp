import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useCrudTable } from '../../hooks/useCrudTable';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { formatCurrency } from '../../utils/formatters';

export default function ChartOfAccountsPage() {
  const crud = useCrudTable(API_ENDPOINTS.SETTINGS.COA, API_ENDPOINTS.SETTINGS.COA_DETAIL);
  const [form, setForm] = useState({});

  const openModal = (row) => {
    setForm(row || { code: '', name: '', account_type: 'asset', normal_balance: 'debit', is_header: false });
    row ? crud.openEdit(row) : crud.openCreate();
  };

  const columns = [
    { key: 'code', label: 'Kode' },
    { key: 'name', label: 'Nama Akun' },
    { key: 'account_type', label: 'Tipe' },
    { key: 'balance', label: 'Saldo', render: (r) => <span className="font-medium">{formatCurrency(r.balance)}</span> },
    { key: 'normal_balance', label: 'Saldo Normal' },
    { key: 'is_active', label: 'Status', render: (r) => r.is_active ? 'Aktif' : 'Nonaktif' },
  ];

  return (
    <div>
      <PageHeader title="Akun Perkiraan" subtitle="Saldo dihitung dari jurnal: penjualan menambah, pembelian mengurangi saldo kas/bank" onAdd={() => openModal(null)} search={crud.search} onSearchChange={crud.setSearch} />
      <DataTable columns={columns} data={crud.data} loading={crud.loading} onEdit={openModal} onDelete={crud.remove} />
      <Pagination pagination={crud.pagination} onPageChange={(p) => crud.setPagination((x) => ({ ...x, page: p }))} onLimitChange={(l) => crud.setPagination((x) => ({ ...x, limit: l, page: 1 }))} />
      <Modal open={crud.modalOpen} onClose={crud.closeModal} title={crud.editing ? 'Edit Akun' : 'Tambah Akun'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Kode Akun" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!crud.editing} />
          <Input label="Nama Akun" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Tipe Akun" value={form.account_type || 'asset'} onChange={(e) => setForm({ ...form, account_type: e.target.value })}
            options={[
              { value: 'asset', label: 'Aset' }, { value: 'liability', label: 'Kewajiban' },
              { value: 'equity', label: 'Ekuitas' }, { value: 'revenue', label: 'Pendapatan' },
              { value: 'expense', label: 'Beban' },
            ]} />
          <Select label="Saldo Normal" value={form.normal_balance || 'debit'} onChange={(e) => setForm({ ...form, normal_balance: e.target.value })}
            options={[{ value: 'debit', label: 'Debit' }, { value: 'credit', label: 'Kredit' }]} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={crud.closeModal}>Batal</Button>
          <Button loading={crud.saving} onClick={() => crud.save(form)}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
