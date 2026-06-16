import { request } from '@umijs/max';

// --- API Types ---

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type AttributeStatus = 'enabled' | 'disabled';
export type AttributeTarget = 'question' | 'paper' | 'common';
export type AttributeValueType =
  | 'text'
  | 'number'
  | 'single'
  | 'multiple'
  | 'tree';
export type AttributeControlType =
  | 'input'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'rate'
  | 'treeSelect';
export type AttributeScene = 'contentCompletion' | 'tagging' | 'frontDisplay';
export type AttributeSelectionMode = 'single' | 'multiple';

export interface AttributeSceneRule {
  scene: AttributeScene;
  enabled: boolean;
  required?: boolean;
}

export interface AttributeDisplayRule {
  visible: boolean;
  filterable?: boolean;
  displayName?: string;
}

export interface AttributeItem {
  id: string;
  name: string;
  color: string;
  value?: string;
  sort?: number;
  status?: AttributeStatus;
  displayName?: string;
  frontVisible?: boolean;
  star?: number;
}

export interface TagCategory {
  id: string;
  name: string;
  tags: AttributeItem[];
  code?: string;
  description?: string;
  target?: AttributeTarget;
  valueType?: AttributeValueType;
  controlType?: AttributeControlType;
  required?: boolean;
  selectionMode?: AttributeSelectionMode;
  status?: AttributeStatus;
  sceneRules?: AttributeSceneRule[];
  displayRule?: AttributeDisplayRule;
}

export interface TagContextParams {
  grade: string;
  subject: string;
}

export interface KnowledgeNode {
  id?: string;
  title: string;
  key: string;
  value?: string;
  grade?: string;
  subject?: string;
  description?: string;
  children?: KnowledgeNode[];
}

export interface QuestionTypeNode {
  title: string;
  key: string;
  subject?: string;
  description?: string;
  children?: QuestionTypeNode[];
}

export type QuestionTypeDropPosition = 'before' | 'after';

export interface TextbookVersion {
  label: string;
  value: string;
}

export interface TextbookChapter {
  title: string;
  key: string;
  description?: string;
  children?: TextbookChapter[];
}

// --- Knowledge Tree ---

export async function getKnowledgeTree(params?: {
  grade?: string;
  subject?: string;
}) {
  return request<ApiResponse<KnowledgeNode[]>>('/api/tags/knowledge-tree', {
    method: 'GET',
    params,
  });
}

// --- Tag Category CRUD ---

export async function getTagCategories(params: TagContextParams) {
  return request<ApiResponse<TagCategory[]>>('/api/tags/categories', {
    method: 'GET',
    params,
  });
}

export async function addTagCategory(
  data: {
    name: string;
    grade: string;
    subject: string;
    tags?: AttributeItem[];
  } & Partial<Omit<TagCategory, 'id' | 'name' | 'tags'>>,
) {
  return request<ApiResponse<TagCategory>>('/api/tags/category', {
    method: 'POST',
    data,
  });
}

export async function updateTagCategory(
  data: {
    id: string;
    name: string;
    grade: string;
    subject: string;
    tags?: AttributeItem[];
  } & Partial<Omit<TagCategory, 'id' | 'name' | 'tags'>>,
) {
  return request<ApiResponse<TagCategory>>('/api/tags/category', {
    method: 'PUT',
    data,
  });
}

export async function deleteTagCategory(id: string, params: TagContextParams) {
  return request<ApiResponse<void>>('/api/tags/category', {
    method: 'DELETE',
    params: { id, ...params },
  });
}

// --- Knowledge Node CRUD ---

export async function addKnowledgeNode(data: {
  title: string;
  parentId?: string | null;
  grade: string;
  subject: string;
  description?: string;
}) {
  return request<ApiResponse<KnowledgeNode>>('/api/tags/knowledge-node', {
    method: 'POST',
    data,
  });
}

export async function updateKnowledgeNode(data: {
  id: string;
  title: string;
  grade?: string;
  subject?: string;
  description?: string;
}) {
  return request<ApiResponse<KnowledgeNode>>('/api/tags/knowledge-node', {
    method: 'PUT',
    data,
  });
}

export async function deleteKnowledgeNode(
  id: string,
  params?: { grade?: string; subject?: string },
) {
  return request<ApiResponse<void>>('/api/tags/knowledge-node', {
    method: 'DELETE',
    params: { id, ...params },
  });
}

// --- Question Type CRUD ---

export async function getQuestionTypeTree(params?: { subject?: string }) {
  return request<ApiResponse<QuestionTypeNode[]>>(
    '/api/tags/question-type-tree',
    {
      method: 'GET',
      params,
    },
  );
}

export async function addQuestionTypeNode(data: {
  title: string;
  parentId?: string | null;
  subject: string;
  description?: string;
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
  title: string;
  subject?: string;
  description?: string;
}) {
  return request<ApiResponse<QuestionTypeNode>>(
    '/api/tags/question-type-node',
    {
      method: 'PUT',
      data,
    },
  );
}

export async function deleteQuestionTypeNode(
  id: string,
  params?: { subject?: string },
) {
  return request<ApiResponse<void>>('/api/tags/question-type-node', {
    method: 'DELETE',
    params: { id, ...params },
  });
}

export async function moveQuestionTypeNode(data: {
  id: string;
  targetId: string;
  position: QuestionTypeDropPosition;
  subject: string;
}) {
  return request<ApiResponse<void>>('/api/tags/question-type-node/move', {
    method: 'PUT',
    data,
  });
}

// --- Attribute CRUD ---

export async function addAttribute(
  data: {
    categoryId: string;
    grade: string;
    subject: string;
    name: string;
    color: string;
  } & Partial<Omit<AttributeItem, 'id' | 'name' | 'color'>>,
) {
  return request<ApiResponse<AttributeItem>>('/api/tags/attribute', {
    method: 'POST',
    data,
  });
}

export async function updateAttribute(
  data: {
    id: string;
    categoryId: string;
    grade: string;
    subject: string;
    name?: string;
    color?: string;
  } & Partial<Omit<AttributeItem, 'id' | 'name' | 'color'>>,
) {
  return request<ApiResponse<AttributeItem>>('/api/tags/attribute', {
    method: 'PUT',
    data,
  });
}

export async function deleteAttribute(
  id: string,
  categoryId: string,
  params: TagContextParams,
) {
  return request<ApiResponse<void>>('/api/tags/attribute', {
    method: 'DELETE',
    params: { id, categoryId, ...params },
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
  title: string;
  parentId?: string | null;
  version: string;
  description?: string;
}) {
  return request<ApiResponse<TextbookChapter>>('/api/tags/textbook-chapter', {
    method: 'POST',
    data,
  });
}

export async function updateTextbookChapter(data: {
  id: string;
  title: string;
  version?: string;
  description?: string;
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
