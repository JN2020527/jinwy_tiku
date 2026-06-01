import type {
  BucketKey,
  StageKey,
  TaskStatus,
  UploadTask,
} from './types';

// 8 个阶段的固定顺序，状态机推进依赖它
export const STAGE_KEYS: readonly StageKey[] = [
  'quality',
  'dedupe',
  'parse',
  'parse-review',
  'tag',
  'tag-review',
  'publish',
  'distribute',
] as const;

// 每个阶段的中文名（顶栏 Steps / 列表 Pill / 状态卡均复用）
export const STAGE_LABELS: Record<StageKey, string> = {
  quality: '质量检测',
  dedupe: '重复检测',
  parse: 'AI 解析',
  'parse-review': '解析审核',
  tag: 'AI 打标',
  'tag-review': '打标审核',
  publish: '自动发布',
  distribute: '渠道分发',
};

// 这 3 个阶段 state='processing' 时需要人工操作，其余阶段为系统态
export const HUMAN_STAGES: ReadonlySet<StageKey> = new Set<StageKey>([
  'quality',
  'parse-review',
  'tag-review',
]);

// 系统态阶段在 mock 中的模拟时长（毫秒）
export const SIMULATED_DURATION_MS: Partial<Record<StageKey, number>> = {
  dedupe: 2500,
  parse: 3500,
  tag: 3000,
  publish: 1500,
};

export function isValidStage(s: string | undefined): s is StageKey {
  return !!s && (STAGE_KEYS as readonly string[]).includes(s);
}

// status 派生纯函数：唯一事实来源是 currentStage + stageProgress[currentStage].state
export function deriveStatus(task: UploadTask): TaskStatus {
  const cur = task.currentStage;
  const state = task.stageProgress[cur].state;

  if (state === 'rejected') return 'rejected';
  if (cur === 'distribute' && state === 'done') return 'distributed';
  if (cur === 'distribute' && state === 'pending') return 'published';
  if (cur === 'distribute' && state === 'processing') return 'published';
  if (cur === 'publish' && state === 'done') return 'published';

  if (state === 'processing' && HUMAN_STAGES.has(cur)) return 'pending-human';
  if (state === 'processing') return 'processing';
  if (state === 'pending') {
    return HUMAN_STAGES.has(cur) ? 'pending-human' : 'processing';
  }
  return 'processing';
}

// 列表桶定义：5 张卡（含"全部"）
export const BUCKET_DEFS: { key: BucketKey; label: string; color: string }[] = [
  { key: 'all', label: '全部任务', color: '#6b7280' },
  { key: 'pending-human', label: '待人工处理', color: '#f59e0b' },
  { key: 'processing', label: '系统处理中', color: '#3b82f6' },
  { key: 'published', label: '已发布', color: '#22c55e' },
  { key: 'rejected', label: '已拒绝/退回', color: '#ef4444' },
];

// 一个 task 落入哪个桶（published 桶包含 published + distributed）
export function bucketOf(status: TaskStatus): Exclude<BucketKey, 'all'> {
  if (status === 'distributed') return 'published';
  return status;
}

// 取下一个 stage；distribute 是终态返回 null
export function nextStageOf(stage: StageKey): StageKey | null {
  const idx = STAGE_KEYS.indexOf(stage);
  if (idx < 0 || idx === STAGE_KEYS.length - 1) return null;
  return STAGE_KEYS[idx + 1];
}

// 进度条配色
export const STAGE_STATE_COLORS = {
  done: '#22c55e',
  processing: '#f59e0b',
  pending: '#e5e7eb',
  rejected: '#ef4444',
} as const;
