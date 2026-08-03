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
/** 树面板可实例化的树类型：知识点树 / 专题树 / 复习树 */
export type TreeTargetType = NodeAttributeTargetType | 'review';

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

// --- Assets (资产中心正式资源) ---

/** 附件型资源：课件、拓展包（在资产中心逐个上传） */
export type AttachmentResourceType = 'courseware' | 'extension';
/** 组合型资源：学案、作业（仅由组合制作发布） */
export type ComposedResourceType = 'studyGuide' | 'homework';
export type ResourceType = AttachmentResourceType | ComposedResourceType;

/** 附件载体由原始文件名扩展名自动识别，不能由调用方指定 */
export type AttachmentCarrierType = 'ppt' | 'pdf' | 'audio' | 'video';
export type ResourceCarrierType = AttachmentCarrierType | 'online';
export type ResourceStatus = 'unlisted' | 'listed' | 'archived';

export const ATTACHMENT_RESOURCE_TYPES: readonly AttachmentResourceType[] = [
  'courseware',
  'extension',
];
export const COMPOSED_RESOURCE_TYPES: readonly ComposedResourceType[] = [
  'studyGuide',
  'homework',
];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  courseware: '课件',
  extension: '拓展包',
  studyGuide: '学案',
  homework: '作业',
};

export const RESOURCE_CARRIER_LABELS: Record<ResourceCarrierType, string> = {
  ppt: 'PPT',
  pdf: 'PDF',
  audio: '音频',
  video: '视频',
  online: '在线组合内容',
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  unlisted: '未上架',
  listed: '已上架',
  archived: '已归档',
};

export const ATTACHMENT_RESOURCE_ACCEPT: Record<
  AttachmentResourceType,
  string
> = {
  courseware: '.ppt,.pptx',
  extension: '.pdf,.mp3,.mp4',
};

export const isAttachmentResourceType = (
  type: unknown,
): type is AttachmentResourceType =>
  type === 'courseware' || type === 'extension';

export const isComposedResourceType = (type: ResourceType): boolean =>
  COMPOSED_RESOURCE_TYPES.includes(type as ComposedResourceType);

export const inferAttachmentCarrierType = (
  originalFileName: string,
): AttachmentCarrierType | null => {
  const extension = originalFileName
    .trim()
    .toLowerCase()
    .match(/\.[^.\\/]+$/)?.[0];
  if (extension === '.ppt' || extension === '.pptx') return 'ppt';
  if (extension === '.pdf') return 'pdf';
  if (extension === '.mp3') return 'audio';
  if (extension === '.mp4') return 'video';
  return null;
};

export const isAttachmentFileCompatible = (
  type: AttachmentResourceType,
  originalFileName: string,
): boolean => {
  const carrierType = inferAttachmentCarrierType(originalFileName);
  return type === 'courseware'
    ? carrierType === 'ppt'
    : carrierType === 'pdf' ||
        carrierType === 'audio' ||
        carrierType === 'video';
};

export const getDefaultResourceName = (originalFileName: string): string => {
  const normalizedFileName = originalFileName.trim();
  return normalizedFileName.replace(/\.[^.\\/]+$/, '').trim();
};

export interface ResourceVersion {
  readonly id: string;
  readonly resourceId: string;
  readonly versionNumber: number;
  readonly carrierType: ResourceCarrierType;
  readonly originalFileName?: string;
  readonly createdAt: string;
}

/** 资产中心的一行代表一份逻辑资源，资源类型与当前版本由服务端维护 */
export interface ResourceItem {
  readonly id: string;
  name: string;
  readonly type: ResourceType;
  /** 学科由所属复习树节点继承，不提供独立修改入口 */
  readonly subject: string;
  /** 唯一所属复习树末级节点 */
  nodeId: string;
  status: ResourceStatus;
  readonly currentVersionId: string;
  readonly currentVersion: ResourceVersion;
  updatedAt: string;
}

/** 强归属附件创建命令：一个兼容文件原子创建逻辑资源、V1 与节点归属 */
export interface CreateAttachmentResourceInput {
  name: string;
  type: AttachmentResourceType;
  originalFileName: string;
  nodeId: string;
  subject: string;
}

/** 类型、学科与版本均不可通过资料编辑接口修改 */
export interface UpdateResourceMetadataInput {
  id: string;
  name: string;
  nodeId: string;
  subject: string;
}

/** 树导入载荷中的节点（不含 key/id，由后端重建） */
export interface ImportTreeNode {
  title: string;
  description?: string;
  children?: ImportTreeNode[];
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
  targetType?: TreeTargetType;
}) {
  return request<ApiResponse<KnowledgeNode[]>>('/api/tags/knowledge-tree', {
    method: 'GET',
    params,
  });
}

/** 清空重建导入：以模板树替换当前学科 + 体系下的整棵树 */
export async function importKnowledgeTree(data: {
  subject: string;
  targetType?: TreeTargetType;
  nodes: ImportTreeNode[];
}) {
  return request<ApiResponse<{ count: number }>>(
    '/api/tags/knowledge-tree/import',
    {
      method: 'POST',
      data,
    },
  );
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
  targetType?: TreeTargetType;
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
  targetType?: TreeTargetType;
  description?: string;
}) {
  return request<ApiResponse<KnowledgeNode>>('/api/tags/knowledge-node', {
    method: 'PUT',
    data,
  });
}

export async function deleteKnowledgeNode(
  id: string,
  params?: { subject?: string; targetType?: TreeTargetType },
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
  targetType?: TreeTargetType;
}) {
  return request<ApiResponse<void>>('/api/tags/knowledge-node/move', {
    method: 'PUT',
    data,
  });
}

// --- Asset Center (资产中心) ---

export async function getResourceList(params: { subject: string }) {
  return request<ApiResponse<ResourceItem[]>>('/api/resources', {
    method: 'GET',
    params,
  });
}

export async function createAttachmentResource(
  data: CreateAttachmentResourceInput,
) {
  return request<ApiResponse<ResourceItem>>('/api/resources', {
    method: 'POST',
    data,
  });
}

export async function updateResourceMetadata(
  data: UpdateResourceMetadataInput,
) {
  return request<ApiResponse<ResourceItem>>('/api/resources', {
    method: 'PUT',
    data,
  });
}

export async function deleteResource(id: string, params: { subject: string }) {
  return request<ApiResponse<void>>('/api/resources', {
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
