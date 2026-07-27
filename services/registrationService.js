const crypto = require('crypto');
const db = require('../config/db');

async function getRegistrationsByEvent(eventId) {
  const { data, error } = await db.from('registrations').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function getRegistrationById(id) {
  const { data, error } = await db.from('registrations').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function getRegistrationByToken(token) {
  // Full UUID lookup
  const { data, error } = await db.from('registrations').select('*').eq('qr_token', token).single();
  if (!error && data) return data;

  // Short code lookup (first 8 chars, case-insensitive)
  if (token.length === 8) {
    const { data: data2, error: error2 } = await db.from('registrations').select('*').ilike('qr_token', `${token}-%`).single();
    if (!error2 && data2) return data2;
  }

  // Phone number lookup — validator types phone number at entrance
  const digits = token.replace(/[\s\-().]/g, '');
  if (/^\+?\d{6,}$/.test(digits)) {
    // Check phone field first
    const { data: data3p } = await db.from('registrations').select('*').eq('phone', token).single();
    if (data3p) return data3p;
    if (digits !== token) {
      const { data: data3pn } = await db.from('registrations').select('*').eq('phone', digits).single();
      if (data3pn) return data3pn;
    }
    // Fallback: email field (legacy)
    const { data: data3 } = await db.from('registrations').select('*').eq('email', token).single();
    if (data3) return data3;
    if (digits !== token) {
      const { data: data4 } = await db.from('registrations').select('*').eq('email', digits).single();
      if (data4) return data4;
    }
  }

  if (error && error.code !== 'PGRST116') console.error('[getRegistrationByToken] DB error:', error.message);
  return null;
}

async function createRegistration(eventId, { name, email, phone, payment_reference, amount, transaction_id }) {
  const qr_token = crypto.randomUUID();
  const { data, error } = await db.from('registrations').insert({
    event_id: eventId,
    name,
    email,
    phone: phone || '',
    payment_reference: payment_reference || '',
    amount: amount ? parseFloat(amount) : null,
    transaction_id: transaction_id || null,
    is_paid: false,
    qr_token,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateRegistrationPayment(id, { is_paid, transaction_id, amount }) {
  const update = {};
  if (is_paid !== undefined) update.is_paid = is_paid;
  if (transaction_id !== undefined) update.transaction_id = transaction_id;
  if (amount !== undefined) update.amount = amount ? parseFloat(amount) : null;
  const { data, error } = await db.from('registrations').update(update).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function togglePaid(id) {
  const reg = await getRegistrationById(id);
  const { data, error } = await db.from('registrations').update({ is_paid: !reg.is_paid }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteRegistration(id) {
  const { error } = await db.from('registrations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function countByEvent(eventId) {
  const { data, error } = await db.from('registrations').select('*').eq('event_id', eventId);
  if (error) return 0;
  return data.length;
}

async function countPaidByEvent(eventId) {
  const { data, error } = await db.from('registrations').select('*').eq('event_id', eventId).eq('is_paid', true);
  if (error) return 0;
  return data.length;
}

module.exports = {
  getRegistrationsByEvent,
  getRegistrationById,
  getRegistrationByToken,
  createRegistration,
  updateRegistrationPayment,
  togglePaid,
  deleteRegistration,
  countByEvent,
  countPaidByEvent,
};
