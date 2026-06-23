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

export const getTreeFilterOptionLabel = (
  options: { label: string; value: string }[],
  value?: string,
) => options.find((option) => option.value === value)?.label || '';
