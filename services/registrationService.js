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
  const { data, error } = await db.from('registrations').select('*').eq('qr_token', token).single();
  if (error) {
    if (error.code !== 'PGRST116') console.error('[getRegistrationByToken] DB error:', error.message);
    return null;
  }
  return data;
}

async function createRegistration(eventId, { name, email, payment_reference }) {
  const qr_token = crypto.randomUUID();
  const { data, error } = await db.from('registrations').insert({
    event_id: eventId,
    name,
    email,
    payment_reference: payment_reference || '',
    is_paid: false,
    qr_token,
  }).select().single();
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
  togglePaid,
  deleteRegistration,
  countByEvent,
  countPaidByEvent,
};
