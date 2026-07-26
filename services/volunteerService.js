const db = require('../config/db');

async function getVolunteersByEvent(eventId) {
  const { data, error } = await db.from('volunteers').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function getVolunteerById(id) {
  const { data, error } = await db.from('volunteers').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function createVolunteer(eventId, { name, email, phone }) {
  const { data, error } = await db.from('volunteers').insert({
    event_id: eventId,
    name,
    email,
    phone: phone || '',
    assigned_task: null,
    status: 'pending',
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateVolunteerStatus(id, status) {
  const { data, error } = await db.from('volunteers').update({ status }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function assignTask(id, task) {
  const { data, error } = await db.from('volunteers').update({ assigned_task: task }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteVolunteer(id) {
  const { error } = await db.from('volunteers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

module.exports = { getVolunteersByEvent, getVolunteerById, createVolunteer, updateVolunteerStatus, assignTask, deleteVolunteer };
