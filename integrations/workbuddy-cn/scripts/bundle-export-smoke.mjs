import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const layout = process.argv[2];
if (!layout) throw new Error('Usage: node scripts/bundle-export-smoke.mjs LAYOUT');
const app = path.join(layout, 'runtime/app');
const browser = path.join(layout, 'runtime/browser/linux-x64/chrome-linux/chrome');
const ffmpeg = path.join(layout, 'runtime/ffmpeg/bin/ffmpeg');
const ffprobe = path.join(layout, 'runtime/ffmpeg/bin/ffprobe');
const data = path.join(layout, '.smoke-data-ffmpeg711b');
const env = {
  ...process.env,
  MOTION_DATA_DIR: data,
  MOTION_HEADLESS: '1',
  OPENMOTION_TELEMETRY: '0',
  DO_NOT_TRACK: '1',
  HYPERFRAMES_NO_TELEMETRY: '1',
  HYPERFRAMES_BROWSER_PATH: browser,
  MOTION_BROWSER_PATH: browser,
  HYPERFRAMES_FFMPEG_PATH: ffmpeg,
  HYPERFRAMES_FFPROBE_PATH: ffprobe,
  FFMPEG_PATH: ffmpeg,
  FFPROBE_PATH: ffprobe,
  PORT: '4188',
};
const child = spawn(process.execPath, ['--experimental-strip-types', path.join(app, 'mcp.ts')], {
  cwd: app, env, stdio: ['pipe', 'pipe', 'pipe'],
});
let buffer = '', stderr = '';
const pending = new Map();
let id = 0;
child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-8000); });
child.stdout.on('data', chunk => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    const done = pending.get(message.id);
    if (done) { pending.delete(message.id); done(message); }
  }
});
function send(method, params) {
  const message = { jsonrpc: '2.0', id: ++id, method, params };
  child.stdin.write(JSON.stringify(message) + '\n');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout ' + method)), 15 * 60_000);
    pending.set(message.id, value => { clearTimeout(timer); resolve(value); });
  });
}
async function filesFrom(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await filesFrom(path.join(directory, entry.name), relative + '/'));
    else files.push({ path: relative, content: await readFile(path.join(directory, entry.name), 'utf8') });
  }
  return files;
}
const files = await filesFrom(path.join(layout, 'sample'));
files.push({ path: 'assets/gsap.min.js', content: await readFile(path.join(app, 'node_modules/gsap/dist/gsap.min.js'), 'utf8') });
const init = await send('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'bundle-smoke', version: '0.3.0' } });
const listed = await send('tools/list', {});
const names = listed.result?.tools?.map(tool => tool.name) || [];
const created = await send('tools/call', { name: 'openmotion_create_project', arguments: { requestId: 'bundle-create-ffmpeg711b', projectType: 'natural_language', title: '一点四边三线', requirements: '二十秒中文几何成片' } });
const createdValue = JSON.parse(created.result?.content?.[0]?.text || '{}');
const edited = await send('tools/call', { name: 'openmotion_edit_project', arguments: {
  projectId: createdValue.projectId, requestId: 'bundle-edit-ffmpeg711b', expectedRevision: createdValue.revision, expectedVersionId: createdValue.version?.versionId,
  files,
} });
const editedValue = JSON.parse(edited.result?.content?.[0]?.text || '{}');
const exported = await send('tools/call', { name: 'openmotion_export_request', arguments: {
  projectId: createdValue.projectId, requestId: 'bundle-export-ffmpeg711b', versionId: editedValue.version?.versionId || createdValue.version?.versionId,
  expectedRevision: editedValue.revision || createdValue.revision, audio: 'silent',
} });
const exportValue = JSON.parse(exported.result?.content?.[0]?.text || '{}');
let job = exportValue.job;
const deadline = Date.now() + 12 * 60_000;
while (job && !['completed', 'failed', 'cancelled'].includes(job.state) && Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  const status = await send('tools/call', { name: 'openmotion_get_project', arguments: { projectId: createdValue.projectId, exportJobId: job.id } });
  const value = JSON.parse(status.result?.content?.[0]?.text || '{}');
  job = value.exportJob || value.job || job;
}
child.kill('SIGTERM');
const report = { server: init.result?.serverInfo || null, toolCount: names.length, hasExport: names.includes('openmotion_export_request'), createError: created.error || created.result?.isError || null, editError: edited.error || edited.result?.isError || null, exportError: exported.error || exported.result?.isError || null, job, stderr: stderr.slice(-1500) };
console.log(JSON.stringify(report, null, 2));
if (!job || job.state !== 'completed') process.exitCode = 1;
