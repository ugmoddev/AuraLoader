const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

  // File Operations
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

  async deleteFile(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    return new Promise((resolve, reject) => {
      fs.unlink(fullPath, (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  async renameFile(oldPath, newPath) {
    const fullOldPath = path.join(this.baseDir, oldPath);
    const fullNewPath = path.join(this.baseDir, newPath);
    const dir = path.dirname(fullNewPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      fs.rename(fullOldPath, fullNewPath, (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  async copyFile(srcPath, destPath) {
    const fullSrcPath = path.join(this.baseDir, srcPath);
    const fullDestPath = path.join(this.baseDir, destPath);
    const dir = path.dirname(fullDestPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      fs.copyFile(fullSrcPath, fullDestPath, (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  // Directory Operations
  async listDirectory(dirPath = '') {
    const fullPath = path.join(this.baseDir, dirPath);
    return new Promise((resolve, reject) => {
      fs.readdir(fullPath, (err, files) => {
        if (err) reject(err);
        else {
          const fileStats = files.map(file => {
            const fileFullPath = path.join(fullPath, file);
            const stats = fs.statSync(fileFullPath);
            return {
              name: file,
              path: path.join(dirPath, file),
              size: stats.size,
              isDirectory: stats.isDirectory(),
              modified: stats.mtime
            };
          });
          resolve(fileStats);
        }
      });
    });
  }

  async createDirectory(dirPath) {
    const fullPath = path.join(this.baseDir, dirPath);
    return new Promise((resolve, reject) => {
      fs.mkdir(fullPath, { recursive: true }, (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  async deleteDirectory(dirPath) {
    const fullPath = path.join(this.baseDir, dirPath);
    return new Promise((resolve, reject) => {
      fs.rm(fullPath, { recursive: true, force: true }, (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  // File Info
  getFileInfo(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    try {
      const stats = fs.statSync(fullPath);
      return {
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      return null;
    }
  }

  // Hash
  async getFileHash(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(fullPath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  // Backup
  async createBackup(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    const backupName = `${path.basename(filePath)}_${Date.now()}.backup`;
    const backupPath = path.join('backups', backupName);
    const fullBackupPath = path.join(this.baseDir, backupPath);

    return new Promise((resolve, reject) => {
      fs.copyFile(fullPath, fullBackupPath, (err) => {
        if (err) reject(err);
        else resolve({ backupPath, timestamp: new Date() });
      });
    });
  }

  async listBackups() {
    const backupDir = path.join(this.baseDir, 'backups');
    return new Promise((resolve, reject) => {
      fs.readdir(backupDir, (err, files) => {
        if (err) reject(err);
        else {
          const backups = files
            .filter(f => f.endsWith('.backup'))
            .map(f => {
              const stats = fs.statSync(path.join(backupDir, f));
              return {
                name: f,
                size: stats.size,
                created: stats.birthtime
              };
            })
            .sort((a, b) => b.created - a.created);
          resolve(backups);
        }
      });
    });
  }

  async restoreBackup(backupName, targetPath) {
    const backupPath = path.join('backups', backupName);
    const fullBackupPath = path.join(this.baseDir, backupPath);
    const fullTargetPath = path.join(this.baseDir, targetPath);

    return new Promise((resolve, reject) => {
      fs.copyFile(fullBackupPath, fullTargetPath, (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  // Stats
  async getStorageStats() {
    let totalSize = 0;
    let fileCount = 0;
    let dirCount = 0;

    const walk = (dir) => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          dirCount++;
          walk(fullPath);
        } else {
          fileCount++;
          totalSize += stats.size;
        }
      });
    };

    walk(this.baseDir);
    
    return {
      totalSize,
      fileCount,
      dirCount,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2)
    };
  }
}

module.exports = new FileSystem();