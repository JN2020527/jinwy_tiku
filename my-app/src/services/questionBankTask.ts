import { request } from '@umijs/max';

export interface TaskItem {
  id: number;
  name: string;
  type: string;
  status: string;
  updateTime: string;
}

export async function getTasks(
  params: {
    current?: number;
    pageSize?: number;
    name?: string;
    status?: string;
  },
  options?: { [key: string]: any },
) {
  return request<{
    data: TaskItem[];
    total?: number;
    success?: boolean;
  }>('/api/question-bank/tasks', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

export async function addTask(
  data: { [key: string]: any },
  options?: { [key: string]: any },
) {
  return request<Record<string, any>>('/api/question-bank/tasks', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export async function updateTask(
  data: { [key: string]: any },
  options?: { [key: string]: any },
) {
  return request<Record<string, any>>('/api/question-bank/tasks', {
    method: 'PUT',
    data,
    ...(options || {}),
  });
}

export async function deleteTask(
  data: { id: number },
  options?: { [key: string]: any },
) {
  return request<Record<string, any>>('/api/question-bank/tasks', {
    method: 'DELETE',
    data,
    ...(options || {}),
  });
}
