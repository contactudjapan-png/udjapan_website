const ExcelJS = require('exceljs');
const expenseService = require('./expenseService');
const crypto = require('crypto');
const db = require('../config/db');
const { getTierForDate } = require('./tierUtils');

// Extract plain text from an ExcelJS cell value (handles strings, numbers, hyperlinks, rich text)
function cellText(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val instanceof Date) return val.toISOString();
  // Hyperlink object: { text, hyperlink }
  if (typeof val === 'object' && val.text) return String(val.text);
  // Rich text object: { richText: [{ text }] }
  if (typeof val === 'object' && Array.isArray(val.richText))
    return val.richText.map(r => r.text || '').join('');
  return String(val);
}

// Parse Bengali or Latin digit strings to integer
function parseBengaliInt(val) {
  if (val === null || val === undefined || val === '') return 0;
  const bengaliDigits = '০১২৩৪৫৬৭৮৯';
  const s = String(val).trim().replace(/[০-৯]/g, d => bengaliDigits.indexOf(d));
  return parseInt(s) || 0;
}

// Detect payment method from payment reference string
function detectPaymentMethod(ref) {
  if (!ref) return 'bank';
  // PayPal transaction IDs: all uppercase alphanumeric, no spaces, 12+ chars
  if (/^[A-Z0-9]{12,}$/.test(ref.trim())) return 'paypal';
  return 'bank';
}

// Detect if this workbook is a Google Forms export
function isFormResponseSheet(sheet) {
  const name = sheet.name.toLowerCase();
  if (name.includes('form responses') || name.includes('responses')) return true;
  // Check if first header cell looks like a timestamp column
  const hdr = sheet.getRow(1).values;
  const firstHeader = String(hdr[1] || '').toLowerCase();
  return firstHeader.includes('timestamp');
}

/**
 * Import from Google Forms response export (Sommerfest-style).
 * Sheet columns (1-indexed):
 *   1: Timestamp
 *   2: Names (comma/slash separated)
 *   3: Children count (<15)
 *   4: Adults count (15+)
 *   5: Payment reference / transaction
 *   6: Email or phone
 *
 * Returns { imported, skipped, errors[], registrations[] }
 */
async function importFromFormResponse(eventId, buffer, event) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets.find(isFormResponseSheet) || workbook.worksheets[0];
  if (!sheet) throw new Error('No sheet found in file');

  console.log(`[Import] Using sheet "${sheet.name}" (${sheet.rowCount} rows)`);

  // Load existing emails + phones for this event to detect duplicates
  const { data: existing } = await db.from('registrations')
    .select('email,phone').eq('event_id', eventId);
  const seenEmails = new Set((existing || []).map(r => (r.email || '').toLowerCase()).filter(Boolean));
  const seenPhones = new Set((existing || []).map(r => r.phone || '').filter(Boolean));

  const imported = [];
  const errors = [];
  let skipped = 0;

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r).values; // 1-indexed, index 0 = undefined

    const timestampRaw = row[1];
    const nameRaw   = cellText(row[2]).trim();
    const children  = parseBengaliInt(row[3]);
    const adults    = parseBengaliInt(row[4]);
    const payRef    = cellText(row[5]).trim();
    const contact   = cellText(row[6]).trim();

    if (!nameRaw && !contact) continue; // blank row

    const isEmail = contact.includes('@');
    const email   = isEmail ? contact.toLowerCase() : null;
    const phone   = !isEmail ? contact : null;

    // Duplicate check
    if (email && seenEmails.has(email)) {
      console.log(`[Import] Row ${r}: skipped duplicate email ${email}`);
      skipped++;
      continue;
    }
    if (phone && seenPhones.has(phone)) {
      console.log(`[Import] Row ${r}: skipped duplicate phone ${phone}`);
      skipped++;
      continue;
    }

    // Normalise name (comma/slash separated list → join with comma)
    const name = nameRaw.split(/[,\/]/).map(n => n.trim()).filter(Boolean).join(', ') || nameRaw;

    // Determine submission date for tier calculation
    const submissionDate = timestampRaw ? new Date(timestampRaw) : new Date();
    const tierInfo = event ? getTierForDate(submissionDate, event) : null;

    // Calculate amount
    let amount = null;
    if (tierInfo && adults > 0) {
      const subtotal = adults * tierInfo.price;
      let discount = 0;
      const { group_min_size, group_discount } = event;
      if (group_min_size && group_discount && adults >= parseInt(group_min_size)) {
        discount = Math.floor(adults / parseInt(group_min_size)) * parseFloat(group_discount);
      }
      amount = Math.max(0, subtotal - discount);
    }

    const paymentMethod = detectPaymentMethod(payRef);

    try {
      const qr_token = crypto.randomUUID();
      const { data, error } = await db.from('registrations').insert({
        event_id:          eventId,
        name,
        email,
        phone,
        payment_reference: payRef || null,
        adults_count:      adults,
        children_count:    children,
        amount:            amount != null ? parseFloat(amount.toFixed(2)) : null,
        payment_method:    paymentMethod,
        is_paid:           false,
        qr_token,
        created_at:        submissionDate.toISOString(),
      }).select().single();

      if (error) throw new Error(error.message);

      // Track within-batch dedup
      if (email) seenEmails.add(email);
      if (phone) seenPhones.add(phone);

      imported.push(data);
      console.log(
        `[Import] Row ${r}: ${name} (${email || phone}) — ` +
        `adults=${adults} children=${children} ` +
        `tier=${tierInfo?.tier ?? 'none'} amount=€${amount?.toFixed(2) ?? '—'} ` +
        `payment=${paymentMethod}`
      );
    } catch (err) {
      errors.push(`Row ${r} (${name || contact}): ${err.message}`);
      console.error(`[Import] Row ${r} error:`, err.message);
    }
  }

  console.log(`[Import] Done — imported=${imported.length} skipped=${skipped} errors=${errors.length}`);
  return { imported, skipped, errors };
}

/**
 * Legacy import: "Registrations" and "Expenses" named sheets.
 */
async function importFromExcel(eventId, buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  let registrationsImported = 0;
  let expensesImported = 0;
  const errors = [];

  for (const sheet of workbook.worksheets) {
    const sheetName = sheet.name.trim().toLowerCase();

    if (sheetName === 'registrations' || sheetName === 'registration') {
      const headerRow = sheet.getRow(1).values;
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
        const is_paid = is_paid_raw === true || String(is_paid_raw).toLowerCase() === 'yes' ||
                        String(is_paid_raw).toLowerCase() === 'true' || is_paid_raw === 1;

        try {
          const qr_token = crypto.randomUUID();
          const { data, error } = await db.from('registrations').insert({
            event_id: eventId, name, email, payment_reference, is_paid, qr_token,
          }).select().single();
          if (error) throw new Error(error.message);
          registrationsImported++;
        } catch (err) {
          errors.push(`Row ${r}: ${err.message}`);
        }
      }
    }

    if (sheetName === 'expenses' || sheetName === 'expense') {
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

/**
 * Auto-detect format and dispatch to correct importer.
 */
async function importAuto(eventId, buffer, event) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const firstSheet = workbook.worksheets[0];
  if (firstSheet && isFormResponseSheet(firstSheet)) {
    return { mode: 'form', ...(await importFromFormResponse(eventId, buffer, event)) };
  }
  const legacy = await importFromExcel(eventId, buffer);
  return { mode: 'legacy', imported: [], skipped: 0, ...legacy };
}

module.exports = { importFromExcel, importFromFormResponse, importAuto };
