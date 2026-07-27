const db = require('../config/db');

async function log(userEmail, action, entityType, entityId, details) {
  try {
    await db.from('audit_log').insert({
      user_email: userEmail || null,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      details: details || null,
    });
  } catch (err) {
    console.error('[Audit] Log error:', err.message);
  }
}

async function getLog(filters = {}) {
  let query = db.from('audit_log').select('*').order('created_at', { ascending: false });
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
  if (filters.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { log, getLog };
