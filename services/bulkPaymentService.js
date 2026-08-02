const registrationService = require('./registrationService');
const incomeService = require('./incomeService');
const db = require('../config/db');
const { getTierForDate, computeExpectedAmount } = require('./tierUtils');

function normalize(str) {
  return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizePhone(str) {
  return (str || '').replace(/[\s\-().+]/g, '');
}

function nameSimilar(a, b) {
  return normalize(a) === normalize(b);
}

async function processBulkPayment(eventId, rows, event) {
  const registrations = await registrationService.getRegistrationsByEvent(eventId);
  const results = { matched: [], alreadyPaid: [], notFound: [], errors: [] };

  for (const row of rows) {
    const { name, email, phone, transaction_id, amount, date } = row;
    if (!name && !email && !phone) continue;

    try {
      // Check duplicate transaction_id
      if (transaction_id) {
        const existingIncome = await incomeService.findByTransactionId(transaction_id);
        const existingReg = registrations.find(r => r.transaction_id === transaction_id);
        if (existingIncome || existingReg) {
          results.alreadyPaid.push({ name, email, transaction_id, reason: 'লেনদেন আইডি ইতিমধ্যে ব্যবহৃত' });
          continue;
        }
      }

      // Find matching registration: email → phone → transaction_ref → name
      const emailLower = (email || '').toLowerCase().trim();
      const phoneDigits = normalizePhone(phone || '');
      const txnNorm = (transaction_id || '').toLowerCase().trim();
      let match = null;

      if (emailLower) {
        match = registrations.find(r => r.email && r.email.toLowerCase() === emailLower && nameSimilar(r.name, name));
        if (!match) match = registrations.find(r => r.email && r.email.toLowerCase() === emailLower);
      }
      if (!match && phoneDigits.length >= 6) {
        match = registrations.find(r => r.phone && normalizePhone(r.phone) === phoneDigits);
      }
      if (!match && txnNorm) {
        match = registrations.find(r =>
          (r.transaction_id && r.transaction_id.toLowerCase() === txnNorm) ||
          (r.payment_reference && r.payment_reference.toLowerCase() === txnNorm)
        );
      }
      if (!match && name) {
        match = registrations.find(r => nameSimilar(r.name, name));
      }

      if (!match) {
        results.notFound.push({ name, email, phone, transaction_id });
        continue;
      }

      if (match.is_paid) {
        results.alreadyPaid.push({ name: match.name, email: match.email, transaction_id, reason: 'ইতিমধ্যে পরিশোধিত' });
        continue;
      }

      // Tier check against payment date
      const tierInfo = event ? getTierForDate(date, event) : null;
      const tierResult = tierInfo ? computeExpectedAmount({ ...match, created_at: date }, event) : null;
      const expectedAmount = tierResult ? tierResult.amount : null;
      const parsedAmount = amount ? parseFloat(amount) : null;
      const amountMismatch = expectedAmount != null && parsedAmount != null
        ? Math.abs(parsedAmount - expectedAmount) > 0.01
        : false;

      // Mark as paid
      await registrationService.updateRegistrationPayment(match.id, {
        is_paid: true,
        transaction_id: transaction_id || null,
        amount: parsedAmount,
      });

      // Auto-create income record
      await incomeService.createIncome(eventId, {
        category: 'নিবন্ধন ফি',
        description: `${match.name} (${match.email || match.phone})`,
        amount: parsedAmount || 0,
        transaction_id: transaction_id || null,
        payer_name: match.name,
        payer_email: match.email,
      });

      results.matched.push({
        id: match.id,
        name: match.name,
        email: match.email,
        phone: match.phone,
        transaction_id,
        amount: parsedAmount,
        date: date || null,
        tier: tierInfo ? tierInfo.tier : null,
        expected_amount: expectedAmount,
        amount_mismatch: amountMismatch,
        adults_count: match.adults_count || 0,
      });
    } catch (err) {
      results.errors.push({ name, email, error: err.message });
    }
  }

  return results;
}

module.exports = { processBulkPayment };
