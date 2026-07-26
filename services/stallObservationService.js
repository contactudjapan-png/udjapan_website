const db = require('../config/db');

async function getObservationsByStall(stallId) {
  const { data, error } = await db.from('stall_observations').select('*').eq('stall_id', stallId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function createObservation(stallId, eventId, submittedBy, observationType, notes) {
  const { data, error } = await db.from('stall_observations').insert({
    stall_id: stallId,
    event_id: eventId,
    submitted_by: submittedBy,
    observation_type: observationType,
    notes: notes || '',
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { getObservationsByStall, createObservation };
