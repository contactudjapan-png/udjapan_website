const ExcelJS = require('exceljs');

async function exportToExcel(title, headers, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title);

  sheet.addRow(headers).font = { bold: true };
  rows.forEach(row => sheet.addRow(row));

  // Auto-fit columns
  sheet.columns.forEach(col => {
    let max = 10;
    col.eachCell(cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 60);
  });

  return workbook.xlsx.writeBuffer();
}

async function exportRegistrations(registrations) {
  const headers = ['নাম', 'ইমেইল', 'পরিমাণ', 'লেনদেন আইডি', 'অবস্থা', 'নিবন্ধিত'];
  const rows = registrations.map(r => [
    r.name, r.email,
    r.amount ? parseFloat(r.amount).toFixed(2) : '',
    r.transaction_id || r.payment_reference || '',
    r.is_paid ? 'পরিশোধিত' : 'অপেক্ষমাণ',
    new Date(r.created_at).toLocaleDateString('bn-BD', { timeZone: 'Europe/Berlin' }),
  ]);
  return exportToExcel('নিবন্ধন', headers, rows);
}

async function exportExpenses(expenses) {
  const headers = ['ক্যাটাগরি', 'বিবরণ', 'পরিমাণ', 'তারিখ'];
  const rows = expenses.map(e => [
    e.category || '', e.description,
    parseFloat(e.amount || 0).toFixed(2),
    new Date(e.created_at).toLocaleDateString('bn-BD', { timeZone: 'Europe/Berlin' }),
  ]);
  return exportToExcel('খরচ', headers, rows);
}

async function exportIncomes(incomes) {
  const headers = ['ক্যাটাগরি', 'বিবরণ', 'পরিমাণ', 'লেনদেন আইডি', 'প্রদানকারী', 'ইমেইল', 'তারিখ'];
  const rows = incomes.map(i => [
    i.category || '', i.description || '',
    parseFloat(i.amount || 0).toFixed(2),
    i.transaction_id || '', i.payer_name || '', i.payer_email || '',
    new Date(i.created_at).toLocaleDateString('bn-BD', { timeZone: 'Europe/Berlin' }),
  ]);
  return exportToExcel('আয়', headers, rows);
}

async function exportFinancialSummary(summary, eventTitle) {
  const workbook = new ExcelJS.Workbook();

  // Summary sheet
  const sheet1 = workbook.addWorksheet('সারসংক্ষেপ');
  sheet1.addRow(['মোট আয়', summary.totalIncome.toFixed(2)]);
  sheet1.addRow(['মোট খরচ', summary.totalExpenses.toFixed(2)]);
  sheet1.addRow(['মোট রিফান্ড', summary.totalRefunds.toFixed(2)]);
  sheet1.addRow(['নেট', summary.netProfit.toFixed(2)]);
  sheet1.addRow(['পরিশোধিত নিবন্ধন', summary.paidCount]);
  sheet1.addRow(['অপরিশোধিত নিবন্ধন', summary.unpaidCount]);

  // Income by category
  const sheet2 = workbook.addWorksheet('আয়ের বিভাজন');
  sheet2.addRow(['ক্যাটাগরি', 'পরিমাণ', 'শতাংশ']).font = { bold: true };
  summary.incomeByCategory.forEach(c => sheet2.addRow([c.category || 'অন্যান্য', c.total.toFixed(2), c.pct.toFixed(1) + '%']));

  sheet1.columns.forEach(c => { c.width = 20; });
  sheet2.columns.forEach(c => { c.width = 20; });

  return workbook.xlsx.writeBuffer();
}

module.exports = { exportRegistrations, exportExpenses, exportIncomes, exportFinancialSummary };
