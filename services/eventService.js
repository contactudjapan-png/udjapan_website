const db = require('../config/db');

async function getAllEvents() {
  const { data, error } = await db.from('events').select('*').order('event_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function getActiveEvents() {
  const { data, error } = await db.from('events').select('*').eq('is_active', true).order('event_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

async function getEventById(id) {
  const { data, error } = await db.from('events').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

function parsePricingFields(eventData) {
  return {
    price_early_bird: eventData.price_early_bird ? parseFloat(eventData.price_early_bird) : null,
    early_bird_deadline: eventData.early_bird_deadline || null,
    price_mid: eventData.price_mid ? parseFloat(eventData.price_mid) : null,
    mid_deadline: eventData.mid_deadline || null,
    price_onspot: eventData.price_onspot ? parseFloat(eventData.price_onspot) : null,
  };
}

async function createEvent(eventData) {
  const payload = {
    title: eventData.title,
    description: eventData.description || '',
    event_date: eventData.event_date,
    location: eventData.location || '',
    max_capacity: parseInt(eventData.max_capacity) || null,
    is_active: eventData.is_active === 'on' || eventData.is_active === true,
    registration_open: eventData.registration_open === 'on' || eventData.registration_open === true,
    banner_url: null,
    paypal_qr_url: null,
    ...parsePricingFields(eventData),
    stall_obs_types: eventData.stall_obs_types || null,
  };
  const { data, error } = await db.from('events').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateEvent(id, eventData) {
  const payload = {
    title: eventData.title,
    description: eventData.description || '',
    event_date: eventData.event_date,
    location: eventData.location || '',
    max_capacity: parseInt(eventData.max_capacity) || null,
    is_active: eventData.is_active === 'on' || eventData.is_active === true,
    registration_open: eventData.registration_open === 'on' || eventData.registration_open === true,
    ...parsePricingFields(eventData),
    stall_obs_types: eventData.stall_obs_types || null,
  };
  const { data, error } = await db.from('events').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteEvent(id) {
  const { error } = await db.from('events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function updateBannerUrl(id, url) {
  const { data, error } = await db.from('events').update({ banner_url: url }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updatePaypalQrUrl(id, url) {
  const { data, error } = await db.from('events').update({ paypal_qr_url: url }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function uploadFileToBucket(bucket, filePath, buffer, mimetype) {
  const { data, error } = await db.storage.from(bucket).upload(filePath, buffer, {
    contentType: mimetype,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return `/storage/${bucket}/${filePath}`;
}

module.exports = {
  getAllEvents,
  getActiveEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  updateBannerUrl,
  updatePaypalQrUrl,
  uploadFileToBucket,
};
