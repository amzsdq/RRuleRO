'use strict';

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new Error(`${name} is required`);
  return value;
}

function normalizeRead(result) {
  if (result == null) return null;
  if (typeof result !== 'object') throw new Error('host read must return null or { content, version }');
  if (typeof result.content !== 'string') throw new Error('host read content must be a string');
  if (result.version == null || String(result.version).trim() === '') throw new Error('host read version is required');
  return Object.freeze({ content: result.content, version: String(result.version) });
}

function normalizeWrite(result) {
  if (!result || typeof result !== 'object' || result.version == null || String(result.version).trim() === '') {
    throw new Error('host write must return { version }');
  }
  return Object.freeze({ version: String(result.version) });
}

function createToolWorkspace({ read, write } = {}) {
  const hostRead = requiredFunction(read, 'read');
  const hostWrite = requiredFunction(write, 'write');

  async function readText({ path } = {}) {
    const safePath = String(path || '').trim();
    if (!safePath) throw new Error('path is required');
    return normalizeRead(await hostRead({ path: safePath }));
  }

  async function writeText({ path, content, expected_version = null } = {}) {
    const safePath = String(path || '').trim();
    if (!safePath) throw new Error('path is required');
    if (typeof content !== 'string') throw new Error('content must be a string');
    return normalizeWrite(await hostWrite({
      path: safePath,
      content,
      expected_version: expected_version == null ? null : String(expected_version)
    }));
  }

  return Object.freeze({ readText, writeText });
}

module.exports = { createToolWorkspace };
