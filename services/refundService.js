const db = require('../config/db');

async function getRefundsByEvent(eventId) {
  const { data, error } = await db.from('refunds').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function getTotalByEvent(eventId) {
  const refunds = await getRefundsByEvent(eventId);
  return refunds.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
}

async function createRefund(eventId, { registration_id, income_id, amount, reason, transaction_id }) {
  const { data, error } = await db.from('refunds').insert({
    event_id: eventId,
    registration_id: registration_id || null,
    income_id: income_id || null,
    amount: parseFloat(amount),
    reason: reason || null,
    transaction_id: transaction_id || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteRefund(id) {
  const { error } = await db.from('refunds').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

module.exports = { getRefundsByEvent, getTotalByEvent, createRefund, deleteRefund };
