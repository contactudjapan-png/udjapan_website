const registrationService = require('./registrationService');
const incomeService = require('./incomeService');
const db = require('../config/db');

function normalize(str) {
  return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function nameSimilar(a, b) {
  a = normalize(a); b = normalize(b);
  if (a === b) return true;
  // Check if one starts with the other (handles middle name differences)
  if (a.startsWith(b) || b.startsWith(a)) return true;
  // Simple word overlap
  const wa = a.split(' '), wb = b.split(' ');
  const common = wa.filter(w => wb.includes(w) && w.length > 2);
  return common.length >= Math.min(wa.length, wb.length) - 1 && common.length > 0;
}

async function processBulkPayment(eventId, rows) {
  const registrations = await registrationService.getRegistrationsByEvent(eventId);
  const results = { matched: [], alreadyPaid: [], notFound: [], errors: [] };

  for (const row of rows) {
    const { name, email, transaction_id, amount } = row;
    if (!name && !email) continue;

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

      // Find matching registration
      const emailLower = (email || '').toLowerCase().trim();
      let match = registrations.find(r => r.email.toLowerCase() === emailLower && nameSimilar(r.name, name));
      if (!match && emailLower) {
        match = registrations.find(r => r.email.toLowerCase() === emailLower);
      }

      if (!match) {
        results.notFound.push({ name, email, transaction_id });
        continue;
      }

      if (match.is_paid) {
        results.alreadyPaid.push({ name: match.name, email: match.email, transaction_id, reason: 'ইতিমধ্যে পরিশোধিত' });
        continue;
      }

      // Mark as paid
      const parsedAmount = amount ? parseFloat(amount) : null;
      await registrationService.updateRegistrationPayment(match.id, {
        is_paid: true,
        transaction_id: transaction_id || null,
        amount: parsedAmount,
      });

      // Auto-create income record
      await incomeService.createIncome(eventId, {
        category: 'নিবন্ধন ফি',
        description: `${match.name} (${match.email})`,
        amount: parsedAmount || 0,
        transaction_id: transaction_id || null,
        payer_name: match.name,
        payer_email: match.email,
      });

      results.matched.push({ name: match.name, email: match.email, transaction_id, amount: parsedAmount });
    } catch (err) {
      results.errors.push({ name, email, error: err.message });
    }
  }

  return results;
}

module.exports = { processBulkPayment };
