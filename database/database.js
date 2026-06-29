const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

class Database {
  constructor() {
    const dbDir = path.join(__dirname);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    this.dbPath = path.join(dbDir, 'database.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.init();
  }

  init() {
    // Users
    this.db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'user',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastLogin DATETIME,
      apiKey TEXT UNIQUE,
      status TEXT DEFAULT 'active'
    )`);

    // Scripts
    this.db.run(`CREATE TABLE IF NOT EXISTS scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      author TEXT,
      description TEXT,
      version TEXT DEFAULT '1.0.0',
      enabled INTEGER DEFAULT 1,
      source TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      downloads INTEGER DEFAULT 0,
      category TEXT,
      tags TEXT
    )`);

    // Loaders
    this.db.run(`CREATE TABLE IF NOT EXISTS loaders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loaderId TEXT UNIQUE NOT NULL,
      scriptId INTEGER,
      secret TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      version TEXT DEFAULT '1.0.0',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastExecution DATETIME,
      executions INTEGER DEFAULT 0
    )`);

    // Settings
    this.db.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create admin user
    this.createAdmin();
  }

  async createAdmin() {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hashed = await bcrypt.hash(password, 10);
    const apiKey = crypto.randomBytes(32).toString('hex');
    this.db.run(`INSERT OR IGNORE INTO users (username, password, role, apiKey) VALUES (?, ?, 'admin', ?)`, [username, hashed, apiKey]);
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID });
      });
    });
  }
}

module.exports = new Database();
