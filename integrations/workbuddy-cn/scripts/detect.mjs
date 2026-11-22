import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { exists, localDir, lockfileRecord, parseArgs, pinMatchesLock, printJson, readJsonOrNull, repoRoot, satisfies } from './common.mjs';

const candidates = {
  linux: ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'],
  win32: [],
};

function versionOf(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) return { ok: false, command, detail: (result.stderr || result.stdout || result.error?.message || 'unavailable').trim().slice(0, 400) };
  return { ok: true, command, detail: (result.stdout || result.stderr).trim().split('\n')[0].slice(0, 240) };
}

function resolveBinary(envValue, name) {
  if (envValue && envValue.includes(path.sep)) return envValue;
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const found = spawnSync(finder, [envValue || name], { encoding: 'utf8' });
  return (found.stdout || '').split(/\r?\n/).map(line => line.trim()).find(Boolean) || '';
}

async function firstExisting(paths) {
  for (const file of paths) if (await exists(file)) return file;
  return '';
}

export async function detectRuntime() {
  const pinCheck = await pinMatchesLock();
  const pkg = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
  const nodeVersion = process.version;
  const nodeOk = satisfies(nodeVersion, pinCheck.pin.packageEnginesNode);
  const npm = versionOf(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version']);
  const ffmpegPath = resolveBinary(process.env.HYPERFRAMES_FFMPEG_PATH || process.env.FFMPEG_PATH, 'ffmpeg');
  const ffprobePath = resolveBinary(process.env.HYPERFRAMES_FFPROBE_PATH || process.env.FFPROBE_PATH, 'ffprobe');
  const ffmpeg = versionOf(ffmpegPath || 'ffmpeg', ['-version']);
  const ffprobe = versionOf(ffprobePath || 'ffprobe', ['-version']);
  if (ffmpeg.ok) ffmpeg.command = ffmpegPath;
  if (ffprobe.ok) ffprobe.command = ffprobePath;
  const browserFromEnv = process.env.HYPERFRAMES_BROWSER_PATH || process.env.MOTION_BROWSER_PATH || '';
  const browser = (browserFromEnv && await exists(browserFromEnv)) ? browserFromEnv : await firstExisting(candidates[process.platform] || []);
  const browserVersion = browser ? versionOf(browser, ['--version']) : { ok: false, command: '', detail: 'Chrome/Chromium not found on this OS' };
  let hyperframes = { installed: false, version: '' };
  const hyperframesPackage = path.join(repoRoot, 'node_modules/hyperframes/package.json');
  if (await exists(hyperframesPackage)) {
    const manifest = JSON.parse(await readFile(hyperframesPackage, 'utf8'));
    hyperframes = {
      installed: manifest.version === pinCheck.pin.hyperframes.version && await exists(path.join(repoRoot, 'node_modules/hyperframes/bin/hyperframes.mjs')) && await exists(path.join(repoRoot, 'node_modules/gsap/dist/gsap.min.js')),
      version: manifest.version,
    };
  }
  const stamp = await readJsonOrNull(path.join(localDir, 'runtime.json'));
  const lock = await lockfileRecord();
  const renderReady = nodeOk && pinCheck.ok && hyperframes.installed && ffmpeg.ok && ffprobe.ok && browserVersion.ok;
  return {
    platform: process.platform,
    arch: process.arch,
    repoRoot,
    node: { version: nodeVersion, engines: pkg.engines?.node, docsRecommended: pinCheck.pin.docsRecommendedNode, meetsEngines: nodeOk, isDocsRecommended: nodeVersion === 'v' + pinCheck.pin.docsRecommendedNode },
    npm,
    ffmpeg,
    ffprobe,
    browser: { path: browser, ...browserVersion },
    hyperframes,
    pin: { ok: pinCheck.ok, problems: pinCheck.problems, hyperframes: pinCheck.pin.hyperframes.version, gsap: pinCheck.pin.gsap.version, lockSha256: lock.lockSha256 },
    runtimeStampMatches: stamp?.lockSha256 === lock.lockSha256 && stamp?.node === nodeVersion,
    renderReady,
    bundledEngine: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { flags } = parseArgs(process.argv.slice(2));
  const report = await detectRuntime();
  if (flags.has('json')) printJson(report);
  else {
    console.log(`Node 实测 ${report.node.version}；package.json engines ${report.node.engines}；文档/CI 推荐 ${report.node.docsRecommended}`);
    console.log(`Hyperframes 已安装 ${report.hyperframes.installed} (${report.hyperframes.version || 'missing'})；锁定 ${report.pin.hyperframes}`);
    console.log(`FFmpeg ${report.ffmpeg.ok ? report.ffmpeg.detail : 'missing'}；ffprobe ${report.ffprobe.ok ? report.ffprobe.detail : 'missing'}`);
    console.log(`Browser ${report.browser.ok ? report.browser.detail : report.browser.detail}`);
    console.log(`渲染前置 ${report.renderReady ? 'ready' : 'missing'}；Skill 不包含完整引擎`);
  }
  if (!report.pin.ok || !report.node.meetsEngines) process.exitCode = 2;
}
