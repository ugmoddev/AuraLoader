const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseUtils {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'database', 'database.db');
  }

  async initialize() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new sqlite3.Database(this.dbPath);
    await this.createTables();
  }

  async createTables() {
    // Users table
    await this.run(`
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

    // Scripts table
    await this.run(`
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

    // Loaders table
    await this.run(`
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

    // Logs table
    await this.run(`
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

    // API Keys table
    await this.run(`
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

    // Settings table
    await this.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Script versions table
    await this.run(`
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

    // Create indexes
    await this.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_scripts_uuid ON scripts(uuid)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_loaders_loaderId ON loaders(loaderId)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_logs_loaderId ON logs(loaderId)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_logs_createdAt ON logs(createdAt)');
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
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

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Transaction
  async transaction(callback) {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  // Backup
  async backup() {
    const backupPath = path.join(__dirname, '..', 'storage', 'backups', `backup_${Date.now()}.db`);
    const dir = path.dirname(backupPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db.backup(backupPath, (err) => {
        if (err) reject(err);
        else resolve({ backupPath, timestamp: new Date() });
      });
    });
  }

  // Get database info
  async getInfo() {
    const [tables, size] = await Promise.all([
      this.query("SELECT name FROM sqlite_master WHERE type='table'"),
      this.get('PRAGMA page_count'),
      this.get('PRAGMA page_size')
    ]);

    return {
      tables: tables.map(t => t.name),
      pageCount: size ? size['page_count'] : 0,
      pageSize: size ? size['page_size'] : 0,
      size: size ? (size['page_count'] * size['page_size']) : 0
    };
  }
}

module.exports = new DatabaseUtils();