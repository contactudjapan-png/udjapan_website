const db = require('../config/db');
const registrationService = require('./registrationService');
const crypto = require('crypto');

async function getWaitlistByEvent(eventId) {
  const { data, error } = await db.from('waitlist').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

async function addToWaitlist(eventId, { name, email }) {
  const { data, error } = await db.from('waitlist').insert({
    event_id: eventId,
    name,
    email,
    notified: false,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function promoteToRegistration(id) {
  const { data: entry, error } = await db.from('waitlist').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  const registration = await registrationService.createRegistration(entry.event_id, {
    name: entry.name,
    email: entry.email,
  });
  await db.from('waitlist').delete().eq('id', id);
  return registration;
}

async function deleteWaitlist(id) {
  const { error } = await db.from('waitlist').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function countByEvent(eventId) {
  const { data } = await db.from('waitlist').select('*').eq('event_id', eventId);
  return (data || []).length;
}

module.exports = { getWaitlistByEvent, addToWaitlist, promoteToRegistration, deleteWaitlist, countByEvent };
