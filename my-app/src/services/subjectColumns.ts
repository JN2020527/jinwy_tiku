import { request } from '@umijs/max';

export type SubjectColumnLevel = 1 | 2 | 3 | 4;
export type SubjectColumnType = 'knowledge' | 'question';
export type SubjectColumnMoveDirection = 'up' | 'down';

export interface SubjectColumn {
  id: string;
  subject: string;
  name: string;
  level: SubjectColumnLevel;
  parentId: string | null;
  type: SubjectColumnType;
  sort: number;
  isUsed: boolean;
}

export interface SubjectColumnResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface SaveSubjectColumnInput {
  subject: string;
  name: string;
  level: SubjectColumnLevel;
  parentId: string | null;
  type: SubjectColumnType;
}

export async function getSubjectColumns(params: { subject: string }) {
  return request<SubjectColumnResponse<SubjectColumn[]>>(
    '/api/subject-columns',
    {
      method: 'GET',
      params,
    },
  );
}

export async function createSubjectColumn(data: SaveSubjectColumnInput) {
  return request<SubjectColumnResponse<SubjectColumn[]>>(
    '/api/subject-columns',
    {
      method: 'POST',
      data,
    },
  );
}

export async function updateSubjectColumn(
  data: SaveSubjectColumnInput & { id: string },
) {
  return request<SubjectColumnResponse<SubjectColumn[]>>(
    '/api/subject-columns',
    {
      method: 'PUT',
      data,
    },
  );
}

export async function moveSubjectColumn(data: {
  id: string;
  subject: string;
  direction: SubjectColumnMoveDirection;
}) {
  return request<SubjectColumnResponse<SubjectColumn[]>>(
    '/api/subject-columns/move',
    {
      method: 'PUT',
      data,
    },
  );
}

export async function deleteSubjectColumn(params: {
  id: string;
  subject: string;
}) {
  return request<SubjectColumnResponse<void>>('/api/subject-columns', {
    method: 'DELETE',
    params,
  });
}
