import type { SubjectColumnCodeStyle } from '@/services/subjectColumns';

const CHINESE_NUMERALS = [
  '零',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
];

const toChineseOrdinal = (value: number) => {
  if (value < 10) return CHINESE_NUMERALS[value];
  if (value === 10) return '十';
  if (value < 20) return `十${CHINESE_NUMERALS[value % 10]}`;
  if (value < 100) {
    const remainder = value % 10;
    return `${CHINESE_NUMERALS[Math.floor(value / 10)]}十${
      remainder ? CHINESE_NUMERALS[remainder] : ''
    }`;
  }
  return String(value);
};

export const formatStructureLevelCode = (
  codeStyle: SubjectColumnCodeStyle | null | undefined,
  siblingOrder: number,
) => {
  if (!codeStyle) return null;
  const chineseOrdinal = toChineseOrdinal(siblingOrder);
  if (codeStyle === 'chineseDunhao') return `${chineseOrdinal}、`;
  if (codeStyle === 'chineseParentheses') {
    return `（${chineseOrdinal}）`;
  }
  return `${siblingOrder}.`;
};
