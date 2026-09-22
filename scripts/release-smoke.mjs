import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rrulero-release-'));
const packDir = path.join(temp, 'pack');
const consumer = path.join(temp, 'consumer');
const workspace = path.join(temp, 'workspace');
fs.mkdirSync(packDir, { recursive: true });
fs.mkdirSync(consumer, { recursive: true });

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repo,
    encoding: 'utf8',
    env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' }
  });
  if (result.status !== 0) {
    throw new Error([
      command + ' ' + args.join(' ') + ' failed',
      result.stdout,
      result.stderr
    ].filter(Boolean).join('\n'));
  }
  return result.stdout.trim();
}

try {
  const raw = run('npm', ['pack', '--json', '--pack-destination', packDir]);
  const packed = JSON.parse(raw);
  assert.equal(packed.length, 1);
  const meta = packed[0];
  assert.equal(meta.name, 'rrulero');
  assert.equal(meta.version, '1.0.0-rc.1');
  assert.ok(meta.filename.endsWith('.tgz'));
  assert.ok(meta.files.some((x) => x.path === 'bin/rrulero.js'));
  assert.ok(meta.files.some((x) => x.path === 'src/g2/index.js'));
  assert.ok(meta.files.some((x) => x.path === 'docs/RELEASE.md'));
  assert.ok(!meta.files.some((x) => x.path.startsWith('test/')));
  assert.ok(!meta.files.some((x) => x.path.startsWith('.github/')));

  const tarball = path.join(packDir, meta.filename);
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ private: true }, null, 2));
  run('npm', ['install', tarball, '--ignore-scripts'], { cwd: consumer });

  const requireProbe = run(process.execPath, ['-e', "const r=require('rrulero'); if(!r.product||!r.runtime) process.exit(2); process.stdout.write('PASS')"], { cwd: consumer });
  assert.equal(requireProbe, 'PASS');
  assert.equal(run('npm', ['exec', '--', 'rrulero', 'version'], { cwd: consumer }), '1.0.0-rc.1');

  const init = JSON.parse(run('npm', ['exec', '--', 'rrulero', 'init', '--workspace', workspace], { cwd: consumer }));
  assert.equal(init.ok, true);
  assert.equal(init.profile, 'PERSONAL_DIRECTORY');

  const doctor = JSON.parse(run('npm', ['exec', '--', 'rrulero', 'doctor', '--workspace', workspace], { cwd: consumer }));
  assert.equal(doctor.ok, true);
  assert.equal(doctor.durable_storage, 'PASS');
  assert.equal(doctor.versioned_cas, 'PASS');

  const profile = JSON.parse(fs.readFileSync(path.join(workspace, 'RRuleR', 'PROFILE.json'), 'utf8'));
  assert.equal(profile.profile, 'PERSONAL_DIRECTORY');
  console.log(JSON.stringify({ ok: true, artifact: meta.filename, clean_install: 'PASS', package_require: 'PASS', cli_shim: 'PASS', doctor: 'PASS' }));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
