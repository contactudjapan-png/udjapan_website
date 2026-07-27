const db = require('../config/db');

async function createHelpRequest(eventId, { reporter_name, priority, message }) {
  const { data, error } = await db.from('help_requests').insert({
    event_id: eventId,
    reporter_name: reporter_name || 'অজ্ঞাত',
    priority: priority || 'normal',
    message,
    resolved: false,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function getHelpRequestsByEvent(eventId) {
  const { data, error } = await db.from('help_requests').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function resolveHelpRequest(id) {
  const { data, error } = await db.from('help_requests').update({ resolved: true }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function countOpenByEvent(eventId) {
  const { data, error } = await db.from('help_requests').select('*').eq('event_id', eventId).eq('resolved', false);
  if (error) return 0;
  return (data || []).length;
}

module.exports = { createHelpRequest, getHelpRequestsByEvent, resolveHelpRequest, countOpenByEvent };
