const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const colors = require('colors');

const DB_PATH = process.env.VERCEL
  ? path.join(require('os').tmpdir(), 'rakt-setu.db')
  : path.join(__dirname, '..', 'rakt-setu.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

function connectDB() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      _id TEXT PRIMARY KEY,
      bloodGroup TEXT NOT NULL,
      requestedBy TEXT NOT NULL,
      acceptedBy TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      location_lat REAL,
      location_lng REAL,
      address TEXT,
      notes TEXT,
      patientName TEXT,
      patientPhoto TEXT,
      patientDocuments TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      _id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('admin','organisation','donar','hospital')),
      name TEXT,
      organisationName TEXT,
      hospitalName TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      website TEXT,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      bloodGroup TEXT CHECK(bloodGroup IN ('O+','O-','AB+','AB-','A+','A-','B+','B-') OR bloodGroup IS NULL),
      location_lat REAL,
      location_lng REAL,
      profilePicture TEXT,
      lastDonation TEXT,
      totalDonations INTEGER DEFAULT 0,
      isAvailable INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      _id TEXT PRIMARY KEY,
      inventoryType TEXT NOT NULL CHECK(inventoryType IN ('in','out')),
      bloodGroup TEXT NOT NULL CHECK(bloodGroup IN ('O+','O-','AB+','AB-','A+','A-','B+','B-')),
      quantity INTEGER NOT NULL,
      email TEXT NOT NULL,
      organisation TEXT NOT NULL REFERENCES users(_id),
      hospital TEXT REFERENCES users(_id),
      donar TEXT REFERENCES users(_id),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  if (!userColumns.some(column => column.name === 'profilePicture')) {
    db.exec('ALTER TABLE users ADD COLUMN profilePicture TEXT');
  }

  const requestColumns = db.prepare("PRAGMA table_info(requests)").all();
  const requestMigrations = {
    patientName: 'TEXT',
    patientPhoto: 'TEXT',
    patientDocuments: 'TEXT'
  };
  Object.entries(requestMigrations).forEach(([name, type]) => {
    if (!requestColumns.some(column => column.name === name)) {
      db.exec(`ALTER TABLE requests ADD COLUMN ${name} ${type}`);
    }
  });

  console.log(`connected to SQLite database`.bgCyan.white);
}

// --- Mongoose-compatible Query Builder ---

function rowToDoc(row, tableName) {
  if (!row) return null;
  const doc = { ...row };

  // Nested location object for users
  if (tableName === 'users') {
    if (doc.location_lat != null && doc.location_lng != null) {
      doc.location = { lat: doc.location_lat, lng: doc.location_lng };
    } else {
      doc.location = null;
    }
    delete doc.location_lat;
    delete doc.location_lng;
    doc.isAvailable = !!doc.isAvailable;
  }

  // Date conversions
  if (doc.createdAt) doc.createdAt = new Date(doc.createdAt);
  if (doc.updatedAt) doc.updatedAt = new Date(doc.updatedAt);
  if (doc.lastDonation) doc.lastDonation = new Date(doc.lastDonation);

  // _doc: non-enumerable so it doesn't appear in JSON.stringify
  Object.defineProperty(doc, '_doc', {
    get() { return doc; },
    enumerable: false
  });

  // toJSON strips _doc to avoid circular refs
  doc.toJSON = function () {
    const obj = {};
    for (const key of Object.keys(this)) {
      if (key !== 'toJSON') obj[key] = this[key];
    }
    return obj;
  };

  return doc;
}

function buildWhere(conditions, params) {
  const clauses = [];
  for (const [key, value] of Object.entries(conditions)) {
    if (value && typeof value === 'object' && value.$in) {
      if (value.$in.length === 0) {
        clauses.push('0=1'); // empty $in = no results
      } else {
        const placeholders = value.$in.map(() => '?').join(',');
        clauses.push(`${key} IN (${placeholders})`);
        params.push(...value.$in.map(String));
      }
    } else if (value && typeof value === 'object' && value.$gte) {
      clauses.push(`${key} >= ?`);
      params.push(value.$gte instanceof Date ? value.$gte.toISOString() : value.$gte);
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Skip complex nested objects we can't query
    } else {
      clauses.push(`${key} = ?`);
      params.push(value instanceof Date ? value.toISOString() : value);
    }
  }
  return clauses;
}

class Query {
  constructor(tableName, conditions) {
    this._table = tableName;
    this._conditions = conditions || {};
    this._sortObj = null;
    this._limitN = null;
    this._selectFields = null;
    this._populates = [];
  }

  sort(s) { this._sortObj = s; return this; }
  limit(n) { this._limitN = n; return this; }
  select(s) { this._selectFields = s; return this; }
  populate(field, selectFields) { this._populates.push({ field, selectFields }); return this; }

  then(resolve, reject) {
    try { resolve(this._exec()); } catch (e) { reject(e); }
  }

  _exec() {
    const db = getDb();
    const params = [];
    let sql = `SELECT * FROM ${this._table}`;

    const clauses = buildWhere(this._conditions, params);
    if (clauses.length > 0) sql += ` WHERE ${clauses.join(' AND ')}`;

    if (this._sortObj) {
      const sorts = Object.entries(this._sortObj).map(
        ([f, d]) => `${f} ${d === -1 ? 'DESC' : 'ASC'}`
      );
      sql += ` ORDER BY ${sorts.join(', ')}`;
    }

    if (this._limitN) sql += ` LIMIT ${this._limitN}`;

    let rows = db.prepare(sql).all(...params).map(r => rowToDoc(r, this._table));

    // Populate references (always from users table in this project)
    for (const pop of this._populates) {
      const ids = [...new Set(rows.map(r => r[pop.field]).filter(Boolean))];
      if (ids.length === 0) continue;

      const ph = ids.map(() => '?').join(',');
      const cols = pop.selectFields
        ? ['_id', ...pop.selectFields.split(' ')].join(', ')
        : '*';
      const refs = db.prepare(`SELECT ${cols} FROM users WHERE _id IN (${ph})`).all(...ids);
      const refMap = {};
      for (const r of refs) refMap[r._id] = rowToDoc(r, 'users');

      for (const row of rows) {
        if (row[pop.field] && refMap[row[pop.field]]) {
          row[pop.field] = refMap[row[pop.field]];
        }
      }
    }

    // Select projection
    if (this._selectFields) {
      const fields = this._selectFields.split(' ').filter(Boolean);
      rows = rows.map(row => {
        const out = { _id: row._id };
        for (const f of fields) {
          if (row[f] !== undefined) out[f] = row[f];
        }
        Object.defineProperty(out, '_doc', {
          get() { return out; },
          enumerable: false
        });
        return out;
      });
    }

    return rows;
  }
}

// --- Model Factory ---

function createModel(tableName, columns) {
  const model = function (data) {
    const now = new Date().toISOString();
    this._id = data._id || generateId();
    this.createdAt = now;
    this.updatedAt = now;

    for (const col of columns) {
      if (data[col] !== undefined) {
        this[col] = data[col];
      }
    }

    // Flatten location for storage
    if (data.location && typeof data.location === 'object' && data.location.lat !== undefined) {
      this.location_lat = data.location.lat;
      this.location_lng = data.location.lng;
    }

    const self = this;
    Object.defineProperty(this, '_doc', {
      get() { return self; },
      enumerable: false
    });

    this.toJSON = function () {
      const obj = {};
      for (const key of Object.keys(this)) {
        if (key !== 'toJSON') obj[key] = this[key];
      }
      return obj;
    };
  };

  model.prototype.save = function () {
    const db = getDb();
    const row = {};
    row._id = this._id;
    row.createdAt = this.createdAt;
    row.updatedAt = this.updatedAt;

    for (const col of columns) {
      if (this[col] !== undefined) {
        row[col] = this[col];
      }
    }

    // Handle nested location
    if (tableName === 'users') {
      if (this.location_lat !== undefined) row.location_lat = this.location_lat;
      if (this.location_lng !== undefined) row.location_lng = this.location_lng;
      if (this.location && typeof this.location === 'object') {
        row.location_lat = this.location.lat;
        row.location_lng = this.location.lng;
      }
    }

    const keys = Object.keys(row);
    const vals = Object.values(row).map(v => {
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (v instanceof Date) return v.toISOString();
      return v;
    });
    const ph = keys.map(() => '?').join(',');

    db.prepare(`INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${ph})`).run(...vals);

    return this;
  };

  // Static methods

  model.find = function (conditions) {
    return new Query(tableName, conditions);
  };

  model.findOne = function (conditions) {
    const db = getDb();
    const params = [];
    let sql = `SELECT * FROM ${tableName}`;
    const clauses = buildWhere(conditions, params);
    if (clauses.length > 0) sql += ` WHERE ${clauses.join(' AND ')}`;
    sql += ' LIMIT 1';
    const row = db.prepare(sql).get(...params);
    return Promise.resolve(row ? rowToDoc(row, tableName) : null);
  };

  model.findById = function (id) {
    return model.findOne({ _id: String(id) });
  };

  model.findByIdAndDelete = function (id) {
    const db = getDb();
    db.prepare(`DELETE FROM ${tableName} WHERE _id = ?`).run(String(id));
    return Promise.resolve();
  };

  model.aggregate = function (pipeline) {
    const db = getDb();

    // Extract $match and $group stages
    const matchStage = pipeline.find(s => s.$match);
    const groupStage = pipeline.find(s => s.$group);

    const params = [];
    let sql = '';

    if (groupStage) {
      // Build GROUP BY query
      const groupId = groupStage.$group._id;
      const sumField = Object.entries(groupStage.$group).find(
        ([k, v]) => k !== '_id' && v && v.$sum
      );

      const sumCol = sumField ? sumField[1].$sum.replace('$', '') : 'quantity';
      const sumAlias = sumField ? sumField[0] : 'total';

      if (groupId === null) {
        sql = `SELECT NULL as _id, SUM(${sumCol}) as ${sumAlias} FROM ${tableName}`;
      } else {
        const groupCol = groupId.replace('$', '');
        sql = `SELECT ${groupCol} as _id, SUM(${sumCol}) as ${sumAlias} FROM ${tableName}`;
      }

      if (matchStage) {
        const clauses = buildWhere(matchStage.$match, params);
        if (clauses.length > 0) sql += ` WHERE ${clauses.join(' AND ')}`;
      }

      if (groupId !== null) {
        const groupCol = groupId.replace('$', '');
        sql += ` GROUP BY ${groupCol}`;
      }
    }

    const rows = db.prepare(sql).all(...params);
    return Promise.resolve(rows);
  };

  model.distinct = function (field, conditions) {
    const db = getDb();
    const params = [];
    let sql = `SELECT DISTINCT ${field} FROM ${tableName}`;
    if (conditions) {
      const clauses = buildWhere(conditions, params);
      if (clauses.length > 0) sql += ` WHERE ${clauses.join(' AND ')}`;
    }
    const rows = db.prepare(sql).all(...params);
    return Promise.resolve(rows.map(r => r[field]).filter(Boolean));
  };

  return model;
}

module.exports = { connectDB, getDb, generateId, createModel };
