const db = require('../config/db');

async function getActiveFaqs() {
  const { data, error } = await db.from('faqs')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getAllFaqs() {
  const { data, error } = await db.from('faqs')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getFaqById(id) {
  const { data, error } = await db.from('faqs').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function createFaq({ category, question_bn, answer_bn, question_en, answer_en, question_de, answer_de, sort_order }) {
  const { data, error } = await db.from('faqs').insert({
    category: category || 'general',
    question_bn: question_bn || '',
    answer_bn: answer_bn || '',
    question_en: question_en || null,
    answer_en: answer_en || null,
    question_de: question_de || null,
    answer_de: answer_de || null,
    sort_order: parseInt(sort_order) || 0,
    is_active: true,
  }).select().single();
  if (error) throw error;
  return data;
}

async function updateFaq(id, { category, question_bn, answer_bn, question_en, answer_en, question_de, answer_de, sort_order, is_active }) {
  const { data, error } = await db.from('faqs').update({
    category: category || 'general',
    question_bn: question_bn || '',
    answer_bn: answer_bn || '',
    question_en: question_en || null,
    answer_en: answer_en || null,
    question_de: question_de || null,
    answer_de: answer_de || null,
    sort_order: parseInt(sort_order) || 0,
    is_active: is_active === 'on' || is_active === true,
  }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteFaq(id) {
  const { error } = await db.from('faqs').delete().eq('id', id);
  if (error) throw error;
}

module.exports = { getActiveFaqs, getAllFaqs, getFaqById, createFaq, updateFaq, deleteFaq };
