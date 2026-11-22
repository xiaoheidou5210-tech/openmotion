import { createHash } from 'node:crypto';
import { access, mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const repoRoot = path.resolve(packageDir, '../..');
export const pinPath = path.join(packageDir, 'runtime-pin.json');
export const localDir = path.join(packageDir, '.local');
export const managedBy = 'openmotion-workbuddy-cn';

export function parseArgs(argv) {
  const flags = new Set();
  const opts = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') { rest.push(...argv.slice(i + 1)); break; }
    if (!arg.startsWith('--')) { rest.push(arg); continue; }
    const body = arg.slice(2);
    const eq = body.indexOf('=');
    if (eq !== -1) { opts[body.slice(0, eq)] = body.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) flags.add(body);
    else { opts[body] = next; i++; }
  }
  return { flags, opts, rest };
}

export async function readPin() {
  return JSON.parse(await readFile(pinPath, 'utf8'));
}

export async function lockfileRecord() {
  const lock = JSON.parse(await readFile(path.join(repoRoot, 'package-lock.json'), 'utf8'));
  const hyperframes = lock.packages?.['node_modules/hyperframes'];
  const gsap = lock.packages?.['node_modules/gsap'];
  const bytes = await readFile(path.join(repoRoot, 'package-lock.json'));
  return {
    lockSha256: createHash('sha256').update(bytes).digest('hex'),
    hyperframes,
    gsap,
  };
}

export async function pinMatchesLock() {
  const pin = await readPin();
  const lock = await lockfileRecord();
  const same = (pinned, actual, label) => {
    if (!actual) return `${label} is missing from package-lock.json`;
    if (actual.version !== pinned.version || actual.integrity !== pinned.integrity || actual.resolved !== pinned.resolved) {
      return `${label} pin does not match package-lock.json`;
    }
    return '';
  };
  const problems = [same(pin.hyperframes, lock.hyperframes, 'hyperframes'), same(pin.gsap, lock.gsap, 'gsap')].filter(Boolean);
  return { pin, lock, ok: problems.length === 0, problems };
}

export function satisfies(version, range) {
  const match = /^>=(\d+)\.(\d+)\.(\d+)$/.exec(range);
  const actual = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match || !actual) return false;
  const [a, b] = [actual, match].map(item => item.slice(1, 4).map(Number));
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

export async function exists(file) {
  try { await access(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

export function contains(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
}

export function assertSeparateDirs(runtimeRoot, dataDir, configDir) {
  for (const dir of [runtimeRoot, dataDir, configDir]) {
    if (!path.isAbsolute(dir)) throw new Error('目录必须是绝对路径：' + dir);
    if (path.resolve(dir) === path.parse(dir).root) throw new Error('拒绝使用文件系统根目录：' + dir);
  }
  if (contains(runtimeRoot, dataDir) || contains(dataDir, runtimeRoot)) throw new Error('工程数据目录必须位于运行时检出之外');
  if (contains(runtimeRoot, configDir) || contains(configDir, runtimeRoot)) throw new Error('WorkBuddy 配置目录必须位于运行时检出之外');
  if (path.resolve(dataDir) === path.resolve(configDir)) throw new Error('工程数据目录与 WorkBuddy 配置目录必须分开');
}

export async function readJsonOrNull(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeJsonAtomic(file, value, mode = 0o600) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode, flag: 'wx' });
  try { await rename(temporary, file); }
  finally { await rm(temporary, { force: true }); }
}

export async function withFileLock(lockPath, fn) {
  await mkdir(path.dirname(lockPath), { recursive: true });
  let handle;
  const end = Date.now() + 15_000;
  while (!handle) {
    try { handle = await open(lockPath, 'wx', 0o600); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() > end) throw new Error('配置锁仍被占用：' + path.basename(lockPath));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  try { return await fn(); }
  finally { await handle.close(); await rm(lockPath, { force: true }); }
}

export function printJson(value) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

// The official verifier treats any ffprobe stderr as failure. A tmux portal library path
// prints a version warning there even when the media read succeeds.
export function mediaEnv(base = process.env) {
  const env = { ...base };
  if (env.LD_LIBRARY_PATH?.includes('tmux')) delete env.LD_LIBRARY_PATH;
  return env;
}
