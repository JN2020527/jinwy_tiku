import type {
  SaveSubjectColumnInput,
  SubjectColumn,
  SubjectColumnLevel,
  SubjectColumnMoveDirection,
  UpdateSubjectColumnInput,
} from '@/services/subjectColumns';

export const SUBJECT_COLUMN_LEVELS: SubjectColumnLevel[] = [1, 2, 3, 4];

export const normalizeSubjectColumnSort = (columns: SubjectColumn[]) => {
  SUBJECT_COLUMN_LEVELS.forEach((level) => {
    columns
      .filter((column) => column.level === level)
      .sort((left, right) => left.sort - right.sort)
      .forEach((column, index) => {
        column.sort = index;
      });
  });
};

const getSubjectColumnCodeError = (input: {
  codeEnabled: boolean;
  codeStyle: SaveSubjectColumnInput['codeStyle'];
}) => {
  if (typeof input.codeEnabled !== 'boolean') {
    return '请选择是否需要编码';
  }
  if (
    input.codeEnabled &&
    !['chineseDunhao', 'chineseParentheses', 'arabicPeriod'].includes(
      input.codeStyle || '',
    )
  ) {
    return '请选择有效的编码样式';
  }
  if (!input.codeEnabled && input.codeStyle) {
    return '无需编码时不能选择编码样式';
  }
  return null;
};

export const getCreateSubjectColumnError = (
  columns: SubjectColumn[],
  input: SaveSubjectColumnInput,
) => {
  const name = input.name.trim();
  if (!input.subject) return '请选择学科';
  if (!name) return '请输入栏目名称';
  if (!SUBJECT_COLUMN_LEVELS.includes(input.level)) {
    return '请选择一级至四级中的栏目层级';
  }
  if (!['knowledge', 'question'].includes(input.type)) {
    return '请选择有效的栏目类型';
  }
  if (!['custom', 'knowledgeTree'].includes(input.dataSource)) {
    return '请选择有效的数据来源';
  }
  const codeError = getSubjectColumnCodeError(input);
  if (codeError) return codeError;
  if (columns.some((column) => column.name.trim() === name)) {
    return '当前学科已存在同名栏目';
  }
  if (input.dataSource === 'knowledgeTree' && input.type !== 'knowledge') {
    return '知识树来源栏目只能选择知识型';
  }
  if (
    input.dataSource === 'knowledgeTree' &&
    columns.some(
      (column) =>
        column.level === input.level && column.dataSource === 'knowledgeTree',
    )
  ) {
    return `当前学科${input.level}级已有知识树来源栏目`;
  }
  return null;
};

export const getUpdateSubjectColumnError = (
  columns: SubjectColumn[],
  input: UpdateSubjectColumnInput,
) => {
  const name = input.name.trim();
  if (!name) return '请输入栏目名称';
  if (!columns.some((column) => column.id === input.id)) {
    return '栏目不存在或不属于当前学科';
  }
  if (
    columns.some(
      (column) => column.id !== input.id && column.name.trim() === name,
    )
  ) {
    return '当前学科已存在同名栏目';
  }
  return getSubjectColumnCodeError(input);
};

export const moveSubjectColumnWithinLevel = (
  columns: SubjectColumn[],
  id: string,
  direction: SubjectColumnMoveDirection,
) => {
  const nextColumns = columns.map((column) => ({ ...column }));
  normalizeSubjectColumnSort(nextColumns);
  const current = nextColumns.find((column) => column.id === id);
  if (!current) {
    return { success: false as const, message: '栏目不存在或不属于当前学科' };
  }
  if (!['up', 'down'].includes(direction)) {
    return { success: false as const, message: '排序方向无效' };
  }
  const levelColumns = nextColumns
    .filter((column) => column.level === current.level)
    .sort((left, right) => left.sort - right.sort);
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
  const currentSort = current.sort;
  current.sort = target.sort;
  target.sort = currentSort;
  normalizeSubjectColumnSort(nextColumns);
  return { success: true as const, data: nextColumns };
};
