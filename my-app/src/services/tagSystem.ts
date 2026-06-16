import { request } from '@umijs/max';

// --- API Types ---

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AttributeItem {
  id: string;
  name: string;
  color: string;
}

export interface TagCategory {
  id: string;
  name: string;
  tags: AttributeItem[];
}

export interface KnowledgeNode {
  id: string;
  name: string;
  parentId: string | null;
  children?: KnowledgeNode[];
}

export interface QuestionTypeNode {
  id: string;
  name: string;
  parentId: string | null;
  children?: QuestionTypeNode[];
}

export interface TextbookVersion {
  id: string;
  name: string;
}

export interface TextbookChapter {
  id: string;
  name: string;
  parentId: string | null;
  version: string;
  children?: TextbookChapter[];
}

// --- Knowledge Tree ---

export async function getKnowledgeTree() {
  return request<ApiResponse<KnowledgeNode[]>>('/api/tags/knowledge-tree', {
    method: 'GET',
  });
}

// --- Tag Category CRUD ---

export async function getTagCategories() {
  return request<ApiResponse<TagCategory[]>>('/api/tags/categories', {
    method: 'GET',
  });
}

export async function addTagCategory(data: {
  name: string;
  tags?: AttributeItem[];
}) {
  return request<ApiResponse<TagCategory>>('/api/tags/category', {
    method: 'POST',
    data,
  });
}

export async function updateTagCategory(data: {
  id: string;
  name: string;
  tags?: AttributeItem[];
}) {
  return request<ApiResponse<TagCategory>>('/api/tags/category', {
    method: 'PUT',
    data,
  });
}

export async function deleteTagCategory(id: string) {
  return request<ApiResponse<void>>('/api/tags/category', {
    method: 'DELETE',
    params: { id },
  });
}

// --- Knowledge Node CRUD ---

export async function addKnowledgeNode(data: {
  name: string;
  parentId: string | null;
}) {
  return request<ApiResponse<KnowledgeNode>>('/api/tags/knowledge-node', {
    method: 'POST',
    data,
  });
}

export async function updateKnowledgeNode(data: { id: string; name: string }) {
  return request<ApiResponse<KnowledgeNode>>('/api/tags/knowledge-node', {
    method: 'PUT',
    data,
  });
}

export async function deleteKnowledgeNode(id: string) {
  return request<ApiResponse<void>>('/api/tags/knowledge-node', {
    method: 'DELETE',
    params: { id },
  });
}

// --- Question Type CRUD ---

export async function getQuestionTypeTree() {
  return request<ApiResponse<QuestionTypeNode[]>>(
    '/api/tags/question-type-tree',
    {
      method: 'GET',
    },
  );
}

export async function addQuestionTypeNode(data: {
  name: string;
  parentId: string | null;
}) {
  return request<ApiResponse<QuestionTypeNode>>(
    '/api/tags/question-type-node',
    {
      method: 'POST',
      data,
    },
  );
}

export async function updateQuestionTypeNode(data: {
  id: string;
  name: string;
}) {
  return request<ApiResponse<QuestionTypeNode>>(
    '/api/tags/question-type-node',
    {
      method: 'PUT',
      data,
    },
  );
}

export async function deleteQuestionTypeNode(id: string) {
  return request<ApiResponse<void>>('/api/tags/question-type-node', {
    method: 'DELETE',
    params: { id },
  });
}

// --- Attribute CRUD ---

export async function addAttribute(data: {
  categoryId: string;
  name: string;
  color: string;
}) {
  return request<ApiResponse<AttributeItem>>('/api/tags/attribute', {
    method: 'POST',
    data,
  });
}

export async function updateAttribute(data: {
  id: string;
  categoryId: string;
  name?: string;
  color?: string;
}) {
  return request<ApiResponse<AttributeItem>>('/api/tags/attribute', {
    method: 'PUT',
    data,
  });
}

export async function deleteAttribute(id: string, categoryId: string) {
  return request<ApiResponse<void>>('/api/tags/attribute', {
    method: 'DELETE',
    params: { id, categoryId },
  });
}

// --- Textbook ---

export async function getTextbookVersions() {
  return request<ApiResponse<TextbookVersion[]>>(
    '/api/tags/textbook-versions',
    {
      method: 'GET',
    },
  );
}

export async function getTextbookChapters(version: string) {
  return request<ApiResponse<TextbookChapter[]>>(
    '/api/tags/textbook-chapters',
    {
      method: 'GET',
      params: { version },
    },
  );
}

export async function addTextbookChapter(data: {
  name: string;
  parentId: string | null;
  version: string;
}) {
  return request<ApiResponse<TextbookChapter>>('/api/tags/textbook-chapter', {
    method: 'POST',
    data,
  });
}

export async function updateTextbookChapter(data: {
  id: string;
  name: string;
}) {
  return request<ApiResponse<TextbookChapter>>('/api/tags/textbook-chapter', {
    method: 'PUT',
    data,
  });
}

export async function deleteTextbookChapter(id: string) {
  return request<ApiResponse<void>>('/api/tags/textbook-chapter', {
    method: 'DELETE',
    params: { id },
  });
}
