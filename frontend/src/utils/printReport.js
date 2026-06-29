export function printReport({ title, subtitle, headers, rows }) {
  const win = window.open('', '_blank');
  if (!win) return;

  const headCells = headers.map((h) => `<th>${h}</th>`).join('');
  const bodyRows = rows.map((row) => {
    const cells = row.map((cell) => `<td>${cell ?? ''}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        p { margin: 0 0 16px; color: #555; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f3f4f6; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
      <table>
        <thead><tr>${headCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}
