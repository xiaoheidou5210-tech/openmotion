import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { packageDir } from './common.mjs';

test('boot without consent does not start a server', async () => {
  const child = spawn(process.execPath, [path.join(packageDir, 'scripts/boot.mjs')], { cwd: packageDir });
  let out = '';
  child.stdout.on('data', chunk => { out += chunk; });
  const code = await new Promise(resolve => child.on('exit', resolve));
  assert.equal(code, 3);
  const report = JSON.parse(out);
  assert.equal(report.confirmationRequired, true);
  assert.deepEqual(report.plan.downloads, []);
  assert.equal(report.plan.writesConfig, false);
});
