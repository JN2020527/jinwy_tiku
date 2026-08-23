import type { SubjectColumn } from '@/services/subjectColumns';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCreateSubjectColumnError,
  getSubjectLevelCodeRulesError,
  getUpdateSubjectColumnError,
  moveSubjectColumnWithinLevel,
} from './model';

const columns: SubjectColumn[] = [
  {
    id: 'column-goal',
    subject: 'math',
    name: '学习目标',
    applicableLevels: [1],
    type: 'knowledge',
    dataSource: 'custom',
    sortByLevel: { 1: 0 },
    usedCount: 1,
    usedCountByLevel: { 1: 1 },
  },
  {
    id: 'column-task',
    subject: 'math',
    name: '学习任务',
    applicableLevels: [1, 2],
    type: 'knowledge',
    dataSource: 'custom',
    sortByLevel: { 1: 1, 2: 0 },
    usedCount: 0,
    usedCountByLevel: {},
  },
  {
    id: 'column-key-point',
    subject: 'math',
    name: '考点',
    applicableLevels: [2, 3],
    type: 'knowledge',
    dataSource: 'knowledgeTree',
    sortByLevel: { 2: 1, 3: 0 },
    usedCount: 1,
    usedCountByLevel: { 3: 1 },
  },
];

test('栏目名称按同一学科保持唯一', () => {
  assert.equal(
    getCreateSubjectColumnError(columns, {
      subject: 'math',
      name: '考点',
      applicableLevels: [1],
      type: 'knowledge',
      dataSource: 'custom',
    }),
    '当前学科已存在同名栏目',
  );
});

test('同一个栏目可以选择多个适用层级', () => {
  assert.equal(
    getCreateSubjectColumnError(columns, {
      subject: 'math',
      name: '课堂练习',
      applicableLevels: [2, 3],
      type: 'question',
      dataSource: 'custom',
    }),
    null,
  );
  assert.equal(
    getUpdateSubjectColumnError(columns, {
      id: 'column-task',
      subject: 'math',
      name: '学习任务',
      applicableLevels: [1, 2, 4],
    }),
    null,
  );
});

test('已被学案引用的适用层级不能取消', () => {
  assert.equal(
    getUpdateSubjectColumnError(columns, {
      id: 'column-key-point',
      subject: 'math',
      name: '考点',
      applicableLevels: [2],
    }),
    '3级已有 1 处学案引用，不能取消该适用层级',
  );
});

test('知识树来源只能为知识型且每个层级最多一个', () => {
  assert.equal(
    getCreateSubjectColumnError(columns, {
      subject: 'math',
      name: '考点入口',
      applicableLevels: [4],
      type: 'question',
      dataSource: 'knowledgeTree',
    }),
    '知识树来源栏目只能选择知识型',
  );
  assert.equal(
    getCreateSubjectColumnError(columns, {
      subject: 'math',
      name: '知识树入口',
      applicableLevels: [1, 3],
      type: 'knowledge',
      dataSource: 'knowledgeTree',
    }),
    '当前学科3级已有知识树来源栏目',
  );
});

test('排序只调整指定层级，不影响同一栏目的其他层级顺序', () => {
  const result = moveSubjectColumnWithinLevel(columns, 'column-task', 1, 'up');
  assert.equal(result.success, true);
  if (!result.success) return;
  const task = result.data.find((column) => column.id === 'column-task');
  assert.equal(task?.sortByLevel[1], 0);
  assert.equal(task?.sortByLevel[2], 0);
  assert.equal(
    result.data.find((column) => column.id === 'column-goal')?.sortByLevel[1],
    1,
  );
});

test('层级编码规则必须覆盖一级至四级并使用受支持样式', () => {
  assert.equal(
    getSubjectLevelCodeRulesError([
      { level: 1, codeStyle: 'chineseDunhao' },
      { level: 2, codeStyle: 'chineseParentheses' },
      { level: 3, codeStyle: null },
      { level: 4, codeStyle: 'arabicPeriod' },
    ]),
    null,
  );
  assert.equal(
    getSubjectLevelCodeRulesError([{ level: 1, codeStyle: null }]),
    '请完整设置一级至四级的编码方式',
  );
});
