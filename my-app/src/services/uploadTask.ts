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

// ----- 任务列表 / 详情 / 创建 -----

export async function getUploadTasks(params: UploadTaskQueryParams) {
  return request<ApiResponse<UploadTaskListResponse>>(
    '/api/upload-task/list',
    { method: 'GET', params },
  );
}

export async function getUploadTask(id: string) {
  return request<ApiResponse<UploadTask>>(`/api/upload-task/${id}`, {
    method: 'GET',
  });
}

export async function createUploadTask(body: CreateUploadTaskBody) {
  return request<ApiResponse<UploadTask>>('/api/upload-task/create', {
    method: 'POST',
    data: body,
  });
}

// ----- 阶段共用 -----

export async function getStageQuestions(taskId: string, stage: StageKey) {
  return request<ApiResponse<TaskQuestion[]>>(
    `/api/upload-task/${taskId}/stage/${stage}/questions`,
    { method: 'GET' },
  );
}

// ----- 质量检测 -----

export async function confirmQualityKeep(taskId: string, questionIds: string[]) {
  return request<ApiResponse<void>>('/api/upload-task/quality/keep', {
    method: 'POST',
    data: { taskId, questionIds },
  });
}

export async function confirmQualityReject(
  taskId: string,
  questionIds: string[],
  reason: string,
) {
  return request<ApiResponse<void>>('/api/upload-task/quality/reject', {
    method: 'POST',
    data: { taskId, questionIds, reason },
  });
}

// ----- 解析审核 -----

export async function updateParsedFields(
  taskId: string,
  questionId: string,
  patch: Partial<TaskQuestion>,
) {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/parse-review/update',
    { method: 'POST', data: { taskId, questionId, patch } },
  );
}

export async function regenerateParse(taskId: string, questionId: string) {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/parse-review/regenerate',
    { method: 'POST', data: { taskId, questionId } },
  );
}

export async function confirmParseReview(taskId: string, questionIds: string[]) {
  return request<ApiResponse<void>>(
    '/api/upload-task/parse-review/confirm',
    { method: 'POST', data: { taskId, questionIds } },
  );
}

// ----- 打标审核 -----

export async function updateTags(
  taskId: string,
  questionId: string,
  tags: NonNullable<TaskQuestion['tags']>,
) {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/tag-review/update',
    { method: 'POST', data: { taskId, questionId, tags } },
  );
}

export async function regenerateTags(taskId: string, questionId: string) {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/tag-review/regenerate',
    { method: 'POST', data: { taskId, questionId } },
  );
}

export async function confirmTagReview(taskId: string, questionIds: string[]) {
  return request<ApiResponse<void>>(
    '/api/upload-task/tag-review/confirm',
    { method: 'POST', data: { taskId, questionIds } },
  );
}

// ----- 系统态阶段 -----

export async function advanceSystemStage(taskId: string, stage: StageKey) {
  return request<ApiResponse<UploadTask>>('/api/upload-task/advance', {
    method: 'POST',
    data: { taskId, stage },
  });
}

// ----- 渠道分发 -----

export async function getDistributeConfig(taskId: string) {
  return request<ApiResponse<DistributeConfig | null>>(
    `/api/upload-task/${taskId}/distribute`,
    { method: 'GET' },
  );
}

export async function saveDistributeConfig(config: DistributeConfig) {
  return request<ApiResponse<UploadTask>>(
    '/api/upload-task/distribute/save',
    { method: 'POST', data: config },
  );
}
