const db = require('../config/db');

async function getActiveAds() {
  const { data, error } = await db.from('advertisements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getAllAds() {
  const { data, error } = await db.from('advertisements')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getAdById(id) {
  const { data, error } = await db.from('advertisements')
    .select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function createAd({ title, description, image_url, link_url, sort_order }) {
  const { data, error } = await db.from('advertisements').insert({
    title: title || '',
    description: description || '',
    image_url: image_url || null,
    link_url: link_url || null,
    sort_order: parseInt(sort_order) || 0,
    is_active: true,
  }).select().single();
  if (error) throw error;
  return data;
}

async function updateAd(id, { title, description, image_url, link_url, sort_order, is_active }) {
  const update = {
    title: title || '',
    description: description || '',
    link_url: link_url || null,
    sort_order: parseInt(sort_order) || 0,
    is_active: is_active === 'on' || is_active === true,
  };
  if (image_url !== undefined) update.image_url = image_url;
  const { data, error } = await db.from('advertisements').update(update).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteAd(id) {
  const { error } = await db.from('advertisements').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { getActiveAds, getAllAds, getAdById, createAd, updateAd, deleteAd };
