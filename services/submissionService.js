const db = require('../config/db');

async function getSubmissionsByEvent(eventId) {
  const { data, error } = await db.from('submissions').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function getSubmissionById(id) {
  const { data, error } = await db.from('submissions').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function createSubmission(eventId, { name, email, payment_reference }) {
  const { data, error } = await db.from('submissions').insert({
    event_id: eventId,
    name,
    email,
    payment_reference: payment_reference || '',
    status: 'pending',
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteSubmission(id) {
  const { error } = await db.from('submissions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function countByEvent(eventId) {
  const { data, error } = await db.from('submissions').select('*').eq('event_id', eventId);
  if (error) return 0;
  return (data || []).length;
}

module.exports = {
  getSubmissionsByEvent,
  getSubmissionById,
  createSubmission,
  deleteSubmission,
  countByEvent,
};
