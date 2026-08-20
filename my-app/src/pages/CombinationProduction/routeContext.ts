export type CombinationProductionMode = 'new' | 'revision';

export type CombinationProductionRouteContext =
  | {
      valid: true;
      mode: 'new';
      subject: string;
      resourceType: 'studyGuide' | 'homework';
    }
  | {
      valid: true;
      mode: 'revision';
      subject: string;
      resourceType: 'studyGuide';
      resourceId: string;
    }
  | { valid: false; mode: CombinationProductionMode; error: string };

const SUBJECTS = new Set([
  'math',
  'chinese',
  'english',
  'physics',
  'chemistry',
  'biology',
]);

export const parseCombinationProductionRouteContext = (input: {
  mode: CombinationProductionMode;
  subject: string | null;
  type: string | null;
  resourceId?: string;
}): CombinationProductionRouteContext => {
  const subject = input.subject?.trim() || '';
  const type = input.type?.trim() || '';
  if (!SUBJECTS.has(subject)) {
    return { valid: false, mode: input.mode, error: '缺少有效学科上下文' };
  }
  if (input.mode === 'new') {
    if (type !== 'studyGuide' && type !== 'homework') {
      return { valid: false, mode: input.mode, error: '请选择学案或作业入口' };
    }
    return { valid: true, mode: 'new', subject, resourceType: type };
  }
  if (type !== 'studyGuide') {
    return {
      valid: false,
      mode: input.mode,
      error: '本期组合编辑器只维护正式学案，作业不进入编辑器',
    };
  }
  const resourceId = input.resourceId?.trim() || '';
  if (!resourceId || resourceId.length > 200 || /[\s/?#]/u.test(resourceId)) {
    return { valid: false, mode: input.mode, error: '缺少有效学案 ID' };
  }
  return {
    valid: true,
    mode: 'revision',
    subject,
    resourceType: 'studyGuide',
    resourceId,
  };
};
