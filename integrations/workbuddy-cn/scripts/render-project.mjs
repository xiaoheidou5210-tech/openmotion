import { spawn } from 'node:child_process';
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mediaEnv, parseArgs, printJson, repoRoot } from './common.mjs';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: mediaEnv(options.env), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function renderProject({ projectDir, output, logFile, browser, ffmpeg, ffprobe }) {
  await mkdir(path.dirname(output), { recursive: true });
  if (logFile) await mkdir(path.dirname(logFile), { recursive: true });
  const overlay = {
    HYPERFRAMES_NO_TELEMETRY: '1',
    OPENMOTION_TELEMETRY: '0',
    DO_NOT_TRACK: '1',
    HYPERFRAMES_RENDER_DETACHED: '1',
    ...(browser ? { HYPERFRAMES_BROWSER_PATH: browser, MOTION_BROWSER_PATH: browser } : {}),
    ...(ffmpeg ? { HYPERFRAMES_FFMPEG_PATH: ffmpeg, FFMPEG_PATH: ffmpeg } : {}),
    ...(ffprobe ? { HYPERFRAMES_FFPROBE_PATH: ffprobe, FFPROBE_PATH: ffprobe } : {}),
  };
  Object.assign(process.env, overlay);
  const hyperframes = await import(pathToFileURL(path.join(repoRoot, 'hyperframes.ts')).href);
  const lint = await hyperframes.inspectProject(repoRoot, projectDir, 'lint');
  const lintText = JSON.stringify(lint);
  const render = lint.exitCode ? null : await hyperframes.runHyperframes(
    repoRoot,
    projectDir,
    ['render', '.', '--output', output, '--format', 'mp4', '--json'],
    25 * 60_000,
    overlay,
  );
  const log = ['# lint', lintText, '# render stdout', render?.stdout || '', '# render stderr', render?.stderr || ''].join('\n');
  if (logFile) await writeFile(logFile, log);
  let ftyp = false;
  if (render && render.code === 0) {
    const file = await open(output, 'r');
    try {
      const header = Buffer.alloc(12);
      await file.read(header, 0, 12, 0);
      ftyp = header.subarray(4, 8).toString() === 'ftyp';
    } finally { await file.close(); }
  }
  const ok = Boolean(render && render.code === 0 && ftyp);
  return { ok, lintExit: lint.exitCode, renderExit: render?.code ?? null, ftyp, output, logFile, engine: 'hyperframes-0.9.7 render --format mp4', fallbackEncoder: false };
}

export async function probeMedia(file, ffprobe = 'ffprobe') {
  const result = await run(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
  if (result.code !== 0) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

export async function extractFrame(file, time, dest, ffmpeg = 'ffmpeg') {
  await mkdir(path.dirname(dest), { recursive: true });
  const result = await run(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(time), '-i', file, '-frames:v', '1', dest]);
  if (result.code !== 0) throw new Error(result.stderr || 'ffmpeg frame extract failed');
  return dest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { opts } = parseArgs(process.argv.slice(2));
  if (!opts.project || !opts.output) {
    console.error('用法：node integrations/workbuddy-cn/scripts/render-project.mjs --project DIR --output FILE.mp4 [--log FILE] [--browser PATH] [--ffmpeg PATH] [--ffprobe PATH]');
    process.exitCode = 2;
  } else {
    const report = await renderProject({ projectDir: opts.project, output: opts.output, logFile: opts.log, browser: opts.browser, ffmpeg: opts.ffmpeg, ffprobe: opts.ffprobe });
    if (report.ok) report.probe = await probeMedia(opts.output, opts.ffprobe || 'ffprobe');
    printJson(report);
    if (!report.ok) process.exitCode = 1;
  }
}
