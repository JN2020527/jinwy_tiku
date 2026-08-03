import { request } from '@umijs/max';
import type { ApiResponse } from './tagSystem';
import type {
  CreateResourceReferenceInput,
  PlatformResourceResolution,
  ResolvedResourceReference,
  ResourceReference,
  ResourceReferenceListParams,
} from './resourceReferenceModel';

export {
  RESOURCE_REFERENCE_CONSUMER_LABELS,
  RESOURCE_REFERENCE_ERROR_CODES,
} from './resourceReferenceModel';
export type {
  CreateResourceReferenceInput,
  PlatformResourceResolution,
  ResolvedResourceReference,
  ResourceReference,
  ResourceReferenceConsumer,
  ResourceReferenceConsumerType,
  ResourceReferenceListParams,
  ResourceReferenceResourceIdentity,
} from './resourceReferenceModel';

/** 查询最小业务引用存储，用于接入真实教学计划/任务前的契约探针。 */
export async function getResourceReferences(
  params: ResourceReferenceListParams,
) {
  return request<ApiResponse<ResourceReference[]>>('/api/resource-references', {
    method: 'GET',
    params,
  });
}

/** 创建时固定调用方选择的逻辑资源与具体版本；归档或未上架资源会被拒绝。 */
export async function createResourceReference(
  data: CreateResourceReferenceInput,
) {
  return request<ApiResponse<ResourceReference>>('/api/resource-references', {
    method: 'POST',
    data,
  });
}

/** 按引用身份解析固定版本，不读取资源当前版本。 */
export async function resolveResourceReference(params: {
  subject: string;
  id: string;
}) {
  return request<ApiResponse<ResolvedResourceReference>>(
    '/api/resource-references/resolve',
    { method: 'GET', params },
  );
}

/** 平台资源库读取探针：仅返回已上架资源的当前生效版本。 */
export async function resolvePlatformResource(params: {
  subject: string;
  resourceId: string;
}) {
  return request<ApiResponse<PlatformResourceResolution>>(
    '/api/platform-resources/resolve',
    { method: 'GET', params },
  );
}
