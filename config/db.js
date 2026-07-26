const path = require('path');

let db;

if (process.env.USE_MEMORY_DB === 'true') {
  const MemoryDB = require('./memoryDb');
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
  db = new MemoryDB(uploadsDir);
  console.log('[DB] Using in-memory database (local testing mode)');
} else {
  db = require('./supabase');
  console.log('[DB] Using Supabase');
}

module.exports = db;
