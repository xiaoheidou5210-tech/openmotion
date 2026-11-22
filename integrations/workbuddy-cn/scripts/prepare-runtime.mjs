import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { localDir, lockfileRecord, parseArgs, printJson, repoRoot, writeJsonAtomic } from './common.mjs';
import { detectRuntime } from './detect.mjs';

function npmCi() {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(command, ['ci', '--no-audit', '--no-fund'], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout = (stdout + chunk).slice(-200_000); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-200_000); });
    child.on('error', reject);
    child.on('close', code => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function prepareRuntime({ confirm = false } = {}) {
  const before = await detectRuntime();
  const plan = {
    action: before.hyperframes.installed && before.pin.ok ? 'reuse' : 'npm-ci',
    command: 'npm ci --no-audit --no-fund',
    cwd: repoRoot,
    writes: ['node_modules/'],
    doesNotWrite: ['global npm prefix', 'npmrc', 'WorkBuddy mcp.json', 'shell profile'],
    external: {
      hyperframes: before.pin.hyperframes,
      integrityCheckedBy: 'npm ci against package-lock.json',
      skillContainsEngine: false,
    },
  };
  if (plan.action === 'reuse') {
    const lock = await lockfileRecord();
    await writeJsonAtomic(path.join(localDir, 'runtime.json'), { lockSha256: lock.lockSha256, node: process.version, hyperframes: before.hyperframes.version, reused: true, at: new Date().toISOString() });
    return { ...plan, applied: false, ok: true, detected: before };
  }
  if (!confirm) return { ...plan, applied: false, ok: false, confirmationRequired: true, detected: before };
  const result = await npmCi();
  const after = await detectRuntime();
  if (result.code !== 0 || !after.hyperframes.installed) {
    return { ...plan, applied: true, ok: false, exitCode: result.code, tail: (result.stderr || result.stdout).slice(-2000), detected: after };
  }
  const lock = await lockfileRecord();
  await writeJsonAtomic(path.join(localDir, 'runtime.json'), { lockSha256: lock.lockSha256, node: process.version, hyperframes: after.hyperframes.version, reused: false, at: new Date().toISOString() });
  return { ...plan, applied: true, ok: true, detected: after };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { flags } = parseArgs(process.argv.slice(2));
  const report = await prepareRuntime({ confirm: flags.has('confirm') });
  printJson(report);
  if (!report.ok) process.exitCode = report.confirmationRequired ? 3 : 1;
}
