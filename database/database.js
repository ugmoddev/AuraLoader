const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

class Database {
  constructor() {
    // Sử dụng đường dẫn tương đối, đảm bảo thư mục database tồn tại
    const dbDir = path.join(__dirname);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'database.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.init();
  }

  init() {
    this.createTables();
  }

  createTables() {
    // Bảng users
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'user',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastLogin DATETIME,
        apiKey TEXT UNIQUE,
        status TEXT DEFAULT 'active'
      )
    `);

    // Bảng scripts
    this.db.run(`
      CREATE TABLE IF NOT EXISTS scripts (
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
        rating REAL DEFAULT 0,
        category TEXT,
        tags TEXT
      )
    `);

    // Bảng loaders
    this.db.run(`
      CREATE TABLE IF NOT EXISTS loaders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loaderId TEXT UNIQUE NOT NULL,
        scriptId INTEGER,
        secret TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        version TEXT DEFAULT '1.0.0',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastExecution DATETIME,
        executions INTEGER DEFAULT 0,
        FOREIGN KEY (scriptId) REFERENCES scripts(id)
      )
    `);

    // Bảng logs
    this.db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loaderId TEXT,
        ip TEXT,
        hwid TEXT,
        status TEXT,
        message TEXT,
        version TEXT,
        latency INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loaderId) REFERENCES loaders(loaderId)
      )
    `);

    // Bảng apikeys
    this.db.run(`
      CREATE TABLE IF NOT EXISTS apikeys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        owner TEXT,
        permissions TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastUsed DATETIME,
        status TEXT DEFAULT 'active'
      )
    `);

    // Bảng settings - QUAN TRỌNG: Thêm bảng này để tránh lỗi
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating settings table:', err);
      } else {
        this.createDefaultSettings();
      }
    });

    // Bảng script_versions
    this.db.run(`
      CREATE TABLE IF NOT EXISTS script_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scriptId INTEGER,
        version TEXT NOT NULL,
        source TEXT,
        changes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scriptId) REFERENCES scripts(id)
      )
    `);

    // Tạo tài khoản admin mặc định sau khi các bảng được tạo
    setTimeout(() => {
      this.createAdminUser();
    }, 100);
  }

  async createAdminUser() {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    try {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const apiKey = crypto.randomBytes(32).toString('hex');

      this.db.run(`
        INSERT OR IGNORE INTO users (username, password, role, apiKey, email)
        VALUES (?, ?, 'admin', ?, 'admin@aurahub.com')
      `, [adminUsername, hashedPassword, apiKey]);
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  }

  createDefaultSettings() {
    const defaultSettings = [
      ['siteName', 'AuraHub Loader Platform'],
      ['logo', '/public/img/logo.png'],
      ['theme', 'dark'],
      ['apiUrl', 'http://localhost:3000/api'],
      ['cdnUrl', 'http://localhost:3000/cdn'],
      ['loaderPrefix', 'Aura'],
      ['autoBackup', 'true'],
      ['autoUpdate', 'true'],
      ['maintenance', 'false'],
      ['registration', 'true']
    ];

    defaultSettings.forEach(([key, value]) => {
      this.db.run(`
        INSERT OR IGNORE INTO settings (key, value)
        VALUES (?, ?)
      `, [key, value]);
    });
  }

  // Các phương thức helper (query, get, run, close) giữ nguyên
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
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = new Database();
