const ExcelJS = require('exceljs');
const registrationService = require('./registrationService');
const expenseService = require('./expenseService');
const crypto = require('crypto');
const db = require('../config/db');

/**
 * Import registrations and/or expenses from an Excel (.xlsx) buffer.
 * Expected sheets (case-insensitive):
 *   - "Registrations": columns name, email, payment_reference, is_paid
 *   - "Expenses":      columns description, amount
 *
 * Returns { registrationsImported, expensesImported, errors }
 */
async function importFromExcel(eventId, buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  let registrationsImported = 0;
  let expensesImported = 0;
  const errors = [];

  for (const sheet of workbook.worksheets) {
    const name = sheet.name.trim().toLowerCase();

    if (name === 'registrations' || name === 'registration') {
      // Read header row to map column indices
      const headerRow = sheet.getRow(1).values; // 1-indexed, index 0 is undefined
      const col = {};
      headerRow.forEach((h, i) => {
        if (h) col[String(h).trim().toLowerCase().replace(/\s+/g, '_')] = i;
      });

      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r).values;
        const name = col.name !== undefined ? String(row[col.name] || '').trim() : '';
        const email = col.email !== undefined ? String(row[col.email] || '').trim().toLowerCase() : '';
        if (!name || !email) continue;
        const payment_reference = col.payment_reference !== undefined ? String(row[col.payment_reference] || '').trim() : '';
        const is_paid_raw = col.is_paid !== undefined ? row[col.is_paid] : false;
        const is_paid = is_paid_raw === true || String(is_paid_raw).toLowerCase() === 'yes' || String(is_paid_raw).toLowerCase() === 'true' || is_paid_raw === 1;

        try {
          const qr_token = crypto.randomUUID();
          const { data, error } = await db.from('registrations').insert({
            event_id: eventId,
            name,
            email,
            payment_reference,
            is_paid,
            qr_token,
          }).select().single();
          if (error) throw new Error(error.message);
          registrationsImported++;
        } catch (err) {
          errors.push(`Row ${r}: ${err.message}`);
        }
      }
    }

    if (name === 'expenses' || name === 'expense') {
      const headerRow = sheet.getRow(1).values;
      const col = {};
      headerRow.forEach((h, i) => {
        if (h) col[String(h).trim().toLowerCase()] = i;
      });

      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r).values;
        const description = col.description !== undefined ? String(row[col.description] || '').trim() : '';
        const amount = col.amount !== undefined ? parseFloat(row[col.amount]) : NaN;
        if (!description || isNaN(amount)) continue;

        try {
          await expenseService.createExpense(eventId, { description, amount }, null);
          expensesImported++;
        } catch (err) {
          errors.push(`Expense row ${r}: ${err.message}`);
        }
      }
    }
  }

  return { registrationsImported, expensesImported, errors };
}

module.exports = { importFromExcel };
