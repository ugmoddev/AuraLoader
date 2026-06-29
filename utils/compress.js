const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

class Compress {
  // GZIP
  async gzipCompress(data) {
    const buffer = Buffer.from(data);
    return await gzip(buffer);
  }

  async gzipDecompress(data) {
    const buffer = Buffer.from(data);
    const decompressed = await gunzip(buffer);
    return decompressed.toString('utf8');
  }

  // Deflate
  async deflateCompress(data) {
    const buffer = Buffer.from(data);
    return await deflate(buffer);
  }

  async deflateDecompress(data) {
    const buffer = Buffer.from(data);
    const decompressed = await inflate(buffer);
    return decompressed.toString('utf8');
  }

  // Brotli
  async brotliCompress(data) {
    const buffer = Buffer.from(data);
    return await brotliCompress(buffer);
  }

  async brotliDecompress(data) {
    const buffer = Buffer.from(data);
    const decompressed = await brotliDecompress(buffer);
    return decompressed.toString('utf8');
  }

  // Auto compress based on best algorithm
  async compress(data, algorithm = 'gzip') {
    switch(algorithm) {
      case 'gzip':
        return await this.gzipCompress(data);
      case 'deflate':
        return await this.deflateCompress(data);
      case 'brotli':
        return await this.brotliCompress(data);
      default:
        return await this.gzipCompress(data);
    }
  }

  async decompress(data, algorithm = 'gzip') {
    switch(algorithm) {
      case 'gzip':
        return await this.gzipDecompress(data);
      case 'deflate':
        return await this.deflateDecompress(data);
      case 'brotli':
        return await this.brotliDecompress(data);
      default:
        return await this.gzipDecompress(data);
    }
  }

  // String compression
  compressString(data, algorithm = 'gzip') {
    return this.compress(data, algorithm);
  }

  decompressString(data, algorithm = 'gzip') {
    return this.decompress(data, algorithm);
  }

  // JSON compression
  async compressJSON(obj, algorithm = 'gzip') {
    const jsonString = JSON.stringify(obj);
    return await this.compress(jsonString, algorithm);
  }

  async decompressJSON(data, algorithm = 'gzip') {
    const jsonString = await this.decompress(data, algorithm);
    return JSON.parse(jsonString);
  }

  // Get compression ratio
  getCompressionRatio(original, compressed) {
    const originalSize = Buffer.from(original).length;
    const compressedSize = Buffer.from(compressed).length;
    return {
      originalSize,
      compressedSize,
      ratio: (compressedSize / originalSize * 100).toFixed(2) + '%',
      saved: (originalSize - compressedSize) / (1024 * 1024) + ' MB'
    };
  }

  // Determine best compression
  async findBestCompression(data) {
    const algorithms = ['gzip', 'deflate', 'brotli'];
    const results = [];

    for (const algo of algorithms) {
      try {
        const compressed = await this.compress(data, algo);
        const ratio = this.getCompressionRatio(data, compressed);
        results.push({
          algorithm: algo,
          compressedSize: ratio.compressedSize,
          ratio: ratio.ratio,
          saved: ratio.saved
        });
      } catch (error) {
        // Skip failed algorithms
      }
    }

    results.sort((a, b) => a.compressedSize - b.compressedSize);
    return results.length > 0 ? results[0] : null;
  }
}

module.exports = new Compress();