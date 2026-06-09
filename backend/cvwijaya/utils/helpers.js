const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = [10, 25, 50, 100].includes(parseInt(query.limit, 10))
    ? parseInt(query.limit, 10)
    : 10;
  const offset = (page - 1) * limit;
  const search = (query.search || '').trim();
  const sort = query.sort || 'created_at';
  const order = query.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { page, limit, offset, search, sort, order };
};

const buildSearchWhere = (fields, search, startIndex = 1) => {
  if (!search) return { clause: '', params: [], nextIndex: startIndex };
  const conditions = fields.map((f) => `${f} LIKE ?`).join(' OR ');
  const params = fields.map(() => `%${search}%`);
  return {
    clause: ` AND (${conditions})`,
    params,
    nextIndex: startIndex + params.length,
  };
};

const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>'"]/g, '').trim();
};

const today = () => new Date().toISOString().split('T')[0];

module.exports = { getPagination, buildSearchWhere, sanitize, today };
