import { normalizeSubjectColumnSort } from '../src/features/subject-columns/model';
import type {
  SubjectColumn,
  SubjectColumnLevel,
  SubjectColumnSortByLevel,
  SubjectLevelCodeRule,
} from '../src/services/subjectColumns';
import { getRegisteredColumnUsageCountsByLevel } from './resourceAssetsStore';

type SubjectColumnSeed = Omit<
  SubjectColumn,
  'applicableLevels' | 'sortByLevel' | 'usedCount' | 'usedCountByLevel'
> & {
  level?: SubjectColumnLevel;
  sort?: number;
  applicableLevels?: SubjectColumnLevel[];
  sortByLevel?: SubjectColumnSortByLevel;
  usedCount?: number;
};

interface SubjectColumnMockState {
  columnsBySubject: Record<string, SubjectColumn[]>;
  codeRulesBySubject: Record<string, SubjectLevelCodeRule[]>;
  sequence: number;
}

type SubjectColumnMockGlobal = typeof globalThis & {
  __JINWY_SUBJECT_COLUMN_MOCK_STATE__?: SubjectColumnMockState;
};

const withColumnDefaults = (columns: SubjectColumnSeed[]): SubjectColumn[] =>
  columns.map(({ level, sort, applicableLevels, sortByLevel, ...column }) => {
    const normalizedLevels = applicableLevels || (level ? [level] : []);
    return {
      ...column,
      applicableLevels: [...normalizedLevels],
      sortByLevel:
        sortByLevel ||
        Object.fromEntries(
          normalizedLevels.map((itemLevel) => [
            itemLevel,
            itemLevel === level ? sort || 0 : 0,
          ]),
        ),
      usedCount: 0,
      usedCountByLevel: {},
    };
  });

const createDefaultCodeRules = (): SubjectLevelCodeRule[] =>
  ([1, 2, 3, 4] as SubjectColumnLevel[]).map((level) => ({
    level,
    codeStyle: null,
  }));

const createInitialColumns = (): Record<string, SubjectColumn[]> => ({
  math: withColumnDefaults([
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
  chinese: withColumnDefaults([
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
  english: withColumnDefaults([
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
  history: withColumnDefaults([
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
      applicableLevels: [2, 3],
      type: 'knowledge',
      dataSource: 'knowledgeTree',
      sortByLevel: { 2: 2, 3: 0 },
      usedCount: 0,
    },
  ]),
});

const mockGlobal = globalThis as SubjectColumnMockGlobal;
const state = (mockGlobal.__JINWY_SUBJECT_COLUMN_MOCK_STATE__ ||= {
  columnsBySubject: createInitialColumns(),
  codeRulesBySubject: {},
  sequence: 0,
});

state.codeRulesBySubject ||= {};
Object.entries(state.columnsBySubject).forEach(([subject, columns]) => {
  if (columns.some((column) => !Array.isArray(column.applicableLevels))) {
    state.columnsBySubject[subject] = withColumnDefaults(
      columns as unknown as SubjectColumnSeed[],
    );
  }
});

export const cloneSubjectColumns = (columns: SubjectColumn[]) =>
  columns.map((column) => ({
    ...column,
    applicableLevels: [...column.applicableLevels],
    sortByLevel: { ...column.sortByLevel },
    usedCountByLevel: { ...column.usedCountByLevel },
  }));

export const getMutableSubjectColumns = (subject: string) => {
  const columns = (state.columnsBySubject[subject] ||= []);
  const usageCounts = getRegisteredColumnUsageCountsByLevel(subject);
  columns.forEach((column) => {
    column.usedCountByLevel = { ...(usageCounts[column.id] || {}) };
    column.usedCount = Object.values(column.usedCountByLevel).reduce(
      (total, count) => total + (count || 0),
      0,
    );
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

export const getSubjectLevelCodeRulesSnapshot = (subject: string) =>
  (state.codeRulesBySubject[subject] ||= createDefaultCodeRules()).map(
    (rule) => ({ ...rule }),
  );

export const replaceSubjectLevelCodeRules = (
  subject: string,
  rules: SubjectLevelCodeRule[],
) => {
  state.codeRulesBySubject[subject] = rules.map((rule) => ({ ...rule }));
};
