import assert from 'node:assert/strict';
import test from 'node:test';
import { formatStructureLevelCode } from './columnCode';

test('层级编码规则按样式生成同级序号', () => {
  assert.equal(formatStructureLevelCode('chineseDunhao', 1), '一、');
  assert.equal(formatStructureLevelCode('chineseParentheses', 2), '（二）');
  assert.equal(formatStructureLevelCode('arabicPeriod', 3), '3.');
});

test('层级未启用编码时不生成序号', () => {
  assert.equal(formatStructureLevelCode(null, 1), null);
  assert.equal(formatStructureLevelCode(undefined, 1), null);
});
