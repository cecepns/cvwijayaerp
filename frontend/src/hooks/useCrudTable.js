import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useDebounce } from './useDebounce';
import { getList, post, put, del } from '../utils/request';

export function useCrudTable(listUrl, detailUrlFn) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounce(search);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getList(listUrl, { page: pagination.page, limit: pagination.limit, search: debouncedSearch });
      setData(res.data);
      setPagination((p) => ({ ...p, ...res.pagination }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [listUrl, pagination.page, pagination.limit, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPagination((p) => ({ ...p, page: 1 })); }, [debouncedSearch]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (row) => { setEditing(row); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const save = async (formData) => {
    setSaving(true);
    try {
      if (editing) {
        await put(detailUrlFn(editing.id), formData);
        toast.success('Data berhasil diperbarui');
      } else {
        await post(listUrl, formData);
        toast.success('Data berhasil ditambahkan');
      }
      closeModal();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await del(detailUrlFn(row.id));
      toast.success('Data berhasil dihapus');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  return {
    data, pagination, loading, search, setSearch, modalOpen, editing, saving,
    setPagination, openCreate, openEdit, closeModal, save, remove, refresh: fetchData,
  };
}
