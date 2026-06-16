import { request } from '@umijs/max';

// 试卷元数据
export interface PaperMetadata {
  name: string;
  subject: string;
  year?: string;
  region?: string;
  paperType?: string; // 真题/模拟卷
  mode: 'paper' | 'question'; // 试卷录入 | 试题录入
}

// 试题结构
export interface QuestionItem {
  id: string;
  number: string; // 题号 "1", "2", "(1)"
  type: string; // 单选题, 填空题, etc.
  stem: string; // 题干 HTML
  options?: string[]; // 选项 (可选)
  answer: string; // 答案 HTML
  analysis?: string; // 解析 HTML
  knowledgePoints?: string[]; // 知识点 ID
  difficulty?: number; // 1-5
  parentId?: string; // 父题 ID (用于材料题)
  children?: QuestionItem[]; // 子题
}

// 解析结果
export interface ParseResult {
  taskId: string;
  status: 'processing' | 'success' | 'failed';
  metadata: PaperMetadata;
  questions: QuestionItem[];
}

// 上传文件
export async function uploadPaper(
  file: File,
  metadata: PaperMetadata,
): Promise<{ data: { taskId: string }; success: boolean }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));

  return request('/api/paper/upload', {
    method: 'POST',
    data: formData,
  });
}

// 获取解析结果
export async function getParseResult(
  taskId: string,
): Promise<{ data: ParseResult; success: boolean }> {
  return request(`/api/paper/result/${taskId}`, {
    method: 'GET',
  });
}

// 提交入库
export async function submitPaper(
  taskId: string,
  questions: QuestionItem[],
): Promise<{ success: boolean }> {
  return request('/api/paper/submit', {
    method: 'POST',
    data: { taskId, questions },
  });
}
