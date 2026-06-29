const crypto = require('crypto');

class Encoder {
  constructor() {
    this.charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  }

  // Base64 Encoding
  base64Encode(data) {
    return Buffer.from(data).toString('base64');
  }

  base64Decode(data) {
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  // Hex Encoding
  hexEncode(data) {
    return Buffer.from(data).toString('hex');
  }

  hexDecode(data) {
    return Buffer.from(data, 'hex').toString('utf-8');
  }

  // XOR Encoding
  xorEncode(data, key) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      result.push(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result.map(b => String.fromCharCode(b)).join('');
  }

  xorDecode(data, key) {
    return this.xorEncode(data, key);
  }

  // Random XOR
  randomXorEncode(data) {
    const key = crypto.randomBytes(16).toString('hex');
    const encoded = this.xorEncode(data, key);
    return { encoded, key };
  }

  // Byte Array
  toByteArray(data) {
    const bytes = [];
    for (let i = 0; i < data.length; i++) {
      bytes.push(data.charCodeAt(i));
    }
    return bytes;
  }

  fromByteArray(bytes) {
    return String.fromCharCode(...bytes);
  }

  // Chunk Encoding
  chunkEncode(data, chunkSize = 8) {
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Table Encoding
  tableEncode(data) {
    const table = {};
    const keys = Object.keys(data);
    keys.forEach((key, index) => {
      table[`${key}_${index}`] = data[key];
    });
    return table;
  }

  tableDecode(table) {
    const data = {};
    Object.keys(table).forEach(key => {
      const originalKey = key.split('_')[0];
      data[originalKey] = table[key];
    });
    return data;
  }

  // String Splitting
  splitString(data, parts = 2) {
    const partSize = Math.ceil(data.length / parts);
    const result = [];
    for (let i = 0; i < data.length; i += partSize) {
      result.push(data.slice(i, i + partSize));
    }
    return result;
  }

  // Random Seed
  randomSeed(seed) {
    const seedBuffer = Buffer.from(seed);
    const hash = crypto.createHash('sha256').update(seedBuffer).digest();
    return hash.toString('hex');
  }

  // Complex Encoding
  encodeComplex(data, options = {}) {
    let result = data;
    const steps = [];

    // Base64
    if (options.base64) {
      result = this.base64Encode(result);
      steps.push('base64');
    }

    // Hex
    if (options.hex) {
      result = this.hexEncode(result);
      steps.push('hex');
    }

    // XOR
    if (options.xor) {
      const { encoded, key } = this.randomXorEncode(result);
      result = encoded;
      steps.push(`xor_${key}`);
    }

    // Chunk
    if (options.chunk) {
      const chunks = this.chunkEncode(result);
      result = chunks.join('|');
      steps.push('chunk');
    }

    return { data: result, steps };
  }

  decodeComplex(data, steps) {
    let result = data;

    // Reverse steps
    steps.reverse().forEach(step => {
      if (step === 'chunk') {
        result = result.split('|').join('');
      } else if (step.startsWith('xor_')) {
        const key = step.split('_')[1];
        result = this.xorDecode(result, key);
      } else if (step === 'hex') {
        result = this.hexDecode(result);
      } else if (step === 'base64') {
        result = this.base64Decode(result);
      }
    });

    return result;
  }
}

module.exports = new Encoder();