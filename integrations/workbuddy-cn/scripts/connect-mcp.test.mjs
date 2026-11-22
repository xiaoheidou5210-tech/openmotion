import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { managedBy, repoRoot } from './common.mjs';
import { buildTransport, connectMcp, mergeConfig, planConnection } from './connect-mcp.mjs';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wb-cn-'));
  return { root, configDir: path.join(root, 'config'), dataDir: path.join(root, 'data'), runtime: repoRoot };
}

test('dry-run does not create mcp.json', async () => {
  const dirs = await fixture();
  const report = await connectMcp({ configDir: dirs.configDir, dataDir: dirs.dataDir, confirm: false });
  assert.equal(report.confirmationRequired, true);
  await assert.rejects(readFile(path.join(dirs.configDir, 'mcp.json'), 'utf8'));
  await rm(dirs.root, { recursive: true, force: true });
});

test('confirm merges an owned entry and keeps unrelated servers', async () => {
  const dirs = await fixture();
  await connectMcp({ configDir: dirs.configDir, dataDir: dirs.dataDir, confirm: true, browser: '/tmp/chrome-example' });
  const configFile = path.join(dirs.configDir, 'mcp.json');
  const original = JSON.parse(await readFile(configFile, 'utf8'));
  original.mcpServers.weather = { type: 'stdio', command: 'weather' };
  await writeFile(configFile, JSON.stringify(original));
  const second = await connectMcp({ configDir: dirs.configDir, dataDir: dirs.dataDir, confirm: true });
  assert.equal(second.applied, true);
  assert.deepEqual(second.preservedServers, ['weather']);
  const merged = JSON.parse(await readFile(configFile, 'utf8'));
  assert.equal(merged.mcpServers.weather.command, 'weather');
  assert.equal(merged.mcpServers.openmotion.args.at(-1), path.join(repoRoot, 'mcp.ts'));
  assert.equal(merged.mcpServers.openmotion.env.OPENMOTION_TELEMETRY, '0');
  await rm(dirs.root, { recursive: true, force: true });
});

test('a foreign openmotion entry is left untouched', async () => {
  const dirs = await fixture();
  const configFile = path.join(dirs.configDir, 'mcp.json');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(dirs.configDir, { recursive: true });
  const foreign = { mcpServers: { openmotion: { command: 'someone-else', args: ['stay'] }, notes: { keep: true } } };
  await writeFile(configFile, JSON.stringify(foreign));
  const before = await readFile(configFile, 'utf8');
  await assert.rejects(connectMcp({ configDir: dirs.configDir, dataDir: dirs.dataDir, confirm: true }), /not owned/);
  assert.equal(await readFile(configFile, 'utf8'), before);
  await rm(dirs.root, { recursive: true, force: true });
});

test('malformed configuration is not replaced', async () => {
  const dirs = await fixture();
  const configFile = path.join(dirs.configDir, 'mcp.json');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(dirs.configDir, { recursive: true });
  await writeFile(configFile, '{');
  await assert.rejects(connectMcp({ configDir: dirs.configDir, dataDir: dirs.dataDir, confirm: true }), SyntaxError);
  assert.equal(await readFile(configFile, 'utf8'), '{');
  await rm(dirs.root, { recursive: true, force: true });
});

test('plan refuses an unowned entry and merge keeps siblings', () => {
  const configFile = '/tmp/workbuddy-example/mcp.json';
  const plan = planConnection({ config: { mcpServers: { openmotion: { command: 'other' } } }, marker: null, configFile });
  assert.equal(plan.action, 'refuse');
  const transport = buildTransport({ nodePath: '/usr/bin/node', runtimeRoot: '/opt/openmotion', dataDir: '/var/openmotion-data' });
  const merged = mergeConfig({ theme: 'dark', mcpServers: { weather: { command: 'weather' } } }, transport);
  assert.equal(merged.theme, 'dark');
  assert.equal(merged.mcpServers.weather.command, 'weather');
  assert.equal(merged.mcpServers.openmotion.cwd, '/opt/openmotion');
  assert.equal(managedBy, 'openmotion-workbuddy-cn');
});

test('credentials and checkout-nested directories are rejected', async () => {
  assert.throws(() => buildTransport({ nodePath: '/usr/bin/node', runtimeRoot: '/opt/openmotion', dataDir: '/var/data', browser: 'sk-secret-value' }), /凭据/);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'wb-outside-'));
  await assert.rejects(connectMcp({ configDir: path.join(repoRoot, 'integrations'), dataDir: outside, confirm: false }), /配置目录必须位于运行时检出之外/);
  await assert.rejects(connectMcp({ configDir: outside, dataDir: path.join(repoRoot, 'integrations'), confirm: false }), /工程数据目录必须位于运行时检出之外/);
  await rm(outside, { recursive: true, force: true });
});
