// ===== 枚举 =====

export type StageKey =
  | 'quality'
  | 'dedupe'
  | 'parse'
  | 'parse-review'
  | 'tag'
  | 'tag-review'
  | 'publish'
  | 'distribute';

export type TaskStatus =
  | 'pending-human'
  | 'processing'
  | 'published'
  | 'distributed'
  | 'rejected';

export type Subject =
  | '语文'
  | '数学'
  | '英语'
  | '物理'
  | '化学'
  | '生物'
  | '历史'
  | '地理'
  | '政治';

export type Grade = '小学' | '初中' | '高中';

export type Source = '原创' | '改编' | '引用';

export type StageState = 'pending' | 'processing' | 'done' | 'rejected';

export type BucketKey =
  | 'all'
  | 'pending-human'
  | 'processing'
  | 'published'
  | 'rejected';

export type QualityVerdict = 'auto-pass' | 'mid-need-review' | 'auto-reject';

// ===== 主任务 =====

export interface StageProgress {
  state: StageState;
  startedAt?: string;
  finishedAt?: string;
  summary?: string;
}

export interface UploadTask {
  id: string;
  name: string;
  fileName: string;
  subject: Subject;
  grade: Grade;
  source: Source;
  sourceNote?: string;
  batch: string;
  totalQuestions: number;
  currentStage: StageKey;
  status: TaskStatus;
  stageProgress: Record<StageKey, StageProgress>;
  createdAt: string;
  updatedAt: string;
}

// ===== 任务下的题目 =====

export interface QualityDeduction {
  rule: string;
  points: number;
}

export interface TaskQuestion {
  id: string;
  taskId: string;
  index: number;
  stem: string;
  options?: string[];
  answer?: string;
  analysis?: string;

  qualityScore?: number;
  qualityDeductions?: QualityDeduction[];
  qualityVerdict?: QualityVerdict;
  qualityKept?: boolean;

  duplicateOf?: string;

  parseConfidence?: Partial<
    Record<'stem' | 'options' | 'answer' | 'analysis', number>
  >;
  parseReviewed?: boolean;

  tags?: {
    knowledgePoints: string[];
    questionType?: string;
    difficulty?: 1 | 2 | 3 | 4 | 5;
    cognitionLevel?: string;
  };
  tagConfidence?: Record<string, number>;
  tagReviewed?: boolean;
}

// ===== 分发配置 =====

export interface DistributeConfig {
  taskId: string;
  scope: {
    institutions: 'all' | 'partners' | 'internal';
    grades: Grade[];
    subjects: Subject[];
    roles: ('teacher' | 'student' | 'admin')[];
    validUntil?: string;
  };
  channels: ('paper-bank' | 'api' | 'export' | 'recommend')[];
  configuredAt?: string;
}

// ===== 列表响应 =====

export interface UploadTaskListResponse {
  data: UploadTask[];
  total: number;
  bucketCounts: Record<BucketKey, number>;
}

// ===== 新建任务请求体 =====

export interface CreateUploadTaskBody {
  name: string;
  fileName: string;
  subject: Subject;
  grade: Grade;
  source: Source;
  sourceNote?: string;
  batch: string;
}
