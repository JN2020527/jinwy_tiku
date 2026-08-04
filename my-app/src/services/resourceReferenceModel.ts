import type {
  ResourceCreator,
  ResourceStatus,
  ResourceType,
  ResourceVersion,
} from './resourceModel';

export const RESOURCE_REFERENCE_ERROR_CODES = {
  archived: 'RESOURCE_ARCHIVED',
  notListed: 'RESOURCE_NOT_LISTED',
  notVisible: 'RESOURCE_NOT_VISIBLE',
  duplicated: 'RESOURCE_REFERENCE_EXISTS',
} as const;

/** 首期用教学计划、教学任务两类消费者验证固定版本引用边界。 */
export type ResourceReferenceConsumerType = 'teachingPlan' | 'teachingTask';

export const RESOURCE_REFERENCE_CONSUMER_LABELS: Record<
  ResourceReferenceConsumerType,
  string
> = {
  teachingPlan: '教学计划',
  teachingTask: '教学任务',
};

export interface ResourceReferenceConsumer {
  readonly type: ResourceReferenceConsumerType;
  readonly id: string;
  readonly name: string;
}

/**
 * 业务引用同时固定逻辑资源与具体正式版本。currentVersionId 后续变化不会改写
 * versionId；资源归档也不会移除已有引用。
 */
export interface ResourceReference {
  readonly id: string;
  readonly subject: string;
  readonly resourceId: string;
  readonly versionId: string;
  readonly consumer: ResourceReferenceConsumer;
  readonly createdAt: string;
  readonly createdBy: ResourceCreator;
}

/** 调用方提交其选择时看到的具体版本，服务端校验版本确属该逻辑资源。 */
export interface CreateResourceReferenceInput {
  readonly subject: string;
  readonly resourceId: string;
  readonly versionId: string;
  readonly consumer: ResourceReferenceConsumer;
}

export interface ResourceReferenceListParams {
  readonly subject: string;
  readonly resourceId?: string;
  readonly consumerType?: ResourceReferenceConsumerType;
  readonly consumerId?: string;
}

export interface ResourceReferenceResourceIdentity {
  readonly id: string;
  readonly name: string;
  readonly type: ResourceType;
  readonly subject: string;
  readonly nodeId: string;
  readonly status: ResourceStatus;
  readonly currentVersionId: string;
}

/** 引用解析永远返回 reference.versionId 指向的版本，包括资源已归档时。 */
export interface ResolvedResourceReference {
  readonly reference: ResourceReference;
  readonly resource: ResourceReferenceResourceIdentity;
  readonly version: ResourceVersion;
}

/** 平台资源库只浏览已上架资源，并在每次读取时解析当前生效版本。 */
export interface PlatformResourceResolution {
  readonly resource: ResourceReferenceResourceIdentity;
  readonly versionId: string;
  readonly version: ResourceVersion;
}
