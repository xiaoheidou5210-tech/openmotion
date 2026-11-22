import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { localDir, mediaEnv, packageDir, parseArgs, printJson, repoRoot } from './common.mjs';
import { detectRuntime } from './detect.mjs';
import { prepareRuntime } from './prepare-runtime.mjs';
import { createProject } from './create-project.mjs';
import { extractFrame, probeMedia, renderProject } from './render-project.mjs';
import { probeMcp } from './probe-mcp.mjs';

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function runNodeTest() {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--test', path.join(packageDir, 'scripts/connect-mcp.test.mjs')], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => resolve({ code: code ?? 1, tail: (stderr || stdout).slice(-2000) }));
  });
}

function chineseReport(result) {
  const node = result.detect.node;
  const probe = result.ffprobe;
  const video = probe?.streams?.find(stream => stream.codec_type === 'video');
  const audio = (probe?.streams || []).filter(stream => stream.codec_type === 'audio');
  const lines = [
    '# OpenMotion WorkBuddy 中文技能包 · Linux 烟雾测试',
    '',
    `技能版本：0.2.0。测试平台：${result.detect.platform} ${result.detect.arch}。这不是 Mac，也不是 WorkBuddy 桌面。`,
    '',
    '## 版本',
    '',
    `- Node 实测：${node.version}`,
    `- package.json engines：${node.engines}`,
    `- 文档与 CI 推荐：${node.docsRecommended}`,
    `- 实测版本${node.isDocsRecommended ? '与' : '不是'}文档推荐版本。`,
    `- Hyperframes 锁定：${result.detect.pin.hyperframes}，integrity 见 runtime-pin.json，由 npm ci 对照 package-lock.json 校验。`,
    `- GSAP 锁定：${result.detect.pin.gsap}。工程在创建时从 node_modules 复制，技能包不内置引擎或 GSAP。`,
    '',
    '## 跑过的链路',
    '',
    `- 依赖检测：${result.detect.renderReady ? '渲染前置就绪' : '渲染前置不完整'}`,
    `- 运行时：${result.runtime?.action || '未执行'}，applied=${Boolean(result.runtime?.applied)}，ok=${Boolean(result.runtime?.ok)}`,
    `- 原生工程：${result.project ? '已写入 Hyperframes index.html 与四段 composition' : '未创建'}`,
    `- 渲染：${result.render?.ok ? 'hyperframes render --format mp4 生成了 ftyp MP4' : '未生成有效 MP4'}`,
    `- MCP：${result.mcp?.ok ? `stdio initialize 与 tools/list 成功，${result.mcp.toolNames.length} 个工具` : '未完成'}`,
    `- 配置合并测试：${result.configTest?.code === 0 ? '通过' : '未通过或未跑'}`,
    '',
    '## 成片',
    '',
  ];
  if (video) {
    lines.push(`- 编码：${video.codec_name} ${video.pix_fmt} ${video.width}x${video.height}`);
    lines.push(`- 帧率：${video.r_frame_rate}，平均 ${video.avg_frame_rate}`);
    lines.push(`- 时长：容器 ${probe.format?.duration} 秒，视频流 ${video.duration} 秒`);
    lines.push(`- 音频流数量：${audio.length}（文案为无旁白）`);
    lines.push(`- SHA-256：${result.sha256 || ''}`);
  } else lines.push('- 没有可读取的视频流。');
  lines.push(`- 技术校验：${result.verification?.status || 'not_run'}`);
  lines.push('', '## 未运行', '', '- WorkBuddy 桌面导入 Connector：not_run', '- WorkBuddy 里激活 MCP：not_run', '- Mac Apple Silicon 实机安装、渲染与播放：not_run', '- 付费模型与媒体供应商：未调用，也没有索取密钥', '- 市场提交、Release、收费：未做', '');
  if (result.blockers?.length) {
    lines.push('## 阻塞', '');
    for (const item of result.blockers) lines.push(`- ${item}`);
    lines.push('');
  }
  lines.push('## 重复命令', '', '```sh', 'node --experimental-strip-types integrations/workbuddy-cn/scripts/smoke.mjs --confirm-runtime', '```', '', '不加 --confirm-runtime 时，缺少 node_modules 会停在确认，不会安装依赖，也不会改 WorkBuddy 配置。');
  return lines.join('\n') + '\n';
}

export async function smoke({ confirmRuntime = false, outDir, output, reportDir } = {}) {
  if (!process.execArgv.includes('--experimental-strip-types')) {
    return { ok: false, blockers: ['请用 node --experimental-strip-types 运行，渲染会加载仓库里的 hyperframes.ts。'] };
  }
  const directory = outDir || path.join(localDir, 'smoke');
  const mp4 = output || path.join(directory, 'fold-clock-zh.mp4');
  const logs = reportDir || directory;
  await mkdir(logs, { recursive: true });
  const blockers = [];
  const detect = await detectRuntime();
  let runtime = null;
  if (!detect.hyperframes.installed || !detect.pin.ok) {
    runtime = await prepareRuntime({ confirm: confirmRuntime });
    if (!runtime.ok) blockers.push(runtime.confirmationRequired ? '运行时未安装。需要显式 --confirm-runtime 才会在检出目录执行 npm ci。' : 'npm ci 没有装好锁定的 Hyperframes。');
  } else runtime = await prepareRuntime({ confirm: false });
  const detectedAfter = runtime?.detected || detect;
  if (!detectedAfter.renderReady) blockers.push('渲染前置不完整：需要满足 engines 的 Node、Chrome/Chromium、FFmpeg、ffprobe，以及锁定的 Hyperframes。');
  let project = null;
  let render = null;
  let ffprobe = null;
  let verification = null;
  let frames = [];
  let digest = '';
  if (!blockers.length) {
    project = await createProject(path.join(directory, 'project'), { force: true });
    render = await renderProject({
      projectDir: project.projectDir,
      output: mp4,
      logFile: path.join(logs, 'render.log'),
      browser: detectedAfter.browser.path,
      ffmpeg: detectedAfter.ffmpeg.command,
      ffprobe: detectedAfter.ffprobe.command,
    });
    if (!render.ok) blockers.push('Hyperframes 渲染没有写出有效 MP4。见 render.log，没有改用独立字幕幻灯片。');
    else {
      ffprobe = await probeMedia(mp4, detectedAfter.ffprobe.command);
      const { verifyExport } = await import(pathToFileURL(path.join(repoRoot, 'scripts/verify-export.ts')).href);
      const savedLibraryPath = process.env.LD_LIBRARY_PATH;
      if (!Object.hasOwn(mediaEnv(), 'LD_LIBRARY_PATH')) delete process.env.LD_LIBRARY_PATH;
      try {
        verification = await verifyExport(mp4, { width: 1920, height: 1080, fps: 30, duration: 20, audio: 'silent' });
      } finally {
        if (savedLibraryPath === undefined) delete process.env.LD_LIBRARY_PATH;
        else process.env.LD_LIBRARY_PATH = savedLibraryPath;
      }
      if (verification.status !== 'passed') blockers.push('技术校验未通过：' + verification.status);
      digest = sha256(await readFile(mp4));
      for (const time of [2, 7, 12, 17]) frames.push(await extractFrame(mp4, time, path.join(logs, `frame-${time}.png`), detectedAfter.ffmpeg.command));
    }
  }
  let mcp = null;
  try { mcp = await probeMcp(); if (!mcp.ok) blockers.push('MCP initialize/tools/list 没有返回工具列表。'); }
  catch (error) { blockers.push('MCP 探针失败：' + (error instanceof Error ? error.message : String(error))); }
  const required = ['openmotion_create_project', 'openmotion_get_project', 'openmotion_edit_project', 'openmotion_export_request'];
  if (mcp?.ok && required.some(name => !mcp.toolNames.includes(name))) blockers.push('tools/list 缺少原生工程工具：' + required.filter(name => !mcp.toolNames.includes(name)).join(', '));
  const configTest = await runNodeTest();
  if (configTest.code !== 0) blockers.push('MCP 配置合并测试失败。');
  const result = { ok: blockers.length === 0, blockers, detect: detectedAfter, runtime, project, render, ffprobe, verification, sha256: digest, frames, mcp: mcp ? { ok: mcp.ok, toolCount: mcp.toolNames.length, toolNames: mcp.toolNames, server: mcp.protocol } : null, configTest };
  await writeFile(path.join(logs, 'smoke-result.json'), JSON.stringify(result, null, 2));
  await writeFile(path.join(logs, 'TEST-REPORT.zh-CN.md'), chineseReport(result));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  const result = await smoke({ confirmRuntime: flags.has('confirm-runtime'), outDir: opts.out, output: opts.output, reportDir: opts.report });
  printJson({ ok: result.ok, blockers: result.blockers, sha256: result.sha256, verification: result.verification?.status, mcpTools: result.mcp?.toolCount });
  if (!result.ok) process.exitCode = 1;
}
