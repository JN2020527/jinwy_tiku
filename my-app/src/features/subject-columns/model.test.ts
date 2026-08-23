import type { SubjectColumn } from '@/services/subjectColumns';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCreateSubjectColumnError,
  getUpdateSubjectColumnError,
  moveSubjectColumnWithinLevel,
} from './model';

const columns: SubjectColumn[] = [
  {
    id: 'l1-a',
    subject: 'math',
    name: '学习目标',
    level: 1,
    type: 'knowledge',
    dataSource: 'custom',
    codeEnabled: false,
    codeStyle: null,
    sort: 0,
    usedCount: 1,
  },
  {
    id: 'l1-b',
    subject: 'math',
    name: '学习准备',
    level: 1,
    type: 'knowledge',
    dataSource: 'custom',
    codeEnabled: false,
    codeStyle: null,
    sort: 1,
    usedCount: 0,
  },
  {
    id: 'l3-knowledge',
    subject: 'math',
    name: '知识点',
    level: 3,
    type: 'knowledge',
    dataSource: 'knowledgeTree',
    codeEnabled: false,
    codeStyle: null,
    sort: 0,
    usedCount: 0,
  },
];

test('栏目名称按同一学科跨层级校验唯一', () => {
  assert.equal(
    getCreateSubjectColumnError(columns, {
      subject: 'math',
      name: '知识点',
      level: 2,
      type: 'knowledge',
      dataSource: 'custom',
      codeEnabled: false,
      codeStyle: null,
    }),
    '当前学科已存在同名栏目',
  );
  assert.equal(
    getUpdateSubjectColumnError(columns, {
      id: 'l1-b',
      subject: 'math',
      name: '知识点',
      codeEnabled: false,
      codeStyle: null,
    }),
    '当前学科已存在同名栏目',
  );
});

test('编辑栏目时允许修改编码属性', () => {
  assert.equal(
    getUpdateSubjectColumnError(columns, {
      id: 'l1-b',
      subject: 'math',
      name: '学习准备',
      codeEnabled: true,
      codeStyle: null,
    }),
    '请选择有效的编码样式',
  );
  assert.equal(
    getUpdateSubjectColumnError(columns, {
      id: 'l1-b',
      subject: 'math',
      name: '学习准备',
      codeEnabled: true,
      codeStyle: 'chineseParentheses',
    }),
    null,
  );
});

test('知识树来源只能为知识型且同层级最多一个', () => {
  assert.equal(
    getCreateSubjectColumnError(columns, {
      subject: 'math',
      name: '考点入口',
      level: 2,
      type: 'question',
      dataSource: 'knowledgeTree',
      codeEnabled: false,
      codeStyle: null,
    }),
    '知识树来源栏目只能选择知识型',
  );
  assert.equal(
    getCreateSubjectColumnError(columns, {
      subject: 'math',
      name: '知识树入口',
      level: 3,
      type: 'knowledge',
      dataSource: 'knowledgeTree',
      codeEnabled: false,
      codeStyle: null,
    }),
    '当前学科3级已有知识树来源栏目',
  );
});

test('需要编码时必须选择受支持的编码样式', () => {
  assert.equal(
    getCreateSubjectColumnError(columns, {
      subject: 'math',
      name: '课堂导入',
      level: 2,
      type: 'knowledge',
      dataSource: 'custom',
      codeEnabled: true,
      codeStyle: null,
    }),
    '请选择有效的编码样式',
  );
  (['chineseDunhao', 'chineseParentheses', 'arabicPeriod'] as const).forEach(
    (codeStyle) => {
      assert.equal(
        getCreateSubjectColumnError(columns, {
          subject: 'math',
          name: '课堂导入',
          level: 2,
          type: 'knowledge',
          dataSource: 'custom',
          codeEnabled: true,
          codeStyle,
        }),
        null,
      );
    },
  );
});

test('排序只交换当前层级栏目', () => {
  const result = moveSubjectColumnWithinLevel(columns, 'l1-b', 'up');
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.find((column) => column.id === 'l1-b')?.sort, 0);
  assert.equal(result.data.find((column) => column.id === 'l1-a')?.sort, 1);
  assert.equal(
    result.data.find((column) => column.id === 'l3-knowledge')?.sort,
    0,
  );
});
