import { request } from '@umijs/max';

import {
  AddTeachingPlanTaskInput,
  CopyTeachingPlanTemplateInput,
  CreateDraftVersionInput,
  CreateTeachingPlanTemplateInput,
  DeleteOrArchiveTeachingPlanTemplateResult,
  MoveTeachingPlanTaskInput,
  OperateTeachingPlanTemplateInput,
  RemoveTeachingPlanTaskInput,
  ReorderTeachingPlanTasksInput,
  SchedulableResourceNode,
  TeachingPlanTemplate,
  TeachingPlanTemplateListParams,
  UpdateTeachingPlanTemplateInput,
} from '@/features/teaching-plan';
import {
  getResourceTreeLeafNodes,
  ResourceTreeLeafNode,
} from '@/services/tagSystem';

export * from '@/features/teaching-plan/types';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const TEMPLATE_ENDPOINT = '/api/teaching-plan/templates';

export async function listTeachingPlanTemplates(
  params: TeachingPlanTemplateListParams = {},
) {
  return request<ApiResponse<TeachingPlanTemplate[]>>(TEMPLATE_ENDPOINT, {
    method: 'GET',
    params,
  });
}

export async function getTeachingPlanTemplate(id: string) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${id}`,
    { method: 'GET' },
  );
}

export async function createTeachingPlanTemplate(
  data: CreateTeachingPlanTemplateInput,
) {
  return request<ApiResponse<TeachingPlanTemplate>>(TEMPLATE_ENDPOINT, {
    method: 'POST',
    data,
  });
}

export async function updateTeachingPlanTemplate(
  data: UpdateTeachingPlanTemplateInput,
) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${data.id}`,
    { method: 'PUT', data },
  );
}

export async function addTeachingPlanTask(data: AddTeachingPlanTaskInput) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${data.templateId}/tasks`,
    { method: 'POST', data },
  );
}

export async function moveTeachingPlanTask(data: MoveTeachingPlanTaskInput) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${data.templateId}/tasks/${data.taskId}/move`,
    { method: 'PUT', data },
  );
}

export async function reorderTeachingPlanTasks(
  data: ReorderTeachingPlanTasksInput,
) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${data.templateId}/weeks/${data.week}/tasks/order`,
    { method: 'PUT', data },
  );
}

export async function removeTeachingPlanTask(
  data: RemoveTeachingPlanTaskInput,
) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${data.templateId}/tasks/${data.taskId}`,
    { method: 'DELETE', data: { operator: data.operator } },
  );
}

export async function activateTeachingPlanTemplate(
  data: OperateTeachingPlanTemplateInput,
) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${data.id}/activate`,
    { method: 'POST', data },
  );
}

export async function stopTeachingPlanTemplate(
  data: OperateTeachingPlanTemplateInput,
) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${data.id}/stop`,
    { method: 'POST', data },
  );
}

export async function restartTeachingPlanTemplate(
  data: OperateTeachingPlanTemplateInput,
) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${data.id}/restart`,
    { method: 'POST', data },
  );
}

export async function createDraftVersion(data: CreateDraftVersionInput) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${data.id}/draft-version`,
    { method: 'POST', data },
  );
}

export async function copyTeachingPlanTemplate(
  data: CopyTeachingPlanTemplateInput,
) {
  return request<ApiResponse<TeachingPlanTemplate>>(
    `${TEMPLATE_ENDPOINT}/${data.id}/copy`,
    { method: 'POST', data },
  );
}

export async function deleteOrArchiveTeachingPlanTemplate(
  id: string,
  operator = '当前管理员',
) {
  return request<ApiResponse<DeleteOrArchiveTeachingPlanTemplateResult>>(
    `${TEMPLATE_ENDPOINT}/${id}`,
    { method: 'DELETE', data: { operator } },
  );
}

/**
 * 教学计划只消费资源树末级节点的排期投影，不维护第二份节点数据。
 * 停用节点也必须返回，供草稿同步状态；页面负责只把启用节点列为新选项。
 */
export async function getSchedulableResourceNodes(params: {
  subject: string;
}): Promise<ApiResponse<SchedulableResourceNode[]>> {
  const response = await getResourceTreeLeafNodes(params);
  if (!response.success || !Array.isArray(response.data)) {
    return { ...response, data: [] };
  }
  return {
    ...response,
    data: response.data.map((node: ResourceTreeLeafNode) => ({
      id: node.id,
      name: node.name,
      path: node.path,
      subject: node.subject,
      suggestedHours: node.suggestedHours,
      enabled: node.enabled,
    })),
  };
}

/** 供页面按业务动词调用，同时保留上方具名导出便于按需引用。 */
export const teachingPlanService = {
  list: listTeachingPlanTemplates,
  get: getTeachingPlanTemplate,
  create: createTeachingPlanTemplate,
  update: updateTeachingPlanTemplate,
  add: addTeachingPlanTask,
  move: moveTeachingPlanTask,
  reorder: reorderTeachingPlanTasks,
  remove: removeTeachingPlanTask,
  activate: activateTeachingPlanTemplate,
  stop: stopTeachingPlanTemplate,
  restart: restartTeachingPlanTemplate,
  createDraftVersion,
  copy: copyTeachingPlanTemplate,
  deleteOrArchive: deleteOrArchiveTeachingPlanTemplate,
  getSchedulableResourceNodes,
};
