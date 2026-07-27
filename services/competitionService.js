const db = require('../config/db');

async function getCompetitionsByEvent(eventId) {
  const { data, error } = await db.from('competitions').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

async function createCompetition(eventId, { name, winner_name, notes }) {
  const { data, error } = await db.from('competitions').insert({
    event_id: eventId,
    name: name.trim(),
    winner_name: (winner_name || '').trim() || null,
    notes: (notes || '').trim() || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateCompetition(id, { name, winner_name, notes }) {
  const { data, error } = await db.from('competitions').update({
    name: name.trim(),
    winner_name: (winner_name || '').trim() || null,
    notes: (notes || '').trim() || null,
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteCompetition(id) {
  const { error } = await db.from('competitions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

module.exports = { getCompetitionsByEvent, createCompetition, updateCompetition, deleteCompetition };
