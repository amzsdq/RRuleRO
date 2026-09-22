'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function version(content) { return crypto.createHash('sha256').update(content).digest('hex'); }

function createDirectoryWorkspace({ root } = {}) {
  const base = path.resolve(String(root || '').trim());
  if (!root || !String(root).trim()) throw new Error('root directory required');

  function target(relative) {
    const safe = String(relative || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const resolved = path.resolve(base, safe);
    if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) throw new Error('workspace path escapes root');
    return resolved;
  }

  async function readText({ path: relative }) {
    try { const content = await fs.readFile(target(relative), 'utf8'); return Object.freeze({ content, version: version(content) }); }
    catch (error) { if (error && error.code === 'ENOENT') return null; throw error; }
  }

  async function writeText({ path: relative, content, expected_version = null }) {
    const file = target(relative); const current = await readText({ path: relative });
    if ((current && current.version || null) !== (expected_version || null)) throw new Error('workspace version conflict');
    await fs.mkdir(path.dirname(file), { recursive: true });
    const text = String(content); const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
    await fs.writeFile(temp, text, 'utf8'); await fs.rename(temp, file);
    return Object.freeze({ version: version(text) });
  }

  return Object.freeze({ readText, writeText, root: base });
}

module.exports = { createDirectoryWorkspace };
