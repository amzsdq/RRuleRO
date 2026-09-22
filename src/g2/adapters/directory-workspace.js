'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function version(content) { return crypto.createHash('sha256').update(content).digest('hex'); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function createDirectoryWorkspace({ root, lock_timeout_ms = 5000, stale_lock_ms = 30000 } = {}) {
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

  async function acquireLock(file) {
    const lock = `${file}.rrulero-lock`; const started = Date.now();
    await fs.mkdir(path.dirname(file), { recursive: true });
    while (true) {
      try { await fs.mkdir(lock); return lock; }
      catch (error) {
        if (!error || error.code !== 'EEXIST') throw error;
        try { const stat = await fs.stat(lock); if (Date.now() - stat.mtimeMs > stale_lock_ms) { await fs.rm(lock, { recursive: true, force: true }); continue; } }
        catch (statError) { if (!statError || statError.code !== 'ENOENT') throw statError; }
        if (Date.now() - started >= lock_timeout_ms) throw new Error('workspace lock timeout');
        await sleep(10);
      }
    }
  }

  async function writeText({ path: relative, content, expected_version = null }) {
    const file = target(relative); const lock = await acquireLock(file);
    try {
      const current = await readText({ path: relative });
      if ((current && current.version || null) !== (expected_version || null)) throw new Error('workspace version conflict');
      const text = String(content); const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
      await fs.writeFile(temp, text, 'utf8'); await fs.rename(temp, file);
      return Object.freeze({ version: version(text) });
    } finally { await fs.rm(lock, { recursive: true, force: true }); }
  }

  return Object.freeze({ readText, writeText, root: base });
}

module.exports = { createDirectoryWorkspace };
