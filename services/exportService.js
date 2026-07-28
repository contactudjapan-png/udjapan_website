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

async function exportRegistrations(registrations, locale = 'bn') {
  const LABELS = {
    bn: { name:'নাম', email:'ইমেইল', phone:'ফোন', amount:'পরিমাণ', transaction_id:'লেনদেন আইডি', payment_reference:'পেমেন্ট রেফ.', status:'অবস্থা', registered:'নিবন্ধিত', paid:'পরিশোধিত', pending:'অপেক্ষমাণ', sheet:'নিবন্ধন', dateLoc:'bn-BD' },
    en: { name:'Name', email:'Email', phone:'Phone', amount:'Amount', transaction_id:'Transaction ID', payment_reference:'Payment Reference', status:'Status', registered:'Registered', paid:'Paid', pending:'Pending', sheet:'Registrations', dateLoc:'en-GB' },
    de: { name:'Name', email:'E-Mail', phone:'Telefon', amount:'Betrag', transaction_id:'Transaktions-ID', payment_reference:'Zahlungsreferenz', status:'Status', registered:'Angemeldet', paid:'Bezahlt', pending:'Ausstehend', sheet:'Anmeldungen', dateLoc:'de-DE' },
  };
  const L = LABELS[locale] || LABELS.bn;
  const headers = [L.name, L.email, L.phone, L.amount, L.transaction_id, L.payment_reference, L.status, L.registered];
  const rows = registrations.map(r => [
    r.name, r.email, r.phone || '',
    r.amount ? parseFloat(r.amount).toFixed(2) : '',
    r.transaction_id || '',
    r.payment_reference || '',
    r.is_paid ? L.paid : L.pending,
    new Date(r.created_at).toLocaleDateString(L.dateLoc, { timeZone: 'Europe/Berlin' }),
  ]);
  return exportToExcel(L.sheet, headers, rows);
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
  const headers = ['ক্যাটাগরি', 'বিবরণ', 'পরিমাণ', 'লেনদেন আইডি', 'প্রদানকারী', 'ইমেইল', 'পেমেন্টের তারিখ', 'পেমেন্টের সময়', 'এন্ট্রি তারিখ'];
  const rows = incomes.map(i => {
    const payDate = i.payment_date ? new Date(i.payment_date) : null;
    return [
      i.category || '', i.description || '',
      parseFloat(i.amount || 0).toFixed(2),
      i.transaction_id || '', i.payer_name || '', i.payer_email || '',
      payDate ? payDate.toLocaleDateString('bn-BD', { timeZone: 'Europe/Berlin' }) : '',
      payDate ? payDate.toLocaleTimeString('bn-BD', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }) : '',
      new Date(i.created_at).toLocaleDateString('bn-BD', { timeZone: 'Europe/Berlin' }),
    ];
  });
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
