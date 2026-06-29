import Input from './Input';

export default function DateRangeFilter({ dateFrom, dateTo, onDateFromChange, onDateToChange, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      <Input
        label="Dari Tanggal"
        type="date"
        value={dateFrom || ''}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="w-40"
      />
      <Input
        label="Sampai Tanggal"
        type="date"
        value={dateTo || ''}
        onChange={(e) => onDateToChange(e.target.value)}
        className="w-40"
      />
    </div>
  );
}
