import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildExampleKnowledgeHtml,
  getDraftContentBlocks,
  getEffectiveKnowledgeNodeIds,
  getExampleKnowledgeContent,
  getKnowledgeNodeSelectionError,
  getSelectedKnowledgeNodeIds,
} from './contentType';

test('例题类知识按试题内容、思路点拨和试题答案保存，并兼容旧正文', () => {
  const exampleContent = {
    stemHtml: '<p>试题内容</p>',
    guideHtml: '<p>思路点拨</p>',
    answerHtml: '<p>试题答案</p>',
  };
  assert.equal(
    buildExampleKnowledgeHtml(exampleContent),
    '<section data-example-part="试题内容"><h4>试题内容</h4><p>试题内容</p></section><section data-example-part="思路点拨"><h4>思路点拨</h4><p>思路点拨</p></section><section data-example-part="试题答案"><h4>试题答案</h4><p>试题答案</p></section>',
  );
  assert.deepEqual(getExampleKnowledgeContent({ html: '<p>旧例题正文</p>' }), {
    stemHtml: '<p>旧例题正文</p>',
    guideHtml: '',
    answerHtml: '',
  });
});

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

test('普通知识块继承栏目节点，综合类严格使用手选节点', () => {
  assert.deepEqual(
    getEffectiveKnowledgeNodeIds('single', 'kp-column', 'kp-selected'),
    ['kp-column'],
  );
  assert.deepEqual(
    getEffectiveKnowledgeNodeIds('comprehensive', 'kp-column', undefined, [
      'kp-other',
      'kp-third',
    ]),
    ['kp-other', 'kp-third'],
  );
  assert.deepEqual(
    getEffectiveKnowledgeNodeIds('columnContent', 'kp-column'),
    [],
  );
});

test('保存草稿时不写入正式知识块和知识点映射', () => {
  const [draftBlock] = getDraftContentBlocks([
    {
      id: 'block-1',
      kind: 'single',
      structureNodeId: 'node-1',
      html: '<p>正文</p>',
      knowledgeNodeIds: ['kp-1'],
      knowledgeBlockId: 'kb-1',
      currentKnowledgeScope: ['kp-1'],
    },
  ]);
  assert.deepEqual(draftBlock, {
    id: 'block-1',
    kind: 'single',
    structureNodeId: 'node-1',
    html: '<p>正文</p>',
    knowledgeNodeIds: [],
  });
});

test('保存例题草稿时保留试题内容、思路点拨和试题答案结构', () => {
  const exampleContent = {
    stemHtml: '<p>试题内容</p>',
    guideHtml: '<p>思路点拨</p>',
    answerHtml: '<p>试题答案</p>',
  };
  const [draftBlock] = getDraftContentBlocks([
    {
      id: 'block-example',
      kind: 'example',
      structureNodeId: 'node-1',
      html: buildExampleKnowledgeHtml(exampleContent),
      exampleContent,
      knowledgeNodeIds: ['kp-1'],
      knowledgeBlockId: 'kb-1',
    },
  ]);
  assert.deepEqual(draftBlock.exampleContent, exampleContent);
  assert.deepEqual(draftBlock.knowledgeNodeIds, []);
  assert.equal(draftBlock.knowledgeBlockId, undefined);
});

test('保存综合类草稿时保留手选知识点但移除正式知识块关系', () => {
  const [draftBlock] = getDraftContentBlocks([
    {
      id: 'block-comprehensive',
      kind: 'comprehensive',
      structureNodeId: 'node-1',
      html: '<p>综合内容</p>',
      knowledgeNodeIds: ['kp-1', 'kp-2'],
      knowledgeBlockId: 'kb-1',
      currentKnowledgeScope: ['kp-1', 'kp-2'],
    },
  ]);
  assert.deepEqual(draftBlock.knowledgeNodeIds, ['kp-1', 'kp-2']);
  assert.equal(draftBlock.knowledgeBlockId, undefined);
  assert.equal(draftBlock.currentKnowledgeScope, undefined);
});
