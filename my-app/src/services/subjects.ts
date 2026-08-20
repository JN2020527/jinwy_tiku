import { request } from '@umijs/max';

export interface SystemSubject {
  id: string;
  name: string;
  code: string;
  sort: number;
}

export interface SubjectListResponse {
  success: boolean;
  message: string;
  data: SystemSubject[];
}

/** 读取系统已有学科；资源树只消费该目录，不维护学科本体。 */
export async function getSystemSubjects() {
  return request<SubjectListResponse>('/api/system/subjects', {
    method: 'GET',
  });
}
