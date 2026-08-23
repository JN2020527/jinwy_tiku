import type {
  KnowledgeLeaf,
  RegisteredColumn,
  StudyGuideStructureNode,
} from '@/services/resourceAssets';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getStudyGuideStructureError,
  hydrateStudyGuideStructureLabels,
} from './structureModel';

const columns: RegisteredColumn[] = [
  {
    id: 'column-l1',
    name: '学习目标',
    applicableLevels: [1],
    type: 'knowledge',
    dataSource: 'custom',
  },
  {
    id: 'column-l3-tree',
    name: '知识点',
    applicableLevels: [3],
    type: 'knowledge',
    dataSource: 'knowledgeTree',
  },
];

const leaves: KnowledgeLeaf[] = [
  {
    id: 'leaf-1',
    title: '勾股定理',
    path: ['图形与几何', '勾股定理'],
  },
];

const validStructure: StudyGuideStructureNode[] = [
  {
    id: 'node-l1',
    level: 'level1',
    label: '旧一级名称',
    referenceId: 'column-l1',
    children: [
      {
        id: 'node-l2',
        level: 'level2',
        label: '当前学案分组',
        temporaryName: '当前学案分组',
        children: [
          {
            id: 'node-l3',
            level: 'level3',
            label: '旧节点名称',
            referenceId: 'column-l3-tree',
            knowledgeNodeId: 'leaf-1',
            children: [],
          },
        ],
      },
    ],
  },
];

test('各层级均允许注册栏目或当前学案自定义栏目', () => {
  assert.equal(
    getStudyGuideStructureError(validStructure, columns, leaves),
    null,
  );
  const custom = structuredClone(validStructure);
  delete custom[0].referenceId;
  custom[0].temporaryName = '自定义一级';
  assert.equal(getStudyGuideStructureError(custom, columns, leaves), null);

  const invalidReference = structuredClone(validStructure);
  invalidReference[0].referenceId = 'missing-column';
  assert.equal(
    getStudyGuideStructureError(invalidReference, columns, leaves),
    '1级栏目引用的注册数据无效',
  );

  const registeredUnderCustom = structuredClone(validStructure);
  registeredUnderCustom[0].children[0].children = [
    {
      id: 'node-l3-under-custom',
      level: 'level3',
      label: '勾股定理',
      referenceId: 'column-l3-tree',
      knowledgeNodeId: 'leaf-1',
      children: [],
    },
  ];
  assert.equal(
    getStudyGuideStructureError(registeredUnderCustom, columns, leaves),
    null,
  );

  const invalidCrossLevel = structuredClone(registeredUnderCustom);
  invalidCrossLevel[0].children[0].children[0] = {
    id: 'node-l3-cross-level',
    level: 'level3',
    label: '学习目标',
    referenceId: 'column-l1',
    children: [],
  };
  assert.equal(
    getStudyGuideStructureError(invalidCrossLevel, columns, leaves),
    '3级栏目引用的注册数据无效',
  );
});

test('知识树来源保存注册栏目 ID 与当前学科末级节点 ID', () => {
  const invalid = structuredClone(validStructure);
  delete invalid[0].children[0].children[0].knowledgeNodeId;
  assert.equal(
    getStudyGuideStructureError(invalid, columns, leaves),
    '栏目“知识点”必须选择当前学科知识树末级节点',
  );
});

test('结构不允许跳级，栏目和知识树改名后按 ID 展示新名称', () => {
  const skipped = structuredClone(validStructure);
  skipped[0].children = skipped[0].children[0].children;
  assert.equal(
    getStudyGuideStructureError(skipped, columns, leaves),
    '学案结构必须从一级开始逐级建立，不允许跳级',
  );

  const hydrated = hydrateStudyGuideStructureLabels(
    validStructure,
    [{ ...columns[0], name: '新学习目标' }, columns[1]],
    [{ ...leaves[0], title: '勾股定理（新）' }],
  );
  assert.equal(hydrated[0].label, '新学习目标');
  assert.equal(hydrated[0].children[0].children[0].label, '勾股定理（新）');
});
