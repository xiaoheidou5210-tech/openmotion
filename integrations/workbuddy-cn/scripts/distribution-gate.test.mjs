import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { packageDir } from './common.mjs';
import { assertDistributionClosed, readDistributionGate, skillBuyerViolations } from './distribution-gate.mjs';

test('root SKILL.md does not send a buyer to Git, npm, or a browser download', async () => {
  const skill = await readFile(path.join(packageDir, 'SKILL.md'), 'utf8');
  const readme = await readFile(path.join(packageDir, 'README.zh-CN.md'), 'utf8');
  const nested = await readFile(path.join(packageDir, 'connector/skills/openmotion-workbuddy-cn/SKILL.md'), 'utf8');
  assert.equal(skillBuyerViolations(skill).length, 0);
  assert.equal(skillBuyerViolations(readme).length, 0);
  assert.equal(skillBuyerViolations(nested).length, 0);
  assert.match(skill, /customerReady/);
  assert.match(skill, /openmotion_export_request/);
  assert.doesNotMatch(skill, /integrations\/workbuddy-cn\/scripts/);
});

test('distribution stays closed', async () => {
  const gate = await readDistributionGate();
  assert.deepEqual(gate.skillViolations, []);
  assert.deepEqual(gate.distributionProblems, []);
  assert.equal(gate.customerReady, false);
});

test('a ready flag without the bundled set is rejected', () => {
  const problems = assertDistributionClosed({ customerReady: true, blockers: [] });
  assert.ok(problems.some(item => item.includes('customerReady')));
});
