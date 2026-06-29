const crypto = require('crypto');

class Encoder {
  base64Encode(data) {
    return Buffer.from(data).toString('base64');
  }

  base64Decode(data) {
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  hexEncode(data) {
    return Buffer.from(data).toString('hex');
  }

  hexDecode(data) {
    return Buffer.from(data, 'hex').toString('utf-8');
  }

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

  randomXorEncode(data) {
    const key = crypto.randomBytes(16).toString('hex');
    const encoded = this.xorEncode(data, key);
    return { encoded, key };
  }
}

module.exports = new Encoder();
