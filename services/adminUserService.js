const crypto = require('crypto');
const db = require('../config/db');

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, hash) => {
      if (err) return reject(err);
      resolve(`${salt}:${hash.toString('hex')}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(':');
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) return reject(err);
      resolve(derived.toString('hex') === hash);
    });
  });
}

async function createAdmin({ name, email, password }) {
  const password_hash = await hashPassword(password);
  const { data, error } = await db.from('admin_users').insert({ name, email, password_hash, role: 'admin' });
  if (error) throw new Error(error.message);
  return data;
}

async function getAdminByEmail(email) {
  const { data, error } = await db.from('admin_users').eq('email', email).single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
}

async function getAllAdmins() {
  const { data: admins, error } = await db.from('admin_users').select('*');
  if (error) throw new Error(error.message);
  const { data: assignments } = await db.from('event_admins').select('*');
  const assignmentList = assignments || [];
  return (admins || []).map(a => ({
    ...a,
    event_count: assignmentList.filter(ea => ea.admin_id === a.id).length,
  }));
}

async function getAdminById(id) {
  const { data, error } = await db.from('admin_users').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteAdmin(id) {
  const { error } = await db.from('admin_users').eq('id', id).delete();
  if (error) throw new Error(error.message);
}

async function getAdminEvents(adminId) {
  const { data: assignments, error } = await db.from('event_admins').eq('admin_id', adminId);
  if (error) throw new Error(error.message);
  if (!assignments || assignments.length === 0) return [];
  const eventIds = assignments.map(a => a.event_id);
  const { data: events, error: evErr } = await db.from('events').in('id', eventIds);
  if (evErr) throw new Error(evErr.message);
  return events || [];
}

async function setAdminEvents(adminId, eventIds) {
  await db.from('event_admins').eq('admin_id', adminId).delete();
  if (!eventIds || eventIds.length === 0) return;
  const rows = eventIds.map(event_id => ({ event_id, admin_id: adminId }));
  const { error } = await db.from('event_admins').insert(rows);
  if (error) throw new Error(error.message);
}

async function canAccessEvent(adminId, eventId) {
  const { data, error } = await db.from('event_admins').eq('admin_id', adminId).eq('event_id', eventId).single();
  if (error) return false;
  return !!data;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAdmin,
  getAdminByEmail,
  getAllAdmins,
  getAdminById,
  deleteAdmin,
  getAdminEvents,
  setAdminEvents,
  canAccessEvent,
};
