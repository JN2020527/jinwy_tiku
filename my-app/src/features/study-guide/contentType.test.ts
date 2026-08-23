import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getKnowledgeNodeSelectionError,
  getSelectedKnowledgeNodeIds,
} from './contentType';

test('栏目内容不需要关联知识树节点', () => {
  assert.deepEqual(
    getSelectedKnowledgeNodeIds('columnContent', 'kp-1', ['kp-2']),
    [],
  );
  assert.equal(getKnowledgeNodeSelectionError('columnContent', []), null);
});

test('单一、方法和例题类知识只能选择一个末级节点', () => {
  assert.deepEqual(getSelectedKnowledgeNodeIds('single', 'kp-1'), ['kp-1']);
  assert.equal(getKnowledgeNodeSelectionError('method', ['kp-1']), null);
  assert.equal(
    getKnowledgeNodeSelectionError('example', []),
    '当前知识类型必须选择一个末级节点',
  );
});

test('综合类知识使用多选并至少关联两个末级节点', () => {
  assert.deepEqual(
    getSelectedKnowledgeNodeIds('comprehensive', undefined, ['kp-1', 'kp-2']),
    ['kp-1', 'kp-2'],
  );
  assert.equal(
    getKnowledgeNodeSelectionError('comprehensive', ['kp-1']),
    '综合类知识至少选择两个末级节点',
  );
  assert.equal(
    getKnowledgeNodeSelectionError('comprehensive', ['kp-1', 'kp-2']),
    null,
  );
});
