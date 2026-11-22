import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { exists, packageDir, parseArgs, printJson, repoRoot } from './common.mjs';

export async function createProject(outDir, { force = false } = {}) {
  const sample = path.join(packageDir, 'sample');
  const gsap = path.join(repoRoot, 'node_modules/gsap/dist/gsap.min.js');
  if (!await exists(gsap)) throw new Error('缺少锁定的 gsap.min.js。先在确认后运行 prepare-runtime.mjs，Skill 不内置 GSAP 副本。');
  if (await exists(outDir)) {
    if (!force) throw new Error('输出目录已存在。确认覆盖后加 --force：' + outDir);
    await rm(outDir, { recursive: true, force: true });
  }
  await mkdir(outDir, { recursive: true });
  await cp(sample, outDir, { recursive: true });
  await mkdir(path.join(outDir, 'assets'), { recursive: true });
  await cp(gsap, path.join(outDir, 'assets/gsap.min.js'));
  return { projectDir: outDir, entry: path.join(outDir, 'index.html'), gsapCopiedFrom: 'node_modules/gsap/dist/gsap.min.js', fontFilesBundled: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  if (!opts.out) { console.error('用法：node integrations/workbuddy-cn/scripts/create-project.mjs --out DIR [--force]'); process.exitCode = 2; }
  else {
    try { printJson(await createProject(opts.out, { force: flags.has('force') })); }
    catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
  }
}
