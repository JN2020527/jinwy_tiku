import { request } from '@umijs/max';
import type {
  ResourceDeletionResult,
  ResourceOperationRecord,
} from './resourceAuditModel';
import type {
  AttachmentResourceType,
  ResourceCarrierType,
  ResourceStatus,
  ResourceType,
  ResourceVersionForType,
  ResourceVersionState,
} from './resourceModel';

export {
  assertValidFormalResourceVersionAggregate,
  ATTACHMENT_RESOURCE_TYPES,
  COMPOSED_RESOURCE_TYPES,
  inferAttachmentCarrierType,
  isAttachmentFileCompatible,
  isAttachmentResourceType,
  isComposedResourceType,
  isResourceCarrierCompatible,
  isResourceCarrierType,
  isResourceType,
  isResourceVersionCompatible,
  RESOURCE_CARRIERS_BY_TYPE,
  validateFormalResourceVersion,
  validateFormalResourceVersionAggregate,
} from './resourceModel';
export {
  RESOURCE_HAS_REFERENCES_CODE,
  RESOURCE_OPERATION_ACTION_LABELS,
} from './resourceAuditModel';
export type {
  ResourceDeletionResult,
  ResourceOperationAction,
  ResourceOperationChange,
  ResourceOperationRecord,
} from './resourceAuditModel';
export type {
  AttachmentCarrierType,
  AttachmentResourceType,
  AttachmentResourceVersion,
  ComposedCarrierType,
  ComposedResourceType,
  CoursewareCarrierType,
  CoursewareResourceVersion,
  ExtensionCarrierType,
  ExtensionResourceVersion,
  OnlineResourceVersion,
  ResourceCarrierByType,
  ResourceCarrierForType,
  ResourceCarrierType,
  ResourceCreator,
  ResourceInvariantValidationResult,
  ResourceStatus,
  ResourceType,
  ResourceVersion,
  ResourceVersionForType,
  ResourceVersionState,
} from './resourceModel';

// --- API Types ---

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  code?: string;
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

/** 资源类型、载体与正式版本结构由 resourceModel.ts 统一约束。 */
export type ResourceLifecycleAction = 'list' | 'unlist' | 'archive' | 'restore';

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

export const RESOURCE_VERSION_STATE_LABELS: Record<
  ResourceVersionState,
  string
> = {
  current: '当前生效',
  pending: '待生效',
  historical: '历史版本',
};

export const RESOURCE_NAME_CONFLICT_CODE = 'RESOURCE_NAME_CONFLICT';

export const RESOURCE_LIFECYCLE_ACTION_LABELS: Record<
  ResourceLifecycleAction,
  string
> = {
  list: '上架',
  unlist: '下架',
  archive: '归档',
  restore: '恢复',
};

/** 归档恢复到未上架，需再次上架后才会重新对前台可见。 */
export const RESOURCE_LIFECYCLE_TRANSITIONS: Record<
  ResourceStatus,
  Partial<Record<ResourceLifecycleAction, ResourceStatus>>
> = {
  unlisted: { list: 'listed', archive: 'archived' },
  listed: { unlist: 'unlisted', archive: 'archived' },
  archived: { restore: 'unlisted' },
};

export const ATTACHMENT_RESOURCE_ACCEPT: Record<
  AttachmentResourceType,
  string
> = {
  courseware: '.ppt,.pptx',
  extension: '.pdf,.mp3,.mp4',
};

export const getDefaultResourceName = (originalFileName: string): string => {
  const normalizedFileName = originalFileName.trim();
  return normalizedFileName.replace(/\.[^.\\/]+$/, '').trim();
};

interface ResourceItemFields<T extends ResourceType> {
  readonly id: string;
  readonly name: string;
  readonly type: T;
  /** 学科由所属复习树节点继承，不提供独立修改入口 */
  readonly subject: string;
  /** 唯一所属复习树末级节点；响应不保存节点路径文本快照 */
  readonly nodeId: string;
  readonly status: ResourceStatus;
  /** 仅已上架资源对前台可见并允许产生新的业务引用。 */
  readonly isVisible: boolean;
  readonly canCreateReference: boolean;
  /** 已有业务对象对该逻辑资源具体版本的引用总数。 */
  readonly referenceCount: number;
  /** 服务端按引用存储实时计算；删除接口仍会再次校验，不能由调用方覆盖。 */
  readonly canDelete: boolean;
  /** 有固定版本引用时给出可直接展示的删除阻止原因。 */
  readonly hardDeleteBlockedReason: string | null;
  readonly currentVersionId: string;
  readonly currentVersion: ResourceVersionForType<T>;
  readonly versionCount: number;
  readonly pendingVersionCount: number;
  readonly updatedAt: string;
}

/** 资产中心的一行代表一份逻辑资源，类型与当前版本载体保持静态关联。 */
export type ResourceItem = {
  [T in ResourceType]: ResourceItemFields<T>;
}[ResourceType];

/** 详情返回完整版本历史，且每个版本都必须符合该资源类型的载体约束。 */
export type ResourceDetail = {
  [T in ResourceType]: ResourceItemFields<T> & {
    readonly versions: readonly ResourceVersionForType<T>[];
    /** 独立只追加账本按发生时间倒序返回；客户端没有修改或删除契约。 */
    readonly operationRecords: readonly ResourceOperationRecord[];
  };
}[ResourceType];

/** 单学科资产目录查询；所有可选条件按 AND 组合 */
export interface ResourceListParams {
  subject: string;
  name?: string;
  type?: ResourceType;
  carrierType?: ResourceCarrierType;
  status?: ResourceStatus;
  /** 允许父节点，服务端按该节点的整棵子树聚合 */
  nodeId?: string;
}

/** 强归属附件创建命令：一个兼容文件原子创建逻辑资源、V1 与节点归属 */
export interface CreateAttachmentResourceInput {
  name: string;
  type: AttachmentResourceType;
  originalFileName: string;
  nodeId: string;
  subject: string;
}

/** 新文件原子追加为待生效版本；已归档资源同步恢复为未上架。 */
export interface CreateAttachmentResourceVersionInput {
  resourceId: string;
  subject: string;
  originalFileName: string;
}

/** 任意非当前版本均可直接切换为当前版本，不复制或删除版本记录。 */
export interface ActivateResourceVersionInput {
  resourceId: string;
  versionId: string;
  subject: string;
}

/** 类型、学科、版本与归属均不可通过资料编辑接口修改 */
export interface UpdateResourceMetadataInput {
  id: string;
  name: string;
  subject: string;
}

/** 同学科末级节点间的原子归属调整命令，不存在空目标语义 */
export interface AdjustResourceOwnershipInput {
  id: string;
  subject: string;
  targetNodeId: string;
}

/** 生命周期只接受动作命令，不能通过资料编辑直接写入任意状态。 */
export interface TransitionResourceLifecycleInput {
  id: string;
  subject: string;
  action: ResourceLifecycleAction;
}

/** 树导入载荷中的节点（不含 key/id，由后端重建） */
export interface ImportTreeNode {
  title: string;
  description?: string;
  children?: ImportTreeNode[];
}

/** 树结构变更影响的正式资源；scope 为空时表示当前学科整棵复习树 */
export interface TreeMutationResult {
  affectedResourceCount: number;
  resourceScopeNodeId?: string;
}

export interface ImportTreeResult extends TreeMutationResult {
  count: number;
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
  return request<ApiResponse<ImportTreeResult>>(
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
  return request<ApiResponse<TreeMutationResult>>('/api/tags/knowledge-node', {
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
  return request<ApiResponse<TreeMutationResult>>('/api/tags/knowledge-node', {
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
  return request<ApiResponse<TreeMutationResult>>(
    '/api/tags/knowledge-node/move',
    {
      method: 'PUT',
      data,
    },
  );
}

// --- Asset Center (资产中心) ---

export async function getResourceList(params: ResourceListParams) {
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

export async function getResourceDetail(params: {
  id: string;
  subject: string;
}) {
  return request<ApiResponse<ResourceDetail>>('/api/resources/detail', {
    method: 'GET',
    params,
  });
}

/** 独立查询只追加操作账本；资源彻底删除后仍可用于删除记录探针。 */
export async function getResourceOperationRecords(params: {
  id: string;
  subject: string;
}) {
  return request<ApiResponse<ResourceOperationRecord[]>>(
    '/api/resources/operations',
    { method: 'GET', params },
  );
}

export async function createAttachmentResourceVersion(
  data: CreateAttachmentResourceVersionInput,
) {
  return request<ApiResponse<ResourceDetail>>('/api/resources/versions', {
    method: 'POST',
    data,
  });
}

export async function activateResourceVersion(
  data: ActivateResourceVersionInput,
) {
  return request<ApiResponse<ResourceDetail>>(
    '/api/resources/versions/activate',
    {
      method: 'PUT',
      data,
    },
  );
}

export async function updateResourceMetadata(
  data: UpdateResourceMetadataInput,
) {
  return request<ApiResponse<ResourceItem>>('/api/resources', {
    method: 'PUT',
    data,
  });
}

export async function adjustResourceOwnership(
  data: AdjustResourceOwnershipInput,
) {
  return request<ApiResponse<ResourceItem>>('/api/resources/ownership', {
    method: 'PUT',
    data,
  });
}

export async function transitionResourceLifecycle(
  data: TransitionResourceLifecycleInput,
) {
  return request<ApiResponse<ResourceItem>>('/api/resources/lifecycle', {
    method: 'PUT',
    data,
  });
}

export async function deleteResource(id: string, params: { subject: string }) {
  return request<ApiResponse<ResourceDeletionResult>>('/api/resources', {
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
