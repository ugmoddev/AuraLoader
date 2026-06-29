const fs = require('fs');
const path = require('path');

class FileSystem {
  constructor() {
    this.baseDir = path.join(__dirname, '..', 'storage');
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = ['scripts', 'cache', 'logs', 'backups', 'uploads', 'temp'];
    dirs.forEach(dir => {
      const fullPath = path.join(this.baseDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  async writeFile(filePath, content) {
    const fullPath = path.join(this.baseDir, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      fs.writeFile(fullPath, content, 'utf8', (err) => {
        if (err) reject(err);
        else resolve({ path: fullPath, size: content.length });
      });
    });
  }

  async readFile(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    return new Promise((resolve, reject) => {
      fs.readFile(fullPath, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }
}

module.exports = new FileSystem();
