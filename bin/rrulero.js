#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const pkg = require('../package.json');
const { adapters } = require('../src/g2');

function usage() {
  return [
    'RRuleRO ' + pkg.version,
    '',
    'Usage:',
    '  rrulero version',
    '  rrulero bootstrap',
    '  rrulero init --workspace <directory> [--force]',
    '  rrulero doctor --workspace <directory>',
    '  rrulero help',
    '',
    'bootstrap prints the one-paste ChatGPT section bootstrap payload.',
    'The local CLI initializes and validates the Personal directory profile.',
    'Unattended continuation additionally requires a verified wake provider from the host.'
  ].join('\n');
}

function parse(argv) {
  const args = [...argv];
  const command = args.shift() || 'help';
  const options = {};
  while (args.length) {
    const token = args.shift();
    if (token === '--force') { options.force = true; continue; }
    if (token === '--workspace') {
      const value = args.shift();
      if (!value) throw new Error('--workspace requires a directory');
      options.workspace = value;
      continue;
    }
    throw new Error('unknown argument: ' + token);
  }
  return { command, options };
}

function workspacePath(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('--workspace is required');
  return path.resolve(raw);
}

async function init({ workspace, force = false }) {
  const root = workspacePath(workspace);
  const backend = adapters.directoryWorkspace.createDirectoryWorkspace({ root });
  const profile = adapters.personalWorkspace.createPersonalWorkspaceAdapter({ workspace: backend });
  const configName = 'PROFILE.json';
  const existing = await profile.readDocument(configName);
  if (existing && !force) {
    throw new Error('workspace is already initialized; use --force only when intentional');
  }

  const config = JSON.stringify({
    schema_version: 1,
    product: 'RRuleRO',
    package_version: pkg.version,
    profile: 'PERSONAL_DIRECTORY',
    durable_root: 'RRuleR',
    unattended_wake_configured: false
  }, null, 2) + '\n';

  const docs = new Map([
    [configName, config],
    ['CURRENT.md', '# Current\n\nReady for a goal.\n'],
    ['PLAN.md', '# Plan\n\nNo active plan.\n'],
    ['CHECKPOINT.md', '# Checkpoint\n\nNo checkpoint yet.\n'],
    ['TASKS.md', '# Tasks\n\nNo queued tasks.\n'],
    ['POLICY.md', '# Policy\n\nUse the RRuleRO runtime defaults.\n'],
    ['RUNS.jsonl', ''],
    ['EVIDENCE.jsonl', ''],
    ['WORK/.keep', '']
  ]);

  for (const [name, content] of docs) {
    const current = await profile.readDocument(name);
    await profile.writeDocument(name, content, {
      expected_version: current ? current.version : null
    });
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    command: 'init',
    profile: 'PERSONAL_DIRECTORY',
    workspace: root,
    unattended_wake_configured: false,
    next: 'rrulero doctor --workspace ' + JSON.stringify(root)
  }) + '\n');
}

async function doctor({ workspace }) {
  const root = workspacePath(workspace);
  const backend = adapters.directoryWorkspace.createDirectoryWorkspace({ root });
  const profile = adapters.personalWorkspace.createPersonalWorkspaceAdapter({ workspace: backend });
  const config = await profile.readDocument('PROFILE.json');
  if (!config) throw new Error('workspace is not initialized; run rrulero init first');

  let parsed;
  try { parsed = JSON.parse(config.content); }
  catch { throw new Error('RRuleR/PROFILE.json is not valid JSON'); }
  if (parsed.profile !== 'PERSONAL_DIRECTORY') throw new Error('unsupported local profile: ' + parsed.profile);

  const probe = '.doctor/probe-' + process.pid + '-' + crypto.randomBytes(5).toString('hex') + '.txt';
  const first = await backend.writeText({ path: probe, content: 'v1', expected_version: null });
  const read = await backend.readText({ path: probe });
  if (!read || read.version !== first.version || read.content !== 'v1') {
    throw new Error('durable workspace read-after-write verification failed');
  }
  const second = await backend.writeText({ path: probe, content: 'v2', expected_version: first.version });
  let staleRejected = false;
  try {
    await backend.writeText({ path: probe, content: 'stale', expected_version: first.version });
  } catch (error) {
    staleRejected = /version conflict/.test(String(error && error.message));
  }
  if (!staleRejected) throw new Error('durable workspace CAS verification failed');

  const finalRead = await backend.readText({ path: probe });
  if (!finalRead || finalRead.version !== second.version || finalRead.content !== 'v2') {
    throw new Error('durable workspace final verification failed');
  }
  await fs.rm(path.join(root, '.doctor'), { recursive: true, force: true });

  const major = Number(process.versions.node.split('.')[0]);
  if (!Number.isFinite(major) || major < 22) throw new Error('Node.js 22+ is required');

  process.stdout.write(JSON.stringify({
    ok: true,
    command: 'doctor',
    package_version: pkg.version,
    node: process.version,
    profile: parsed.profile,
    workspace: root,
    durable_storage: 'PASS',
    versioned_cas: 'PASS',
    unattended_wake: parsed.unattended_wake_configured === true ? 'DECLARED' : 'NOT_CONFIGURED'
  }) + '\n');
}

async function main() {
  const { command, options } = parse(process.argv.slice(2));
  if (command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write(usage() + '\n');
    return;
  }
  if (command === 'version' || command === '--version' || command === '-v') {
    process.stdout.write(pkg.version + '\n');
    return;
  }
  if (command === 'bootstrap') {
    const bootstrap = await fs.readFile(path.resolve(__dirname, '../bootstrap/RRULERO_CHATGPT_BOOTSTRAP.md'), 'utf8');
    process.stdout.write(bootstrap.endsWith('\n') ? bootstrap : bootstrap + '\n');
    return;
  }
  if (command === 'init') return init(options);
  if (command === 'doctor') return doctor(options);
  throw new Error('unknown command: ' + command + '\n\n' + usage());
}

main().catch((error) => {
  process.stderr.write('rrulero: ' + String(error && error.message || error) + '\n');
  process.exitCode = 1;
});
