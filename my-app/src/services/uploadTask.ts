import { request } from '@umijs/max';
import type { ApiResponse } from './tagSystem';
import type {
  CreateUploadTaskBody,
  DistributeConfig,
  StageKey,
  TaskQuestion,
  UploadTask,
  UploadTaskListResponse,
} from '@/pages/UploadTask/types';

export interface UploadTaskQueryParams {
  current?: number;
  pageSize?: number;
  status?: string;
}

// 统一拆封：失败抛业务可读 Error，成功直接返回 data
function unwrap<T>(resp: ApiResponse<T>): T {
  if (!resp.success) {
    throw new Error(resp.message || '操作失败');
  }
  return resp.data;
}

// ----- 任务列表 / 详情 / 创建 -----

export async function getUploadTasks(
  params: UploadTaskQueryParams,
): Promise<UploadTaskListResponse> {
  return request<ApiResponse<UploadTaskListResponse>>(
    '/api/upload-task/list',
    { method: 'GET', params },
  ).then(unwrap);
}

export async function getUploadTask(id: string): Promise<UploadTask> {
  return request<ApiResponse<UploadTask>>(`/api/upload-task/${id}`, {
    method: 'GET',
  }).then(unwrap);
}

export async function createUploadTask(
  body: CreateUploadTaskBody,
): Promise<UploadTask> {
  return request<ApiResponse<UploadTask>>('/api/upload-task/create', {
    method: 'POST',
    data: body,
  }).then(unwrap);
}

// ----- 阶段共用 -----

export async function getStageQuestions(
  taskId: string,
  stage: StageKey,
): Promise<TaskQuestion[]> {
  return request<ApiResponse<TaskQuestion[]>>(
    `/api/upload-task/${taskId}/stage/${stage}/questions`,
    { method: 'GET' },
  ).then(unwrap);
}

// ----- 质量检测 -----

export async function confirmQualityKeep(
  taskId: string,
  questionIds: string[],
): Promise<void> {
  return request<ApiResponse<void>>('/api/upload-task/quality/keep', {
    method: 'POST',
    data: { taskId, questionIds },
  }).then(unwrap);
}

export async function confirmQualityReject(
  taskId: string,
  questionIds: string[],
  reason: string,
): Promise<void> {
  return request<ApiResponse<void>>('/api/upload-task/quality/reject', {
    method: 'POST',
    data: { taskId, questionIds, reason },
  }).then(unwrap);
}

// ----- 重复检测 -----

export async function unlinkDuplicate(
  taskId: string,
  questionId: string,
): Promise<void> {
  return request<ApiResponse<void>>(
    '/api/upload-task/dedupe/unlink',
    { method: 'POST', data: { taskId, questionId } },
  ).then(unwrap);
}


// ----- 解析审核 -----

export async function updateParsedFields(
  taskId: string,
  questionId: string,
  patch: Partial<TaskQuestion>,
): Promise<TaskQuestion> {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/parse-review/update',
    { method: 'POST', data: { taskId, questionId, patch } },
  ).then(unwrap);
}

export async function regenerateParse(
  taskId: string,
  questionId: string,
): Promise<TaskQuestion> {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/parse-review/regenerate',
    { method: 'POST', data: { taskId, questionId } },
  ).then(unwrap);
}

export async function confirmParseReview(
  taskId: string,
  questionIds: string[],
): Promise<void> {
  return request<ApiResponse<void>>(
    '/api/upload-task/parse-review/confirm',
    { method: 'POST', data: { taskId, questionIds } },
  ).then(unwrap);
}

// ----- 打标审核 -----

export async function updateTags(
  taskId: string,
  questionId: string,
  tags: NonNullable<TaskQuestion['tags']>,
): Promise<TaskQuestion> {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/tag-review/update',
    { method: 'POST', data: { taskId, questionId, tags } },
  ).then(unwrap);
}

export async function regenerateTags(
  taskId: string,
  questionId: string,
): Promise<TaskQuestion> {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/tag-review/regenerate',
    { method: 'POST', data: { taskId, questionId } },
  ).then(unwrap);
}

export async function confirmTagReview(
  taskId: string,
  questionIds: string[],
): Promise<void> {
  return request<ApiResponse<void>>(
    '/api/upload-task/tag-review/confirm',
    { method: 'POST', data: { taskId, questionIds } },
  ).then(unwrap);
}

// ----- 系统态阶段 -----

export async function advanceSystemStage(
  taskId: string,
  stage: StageKey,
): Promise<UploadTask> {
  return request<ApiResponse<UploadTask>>('/api/upload-task/advance', {
    method: 'POST',
    data: { taskId, stage },
  }).then(unwrap);
}

// ----- 渠道分发 -----

export async function getDistributeConfig(
  taskId: string,
): Promise<DistributeConfig | null> {
  return request<ApiResponse<DistributeConfig | null>>(
    `/api/upload-task/${taskId}/distribute`,
    { method: 'GET' },
  ).then(unwrap);
}

export async function saveDistributeConfig(
  config: DistributeConfig,
): Promise<UploadTask> {
  return request<ApiResponse<UploadTask>>(
    '/api/upload-task/distribute/save',
    { method: 'POST', data: config },
  ).then(unwrap);
}
