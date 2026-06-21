import * as XLSX from 'xlsx';

function rowsToSheetData(rows, columns) {
  return rows.map((row) =>
    columns.reduce((acc, col) => {
      acc[col.label] = col.value ? col.value(row) : row[col.key] ?? '';
      return acc;
    }, {})
  );
}

function writeWorkbook(workbook, filename) {
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportToExcel({ rows, columns, filename, sheetName = 'Data' }) {
  const worksheet = XLSX.utils.json_to_sheet(rowsToSheetData(rows, columns));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  writeWorkbook(workbook, filename);
}

export function exportToExcelSheets({ sheets, filename }) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(({ rows, columns, sheetName }) => {
    const worksheet = XLSX.utils.json_to_sheet(rowsToSheetData(rows, columns));
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });
  writeWorkbook(workbook, filename);
}
