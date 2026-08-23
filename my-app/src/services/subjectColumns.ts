import { request } from '@umijs/max';

export type SubjectColumnLevel = 1 | 2 | 3 | 4;
export type SubjectColumnType = 'knowledge' | 'question';
export type SubjectColumnDataSource = 'custom' | 'knowledgeTree';
export type SubjectColumnCodeStyle =
  | 'chineseDunhao'
  | 'chineseParentheses'
  | 'arabicPeriod';
export type SubjectColumnMoveDirection = 'up' | 'down';

export interface SubjectColumn {
  id: string;
  subject: string;
  name: string;
  level: SubjectColumnLevel;
  type: SubjectColumnType;
  dataSource: SubjectColumnDataSource;
  codeEnabled: boolean;
  codeStyle: SubjectColumnCodeStyle | null;
  sort: number;
  usedCount: number;
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
  type: SubjectColumnType;
  dataSource: SubjectColumnDataSource;
  codeEnabled: boolean;
  codeStyle: SubjectColumnCodeStyle | null;
}

export interface UpdateSubjectColumnInput {
  id: string;
  subject: string;
  name: string;
  codeEnabled: boolean;
  codeStyle: SubjectColumnCodeStyle | null;
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

export async function updateSubjectColumn(data: UpdateSubjectColumnInput) {
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
