const db = require('../config/db');

async function getIncomesByEvent(eventId) {
  const { data, error } = await db.from('incomes').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function getTotalByEvent(eventId) {
  const incomes = await getIncomesByEvent(eventId);
  return incomes.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
}

async function createIncome(eventId, { category, description, amount, transaction_id, payer_name, payer_email, payment_date }) {
  const { data, error } = await db.from('incomes').insert({
    event_id: eventId,
    category: category || null,
    description: description || null,
    amount: parseFloat(amount),
    transaction_id: transaction_id || null,
    payer_name: payer_name || null,
    payer_email: payer_email || null,
    payment_date: payment_date || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteIncome(id) {
  const { error } = await db.from('incomes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function findByTransactionId(txnId) {
  if (!txnId) return null;
  const { data } = await db.from('incomes').select('*').eq('transaction_id', txnId).single();
  return data || null;
}

async function updateIncomeAmount(id, amount, description) {
  const update = { amount: parseFloat(amount) };
  if (description) update.description = description;
  const { data, error } = await db.from('incomes').update(update).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteByRegistration(eventId, { transaction_id, payer_email, payer_name }) {
  const incomes = await getIncomesByEvent(eventId);
  const match = incomes.find(i =>
    (transaction_id && i.transaction_id === transaction_id) ||
    (payer_email && i.payer_email === payer_email) ||
    (payer_name && i.payer_name === payer_name && !i.payer_email)
  );
  if (match) await deleteIncome(match.id);
  return match || null;
}

module.exports = { getIncomesByEvent, getTotalByEvent, createIncome, deleteIncome, findByTransactionId, deleteByRegistration, updateIncomeAmount };
