import { normalizeSubjectColumnSort } from '../src/features/subject-columns/model';
import type { SubjectColumn } from '../src/services/subjectColumns';
import { getRegisteredColumnUsageCounts } from './resourceAssetsStore';

type SubjectColumnSeed = Omit<SubjectColumn, 'codeEnabled' | 'codeStyle'> &
  Partial<Pick<SubjectColumn, 'codeEnabled' | 'codeStyle'>>;

interface SubjectColumnMockState {
  columnsBySubject: Record<string, SubjectColumn[]>;
  sequence: number;
}

type SubjectColumnMockGlobal = typeof globalThis & {
  __JINWY_SUBJECT_COLUMN_MOCK_STATE__?: SubjectColumnMockState;
};

const withCodeDefaults = (columns: SubjectColumnSeed[]): SubjectColumn[] =>
  columns.map((column) => ({
    codeEnabled: false,
    codeStyle: null,
    ...column,
  }));

const createInitialColumns = (): Record<string, SubjectColumn[]> => ({
  math: withCodeDefaults([
    {
      id: 'column-math-goal',
      subject: 'math',
      name: '学习目标',
      level: 1,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-math-preview',
      subject: 'math',
      name: '课前预习',
      level: 1,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 1,
      usedCount: 0,
    },
    {
      id: 'column-math-concept',
      subject: 'math',
      name: '概念与方法',
      level: 2,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-math-knowledge',
      subject: 'math',
      name: '知识点',
      level: 3,
      type: 'knowledge',
      dataSource: 'knowledgeTree',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-math-practice',
      subject: 'math',
      name: '巩固练习',
      level: 4,
      type: 'question',
      dataSource: 'custom',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-math-summary',
      subject: 'math',
      name: '课堂小结',
      level: 4,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 1,
      usedCount: 0,
    },
  ]),
  chinese: withCodeDefaults([
    {
      id: 'column-chinese-goal',
      subject: 'chinese',
      name: '学习目标',
      level: 1,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-chinese-reading',
      subject: 'chinese',
      name: '阅读鉴赏',
      level: 2,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-chinese-knowledge',
      subject: 'chinese',
      name: '知识点',
      level: 3,
      type: 'knowledge',
      dataSource: 'knowledgeTree',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-chinese-practice',
      subject: 'chinese',
      name: '随堂练习',
      level: 4,
      type: 'question',
      dataSource: 'custom',
      sort: 0,
      usedCount: 0,
    },
  ]),
  english: withCodeDefaults([
    {
      id: 'column-english-language',
      subject: 'english',
      name: '语言积累',
      level: 1,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-english-training',
      subject: 'english',
      name: '专项训练',
      level: 2,
      type: 'question',
      dataSource: 'custom',
      sort: 0,
      usedCount: 0,
    },
  ]),
  history: withCodeDefaults([
    {
      id: 'column-history-goal',
      subject: 'history',
      name: '学习目标',
      level: 1,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-history-analysis',
      subject: 'history',
      name: '考情分析',
      level: 1,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 1,
      usedCount: 0,
    },
    {
      id: 'column-history-task',
      subject: 'history',
      name: '学习任务',
      level: 1,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 2,
      usedCount: 0,
    },
    {
      id: 'column-history-outline',
      subject: 'history',
      name: '脉络梳理',
      level: 2,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 0,
      usedCount: 0,
    },
    {
      id: 'column-history-review',
      subject: 'history',
      name: '知识回顾',
      level: 2,
      type: 'knowledge',
      dataSource: 'custom',
      sort: 1,
      usedCount: 0,
    },
    {
      id: 'column-history-key-point',
      subject: 'history',
      name: '考点',
      level: 3,
      type: 'knowledge',
      dataSource: 'knowledgeTree',
      sort: 0,
      usedCount: 0,
    },
  ]),
});

const mockGlobal = globalThis as SubjectColumnMockGlobal;
const state = (mockGlobal.__JINWY_SUBJECT_COLUMN_MOCK_STATE__ ||= {
  columnsBySubject: createInitialColumns(),
  sequence: 0,
});

export const cloneSubjectColumns = (columns: SubjectColumn[]) =>
  columns.map((column) => ({ ...column }));

export const getMutableSubjectColumns = (subject: string) => {
  const columns = (state.columnsBySubject[subject] ||= []);
  const usageCounts = getRegisteredColumnUsageCounts(subject);
  columns.forEach((column) => {
    column.usedCount = usageCounts[column.id] || 0;
  });
  return columns;
};

export const replaceSubjectColumns = (
  subject: string,
  columns: SubjectColumn[],
) => {
  state.columnsBySubject[subject] = columns;
};

export const nextSubjectColumnId = (subject: string) => {
  state.sequence += 1;
  return `column-${subject}-${Date.now()}-${state.sequence}`;
};

export const getSubjectColumnsSnapshot = (subject: string) => {
  const columns = cloneSubjectColumns(getMutableSubjectColumns(subject));
  normalizeSubjectColumnSort(columns);
  return columns;
};
