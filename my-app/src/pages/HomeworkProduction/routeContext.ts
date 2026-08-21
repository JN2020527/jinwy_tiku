import { SUBJECT_OPTIONS } from '../ContentCenter/TagManage/components/treeFilterConstants';

export type HomeworkProductionMode = 'new' | 'preview' | 'edit';

export type HomeworkProductionRouteContext =
  | {
      valid: true;
      mode: 'new';
      subject: string;
    }
  | {
      valid: true;
      mode: 'preview' | 'edit';
      subject: string;
      homeworkId: string;
    }
  | { valid: false; mode: HomeworkProductionMode | 'invalid'; error: string };

const VALID_SUBJECTS = new Set(SUBJECT_OPTIONS.map((option) => option.value));

const RESOURCE_ID_PATTERN = /[\s/?#]/u;

/**
 * 以 pathname 语义解析加工作业三种路由：
 * - /preparation/asset-center/homework/new            → 新建
 * - /preparation/asset-center/homework/:homeworkId    → 只读预览
 * - /preparation/asset-center/homework/:homeworkId/edit → 编辑
 * subject 从 query 读取并校验，学科锁定，不二次选择。
 */
export const parseHomeworkProductionRouteContext = (input: {
  pathname: string;
  subject: string | null;
}): HomeworkProductionRouteContext => {
  const segments = input.pathname
    .split('/')
    .filter((segment) => segment.length > 0);
  // 期望结构：[preparation, asset-center, homework, ...]
  if (
    segments.length < 3 ||
    segments[0] !== 'preparation' ||
    segments[1] !== 'asset-center' ||
    segments[2] !== 'homework'
  ) {
    return {
      valid: false,
      mode: 'invalid',
      error: '页面路由不正确',
    };
  }

  const subject = input.subject?.trim() || '';
  if (!VALID_SUBJECTS.has(subject)) {
    return {
      valid: false,
      mode: 'invalid',
      error: '缺少有效学科上下文',
    };
  }

  const tail = segments.slice(3);
  if (tail.length === 1 && tail[0] === 'new') {
    return { valid: true, mode: 'new', subject };
  }

  const homeworkId = tail[0] ?? '';
  if (
    tail.length < 1 ||
    tail.length > 2 ||
    !homeworkId ||
    homeworkId === 'new' ||
    homeworkId === 'edit' ||
    RESOURCE_ID_PATTERN.test(homeworkId) ||
    homeworkId.length > 200
  ) {
    return {
      valid: false,
      mode: 'invalid',
      error: '缺少有效作业 ID',
    };
  }

  if (tail.length === 1) {
    return { valid: true, mode: 'preview', subject, homeworkId };
  }
  if (tail.length === 2 && tail[1] === 'edit') {
    return { valid: true, mode: 'edit', subject, homeworkId };
  }

  return {
    valid: false,
    mode: 'invalid',
    error: '页面路由不正确',
  };
};
