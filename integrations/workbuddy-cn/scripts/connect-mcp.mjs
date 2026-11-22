import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertSeparateDirs, managedBy, parseArgs, printJson, readJsonOrNull, repoRoot, withFileLock, writeJsonAtomic } from './common.mjs';

const secretPattern = /(api[_-]?key|secret|token|password|private[_-]?key|BEGIN [A-Z ]*PRIVATE KEY)/i;

export function buildTransport({ nodePath, runtimeRoot, dataDir, browser, ffmpeg, ffprobe }) {
  const env = { MOTION_DATA_DIR: dataDir, OPENMOTION_TELEMETRY: '0', HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' };
  if (browser) env.HYPERFRAMES_BROWSER_PATH = browser;
  if (ffmpeg) env.HYPERFRAMES_FFMPEG_PATH = ffmpeg;
  if (ffprobe) env.HYPERFRAMES_FFPROBE_PATH = ffprobe;
  for (const [key, value] of Object.entries(env)) {
    if (secretPattern.test(key) || secretPattern.test(String(value))) throw new Error('拒绝把凭据写入 MCP 配置：' + key);
  }
  return {
    type: 'stdio',
    command: nodePath,
    args: ['--experimental-strip-types', path.join(runtimeRoot, 'mcp.ts')],
    cwd: runtimeRoot,
    env,
  };
}

export function planConnection({ config, marker, configFile }) {
  if (config !== null && (typeof config !== 'object' || Array.isArray(config))) return { action: 'refuse', reason: 'Invalid WorkBuddy configuration' };
  const servers = config?.mcpServers;
  if (servers !== undefined && (typeof servers !== 'object' || servers === null || Array.isArray(servers))) return { action: 'refuse', reason: 'Invalid WorkBuddy mcpServers' };
  const current = servers?.openmotion;
  if (!current) return { action: 'write', reason: 'openmotion entry is absent' };
  const owned = marker?.managedBy === managedBy && marker.configFile === configFile;
  if (!owned) return { action: 'refuse', reason: 'Existing WorkBuddy openmotion MCP is not owned by openmotion-workbuddy-cn' };
  return { action: 'write', reason: 'owned openmotion entry will be replaced' };
}

export function mergeConfig(config, transport) {
  return { ...(config || {}), mcpServers: { ...(config?.mcpServers || {}), openmotion: transport } };
}

export async function connectMcp({ configDir, dataDir, confirm = false, nodePath = process.execPath, runtimeRoot = repoRoot, browser, ffmpeg, ffprobe }) {
  assertSeparateDirs(runtimeRoot, dataDir, configDir);
  const configFile = path.join(configDir, 'mcp.json');
  const markerFile = path.join(configDir, 'openmotion-workbuddy-cn.ownership.json');
  const transport = buildTransport({ nodePath, runtimeRoot, dataDir, browser, ffmpeg, ffprobe });
  return withFileLock(configFile + '.openmotion-workbuddy-cn.lock', async () => {
    const config = await readJsonOrNull(configFile);
    const marker = await readJsonOrNull(markerFile);
    const plan = planConnection({ config, marker, configFile });
    if (plan.action !== 'write') {
      const error = new Error(plan.reason);
      error.code = 'MCP_CONFIG_REFUSED';
      throw error;
    }
    if (!confirm) return { ok: true, applied: false, confirmationRequired: true, plan, configFile, markerFile };
    const next = mergeConfig(config, transport);
    const preserved = Object.keys(config?.mcpServers || {}).filter(name => name !== 'openmotion');
    await writeJsonAtomic(configFile, next);
    await writeJsonAtomic(markerFile, { managedBy, version: '0.2.0', configFile, dataDirectory: dataDir, runtimeRoot, node: nodePath, at: new Date().toISOString() });
    return { ok: true, applied: true, plan, preservedServers: preserved, configFile, markerFile };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  if (!opts['config-dir'] || !opts['data-dir']) {
    console.error('用法：node integrations/workbuddy-cn/scripts/connect-mcp.mjs --config-dir DIR --data-dir DIR [--confirm] [--browser PATH] [--ffmpeg PATH] [--ffprobe PATH]');
    process.exitCode = 2;
  } else {
    try {
      const report = await connectMcp({
        configDir: opts['config-dir'], dataDir: opts['data-dir'], confirm: flags.has('confirm'),
        browser: opts.browser, ffmpeg: opts.ffmpeg, ffprobe: opts.ffprobe,
      });
      printJson(report);
      if (!report.ok) process.exitCode = 1;
      else if (report.confirmationRequired) process.exitCode = 3;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
