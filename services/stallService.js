const db = require('../config/db');

async function getStallsByEvent(eventId) {
  const { data, error } = await db.from('stalls').select('*').eq('event_id', eventId).order('stall_name', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

async function getStallById(id) {
  const { data, error } = await db.from('stalls').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function createStall(eventId, stallData) {
  const { data, error } = await db.from('stalls').insert({
    event_id: eventId,
    stall_name: stallData.stall_name,
    description: stallData.description || '',
    location_info: stallData.location_info || '',
    assigned_to_name: stallData.assigned_to_name || null,
    assigned_to_email: stallData.assigned_to_email || null,
    assigned_to_phone: stallData.assigned_to_phone || null,
    is_occupied: !!(stallData.assigned_to_name),
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateStall(id, stallData) {
  const { data, error } = await db.from('stalls').update({
    stall_name: stallData.stall_name,
    description: stallData.description || '',
    location_info: stallData.location_info || '',
    assigned_to_name: stallData.assigned_to_name || null,
    assigned_to_email: stallData.assigned_to_email || null,
    assigned_to_phone: stallData.assigned_to_phone || null,
    is_occupied: !!(stallData.assigned_to_name),
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteStall(id) {
  const { error } = await db.from('stalls').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

module.exports = { getStallsByEvent, getStallById, createStall, updateStall, deleteStall };
