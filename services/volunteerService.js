const db = require('../config/db');
const crypto = require('crypto');

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

async function createVolunteer(eventId, { name, email, phone, amount, preferred_task, preferred_duration }) {
  const { data, error } = await db.from('volunteers').insert({
    event_id: eventId,
    name,
    email: (email || '').trim().toLowerCase(),
    phone: phone || '',
    assigned_task: null,
    status: 'pending',
    amount: amount ? parseFloat(amount) : null,
    preferred_task: preferred_task || null,
    preferred_duration: preferred_duration || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateVolunteerStatus(id, status) {
  const { data, error } = await db.from('volunteers').update({ status }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function assignTask(id, task, stallId = null) {
  const update = { assigned_task: task };
  if (stallId !== undefined) update.stall_id = stallId || null;
  const { data, error } = await db.from('volunteers').update(update).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteVolunteer(id) {
  const { error } = await db.from('volunteers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function startSession(id, timeLimitMinutes) {
  const mins = parseInt(timeLimitMinutes) || 120;
  const token = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + mins * 60 * 1000);
  const { data, error } = await db.from('volunteers').update({
    session_token: token,
    session_started_at: now.toISOString(),
    session_expires_at: expires.toISOString(),
    time_limit_minutes: mins,
    session_used: false,
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function stopSession(id) {
  const { data, error } = await db.from('volunteers').update({
    session_token: null,
    session_started_at: null,
    session_expires_at: null,
    session_used: true,
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function validateSession(token) {
  const { data } = await db.from('volunteers').select('*').eq('session_token', token).single();
  if (!data) return null;
  if (data.session_used) return null;
  if (data.session_expires_at && new Date() > new Date(data.session_expires_at)) {
    await stopSession(data.id);
    return null;
  }
  return data;
}

module.exports = { getVolunteersByEvent, getVolunteerById, createVolunteer, updateVolunteerStatus, assignTask, startSession, stopSession, validateSession, deleteVolunteer };
