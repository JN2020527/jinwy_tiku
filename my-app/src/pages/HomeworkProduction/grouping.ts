import type { PublishedQuestion } from '@/services/resourceAssets';

export interface QuestionTypeGroup<T> {
  key: string;
  label: string;
  startIndex: number;
  items: Array<{
    value: T;
    sourceIndex: number;
  }>;
}

/**
 * 按题型投影平铺试题列表。分组只用于展示，不改变源列表顺序或数据结构。
 * 分组顺序取各题型首次出现顺序，组内顺序取源列表顺序。
 */
export const groupByQuestionType = <T>(
  items: readonly T[],
  getQuestion: (item: T) => PublishedQuestion | undefined,
): QuestionTypeGroup<T>[] => {
  const groupMap = new Map<string, Omit<QuestionTypeGroup<T>, 'startIndex'>>();

  items.forEach((value, sourceIndex) => {
    const question = getQuestion(value);
    const key = question?.type || 'unavailable';
    const label = question?.type || '题目不可用';
    const group = groupMap.get(key) || { key, label, items: [] };
    group.items.push({ value, sourceIndex });
    groupMap.set(key, group);
  });

  let startIndex = 0;
  return Array.from(groupMap.values()).map((group) => {
    const result = { ...group, startIndex };
    startIndex += group.items.length;
    return result;
  });
};

const SECTION_NUMERALS = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
];

export const getQuestionGroupHeading = (index: number, label: string) =>
  `${SECTION_NUMERALS[index] || index + 1}、${label}`;
