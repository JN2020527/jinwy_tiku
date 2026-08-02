export const MIDDLE_EXAM_TREE_VALUE = 'middleExam';

export const TREE_CONTEXT_OPTIONS = [
  { label: '中考', value: MIDDLE_EXAM_TREE_VALUE },
];

export const KNOWLEDGE_TREE_CONTEXT_OPTIONS = [
  ...TREE_CONTEXT_OPTIONS,
  { label: '七年级', value: 'grade7' },
  { label: '八年级', value: 'grade8' },
  { label: '九年级', value: 'grade9' },
];

export const SEMESTER_OPTIONS = [
  { label: '上册', value: 'upper' },
  { label: '下册', value: 'lower' },
];

export const SUBJECT_OPTIONS = [
  { label: '语文', value: 'chinese' },
  { label: '数学', value: 'math' },
  { label: '英语', value: 'english' },
  { label: '物理', value: 'physics' },
  { label: '化学', value: 'chemistry' },
  { label: '生物', value: 'biology' },
  { label: '历史', value: 'history' },
  { label: '地理', value: 'geography' },
  { label: '道德与法治', value: 'politics' },
];

export const getTreeFilterOptionLabel = (
  options: { label: string; value: string }[],
  value?: string,
) => options.find((option) => option.value === value)?.label || '';
