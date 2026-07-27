/**
 * In-memory database with Supabase-like query builder API.
 * Set USE_MEMORY_DB=true in .env to use this instead of Supabase.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class QueryBuilder {
  constructor(db, tableName) {
    this._db = db;
    this._table = tableName;
    this._op = 'select';
    this._filters = [];
    this._orderBy = null;
    this._limitN = null;
    this._single = false;
    this._selectFields = '*';
    this._insertData = null;
    this._updateData = null;
    this._returnSelect = false;
  }

  select(fields) {
    if (this._op === 'insert' || this._op === 'update') {
      this._returnSelect = true;
    } else {
      this._op = 'select';
      this._selectFields = fields || '*';
    }
    return this;
  }

  insert(data) {
    this._op = 'insert';
    this._insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data) {
    this._op = 'update';
    this._updateData = data;
    return this;
  }

  delete() {
    this._op = 'delete';
    return this;
  }

  eq(field, value) {
    this._filters.push({ type: 'eq', field, value });
    return this;
  }

  neq(field, value) {
    this._filters.push({ type: 'neq', field, value });
    return this;
  }

  in(field, values) {
    this._filters.push({ type: 'in', field, values });
    return this;
  }

  is(field, value) {
    this._filters.push({ type: 'is', field, value });
    return this;
  }

  ilike(field, pattern) {
    this._filters.push({ type: 'ilike', field, pattern });
    return this;
  }

  order(field, opts = {}) {
    this._orderBy = { field, ascending: opts.ascending !== false };
    return this;
  }

  limit(n) {
    this._limitN = n;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  then(resolve, reject) {
    return Promise.resolve(this._execute()).then(resolve, reject);
  }

  _match(row) {
    for (const f of this._filters) {
      if (f.type === 'eq' && row[f.field] !== f.value) return false;
      if (f.type === 'neq' && row[f.field] === f.value) return false;
      if (f.type === 'in' && !f.values.includes(row[f.field])) return false;
      if (f.type === 'is' && row[f.field] !== f.value) return false;
      if (f.type === 'ilike') {
        const val = (row[f.field] || '').toLowerCase();
        const pat = f.pattern.toLowerCase().replace(/%/g, '');
        if (!val.includes(pat)) return false;
      }
    }
    return true;
  }

  _execute() {
    if (!this._db.tables[this._table]) {
      return { data: null, error: { message: `Table '${this._table}' not found` } };
    }

    const table = this._db.tables[this._table];

    if (this._op === 'insert') {
      const now = new Date().toISOString();
      const records = this._insertData.map(d => ({
        id: crypto.randomUUID(),
        created_at: now,
        ...d,
      }));
      records.forEach(r => table.push(r));
      const result = records.length === 1 ? records[0] : records;
      return { data: result, error: null };
    }

    if (this._op === 'update') {
      const updated = [];
      for (let i = 0; i < table.length; i++) {
        if (this._match(table[i])) {
          table[i] = { ...table[i], ...this._updateData, updated_at: new Date().toISOString() };
          updated.push(table[i]);
        }
      }
      if (this._single) return { data: updated[0] || null, error: null };
      return { data: updated, error: null };
    }

    if (this._op === 'delete') {
      this._db.tables[this._table] = table.filter(r => !this._match(r));
      return { data: null, error: null };
    }

    // select
    let results = table.filter(r => this._match(r));
    if (this._orderBy) {
      const { field, ascending } = this._orderBy;
      results.sort((a, b) => {
        const va = a[field], vb = b[field];
        if (va === vb) return 0;
        const cmp = va > vb ? 1 : -1;
        return ascending ? cmp : -cmp;
      });
    }
    if (this._limitN) results = results.slice(0, this._limitN);

    if (this._single) {
      if (results.length === 0) return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
      return { data: results[0], error: null };
    }
    return { data: results, error: null };
  }
}

class StorageBucket {
  constructor(bucketName, uploadsDir) {
    this._bucket = bucketName;
    this._dir = path.join(uploadsDir, bucketName);
    fs.mkdirSync(this._dir, { recursive: true });
  }

  async upload(filePath, buffer, opts) {
    try {
      const dest = path.join(this._dir, filePath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buffer);
      return { data: { path: filePath }, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  getPublicUrl(filePath) {
    const publicUrl = `/uploads/${this._bucket}/${filePath}`;
    return { data: { publicUrl } };
  }

  async remove(paths) {
    try {
      for (const p of paths) {
        const dest = path.join(this._dir, p);
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
      }
      return { data: {}, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }
}

class MemoryStorage {
  constructor(uploadsDir) {
    this._uploadsDir = uploadsDir;
    this._buckets = {};
  }

  from(bucketName) {
    if (!this._buckets[bucketName]) {
      this._buckets[bucketName] = new StorageBucket(bucketName, this._uploadsDir);
    }
    return this._buckets[bucketName];
  }
}

class MemoryAuth {
  async signInWithPassword({ email, password }) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@udjapon.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    if (email === adminEmail && password === adminPass) {
      return { data: { user: { id: 'admin-user', email } }, error: null };
    }
    return { data: null, error: { message: 'Invalid email or password' } };
  }

  async signOut() {
    return { error: null };
  }

  async getUser(token) {
    return { data: { user: null }, error: null };
  }
}

class MemoryDB {
  constructor(uploadsDir) {
    this.tables = {
      events: [],
      registrations: [],
      submissions: [],
      expenses: [],
      incomes: [],
      polls: [],
      poll_options: [],
      poll_votes: [],
      stalls: [],
      stall_observations: [],
      volunteers: [],
      waitlist: [],
      refunds: [],
      feedback_questions: [],
      feedback_responses: [],
      audit_log: [],
      app_settings: [],
      scan_logs: [],
      email_log: [],
      advertisements: [],
      announcements: [],
      translations: [],
    };
    this.storage = new MemoryStorage(uploadsDir);
    this.auth = new MemoryAuth();
  }

  from(tableName) {
    return new QueryBuilder(this, tableName);
  }
}

module.exports = MemoryDB;
