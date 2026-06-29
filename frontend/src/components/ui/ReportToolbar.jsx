import { Download, Printer, FileSpreadsheet } from 'lucide-react';
import Button from './Button';

export default function ReportToolbar({
  onExportExcel,
  onPrint,
  exportLoading = false,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onExportExcel && (
        <Button variant="secondary" size="sm" loading={exportLoading} disabled={disabled} onClick={onExportExcel}>
          <FileSpreadsheet size={16} /> Excel
        </Button>
      )}
      {onPrint && (
        <Button variant="secondary" size="sm" disabled={disabled} onClick={onPrint}>
          <Printer size={16} /> Cetak
        </Button>
      )}
      {onPrint && (
        <Button variant="secondary" size="sm" disabled={disabled} onClick={onPrint} title="Simpan sebagai PDF via dialog cetak">
          <Download size={16} /> PDF
        </Button>
      )}
    </div>
  );
}
