import { request } from '@umijs/max';
import type {
  SubjectColumnLevel,
  SubjectLevelCodeRule,
} from './subjectColumns';

export type AssetType =
  | 'studyGuide'
  | 'homework'
  | 'word'
  | 'ppt'
  | 'audio'
  | 'video';
export type AssetStatus = 'draft' | 'formal';
export type AttachmentType = Exclude<AssetType, 'studyGuide' | 'homework'>;
export type KnowledgeBlockType =
  | 'single'
  | 'comprehensive'
  | 'method'
  | 'example';
export type ContentBlockKind = 'columnContent' | KnowledgeBlockType;
export type StructureLevel = 'level1' | 'level2' | 'level3' | 'level4';

export interface ExampleKnowledgeContent {
  stemHtml: string;
  guideHtml: string;
  answerHtml: string;
}

export interface ApiResult<T> {
  success: boolean;
  message: string;
  data: T;
  code?: string;
}

export interface ImpactCounts {
  mountCount: number;
  platformTemplateCount: number;
  teacherTaskCount: number;
}

export interface AssetItem extends ImpactCounts {
  id: string;
  subject: string;
  type: AssetType;
  status: AssetStatus;
  name: string;
  originalFileName?: string;
  updatedAt: string;
  source: 'upload' | 'online' | 'seed';
}

export interface KnowledgeLeaf {
  id: string;
  title: string;
  path: string[];
}

export interface KnowledgeTreeNode {
  key: string;
  title: string;
  description?: string;
  children?: KnowledgeTreeNode[];
}

export interface RegisteredColumn {
  id: string;
  name: string;
  type: 'knowledge' | 'question';
  applicableLevels: SubjectColumnLevel[];
  dataSource: 'custom' | 'knowledgeTree';
}

export interface StudyGuideStructureNode {
  id: string;
  level: StructureLevel;
  label: string;
  referenceId?: string;
  temporaryName?: string;
  knowledgeNodeId?: string;
  children: StudyGuideStructureNode[];
}

export interface StudyGuideContentBlock {
  id: string;
  kind: ContentBlockKind;
  structureNodeId: string;
  html: string;
  exampleContent?: ExampleKnowledgeContent;
  knowledgeNodeIds: string[];
  knowledgeBlockId?: string;
  currentKnowledgeScope?: string[];
}

export interface StudyGuideDetail extends AssetItem {
  type: 'studyGuide';
  structure: StudyGuideStructureNode[];
  contentBlocks: StudyGuideContentBlock[];
  skippedColumns: string[];
  autosaveState?: 'saved' | 'saving' | 'failed';
}

export interface HomeworkDetail extends AssetItem {
  type: 'homework';
  questionIds: string[];
}

export type QuestionStatus = 'published' | 'unpublished' | 'offline';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  label: string;
  text: string;
}

export interface PublishedQuestion {
  id: string;
  subject: string;
  knowledgeNodeIds: string[];
  status: QuestionStatus;
  source: string;
  type: string;
  difficulty: QuestionDifficulty;
  year: string;
  stem: string;
  options?: QuestionOption[];
  answer: string;
  explanation: string;
  updatedAt: string;
  popularity: number;
}

export interface HomeworkQuestionItem {
  questionId: string;
  question?: PublishedQuestion;
}

export interface PublishedQuestionPage {
  list: PublishedQuestion[];
  total: number;
  current: number;
  pageSize: number;
}

export interface PublishedQuestionQuery {
  subject: string;
  keyword?: string;
  type?: string;
  difficulty?: QuestionDifficulty;
  year?: string;
  knowledgeNodeId?: string;
  sort?: 'latest' | 'popular';
  current?: number;
  pageSize?: number;
}

export interface KnowledgeBlock {
  id: string;
  subject: string;
  type: KnowledgeBlockType;
  html: string;
  exampleContent?: ExampleKnowledgeContent;
  knowledgeNodeIds: string[];
  referenceStudyGuides: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface AssetListParams {
  subject: string;
  keyword?: string;
  type?: AssetType;
  status?: AssetStatus;
}

export async function getAssetList(params: AssetListParams) {
  return request<ApiResult<AssetItem[]>>('/api/resource-assets', {
    method: 'GET',
    params,
  });
}

export async function getAssetDetail(params: { id: string; subject: string }) {
  return request<ApiResult<AssetItem | StudyGuideDetail | HomeworkDetail>>(
    '/api/resource-assets/detail',
    { method: 'GET', params },
  );
}

export async function createOnlineStudyGuide(data: {
  subject: string;
  name: string;
  structure: StudyGuideStructureNode[];
  contentBlocks: StudyGuideContentBlock[];
}) {
  return request<ApiResult<StudyGuideDetail>>(
    '/api/resource-assets/study-guide/online',
    { method: 'POST', data },
  );
}

export async function updateOnlineStudyGuideDraft(data: {
  id: string;
  subject: string;
  name: string;
  structure: StudyGuideStructureNode[];
  contentBlocks: StudyGuideContentBlock[];
}) {
  return request<ApiResult<StudyGuideDetail>>(
    '/api/resource-assets/study-guide/online',
    { method: 'PUT', data },
  );
}

export async function publishOnlineStudyGuide(data: {
  id?: string;
  subject: string;
  name: string;
  structure: StudyGuideStructureNode[];
  contentBlocks: StudyGuideContentBlock[];
}) {
  return request<ApiResult<StudyGuideDetail>>(
    '/api/resource-assets/study-guide/formal',
    { method: 'POST', data },
  );
}

export async function updateFormalStudyGuide(data: {
  id: string;
  subject: string;
  structure: StudyGuideStructureNode[];
  contentBlocks: StudyGuideContentBlock[];
  simulateFailure?: boolean;
}) {
  return request<ApiResult<StudyGuideDetail>>(
    '/api/resource-assets/study-guide/formal',
    { method: 'PUT', data },
  );
}

export async function createAttachment(data: {
  subject: string;
  name: string;
  originalFileName: string;
}) {
  return request<ApiResult<AssetItem>>('/api/resource-assets/attachment', {
    method: 'POST',
    data,
  });
}

export async function updateAssetName(data: {
  id: string;
  subject: string;
  name: string;
}) {
  return request<ApiResult<AssetItem>>('/api/resource-assets/name', {
    method: 'PUT',
    data,
  });
}

export async function replaceAttachment(data: {
  id: string;
  subject: string;
  originalFileName: string;
}) {
  return request<ApiResult<AssetItem>>('/api/resource-assets/attachment/file', {
    method: 'PUT',
    data,
  });
}

export async function deleteAsset(params: { id: string; subject: string }) {
  return request<ApiResult<void>>('/api/resource-assets', {
    method: 'DELETE',
    params,
  });
}

export async function getPublishedQuestions(params: PublishedQuestionQuery) {
  return request<ApiResult<PublishedQuestionPage>>(
    '/api/resource-assets/questions',
    { method: 'GET', params },
  );
}

export async function getHomeworkQuestions(params: {
  id: string;
  subject: string;
}) {
  return request<ApiResult<HomeworkQuestionItem[]>>(
    '/api/resource-assets/homework/questions',
    { method: 'GET', params },
  );
}

export async function saveHomework(data: {
  id?: string;
  subject: string;
  name: string;
  questionIds: string[];
}) {
  return request<ApiResult<HomeworkDetail>>('/api/resource-assets/homework', {
    method: data.id ? 'PUT' : 'POST',
    data,
  });
}

export async function getKnowledgeBlocks(params: {
  subject: string;
  keyword?: string;
  type?: KnowledgeBlockType;
  knowledgeNodeId?: string;
}) {
  return request<ApiResult<KnowledgeBlock[]>>(
    '/api/resource-assets/knowledge-blocks',
    {
      method: 'GET',
      params,
    },
  );
}

export async function saveKnowledgeBlock(data: {
  id?: string;
  subject: string;
  type: KnowledgeBlockType;
  html: string;
  exampleContent?: ExampleKnowledgeContent;
  knowledgeNodeIds: string[];
}) {
  return request<ApiResult<KnowledgeBlock>>(
    '/api/resource-assets/knowledge-block',
    {
      method: data.id ? 'PUT' : 'POST',
      data,
    },
  );
}

export async function deleteKnowledgeBlock(params: {
  id: string;
  subject: string;
}) {
  return request<ApiResult<void>>('/api/resource-assets/knowledge-block', {
    method: 'DELETE',
    params,
  });
}

export async function getResourceAssetContext(params: { subject: string }) {
  return request<
    ApiResult<{
      knowledgeTree: KnowledgeTreeNode[];
      knowledgeLeaves: KnowledgeLeaf[];
      columns: RegisteredColumn[];
      levelCodeRules: SubjectLevelCodeRule[];
    }>
  >('/api/resource-assets/context', { method: 'GET', params });
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  studyGuide: '学案',
  homework: '作业',
  word: 'Word',
  ppt: 'PPT',
  audio: '音频',
  video: '视频',
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  draft: '草稿',
  formal: '正式',
};

export const KNOWLEDGE_BLOCK_TYPE_LABELS: Record<KnowledgeBlockType, string> = {
  single: '单一类',
  comprehensive: '综合类',
  method: '方法类',
  example: '例题类',
};

export const ATTACHMENT_ACCEPT = '.docx,.ppt,.pptx,.mp3,.wav,.mp4';
export const getAttachmentType = (fileName: string): AttachmentType | null => {
  const extension = fileName.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (extension === '.docx') return 'word';
  if (extension === '.ppt' || extension === '.pptx') return 'ppt';
  if (extension === '.mp3' || extension === '.wav') return 'audio';
  if (extension === '.mp4') return 'video';
  return null;
};

export const getNameWithoutExtension = (fileName: string) =>
  fileName.replace(/\.[^.\\/]+$/, '').trim();
