import type {
  ComposedResourceType,
  ResourceDetail,
} from '@/services/tagSystem';
import {
  isComposedResourceType,
  validateFormalResourceVersionAggregate,
} from '@/services/tagSystem';
import { SUBJECT_OPTIONS } from '../ContentCenter/TagManage/components/treeFilterConstants';

export type CombinationProductionMode = 'new' | 'revision';

interface ValidCombinationProductionRouteContextBase {
  valid: true;
  subject: string;
  subjectLabel: string;
  resourceType: ComposedResourceType;
}

export type ValidCombinationProductionRouteContext =
  | (ValidCombinationProductionRouteContextBase & {
      mode: 'new';
      resourceId?: never;
    })
  | (ValidCombinationProductionRouteContextBase & {
      mode: 'revision';
      resourceId: string;
    });

export interface InvalidCombinationProductionRouteContext {
  valid: false;
  mode: CombinationProductionMode;
  error: string;
}

export type CombinationProductionRouteContext =
  | ValidCombinationProductionRouteContext
  | InvalidCombinationProductionRouteContext;

const SUBJECT_LABELS = new Map(
  SUBJECT_OPTIONS.map((option) => [option.value, option.label]),
);

const normalizeParameter = (value: string | null | undefined) =>
  typeof value === 'string' ? value.trim() : '';

const isValidResourceId = (resourceId: string) =>
  resourceId.length <= 200 && !/[\s/?#]/u.test(resourceId);

/** 组合制作入口不提供默认值；缺失或非法上下文必须停在只读错误态。 */
export const parseCombinationProductionRouteContext = (input: {
  mode: CombinationProductionMode;
  subject: string | null;
  type: string | null;
  resourceId?: string;
}): CombinationProductionRouteContext => {
  const subject = normalizeParameter(input.subject);
  if (!subject) {
    return {
      valid: false,
      mode: input.mode,
      error: '缺少学科参数，请从资产中心选择学科后重新进入',
    };
  }
  const subjectLabel = SUBJECT_LABELS.get(subject);
  if (!subjectLabel) {
    return {
      valid: false,
      mode: input.mode,
      error: `学科参数“${subject}”无效，组合制作不会默认切换到数学`,
    };
  }

  const requestedType = normalizeParameter(input.type);
  if (!requestedType) {
    return {
      valid: false,
      mode: input.mode,
      error: '缺少资源类型参数，请明确选择学案或作业',
    };
  }
  if (!isComposedResourceType(requestedType)) {
    return {
      valid: false,
      mode: input.mode,
      error: `资源类型参数“${requestedType}”无效，组合制作仅接受学案或作业`,
    };
  }

  if (input.mode === 'revision') {
    const resourceId = normalizeParameter(input.resourceId);
    if (!resourceId) {
      return {
        valid: false,
        mode: input.mode,
        error: '缺少待修订的正式资源 ID',
      };
    }
    if (!isValidResourceId(resourceId)) {
      return {
        valid: false,
        mode: input.mode,
        error: '待修订的正式资源 ID 格式无效',
      };
    }
    return {
      valid: true,
      mode: input.mode,
      subject,
      subjectLabel,
      resourceType: requestedType,
      resourceId,
    };
  }

  return {
    valid: true,
    mode: input.mode,
    subject,
    subjectLabel,
    resourceType: requestedType,
  };
};

export type RevisionResourceValidationResult =
  | { valid: true; resource: ResourceDetail }
  | { valid: false; message: string };

/** 复核修订深链返回的正式资源，防止错误身份、跨学科或跨类型上下文。 */
export const validateRevisionRouteResource = (
  context: ValidCombinationProductionRouteContext,
  resource: unknown,
): RevisionResourceValidationResult => {
  if (
    context.mode !== 'revision' ||
    !resource ||
    typeof resource !== 'object'
  ) {
    return { valid: false, message: '待修订的正式资源身份无效' };
  }

  const candidate = resource as Partial<ResourceDetail>;
  if (candidate.id !== context.resourceId) {
    return { valid: false, message: '返回的正式资源身份与修订入口不一致' };
  }
  if (candidate.subject !== context.subject) {
    return {
      valid: false,
      message: '该正式资源不属于当前学科，不能跨学科修订',
    };
  }
  if (!isComposedResourceType(candidate.type)) {
    return {
      valid: false,
      message: '该正式资源不是学案或作业，不能进入组合修订流程',
    };
  }
  if (candidate.type !== context.resourceType) {
    return {
      valid: false,
      message: '资源类型与修订入口不一致，请返回资产中心重新进入',
    };
  }

  const versionValidation = validateFormalResourceVersionAggregate(candidate);
  if (!versionValidation.valid) {
    return {
      valid: false,
      message: `正式资源版本数据无效：${versionValidation.message}`,
    };
  }
  return { valid: true, resource: candidate as ResourceDetail };
};
