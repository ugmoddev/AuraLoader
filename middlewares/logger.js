const db = require('../database/database');

class LoggerMiddleware {
  async logExecution(loaderId, ip, hwid, status, message, version, latency) {
    try {
      await db.run(`
        INSERT INTO logs (loaderId, ip, hwid, status, message, version, latency)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [loaderId, ip, hwid, status, message, version, latency]);

      // Update loader execution count
      await db.run(`
        UPDATE loaders 
        SET executions = executions + 1, lastExecution = CURRENT_TIMESTAMP 
        WHERE loaderId = ?
      `, [loaderId]);
    } catch (error) {
      console.error('Error logging execution:', error);
    }
  }

  async getLogs(filters = {}) {
    let sql = 'SELECT * FROM logs WHERE 1=1';
    const params = [];

    if (filters.loaderId) {
      sql += ' AND loaderId = ?';
      params.push(filters.loaderId);
    }

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.fromDate) {
      sql += ' AND createdAt >= ?';
      params.push(filters.fromDate);
    }

    if (filters.toDate) {
      sql += ' AND createdAt <= ?';
      params.push(filters.toDate);
    }

    sql += ' ORDER BY createdAt DESC LIMIT 1000';
    return await db.query(sql, params);
  }
}

module.exports = new LoggerMiddleware();