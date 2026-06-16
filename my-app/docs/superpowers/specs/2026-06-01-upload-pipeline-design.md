---
title: 试题上传全流程流水线 - 设计稿
date: 2026-06-01
status: 待 review
source: 3-其他项目/试卷识别平台/系统规划/关于试题资产上传到分发的全流程梳理.md
---

# 试题上传全流程流水线 - 设计稿

## 背景

本项目是晋文源题库管理系统的**纯前端原型**（Umi Max 4 + React 18 + Ant Design 5 + Pro Components）。当前的「题库任务」页（`/question-bank/task`）只是一个非常薄的列表（id / name / type / status / updateTime + Mock CRUD），没有任何流水线、阶段队列、分发配置。

源文档《关于试题资产上传到分发的全流程梳理》定义了完整的上传 → 分发全流程，包含 OCR / Word 模版 / API 三条上传路径与多个人工/系统审核环节。**本次原型阶段只考虑 Word 模版路径**（跳过 OCR 版面核实和 OCR 路径独有的内容审核），并按下列简化后的 8 个阶段实现：

```
质量检测 → 重复检测 → AI 解析 → 解析审核 → AI 打标 → 打标审核 → 自动发布 → 渠道分发
```

## 决定回顾（brainstorming 阶段）

1. **入口形态**：替换原 `QuestionBankTask` 整体，菜单改名为"试题上传"。
2. **主界面**：5 张状态桶汇总卡 + ProTable 列表 + 8 段流水线进度条。
3. **任务详情**：二级路由全屏页 `/question-bank/upload/:taskId/:stage`，每个阶段独立子路由。
4. **新建任务**：一步式 Modal（5 字段）。
5. **工作区模板**：3 套——批量审核（质量检测）/ 三栏逐题精审（解析审核 + 打标审核）/ 配置表单（分发）。其余系统态阶段共用一个简单"状态卡"。
6. **数据来源**：服务端 mock（`mock/uploadTask.ts` + `src/services/uploadTask.ts`），对齐现有 `TagManage` / `QuestionBankTask` 的做法。

---

## §1 路由与菜单

修改 `config/routes.ts`：

```typescript
// 1) 替换菜单项 ——— 删除原 /question-bank/task，新增：
{
  path: '/question-bank/upload',
  name: '试题上传',
  icon: 'cloudUpload',
  component: './UploadTask/List',
},

// 2) 旧 URL 兼容：保留路径但 redirect 到新地址，防止书签/外部链接 404：
{
  path: '/question-bank/task',
  redirect: '/question-bank/upload',
  hideInMenu: true,
},

// 3) 二级路由全屏页（参考 /question-bank/tagging-fullscreen 的 layout: false 写法）：
{
  path: '/question-bank/upload/:taskId/:stage',
  component: './UploadTask/Stage',
  hideInMenu: true,
  layout: false,
},
```

`:stage` 取值枚举：`quality | dedupe | parse | parse-review | tag | tag-review | publish | distribute`。React Router v6 / Umi Max 4 对带连字符的参数值无任何特殊处理，但 TS 类型断言不能防御手改 URL；运行时校验见 §7。

**文件删除清单**（老逻辑作废）：

- `src/pages/ContentCenter/QuestionBankTask/` 整个目录
- `mock/questionBankTask.ts`
- `src/services/questionBankTask.ts`

---

## §2 文件结构

```
src/pages/UploadTask/
├── List/
│   ├── index.tsx              主列表页（ProTable + 汇总卡 + 新建Modal）
│   ├── SummaryCards.tsx       顶部 5 张状态桶卡片
│   ├── ProgressBar.tsx        8 段流水线进度条（行内）
│   └── NewTaskModal.tsx       新建任务弹窗
├── Stage/
│   ├── index.tsx              二级路由入口，按 :stage 路由到下面的工作区
│   ├── StageHeader.tsx        顶栏：任务名 + 元信息 + 步骤条 + 返回
│   ├── workspaces/
│   │   ├── BatchReview.tsx    工作区模板①：批量审核（质量检测用）
│   │   ├── QuestionAudit.tsx  工作区模板②：三栏逐题精审（解析审核 / 打标审核用）
│   │   ├── DistributeForm.tsx 工作区模板③：分发配置表单
│   │   └── SystemStatus.tsx   系统态展示卡（重复检测 / AI 解析 / AI 打标 / 自动发布用）
│   └── stages/
│       ├── Quality.tsx        → 复用 BatchReview
│       ├── Dedupe.tsx         → 复用 SystemStatus
│       ├── Parse.tsx          → 复用 SystemStatus
│       ├── ParseReview.tsx    → 复用 QuestionAudit，mode='parse'
│       ├── Tag.tsx            → 复用 SystemStatus
│       ├── TagReview.tsx      → 复用 QuestionAudit，mode='tag'
│       ├── Publish.tsx        → 复用 SystemStatus
│       └── Distribute.tsx     → 复用 DistributeForm
├── types.ts                   全部 TS 类型集中此处
└── constants.ts               阶段枚举、状态枚举、状态机映射、桶定义

src/services/uploadTask.ts     service 层（统一调用 @umijs/max request）
mock/uploadTask.ts             服务端 mock，所有 /api/upload-task/* 路由
```

设计意图：拆 `workspaces/` 和 `stages/` 是为了"3 套模板 + 8 个薄壳"，避免在 8 个 stage 文件里复制 3 套界面代码。每个文件预期 < 200 行，对齐全局 coding-style 的"200-400 行"约定。

---

## §3 数据模型（`src/pages/UploadTask/types.ts`）

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
  | 'pending-human' // 待人工 → 卡在质量 / 解析审核 / 打标审核
  | 'processing' // 系统处理中 → 卡在重复检测 / AI 解析 / AI 打标
  | 'published' // 已发布但未配置分发
  | 'distributed' // 已发布且已配置分发渠道（distribute 阶段完成）
  | 'rejected'; // 已拒绝 / 退回

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

// ===== 主任务 =====

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
  status: TaskStatus; // 派生自 currentStage + stageProgress
  stageProgress: Record<StageKey, StageProgress>;
  createdAt: string;
  updatedAt: string;
}

export interface StageProgress {
  state: 'pending' | 'processing' | 'done' | 'rejected';
  startedAt?: string;
  finishedAt?: string;
  summary?: string; // 一句话摘要，如 "通过 38 / 重复 2 / 拒绝 0"
}

// ===== 任务下的题目 =====

export interface TaskQuestion {
  id: string;
  taskId: string;
  index: number;
  stem: string; // HTML，渲染前必须 sanitize
  options?: string[];
  answer?: string;
  analysis?: string;

  // 质量检测产物
  qualityScore?: number; // 0–100
  qualityDeductions?: { rule: string; points: number }[];
  qualityVerdict?: 'auto-pass' | 'mid-need-review' | 'auto-reject';
  qualityKept?: boolean;

  // 重复检测产物
  duplicateOf?: string;

  // 解析审核产物（字段级置信度，方便 §9 给具体字段加红框）
  parseConfidence?: Partial<
    Record<'stem' | 'options' | 'answer' | 'analysis', number>
  >;
  parseReviewed?: boolean;

  // 打标产物
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
```

**设计点**：

- `currentStage` 是单一事实来源，`status` 由 `currentStage + stageProgress[currentStage].state` 通过纯函数 `deriveStatus()` 派生，不冗余存储。这是 CLAUDE.md 里"tagStatus 不要散落判断逻辑"的同款思路。
- `stageProgress` 用 `Record<StageKey, ...>` 方便任意阶段直接索引。
- 所有写操作均返回新对象（service 与 mock 都遵守），符合 coding-style 的"NEVER mutate"。

#### 完整派生规则（`constants.ts` 导出）

`StageProgress.state` 保持 4 态（pending / processing / done / rejected），不引入 "awaiting-human" 是为了让"系统态"与"人工态"通过 `humanStages` 集合判断而非塞进 state， state 仍然描述"系统侧该阶段是否进行中"：

```typescript
// constants.ts
export const STAGE_KEYS = [
  'quality',
  'dedupe',
  'parse',
  'parse-review',
  'tag',
  'tag-review',
  'publish',
  'distribute',
] as const;

// 这 3 个阶段在 state==='processing' 时需要人工操作，其余阶段 processing 是系统在跑算法
export const HUMAN_STAGES: ReadonlySet<StageKey> = new Set([
  'quality',
  'parse-review',
  'tag-review',
]);

export function deriveStatus(task: UploadTask): TaskStatus {
  const cur = task.currentStage;
  const state = task.stageProgress[cur].state;

  if (state === 'rejected') return 'rejected';
  if (cur === 'distribute' && state === 'done') return 'distributed';
  if (cur === 'publish' && state === 'done') return 'published';
  // publish 完成后 currentStage 立即推进到 distribute，所以走不到 publish.done 的分支；
  // 上一行只是兜底，正常情况下 published 由 currentStage==='distribute' && state==='pending' 派生：
  if (cur === 'distribute' && state === 'pending') return 'published';

  if (state === 'processing' && HUMAN_STAGES.has(cur)) return 'pending-human';
  if (state === 'processing') return 'processing';
  if (state === 'pending') {
    // 该阶段尚未开始，但 currentStage 已指向它，说明上一阶段刚结束；视该阶段类型而定：
    return HUMAN_STAGES.has(cur) ? 'pending-human' : 'processing';
  }
  // state==='done' 但 currentStage 还在该阶段——理论上推进逻辑不会出现这种情况，兜底为 processing
  return 'processing';
}
```

#### `currentStage` 推进时机约定

`currentStage` 在 stage 完成（`state==='done'`）的**同一次写操作里**立即推进到下一个 stage，新 stage 的 `state` 初始化为 `'pending'`。完成态短暂停留只在响应中可见，下一次读取时 `currentStage` 已经是下一段。这保证派生函数永远不需要处理"两阶段都完成"的歧义。唯一例外：`distribute` 是终态，完成后 `currentStage` 保持 `distribute`，`state==='done'`。

#### 完整派生表（参考）

| currentStage | state      | TaskStatus    | 备注                            |
| ------------ | ---------- | ------------- | ------------------------------- |
| quality      | pending    | pending-human | 任务刚创建                      |
| quality      | processing | pending-human | 编辑确认队列处理中              |
| dedupe       | pending    | processing    | 上阶段刚完，等待自动跑          |
| dedupe       | processing | processing    | 系统跑重复检测                  |
| parse        | pending    | processing    |                                 |
| parse        | processing | processing    |                                 |
| parse-review | pending    | pending-human |                                 |
| parse-review | processing | pending-human |                                 |
| tag          | pending    | processing    |                                 |
| tag          | processing | processing    |                                 |
| tag-review   | pending    | pending-human |                                 |
| tag-review   | processing | pending-human |                                 |
| publish      | pending    | processing    | 上阶段刚完，等待自动发布        |
| publish      | processing | processing    |                                 |
| distribute   | pending    | published     | **已发布未分发**                |
| distribute   | processing | published     | 编辑正在填表，未保存            |
| distribute   | done       | distributed   | **已发布已分发**（终态）        |
| 任意         | rejected   | rejected      | 该阶段拒绝，currentStage 不前进 |

---

## §4 Service 层（`src/services/uploadTask.ts`）

把所有 8 阶段的写操作 + 列表读操作收敛到一个 service 文件，业务组件只调 service。

```typescript
import { request } from '@umijs/max';

// ----- 任务列表 / 详情 / 创建 -----
getUploadTasks(params)                              GET  /api/upload-task/list
getUploadTask(id)                                   GET  /api/upload-task/:id
createUploadTask(body)                              POST /api/upload-task/create

// ----- 阶段共用 -----
getStageQuestions(taskId, stage)                    GET  /api/upload-task/:id/stage/:stage/questions

// ----- 质量检测 -----
confirmQualityKeep(taskId, questionIds)             POST /api/upload-task/quality/keep
confirmQualityReject(taskId, questionIds, reason)   POST /api/upload-task/quality/reject

// ----- 解析审核 -----
updateParsedFields(taskId, questionId, patch)       POST /api/upload-task/parse-review/update
regenerateParse(taskId, questionId)                 POST /api/upload-task/parse-review/regenerate
confirmParseReview(taskId, questionIds)             POST /api/upload-task/parse-review/confirm

// ----- 打标审核 -----
updateTags(taskId, questionId, tags)                POST /api/upload-task/tag-review/update
regenerateTags(taskId, questionId)                  POST /api/upload-task/tag-review/regenerate
confirmTagReview(taskId, questionIds)               POST /api/upload-task/tag-review/confirm

// ----- 系统态阶段（原型用的"触发推进"） -----
advanceSystemStage(taskId, stage)                   POST /api/upload-task/advance

// ----- 渠道分发 -----
getDistributeConfig(taskId)                         GET  /api/upload-task/:id/distribute
saveDistributeConfig(config)                        POST /api/upload-task/distribute/save
```

**响应封装**：统一 `{ success: boolean; message?: string; data: T }`，对齐 CLAUDE.md 的项目约定。

**错误处理**：service 内 `try/catch` 后 throw 业务可读 Error（中文 message），冒泡到组件层用 `message.error()` 提示，绝不静默吞错。

---

## §5 Mock 实现（`mock/uploadTask.ts`）

按 §4 service 接口对应一组 Umi mock 路由。要解决两个核心问题：① 在内存里维持任务状态机， ② 让系统态阶段看起来真的在跑（不能秒推进）。

**关键设计**：

- **内存数据，每次 dev server 启动重置**：

  - `tasks: UploadTask[]`
  - `questions: Record<taskId, TaskQuestion[]>`
  - `distConfigs: Record<taskId, DistributeConfig>`

- **初始化 10 个示例任务**，分散在不同阶段（详细数据策略见 §5.3）：

  - 质量检测 2 个（含中间分段题目待编辑确认）
  - 解析审核 1 个
  - AI 打标处理中 2 个
  - 已发布未分发 3 个
  - 已分发完成 2 个

- **状态机推进只在两处发生**：

  1. `maybeAdvance(taskId, stage)`：人工审完该阶段最后一题时检查并推进。
  2. `lazyAdvance(taskId)`：每次读取任务（GET 路由）时按时间戳惰性推进系统态阶段—— 见 §5.1。

- **全部用不可变更新**：`tasks = tasks.map(t => t.id === id ? { ...t, ... } : t)`，无 `.push` / 字段直接赋值。

### §5.1 系统态推进：惰性 + 显式按钮，不用 setTimeout

**问题背景**：Umi mock 文件保存即热重载，所有内存数据 + 正在跑的 `setTimeout` 全部丢失。依赖定时器的任务会卡死在 `processing` 永不前进。

**方案**：双轨推进。

1. **惰性推进**（每次 GET 触发自检）：

   ```typescript
   // 任务读取入口统一调用
   function lazyAdvance(task: UploadTask): UploadTask {
     const cur = task.currentStage;
     // 仅系统态阶段惰性推进；人工态阶段必须用户点确认
     if (HUMAN_STAGES.has(cur)) return task;
     const sp = task.stageProgress[cur];
     if (sp.state !== 'processing' || !sp.startedAt) return task;
     // 系统态：超过模拟时长则视为完成
     const elapsed = Date.now() - new Date(sp.startedAt).getTime();
     const target = SIMULATED_DURATION_MS[cur] ?? 3000;
     if (elapsed < target) return task;
     return advanceToNext(task, cur, genStageSummary(cur, questions[task.id]));
   }
   ```

   `listTasks` / `getTask` 都先 `map(lazyAdvance)` 再返回，状态自动追上墙钟时间，不依赖任何后台定时器。

2. **显式"立即完成"按钮**（演示加速）：`advanceSystemStage` POST 路由直接把 `state` 设 `'done'` 并推进 currentStage，跳过等待。

3. **从 processing 进入**：上一阶段完成时 `advanceToNext` 把下一阶段的 `state` 初始化为 `'pending'`，**同时若下一阶段是系统态，自动 stamp `startedAt = now`，state 改 `processing`**——这样惰性推进的时间窗立刻开始计时，不需要任何额外触发。

4. `SIMULATED_DURATION_MS`：`{ dedupe: 2500, parse: 3500, tag: 3000, publish: 1500 }`，纯演示节奏配置，可调。

### §5.2 mock 错误返回约定

文件顶部抽 helper：

```typescript
function ok<T>(res: Response, data: T) {
  res.json({ success: true, message: '', data });
}
function fail(res: Response, message: string, status = 400) {
  res.status(status).json({ success: false, message, data: null });
}
```

所有写操作前先校验必填项，不合法用 `fail(res, '...')`。状态机非法跳转（如对 `state==='done'` 的 stage 调 `advance`）同样用 `fail`。

### §5.3 样本数据策略

`genQuestionsForTasks(tasks)` 实现要点：

- **每个任务造 8 道题**，索引 1–8。
- **stem HTML 模板池**（写在文件顶部常量数组中）：
  - 3 段含 `<img>` 标签（指向占位图 `https://placehold.co/...`）
  - 2 段含数学公式（用 MathML，验证 sanitize 白名单：`<math><mrow><msup><mi>x</mi><mn>2</mn></msup></mrow></math>`）
  - 3 段纯文本+段落，无媒体
- **题型分布**：单选 / 多选 / 填空 / 解答 各 2 题。
- **质量检测产物**（仅 `currentStage` 已过 `quality` 的任务持有）：
  - 5 题 `qualityVerdict='auto-pass'`（80+ 分）
  - 2 题 `qualityVerdict='mid-need-review'`（55–75 分，含 2 条 `qualityDeductions`）
  - 1 题 `qualityVerdict='auto-reject'`（30 分以下）
- **解析产物**（已过 `parse` 的任务）：每题 `parseConfidence` 至少有 1 个字段 < 0.8 用于演示红框；其余字段 0.9+。
- **打标产物**（已过 `tag` 的任务）：`tags.knowledgePoints` 选 `mockData.ts`（QuestionTagging 的本地 mock）现有的真实知识点 id 数组（如 `math-kp1-1`），保证 TreeSelect 能匹配显示。
- **重复检测**：在 `currentStage` 已过 `dedupe` 的任务里，标记 1 题 `duplicateOf = '<另一任务的题ID>'`，用于 §10 SystemStatus 完成态摘要展示。

### §5.4 状态机推进的边界

- **`stageOrder`**：`['quality','dedupe','parse','parse-review','tag','tag-review', 'publish','distribute']`。`advanceToNext` 取下一个 stage；到 `distribute` 后 `state` 由 `pending` → `done` 视为终态，不再前进。
- **全部题目都被拒绝**（边界场景）：`maybeAdvance` 检查 `keptCount` ——
  ```typescript
  function maybeAdvance(taskId, stage) {
    const qs = questions[taskId];
    const allReviewed = qs.every((q) => isStageReviewed(q, stage));
    if (!allReviewed) return;
    const keptCount = qs.filter((q) => isKeptForStage(q, stage)).length;
    if (keptCount === 0) {
      // 任务终止：state 标 rejected，currentStage 不前进
      tasks = tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              stageProgress: {
                ...t.stageProgress,
                [stage]: {
                  ...t.stageProgress[stage],
                  state: 'rejected',
                  finishedAt: now(),
                  summary: '所有题目均被拒绝',
                },
              },
            }
          : t,
      );
      return;
    }
    advanceToNext(/* ... */);
  }
  ```
  `rejected` 适用于：质量检测全部删除、解析审核全部触发重新生成且循环失败（原型不模拟失败，故仅质量检测会触发）。

---

## §6 列表页（`src/pages/UploadTask/List/index.tsx`）

```typescript
<PageContainer>
  <SummaryCards onFilterChange={setFilterStatus} active={filterStatus} />
  <ProTable<UploadTask>
    actionRef={actionRef}
    columns={columns} // 见下
    params={{ status: filterStatus }} // 桶切换驱动列表过滤
    request={getUploadTasks}
    toolBarRender={() => [
      <Button onClick={() => setNewOpen(true)}>
        <PlusOutlined /> 新建上传任务
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
```

### 汇总卡（`SummaryCards.tsx`）

5 个桶（按状态分）。`distributed` 与 `published` 合并到"已发布"桶，靠"已分发"二级标识区分：

| key             | label        | color | 含义                                |
| --------------- | ------------ | ----- | ----------------------------------- |
| `pending-human` | 待人工处理 ⚠ | amber | status='pending-human'              |
| `processing`    | 系统处理中   | blue  | status='processing'                 |
| `published`     | 已发布       | green | status='published' \| 'distributed' |
| `rejected`      | 已拒绝/退回  | red   | status='rejected'                   |
| `all`           | 全部任务     | gray  | 不过滤                              |

**计数来源**：不再单独发 `pageSize: 0` 全量请求。mock 端在列表响应里附带 `bucketCounts: Record<BucketKey, number>` 字段（基于全集过滤前计算），前端零计算直接显示。响应类型：

```typescript
interface ListResponse {
  success: true;
  data: UploadTask[]; // 当前页（已按 filterStatus 过滤）
  total: number;
  bucketCounts: Record<BucketKey, number>; // 全集分桶数
}
```

选中态用颜色边框高亮，点击切换 `filterStatus` prop → ProTable 自动重发请求。

### 列定义

| 列 | dataIndex | 说明 |
| --- | --- | --- |
| 任务名 | name | 副标题显示 `{subject} · {grade} · {totalQuestions}题` |
| 当前阶段 | currentStage | Pill 显示阶段名，颜色按 status |
| 流水线进度 | stageProgress | 8 段进度条 + 下方一行 summary 文案 |
| 状态 | status | Pill |
| 更新时间 | updatedAt | valueType: dateTime |
| 操作 | option | 4 种 status 各自的操作矩阵见下表 |

**操作列文案矩阵**（完整覆盖 4 种 status）：

| status | 主操作 | 次要操作 |
| --- | --- | --- |
| pending-human | "进入处理" → /upload/:id/:currentStage | "详情" → 同上但只读 |
| processing | "查看进度" → /upload/:id/:currentStage | "立即完成（演示）" 直调 advanceSystemStage 后 reload |
| published | "配置分发" → /upload/:id/distribute | "详情" |
| distributed | "查看分发" → /upload/:id/distribute（只读） | "详情" |
| rejected | "查看原因" → /upload/:id/:rejectedStage（只读） | — |

### 进度条（`ProgressBar.tsx`）

8 个 4px 高小段，颜色映射 stageProgress[stage].state：

| state      | color   | 含义                 |
| ---------- | ------- | -------------------- |
| done       | #22c55e | 已完成（绿）         |
| processing | #f59e0b | 当前阶段处理中（橙） |
| pending    | #e5e7eb | 未到达（灰）         |
| rejected   | #ef4444 | 卡住/拒绝（红）      |

下方一行小字取 `currentStage` 对应的 `stageProgress.summary`。

### 新建 Modal（`NewTaskModal.tsx`）

单步表单，5 个字段：任务名 / Word 文件（Antd Upload，仅前端校验后缀，不真上传）/ 科目 / 年级段 / 来源类型 / 批次。提交调 `createUploadTask()`，成功后 message.success + 关闭

- reload。

---

## §7 阶段子页骨架（`src/pages/UploadTask/Stage/index.tsx`）

```typescript
const StagePage: React.FC = () => {
  const { taskId, stage: rawStage } = useParams<{
    taskId: string;
    stage: string;
  }>();
  const {
    data: task,
    loading,
    refresh,
  } = useRequest(() => getUploadTask(taskId!));

  // 运行时类型 guard，防御手改 URL
  if (!isValidStage(rawStage)) return <Empty description="无此阶段" />;
  const stage: StageKey = rawStage;

  if (loading || !task) return <Spin />;

  // 越级访问（手改 URL 跳到还没到达的阶段）→ 只读模式
  const stageIdx = STAGE_KEYS.indexOf(stage);
  const curIdx = STAGE_KEYS.indexOf(task.currentStage);
  const readOnly = stageIdx > curIdx || stageIdx < curIdx;
  // stageIdx > curIdx: 越级访问未来阶段
  // stageIdx < curIdx: 回看历史阶段，已经审完不允许再操作

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <StageHeader task={task} currentStage={stage} onRefresh={refresh} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderStage(stage, task, refresh, readOnly)}
      </div>
    </div>
  );
};

// constants.ts 中：
export function isValidStage(s: string | undefined): s is StageKey {
  return !!s && (STAGE_KEYS as readonly string[]).includes(s);
}
```

**`renderStage` 把 `readOnly` 透传给所有阶段薄壳**，每个 stage 组件再透传给工作区模板。三个工作区模板的 Props 都加可选 `readOnly?: boolean`：

```typescript
interface BatchReviewProps {
  /* ... */ readOnly?: boolean;
}
interface QuestionAuditProps {
  /* ... */ readOnly?: boolean;
}
interface DistributeFormProps {
  /* ... */ readOnly?: boolean;
}
```

`readOnly=true` 时所有"保留/删除/保存/重新生成/确认通过/保存配置"按钮置灰禁用，表单字段 `disabled`。

### `StageHeader.tsx` 顶栏

```
┌────────────────────────────────────────────────────────────────────────┐
│ ← 返回  2024中考数学A卷  数学·初中·50题   [Steps ●─●─●─◐─○─○─○─○]    │
└────────────────────────────────────────────────────────────────────────┘
```

- 左侧"← 返回"跳 `/question-bank/upload`
- 中间任务名 + 元信息
- 右侧 Antd Steps 8 步：已访问过的阶段可点击跳转，未到达灰显不可点

### 阶段薄壳层（`stages/*.tsx`，以 `ParseReview.tsx` 为例）

```typescript
const ParseReview: React.FC<{ task: UploadTask; onAdvance: () => void }> = ({
  task,
  onAdvance,
}) => {
  const { data: questions, refresh } = useRequest(() =>
    getStageQuestions(task.id, 'parse-review'),
  );

  return (
    <QuestionAudit
      questions={questions || []}
      mode="parse"
      onUpdate={(q, patch) =>
        updateParsedFields(task.id, q.id, patch).then(refresh)
      }
      onRegenerate={(q) => regenerateParse(task.id, q.id).then(refresh)}
      onConfirm={(ids) =>
        confirmParseReview(task.id, ids).then(() => {
          refresh();
          onAdvance();
        })
      }
    />
  );
};
```

每个 stage 文件 = 数据取 + service 调用 + 模板组件，逻辑 < 50 行。

---

## §8 工作区模板 ①：批量审核（`workspaces/BatchReview.tsx`）

用于**质量检测**阶段，把"中间分段（40–79 分）"题目集中给编辑确认"保留/删除"。

```
┌────────────────────────────────────────────────────────────────────────┐
│ 顶部摘要条                                                              │
│ 共 50 题 · 自动通过 38 · 待编辑确认 10 · 自动拒绝 2                       │
├────────────────────────────────────────────────────────────────────────┤
│ ProTable 列表（默认只显示"待编辑确认"的题）                                │
│ □ 题号  题干预览(120字)   评分  扣分明细                          操作    │
│ □ Q15   [HTML 截断渲染]    65   缺解析(-15) 选项格式(-20)  [保留][删除]   │
│ □ Q22   [HTML 截断渲染]    58   无图片(-22) 答案不规范(-20) [保留][删除]   │
│ ─                                                                      │
│ 选中 N 项 → [批量保留] [批量删除（填原因）]                                │
└────────────────────────────────────────────────────────────────────────┘
```

**Props**：

```typescript
interface BatchReviewProps {
  questions: TaskQuestion[];
  summary: { autoPass: number; needReview: number; autoReject: number };
  onKeep: (ids: string[]) => Promise<void>;
  onReject: (ids: string[], reason: string) => Promise<void>;
}
```

**关键点**：

- 默认只展示 `qualityVerdict === 'mid-need-review'` 的题；Switch 切换"显示全部"看自动通过/拒绝。
- 题干列经 `sanitizeHtml()` 后 `dangerouslySetInnerHTML`，超 120 字截断 + "查看全文"弹窗。
- 批量删除点击后弹小 Modal 收集原因（必填）。
- 全部审完后自动推进：service 端 `maybeAdvance` 判定。
- 已过该阶段的任务进入只读模式（无操作按钮，仅展示评分明细）。

---

## §9 工作区模板 ②：逐题精审三栏（`workspaces/QuestionAudit.tsx`）

用于**解析审核** 和**打标审核**两个阶段，通过 `mode` prop 切换右栏字段集。复用 `QuestionTagging` 已建立的三栏布局与键盘流约定。

```
┌─ 左栏 280px ────┬─ 中栏 (1fr) ────────────┬─ 右栏 380px ──────────┐
│ 题目列表          │ 题目原文 + AI 产物            │ mode='parse'：           │
│ [筛选]            │ ┌──────────────────────┐  │  题型/题干/选项/答案/解析  │
│  ○ 全部 (50)     │ │ Q15 单选题             │  │  各字段独立编辑          │
│  ● 待审 (12)     │ │ 题干: ...             │  │  低置信度红框高亮         │
│  ○ 已审 (38)     │ │ 选项 A B C D          │  │                       │
│                  │ │ 答案 B / 解析 ...     │  │ mode='tag'：             │
│ □ Q01 单选 ✓     │ │ [低置信字段红框]       │  │  知识点 TreeSelect       │
│ ▶ Q15 单选       │ └──────────────────────┘  │  题型 / 难度 / 认知层次   │
│ □ Q16 …          │                              │  课标 / 适用年级         │
│                  │                              │  ──────────────────  │
│                  │                              │  [保存] [重新生成]     │
│                  │                              │  [✓ 确认通过]          │
└─────────────────┴────────────────────────────┴───────────────────────┘
       底部状态条：已审 38 / 50 · 全部通过后自动推进。↑↓ 切题，Ctrl+Enter 下一题
```

**Props**：

```typescript
interface QuestionAuditProps {
  questions: TaskQuestion[];
  mode: 'parse' | 'tag';
  onUpdate: (q: TaskQuestion, patch: Partial<TaskQuestion>) => Promise<void>;
  onRegenerate: (q: TaskQuestion) => Promise<void>;
  onConfirm: (ids: string[]) => Promise<void>;
}
```

**关键点**：

- **键盘流抽取为公共 hook**：现有键盘事件写死在 `QuestionTagging/index.tsx:216-234` 的 `useEffect` 里，无法直接复用。**新增 `src/hooks/useQuestionNavKeyboard.ts`** 抽出 `↑↓` 切题与 `Ctrl/Cmd+Enter` 保存并跳题逻辑，同步改造 QuestionTagging 也用这个 hook。签名：

  ```typescript
  function useQuestionNavKeyboard(opts: {
    enabled: boolean;
    onPrev: () => void;
    onNext: () => void;
    onSaveNext?: () => void; // Ctrl+Enter
  }): void;
  ```

  QuestionAudit 内调用 `useQuestionNavKeyboard({ enabled: !readOnly, ... })`。

- **mode 切换决定右栏字段集**：

  - `mode='parse'`：渲染解析字段编辑（题型/题干/选项/答案/解析），字段级 confidence 驱动红框。
  - `mode='tag'`：渲染标签编辑。**知识点 TreeSelect 数据来自 `getKnowledgeTree()` 服务端 mock**（已在 `src/services/tagSystem.ts:52` 实现），不复用 QuestionTagging 的组件内本地 `mockData.ts`。这避免新模块与既有页面隐式耦合。在 mock 端 §5.3 生成 `tags.knowledgePoints` 时仍要选用 `getKnowledgeTree()` 返回的真实 id，保证 TreeSelect 能匹配显示。

- 低置信度高亮：`parseConfidence[field] < 0.8` 字段红框；`tagConfidence[k] < 0.7` 标签变橙色。

- HTML 渲染必经 `sanitizeHtml()`，对齐 `QuestionTagging/components/QuestionDetail.tsx`。

- "重新生成"按钮调用 `onRegenerate`，service 端 mock 延时 1.5s 回写新内容；不是整任务重跑，是单题重跑。

- "确认通过"支持单题（当前题）/ 批量（左栏勾选多题）两种模式。

- 审完最后一题自动调 `onConfirm` → service 端 `maybeAdvance` → 顶栏步骤条前进。

- `readOnly=true` 时：键盘 hook 禁用、右栏按钮 disabled、字段 disabled，仅供查看历史。

---

## §10 工作区模板 ③：分发配置 + 系统态展示卡

### ③ 分发配置（`workspaces/DistributeForm.tsx`）

用于**渠道分发**阶段（终态）。两段式表单：先定分发范围，再选渠道。

```
┌─ 居中 800px ──────────────────────────────────────────────────────┐
│  分发配置                                                            │
│  ─── 第一步：分发范围 ───                                              │
│  机构范围   ○ 全平台公开  ○ 指定合作机构  ○ 仅内部                       │
│  适用年级段  ☑ 小学  ☑ 初中  ☑ 高中                                  │
│  适用科目   ☑ 语文 ☑ 数学 ☐ 英语 ☐ 物理 ☐ 化学 …                     │
│  用户角色   ☑ 教师端  ☑ 学生端  ☐ 管理员端                            │
│  有效期     ○ 永久有效  ○ 设定截止日期 [DatePicker]                    │
│                                                                    │
│  ─── 第二步：分发渠道 ───                                              │
│  ☑ 组卷库       进入组卷功能可选题池                                     │
│  ☐ API 开放    外部系统通过 API 调用                                    │
│  ☑ 题库导出    允许批量导出 Word/PDF/Excel                              │
│  ☐ 推荐引擎    根据知识点自动推送给学生                                  │
│                                                                    │
│  [ 保存分发配置 ]   [ 仅保存草稿 ]                                      │
│                                                                    │
│  保存后显示：✓ 已分发至 2 渠道 · 配置时间 ... · [修改]                   │
└────────────────────────────────────────────────────────────────────┘
```

**Props**：

```typescript
interface DistributeFormProps {
  task: UploadTask;
  initial: DistributeConfig | null;
  onSave: (config: DistributeConfig) => Promise<void>;
}
```

- 科目/年级用 `Checkbox.Group`。
- 修改时回显用 Antd Form 的 `initialValues`。
- "保存分发配置"即视为 distribute 阶段完成，不再前进。
- 原型不实现"已分发后修改"的版本管理（规划文档列为"待确认事项"）。

### ② 系统态展示卡（`workspaces/SystemStatus.tsx`）

用于 **重复检测 / AI 解析 / AI 打标 / 自动发布** 4 个无人工操作的阶段。

```
处理中态：
┌─ 居中 600px ────────────────────────────────────────┐
│  AI 解析  · 系统处理中…                              │
│  [Spin] 不确定进度环（不模拟百分比）                    │
│  共 50 题待处理                                      │
│  [ ⏵ 模拟立即完成 ]   ← 原型常驻按钮                  │
└───────────────────────────────────────────────────┘

完成态：
│  AI 解析 · ✓ 已完成                                 │
│  解析准确率 96% · 低置信度字段 8 处                    │
│  完成时间 2024-12-25 10:30                          │
│  [ → 进入下一阶段：解析审核 ]                          │

dedupe 完成态额外加一段：                              │
│  发现 1 道重复题：                                   │
│  Q3 → 已关联到任务 #042 的 Q15  [查看原题]            │
```

**Props**：

```typescript
interface SystemStatusProps {
  stage: 'dedupe' | 'parse' | 'tag' | 'publish';
  stageProgress: StageProgress;
  questions: TaskQuestion[]; // 用于 dedupe 摘要展示重复题清单
  onAdvance: () => Promise<void>; // 演示用：触发立即完成
  onNext: () => void; // 跳到下一阶段路由
}
```

- **不模拟百分比进度**：进度环改用 Antd 的 `<Spin />`（不确定态），避免前端 setInterval 与 mock 时间戳两个时钟漂移导致"卡 95% 突跳"。处理中态只展示"系统处理中…"+ 待处理题数。
- **"模拟立即完成"按钮原型常驻**：本项目无后端、上线后也无后端，按钮不会被移除。文案保持 "（演示）"前缀以表明非真实业务路径。
- **完成态摘要**展示 `stageProgress.summary` 文案，由 mock `genStageSummary()` 生成。
- **dedupe 阶段额外展示重复题清单**：从 `questions` 里筛 `duplicateOf != null` 的题，列在完成态下方；"查看原题"在原型阶段只弹一个 Modal 展示该题 stem（HTML 经 sanitize），不做真实跳转。这一段对应源需求"重复题关联到现有试题"的最小 UI 落地。
- 完成态"进入下一阶段"按钮跳路由；`publish` 完成后下一阶段是 `distribute`，按钮文案改为"配置分发渠道"；`distribute` 是终态，无该按钮。

---

## §11 错误处理与边界情况

**Service 层**

- 所有 `request()` 在 service 内 `try/catch`，捕获后 throw 带中文 message 的 Error；组件层 `await` 时用 `message.error(e.message)` 提示。
- 不在 service 层吞错——失败必须冒泡到 UI。

**Mock 层**

- 写操作前校验入参（如 `confirmQualityKeep` 必须提供非空 `questionIds`），不合法返回 400 + `{ success: false, message }`。
- 状态机非法跳转（如 `advance` 时 stage 已是 `done`）返回错误，不静默通过。

**前端边界情况**

- **任务 ID 无效**：`getUploadTask` 404 → 显示空态 + "返回任务列表"按钮。
- **阶段 URL 不合法**：`isValidStage` 类型 guard 不通过 → "无此阶段"空态。
- **越级访问 / 回看历史**：均由 §7 的 `readOnly` 标识统一处理——三套工作区模板 props 都接受 `readOnly?: boolean`，置灰所有操作按钮、字段 `disabled`，仅供查看。
- **HTML 内容**：所有 `dangerouslySetInnerHTML` 必经 `sanitizeHtml()`。
- **系统态阶段任何刷新**（浏览器 reload / mock 文件热重载）：
  - mock 内存数据丢失 → 任务回到初始 10 个示例（原型可接受）。
  - mock 数据未丢失但定时器丢失 → 由 §5.1 的"惰性推进"在下次 GET 时按时间戳追上，用户无感。

**rejected 状态生命周期**

- rejected 任务在列表显示"查看原因"操作，跳到 `currentStage`（即触发 rejected 的那个阶段）的子路由 + `readOnly=true`，展示扣分明细、删除原因等历史信息。
- 原型阶段不支持"重新上传到同一任务"，用户需通过"新建上传任务"重新创建。
- rejected 任务永远不再前进，`stageProgress` 不变。

**原型阶段不做**

- 不做并发冲突处理（多人同时改同一题）。
- 不做权限分科目隔离。
- 不做"已分发后修改"的版本管理。

---

## 与现有项目的对齐点

| 现有约定 | 本设计的对齐方式 |
| --- | --- |
| Service 层是唯一 API 边界（`tagSystem.ts` 模式） | 所有 8 阶段写操作收敛到 `src/services/uploadTask.ts` |
| 响应统一 `{ success, message, data }` | mock 与 service 都遵守 |
| HTML 渲染必经 `sanitizeHtml()` | BatchReview / QuestionAudit 所有 HTML 字段均 sanitize |
| 全屏沉浸式工作区用 `layout: false` | Stage 路由配置 `layout: false` |
| 派生状态用纯函数（参考 `tagStatus`） | `status` 由 `deriveStatus(currentStage, stageProgress)` 派生 |
| ProTable + actionRef.reload() 跨页面同步 | 列表页通过 reload 反映阶段操作变化 |
| 知识点 TreeSelect 复用 TagManage 数据源 | QuestionAudit `mode='tag'` 复用现有 service |

---

## 不在本次范围

- OCR 路径（版面核实、内容审核）
- API 上传路径
- 已发布试题的修订流程（新版本）
- 已下架流程
- AI 解析低置信度阈值的配置后台
- 分发 API 的鉴权与限流
- 权限分科目隔离

这些可作为后续 spec 的输入。
