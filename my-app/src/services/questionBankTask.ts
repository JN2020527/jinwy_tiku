import { request } from '@umijs/max';
import type { ApiResponse } from './tagSystem';

export interface TaskItem {
  id: number;
  name: string;
  type: string;
  status: string;
  updateTime: string;
}

interface TaskQueryParams {
  current?: number;
  pageSize?: number;
  name?: string;
  status?: string;
}

export async function getTasks(params: TaskQueryParams) {
  return request<ApiResponse<TaskItem[]>>('/api/question-bank/tasks', {
    method: 'GET',
    params,
  });
}

export async function addTask(data: Omit<TaskItem, 'id' | 'updateTime'>) {
  return request<ApiResponse<TaskItem[]>>('/api/question-bank/tasks', {
    method: 'POST',
    data,
  });
}

export async function updateTask(data: Partial<TaskItem> & { id: number }) {
  return request<ApiResponse<TaskItem[]>>('/api/question-bank/tasks', {
    method: 'PUT',
    data,
  });
}

export async function deleteTask(data: { id: number }) {
  return request<ApiResponse<TaskItem[]>>('/api/question-bank/tasks', {
    method: 'DELETE',
    data,
  });
}
