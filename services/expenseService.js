const db = require('../config/db');
const { uploadFileToBucket } = require('./eventService');
const { compressImage } = require('../middleware/compress');
const path = require('path');
const crypto = require('crypto');

async function getExpensesByEvent(eventId) {
  const { data, error } = await db.from('expenses').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function getTotalByEvent(eventId) {
  const expenses = await getExpensesByEvent(eventId);
  return expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
}

async function createExpense(eventId, { description, amount, category }, file) {
  let receipt_url = null;
  if (file) {
    const { buffer, mimetype } = await compressImage(file.buffer, file.mimetype);
    const ext = path.extname(file.originalname).toLowerCase();
    const filePath = `${eventId}/${crypto.randomUUID()}${ext}`;
    receipt_url = await uploadFileToBucket('receipts', filePath, buffer, mimetype);
  }

  const { data, error } = await db.from('expenses').insert({
    event_id: eventId,
    description,
    amount: parseFloat(amount),
    category: category || null,
    receipt_url,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteExpense(id) {
  const { error } = await db.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

module.exports = { getExpensesByEvent, getTotalByEvent, createExpense, deleteExpense };
