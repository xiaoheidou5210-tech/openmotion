import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { packageDir } from './common.mjs';

const forbidden = [
  [/git\s+clone/i, 'git clone'],
  [/github\.com/i, 'github.com'],
  [/storage\.googleapis\.com/i, 'storage.googleapis.com'],
  [/registry\.npmjs\.org/i, 'registry.npmjs.org'],
  [/npm\s+ci\b/i, 'npm ci'],
  [/chrome-for-testing/i, 'chrome-for-testing'],
];

export function skillBuyerViolations(text) {
  return forbidden.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
}

export function assertDistributionClosed(document) {
  const problems = [];
  if (document?.customerReady !== false) problems.push('customerReady must stay false until browser, FFmpeg, Node, and the OpenMotion MCP server are actually inside the skill');
  const ids = new Set((document?.blockers || []).map(item => item.id));
  for (const id of ['chrome-for-testing-not-bundled', 'gpl-static-corresponding-source-incomplete', 'windows-chromium-missing', 'windows-not-executed', 'mac-not-assembled']) {
    if (!ids.has(id)) problems.push('missing blocker ' + id);
  }
  if ((document?.blockers || []).some(item => item.bundled === true)) problems.push('a blocker is marked bundled while customerReady is false');
  return problems;
}

export async function readDistributionGate() {
  const skill = await readFile(path.join(packageDir, 'SKILL.md'), 'utf8');
  const document = JSON.parse(await readFile(path.join(packageDir, 'distribution-blockers.json'), 'utf8'));
  return { skillViolations: skillBuyerViolations(skill), distributionProblems: assertDistributionClosed(document), customerReady: document.customerReady };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const gate = await readDistributionGate();
  console.log(JSON.stringify(gate, null, 2));
  if (gate.skillViolations.length || gate.distributionProblems.length || gate.customerReady !== false) process.exitCode = 1;
}
