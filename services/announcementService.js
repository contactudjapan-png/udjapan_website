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

async function createAnnouncement({ title, title_en, title_de, content, content_en, content_de, sort_order, link_url, link_text }) {
  const { data, error } = await db.from('announcements').insert({
    title: title || '',
    title_en: title_en || null,
    title_de: title_de || null,
    content: content || '',
    content_en: content_en || null,
    content_de: content_de || null,
    sort_order: parseInt(sort_order) || 0,
    is_active: true,
    link_url: link_url || null,
    link_text: link_text || null,
  }).select().single();
  if (error) throw error;
  return data;
}

async function updateAnnouncement(id, { title, title_en, title_de, content, content_en, content_de, sort_order, is_active, link_url, link_text }) {
  const { data, error } = await db.from('announcements').update({
    title: title || '',
    title_en: title_en || null,
    title_de: title_de || null,
    content: content || '',
    content_en: content_en || null,
    content_de: content_de || null,
    sort_order: parseInt(sort_order) || 0,
    is_active: is_active === 'on' || is_active === true,
    link_url: link_url || null,
    link_text: link_text || null,
  }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteAnnouncement(id) {
  const { error } = await db.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { getActiveAnnouncements, getAllAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement };
