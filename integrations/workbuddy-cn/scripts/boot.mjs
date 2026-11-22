import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs, printJson } from './common.mjs';

const skill = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const app = path.join(skill, 'runtime/app');

function bundledNode() {
  const name = process.platform === 'win32' ? 'node.exe' : 'node';
  return path.join(skill, 'runtime/node', process.platform + '-' + process.arch, name);
}
function browserPath() {
  if (process.platform === 'win32') return path.join(skill, 'runtime/browser/win32-x64/chrome-win/chrome.exe');
  return path.join(skill, 'runtime/browser/linux-x64/chrome-linux/chrome');
}
function mediaBins() {
  if (process.platform === 'win32') {
    const dir = path.join(skill, 'runtime/ffmpeg/win32-x64');
    return [path.join(dir, 'ffmpeg.exe'), path.join(dir, 'ffprobe.exe')];
  }
  const dir = path.join(skill, 'runtime/ffmpeg/bin');
  return [path.join(dir, 'ffmpeg'), path.join(dir, 'ffprobe')];
}
async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

export async function bootPlan() {
  const node = await exists(bundledNode()) ? bundledNode() : null;
  const [ffmpeg, ffprobe] = mediaBins();
  return {
    skill, app,
    node: node || 'the Node process that launches this script',
    browser: browserPath(),
    ffmpeg, ffprobe,
    server: path.join(app, 'mcp.ts'),
    downloads: [],
    writesConfig: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { flags } = parseArgs(process.argv.slice(2));
  const plan = await bootPlan();
  if (!flags.has('consent')) {
    printJson({ ok: false, confirmationRequired: true, plan });
    process.exitCode = 3;
  } else {
    const bundled = bundledNode();
    if (await exists(bundled) && path.resolve(bundled) !== path.resolve(process.execPath)) {
      const child = spawn(bundled, [fileURLToPath(import.meta.url), '--consent', ...process.argv.slice(3)], { stdio: 'inherit' });
      child.on('exit', code => process.exit(code ?? 1));
    } else {
      const [ffmpeg, ffprobe] = mediaBins();
      const env = {
        ...process.env,
        OPENMOTION_TELEMETRY: '0',
        DO_NOT_TRACK: '1',
        HYPERFRAMES_NO_TELEMETRY: '1',
        HYPERFRAMES_BROWSER_PATH: browserPath(),
        MOTION_BROWSER_PATH: browserPath(),
        HYPERFRAMES_FFMPEG_PATH: ffmpeg,
        HYPERFRAMES_FFPROBE_PATH: ffprobe,
        FFMPEG_PATH: ffmpeg,
        FFPROBE_PATH: ffprobe,
      };
      const child = spawn(process.execPath, ['--experimental-strip-types', path.join(app, 'mcp.ts')], { cwd: app, env, stdio: 'inherit' });
      child.on('exit', code => process.exit(code ?? 1));
    }
  }
}
