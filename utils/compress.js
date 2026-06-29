const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class Compress {
  async gzipCompress(data) {
    const buffer = Buffer.from(data);
    return await gzip(buffer);
  }

  async gzipDecompress(data) {
    const buffer = Buffer.from(data);
    const decompressed = await gunzip(buffer);
    return decompressed.toString('utf8');
  }
}

module.exports = new Compress();
