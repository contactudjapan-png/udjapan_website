const db = require('../config/db');

async function getSubmissionsByEvent(eventId) {
  const { data, error } = await db.from('submissions').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function getSubmissionById(id) {
  const { NotFoundError } = require('../middleware/errors');
  const { data, error } = await db.from('submissions').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new NotFoundError('Submission not found.', 'submission');
  return data;
}

async function createSubmission(eventId, { name, email, phone, payment_reference, payment_method, children_count, adults_count, is_special_needs }) {
  const { data, error } = await db.from('submissions').insert({
    event_id: eventId,
    name,
    email,
    phone: phone || '',
    payment_reference: payment_reference || '',
    payment_method: payment_method || null,
    children_count: children_count || 0,
    adults_count: adults_count || 0,
    is_special_needs: is_special_needs === true || is_special_needs === 'true' || is_special_needs === '1',
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
