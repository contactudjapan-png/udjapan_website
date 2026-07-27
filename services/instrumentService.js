const db = require('../config/db');

async function getInstrumentsByEvent(eventId) {
  const { data, error } = await db.from('instruments').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function addInstrument(eventId, { name, source, notes, volunteer_email }) {
  const { data, error } = await db.from('instruments').insert({
    event_id: eventId,
    name: name || '',
    source: source || '',
    notes: notes || '',
    volunteer_email: volunteer_email || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteInstrument(id) {
  const { error } = await db.from('instruments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

module.exports = { getInstrumentsByEvent, addInstrument, deleteInstrument };
