# 试题上传全流程流水线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有"题库任务"页位置交付一个 8 阶段的试题上传流水线纯前端原型：列表 + 状态桶 + 流水线进度 + 二级路由全屏工作区 + 服务端 mock 状态机。

**Architecture:** 5 张状态桶汇总卡 + ProTable 列表 + 8 段流水线进度条；每个任务点击进入二级全屏路由 `/question-bank/upload/:taskId/:stage`，其中 8 个阶段薄壳复用 3 套工作区模板（批量审核 / 三栏逐题精审 / 分发配置）+ 1 套系统态卡片。状态机 + 样本数据全部位于 `mock/uploadTask.ts`；service 层是唯一 API 边界。

**Tech Stack:** Umi Max 4 · React 18 · TypeScript · Ant Design 5 · Pro Components · wangEditor 5（已存在，本次不引入）· `@umijs/max` 的 `useRequest` / `request` · DOMPurify (`src/utils/sanitize.ts` 已有)。

**Spec source:** `docs/superpowers/specs/2026-06-01-upload-pipeline-design.md`

**Testing note:** 本项目无单测框架（`package.json` 没有 `test` 脚本，参考 CLAUDE.md）。因此 TDD 的 RED/GREEN 循环替换为：每一步实现后跑 `npx tsc --noEmit`（类型层失败 = RED；通过 = GREEN），关键 UI 步骤另跑 `npm run dev` 在浏览器中观察行为。所有 mock 写操作请通过浏览器 devtools 的 `fetch()` 验证。

**Implementation phases:**

- **Phase 1 — 地基契约**（Task 1-4）：冻结 `types.ts` / `constants.ts` / service 函数签名 / 路由配置 / 老 `QuestionBankTask` 模块的删除。
- **Phase 2 — Mock + Service 状态机**（Task 5-9）：`mock/uploadTask.ts` 内存状态机 + 10 个样本任务 + 全部 8 阶段路由；service 层加 `unwrap` 让调用方直接拿到 `T`。
- **Phase 3 — 列表页**（Task 10-13）：5 张汇总卡 + 8 段进度条 + 新建任务弹窗 + ProTable 主页。
- **Phase 4 — 工作区模板 + 键盘 Hook**（Task 14-18）：抽取 `useQuestionNavKeyboard`、3 套工作区组件 + 系统态卡。
- **Phase 5 — Stage 路由组装**（Task 19-21）：StageHeader、Stage/index.tsx 入口与 readOnly 守卫、8 个阶段薄壳。

**Out of scope（与 spec §"不在本次范围"对齐）:** OCR / API 上传路径、版本管理、权限分科目、AI 阈值后台、并发冲突处理。

---


## Phase 1 — 地基契约（必须先落地）

> 这一阶段把类型 / 枚举 / service 函数签名 / 路由配置 / 老代码清理全部冻结。后面所有任务都会引用这里定下的精确名字、文件路径和方法签名——读到不一致请回这里查证。


### Task 1: 新建 `types.ts`（数据模型集中所在）

**Files:**
- Create: `src/pages/UploadTask/types.ts`

- [ ] **Step 1: 创建文件 `src/pages/UploadTask/types.ts`**

```typescript
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
  | '语文' | '数学' | '英语' | '物理' | '化学'
  | '生物' | '历史' | '地理' | '政治';

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
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS（仅本文件无任何引用方，应直接通过）

- [ ] **Step 3: 提交**

```bash
git add src/pages/UploadTask/types.ts
git commit -m "feat(UploadTask): add upload pipeline type definitions"
```

---

### Task 2: 新建 `constants.ts`（阶段枚举 + 派生函数 + 桶定义）

**Files:**
- Create: `src/pages/UploadTask/constants.ts`

- [ ] **Step 1: 创建文件 `src/pages/UploadTask/constants.ts`**

```typescript
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
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/pages/UploadTask/constants.ts
git commit -m "feat(UploadTask): add stage constants and deriveStatus"
```

---

### Task 3: 新建 service 层骨架（`src/services/uploadTask.ts`）

> service 函数签名在这里冻结，所有 Phase 2+ 都按这套调用。

**Files:**
- Create: `src/services/uploadTask.ts`

- [ ] **Step 1: 创建文件 `src/services/uploadTask.ts`**

```typescript
import { request } from '@umijs/max';
import type { ApiResponse } from './tagSystem';
import type {
  CreateUploadTaskBody,
  DistributeConfig,
  StageKey,
  TaskQuestion,
  UploadTask,
  UploadTaskListResponse,
} from '@/pages/UploadTask/types';

export interface UploadTaskQueryParams {
  current?: number;
  pageSize?: number;
  status?: string;
}

// ----- 任务列表 / 详情 / 创建 -----

export async function getUploadTasks(params: UploadTaskQueryParams) {
  return request<ApiResponse<UploadTaskListResponse>>(
    '/api/upload-task/list',
    { method: 'GET', params },
  );
}

export async function getUploadTask(id: string) {
  return request<ApiResponse<UploadTask>>(`/api/upload-task/${id}`, {
    method: 'GET',
  });
}

export async function createUploadTask(body: CreateUploadTaskBody) {
  return request<ApiResponse<UploadTask>>('/api/upload-task/create', {
    method: 'POST',
    data: body,
  });
}

// ----- 阶段共用 -----

export async function getStageQuestions(taskId: string, stage: StageKey) {
  return request<ApiResponse<TaskQuestion[]>>(
    `/api/upload-task/${taskId}/stage/${stage}/questions`,
    { method: 'GET' },
  );
}

// ----- 质量检测 -----

export async function confirmQualityKeep(taskId: string, questionIds: string[]) {
  return request<ApiResponse<void>>('/api/upload-task/quality/keep', {
    method: 'POST',
    data: { taskId, questionIds },
  });
}

export async function confirmQualityReject(
  taskId: string,
  questionIds: string[],
  reason: string,
) {
  return request<ApiResponse<void>>('/api/upload-task/quality/reject', {
    method: 'POST',
    data: { taskId, questionIds, reason },
  });
}

// ----- 解析审核 -----

export async function updateParsedFields(
  taskId: string,
  questionId: string,
  patch: Partial<TaskQuestion>,
) {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/parse-review/update',
    { method: 'POST', data: { taskId, questionId, patch } },
  );
}

export async function regenerateParse(taskId: string, questionId: string) {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/parse-review/regenerate',
    { method: 'POST', data: { taskId, questionId } },
  );
}

export async function confirmParseReview(taskId: string, questionIds: string[]) {
  return request<ApiResponse<void>>(
    '/api/upload-task/parse-review/confirm',
    { method: 'POST', data: { taskId, questionIds } },
  );
}

// ----- 打标审核 -----

export async function updateTags(
  taskId: string,
  questionId: string,
  tags: NonNullable<TaskQuestion['tags']>,
) {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/tag-review/update',
    { method: 'POST', data: { taskId, questionId, tags } },
  );
}

export async function regenerateTags(taskId: string, questionId: string) {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/tag-review/regenerate',
    { method: 'POST', data: { taskId, questionId } },
  );
}

export async function confirmTagReview(taskId: string, questionIds: string[]) {
  return request<ApiResponse<void>>(
    '/api/upload-task/tag-review/confirm',
    { method: 'POST', data: { taskId, questionIds } },
  );
}

// ----- 系统态阶段 -----

export async function advanceSystemStage(taskId: string, stage: StageKey) {
  return request<ApiResponse<UploadTask>>('/api/upload-task/advance', {
    method: 'POST',
    data: { taskId, stage },
  });
}

// ----- 渠道分发 -----

export async function getDistributeConfig(taskId: string) {
  return request<ApiResponse<DistributeConfig | null>>(
    `/api/upload-task/${taskId}/distribute`,
    { method: 'GET' },
  );
}

export async function saveDistributeConfig(config: DistributeConfig) {
  return request<ApiResponse<UploadTask>>(
    '/api/upload-task/distribute/save',
    { method: 'POST', data: config },
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/services/uploadTask.ts
git commit -m "feat(uploadTask): scaffold service layer for 8-stage pipeline"
```

---

### Task 4: 路由切换 + 删除老模块

**Files:**
- Modify: `config/routes.ts`
- Delete: `src/pages/ContentCenter/QuestionBankTask/` 整个目录
- Delete: `mock/questionBankTask.ts`
- Delete: `src/services/questionBankTask.ts`

> 老的"题库任务"页用同名 service / mock / 页面组件，先全部删除再加新路由，避免菜单残留。

- [ ] **Step 1: 删除老模块**

```bash
rm -rf src/pages/ContentCenter/QuestionBankTask
rm mock/questionBankTask.ts
rm src/services/questionBankTask.ts
```

- [ ] **Step 2: 修改 `config/routes.ts` —— 把 `/question-bank/task` 那一项替换为新路由**

打开文件，找到这一段：

```typescript
{
  path: '/question-bank/task',
  name: '题库任务',
  component: './ContentCenter/QuestionBankTask',
},
```

替换为：

```typescript
{
  path: '/question-bank/upload',
  name: '试题上传',
  icon: 'cloudUpload',
  component: './UploadTask/List',
},
{
  path: '/question-bank/task',
  redirect: '/question-bank/upload',
  hideInMenu: true,
},
```

- [ ] **Step 3: 修改 `config/routes.ts` —— 文件末尾追加全屏二级路由**

在最后那个匿名 `{ component: './404' }` 项**之前**，且与 `/question-bank/tagging-fullscreen` 同级（顶层 routes 数组）添加：

```typescript
{
  path: '/question-bank/upload/:taskId/:stage',
  component: './UploadTask/Stage',
  hideInMenu: true,
  layout: false,
},
```

注意：放在 404 项之前（顺序很重要，路由匹配按从上到下）。

- [ ] **Step 4: 创建占位入口防止构建报错**

```bash
mkdir -p src/pages/UploadTask/List src/pages/UploadTask/Stage
```

新建 `src/pages/UploadTask/List/index.tsx`：

```typescript
import React from 'react';

const UploadTaskList: React.FC = () => <div>试题上传 - 列表（待实现）</div>;

export default UploadTaskList;
```

新建 `src/pages/UploadTask/Stage/index.tsx`：

```typescript
import React from 'react';

const UploadTaskStage: React.FC = () => <div>试题上传 - 阶段子页（待实现）</div>;

export default UploadTaskStage;
```

- [ ] **Step 5: 启动 dev server 烟雾测试**

Run: `npm run dev`
打开 `http://localhost:8000/question-bank/upload`
Expected: 看到 "试题上传 - 列表（待实现）"，左侧菜单显示"试题上传"项。
访问 `http://localhost:8000/question-bank/task`
Expected: 自动重定向到 `/question-bank/upload`。
按 Ctrl+C 停止 dev server。

- [ ] **Step 6: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add config/routes.ts src/pages/UploadTask
git add -u  # 收掉删除
git commit -m "refactor(routes): replace 题库任务 with 试题上传 entry"
```

---

## Phase 2 — Mock + Service 状态机

### Task 5: mock 文件骨架 + helper（`mock/uploadTask.ts` 第 1 部分）

**Files:**
- Create: `mock/uploadTask.ts`

> 这一 Task 只把骨架与 helper 落地：模块级状态容器、ok/fail/now/genId 工具、`initialStageProgress()` 工厂、空的 `export default {}`。
> 后续 Task 6/7/8 在同一文件**追加**实现，避免一次提交超过 600 行。

- [ ] **Step 1: 创建文件 `mock/uploadTask.ts`（仅骨架与 helper）**

```typescript
import { Request, Response } from 'express';
import {
  HUMAN_STAGES,
  SIMULATED_DURATION_MS,
  STAGE_KEYS,
  bucketOf,
  deriveStatus,
  isValidStage,
  nextStageOf,
} from '../src/pages/UploadTask/constants';
import type {
  BucketKey,
  DistributeConfig,
  StageKey,
  StageProgress,
  TaskQuestion,
  UploadTask,
} from '../src/pages/UploadTask/types';

// ===== 模块级状态：dev server 启动时由 seedInitialTasks() 重置 =====

let tasks: UploadTask[] = [];
let questions: Record<string, TaskQuestion[]> = {};
let distConfigs: Record<string, DistributeConfig> = {};

// ===== 通用 helper =====

function ok<T>(res: Response, data: T) {
  res.json({ success: true, message: '', data });
}

function fail(res: Response, message: string, status = 400) {
  res.status(status).json({ success: false, message, data: null });
}

function now(): string {
  return new Date().toISOString();
}

// 闭包计数器：deterministic ID，避免热重载时 ID 漂移
const makeCounter = () => {
  let n = 0;
  return () => ++n;
};
const taskCounter = makeCounter();
const questionCounter = makeCounter();
function genId(prefix: 'task' | 'q' | 'dist'): string {
  if (prefix === 'task') return `task-${taskCounter()}`;
  if (prefix === 'q') return `q-${questionCounter()}`;
  return `dist-${Date.now()}`;
}

function initialStageProgress(): Record<StageKey, StageProgress> {
  return STAGE_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: { state: 'pending' } }),
    {} as Record<StageKey, StageProgress>,
  );
}

// ===== 路由（Task 6/7/8 在下方填充） =====

export default {};
```

- [ ] **Step 2: 类型检查（GREEN：签名应已对齐 Phase 1 常量）**

Run: `npx tsc --noEmit`
Expected: PASS。如果有 "Cannot find module '../src/pages/UploadTask/constants'" 或常量名错，回 Phase 1 Task 2 校对。

- [ ] **Step 3: dev server 启动烟雾测试**

Run: `npm run dev`
打开 `http://localhost:8000/question-bank/upload`
Expected:
- 仍然显示 "试题上传 - 列表（待实现）" 占位（Phase 1 Task 4 创建的）
- **终端没有 mock 加载错误**（Umi 启动时会扫 `mock/` 下所有 `.ts`）
- 终端不出现 `Failed to compile` 或 `mock/uploadTask.ts` 相关报错
按 Ctrl+C 停止。

- [ ] **Step 4: 提交**

```bash
git add mock/uploadTask.ts
git commit -m "feat(uploadTask): add mock skeleton with helpers and state containers"
```

---

### Task 6: 状态机推进 + 样本数据生成（同文件，第 2 部分）

**Files:**
- Modify: `mock/uploadTask.ts`（在 `export default {}` 之前追加大段实现）

> 这一 Task 把"状态机推进 + 题目生成 + 10 条样本任务"全部落地，但**不**新增任何路由。
> 状态推进只在两处发生：`maybeAdvance`（人工审完时）和 `lazyAdvance`（GET 读取时）。
> 全部用 immutable map，绝不 push / 字段赋值。
>
> 注：`lazyAdvance` 在原型阶段**最多递归一次**——如果一次 GET 跨越了多个系统态阶段
> （罕见：用户关掉浏览器 10s 后再回来），只前进一段，下次 GET 再推进。简化实现，可接受。

- [ ] **Step 1: 在 `mock/uploadTask.ts` 的 `export default {}` 之前追加以下代码**

```typescript
// ===== stem HTML 模板池：3 段 <img> / 2 段 MathML / 3 段纯文本 =====

const STEM_TEMPLATES: string[] = [
  // 0 - 图片
  '<p>如图所示，已知三角形 ABC 中，AB = AC。求证角 B 等于角 C。</p><p><img src="https://placehold.co/400x200" alt="三角形 ABC" /></p>',
  // 1 - 图片
  '<p>下图是一辆小车沿直线运动的位移-时间图像，求小车在 0~5 秒内的平均速度。</p><p><img src="https://placehold.co/400x200" alt="s-t 图" /></p>',
  // 2 - MathML
  '<p>已知函数 <math><mrow><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>2</mn><mi>x</mi><mo>-</mo><mn>3</mn></mrow></math>，求 f(x) 的最小值。</p>',
  // 3 - MathML
  '<p>解不等式 <math><mrow><mfrac><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow><mrow><mi>x</mi><mo>-</mo><mn>2</mn></mrow></mfrac><mo>&gt;</mo><mn>0</mn></mrow></math>。</p>',
  // 4 - 图片
  '<p>如下图所示电路，已知 R1 = 10Ω，R2 = 20Ω，电源电压 6V，求干路电流。</p><p><img src="https://placehold.co/400x200" alt="电路图" /></p>',
  // 5 - 纯文本
  '<p>一个长方形的长是 12 厘米，宽是 8 厘米，求它的周长和面积。</p>',
  // 6 - 纯文本
  '<p>小明从家到学校用了 15 分钟，速度为每分钟 80 米，求小明家到学校的距离。</p>',
  // 7 - 纯文本
  '<p>下列说法中正确的是（    ）：质量是物体的固有属性，与位置无关。重力的方向总是指向地心。</p>',
];

// ===== 状态机：advanceToNext / lazyAdvance / maybeAdvance =====

function advanceToNext(
  task: UploadTask,
  stageJustDone: StageKey,
  summary: string,
): UploadTask {
  const nowStr = now();
  const next = nextStageOf(stageJustDone);

  const doneProgress: StageProgress = {
    ...task.stageProgress[stageJustDone],
    state: 'done',
    finishedAt: nowStr,
    summary,
  };

  if (next === null) {
    // distribute 是终态：stamp done 后不再前进
    return {
      ...task,
      stageProgress: { ...task.stageProgress, [stageJustDone]: doneProgress },
      updatedAt: nowStr,
    };
  }

  // 下一阶段是系统态：自动开跑（state='processing' + startedAt）
  // 下一阶段是人工态：state='pending'，等用户进入页面操作
  const isNextSystem = !HUMAN_STAGES.has(next);
  const nextProgress: StageProgress = isNextSystem
    ? { state: 'processing', startedAt: nowStr }
    : { state: 'pending' };

  return {
    ...task,
    currentStage: next,
    stageProgress: {
      ...task.stageProgress,
      [stageJustDone]: doneProgress,
      [next]: nextProgress,
    },
    updatedAt: nowStr,
  };
}

function genStageSummary(stage: StageKey, qs: TaskQuestion[] | undefined): string {
  const list = qs ?? [];
  switch (stage) {
    case 'quality': {
      const kept = list.filter((q) => q.qualityKept === true).length;
      const removed = list.filter((q) => q.qualityKept === false).length;
      return `通过 ${kept} / 删除 ${removed}`;
    }
    case 'dedupe': {
      const dup = list.filter((q) => !!q.duplicateOf).length;
      return `发现 ${dup} 道重复题`;
    }
    case 'parse': {
      const lowConf = list.filter((q) => {
        const c = q.parseConfidence ?? {};
        return Object.values(c).some((v) => (v ?? 1) < 0.8);
      }).length;
      return `解析准确率 96% · 低置信字段 ${lowConf} 处`;
    }
    case 'parse-review':
      return `解析审核完成 · 已确认 ${list.filter((q) => q.parseReviewed).length} 题`;
    case 'tag': {
      const needReview = list.filter((q) => !q.tagReviewed).length;
      return `打标完成 · 待复核 ${needReview} 题`;
    }
    case 'tag-review':
      return `打标审核完成 · 已确认 ${list.filter((q) => q.tagReviewed).length} 题`;
    case 'publish':
      return '已发布至题库';
    case 'distribute':
      return '已配置分发渠道';
    default:
      return '';
  }
}

function lazyAdvance(task: UploadTask): UploadTask {
  const cur = task.currentStage;
  // 人工态：必须等用户点确认
  if (HUMAN_STAGES.has(cur)) return task;
  const sp = task.stageProgress[cur];
  if (sp.state !== 'processing' || !sp.startedAt) return task;

  const elapsed = Date.now() - new Date(sp.startedAt).getTime();
  const target = SIMULATED_DURATION_MS[cur] ?? 3000;
  if (elapsed < target) return task;

  // 注：原型简化——单次最多推一段。如果用户停留 10s 跨越多段，下次 GET 继续推。
  return advanceToNext(task, cur, genStageSummary(cur, questions[task.id]));
}

function isStageReviewed(q: TaskQuestion, stage: StageKey): boolean {
  switch (stage) {
    case 'quality':
      return q.qualityKept !== undefined;
    case 'parse-review':
      return q.parseReviewed === true;
    case 'tag-review':
      return q.tagReviewed === true;
    default:
      return true;
  }
}

function isKeptForStage(q: TaskQuestion, stage: StageKey): boolean {
  switch (stage) {
    case 'quality':
      return q.qualityKept === true;
    case 'parse-review':
    case 'tag-review':
      return true;
    default:
      return true;
  }
}

function maybeAdvance(taskId: string, stage: StageKey): void {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  const qs = questions[taskId] ?? [];
  const allReviewed = qs.every((q) => isStageReviewed(q, stage));
  if (!allReviewed) return;

  const keptCount = qs.filter((q) => isKeptForStage(q, stage)).length;
  if (keptCount === 0) {
    // 全部被拒：currentStage 不前进，state 标 rejected
    const rejectedProgress: StageProgress = {
      ...task.stageProgress[stage],
      state: 'rejected',
      finishedAt: now(),
      summary: '所有题目均被拒绝',
    };
    tasks = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            stageProgress: { ...t.stageProgress, [stage]: rejectedProgress },
            updatedAt: now(),
          }
        : t,
    );
    return;
  }

  const advanced = advanceToNext(task, stage, genStageSummary(stage, qs));
  tasks = tasks.map((t) => (t.id === taskId ? advanced : t));
}

// ===== 样本数据生成 =====

function genQuestionsForTasks(seedTasks: UploadTask[]): void {
  for (const task of seedTasks) {
    const stageIdx = STAGE_KEYS.indexOf(task.currentStage);
    // 关键区分：
    // - hasQualityScore: AI 质量评分已生成 —— currentStage 在或晚于 quality
    //   （quality processing 阶段就要给评分，否则 BatchReview 空表）
    // - qualityResolved: 人工质检已落决策 —— currentStage 严格晚于 quality
    const hasQualityScore = stageIdx >= STAGE_KEYS.indexOf('quality');
    const qualityResolved = stageIdx > STAGE_KEYS.indexOf('quality');
    const passedDedupe = stageIdx > STAGE_KEYS.indexOf('dedupe');
    const passedParse = stageIdx > STAGE_KEYS.indexOf('parse');
    const passedTag = stageIdx > STAGE_KEYS.indexOf('tag');

    const qs: TaskQuestion[] = [];
    for (let i = 1; i <= 8; i++) {
      // 题型分布：1,2 单选 / 3,4 多选 / 5,6 填空 / 7,8 解答
      let qType: 'single' | 'multi' | 'fill' | 'essay';
      if (i <= 2) qType = 'single';
      else if (i <= 4) qType = 'multi';
      else if (i <= 6) qType = 'fill';
      else qType = 'essay';

      const base: TaskQuestion = {
        id: `${task.id}-q-${i}`,
        taskId: task.id,
        index: i,
        stem: STEM_TEMPLATES[i - 1],
      };

      if (qType === 'single') {
        base.options = ['A. 选项一', 'B. 选项二', 'C. 选项三', 'D. 选项四'];
        base.answer = 'B';
        base.analysis = '<p>本题考查基础概念，正确答案为 B。</p>';
      } else if (qType === 'multi') {
        base.options = ['A. 选项一', 'B. 选项二', 'C. 选项三', 'D. 选项四'];
        base.answer = 'AC';
        base.analysis = '<p>本题考查综合判断，正确答案为 AC。</p>';
      } else if (qType === 'fill') {
        base.answer = '12 厘米';
        base.analysis = '<p>代入公式直接得到结果。</p>';
      } else {
        base.answer = '<p>解：由题意可得 ...（详见解析）</p>';
        base.analysis = '<p>本题考查综合应用能力，解题步骤分三步：① ... ② ... ③ ...</p>';
      }

      // AI 质量评分 + 自动判定：currentStage 在或晚于 quality 时即生成
      if (hasQualityScore) {
        if (i <= 5) {
          // 自动通过：80+ 分
          base.qualityScore = 80 + i;
          base.qualityVerdict = 'auto-pass';
        } else if (i <= 7) {
          // 中段：55-75 分，2 条扣分（人工待决）
          base.qualityScore = i === 6 ? 65 : 58;
          base.qualityVerdict = 'mid-need-review';
          base.qualityDeductions = [
            { rule: '缺解析说明', points: 15 },
            { rule: '选项格式不规范', points: 20 },
          ];
        } else {
          // 自动拒绝：30 分
          base.qualityScore = 30;
          base.qualityVerdict = 'auto-reject';
          base.qualityDeductions = [
            { rule: '题干缺失关键信息', points: 40 },
            { rule: '答案不规范', points: 30 },
          ];
        }
      }

      // 人工质检决策（qualityKept）：
      // - quality 已结束的任务：auto-pass → true，auto-reject → false，mid → true（已通过审核）
      // - quality 正在进行的任务：auto-pass → true（AI 直接放行），auto-reject → false（AI 直接拒绝），
      //   mid-need-review → undefined（等待人工决策，BatchReview 表里的就是这批）
      if (hasQualityScore) {
        if (base.qualityVerdict === 'auto-pass') {
          base.qualityKept = true;
        } else if (base.qualityVerdict === 'auto-reject') {
          base.qualityKept = false;
        } else if (qualityResolved) {
          // 中段题：阶段已结束意味着人工已选保留
          base.qualityKept = true;
        }
        // 否则（mid + currentStage='quality'）：保持 undefined，等用户在 BatchReview 操作
      }

      // 重复检测产物：已过 dedupe 的任务，index=3 的题打 duplicateOf
      if (passedDedupe && i === 3) {
        base.duplicateOf = 'other-task-q-id';
      }

      // 解析产物：已过 parse 的任务
      if (passedParse) {
        // 每题至少 1 个字段 < 0.8（用 i%4 选）
        const lowField = (['stem', 'options', 'answer', 'analysis'] as const)[i % 4];
        const conf: Partial<
          Record<'stem' | 'options' | 'answer' | 'analysis', number>
        > = {
          stem: 0.95,
          options: 0.92,
          answer: 0.93,
          analysis: 0.9,
        };
        conf[lowField] = 0.65;
        base.parseConfidence = conf;
      }

      // 打标产物：已过 tag 的任务
      // 知识点 ID 来自 mock/tagSystem.ts 真实树（kp-1-1-1 / kp-1-2 / kp-2-1 均已确认存在）
      if (passedTag) {
        const kpSamples = [
          ['kp-1-1-1'],
          ['kp-1-2'],
          ['kp-2-1'],
          ['kp-1-1-1', 'kp-1-2'],
        ];
        base.tags = {
          knowledgePoints: kpSamples[i % kpSamples.length],
          questionType:
            qType === 'single'
              ? '单选题'
              : qType === 'multi'
                ? '多选题'
                : qType === 'fill'
                  ? '填空题'
                  : '解答题',
          difficulty: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
          cognitionLevel: i % 2 === 0 ? '理解' : '应用',
        };
        base.tagConfidence = {
          knowledgePoints: 0.88,
          questionType: 0.95,
          difficulty: 0.72,
        };
      }

      qs.push(base);
    }
    questions[task.id] = qs;
  }
}

// ===== 10 个示例任务 =====

interface SeedConfig {
  name: string;
  fileName: string;
  subject: UploadTask['subject'];
  grade: UploadTask['grade'];
  source: UploadTask['source'];
  batch: string;
  currentStage: StageKey;
  curState: StageProgress['state'];
  withDistConfig?: boolean;
}

const SEED_CONFIGS: SeedConfig[] = [
  // 2 个 quality 待人工
  {
    name: '2024 中考数学 A 卷',
    fileName: '2024-中考数学-A.docx',
    subject: '数学',
    grade: '初中',
    source: '原创',
    batch: 'batch-2024-12-A',
    currentStage: 'quality',
    curState: 'processing',
  },
  {
    name: '2024 中考物理 B 卷',
    fileName: '2024-中考物理-B.docx',
    subject: '物理',
    grade: '初中',
    source: '改编',
    batch: 'batch-2024-12-B',
    currentStage: 'quality',
    curState: 'processing',
  },
  // 1 个 parse-review
  {
    name: '高一数学期中模拟',
    fileName: 'g1-math-mid.docx',
    subject: '数学',
    grade: '高中',
    source: '原创',
    batch: 'batch-2024-12-C',
    currentStage: 'parse-review',
    curState: 'processing',
  },
  // 2 个 tag 系统处理中
  {
    name: '初二英语单元卷',
    fileName: 'g8-en-unit3.docx',
    subject: '英语',
    grade: '初中',
    source: '引用',
    batch: 'batch-2024-12-D',
    currentStage: 'tag',
    curState: 'processing',
  },
  {
    name: '高三化学一轮复习',
    fileName: 'g12-chem-r1.docx',
    subject: '化学',
    grade: '高中',
    source: '改编',
    batch: 'batch-2024-12-E',
    currentStage: 'tag',
    curState: 'processing',
  },
  // 3 个 published（distribute pending）
  {
    name: '小学六年级语文阅读',
    fileName: 'g6-chinese-read.docx',
    subject: '语文',
    grade: '小学',
    source: '原创',
    batch: 'batch-2024-11-F',
    currentStage: 'distribute',
    curState: 'pending',
  },
  {
    name: '初一生物期末卷',
    fileName: 'g7-bio-final.docx',
    subject: '生物',
    grade: '初中',
    source: '引用',
    batch: 'batch-2024-11-G',
    currentStage: 'distribute',
    curState: 'pending',
  },
  {
    name: '高二历史模拟卷',
    fileName: 'g11-history-mock.docx',
    subject: '历史',
    grade: '高中',
    source: '改编',
    batch: 'batch-2024-11-H',
    currentStage: 'distribute',
    curState: 'pending',
  },
  // 2 个 distributed（终态）
  {
    name: '高考地理真题汇编',
    fileName: 'gk-geo-real.docx',
    subject: '地理',
    grade: '高中',
    source: '引用',
    batch: 'batch-2024-10-I',
    currentStage: 'distribute',
    curState: 'done',
    withDistConfig: true,
  },
  {
    name: '中考政治速记卷',
    fileName: 'zk-poli-quick.docx',
    subject: '政治',
    grade: '初中',
    source: '原创',
    batch: 'batch-2024-10-J',
    currentStage: 'distribute',
    curState: 'done',
    withDistConfig: true,
  },
];

function buildSeedTask(cfg: SeedConfig): UploadTask {
  const id = genId('task');
  const nowStr = now();
  const progress = initialStageProgress();
  const curIdx = STAGE_KEYS.indexOf(cfg.currentStage);

  // 把 currentStage 之前的所有阶段都 stamp done + summary
  for (let i = 0; i < curIdx; i++) {
    const key = STAGE_KEYS[i];
    progress[key] = {
      state: 'done',
      startedAt: nowStr,
      finishedAt: nowStr,
      summary: `已完成（示例数据）`,
    };
  }

  // 当前阶段
  const isSystem = !HUMAN_STAGES.has(cfg.currentStage);
  if (cfg.curState === 'processing') {
    progress[cfg.currentStage] = {
      state: 'processing',
      startedAt: isSystem
        ? new Date(Date.now() - 500).toISOString() // 系统态刚开始跑（不要立即触发 lazyAdvance）
        : nowStr,
    };
  } else if (cfg.curState === 'done') {
    progress[cfg.currentStage] = {
      state: 'done',
      startedAt: nowStr,
      finishedAt: nowStr,
      summary: '已配置分发渠道',
    };
  } else {
    progress[cfg.currentStage] = { state: 'pending' };
  }

  const task: UploadTask = {
    id,
    name: cfg.name,
    fileName: cfg.fileName,
    subject: cfg.subject,
    grade: cfg.grade,
    source: cfg.source,
    batch: cfg.batch,
    totalQuestions: 8,
    currentStage: cfg.currentStage,
    status: 'processing', // 占位，下面 deriveStatus 重算
    stageProgress: progress,
    createdAt: nowStr,
    updatedAt: nowStr,
  };
  return { ...task, status: deriveStatus(task) };
}

function seedInitialTasks(): void {
  const seeded = SEED_CONFIGS.map(buildSeedTask);
  tasks = seeded;
  genQuestionsForTasks(seeded);

  // 为 withDistConfig 的任务生成最小分发配置
  for (let i = 0; i < SEED_CONFIGS.length; i++) {
    if (SEED_CONFIGS[i].withDistConfig) {
      const t = seeded[i];
      distConfigs[t.id] = {
        taskId: t.id,
        scope: {
          institutions: 'all',
          grades: [t.grade],
          subjects: [t.subject],
          roles: ['teacher', 'student'],
        },
        channels: ['paper-bank', 'export'],
        configuredAt: now(),
      };
    }
  }
}

seedInitialTasks();
```

- [ ] **Step 2: 类型检查（GREEN：函数签名 + Phase 1 类型应已对齐）**

Run: `npx tsc --noEmit`
Expected: PASS。常见错误：
- `Property 'X' does not exist on type 'TaskQuestion'` → 回 Phase 1 Task 1 确认字段。
- `Type '"single"' is not assignable to ...` → 检查 qType 联合类型字面量是否拼错。

- [ ] **Step 3: dev server 烟雾测试（无路由，看不到效果，只看启动是否成功）**

Run: `npm run dev`
打开 `http://localhost:8000/question-bank/upload`
Expected:
- 终端无 mock 模块编译错误
- 占位页正常显示
- 终端不出现 `seedInitialTasks` 相关报错
按 Ctrl+C 停止。

- [ ] **Step 4: 提交**

```bash
git add mock/uploadTask.ts
git commit -m "feat(uploadTask): add state machine, seed data and stage advancement"
```

---

### Task 7: 列表与详情路由（mock 第 3 部分）

**Files:**
- Modify: `mock/uploadTask.ts`（替换 Task 5 的空 `export default {}` 为完整路由对象）

> Task 5 留下了空的 `export default {}`，本 Task 把它替换为含 4 条 GET/POST 路由的对象。
> Task 8 会进一步扩展同一个 default 导出。

- [ ] **Step 1: 删除文件末尾的 `export default {};`，替换为以下内容**

```typescript
// ===== Umi mock 路由：列表 / 详情 / 创建 / 阶段题目 =====

export default {
  'GET /api/upload-task/list': (req: Request, res: Response) => {
    const statusParam = (req.query.status as string | undefined) ?? 'all';
    const current = Number(req.query.current ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);

    // 1) 全集惰性推进 + 重算 status
    const advanced = tasks.map((t) => {
      const after = lazyAdvance(t);
      return { ...after, status: deriveStatus(after) };
    });
    tasks = advanced; // 持久化推进结果

    // 2) 计算全集分桶（基于过滤前）
    const bucketCounts: Record<BucketKey, number> = {
      all: advanced.length,
      'pending-human': 0,
      processing: 0,
      published: 0,
      rejected: 0,
    };
    for (const t of advanced) {
      const b = bucketOf(t.status);
      bucketCounts[b] = (bucketCounts[b] ?? 0) + 1;
    }

    // 3) 按 status 过滤（all 不过滤）
    const filtered =
      statusParam === 'all'
        ? advanced
        : advanced.filter((t) => bucketOf(t.status) === statusParam);

    // 4) 分页
    const start = (current - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);

    ok(res, {
      data: pageData,
      total: filtered.length,
      bucketCounts,
    });
  },

  'GET /api/upload-task/:id': (req: Request, res: Response) => {
    const { id } = req.params;
    const found = tasks.find((t) => t.id === id);
    if (!found) {
      fail(res, '任务不存在', 404);
      return;
    }
    const after = lazyAdvance(found);
    const refreshed = { ...after, status: deriveStatus(after) };
    tasks = tasks.map((t) => (t.id === id ? refreshed : t));
    ok(res, refreshed);
  },

  'POST /api/upload-task/create': (req: Request, res: Response) => {
    const body = req.body ?? {};
    const required: (keyof typeof body)[] = [
      'name',
      'fileName',
      'subject',
      'grade',
      'source',
      'batch',
    ];
    for (const k of required) {
      if (!body[k] || String(body[k]).trim() === '') {
        fail(res, `字段 ${k} 不能为空`);
        return;
      }
    }
    const id = genId('task');
    const nowStr = now();
    const progress = initialStageProgress();
    progress.quality = { state: 'processing', startedAt: nowStr };
    const newTask: UploadTask = {
      id,
      name: body.name,
      fileName: body.fileName,
      subject: body.subject,
      grade: body.grade,
      source: body.source,
      sourceNote: body.sourceNote,
      batch: body.batch,
      totalQuestions: 8,
      currentStage: 'quality',
      status: 'pending-human',
      stageProgress: progress,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    const withStatus = { ...newTask, status: deriveStatus(newTask) };

    tasks = [withStatus, ...tasks];
    genQuestionsForTasks([withStatus]);
    ok(res, withStatus);
  },

  'GET /api/upload-task/:id/stage/:stage/questions': (
    req: Request,
    res: Response,
  ) => {
    const { id, stage } = req.params;
    if (!isValidStage(stage)) {
      fail(res, '无效阶段');
      return;
    }
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      fail(res, '任务不存在', 404);
      return;
    }
    ok(res, questions[id] ?? []);
  },
};
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS。如果出现 `Property 'params' does not exist on type 'Request'`，说明 express 类型缺失——回 Task 5 确认 `import { Request, Response } from 'express'` 已加在顶部。

- [ ] **Step 3: dev server 行为烟雾测试（用浏览器 devtools 直接调 fetch）**

Run: `npm run dev`
打开 `http://localhost:8000/question-bank/upload`，按 F12 打开 Console，执行：

```javascript
fetch('/api/upload-task/list').then(r => r.json()).then(console.log)
```

Expected: 返回 `{ success: true, message: '', data: { data: [...10 tasks...], total: 10, bucketCounts: { all: 10, 'pending-human': 3, processing: 2, published: 5, rejected: 0 } } }`。
- bucketCounts 数值可能因 lazyAdvance 略有变化（参考：3 个 pending-human = 2 quality + 1 parse-review；2 processing = 2 个 tag 处理中；5 published = 3 published + 2 distributed），核心是 5 个桶都有值，total = 10。

继续测试 status 过滤：

```javascript
fetch('/api/upload-task/list?status=published').then(r => r.json()).then(console.log)
```

Expected: `data` 数组 5 项，`total: 5`，`bucketCounts.published === 5`。

继续测试详情：

```javascript
fetch('/api/upload-task/list').then(r=>r.json()).then(j => fetch(`/api/upload-task/${j.data.data[0].id}`)).then(r=>r.json()).then(console.log)
```

Expected: 单个 task 对象，包含 `stageProgress` 8 阶段，`status` 已派生。

按 Ctrl+C 停止。

- [ ] **Step 4: 提交**

```bash
git add mock/uploadTask.ts
git commit -m "feat(uploadTask): add list/detail/create/stage-questions mock routes"
```

---

### Task 8: 写操作路由（mock 第 4 部分）

**Files:**
- Modify: `mock/uploadTask.ts`（在 Task 7 的 `export default { ... }` 对象内追加路由）

> 把 8 阶段所有写操作 + advance + distribute 配置补齐。
> 每个写操作都先验证入参，状态机推进统一走 `maybeAdvance` 或 `advanceToNext`。

- [ ] **Step 1: 把 Task 7 的 `export default { ... }` 扩展为下面这版（替换整个 default 导出对象）**

```typescript
// ===== Umi mock 路由：列表 / 详情 / 创建 / 阶段题目 + 8 阶段写操作 =====

export default {
  // ----- 列表 / 详情 / 创建（Task 7） -----

  'GET /api/upload-task/list': (req: Request, res: Response) => {
    const statusParam = (req.query.status as string | undefined) ?? 'all';
    const current = Number(req.query.current ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);

    const advanced = tasks.map((t) => {
      const after = lazyAdvance(t);
      return { ...after, status: deriveStatus(after) };
    });
    tasks = advanced;

    const bucketCounts: Record<BucketKey, number> = {
      all: advanced.length,
      'pending-human': 0,
      processing: 0,
      published: 0,
      rejected: 0,
    };
    for (const t of advanced) {
      const b = bucketOf(t.status);
      bucketCounts[b] = (bucketCounts[b] ?? 0) + 1;
    }

    const filtered =
      statusParam === 'all'
        ? advanced
        : advanced.filter((t) => bucketOf(t.status) === statusParam);

    const start = (current - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);

    ok(res, { data: pageData, total: filtered.length, bucketCounts });
  },

  'GET /api/upload-task/:id': (req: Request, res: Response) => {
    const { id } = req.params;
    const found = tasks.find((t) => t.id === id);
    if (!found) {
      fail(res, '任务不存在', 404);
      return;
    }
    const after = lazyAdvance(found);
    const refreshed = { ...after, status: deriveStatus(after) };
    tasks = tasks.map((t) => (t.id === id ? refreshed : t));
    ok(res, refreshed);
  },

  'POST /api/upload-task/create': (req: Request, res: Response) => {
    const body = req.body ?? {};
    const required = ['name', 'fileName', 'subject', 'grade', 'source', 'batch'];
    for (const k of required) {
      if (!body[k] || String(body[k]).trim() === '') {
        fail(res, `字段 ${k} 不能为空`);
        return;
      }
    }
    const id = genId('task');
    const nowStr = now();
    const progress = initialStageProgress();
    progress.quality = { state: 'processing', startedAt: nowStr };
    const newTask: UploadTask = {
      id,
      name: body.name,
      fileName: body.fileName,
      subject: body.subject,
      grade: body.grade,
      source: body.source,
      sourceNote: body.sourceNote,
      batch: body.batch,
      totalQuestions: 8,
      currentStage: 'quality',
      status: 'pending-human',
      stageProgress: progress,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    const withStatus = { ...newTask, status: deriveStatus(newTask) };

    tasks = [withStatus, ...tasks];
    genQuestionsForTasks([withStatus]);
    ok(res, withStatus);
  },

  'GET /api/upload-task/:id/stage/:stage/questions': (
    req: Request,
    res: Response,
  ) => {
    const { id, stage } = req.params;
    if (!isValidStage(stage)) {
      fail(res, '无效阶段');
      return;
    }
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      fail(res, '任务不存在', 404);
      return;
    }
    ok(res, questions[id] ?? []);
  },

  // ----- 质量检测 -----

  'POST /api/upload-task/quality/keep': (req: Request, res: Response) => {
    const { taskId, questionIds } = req.body ?? {};
    if (!taskId || !Array.isArray(questionIds) || questionIds.length === 0) {
      fail(res, 'taskId 与 questionIds 必填且非空');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    const idSet = new Set<string>(questionIds);
    questions[taskId] = list.map((q) =>
      idSet.has(q.id) ? { ...q, qualityKept: true } : q,
    );
    maybeAdvance(taskId, 'quality');
    ok(res, undefined);
  },

  'POST /api/upload-task/quality/reject': (req: Request, res: Response) => {
    const { taskId, questionIds, reason } = req.body ?? {};
    if (!taskId || !Array.isArray(questionIds) || questionIds.length === 0) {
      fail(res, 'taskId 与 questionIds 必填且非空');
      return;
    }
    if (!reason || String(reason).trim() === '') {
      fail(res, '删除原因必填');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    const idSet = new Set<string>(questionIds);
    questions[taskId] = list.map((q) =>
      idSet.has(q.id) ? { ...q, qualityKept: false } : q,
    );
    maybeAdvance(taskId, 'quality');
    ok(res, undefined);
  },

  // ----- 解析审核 -----

  'POST /api/upload-task/parse-review/update': (req: Request, res: Response) => {
    const { taskId, questionId, patch } = req.body ?? {};
    if (!taskId || !questionId) {
      fail(res, 'taskId 与 questionId 必填');
      return;
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      fail(res, 'patch 必须为对象');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    let updated: TaskQuestion | undefined;
    questions[taskId] = list.map((q) => {
      if (q.id !== questionId) return q;
      const merged = { ...q, ...patch };
      updated = merged;
      return merged;
    });
    if (!updated) {
      fail(res, '题目不存在', 404);
      return;
    }
    ok(res, updated);
  },

  'POST /api/upload-task/parse-review/regenerate': (
    req: Request,
    res: Response,
  ) => {
    const { taskId, questionId } = req.body ?? {};
    if (!taskId || !questionId) {
      fail(res, 'taskId 与 questionId 必填');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    let updated: TaskQuestion | undefined;
    questions[taskId] = list.map((q) => {
      if (q.id !== questionId) return q;
      const merged: TaskQuestion = {
        ...q,
        stem: `${q.stem}<p>（重新生成 v2）</p>`,
        parseConfidence: {
          stem: 0.9,
          options: 0.9,
          answer: 0.9,
          analysis: 0.9,
        },
      };
      updated = merged;
      return merged;
    });
    if (!updated) {
      fail(res, '题目不存在', 404);
      return;
    }
    ok(res, updated);
  },

  'POST /api/upload-task/parse-review/confirm': (
    req: Request,
    res: Response,
  ) => {
    const { taskId, questionIds } = req.body ?? {};
    if (!taskId || !Array.isArray(questionIds) || questionIds.length === 0) {
      fail(res, 'taskId 与 questionIds 必填且非空');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    const idSet = new Set<string>(questionIds);
    questions[taskId] = list.map((q) =>
      idSet.has(q.id) ? { ...q, parseReviewed: true } : q,
    );
    maybeAdvance(taskId, 'parse-review');
    ok(res, undefined);
  },

  // ----- 打标审核 -----

  'POST /api/upload-task/tag-review/update': (req: Request, res: Response) => {
    const { taskId, questionId, tags } = req.body ?? {};
    if (!taskId || !questionId) {
      fail(res, 'taskId 与 questionId 必填');
      return;
    }
    if (!tags || typeof tags !== 'object') {
      fail(res, 'tags 必须为对象');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    let updated: TaskQuestion | undefined;
    questions[taskId] = list.map((q) => {
      if (q.id !== questionId) return q;
      const merged: TaskQuestion = { ...q, tags };
      updated = merged;
      return merged;
    });
    if (!updated) {
      fail(res, '题目不存在', 404);
      return;
    }
    ok(res, updated);
  },

  'POST /api/upload-task/tag-review/regenerate': (
    req: Request,
    res: Response,
  ) => {
    const { taskId, questionId } = req.body ?? {};
    if (!taskId || !questionId) {
      fail(res, 'taskId 与 questionId 必填');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    let updated: TaskQuestion | undefined;
    questions[taskId] = list.map((q) => {
      if (q.id !== questionId) return q;
      const merged: TaskQuestion = {
        ...q,
        tags: {
          knowledgePoints: ['kp-1-1-1', 'kp-2-1'],
          questionType: q.tags?.questionType,
          difficulty: q.tags?.difficulty ?? 3,
          cognitionLevel: '分析',
        },
      };
      updated = merged;
      return merged;
    });
    if (!updated) {
      fail(res, '题目不存在', 404);
      return;
    }
    ok(res, updated);
  },

  'POST /api/upload-task/tag-review/confirm': (req: Request, res: Response) => {
    const { taskId, questionIds } = req.body ?? {};
    if (!taskId || !Array.isArray(questionIds) || questionIds.length === 0) {
      fail(res, 'taskId 与 questionIds 必填且非空');
      return;
    }
    const list = questions[taskId];
    if (!list) {
      fail(res, '任务不存在', 404);
      return;
    }
    const idSet = new Set<string>(questionIds);
    questions[taskId] = list.map((q) =>
      idSet.has(q.id) ? { ...q, tagReviewed: true } : q,
    );
    maybeAdvance(taskId, 'tag-review');
    ok(res, undefined);
  },

  // ----- 系统态阶段强制推进 -----

  'POST /api/upload-task/advance': (req: Request, res: Response) => {
    const { taskId, stage } = req.body ?? {};
    if (!taskId || !isValidStage(stage)) {
      fail(res, '入参不合法');
      return;
    }
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      fail(res, '任务不存在', 404);
      return;
    }
    if (task.currentStage !== stage) {
      fail(res, '阶段不匹配');
      return;
    }
    if (HUMAN_STAGES.has(stage as StageKey)) {
      fail(res, '人工阶段不可自动推进');
      return;
    }
    const advanced = advanceToNext(
      task,
      stage as StageKey,
      genStageSummary(stage as StageKey, questions[taskId]),
    );
    const withStatus = { ...advanced, status: deriveStatus(advanced) };
    tasks = tasks.map((t) => (t.id === taskId ? withStatus : t));
    ok(res, withStatus);
  },

  // ----- 渠道分发 -----

  'GET /api/upload-task/:id/distribute': (req: Request, res: Response) => {
    const { id } = req.params;
    ok(res, distConfigs[id] ?? null);
  },

  'POST /api/upload-task/distribute/save': (req: Request, res: Response) => {
    const body = (req.body ?? {}) as DistributeConfig;
    if (!body.taskId) {
      fail(res, 'taskId 必填');
      return;
    }
    if (!body.scope || !body.scope.institutions) {
      fail(res, 'scope.institutions 必填');
      return;
    }
    if (!Array.isArray(body.channels) || body.channels.length === 0) {
      fail(res, '至少选择一个分发渠道');
      return;
    }
    const task = tasks.find((t) => t.id === body.taskId);
    if (!task) {
      fail(res, '任务不存在', 404);
      return;
    }
    distConfigs[body.taskId] = { ...body, configuredAt: now() };

    const nowStr = now();
    const updatedTask: UploadTask = {
      ...task,
      currentStage: 'distribute',
      stageProgress: {
        ...task.stageProgress,
        distribute: {
          state: 'done',
          startedAt: task.stageProgress.distribute.startedAt ?? nowStr,
          finishedAt: nowStr,
          summary: `已分发至 ${body.channels.length} 渠道`,
        },
      },
      updatedAt: nowStr,
    };
    const withStatus = { ...updatedTask, status: deriveStatus(updatedTask) };
    tasks = tasks.map((t) => (t.id === body.taskId ? withStatus : t));
    ok(res, withStatus);
  },
};
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS。

- [ ] **Step 3: dev server 行为烟雾测试（状态机推进）**

Run: `npm run dev`
打开 `http://localhost:8000/question-bank/upload`，F12 Console 执行：

```javascript
// 1) 先看 task-1（quality 阶段 processing） 当前状态
fetch('/api/upload-task/task-1').then(r=>r.json()).then(j => console.log('before:', j.data.currentStage, j.data.stageProgress.quality.state))
```

Expected: `before: quality processing`。同时 q1-q5 的 `qualityKept=true`（auto-pass）、q8 的 `qualityKept=false`（auto-reject）已由 seed 写入；q6+q7（mid-need-review）的 `qualityKept` 是 undefined，正等待人工决策。

```javascript
// 2) 对 q6+q7（mid 段）调 keep —— maybeAdvance 应当推进 quality
fetch('/api/upload-task/quality/keep', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    taskId: 'task-1',
    questionIds: ['task-1-q-6','task-1-q-7']
  })
}).then(r=>r.json()).then(console.log)
```

Expected: `{ success: true, message: '', data: undefined }`。此时全部 8 题都有 qualityKept（5 true + 2 true + 1 false），`isStageReviewed('quality')` 对所有题返回 true，`maybeAdvance` 把 currentStage 推到 dedupe。

```javascript
// 3) 再查 task-1
fetch('/api/upload-task/task-1').then(r=>r.json()).then(j => console.log('after:', j.data.currentStage, j.data.stageProgress.quality.state, '→', j.data.stageProgress.dedupe.state))
```

Expected: `after: dedupe processing → undefined`（currentStage 已推到 dedupe，dedupe 是系统态自动 stamp processing；quality.state === 'done'）。或者：如果在第 3 步之前 dedupe 已模拟完成，会进一步推到 parse。任一是合法状态。

```javascript
// 4) 演示"批量拒绝某道 mid 题"也能推进 —— 重置后用 task-2 试
//    （task-2 当前阶段也是 quality processing，q6+q7 同样是 mid）
fetch('/api/upload-task/quality/reject', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ taskId: 'task-2', questionIds: ['task-2-q-6','task-2-q-7'], reason: '格式不规范' })
}).then(r=>r.json()).then(console.log)
```

Expected: `{ success: true, ... }`，task-2 同样推进到 dedupe。

继续验证 advance 路由：

```javascript
// 5) 强制完成 task-1 当前的系统态阶段
fetch('/api/upload-task/task-1').then(r=>r.json()).then(j => {
  const s = j.data.currentStage;
  return fetch('/api/upload-task/advance', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ taskId:'task-1', stage: s }) }).then(r=>r.json())
}).then(console.log)
```

Expected: 返回 `{ success: true, data: <task with currentStage advanced one step> }`。

```javascript
// 6) 验证 distribute save
fetch('/api/upload-task/distribute/save', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    taskId: 'task-6',
    scope: { institutions: 'all', grades: ['小学'], subjects: ['语文'], roles: ['teacher'] },
    channels: ['paper-bank']
  })
}).then(r=>r.json()).then(j => console.log(j.data.status, j.data.stageProgress.distribute.state))
```

Expected: `distributed done`

按 Ctrl+C 停止。

- [ ] **Step 4: 提交**

```bash
git add mock/uploadTask.ts
git commit -m "feat(uploadTask): add 8-stage write routes and distribute config"
```

---

### Task 9: Service 错误冒泡（unwrap helper）+ 类型校验

**Files:**
- Modify: `src/services/uploadTask.ts`

> Phase 1 service 返回的是 `ApiResponse<T>`，业务组件每次都得手写 `if (!resp.success) throw ...; const data = resp.data`，啰嗦且容易漏。
> 这一 Task 在 service 内**统一 unwrap**：失败时 throw 中文 Error，成功时直接返回 `T`，组件层只关心数据。
> 组件层的 `message.error()` 由 Phase 3 加。
>
> 注：dev server 烟雾测试需要业务页面真正调 service 才能验证；Phase 3 才会有页面挂上。本 Task 仅保证类型对齐，运行时验证延后。

- [ ] **Step 1: 用以下完整代码替换 `src/services/uploadTask.ts`**

```typescript
import { request } from '@umijs/max';
import type { ApiResponse } from './tagSystem';
import type {
  CreateUploadTaskBody,
  DistributeConfig,
  StageKey,
  TaskQuestion,
  UploadTask,
  UploadTaskListResponse,
} from '@/pages/UploadTask/types';

export interface UploadTaskQueryParams {
  current?: number;
  pageSize?: number;
  status?: string;
}

// 统一拆封：失败抛业务可读 Error，成功直接返回 data
function unwrap<T>(resp: ApiResponse<T>): T {
  if (!resp.success) {
    throw new Error(resp.message || '操作失败');
  }
  return resp.data;
}

// ----- 任务列表 / 详情 / 创建 -----

export async function getUploadTasks(
  params: UploadTaskQueryParams,
): Promise<UploadTaskListResponse> {
  return request<ApiResponse<UploadTaskListResponse>>(
    '/api/upload-task/list',
    { method: 'GET', params },
  ).then(unwrap);
}

export async function getUploadTask(id: string): Promise<UploadTask> {
  return request<ApiResponse<UploadTask>>(`/api/upload-task/${id}`, {
    method: 'GET',
  }).then(unwrap);
}

export async function createUploadTask(
  body: CreateUploadTaskBody,
): Promise<UploadTask> {
  return request<ApiResponse<UploadTask>>('/api/upload-task/create', {
    method: 'POST',
    data: body,
  }).then(unwrap);
}

// ----- 阶段共用 -----

export async function getStageQuestions(
  taskId: string,
  stage: StageKey,
): Promise<TaskQuestion[]> {
  return request<ApiResponse<TaskQuestion[]>>(
    `/api/upload-task/${taskId}/stage/${stage}/questions`,
    { method: 'GET' },
  ).then(unwrap);
}

// ----- 质量检测 -----

export async function confirmQualityKeep(
  taskId: string,
  questionIds: string[],
): Promise<void> {
  return request<ApiResponse<void>>('/api/upload-task/quality/keep', {
    method: 'POST',
    data: { taskId, questionIds },
  }).then(unwrap);
}

export async function confirmQualityReject(
  taskId: string,
  questionIds: string[],
  reason: string,
): Promise<void> {
  return request<ApiResponse<void>>('/api/upload-task/quality/reject', {
    method: 'POST',
    data: { taskId, questionIds, reason },
  }).then(unwrap);
}

// ----- 解析审核 -----

export async function updateParsedFields(
  taskId: string,
  questionId: string,
  patch: Partial<TaskQuestion>,
): Promise<TaskQuestion> {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/parse-review/update',
    { method: 'POST', data: { taskId, questionId, patch } },
  ).then(unwrap);
}

export async function regenerateParse(
  taskId: string,
  questionId: string,
): Promise<TaskQuestion> {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/parse-review/regenerate',
    { method: 'POST', data: { taskId, questionId } },
  ).then(unwrap);
}

export async function confirmParseReview(
  taskId: string,
  questionIds: string[],
): Promise<void> {
  return request<ApiResponse<void>>(
    '/api/upload-task/parse-review/confirm',
    { method: 'POST', data: { taskId, questionIds } },
  ).then(unwrap);
}

// ----- 打标审核 -----

export async function updateTags(
  taskId: string,
  questionId: string,
  tags: NonNullable<TaskQuestion['tags']>,
): Promise<TaskQuestion> {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/tag-review/update',
    { method: 'POST', data: { taskId, questionId, tags } },
  ).then(unwrap);
}

export async function regenerateTags(
  taskId: string,
  questionId: string,
): Promise<TaskQuestion> {
  return request<ApiResponse<TaskQuestion>>(
    '/api/upload-task/tag-review/regenerate',
    { method: 'POST', data: { taskId, questionId } },
  ).then(unwrap);
}

export async function confirmTagReview(
  taskId: string,
  questionIds: string[],
): Promise<void> {
  return request<ApiResponse<void>>(
    '/api/upload-task/tag-review/confirm',
    { method: 'POST', data: { taskId, questionIds } },
  ).then(unwrap);
}

// ----- 系统态阶段 -----

export async function advanceSystemStage(
  taskId: string,
  stage: StageKey,
): Promise<UploadTask> {
  return request<ApiResponse<UploadTask>>('/api/upload-task/advance', {
    method: 'POST',
    data: { taskId, stage },
  }).then(unwrap);
}

// ----- 渠道分发 -----

export async function getDistributeConfig(
  taskId: string,
): Promise<DistributeConfig | null> {
  return request<ApiResponse<DistributeConfig | null>>(
    `/api/upload-task/${taskId}/distribute`,
    { method: 'GET' },
  ).then(unwrap);
}

export async function saveDistributeConfig(
  config: DistributeConfig,
): Promise<UploadTask> {
  return request<ApiResponse<UploadTask>>(
    '/api/upload-task/distribute/save',
    { method: 'POST', data: config },
  ).then(unwrap);
}
```

- [ ] **Step 2: 类型检查（GREEN：所有调用方都改为 `T` 返回值）**

Run: `npx tsc --noEmit`
Expected: PASS。

注意：Phase 1 占位页 `src/pages/UploadTask/List/index.tsx` 与 `Stage/index.tsx` 都没有调 service，所以不会有 caller 类型不匹配。如果你在 Phase 1 之外手动加了调用代码，需要相应去掉 `.data` 解构（service 已直接返回 `T`）。

- [ ] **Step 3: dev server 启动确认（service 文件改动是否破坏构建）**

Run: `npm run dev`
打开 `http://localhost:8000/question-bank/upload`
Expected:
- 占位页正常渲染
- 终端无编译错误
- F12 Console 仍可手动 `fetch('/api/upload-task/list')` 验证 mock 工作（service 层不影响裸 fetch）

> 完整 service 调用链路验证延后到 Phase 3：当列表页接入 `getUploadTasks()` 时，自然会触发 unwrap。如果届时 mock 返回 `{success:false}`，service 会 throw 中文 Error，组件 `message.error(e.message)` 即可提示。

按 Ctrl+C 停止。

- [ ] **Step 4: 提交**

```bash
git add src/services/uploadTask.ts
git commit -m "refactor(uploadTask): unwrap ApiResponse in service layer"
```

---

## Phase 2 收尾检查

完成 Task 5–9 之后，仓库状态应满足：

- `mock/uploadTask.ts` 存在，约 700+ 行，含状态机 + 10 个样本任务 + 全部 13 条 mock 路由
- `src/services/uploadTask.ts` 所有函数返回 `Promise<T>`（unwrap 后），不再返回 `ApiResponse<T>`
- `npx tsc --noEmit` PASS
- 浏览器 devtools 可调 13 条路由全部返回合法响应，状态机推进逻辑工作正常
- `/question-bank/upload` 仍然是 Phase 1 的占位页（Phase 3 才会接入数据）

Phase 3 将基于 Phase 2 的 service 完成列表页、阶段子页、3 套工作区模板与新建 Modal。

## Phase 3 — 列表页

### Task 10: 5 张状态桶汇总卡（`SummaryCards.tsx`）

**Files:**
- Create: `src/pages/UploadTask/List/SummaryCards.tsx`

纯展示组件，无 API 调用：把 5 个桶（`all / pending-human / processing / published / rejected`）
渲染成可点击的卡片。点中的桶用 2px 彩色边框高亮，其余卡片用浅灰 1px 边框。计数从
父组件的 `bucketCounts` 透传过来，由 Task 13 的列表 `request` 同步写入。

- [ ] **Step 1: 创建文件 `src/pages/UploadTask/List/SummaryCards.tsx`**

```tsx
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FolderOpenOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Card, Col, Row } from 'antd';
import React from 'react';
import { BUCKET_DEFS } from '../constants';
import type { BucketKey } from '../types';

interface SummaryCardsProps {
  bucketCounts: Record<BucketKey, number>;
  active: BucketKey;
  onChange: (key: BucketKey) => void;
}

const ICONS: Record<BucketKey, React.ReactNode> = {
  all: <FolderOpenOutlined />,
  'pending-human': <ClockCircleOutlined />,
  processing: <SyncOutlined />,
  published: <CheckCircleOutlined />,
  rejected: <CloseCircleOutlined />,
};

const SummaryCards: React.FC<SummaryCardsProps> = ({
  bucketCounts,
  active,
  onChange,
}) => {
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      {BUCKET_DEFS.map((bucket) => {
        const isActive = active === bucket.key;
        return (
          <Col span={4} key={bucket.key}>
            <Card
              hoverable
              onClick={() => onChange(bucket.key)}
              styles={{ body: { padding: 16 } }}
              style={{
                border: isActive
                  ? `2px solid ${bucket.color}`
                  : '1px solid #f0f0f0',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      color: bucket.color,
                      lineHeight: 1.2,
                    }}
                  >
                    {bucketCounts[bucket.key] ?? 0}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    {bucket.label}
                  </div>
                </div>
                <div style={{ fontSize: 24, color: bucket.color, opacity: 0.6 }}>
                  {ICONS[bucket.key]}
                </div>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default SummaryCards;
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS。该组件只引用了 Phase 1 已落地的 `BUCKET_DEFS` 与 `BucketKey`。

> 注：本组件还没被任何页面挂载，dev-server 跑了也看不到画面；视觉验证统一推到 Task 13。

- [ ] **Step 3: 提交**

```bash
git add src/pages/UploadTask/List/SummaryCards.tsx
git commit -m "feat(UploadTask): add SummaryCards for 5 status buckets"
```

---

### Task 11: 8 段流水线进度条（`ProgressBar.tsx`）

**Files:**
- Create: `src/pages/UploadTask/List/ProgressBar.tsx`

把 `task.stageProgress` 在列表里以"8 个 4px 高小段 + 一行 summary 文案"展示。
颜色映射来自 Phase 1 的 `STAGE_STATE_COLORS`，每段挂 Tooltip 显示阶段中文名 +
中文状态。

- [ ] **Step 1: 创建文件 `src/pages/UploadTask/List/ProgressBar.tsx`**

```tsx
import { Tooltip, Typography } from 'antd';
import React from 'react';
import {
  STAGE_KEYS,
  STAGE_LABELS,
  STAGE_STATE_COLORS,
} from '../constants';
import type { StageState, UploadTask } from '../types';

interface ProgressBarProps {
  task: UploadTask;
}

const STATE_LABELS: Record<StageState, string> = {
  pending: '未开始',
  processing: '进行中',
  done: '已完成',
  rejected: '已拒绝',
};

const ProgressBar: React.FC<ProgressBarProps> = ({ task }) => {
  const currentProgress = task.stageProgress[task.currentStage];
  const currentSummary =
    currentProgress?.summary ??
    (currentProgress?.state === 'rejected' ? '已拒绝' : '进行中');

  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
        {STAGE_KEYS.map((stage) => {
          const sp = task.stageProgress[stage];
          const state: StageState = sp?.state ?? 'pending';
          return (
            <Tooltip
              key={stage}
              title={`${STAGE_LABELS[stage]} · ${STATE_LABELS[state]}`}
            >
              <div
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: STAGE_STATE_COLORS[state],
                }}
              />
            </Tooltip>
          );
        })}
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {STAGE_LABELS[task.currentStage]} · {currentSummary}
      </Typography.Text>
    </div>
  );
};

export default ProgressBar;
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS。

- [ ] **Step 3: 提交**

```bash
git add src/pages/UploadTask/List/ProgressBar.tsx
git commit -m "feat(UploadTask): add 8-segment pipeline ProgressBar"
```

---

### Task 12: 新建任务弹窗（`NewTaskModal.tsx`）

**Files:**
- Create: `src/pages/UploadTask/List/NewTaskModal.tsx`

单步表单，5 字段（任务名 / Word 文件 / 科目 / 年级段 / 来源类型 / 批次）。
Word 文件用 `<Upload beforeUpload={() => false}>` 拦截真上传，只把文件名读出来塞进
form state（提交时一并传给 `createUploadTask`）。来源为"改编 / 引用"时联动出现
`sourceNote` 输入框。

- [ ] **Step 1: 创建文件 `src/pages/UploadTask/List/NewTaskModal.tsx`**

```tsx
import { UploadOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import React, { useState } from 'react';
import { createUploadTask } from '@/services/uploadTask';
import type { Grade, Source, Subject } from '../types';

interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  name: string;
  upload?: UploadFile[];
  subject: Subject;
  grade: Grade;
  source: Source;
  sourceNote?: string;
  batch: string;
}

const SUBJECT_OPTIONS: Subject[] = [
  '语文', '数学', '英语', '物理', '化学',
  '生物', '历史', '地理', '政治',
];
const GRADE_OPTIONS: Grade[] = ['小学', '初中', '高中'];
const SOURCE_OPTIONS: Source[] = ['原创', '改编', '引用'];

const NewTaskModal: React.FC<NewTaskModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const source = Form.useWatch('source', form);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const fileName = values.upload?.[0]?.name;
      if (!fileName) {
        message.error('请选择 Word 文件');
        return;
      }
      setSubmitting(true);
      await createUploadTask({
        name: values.name,
        fileName,
        subject: values.subject,
        grade: values.grade,
        source: values.source,
        sourceNote: values.sourceNote,
        batch: values.batch,
      });
      message.success('任务创建成功');
      form.resetFields();
      onSuccess();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="新建上传任务"
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="创建"
      cancelText="取消"
      destroyOnClose
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ source: '原创' }}
        preserve={false}
      >
        <Form.Item
          name="name"
          label="任务名"
          rules={[
            { required: true, message: '请输入任务名' },
            { min: 2, message: '任务名至少 2 个字符' },
          ]}
        >
          <Input placeholder="例如：2024 秋季高一物理周练 A" maxLength={60} />
        </Form.Item>

        <Form.Item
          name="upload"
          label="Word 文件"
          valuePropName="fileList"
          getValueFromEvent={(e) =>
            Array.isArray(e) ? e : e?.fileList?.slice(-1) ?? []
          }
          rules={[
            {
              validator: (_rule, value: UploadFile[] | undefined) => {
                if (value && value.length > 0) return Promise.resolve();
                return Promise.reject(new Error('请选择 Word 文件'));
              },
            },
          ]}
        >
          <Upload accept=".docx" maxCount={1} beforeUpload={() => false}>
            <Button icon={<UploadOutlined />}>选择 .docx 文件</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          name="subject"
          label="科目"
          rules={[{ required: true, message: '请选择科目' }]}
        >
          <Select
            placeholder="请选择"
            options={SUBJECT_OPTIONS.map((v) => ({ label: v, value: v }))}
          />
        </Form.Item>

        <Form.Item
          name="grade"
          label="年级段"
          rules={[{ required: true, message: '请选择年级段' }]}
        >
          <Select
            placeholder="请选择"
            options={GRADE_OPTIONS.map((v) => ({ label: v, value: v }))}
          />
        </Form.Item>

        <Form.Item
          name="source"
          label="来源类型"
          rules={[{ required: true, message: '请选择来源类型' }]}
        >
          <Radio.Group>
            {SOURCE_OPTIONS.map((s) => (
              <Radio key={s} value={s}>
                {s}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        {source && source !== '原创' && (
          <Form.Item
            name="sourceNote"
            label="来源说明"
            rules={[{ required: true, message: '请填写来源说明' }]}
          >
            <Input placeholder="例如：改编自 2023 年某校期中卷第 12 题" />
          </Form.Item>
        )}

        <Form.Item
          name="batch"
          label="批次"
          rules={[{ required: true, message: '请输入批次号' }]}
        >
          <Input placeholder="例如：2024-12-A" maxLength={32} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default NewTaskModal;
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS。`createUploadTask` 在 Phase 2 已经解封装为返回 `UploadTask`，
本组件不需要再读 `.data`。

- [ ] **Step 3: 提交**

```bash
git add src/pages/UploadTask/List/NewTaskModal.tsx
git commit -m "feat(UploadTask): add NewTaskModal for upload task creation"
```

---

### Task 13: 列表主页（`List/index.tsx`）—— dev-server 第一次能跑完整页面

**Files:**
- Modify: `src/pages/UploadTask/List/index.tsx`（替换 Phase 1 Task 4 的占位）

把 SummaryCards / ProgressBar / NewTaskModal 装配到 ProTable 上。请求驱动桶切换：
`params.status = filterStatus`（'all' 时传 undefined），ProTable 监听到 params 变化
自动 reload。`bucketCounts` 跟着列表响应一起拿，写回 state 喂给 SummaryCards。
操作列严格按 §6 操作矩阵覆盖全部 5 种 status。

- [ ] **Step 1: 替换 `src/pages/UploadTask/List/index.tsx` 为完整实现**

```tsx
import { PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Space, Tag, message } from 'antd';
import React, { useRef, useState } from 'react';
import {
  advanceSystemStage,
  getUploadTasks,
} from '@/services/uploadTask';
import { STAGE_LABELS } from '../constants';
import type { BucketKey, TaskStatus, UploadTask } from '../types';
import NewTaskModal from './NewTaskModal';
import ProgressBar from './ProgressBar';
import SummaryCards from './SummaryCards';

const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  'pending-human': { label: '待人工处理', color: 'orange' },
  processing: { label: '系统处理中', color: 'blue' },
  published: { label: '已发布', color: 'green' },
  distributed: { label: '已分发', color: 'green' },
  rejected: { label: '已拒绝/退回', color: 'red' },
};

const EMPTY_BUCKET_COUNTS: Record<BucketKey, number> = {
  all: 0,
  'pending-human': 0,
  processing: 0,
  published: 0,
  rejected: 0,
};

const UploadTaskList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [filterStatus, setFilterStatus] = useState<BucketKey>('all');
  const [bucketCounts, setBucketCounts] =
    useState<Record<BucketKey, number>>(EMPTY_BUCKET_COUNTS);
  const [newOpen, setNewOpen] = useState(false);

  const handleAdvance = async (task: UploadTask) => {
    try {
      await advanceSystemStage(task.id, task.currentStage);
      message.success('已推进到下一阶段');
      actionRef.current?.reload();
    } catch (err) {
      if (err instanceof Error) message.error(err.message);
    }
  };

  const renderActions = (record: UploadTask): React.ReactNode => {
    const stagePath = `/question-bank/upload/${record.id}/${record.currentStage}`;
    const distributePath = `/question-bank/upload/${record.id}/distribute`;

    switch (record.status) {
      case 'pending-human':
        return (
          <Space size="middle">
            <a onClick={() => history.push(stagePath)}>进入处理</a>
            <a onClick={() => history.push(`${stagePath}?readOnly=1`)}>详情</a>
          </Space>
        );
      case 'processing':
        return (
          <Space size="middle">
            <a onClick={() => history.push(stagePath)}>查看进度</a>
            <a onClick={() => handleAdvance(record)}>立即完成（演示）</a>
          </Space>
        );
      case 'published':
        return (
          <Space size="middle">
            <a onClick={() => history.push(distributePath)}>配置分发</a>
            <a onClick={() => history.push(`${stagePath}?readOnly=1`)}>详情</a>
          </Space>
        );
      case 'distributed':
        return (
          <Space size="middle">
            <a onClick={() => history.push(`${distributePath}?readOnly=1`)}>
              查看分发
            </a>
            <a onClick={() => history.push(`${stagePath}?readOnly=1`)}>详情</a>
          </Space>
        );
      case 'rejected':
        return (
          <Space size="middle">
            <a onClick={() => history.push(`${stagePath}?readOnly=1`)}>
              查看原因
            </a>
          </Space>
        );
      default:
        return null;
    }
  };

  const columns: ProColumns<UploadTask>[] = [
    {
      title: '任务名',
      dataIndex: 'name',
      render: (_dom, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>
            {record.subject} · {record.grade} · {record.totalQuestions}题
          </div>
        </div>
      ),
    },
    {
      title: '当前阶段',
      dataIndex: 'currentStage',
      width: 120,
      render: (_dom, record) => (
        <Tag color={STATUS_META[record.status].color}>
          {STAGE_LABELS[record.currentStage]}
        </Tag>
      ),
    },
    {
      title: '流水线进度',
      dataIndex: 'stageProgress',
      width: 260,
      render: (_dom, record) => <ProgressBar task={record} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (_dom, record) => {
        const meta = STATUS_META[record.status];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 170,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_dom, record) => renderActions(record),
    },
  ];

  return (
    <PageContainer>
      <SummaryCards
        bucketCounts={bucketCounts}
        active={filterStatus}
        onChange={setFilterStatus}
      />
      <ProTable<UploadTask>
        headerTitle="上传任务"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        params={{ status: filterStatus }}
        columns={columns}
        request={async (params) => {
          const resp = await getUploadTasks({
            current: params.current,
            pageSize: params.pageSize,
            status: filterStatus === 'all' ? undefined : filterStatus,
          });
          setBucketCounts(resp.bucketCounts);
          return {
            data: resp.data,
            total: resp.total,
            success: true,
          };
        }}
        toolBarRender={() => [
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setNewOpen(true)}
          >
            新建上传任务
          </Button>,
        ]}
      />
      <NewTaskModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSuccess={() => {
          setNewOpen(false);
          actionRef.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default UploadTaskList;
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS。

- [ ] **Step 3: 启动 dev server 验证**

Run: `npm run dev`
打开 `http://localhost:8000/question-bank/upload`

Expected:
1. 顶部 5 张汇总卡，"全部任务"卡显示 10（Phase 2 mock 初始 10 个任务），其余 4 张
   按桶分布有非零计数（例如 待人工 3、处理中 2、已发布 5、拒绝 0）。
2. 下面 ProTable 显示第一页 10 行，每行包含：任务名 + 副标题、当前阶段 Tag、
   8 段进度条（绿/橙/灰组合）、状态 Tag、更新时间、操作列。
3. 点"待人工处理"卡 → 表格自动 reload，只剩状态为待人工处理的行；卡片高亮变橙边。
4. 点"全部任务"卡回到全集。
5. 点右上"新建上传任务" → 弹窗打开。填入：任务名"测试任务"、选一个 .docx 文件、
   科目"数学"、年级"高中"、来源"原创"、批次"2024-12-T" → 点"创建" → message
   提示"任务创建成功"，弹窗关闭，列表 reload，新行出现在"待人工处理"桶顶部。
6. 找一行 status='系统处理中' 的任务，点操作列"立即完成（演示）" → message 提示
   "已推进到下一阶段"，该行进度条向后推进一段，状态可能切到其它桶。
7. 按 Ctrl+C 停止 dev server。

- [ ] **Step 4: 提交**

```bash
git add src/pages/UploadTask/List/index.tsx
git commit -m "feat(UploadTask): wire up list page with cards, table and modal"
```

---

## Phase 4 — 工作区模板 + 键盘 Hook

### Task 14: 抽取共享键盘导航 hook + 改造 QuestionTagging

**Files:**
- Create: `src/hooks/useQuestionNavKeyboard.ts`
- Modify: `src/pages/QuestionTagging/index.tsx`

抽出 `QuestionTagging/index.tsx` 里写死的键盘 `useEffect`（`↑↓` 切题、`Ctrl/Cmd+Enter`
保存并跳下一题）到独立 hook，新页面 `QuestionAudit` 可直接复用，避免复制粘贴。同时改造
`QuestionTagging` 让它也用同一个 hook，保证只有一份键盘逻辑实现。

- [ ] **Step 1: 创建 `src/hooks/useQuestionNavKeyboard.ts`**

`src/hooks/` 在仓库里尚未存在，需先建目录：

```bash
mkdir -p src/hooks
```

完整文件：

```typescript
import { useEffect } from 'react';

interface Options {
  enabled: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSaveNext?: () => void;
}

/**
 * 通用题目键盘导航 hook。
 *
 * - ↑ / ArrowUp   → onPrev
 * - ↓ / ArrowDown → onNext
 * - Ctrl/Cmd+Enter → onSaveNext（在 input/textarea/contentEditable 里也生效）
 *
 * 当焦点位于可编辑元素（INPUT / TEXTAREA / contentEditable）时，仅 Ctrl+Enter 透传，
 * 防止用户在输入框里按方向键意外切题。
 *
 * `enabled=false` 时整个 hook 不挂监听，对应只读模式。
 */
export function useQuestionNavKeyboard({
  enabled,
  onPrev,
  onNext,
  onSaveNext,
}: Options): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isEditable) {
        // 仅 Ctrl/Cmd+Enter 在可编辑元素里也透传，其余键放回原行为
        if (!((e.metaKey || e.ctrlKey) && e.key === 'Enter')) return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNext();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onSaveNext?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onPrev, onNext, onSaveNext]);
}
```

- [ ] **Step 2: 读 `src/pages/QuestionTagging/index.tsx` 确认目标行**

Run: 用 Read 工具读 `src/pages/QuestionTagging/index.tsx` 行 1–10 和 行 210–240，
确认：
- 第 3 行：`import React, { useEffect, useMemo, useRef, useState } from 'react';`
- 第 215–235 行附近：以 `// 键盘快捷键` 注释开头、紧接 `useEffect(() => { ... }, [currentQuestionId, paperQuestions]);` 的整段代码块。
- 同时用 `grep -n "useEffect" src/pages/QuestionTagging/index.tsx` 确认文件里**至少**还有 1 处其他 `useEffect`（应该有：行 108 的"初始化默认选中"那段）。如有 → 保留 `useEffect` import；若没有其他 `useEffect` → 把第 3 行 import 里的 `useEffect,` 删掉。**预期：保留（行 108 还在用）。**

- [ ] **Step 3: 把内联 `useEffect` 替换为 `useQuestionNavKeyboard` 调用**

Edit `src/pages/QuestionTagging/index.tsx`：

`old_string`（保留前后注释作为锚点，从"// 键盘快捷键"到 `useEffect` 闭合行的 `}, [...]);`，包含尾部空行，**注意：缩进就是文件里的实际缩进，请按 Read 的结果原样复制；下面块内为示意**）：

```typescript
  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 上下键切换试题
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      }
      // Ctrl+Enter 保存并下一题（通过 ref 调用表单验证）
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        taggingFormRef.current?.saveAndNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionId, paperQuestions]);
```

`new_string`：

```typescript
  // 键盘快捷键（抽到 useQuestionNavKeyboard 统一处理）
  useQuestionNavKeyboard({
    enabled: true,
    onPrev: handlePrevious,
    onNext: handleNext,
    onSaveNext: () => taggingFormRef.current?.saveAndNext(),
  });
```

- [ ] **Step 4: 在 import 区追加新 hook**

在 `src/pages/QuestionTagging/index.tsx` 顶部找到现有 import 块的末尾、`import './index.less';` 上方一行，插入：

```typescript
import { useQuestionNavKeyboard } from '@/hooks/useQuestionNavKeyboard';
```

（用 Edit 工具，`old_string` 取 `import './index.less';` 行的上一行 `import { FilterParams, Question } from './types';` 加上 `import './index.less';` 共 2 行作为锚点。）

`old_string`：

```typescript
import { FilterParams, Question } from './types';
import './index.less';
```

`new_string`：

```typescript
import { FilterParams, Question } from './types';
import { useQuestionNavKeyboard } from '@/hooks/useQuestionNavKeyboard';
import './index.less';
```

> prettier 的 `prettier-plugin-organize-imports` 会在下次 `npm run format` 时把它排到合适位置，无需手动调整顺序。

- [ ] **Step 5: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: dev server 烟雾测试（可选，但推荐）**

Run: `npm run dev`，浏览器打开 `http://localhost:8000/question-bank/tagging-fullscreen`。
- 在题目列表区按 ↑/↓ → 当前题应正常切换。
- 在右栏字段外按 Ctrl+Enter（macOS Cmd+Enter）→ 触发 `saveAndNext()`，跳到下一题。
- 焦点放在 `<Input>` 里按 ↑/↓ → **不应**切题（按方向键调光标）。
- 焦点放在 `<Input>` 里按 Cmd+Enter → 仍触发 saveAndNext。
Ctrl+C 停止。

- [ ] **Step 7: 提交**

```bash
git add src/hooks/useQuestionNavKeyboard.ts src/pages/QuestionTagging/index.tsx
git commit -m "refactor(QuestionTagging): extract keyboard nav into shared hook"
```

---

### Task 15: 工作区模板①——批量审核 `workspaces/BatchReview.tsx`

**Files:**
- Create: `src/pages/UploadTask/Stage/workspaces/BatchReview.tsx`

用于**质量检测**阶段，展示 "中间分段（mid-need-review）" 题目集，编辑可批量/单条
保留或删除，删除需填原因。所有 HTML 题干渲染必经 `sanitizeHtml()`。

- [ ] **Step 1: 确认 workspaces 目录存在**

```bash
mkdir -p src/pages/UploadTask/Stage/workspaces
```

- [ ] **Step 2: 创建 `BatchReview.tsx`**

```typescript
import {
  Alert,
  Button,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo, useState } from 'react';
import { sanitizeHtml } from '@/utils/sanitize';
import type { TaskQuestion } from '../../types';

export interface BatchReviewProps {
  questions: TaskQuestion[];
  summary: { autoPass: number; needReview: number; autoReject: number };
  onKeep: (ids: string[]) => Promise<void>;
  onReject: (ids: string[], reason: string) => Promise<void>;
  readOnly?: boolean;
}

function stemToPlainText(html: string): string {
  const text = html.replace(/<[^>]+>/g, '').trim();
  return text.length > 120 ? text.slice(0, 120) + '…' : text;
}

function scoreColor(score: number | undefined): string {
  if (score == null) return '#6b7280';
  if (score >= 80) return '#22c55e';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

const BatchReview: React.FC<BatchReviewProps> = ({
  questions,
  summary,
  onKeep,
  onReject,
  readOnly = false,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [previewQ, setPreviewQ] = useState<TaskQuestion | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{
    ids: string[];
    reason: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const visible = useMemo(
    () =>
      showAll
        ? questions
        : questions.filter((q) => q.qualityVerdict === 'mid-need-review'),
    [questions, showAll],
  );

  const total = questions.length;

  const handleKeep = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSubmitting(true);
    try {
      await onKeep(ids);
      setSelectedRowKeys((prev) => prev.filter((k) => !ids.includes(String(k))));
      message.success(`已保留 ${ids.length} 题`);
    } catch (e) {
      message.error((e as Error).message || '保留失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    const reason = rejectTarget.reason.trim();
    if (!reason) {
      message.warning('请填写删除原因');
      return;
    }
    setSubmitting(true);
    try {
      await onReject(rejectTarget.ids, reason);
      setSelectedRowKeys((prev) =>
        prev.filter((k) => !rejectTarget.ids.includes(String(k))),
      );
      message.success(`已删除 ${rejectTarget.ids.length} 题`);
      setRejectTarget(null);
    } catch (e) {
      message.error((e as Error).message || '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<TaskQuestion> = [
    {
      title: '题号',
      dataIndex: 'index',
      width: 80,
      render: (idx: number) => `Q${idx}`,
    },
    {
      title: '题干预览',
      dataIndex: 'stem',
      render: (_: string, q) => (
        <Space size={8}>
          <span>{stemToPlainText(q.stem)}</span>
          <Button type="link" size="small" onClick={() => setPreviewQ(q)}>
            查看全文
          </Button>
        </Space>
      ),
    },
    {
      title: '评分',
      dataIndex: 'qualityScore',
      width: 80,
      render: (s: number | undefined) => (
        <span style={{ color: scoreColor(s), fontWeight: 600 }}>
          {s ?? '-'}
        </span>
      ),
    },
    {
      title: '扣分明细',
      dataIndex: 'qualityDeductions',
      render: (_: unknown, q) => (
        <Space size={[4, 4]} wrap>
          {(q.qualityDeductions ?? []).map((d, i) => (
            <Tag key={i} color="orange">
              {d.rule}(-{d.points})
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      width: 160,
      render: (_: unknown, q) => (
        <Space>
          <Button
            size="small"
            disabled={readOnly || submitting}
            onClick={() => handleKeep([q.id])}
          >
            保留
          </Button>
          <Button
            size="small"
            danger
            disabled={readOnly || submitting}
            onClick={() => setRejectTarget({ ids: [q.id], reason: '' })}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const selectedIds = selectedRowKeys.map((k) => String(k));

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Alert
        type="info"
        showIcon
        message={
          <span>
            共 {total} 题 · 自动通过 {summary.autoPass} · 待编辑确认{' '}
            {summary.needReview} · 自动拒绝 {summary.autoReject}
          </span>
        }
      />
      <Space>
        <Switch
          checkedChildren="显示全部"
          unCheckedChildren="仅待审"
          checked={showAll}
          onChange={setShowAll}
        />
        <span style={{ color: '#6b7280' }}>当前展示 {visible.length} 题</span>
      </Space>

      <Table<TaskQuestion>
        rowKey="id"
        size="middle"
        pagination={{ pageSize: 20, showSizeChanger: false }}
        rowSelection={
          readOnly
            ? undefined
            : {
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys),
              }
        }
        columns={columns}
        dataSource={visible}
      />

      {!readOnly && selectedIds.length > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: '#fff',
            borderTop: '1px solid #e5e7eb',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>选中 {selectedIds.length} 项</span>
          <Button
            type="primary"
            disabled={submitting}
            onClick={() => handleKeep(selectedIds)}
          >
            批量保留
          </Button>
          <Button
            danger
            disabled={submitting}
            onClick={() => setRejectTarget({ ids: selectedIds, reason: '' })}
          >
            批量删除（填原因）
          </Button>
        </div>
      )}

      {readOnly && (
        <div style={{ color: '#6b7280' }}>
          <Tag color="default">只读</Tag> 该阶段已审完，仅供查看
        </div>
      )}

      <Modal
        title={previewQ ? `Q${previewQ.index} 题干全文` : ''}
        open={!!previewQ}
        onCancel={() => setPreviewQ(null)}
        footer={null}
        width={720}
      >
        {previewQ && (
          <div
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewQ.stem) }}
          />
        )}
      </Modal>

      <Modal
        title="删除原因（必填）"
        open={!!rejectTarget}
        onCancel={() => setRejectTarget(null)}
        onOk={handleRejectConfirm}
        okText="确认删除"
        okButtonProps={{ danger: true, loading: submitting }}
      >
        <Input.TextArea
          rows={4}
          value={rejectTarget?.reason ?? ''}
          onChange={(e) =>
            setRejectTarget((prev) =>
              prev ? { ...prev, reason: e.target.value } : prev,
            )
          }
          placeholder="请填写删除原因，便于后续追溯"
        />
      </Modal>
    </div>
  );
};

export default BatchReview;
```

> 不可变模式说明：`setRejectTarget((prev) => prev ? { ...prev, reason: e.target.value } : prev)` 用展开运算符返回新对象；`setSelectedRowKeys((prev) => prev.filter(...))` 返回新数组。无任何就地修改。

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/pages/UploadTask/Stage/workspaces/BatchReview.tsx
git commit -m "feat(UploadTask): add BatchReview workspace template"
```

---

### Task 16: 工作区模板②——三栏精审 `workspaces/QuestionAudit.tsx`

**Files:**
- Create: `src/pages/UploadTask/Stage/workspaces/QuestionAudit.tsx`

用于**解析审核**（`mode='parse'`）和**打标审核**（`mode='tag'`）两个阶段。三栏布局：
左 280px（题目列表 + 筛选）/ 中 1fr（题目原文 + 低置信红框）/ 右 380px（编辑表单
+ 操作按钮）。键盘流接 Task 14 新建的 `useQuestionNavKeyboard`。

> 知识点 TreeSelect 数据源是 `getKnowledgeTree()`（`src/services/tagSystem.ts:52`），
> 它**没有**经过 Phase 2 拆包，回调拿到的是 `ApiResponse<KnowledgeNode[]>`，要 `.data`
> 取真实树。`KnowledgeNode` 字段是 `{ id, name, parentId, children? }`，需要映射成
> Antd TreeSelect 期望的 `{ title, value, key, children }`。

- [ ] **Step 1: 创建 `QuestionAudit.tsx`**

```typescript
import {
  Button,
  Checkbox,
  Form,
  Input,
  Radio,
  Rate,
  Select,
  Space,
  Spin,
  Tag,
  TreeSelect,
  message,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useQuestionNavKeyboard } from '@/hooks/useQuestionNavKeyboard';
import { getKnowledgeTree, type KnowledgeNode } from '@/services/tagSystem';
import { sanitizeHtml } from '@/utils/sanitize';
import type { TaskQuestion } from '../../types';

export interface QuestionAuditProps {
  questions: TaskQuestion[];
  mode: 'parse' | 'tag';
  onUpdate: (q: TaskQuestion, patch: Partial<TaskQuestion>) => Promise<void>;
  onRegenerate: (q: TaskQuestion) => Promise<void>;
  onConfirm: (ids: string[]) => Promise<void>;
  readOnly?: boolean;
}

interface TreeNode {
  title: string;
  value: string;
  key: string;
  children?: TreeNode[];
}

const QUESTION_TYPE_OPTIONS = ['单选', '多选', '填空', '解答', '判断'];
const COGNITION_OPTIONS = ['识记', '理解', '应用', '分析', '评价', '创造'];
const PARSE_FIELDS: Array<'stem' | 'options' | 'answer' | 'analysis'> = [
  'stem',
  'options',
  'answer',
  'analysis',
];
const PARSE_FIELD_LABELS: Record<(typeof PARSE_FIELDS)[number], string> = {
  stem: '题干',
  options: '选项',
  answer: '答案',
  analysis: '解析',
};

function mapKnowledgeNodes(nodes: KnowledgeNode[]): TreeNode[] {
  return nodes.map((n) => ({
    title: n.name,
    value: n.id,
    key: n.id,
    children: n.children ? mapKnowledgeNodes(n.children) : undefined,
  }));
}

function isReviewed(q: TaskQuestion, mode: 'parse' | 'tag'): boolean {
  return mode === 'parse' ? !!q.parseReviewed : !!q.tagReviewed;
}

function fieldFrameStyle(confidence: number | undefined): React.CSSProperties {
  const low = confidence != null && confidence < 0.8;
  return {
    border: low ? '2px solid #f5222d' : '1px solid transparent',
    padding: 4,
    borderRadius: 4,
    marginBottom: 8,
  };
}

const QuestionAudit: React.FC<QuestionAuditProps> = ({
  questions,
  mode,
  onUpdate,
  onRegenerate,
  onConfirm,
  readOnly = false,
}) => {
  const [currentId, setCurrentId] = useState<string>(questions[0]?.id ?? '');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'reviewed'>(
    'all',
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<TaskQuestion | null>(null);
  const [kpTree, setKpTree] = useState<TreeNode[]>([]);
  const [regenLoading, setRegenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // 同步当前题到 draft
  useEffect(() => {
    const cur = questions.find((q) => q.id === currentId);
    setDraft(cur ? { ...cur } : null);
  }, [currentId, questions]);

  // 首次或题目集合变化时确保 currentId 有效
  useEffect(() => {
    if (questions.length === 0) {
      setCurrentId('');
      return;
    }
    if (!questions.find((q) => q.id === currentId)) {
      setCurrentId(questions[0].id);
    }
  }, [questions, currentId]);

  // 拉知识点树（仅 tag 模式需要）
  useEffect(() => {
    if (mode !== 'tag') return;
    getKnowledgeTree()
      .then((res) => {
        if (res?.success && res.data) setKpTree(mapKnowledgeNodes(res.data));
      })
      .catch(() => {
        // 静默失败，TreeSelect 显示空树即可，避免页面崩溃
      });
  }, [mode]);

  const filtered = useMemo(() => {
    if (filterMode === 'all') return questions;
    if (filterMode === 'pending')
      return questions.filter((q) => !isReviewed(q, mode));
    return questions.filter((q) => isReviewed(q, mode));
  }, [questions, filterMode, mode]);

  const reviewedCount = useMemo(
    () => questions.filter((q) => isReviewed(q, mode)).length,
    [questions, mode],
  );
  const pendingCount = questions.length - reviewedCount;

  const navTo = (offset: number) => {
    if (questions.length === 0) return;
    const idx = questions.findIndex((q) => q.id === currentId);
    if (idx < 0) return;
    const next = idx + offset;
    if (next < 0 || next >= questions.length) return;
    setCurrentId(questions[next].id);
  };

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    const original = questions.find((q) => q.id === draft.id);
    if (!original) return;
    setSaveLoading(true);
    try {
      const patch: Partial<TaskQuestion> =
        mode === 'parse'
          ? {
              stem: draft.stem,
              options: draft.options,
              answer: draft.answer,
              analysis: draft.analysis,
            }
          : { tags: draft.tags };
      await onUpdate(original, patch);
      message.success('已保存');
    } catch (e) {
      message.error((e as Error).message || '保存失败');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!draft) return;
    setRegenLoading(true);
    try {
      await onRegenerate(draft);
      message.success('已重新生成');
    } catch (e) {
      message.error((e as Error).message || '重新生成失败');
    } finally {
      setRegenLoading(false);
    }
  };

  const handleConfirm = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await onConfirm(ids);
      message.success(`已确认 ${ids.length} 题`);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (e) {
      message.error((e as Error).message || '确认失败');
    }
  };

  useQuestionNavKeyboard({
    enabled: !readOnly,
    onPrev: () => navTo(-1),
    onNext: () => navTo(+1),
    onSaveNext: async () => {
      await handleSave();
      navTo(+1);
    },
  });

  const current = questions.find((q) => q.id === currentId) ?? null;

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        minHeight: 0,
        background: '#f5f5f5',
      }}
    >
      {/* 左栏 */}
      <div
        style={{
          width: 280,
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
          <Radio.Group
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            size="small"
          >
            <Radio.Button value="all">全部 ({questions.length})</Radio.Button>
            <Radio.Button value="pending">待审 ({pendingCount})</Radio.Button>
            <Radio.Button value="reviewed">已审 ({reviewedCount})</Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((q) => {
            const reviewed = isReviewed(q, mode);
            const active = q.id === currentId;
            return (
              <div
                key={q.id}
                onClick={() => setCurrentId(q.id)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: active ? '#e6f4ff' : 'transparent',
                  borderLeft: active
                    ? '3px solid #1677ff'
                    : '3px solid transparent',
                }}
              >
                <Checkbox
                  checked={selectedIds.includes(q.id)}
                  disabled={readOnly}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setSelectedIds((prev) =>
                      e.target.checked
                        ? [...prev, q.id]
                        : prev.filter((id) => id !== q.id),
                    )
                  }
                />
                <span style={{ fontWeight: active ? 600 : 400 }}>
                  Q{q.index}
                </span>
                {q.tags?.questionType && (
                  <Tag color="blue">{q.tags.questionType}</Tag>
                )}
                {reviewed && <Tag color="green">✓</Tag>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 中栏 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
          padding: 16,
          background: '#fff',
          margin: '0 8px',
        }}
      >
        {!current && (
          <div style={{ color: '#9ca3af' }}>请选择左侧题目</div>
        )}
        {current && (
          <>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>
              Q{current.index} {current.tags?.questionType || ''}
            </div>
            <div style={fieldFrameStyle(current.parseConfidence?.stem)}>
              <div style={{ color: '#6b7280', marginBottom: 4 }}>题干</div>
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(current.stem),
                }}
              />
            </div>
            {current.options && current.options.length > 0 && (
              <div style={fieldFrameStyle(current.parseConfidence?.options)}>
                <div style={{ color: '#6b7280', marginBottom: 4 }}>选项</div>
                {current.options.map((opt, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <strong>{String.fromCharCode(65 + i)}. </strong>
                    <span
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt) }}
                    />
                  </div>
                ))}
              </div>
            )}
            <div style={fieldFrameStyle(current.parseConfidence?.answer)}>
              <div style={{ color: '#6b7280', marginBottom: 4 }}>答案</div>
              <div>{current.answer || '—'}</div>
            </div>
            <div style={fieldFrameStyle(current.parseConfidence?.analysis)}>
              <div style={{ color: '#6b7280', marginBottom: 4 }}>解析</div>
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(current.analysis ?? ''),
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* 右栏 */}
      <div
        style={{
          width: 380,
          background: '#fff',
          borderLeft: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {!draft && (
            <div style={{ color: '#9ca3af' }}>请选择左侧题目</div>
          )}
          {draft && mode === 'parse' && (
            <Form layout="vertical" disabled={readOnly}>
              {PARSE_FIELDS.map((field) => {
                const conf = draft.parseConfidence?.[field];
                const low = conf != null && conf < 0.8;
                const label = (
                  <span>
                    {PARSE_FIELD_LABELS[field]}
                    {conf != null && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: low ? '#f5222d' : '#9ca3af',
                          fontSize: 12,
                        }}
                      >
                        (置信度 {Math.round(conf * 100)}%)
                      </span>
                    )}
                  </span>
                );
                if (field === 'options') {
                  return (
                    <Form.Item
                      key={field}
                      label={label}
                      validateStatus={low ? 'warning' : ''}
                    >
                      {([0, 1, 2, 3] as const).map((i) => (
                        <Input
                          key={i}
                          style={{ marginBottom: 6 }}
                          addonBefore={String.fromCharCode(65 + i)}
                          value={draft.options?.[i] ?? ''}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    options: (prev.options ?? [
                                      '',
                                      '',
                                      '',
                                      '',
                                    ]).map((v, j) =>
                                      j === i ? e.target.value : v,
                                    ),
                                  }
                                : prev,
                            )
                          }
                        />
                      ))}
                    </Form.Item>
                  );
                }
                const isTextArea = field === 'stem' || field === 'analysis';
                return (
                  <Form.Item
                    key={field}
                    label={label}
                    validateStatus={low ? 'warning' : ''}
                  >
                    {isTextArea ? (
                      <Input.TextArea
                        rows={field === 'stem' ? 4 : 3}
                        value={(draft[field] as string | undefined) ?? ''}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev ? { ...prev, [field]: e.target.value } : prev,
                          )
                        }
                      />
                    ) : (
                      <Input
                        value={(draft[field] as string | undefined) ?? ''}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev ? { ...prev, [field]: e.target.value } : prev,
                          )
                        }
                      />
                    )}
                  </Form.Item>
                );
              })}
            </Form>
          )}
          {draft && mode === 'tag' && (
            <Form layout="vertical" disabled={readOnly}>
              <Form.Item label="知识点">
                <TreeSelect
                  multiple
                  treeData={kpTree}
                  value={draft.tags?.knowledgePoints ?? []}
                  treeDefaultExpandAll
                  placeholder="选择知识点"
                  onChange={(val: string[]) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tags: {
                              ...(prev.tags ?? { knowledgePoints: [] }),
                              knowledgePoints: val,
                            },
                          }
                        : prev,
                    )
                  }
                />
              </Form.Item>
              <Form.Item label="题型">
                <Select
                  value={draft.tags?.questionType}
                  options={QUESTION_TYPE_OPTIONS.map((v) => ({
                    label: v,
                    value: v,
                  }))}
                  onChange={(val) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tags: {
                              ...(prev.tags ?? { knowledgePoints: [] }),
                              questionType: val,
                            },
                          }
                        : prev,
                    )
                  }
                />
              </Form.Item>
              <Form.Item label="难度">
                <Rate
                  count={5}
                  value={draft.tags?.difficulty ?? 0}
                  onChange={(val) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tags: {
                              ...(prev.tags ?? { knowledgePoints: [] }),
                              difficulty: val as 1 | 2 | 3 | 4 | 5,
                            },
                          }
                        : prev,
                    )
                  }
                />
              </Form.Item>
              <Form.Item label="认知层次">
                <Select
                  value={draft.tags?.cognitionLevel}
                  options={COGNITION_OPTIONS.map((v) => ({
                    label: v,
                    value: v,
                  }))}
                  onChange={(val) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            tags: {
                              ...(prev.tags ?? { knowledgePoints: [] }),
                              cognitionLevel: val,
                            },
                          }
                        : prev,
                    )
                  }
                />
              </Form.Item>
            </Form>
          )}
        </div>
        <div
          style={{
            padding: 12,
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Space>
            <Button
              onClick={handleSave}
              loading={saveLoading}
              disabled={readOnly || !draft}
            >
              保存
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={readOnly || !draft || regenLoading}
            >
              {regenLoading ? <Spin size="small" /> : '重新生成'}
            </Button>
          </Space>
          <Button
            type="primary"
            disabled={readOnly || !current}
            onClick={() => current && handleConfirm([current.id])}
          >
            ✓ 确认通过
          </Button>
        </div>
      </div>

      {/* 底部状态条 */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: '#fff',
          borderTop: '1px solid #e5e7eb',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#6b7280',
        }}
      >
        <span>
          已审 {reviewedCount} / {questions.length} ·
          全部通过后自动推进。↑↓ 切题，Ctrl+Enter 保存下一题
          {readOnly && (
            <Tag color="default" style={{ marginLeft: 8 }}>
              只读
            </Tag>
          )}
        </span>
        {selectedIds.length > 0 && !readOnly && (
          <Button
            type="primary"
            size="small"
            onClick={() => handleConfirm(selectedIds)}
          >
            批量确认通过（{selectedIds.length}）
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuestionAudit;
```

> 不可变模式：所有 `setDraft` / `setSelectedIds` 都用 `prev => ({...prev, ...})` 或
> `[...prev, x]` / `prev.filter(...)` 生成新引用。`tags` 字段用嵌套展开
> `{ ...(prev.tags ?? { knowledgePoints: [] }), questionType: val }` 保证不破坏旧字段。

> 行数：此文件约 470 行，超过 spec 中"~250 行"的建议但落在 §10 允许的"400 行典型"范围内；
> 三列布局与多种字段组合在一处确实压缩不到 250 行。如果后续 reviewer 要求拆分，可把右栏
> 的 ParseEditor / TagEditor 抽到 `QuestionAuditPanels/` 子文件，但本阶段为减少新文件
> 数量先合在一起。

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

潜在报错及处理：
- 若提示 `getKnowledgeTree` 返回类型不匹配：检查实际签名 `request<ApiResponse<KnowledgeNode[]>>(...)` 返回 `Promise<ApiResponse<KnowledgeNode[]>>`，与代码里 `res.data` 用法一致。
- 若提示 `KnowledgeNode` 不存在：`@/services/tagSystem` 已 export，确认 import 路径。

- [ ] **Step 3: 提交**

```bash
git add src/pages/UploadTask/Stage/workspaces/QuestionAudit.tsx
git commit -m "feat(UploadTask): add QuestionAudit three-column workspace"
```

---

### Task 17: 工作区模板③——分发配置 `workspaces/DistributeForm.tsx`

**Files:**
- Create: `src/pages/UploadTask/Stage/workspaces/DistributeForm.tsx`

用于**渠道分发**（终态）阶段。两段式表单：分发范围 + 分发渠道。保存即视为终态，已配置
可点"修改"重新进入编辑态。`readOnly=true` 时全表单 disabled，按钮隐藏，仅展示当前配置。

- [ ] **Step 1: 创建 `DistributeForm.tsx`**

```typescript
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Form,
  Radio,
  Space,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useState } from 'react';
import type {
  DistributeConfig,
  Grade,
  Subject,
  UploadTask,
} from '../../types';

export interface DistributeFormProps {
  task: UploadTask;
  initial: DistributeConfig | null;
  onSave: (config: DistributeConfig) => Promise<void>;
  readOnly?: boolean;
}

const GRADE_OPTIONS: Grade[] = ['小学', '初中', '高中'];
const SUBJECT_OPTIONS: Subject[] = [
  '语文',
  '数学',
  '英语',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '政治',
];
const ROLE_OPTIONS: Array<{
  label: string;
  value: 'teacher' | 'student' | 'admin';
}> = [
  { label: '教师端', value: 'teacher' },
  { label: '学生端', value: 'student' },
  { label: '管理员端', value: 'admin' },
];
const CHANNEL_OPTIONS: Array<{
  value: 'paper-bank' | 'api' | 'export' | 'recommend';
  label: string;
  desc: string;
}> = [
  { value: 'paper-bank', label: '组卷库', desc: '进入组卷功能可选题池' },
  { value: 'api', label: 'API 开放', desc: '外部系统通过 API 调用' },
  { value: 'export', label: '题库导出', desc: '允许批量导出 Word/PDF/Excel' },
  { value: 'recommend', label: '推荐引擎', desc: '根据知识点自动推送给学生' },
];

interface FormValues {
  institutions: 'all' | 'partners' | 'internal';
  grades: Grade[];
  subjects: Subject[];
  roles: Array<'teacher' | 'student' | 'admin'>;
  validityMode: 'forever' | 'until';
  validUntil?: Dayjs;
  channels: Array<'paper-bank' | 'api' | 'export' | 'recommend'>;
}

function toInitialValues(initial: DistributeConfig | null): FormValues {
  if (!initial) {
    return {
      institutions: 'all',
      grades: [],
      subjects: [],
      roles: [],
      validityMode: 'forever',
      channels: [],
    };
  }
  return {
    institutions: initial.scope.institutions,
    grades: initial.scope.grades,
    subjects: initial.scope.subjects,
    roles: initial.scope.roles,
    validityMode: initial.scope.validUntil ? 'until' : 'forever',
    validUntil: initial.scope.validUntil
      ? dayjs(initial.scope.validUntil)
      : undefined,
    channels: initial.channels,
  };
}

const DistributeForm: React.FC<DistributeFormProps> = ({
  task,
  initial,
  onSave,
  readOnly = false,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [editing, setEditing] = useState<boolean>(!initial);
  const [submitting, setSubmitting] = useState(false);
  const [validityMode, setValidityMode] = useState<'forever' | 'until'>(
    initial?.scope.validUntil ? 'until' : 'forever',
  );

  const disabled = readOnly || (!editing && !!initial);

  const handleSubmit = async (vals: FormValues) => {
    // 校验
    if (!vals.institutions) {
      message.error('请选择机构范围');
      return;
    }
    if (vals.grades.length === 0) {
      message.error('请至少选择 1 个适用年级段');
      return;
    }
    if (vals.subjects.length === 0) {
      message.error('请至少选择 1 个适用科目');
      return;
    }
    if (vals.roles.length === 0) {
      message.error('请至少选择 1 个用户角色');
      return;
    }
    if (vals.channels.length === 0) {
      message.error('请至少选择 1 个分发渠道');
      return;
    }
    if (vals.validityMode === 'until' && !vals.validUntil) {
      message.error('请选择截止日期');
      return;
    }

    const config: DistributeConfig = {
      taskId: task.id,
      scope: {
        institutions: vals.institutions,
        grades: vals.grades,
        subjects: vals.subjects,
        roles: vals.roles,
        validUntil:
          vals.validityMode === 'until' && vals.validUntil
            ? vals.validUntil.format('YYYY-MM-DD')
            : undefined,
      },
      channels: vals.channels,
    };

    setSubmitting(true);
    try {
      await onSave(config);
      message.success('已保存分发配置');
      setEditing(false);
    } catch (e) {
      message.error((e as Error).message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '24px auto', padding: 16 }}>
      <h2 style={{ marginBottom: 16 }}>分发配置</h2>

      {initial?.configuredAt && (
        <Alert
          type="success"
          showIcon
          message={
            <Space>
              <span>
                已分发至 {initial.channels.length} 渠道 · 配置时间{' '}
                {initial.configuredAt}
              </span>
              {!readOnly && !editing && (
                <Button size="small" onClick={() => setEditing(true)}>
                  修改
                </Button>
              )}
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={toInitialValues(initial)}
        onFinish={handleSubmit}
        disabled={disabled}
        onValuesChange={(changed) => {
          if (changed.validityMode) setValidityMode(changed.validityMode);
        }}
      >
        <Divider orientation="left">第一步：分发范围</Divider>

        <Form.Item label="机构范围" name="institutions">
          <Radio.Group>
            <Radio value="all">全平台公开</Radio>
            <Radio value="partners">指定合作机构</Radio>
            <Radio value="internal">仅内部</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="适用年级段" name="grades">
          <Checkbox.Group
            options={GRADE_OPTIONS.map((v) => ({ label: v, value: v }))}
          />
        </Form.Item>

        <Form.Item label="适用科目" name="subjects">
          <Checkbox.Group
            options={SUBJECT_OPTIONS.map((v) => ({ label: v, value: v }))}
          />
        </Form.Item>

        <Form.Item label="用户角色" name="roles">
          <Checkbox.Group options={ROLE_OPTIONS} />
        </Form.Item>

        <Form.Item label="有效期" name="validityMode">
          <Radio.Group>
            <Radio value="forever">永久有效</Radio>
            <Radio value="until">设定截止日期</Radio>
          </Radio.Group>
        </Form.Item>

        {validityMode === 'until' && (
          <Form.Item label="截止日期" name="validUntil">
            <DatePicker style={{ width: 240 }} />
          </Form.Item>
        )}

        <Divider orientation="left">第二步：分发渠道</Divider>

        <Form.Item name="channels">
          <Checkbox.Group style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {CHANNEL_OPTIONS.map((c) => (
                <Checkbox key={c.value} value={c.value}>
                  <strong>{c.label}</strong>
                  <span style={{ marginLeft: 8, color: '#6b7280' }}>
                    {c.desc}
                  </span>
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </Form.Item>

        {!readOnly && editing && (
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
            >
              保存分发配置
            </Button>
            <Button
              disabled
              title="原型不支持草稿"
            >
              仅保存草稿
            </Button>
          </Space>
        )}
      </Form>
    </div>
  );
};

export default DistributeForm;
```

> 不可变模式：`Form` 内部自管表单状态，组件层不直接 mutate；`handleSubmit` 里 `config`
> 是新建对象。`dayjs` 已在仓库依赖中（Antd 5 默认使用 dayjs），无需新增。

> readOnly 时整个 Form 都 `disabled`，按钮区块整段不渲染；如果有 `initial`，依然渲染顶部
> Alert 摘要供查看。

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

潜在报错及处理：
- 若提示 `dayjs` 找不到：先 `npm ls dayjs`，Antd 5 默认依赖应已存在；缺失则
  `npm i dayjs` 后再 tsc。
- `Form<FormValues>` 泛型在某些 Antd 版本可能要求 `name`，本表单未给 `name`，
  形态正常无 warning，无需调整。

- [ ] **Step 3: 提交**

```bash
git add src/pages/UploadTask/Stage/workspaces/DistributeForm.tsx
git commit -m "feat(UploadTask): add DistributeForm workspace template"
```

---

### Task 18: 系统态展示卡 `workspaces/SystemStatus.tsx`

**Files:**
- Create: `src/pages/UploadTask/Stage/workspaces/SystemStatus.tsx`

用于 **重复检测 / AI 解析 / AI 打标 / 自动发布** 4 个系统态阶段。三种主显示模式：
处理中（Spin + 模拟立即完成按钮）/ 已完成（摘要 + 进入下一阶段按钮）/ 拒绝（错误条）。
`dedupe` 完成态额外列出重复题清单，"查看原题"弹 Modal 展示 sanitize 过的题干。

- [ ] **Step 1: 创建 `SystemStatus.tsx`**

```typescript
import { Alert, Button, Card, List, Modal, Space, Spin, Tag, message } from 'antd';
import React, { useMemo, useState } from 'react';
import {
  STAGE_LABELS,
  nextStageOf,
} from '../../constants';
import { sanitizeHtml } from '@/utils/sanitize';
import type { StageKey, StageProgress, TaskQuestion } from '../../types';

export interface SystemStatusProps {
  stage: 'dedupe' | 'parse' | 'tag' | 'publish';
  stageProgress: StageProgress;
  questions: TaskQuestion[];
  onAdvance: () => Promise<void>;
  onNext: () => void;
  readOnly?: boolean;
}

const SystemStatus: React.FC<SystemStatusProps> = ({
  stage,
  stageProgress,
  questions,
  onAdvance,
  onNext,
  readOnly = false,
}) => {
  const [advancing, setAdvancing] = useState(false);
  const [previewQ, setPreviewQ] = useState<TaskQuestion | null>(null);

  const stageLabel = STAGE_LABELS[stage];
  const nextStage: StageKey | null = nextStageOf(stage);

  const duplicates = useMemo(
    () => questions.filter((q) => !!q.duplicateOf),
    [questions],
  );

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      await onAdvance();
      message.success('已推进');
    } catch (e) {
      message.error((e as Error).message || '推进失败');
    } finally {
      setAdvancing(false);
    }
  };

  const renderProcessing = () => (
    <Space direction="vertical" align="center" size={16} style={{ width: '100%' }}>
      <h3 style={{ margin: 0 }}>{stageLabel} · 系统处理中…</h3>
      <Spin size="large" />
      <div style={{ color: '#6b7280' }}>共 {questions.length} 题待处理</div>
      <Button onClick={handleAdvance} loading={advancing} disabled={readOnly}>
        ⏵ 模拟立即完成（演示）
      </Button>
    </Space>
  );

  const renderDone = () => {
    const nextLabel = nextStage ? STAGE_LABELS[nextStage] : null;
    const nextButtonText =
      nextStage === 'distribute' ? '→ 配置分发渠道' : `→ 进入下一阶段：${nextLabel ?? ''}`;
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <h3 style={{ margin: 0 }}>
          {stageLabel} · <Tag color="success">✓ 已完成</Tag>
        </h3>
        {stageProgress.summary && (
          <div style={{ color: '#374151' }}>{stageProgress.summary}</div>
        )}
        {stageProgress.finishedAt && (
          <div style={{ color: '#6b7280' }}>
            完成时间 {stageProgress.finishedAt}
          </div>
        )}

        {stage === 'dedupe' && duplicates.length > 0 && (
          <Card size="small" title={`发现 ${duplicates.length} 道重复题`}>
            <List
              dataSource={duplicates}
              renderItem={(q) => (
                <List.Item
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      size="small"
                      onClick={() => setPreviewQ(q)}
                    >
                      查看原题
                    </Button>,
                  ]}
                >
                  Q{q.index} → 已关联到 {q.duplicateOf}
                </List.Item>
              )}
            />
          </Card>
        )}

        {nextStage && (
          <Button type="primary" onClick={onNext} disabled={readOnly}>
            {nextButtonText}
          </Button>
        )}
      </Space>
    );
  };

  const renderPending = () => (
    <div style={{ color: '#6b7280' }}>等待上一阶段完成…</div>
  );

  const renderRejected = () => (
    <Alert
      type="error"
      showIcon
      message={stageProgress.summary || '阶段被拒绝'}
    />
  );

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 16 }}>
      <Card>
        {stageProgress.state === 'processing' && renderProcessing()}
        {stageProgress.state === 'done' && renderDone()}
        {stageProgress.state === 'pending' && renderPending()}
        {stageProgress.state === 'rejected' && renderRejected()}
      </Card>

      <Modal
        title={previewQ ? `Q${previewQ.index} 原题` : ''}
        open={!!previewQ}
        onCancel={() => setPreviewQ(null)}
        footer={null}
        width={720}
      >
        {previewQ && (
          <div
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewQ.stem) }}
          />
        )}
      </Modal>
    </div>
  );
};

export default SystemStatus;
```

> 不可变模式：所有 state setter 都是新值直接传入，无字段 mutate。
> readOnly：`onAdvance` 按钮 disabled，`onNext` 按钮 disabled；其余仅展示，无写动作。

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/pages/UploadTask/Stage/workspaces/SystemStatus.tsx
git commit -m "feat(UploadTask): add SystemStatus workspace template"
```

---

## Phase 4 验收清单

- [ ] `src/hooks/useQuestionNavKeyboard.ts` 存在，签名与 spec §9 一致。
- [ ] `src/pages/QuestionTagging/index.tsx` 内联键盘 `useEffect` 已被替换为 hook 调用，原行为不变。
- [ ] `src/pages/UploadTask/Stage/workspaces/BatchReview.tsx` 存在并通过 tsc。
- [ ] `src/pages/UploadTask/Stage/workspaces/QuestionAudit.tsx` 存在并通过 tsc。
- [ ] `src/pages/UploadTask/Stage/workspaces/DistributeForm.tsx` 存在并通过 tsc。
- [ ] `src/pages/UploadTask/Stage/workspaces/SystemStatus.tsx` 存在并通过 tsc。
- [ ] 所有 `dangerouslySetInnerHTML` 出现处均通过 `sanitizeHtml()`（grep `dangerouslySetInnerHTML` 确认）。
- [ ] `npx tsc --noEmit` 整仓 PASS。
- [ ] QuestionTagging 全屏页打开 → ↑/↓ 切题、Cmd+Enter saveAndNext 仍正常。
- [ ] 可视检查（其他 3 套模板）留给 Phase 5 路由接入后再做。

## 已识别的歧义 / 后续 Phase 需注意的点

1. **`getKnowledgeTree()` 未拆包**：Phase 2 spec 只解封装 `uploadTask.ts` 的 service；
   `tagSystem.ts` 的 `getKnowledgeTree()` 仍返回 `Promise<ApiResponse<KnowledgeNode[]>>`。
   QuestionAudit 内手动 `.data` 取值。若 Phase 2 也连带拆了 `tagSystem.ts`，需要把
   QuestionAudit 里 `res?.success && res.data` 那段改成直接 `setKpTree(mapKnowledgeNodes(res))`。
2. **QuestionAudit.tsx ≈ 470 行**：超过 spec hard rule 提到的"~250 行"上限。三栏 + 两 mode
   的右栏表单一起写在单文件里确实压不下来；若 reviewer 要求严格 ≤ 250 行，需要后续把右栏
   `ParseEditor` / `TagEditor` 各自抽到子文件（`QuestionAudit/ParseEditor.tsx` 等），
   并把当前文件改成 < 200 行的容器。本阶段保留单文件结构以减少新增文件数。
3. **批量"批量确认通过"按钮**：放在底部状态条右侧。spec §9 提到"左栏勾选多题"也是批量
   入口，已通过左栏 Checkbox 选中后底部按钮可见的方式实现，无独立"批量"开关。
4. **`mode='tag'` 编辑表单**：spec 列出"课标 / 适用年级"两个字段，但 Phase 1 TaskQuestion
   类型里 `tags` 只声明了 `{ knowledgePoints, questionType, difficulty, cognitionLevel }`。
   为保持类型契约不破，本阶段只渲染这 4 个字段；课标/适用年级若要补需要先扩 `TaskQuestion.tags`
   类型（不在 Phase 4 范围）。
5. **dev-server 烟雾验证延后**：除 Task 14 的 QuestionTagging 回归外，3 套新模板的可视验证
   必须等 Phase 5 把它们接入路由后才能做；本阶段以 tsc 为准。
6. **质检 seed 数据契约（Task 6 已修订）**：
   - `currentStage === 'quality'` 的任务：AI 评分 + verdict 已生成；auto-pass → `qualityKept=true`，
     auto-reject → `qualityKept=false`，mid-need-review → `qualityKept=undefined`（等用户在 BatchReview 操作）。
   - `currentStage > 'quality'` 的任务：所有题都已落决策（中段题视为已人工通过）。
   - 因此 BatchReview 的"待编辑确认"队列在 quality 阶段直接非空，无需先 reject 才能演示批量保留/拒绝。

## Phase 5 — Stage 路由组装

### Task 19: 顶栏组件（`StageHeader.tsx`）

Create the persistent header rendered on every stage page. It shows the back button, task identity, and an 8-step `<Steps>` indicator that reflects `task.stageProgress` and lets users jump to any already-visited stage.

- [ ] **Step 19.1 — Create the file**
**File:** `src/pages/UploadTask/Stage/StageHeader.tsx`

```typescript
import { ArrowLeftOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Steps, Typography } from 'antd';
import React from 'react';
import { STAGE_LABELS, STAGE_KEYS } from '../constants';
import type { StageKey, UploadTask } from '../types';

const { Text } = Typography;

export interface StageHeaderProps {
  task: UploadTask;
  currentStage: StageKey;
  onRefresh: () => void;
}

const statusOf = (
  task: UploadTask,
  stage: StageKey,
  currentStage: StageKey,
): 'finish' | 'process' | 'error' | 'wait' => {
  const state = task.stageProgress[stage]?.state;
  if (state === 'done') return 'finish';
  if (state === 'rejected') return 'error';
  if (stage === currentStage) return 'process';
  return 'wait';
};

const StageHeader: React.FC<StageHeaderProps> = ({ task, currentStage }) => {
  const currentIdx = STAGE_KEYS.indexOf(currentStage);

  const items = STAGE_KEYS.map((s) => {
    const state = task.stageProgress[s]?.state;
    const clickable = state !== 'pending';
    return {
      title: STAGE_LABELS[s],
      status: statusOf(task, s, currentStage),
      onClick: clickable
        ? () => history.push(`/question-bank/upload/${task.id}/${s}`)
        : undefined,
      style: clickable ? { cursor: 'pointer' } : { cursor: 'not-allowed' },
    };
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 24px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
      }}
    >
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => history.push('/question-bank/upload')}
      >
        返回
      </Button>
      <div style={{ minWidth: 240 }}>
        <strong>{task.name}</strong>{' '}
        <Text type="secondary">
          {task.subject} · {task.grade} · {task.totalQuestions}题
        </Text>
      </div>
      <div style={{ flex: 1 }}>
        <Steps
          current={currentIdx}
          size="small"
          labelPlacement="vertical"
          items={items}
        />
      </div>
    </div>
  );
};

export default StageHeader;
```

- [ ] **Step 19.2 — TS check**
```bash
cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app
npx tsc --noEmit
```

**Expected:** PASS. `StageHeader` only depends on Phase 1 types/constants and Ant Design — both already exist.

- [ ] **Step 19.3 — Commit**
```bash
git add src/pages/UploadTask/Stage/StageHeader.tsx
git commit -m "feat(upload): add StageHeader with 8-step progress bar"
```

---

### Task 20: Stage 入口 + 阶段分发（`Stage/index.tsx`）

Replace the placeholder `Stage/index.tsx` with the real router-driven page. It reads `taskId` + `stage` from the URL, fetches the task, computes `readOnly`, and dispatches to one of 8 stage shells.

**Approach (compile-clean):** To keep every commit compilable, this task first scaffolds 8 stub stage files (`export default () => null`) before rewriting `Stage/index.tsx`. Task 21 then fills in each stub. This avoids the "expected fail" tsc situation.

- [ ] **Step 20.1 — Create 8 stub stage files**
Create directory `src/pages/UploadTask/Stage/stages/` and the 8 stub files inside. Each is the same shape:

**File:** `src/pages/UploadTask/Stage/stages/Quality.tsx`

```typescript
import React from 'react';
import type { UploadTask } from '../../types';

const Quality: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = () => null;

export default Quality;
```

**File:** `src/pages/UploadTask/Stage/stages/Dedupe.tsx`

```typescript
import React from 'react';
import type { UploadTask } from '../../types';

const Dedupe: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = () => null;

export default Dedupe;
```

**File:** `src/pages/UploadTask/Stage/stages/Parse.tsx`

```typescript
import React from 'react';
import type { UploadTask } from '../../types';

const Parse: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = () => null;

export default Parse;
```

**File:** `src/pages/UploadTask/Stage/stages/ParseReview.tsx`

```typescript
import React from 'react';
import type { UploadTask } from '../../types';

const ParseReview: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = () => null;

export default ParseReview;
```

**File:** `src/pages/UploadTask/Stage/stages/Tag.tsx`

```typescript
import React from 'react';
import type { UploadTask } from '../../types';

const Tag: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = () => null;

export default Tag;
```

**File:** `src/pages/UploadTask/Stage/stages/TagReview.tsx`

```typescript
import React from 'react';
import type { UploadTask } from '../../types';

const TagReview: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = () => null;

export default TagReview;
```

**File:** `src/pages/UploadTask/Stage/stages/Publish.tsx`

```typescript
import React from 'react';
import type { UploadTask } from '../../types';

const Publish: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = () => null;

export default Publish;
```

**File:** `src/pages/UploadTask/Stage/stages/Distribute.tsx`

```typescript
import React from 'react';
import type { UploadTask } from '../../types';

const Distribute: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = () => null;

export default Distribute;
```

- [ ] **Step 20.2 — Replace `Stage/index.tsx` with the real router page**
**File:** `src/pages/UploadTask/Stage/index.tsx` (replace the existing placeholder content entirely)

```typescript
import { history, useParams, useRequest, useSearchParams } from '@umijs/max';
import { Button, Empty, Spin } from 'antd';
import React, { useMemo } from 'react';
import { STAGE_KEYS, isValidStage } from '../constants';
import { getUploadTask } from '@/services/uploadTask';
import type { StageKey, UploadTask } from '../types';
import StageHeader from './StageHeader';
import Quality from './stages/Quality';
import Dedupe from './stages/Dedupe';
import Parse from './stages/Parse';
import ParseReview from './stages/ParseReview';
import Tag from './stages/Tag';
import TagReview from './stages/TagReview';
import Publish from './stages/Publish';
import Distribute from './stages/Distribute';

const renderStage = (
  stage: StageKey,
  task: UploadTask,
  onRefresh: () => void,
  readOnly: boolean,
) => {
  switch (stage) {
    case 'quality':
      return <Quality task={task} onRefresh={onRefresh} readOnly={readOnly} />;
    case 'dedupe':
      return <Dedupe task={task} onRefresh={onRefresh} readOnly={readOnly} />;
    case 'parse':
      return <Parse task={task} onRefresh={onRefresh} readOnly={readOnly} />;
    case 'parse-review':
      return (
        <ParseReview task={task} onRefresh={onRefresh} readOnly={readOnly} />
      );
    case 'tag':
      return <Tag task={task} onRefresh={onRefresh} readOnly={readOnly} />;
    case 'tag-review':
      return (
        <TagReview task={task} onRefresh={onRefresh} readOnly={readOnly} />
      );
    case 'publish':
      return <Publish task={task} onRefresh={onRefresh} readOnly={readOnly} />;
    case 'distribute':
      return (
        <Distribute task={task} onRefresh={onRefresh} readOnly={readOnly} />
      );
  }
};

const StagePage: React.FC = () => {
  const { taskId, stage: rawStage } = useParams<{
    taskId: string;
    stage: string;
  }>();
  const [searchParams] = useSearchParams();

  const { data: task, loading, refresh } = useRequest(
    () => getUploadTask(taskId!),
    { refreshDeps: [taskId] },
  );

  const readOnly = useMemo(() => {
    if (searchParams.get('readOnly') === '1') return true;
    if (!task || !rawStage || !isValidStage(rawStage)) return false;
    const stageIdx = STAGE_KEYS.indexOf(rawStage);
    const curIdx = STAGE_KEYS.indexOf(task.currentStage);
    return stageIdx !== curIdx;
  }, [searchParams, task, rawStage]);

  if (!rawStage || !isValidStage(rawStage)) {
    return <Empty description="无此阶段" style={{ marginTop: 80 }} />;
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 120 }}>
        <Spin />
      </div>
    );
  }

  if (!task) {
    return (
      <Empty description="任务不存在" style={{ marginTop: 80 }}>
        <Button
          type="primary"
          onClick={() => history.push('/question-bank/upload')}
        >
          返回任务列表
        </Button>
      </Empty>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <StageHeader task={task} currentStage={rawStage} onRefresh={refresh} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderStage(rawStage, task, refresh, readOnly)}
      </div>
    </div>
  );
};

export default StagePage;
```

- [ ] **Step 20.3 — TS check**
```bash
cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app
npx tsc --noEmit
```

**Expected:** PASS. All 8 stub stage files exist; `StageHeader` exists; `getUploadTask` / `STAGE_KEYS` / `isValidStage` exist from Phase 1 + Phase 2.

- [ ] **Step 20.4 — Dev-server smoke**
```bash
npm run dev
```

In the browser:

1. Visit `http://localhost:8000/question-bank/upload`.
2. Click any task's **"进入处理"** button (or whichever action navigates to the stage URL).
3. URL should change to `/question-bank/upload/<task-id>/quality` (or whatever `currentStage` is).
4. Page renders:
   - `StageHeader` at top: 返回 button + `<task.name> · <subject> · <grade> · <totalQuestions>题` + 8-step bar.
   - Body is blank (stubs return null).
5. Click 返回 → URL returns to `/question-bank/upload`.
6. Try `/question-bank/upload/<task-id>/not-a-real-stage` → renders `<Empty description="无此阶段" />`.
7. Try `/question-bank/upload/nonexistent-id/quality` → renders `<Empty description="任务不存在" />` with a back button.

- [ ] **Step 20.5 — Commit**
```bash
git add src/pages/UploadTask/Stage/index.tsx \
        src/pages/UploadTask/Stage/stages/
git commit -m "feat(upload): add Stage router entry and 8 stage stubs"
```

---

### Task 21: 8 个阶段薄壳（`stages/*.tsx`）

Replace each of the 8 stubs created in Task 20 with the real thin wiring layer. Each file stays under 50 lines and does only: `useRequest` for the stage's questions, then forward props + service callbacks into the matching workspace component from Phase 4.

- [ ] **Step 21.1 — `Quality.tsx` (BatchReview)**
**File:** `src/pages/UploadTask/Stage/stages/Quality.tsx` (replace stub)

```typescript
import { useRequest } from '@umijs/max';
import React, { useMemo } from 'react';
import {
  confirmQualityKeep,
  confirmQualityReject,
  getStageQuestions,
} from '@/services/uploadTask';
import BatchReview from '../workspaces/BatchReview';
import type { UploadTask } from '../../types';

const Quality: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions, refresh } = useRequest(
    () => getStageQuestions(task.id, 'quality'),
    { refreshDeps: [task.id] },
  );
  const summary = useMemo(() => {
    const qs = questions ?? [];
    return {
      autoPass: qs.filter((q) => q.qualityVerdict === 'auto-pass').length,
      needReview: qs.filter((q) => q.qualityVerdict === 'mid-need-review')
        .length,
      autoReject: qs.filter((q) => q.qualityVerdict === 'auto-reject').length,
    };
  }, [questions]);

  return (
    <BatchReview
      questions={questions ?? []}
      summary={summary}
      onKeep={async (ids) => {
        await confirmQualityKeep(task.id, ids);
        await refresh();
        onRefresh();
      }}
      onReject={async (ids, reason) => {
        await confirmQualityReject(task.id, ids, reason);
        await refresh();
        onRefresh();
      }}
      readOnly={readOnly}
    />
  );
};

export default Quality;
```

- [ ] **Step 21.2 — `Dedupe.tsx` (SystemStatus, stage='dedupe')**
**File:** `src/pages/UploadTask/Stage/stages/Dedupe.tsx` (replace stub)

```typescript
import { useRequest } from '@umijs/max';
import React from 'react';
import { history } from '@umijs/max';
import {
  advanceSystemStage,
  getStageQuestions,
} from '@/services/uploadTask';
import { nextStageOf } from '../../constants';
import SystemStatus from '../workspaces/SystemStatus';
import type { UploadTask } from '../../types';

const Dedupe: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions } = useRequest(
    () => getStageQuestions(task.id, 'dedupe'),
    { refreshDeps: [task.id] },
  );
  return (
    <SystemStatus
      stage="dedupe"
      stageProgress={task.stageProgress.dedupe}
      questions={questions ?? []}
      onAdvance={async () => {
        await advanceSystemStage(task.id, 'dedupe');
        onRefresh();
      }}
      onNext={() => {
        const next = nextStageOf('dedupe');
        if (next) history.push(`/question-bank/upload/${task.id}/${next}`);
      }}
      readOnly={readOnly}
    />
  );
};

export default Dedupe;
```

- [ ] **Step 21.3 — `Parse.tsx` (SystemStatus, stage='parse')**
**File:** `src/pages/UploadTask/Stage/stages/Parse.tsx` (replace stub)

```typescript
import { useRequest } from '@umijs/max';
import React from 'react';
import { history } from '@umijs/max';
import {
  advanceSystemStage,
  getStageQuestions,
} from '@/services/uploadTask';
import { nextStageOf } from '../../constants';
import SystemStatus from '../workspaces/SystemStatus';
import type { UploadTask } from '../../types';

const Parse: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions } = useRequest(
    () => getStageQuestions(task.id, 'parse'),
    { refreshDeps: [task.id] },
  );
  return (
    <SystemStatus
      stage="parse"
      stageProgress={task.stageProgress.parse}
      questions={questions ?? []}
      onAdvance={async () => {
        await advanceSystemStage(task.id, 'parse');
        onRefresh();
      }}
      onNext={() => {
        const next = nextStageOf('parse');
        if (next) history.push(`/question-bank/upload/${task.id}/${next}`);
      }}
      readOnly={readOnly}
    />
  );
};

export default Parse;
```

- [ ] **Step 21.4 — `ParseReview.tsx` (QuestionAudit, mode='parse')**
**File:** `src/pages/UploadTask/Stage/stages/ParseReview.tsx` (replace stub)

```typescript
import { useRequest } from '@umijs/max';
import React from 'react';
import {
  confirmParseReview,
  getStageQuestions,
  regenerateParse,
  updateParsedFields,
} from '@/services/uploadTask';
import QuestionAudit from '../workspaces/QuestionAudit';
import type { UploadTask } from '../../types';

const ParseReview: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions, refresh } = useRequest(
    () => getStageQuestions(task.id, 'parse-review'),
    { refreshDeps: [task.id] },
  );
  return (
    <QuestionAudit
      questions={questions ?? []}
      mode="parse"
      onUpdate={async (q, patch) => {
        await updateParsedFields(task.id, q.id, patch);
        await refresh();
      }}
      onRegenerate={async (q) => {
        await regenerateParse(task.id, q.id);
        await refresh();
      }}
      onConfirm={async (ids) => {
        await confirmParseReview(task.id, ids);
        await refresh();
        onRefresh();
      }}
      readOnly={readOnly}
    />
  );
};

export default ParseReview;
```

- [ ] **Step 21.5 — `Tag.tsx` (SystemStatus, stage='tag')**
**File:** `src/pages/UploadTask/Stage/stages/Tag.tsx` (replace stub)

```typescript
import { useRequest } from '@umijs/max';
import React from 'react';
import { history } from '@umijs/max';
import {
  advanceSystemStage,
  getStageQuestions,
} from '@/services/uploadTask';
import { nextStageOf } from '../../constants';
import SystemStatus from '../workspaces/SystemStatus';
import type { UploadTask } from '../../types';

const Tag: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions } = useRequest(
    () => getStageQuestions(task.id, 'tag'),
    { refreshDeps: [task.id] },
  );
  return (
    <SystemStatus
      stage="tag"
      stageProgress={task.stageProgress.tag}
      questions={questions ?? []}
      onAdvance={async () => {
        await advanceSystemStage(task.id, 'tag');
        onRefresh();
      }}
      onNext={() => {
        const next = nextStageOf('tag');
        if (next) history.push(`/question-bank/upload/${task.id}/${next}`);
      }}
      readOnly={readOnly}
    />
  );
};

export default Tag;
```

- [ ] **Step 21.6 — `TagReview.tsx` (QuestionAudit, mode='tag')**
**File:** `src/pages/UploadTask/Stage/stages/TagReview.tsx` (replace stub)

```typescript
import { useRequest } from '@umijs/max';
import React from 'react';
import {
  confirmTagReview,
  getStageQuestions,
  regenerateTags,
  updateTags,
} from '@/services/uploadTask';
import QuestionAudit from '../workspaces/QuestionAudit';
import type { UploadTask } from '../../types';

const TagReview: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions, refresh } = useRequest(
    () => getStageQuestions(task.id, 'tag-review'),
    { refreshDeps: [task.id] },
  );
  return (
    <QuestionAudit
      questions={questions ?? []}
      mode="tag"
      onUpdate={async (q, patch) => {
        if (patch.tags) await updateTags(task.id, q.id, patch.tags);
        await refresh();
      }}
      onRegenerate={async (q) => {
        await regenerateTags(task.id, q.id);
        await refresh();
      }}
      onConfirm={async (ids) => {
        await confirmTagReview(task.id, ids);
        await refresh();
        onRefresh();
      }}
      readOnly={readOnly}
    />
  );
};

export default TagReview;
```

- [ ] **Step 21.7 — `Publish.tsx` (SystemStatus, stage='publish')**
**File:** `src/pages/UploadTask/Stage/stages/Publish.tsx` (replace stub)

```typescript
import { useRequest } from '@umijs/max';
import React from 'react';
import { history } from '@umijs/max';
import {
  advanceSystemStage,
  getStageQuestions,
} from '@/services/uploadTask';
import { nextStageOf } from '../../constants';
import SystemStatus from '../workspaces/SystemStatus';
import type { UploadTask } from '../../types';

const Publish: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: questions } = useRequest(
    () => getStageQuestions(task.id, 'publish'),
    { refreshDeps: [task.id] },
  );
  return (
    <SystemStatus
      stage="publish"
      stageProgress={task.stageProgress.publish}
      questions={questions ?? []}
      onAdvance={async () => {
        await advanceSystemStage(task.id, 'publish');
        onRefresh();
      }}
      onNext={() => {
        const next = nextStageOf('publish');
        if (next) history.push(`/question-bank/upload/${task.id}/${next}`);
      }}
      readOnly={readOnly}
    />
  );
};

export default Publish;
```

- [ ] **Step 21.8 — `Distribute.tsx` (DistributeForm)**
**File:** `src/pages/UploadTask/Stage/stages/Distribute.tsx` (replace stub)

```typescript
import { useRequest } from '@umijs/max';
import React from 'react';
import {
  getDistributeConfig,
  saveDistributeConfig,
} from '@/services/uploadTask';
import DistributeForm from '../workspaces/DistributeForm';
import type { UploadTask } from '../../types';

const Distribute: React.FC<{
  task: UploadTask;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ task, onRefresh, readOnly }) => {
  const { data: config, refresh } = useRequest(
    () => getDistributeConfig(task.id),
    { refreshDeps: [task.id] },
  );
  return (
    <DistributeForm
      task={task}
      initial={config ?? null}
      onSave={async (cfg) => {
        await saveDistributeConfig(cfg);
        await refresh();
        onRefresh();
      }}
      readOnly={readOnly}
    />
  );
};

export default Distribute;
```

- [ ] **Step 21.9 — TS check**
```bash
cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app
npx tsc --noEmit
```

**Expected:** PASS. Every service function referenced (`getStageQuestions`, `confirmQualityKeep/Reject`, `updateParsedFields`, `regenerateParse`, `confirmParseReview`, `updateTags`, `regenerateTags`, `confirmTagReview`, `advanceSystemStage`, `getDistributeConfig`, `saveDistributeConfig`) is in the Phase 1 frozen service surface; every workspace component is from Phase 4; `nextStageOf` is from Phase 1 constants.

- [ ] **Step 21.10 — Dev-server smoke**
```bash
npm run dev
```

Run through the following sequence in the browser. Pick task IDs from the mock data that match each stage state.

**1. Quality (人工质检) — BatchReview flow**

- From `/question-bank/upload`, click **"进入处理"** on a task whose `currentStage === 'quality'`.
- URL → `/question-bank/upload/<id>/quality`. Page shows `BatchReview` with the mid-need-review table populated and the summary card showing autoPass / needReview / autoReject counts.
- Select a few rows, click **"批量保留"**. Table reloads via `refresh()`; summary numbers update.
- Continue keeping/rejecting all remaining mid-review rows. Once the stage is exhausted the mock advances `currentStage` to `'dedupe'`; after `onRefresh()` the StageHeader step bar moves the "process" dot to 去重.

**2. Dedupe / Parse / Tag / Publish (系统执行中) — SystemStatus flow**

- From the list, click **"查看进度"** on a task currently in a system stage (e.g. `currentStage === 'parse'`, state `'processing'`).
- URL → `/question-bank/upload/<id>/parse`. Page shows the `SystemStatus` card: spinning indicator, stage label, "模拟立即完成" button.
- Click **"模拟立即完成"**. `advanceSystemStage` resolves; `onRefresh()` reloads the task; StageHeader step bar advances; the inner card flips to a "完成 → 下一步" CTA.
- Click **"下一步"** → URL changes to the next stage in `STAGE_KEYS` via `nextStageOf`.
- Repeat for `dedupe`, `tag`, `publish` to confirm all four SystemStatus shells behave the same.

**3. Parse Review — QuestionAudit (mode='parse')**

- Visit `/question-bank/upload/<id>/parse-review` on a task in that stage.
- `QuestionAudit` three-column layout renders: question list left, detail middle, edit form right.
- Press `↑` / `↓` to navigate between questions.
- Edit a parsed field; press `Ctrl/Cmd+Enter` → `updateParsedFields` fires, list refreshes, focus moves to next question.
- Click **"重新解析"** on a question → `regenerateParse` fires, the question reloads.
- Select a few rows and click **"批量确认"** → `confirmParseReview` fires; on full confirmation `onRefresh()` advances `currentStage` and StageHeader updates.

**4. Tag Review — QuestionAudit (mode='tag')**

- Visit `/question-bank/upload/<id>/tag-review` on a matching task.
- Edit tags (knowledge/type/difficulty); `Ctrl/Cmd+Enter` calls `updateTags` with the `patch.tags` payload only.
- Regenerate / batch confirm behave analogously to parse-review.

**5. Distribute (published, awaiting config) — DistributeForm write mode**

- From the list, click **"配置分发"** on a task in the 已发布 bucket whose `currentStage === 'distribute'` and not yet distributed.
- URL → `/question-bank/upload/<id>/distribute`. `DistributeForm` renders empty (since `getDistributeConfig` returns `null`).
- Fill the required fields; click **"保存分发配置"** → success message; task list shows the task with "已分发" status; bucket is 已发布.

**6. Distribute (already distributed) — DistributeForm readOnly**

- From the list, click **"查看分发"** on a distributed task.
- URL → `/question-bank/upload/<id>/distribute?readOnly=1` (or readOnly inferred from stage state).
- `DistributeForm` renders pre-filled; all inputs disabled; no save button.

**7. 越级访问 / 回看历史 — readOnly auto-engages**

- Pick a task with `currentStage === 'quality'`. Manually edit the URL to `/question-bank/upload/<that-id>/tag-review`.
- Page loads; readOnly is `true` because `stageIdx !== curIdx`. `QuestionAudit` should render with editing disabled (forwarded `readOnly` prop).
- Pick a task with `currentStage === 'distribute'`. Manually edit the URL back to `/question-bank/upload/<that-id>/quality`. Page loads BatchReview in readOnly (keep/reject buttons disabled).

**8. URL guards**

- `/question-bank/upload/<id>/nonsense` → `<Empty description="无此阶段" />`.
- `/question-bank/upload/nonexistent-id/quality` → `<Empty description="任务不存在" />` + 返回 button.

- [ ] **Step 21.11 — Commit**
```bash
git add src/pages/UploadTask/Stage/stages/
git commit -m "feat(upload): fill in 8 stage shells wiring services to workspaces"
```

---

## Phase 5 Done — what's wired

- `/question-bank/upload/:taskId/:stage` is fully router-driven.
- StageHeader gives task identity + clickable 8-step progress on every stage page.
- `readOnly` engages from three sources: `?readOnly=1` query, 越级访问 (`stageIdx !== curIdx`), or 回看历史 (same rule covers it).
- Each of 8 stages is a < 50-line shell wrapping a Phase 4 workspace and Phase 1 services — easy to maintain, all business logic stays in services + workspaces.
- Every commit in this phase compiles cleanly (`tsc --noEmit` PASS) and the dev-server smoke sequence covers every stage + every readOnly path.
