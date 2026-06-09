import { api } from './api';

export const get = (url, params) => api.get(url, { params }).then((r) => r.data);
export const post = (url, data) => api.post(url, data).then((r) => r.data);
export const put = (url, data) => api.put(url, data).then((r) => r.data);
export const patch = (url, data) => api.patch(url, data).then((r) => r.data);
export const del = (url) => api.delete(url).then((r) => r.data);

export const getList = async (url, { page = 1, limit = 10, search = '', ...rest } = {}) => {
  const res = await get(url, { page, limit, search, ...rest });
  return { data: res.data, pagination: res.pagination };
};
