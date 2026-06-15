export const parseCurrencyInput = (str) => {
  if (str === '' || str === null || str === undefined) return '';
  const cleaned = String(str).replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? '' : num;
};

export const formatCurrencyInput = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'number' ? value : parseCurrencyInput(value);
  if (num === '' || Number.isNaN(num)) return '';
  return new Intl.NumberFormat('id-ID').format(num);
};
