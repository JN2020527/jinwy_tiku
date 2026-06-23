import { request } from '@umijs/max';

// --- API Types ---

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type AttributeStatus = 'enabled' | 'disabled';
export type AttributeTarget = 'paper' | 'question' | 'knowledge' | 'topic';
export type AttributeOptionAddMode = 'unified' | 'bySubject';
export type AttributeSubjectScope = 'all' | 'specified';
export type AttributeFilterArea = 'primary' | 'more';
export type AttributeUsageScene =
  | 'paperUpload'
  | 'paperCardDisplay'
  | 'paperListFilter'
  | 'questionTagging'
  | 'questionCardDisplay'
  | 'questionListFilter'
  | 'knowledgeTreeNodeDisplay'
  | 'topicTreeNodeDisplay';
export type AttributeSelectionMode = 'single' | 'multiple';
export type NodeAttributeTargetType = 'knowledge' | 'topic';

export interface AttributeUsageRule {
  id: string;
  attributeId: string;
  scene: AttributeUsageScene;
  enabled: boolean;
  required?: boolean;
  filterArea?: AttributeFilterArea;
  sort: number;
}

export interface NodeAttributeRelation {
  id: string;
  targetType: NodeAttributeTargetType;
  subject: string;
  nodeId: string;
  attributeId: string;
  optionId: string;
  updatedAt?: string;
}

export interface AttributeItem {
  id: string;
  name: string;
  color?: string;
  value?: string;
  sort?: number;
  status?: AttributeStatus;
  star?: number;
  displayName?: string;
  frontVisible?: boolean;
}

export interface TagCategory {
  id: string;
  name: string;
  tags: AttributeItem[];
  code?: string;
  description?: string;
  target: AttributeTarget;
  optionAddMode?: AttributeOptionAddMode;
  subjectScope?: AttributeSubjectScope;
  applicableSubjects?: string[];
  subjectTags?: Partial<Record<string, AttributeItem[]>>;
  status?: AttributeStatus;
  frontVisible?: boolean;
  sort?: number;
  selectionMode?: AttributeSelectionMode;
}

export interface KnowledgeNode {
  id?: string;
  title: string;
  key: string;
  value?: string;
  subject?: string;
  description?: string;
  children?: KnowledgeNode[];
}

export type AnswerAreaType = 'line' | 'blank';
export type QuestionTypeAnswerCardType = 'objective' | 'subjective';

export interface QuestionTypeAnswerArea {
  type: AnswerAreaType;
  rows: number;
}

export interface QuestionTypeNode {
  title: string;
  key: string;
  subject?: string;
  description?: string;
  answerCardType?: QuestionTypeAnswerCardType;
  answerArea?: QuestionTypeAnswerArea;
  children?: QuestionTypeNode[];
}

export type TreeMovePosition = 'before' | 'after' | 'inside';
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
  subject?: string;
  targetType?: NodeAttributeTargetType;
}) {
  return request<ApiResponse<KnowledgeNode[]>>('/api/tags/knowledge-tree', {
    method: 'GET',
    params,
  });
}

// --- Tag Category CRUD ---

export async function getTagCategories() {
  return request<ApiResponse<TagCategory[]>>('/api/tags/categories', {
    method: 'GET',
  });
}

export async function addTagCategory(
  data: {
    name: string;
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
    tags?: AttributeItem[];
  } & Partial<Omit<TagCategory, 'id' | 'name' | 'tags'>>,
) {
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
  title: string;
  parentId?: string | null;
  subject: string;
  targetType?: NodeAttributeTargetType;
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
  subject?: string;
  targetType?: NodeAttributeTargetType;
  description?: string;
}) {
  return request<ApiResponse<KnowledgeNode>>('/api/tags/knowledge-node', {
    method: 'PUT',
    data,
  });
}

export async function deleteKnowledgeNode(
  id: string,
  params?: { subject?: string; targetType?: NodeAttributeTargetType },
) {
  return request<ApiResponse<void>>('/api/tags/knowledge-node', {
    method: 'DELETE',
    params: { id, ...params },
  });
}

export async function moveKnowledgeNode(data: {
  id: string;
  targetId: string;
  position: TreeMovePosition;
  subject: string;
  targetType?: NodeAttributeTargetType;
}) {
  return request<ApiResponse<void>>('/api/tags/knowledge-node/move', {
    method: 'PUT',
    data,
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
  answerCardType?: QuestionTypeAnswerCardType;
  answerArea?: QuestionTypeAnswerArea;
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
  answerCardType?: QuestionTypeAnswerCardType;
  answerArea?: QuestionTypeAnswerArea;
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
    name: string;
    subject?: string;
    color?: string;
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
    name?: string;
    subject?: string;
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
  params?: { subject?: string },
) {
  return request<ApiResponse<void>>('/api/tags/attribute', {
    method: 'DELETE',
    params: { id, categoryId, ...params },
  });
}

export async function getAttributeUsageRules() {
  return request<ApiResponse<AttributeUsageRule[]>>(
    '/api/tags/attribute-usage-rules',
    { method: 'GET' },
  );
}

export async function updateAttributeUsageRules(data: {
  rules: AttributeUsageRule[];
}) {
  return request<ApiResponse<AttributeUsageRule[]>>(
    '/api/tags/attribute-usage-rules',
    { method: 'PUT', data },
  );
}

export async function getNodeAttributeRelations(params: {
  targetType: NodeAttributeTargetType;
  subject: string;
  attributeId?: string;
}) {
  return request<ApiResponse<NodeAttributeRelation[]>>(
    '/api/tags/node-attribute-relations',
    {
      method: 'GET',
      params,
    },
  );
}

export async function setNodeAttributeRelation(data: {
  targetType: NodeAttributeTargetType;
  subject: string;
  nodeId: string;
  attributeId: string;
  optionId: string;
}) {
  return request<ApiResponse<NodeAttributeRelation>>(
    '/api/tags/node-attribute-relation',
    {
      method: 'PUT',
      data,
    },
  );
}

export async function deleteNodeAttributeRelation(params: {
  targetType: NodeAttributeTargetType;
  subject: string;
  nodeId: string;
  attributeId: string;
}) {
  return request<ApiResponse<void>>('/api/tags/node-attribute-relation', {
    method: 'DELETE',
    params,
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

export async function getTextbookChapters(version: string, subject?: string) {
  return request<ApiResponse<TextbookChapter[]>>(
    '/api/tags/textbook-chapters',
    {
      method: 'GET',
      params: { version, subject },
    },
  );
}

export async function addTextbookChapter(data: {
  title: string;
  parentId?: string | null;
  version: string;
  subject?: string;
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
  subject?: string;
  description?: string;
}) {
  return request<ApiResponse<TextbookChapter>>('/api/tags/textbook-chapter', {
    method: 'PUT',
    data,
  });
}

export async function deleteTextbookChapter(
  id: string,
  params?: { version?: string; subject?: string },
) {
  return request<ApiResponse<void>>('/api/tags/textbook-chapter', {
    method: 'DELETE',
    params: { id, ...params },
  });
}

export async function moveTextbookChapter(data: {
  id: string;
  targetId: string;
  position: TreeMovePosition;
  version: string;
  subject?: string;
}) {
  return request<ApiResponse<void>>('/api/tags/textbook-chapter/move', {
    method: 'PUT',
    data,
  });
}
