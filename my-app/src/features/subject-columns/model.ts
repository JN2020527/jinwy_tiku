import type {
  SaveSubjectColumnInput,
  SubjectColumn,
  SubjectColumnCodeStyle,
  SubjectColumnLevel,
  SubjectColumnMoveDirection,
  SubjectLevelCodeRule,
  UpdateSubjectColumnInput,
} from '@/services/subjectColumns';

export const SUBJECT_COLUMN_LEVELS: SubjectColumnLevel[] = [1, 2, 3, 4];

const CODE_STYLES: SubjectColumnCodeStyle[] = [
  'chineseDunhao',
  'chineseParentheses',
  'arabicPeriod',
];

export const normalizeApplicableLevels = (levels: SubjectColumnLevel[]) =>
  [...new Set(levels)].sort((left, right) => left - right);

const getApplicableLevelsError = (levels: SubjectColumnLevel[]) => {
  if (!Array.isArray(levels) || !levels.length) return '请选择至少一个适用层级';
  if (levels.some((level) => !SUBJECT_COLUMN_LEVELS.includes(level))) {
    return '适用层级只能选择一级至四级';
  }
  return null;
};

const getKnowledgeTreeLevelConflict = (
  columns: SubjectColumn[],
  applicableLevels: SubjectColumnLevel[],
  currentId?: string,
) =>
  applicableLevels.find((level) =>
    columns.some(
      (column) =>
        column.id !== currentId &&
        column.dataSource === 'knowledgeTree' &&
        column.applicableLevels.includes(level),
    ),
  );

export const normalizeSubjectColumnSort = (columns: SubjectColumn[]) => {
  columns.forEach((column) => {
    column.applicableLevels = normalizeApplicableLevels(
      column.applicableLevels,
    );
    column.sortByLevel = Object.fromEntries(
      column.applicableLevels.map((level) => [
        level,
        column.sortByLevel[level] ?? Number.MAX_SAFE_INTEGER,
      ]),
    );
  });
  SUBJECT_COLUMN_LEVELS.forEach((level) => {
    columns
      .filter((column) => column.applicableLevels.includes(level))
      .sort(
        (left, right) =>
          (left.sortByLevel[level] ?? Number.MAX_SAFE_INTEGER) -
          (right.sortByLevel[level] ?? Number.MAX_SAFE_INTEGER),
      )
      .forEach((column, index) => {
        column.sortByLevel[level] = index;
      });
  });
};

export const getCreateSubjectColumnError = (
  columns: SubjectColumn[],
  input: SaveSubjectColumnInput,
) => {
  const name = input.name.trim();
  if (!input.subject) return '请选择学科';
  if (!name) return '请输入栏目名称';
  const levelError = getApplicableLevelsError(input.applicableLevels);
  if (levelError) return levelError;
  if (!['knowledge', 'question'].includes(input.type)) {
    return '请选择有效的栏目类型';
  }
  if (!['custom', 'knowledgeTree'].includes(input.dataSource)) {
    return '请选择有效的数据来源';
  }
  if (columns.some((column) => column.name.trim() === name)) {
    return '当前学科已存在同名栏目';
  }
  if (input.dataSource === 'knowledgeTree' && input.type !== 'knowledge') {
    return '知识树来源栏目只能选择知识型';
  }
  if (input.dataSource === 'knowledgeTree') {
    const conflictLevel = getKnowledgeTreeLevelConflict(
      columns,
      input.applicableLevels,
    );
    if (conflictLevel) {
      return `当前学科${conflictLevel}级已有知识树来源栏目`;
    }
  }
  return null;
};

export const getUpdateSubjectColumnError = (
  columns: SubjectColumn[],
  input: UpdateSubjectColumnInput,
) => {
  const name = input.name.trim();
  if (!name) return '请输入栏目名称';
  const current = columns.find((column) => column.id === input.id);
  if (!current) return '栏目不存在或不属于当前学科';
  const levelError = getApplicableLevelsError(input.applicableLevels);
  if (levelError) return levelError;
  if (
    columns.some(
      (column) => column.id !== input.id && column.name.trim() === name,
    )
  ) {
    return '当前学科已存在同名栏目';
  }
  const removedUsedLevel = current.applicableLevels.find(
    (level) =>
      !input.applicableLevels.includes(level) &&
      (current.usedCountByLevel[level] || 0) > 0,
  );
  if (removedUsedLevel) {
    return `${removedUsedLevel}级已有 ${current.usedCountByLevel[removedUsedLevel]} 处学案引用，不能取消该适用层级`;
  }
  if (current.dataSource === 'knowledgeTree') {
    const conflictLevel = getKnowledgeTreeLevelConflict(
      columns,
      input.applicableLevels,
      input.id,
    );
    if (conflictLevel) {
      return `当前学科${conflictLevel}级已有知识树来源栏目`;
    }
  }
  return null;
};

export const moveSubjectColumnWithinLevel = (
  columns: SubjectColumn[],
  id: string,
  level: SubjectColumnLevel,
  direction: SubjectColumnMoveDirection,
) => {
  const nextColumns = columns.map((column) => ({
    ...column,
    applicableLevels: [...column.applicableLevels],
    sortByLevel: { ...column.sortByLevel },
    usedCountByLevel: { ...column.usedCountByLevel },
  }));
  normalizeSubjectColumnSort(nextColumns);
  const current = nextColumns.find((column) => column.id === id);
  if (!current) {
    return { success: false as const, message: '栏目不存在或不属于当前学科' };
  }
  if (!current.applicableLevels.includes(level)) {
    return { success: false as const, message: '栏目不适用于当前层级' };
  }
  if (!['up', 'down'].includes(direction)) {
    return { success: false as const, message: '排序方向无效' };
  }
  const levelColumns = nextColumns
    .filter((column) => column.applicableLevels.includes(level))
    .sort(
      (left, right) =>
        (left.sortByLevel[level] ?? 0) - (right.sortByLevel[level] ?? 0),
    );
  const currentIndex = levelColumns.findIndex((column) => column.id === id);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= levelColumns.length) {
    return {
      success: false as const,
      message:
        direction === 'up'
          ? '当前栏目已在本层级首位'
          : '当前栏目已在本层级末位',
    };
  }
  const target = levelColumns[targetIndex];
  const currentSort = current.sortByLevel[level] ?? 0;
  current.sortByLevel[level] = target.sortByLevel[level] ?? 0;
  target.sortByLevel[level] = currentSort;
  normalizeSubjectColumnSort(nextColumns);
  return { success: true as const, data: nextColumns };
};

export const getSubjectLevelCodeRulesError = (
  rules: SubjectLevelCodeRule[],
) => {
  if (!Array.isArray(rules) || rules.length !== SUBJECT_COLUMN_LEVELS.length) {
    return '请完整设置一级至四级的编码方式';
  }
  for (const level of SUBJECT_COLUMN_LEVELS) {
    const rule = rules.find((item) => item.level === level);
    if (!rule) return `缺少${level}级编码方式`;
    if (rule.codeStyle && !CODE_STYLES.includes(rule.codeStyle)) {
      return `${level}级编码方式无效`;
    }
  }
  return null;
};
