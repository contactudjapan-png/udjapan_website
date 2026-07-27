const db = require('../config/db');

async function getActiveAnnouncements() {
  const { data, error } = await db.from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getAllAnnouncements() {
  const { data, error } = await db.from('announcements')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getAnnouncementById(id) {
  const { data, error } = await db.from('announcements')
    .select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function createAnnouncement({ title, content, sort_order }) {
  const { data, error } = await db.from('announcements').insert({
    title: title || '',
    content: content || '',
    sort_order: parseInt(sort_order) || 0,
    is_active: true,
  }).select().single();
  if (error) throw error;
  return data;
}

async function updateAnnouncement(id, { title, content, sort_order, is_active }) {
  const { data, error } = await db.from('announcements').update({
    title: title || '',
    content: content || '',
    sort_order: parseInt(sort_order) || 0,
    is_active: is_active === 'on' || is_active === true,
  }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteAnnouncement(id) {
  const { error } = await db.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { getActiveAnnouncements, getAllAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement };
