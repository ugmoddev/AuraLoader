class Obfuscator {
  generateRandomName() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let name = '';
    for (let i = 0; i < 6; i++) {
      name += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return name;
  }

  obfuscate(code, options = {}) {
    let obfuscated = code;
    
    // Random variables
    const varRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const matches = [...code.matchAll(varRegex)];
    const replacements = {};
    
    matches.forEach(match => {
      const varName = match[1];
      if (!replacements[varName]) {
        replacements[varName] = this.generateRandomName();
      }
    });
    
    Object.entries(replacements).forEach(([original, random]) => {
      const regex = new RegExp(`\\b${original}\\b`, 'g');
      obfuscated = obfuscated.replace(regex, random);
    });

    return obfuscated;
  }
}

module.exports = new Obfuscator();
