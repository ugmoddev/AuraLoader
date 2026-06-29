const crypto = require('crypto');

class Obfuscator {
  constructor() {
    this.variableNames = [];
    this.stringPool = {};
    this.junkFunctions = [];
  }

  generateRandomName() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let name = '';
    for (let i = 0; i < 6; i++) {
      name += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return name;
  }

  // Random Variables
  randomVariables(code) {
    const varRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const matches = [...code.matchAll(varRegex)];
    const replacements = {};

    matches.forEach(match => {
      const varName = match[1];
      if (!replacements[varName]) {
        replacements[varName] = this.generateRandomName();
      }
    });

    let obfuscated = code;
    Object.entries(replacements).forEach(([original, random]) => {
      const regex = new RegExp(`\\b${original}\\b`, 'g');
      obfuscated = obfuscated.replace(regex, random);
    });

    return obfuscated;
  }

  // Rename Locals
  renameLocals(code) {
    const localRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
    const matches = [...code.matchAll(localRegex)];
    const renameMap = {};

    matches.forEach(match => {
      const name = match[1];
      if (!renameMap[name]) {
        renameMap[name] = this.generateRandomName();
      }
    });

    let obfuscated = code;
    Object.entries(renameMap).forEach(([original, random]) => {
      const regex = new RegExp(`\\b${original}\\b`, 'g');
      obfuscated = obfuscated.replace(regex, random);
    });

    return obfuscated;
  }

  // Split Strings
  splitStrings(code) {
    const stringRegex = /["']([^"']*)["']/g;
    const matches = [...code.matchAll(stringRegex)];

    let obfuscated = code;
    matches.forEach(match => {
      const fullMatch = match[0];
      const content = match[1];
      
      if (content.length > 3) {
        const parts = [];
        for (let i = 0; i < content.length; i += 2) {
          parts.push(`'${content.slice(i, i + 2)}'`);
        }
        const replacement = `'${parts.join(' .. ')}'`;
        obfuscated = obfuscated.replace(fullMatch, replacement);
      }
    });

    return obfuscated;
  }

  // Dead Code
  deadCode(code) {
    const deadBlocks = [
      'if false then return end',
      'local _ = 0; for i=1,100 do _ = _ + i end',
      'local _ = {}; for i=1,1000 do _[i] = i end',
      'local _ = function() return 0 end; _()'
    ];

    const randomBlock = deadBlocks[Math.floor(Math.random() * deadBlocks.length)];
    return `${randomBlock}\n${code}`;
  }

  // Junk Functions
  junkFunctions(code) {
    const junkFuncs = [
      `local function ${this.generateRandomName()}()\n  local t = {}\n  for i=1,100 do\n    t[i] = i * i\n  end\n  return t\nend\n`,
      `local function ${this.generateRandomName()}(x)\n  local y = 0\n  for i=1,x do\n    y = y + i\n  end\n  return y\nend\n`,
      `local function ${this.generateRandomName()}(a, b)\n  local c = a + b\n  local d = a * b\n  local e = c / d\n  return e\nend\n`
    ];

    const randomJunk = junkFuncs[Math.floor(Math.random() * junkFuncs.length)];
    return `${randomJunk}\n${code}`;
  }

  // Random Tables
  randomTables(code) {
    const tableSizes = [3, 5, 10];
    const size = tableSizes[Math.floor(Math.random() * tableSizes.length)];
    
    let table = `local ${this.generateRandomName()} = {\n`;
    for (let i = 1; i <= size; i++) {
      const value = Math.floor(Math.random() * 1000);
      table += `  [${i}] = ${value},\n`;
    }
    table += '}\n';

    return `${table}\n${code}`;
  }

  // Hex Numbers
  hexNumbers(code) {
    const numberRegex = /\b(\d+)\b/g;
    const matches = [...code.matchAll(numberRegex)];
    const replacements = {};

    matches.forEach(match => {
      const num = parseInt(match[1]);
      if (num > 10 && !replacements[match[1]]) {
        replacements[match[1]] = `0x${num.toString(16)}`;
      }
    });

    let obfuscated = code;
    Object.entries(replacements).forEach(([original, hex]) => {
      const regex = new RegExp(`\\b${original}\\b`, 'g');
      obfuscated = obfuscated.replace(regex, hex);
    });

    return obfuscated;
  }

  // Math Encoding
  mathEncode(code) {
    const mathRegex = /(\d+)\s*([+\-*/])\s*(\d+)/g;
    const matches = [...code.matchAll(mathRegex)];

    matches.forEach(match => {
      const fullMatch = match[0];
      const a = parseInt(match[1]);
      const op = match[2];
      const b = parseInt(match[3]);
      
      let result;
      switch(op) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/': result = a / b; break;
      }
      
      if (result >= 0 && result < 1000) {
        const replacement = `(${a} ${op} ${b})`;
        code = code.replace(fullMatch, replacement);
      }
    });

    return code;
  }

  // Constant Folding
  constantFolding(code) {
    const constantRegex = /(\d+)\s*([+\-*/])\s*(\d+)/g;
    const matches = [...code.matchAll(constantRegex)];

    matches.forEach(match => {
      const fullMatch = match[0];
      const a = parseInt(match[1]);
      const op = match[2];
      const b = parseInt(match[3]);
      
      let result;
      switch(op) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/': result = a / b; break;
      }
      
      if (Number.isInteger(result)) {
        code = code.replace(fullMatch, result.toString());
      }
    });

    return code;
  }

  // String Pool
  stringPool(code) {
    const stringRegex = /["']([^"']*)["']/g;
    const matches = [...code.matchAll(stringRegex)];
    const pool = {};

    matches.forEach((match, index) => {
      const content = match[1];
      if (content.length > 2 && !pool[content]) {
        const key = `_STR${index}`;
        pool[content] = key;
      }
    });

    let obfuscated = code;
    Object.entries(pool).forEach(([content, key]) => {
      const regex = new RegExp(`["']${content}["']`, 'g');
      obfuscated = obfuscated.replace(regex, key);
    });

    let poolDeclaration = 'local _STR = {\n';
    Object.entries(pool).forEach(([content, key]) => {
      poolDeclaration += `  ${key} = "${content}",\n`;
    });
    poolDeclaration += '}\n';

    return `${poolDeclaration}\n${obfuscated}`;
  }

  // Full Obfuscation
  obfuscate(code, options = {}) {
    let obfuscated = code;

    const defaultOptions = {
      randomVariables: true,
      renameLocals: true,
      splitStrings: true,
      deadCode: true,
      junkFunctions: true,
      randomTables: true,
      hexNumbers: true,
      mathEncode: true,
      constantFolding: true,
      stringPool: true
    };

    const opts = { ...defaultOptions, ...options };

    if (opts.randomVariables) obfuscated = this.randomVariables(obfuscated);
    if (opts.renameLocals) obfuscated = this.renameLocals(obfuscated);
    if (opts.splitStrings) obfuscated = this.splitStrings(obfuscated);
    if (opts.deadCode) obfuscated = this.deadCode(obfuscated);
    if (opts.junkFunctions) obfuscated = this.junkFunctions(obfuscated);
    if (opts.randomTables) obfuscated = this.randomTables(obfuscated);
    if (opts.hexNumbers) obfuscated = this.hexNumbers(obfuscated);
    if (opts.mathEncode) obfuscated = this.mathEncode(obfuscated);
    if (opts.constantFolding) obfuscated = this.constantFolding(obfuscated);
    if (opts.stringPool) obfuscated = this.stringPool(obfuscated);

    return obfuscated;
  }
}

module.exports = new Obfuscator();