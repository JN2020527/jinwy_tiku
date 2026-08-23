import type { RegisteredColumn } from '@/services/resourceAssets';
import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRegisteredColumnCode } from './columnCode';

const column = (overrides: Partial<RegisteredColumn>): RegisteredColumn => ({
  id: 'column-1',
  name: '栏目',
  level: 1,
  type: 'knowledge',
  dataSource: 'custom',
  codeEnabled: true,
  codeStyle: 'arabicPeriod',
  ...overrides,
});

test('栏目编码使用注册栏目配置的样式', () => {
  assert.equal(
    formatRegisteredColumnCode(column({ codeStyle: 'chineseDunhao' }), 1),
    '一、',
  );
  assert.equal(
    formatRegisteredColumnCode(column({ codeStyle: 'chineseParentheses' }), 2),
    '（二）',
  );
  assert.equal(
    formatRegisteredColumnCode(column({ codeStyle: 'arabicPeriod' }), 3),
    '3.',
  );
});

test('注册栏目未启用编码时不生成临时序号', () => {
  assert.equal(
    formatRegisteredColumnCode(
      column({ codeEnabled: false, codeStyle: null }),
      1,
    ),
    null,
  );
  assert.equal(formatRegisteredColumnCode(undefined, 1), null);
});
