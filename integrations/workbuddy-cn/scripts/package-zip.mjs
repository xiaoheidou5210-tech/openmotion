import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { packageDir, parseArgs, printJson, repoRoot } from './common.mjs';

const skipped = new Set(['.local', 'node_modules']);

async function filesUnder(directory, prefix) {
  const entries = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (skipped.has(item.name) || item.name.startsWith('.')) continue;
    const absolute = path.join(directory, item.name);
    const name = prefix + item.name;
    if (item.isDirectory()) entries.push(...await filesUnder(absolute, name + '/'));
    else if (item.isFile()) entries.push({ name, data: await readFile(absolute) });
  }
  return entries;
}

export async function packageZip(destination) {
  const { zip } = await import(pathToFileURL(path.join(repoRoot, 'scripts/zip.mjs')).href);
  const entries = await filesUnder(packageDir, 'openmotion-workbuddy-cn/');
  for (const [source, name] of [
    ['LICENSE', 'openmotion-workbuddy-cn/licenses/OPENMOTION-LICENSE.txt'],
    ['studio/LICENSE', 'openmotion-workbuddy-cn/licenses/STUDIO-UPSTREAM-LICENSE.txt'],
  ]) entries.push({ name, data: await readFile(path.join(repoRoot, source)) });
  const banned = new RegExp(['x-' + 'access-token', 'AKIA[0-9A-Z]{16}', '-'.repeat(5) + 'BEGIN ', 'sk-[A-Za-z0-9]{12,}', '/' + 'home/[A-Za-z0-9._-]+/'].join('|'));
  for (const entry of entries) {
    if (banned.test(entry.data.toString('utf8'))) throw new Error('打包前发现不该公开的内容：' + entry.name);
  }
  const data = zip(entries);
  await writeFile(destination, data);
  return { file: destination, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), files: entries.map(entry => entry.name) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { opts } = parseArgs(process.argv.slice(2));
  if (!opts.out) { console.error('用法：node integrations/workbuddy-cn/scripts/package-zip.mjs --out FILE.zip'); process.exitCode = 2; }
  else printJson(await packageZip(opts.out));
}
