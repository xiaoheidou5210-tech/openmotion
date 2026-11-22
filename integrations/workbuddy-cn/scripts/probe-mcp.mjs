import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, printJson, repoRoot } from './common.mjs';

export async function probeMcp({ dataDir } = {}) {
  const owned = !dataDir;
  const directory = dataDir || await mkdtemp(path.join(os.tmpdir(), 'openmotion-mcp-'));
  const child = spawn(process.execPath, ['--experimental-strip-types', path.join(repoRoot, 'mcp.ts')], {
    cwd: repoRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, MOTION_DATA_DIR: directory, OPENMOTION_TELEMETRY: '0', HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' },
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
  const messages = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'openmotion-workbuddy-cn', version: '0.2.0' } } },
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  ];
  child.stdin.end(messages.map(item => JSON.stringify(item)).join('\n') + '\n');
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline && child.exitCode === null && stdout.split('\n').filter(Boolean).length < 2) await new Promise(resolve => setTimeout(resolve, 50));
  if (child.exitCode === null) child.kill('SIGTERM');
  if (child.exitCode === null) await new Promise(resolve => child.once('close', resolve));
  if (owned) await rm(directory, { recursive: true, force: true });
  const lines = stdout.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 2).map(line => JSON.parse(line));
  const names = lines[1]?.result?.tools?.map(tool => tool.name) || [];
  return { ok: lines.length === 2 && !lines.some(line => line.error) && names.length > 0, protocol: lines[0]?.result?.serverInfo || null, toolNames: names, stderr: stderr.trim() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { opts } = parseArgs(process.argv.slice(2));
  try {
    const report = await probeMcp({ dataDir: opts['data-dir'] });
    printJson(report);
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
