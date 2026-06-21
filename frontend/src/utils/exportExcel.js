import * as XLSX from 'xlsx';

export function exportToExcel({ rows, columns, filename, sheetName = 'Data' }) {
  const data = rows.map((row) =>
    columns.reduce((acc, col) => {
      acc[col.label] = col.value ? col.value(row) : row[col.key] ?? '';
      return acc;
    }, {})
  );

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
