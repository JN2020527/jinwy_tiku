---
title: 试题上传全流程流水线 - 设计稿
date: 2026-06-01
status: 待 review
source: 3-其他项目/试卷识别平台/系统规划/关于试题资产上传到分发的全流程梳理.md
---

# 试题上传全流程流水线 - 设计稿

## 背景

本项目是晋文源题库管理系统的**纯前端原型**（Umi Max 4 + React 18 + Ant Design 5 + Pro
Components）。当前的「题库任务」页（`/question-bank/task`）只是一个非常薄的列表（id / name /
type / status / updateTime + Mock CRUD），没有任何流水线、阶段队列、分发配置。

源文档《关于试题资产上传到分发的全流程梳理》定义了完整的上传→分发全流程，包含 OCR / Word 模版 / API
三条上传路径与多个人工/系统审核环节。**本次原型阶段只考虑 Word 模版路径**（跳过 OCR 版面核实和
OCR 路径独有的内容审核），并按下列简化后的 8 个阶段实现：

```
质量检测 → 重复检测 → AI 解析 → 解析审核 → AI 打标 → 打标审核 → 自动发布 → 渠道分发
```

## 决定回顾（brainstorming 阶段）

1. **入口形态**：替换原 `QuestionBankTask` 整体，菜单改名为"试题上传"。
2. **主界面**：5 张状态桶汇总卡 + ProTable 列表 + 8 段流水线进度条。
3. **任务详情**：二级路由全屏页 `/question-bank/upload/:taskId/:stage`，每个阶段独立子路由。
4. **新建任务**：一步式 Modal（5 字段）。
5. **工作区模板**：3 套——批量审核（质量检测）/ 三栏逐题精审（解析审核 + 打标审核）/ 配置表单
   （分发）。其余系统态阶段共用一个简单"状态卡"。
6. **数据来源**：服务端 mock（`mock/uploadTask.ts` + `src/services/uploadTask.ts`），对齐
   现有 `TagManage` / `QuestionBankTask` 的做法。

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

// 2) 二级路由全屏页（参考 /question-bank/tagging-fullscreen 的 layout: false 写法）：
{
  path: '/question-bank/upload/:taskId/:stage',
  component: './UploadTask/Stage',
  hideInMenu: true,
  layout: false,
},
```

`:stage` 取值枚举：`quality | dedupe | parse | parse-review | tag | tag-review |
publish | distribute`。

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

设计意图：拆 `workspaces/` 和 `stages/` 是为了"3 套模板 + 8 个薄壳"，避免在 8 个 stage 文件
里复制 3 套界面代码。每个文件预期 < 200 行，对齐全局 coding-style 的"200-400 行"约定。

---

## §3 数据模型（`src/pages/UploadTask/types.ts`）

```typescript
// ===== 枚举 =====

export type StageKey =
  | 'quality' | 'dedupe' | 'parse' | 'parse-review'
  | 'tag' | 'tag-review' | 'publish' | 'distribute';

export type TaskStatus =
  | 'pending-human'     // 待人工 → 卡在质量 / 解析审核 / 打标审核
  | 'processing'        // 系统处理中 → 卡在重复检测 / AI 解析 / AI 打标
  | 'published'         // 已发布（含已分发）
  | 'rejected';         // 已拒绝 / 退回

export type Subject = '语文' | '数学' | '英语' | '物理' | '化学' | '生物' | '历史' | '地理' | '政治';
export type Grade   = '小学' | '初中' | '高中';
export type Source  = '原创' | '改编' | '引用';

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
  status: TaskStatus;                              // 派生自 currentStage + stageProgress
  stageProgress: Record<StageKey, StageProgress>;
  createdAt: string;
  updatedAt: string;
}

export interface StageProgress {
  state: 'pending' | 'processing' | 'done' | 'rejected';
  startedAt?: string;
  finishedAt?: string;
  summary?: string;        // 一句话摘要，如 "通过 38 / 重复 2 / 拒绝 0"
}

// ===== 任务下的题目 =====

export interface TaskQuestion {
  id: string;
  taskId: string;
  index: number;
  stem: string;                                    // HTML，渲染前必须 sanitize
  options?: string[];
  answer?: string;
  analysis?: string;

  // 质量检测产物
  qualityScore?: number;                           // 0–100
  qualityDeductions?: { rule: string; points: number }[];
  qualityVerdict?: 'auto-pass' | 'mid-need-review' | 'auto-reject';
  qualityKept?: boolean;

  // 重复检测产物
  duplicateOf?: string;

  // 解析审核产物
  parseConfidence?: number;                        // 0–1
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

- `currentStage` 是单一事实来源，`status` 由 `currentStage + stageProgress[currentStage].state`
  通过纯函数 `deriveStatus()` 派生，不冗余存储。这是 CLAUDE.md 里"tagStatus 不要散落判断
  逻辑"的同款思路。
- `stageProgress` 用 `Record<StageKey, ...>` 方便任意阶段直接索引。
- 所有写操作均返回新对象（service 与 mock 都遵守），符合 coding-style 的"NEVER mutate"。

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

**响应封装**：统一 `{ success: boolean; message?: string; data: T }`，对齐
CLAUDE.md 的项目约定。

**错误处理**：service 内 `try/catch` 后 throw 业务可读 Error（中文 message），冒泡到
组件层用 `message.error()` 提示，绝不静默吞错。

---

## §5 Mock 实现（`mock/uploadTask.ts`）

按 §4 service 接口对应一组 Umi mock 路由。要解决两个核心问题：① 在内存里维持任务状态机，
② 让系统态阶段看起来真的在跑（不能秒推进）。

**关键设计**：

- **内存数据，每次 dev server 启动重置**：
  - `tasks: UploadTask[]`
  - `questions: Record<taskId, TaskQuestion[]>`
  - `distConfigs: Record<taskId, DistributeConfig>`

- **初始化 10 个示例任务**，分散在不同阶段：
  - 质量检测 2 个（含中间分段题目待编辑确认）
  - 解析审核 1 个
  - AI 打标处理中 2 个
  - 已发布未分发 3 个
  - 已分发完成 2 个

- **系统态阶段用 setTimeout 模拟跑算法**：调用 `advanceSystemStage` 后，立即标记
  `state: 'processing'` 并返回 success；2–4 秒后定时器回写 `state: 'done'` 并自动
  推进 `currentStage` 到下一个。

- **状态机推进只在两处发生**：
  1. `maybeAdvance(taskId, stage)`：人工审完该阶段最后一题时检查并推进。
  2. `autoAdvance(taskId, stage)`：系统态阶段定时器完成时直接推进。

- **全部用不可变更新**：`tasks = tasks.map(t => t.id === id ? { ...t, ... } : t)`，无
  `.push` / 字段直接赋值。

- **stageOrder**：`['quality','dedupe','parse','parse-review','tag','tag-review',
  'publish','distribute']`。`autoAdvance` 取下一个 stage；到 `distribute` 后不再
  前进（终态）。

---

## §6 列表页（`src/pages/UploadTask/List/index.tsx`）

```typescript
<PageContainer>
  <SummaryCards onFilterChange={setFilterStatus} active={filterStatus} />
  <ProTable<UploadTask>
    actionRef={actionRef}
    columns={columns}                              // 见下
    params={{ status: filterStatus }}              // 桶切换驱动列表过滤
    request={getUploadTasks}
    toolBarRender={() => [
      <Button onClick={() => setNewOpen(true)}><PlusOutlined /> 新建上传任务</Button>,
    ]}
  />
  <NewTaskModal open={newOpen} onClose={() => setNewOpen(false)}
                onSuccess={() => { setNewOpen(false); actionRef.current?.reload(); }} />
</PageContainer>
```

### 汇总卡（`SummaryCards.tsx`）

5 个桶（按状态分）：

| key             | label       | color |
|-----------------|-------------|-------|
| `pending-human` | 待人工处理 ⚠ | amber |
| `processing`    | 系统处理中   | blue  |
| `published`     | 已发布      | green |
| `rejected`      | 已拒绝/退回  | red   |
| `all`           | 全部任务    | gray  |

实现：调用 `getUploadTasks({ pageSize: 0 })` 拿总数后在前端 `reduce` 各桶数量；选中态
用颜色边框高亮，点击切换 `filterStatus` 并 `actionRef.reload()`。

### 列定义

| 列         | dataIndex      | 说明                                                        |
|-----------|----------------|------------------------------------------------------------|
| 任务名     | name           | 副标题显示 `{subject} · {grade} · {totalQuestions}题`        |
| 当前阶段   | currentStage   | Pill 显示阶段名，颜色按 status                                 |
| 流水线进度 | stageProgress  | 8 段进度条 + 下方一行 summary 文案                            |
| 状态       | status         | Pill                                                       |
| 更新时间   | updatedAt      | valueType: dateTime                                        |
| 操作       | option         | 动态：pending-human→"进入处理"；published→"配置分发"；rejected→"查看原因" |

### 进度条（`ProgressBar.tsx`）

8 个 4px 高小段，颜色映射 stageProgress[stage].state：

| state      | color   | 含义              |
|-----------|---------|------------------|
| done      | #22c55e | 已完成（绿）        |
| processing| #f59e0b | 当前阶段处理中（橙） |
| pending   | #e5e7eb | 未到达（灰）        |
| rejected  | #ef4444 | 卡住/拒绝（红）     |

下方一行小字取 `currentStage` 对应的 `stageProgress.summary`。

### 新建 Modal（`NewTaskModal.tsx`）

单步表单，5 个字段：任务名 / Word 文件（Antd Upload，仅前端校验后缀，不真上传）/ 科目 /
年级段 / 来源类型 / 批次。提交调 `createUploadTask()`，成功后 message.success + 关闭
+ reload。

---

## §7 阶段子页骨架（`src/pages/UploadTask/Stage/index.tsx`）

```typescript
const StagePage: React.FC = () => {
  const { taskId, stage } = useParams<{ taskId: string; stage: StageKey }>();
  const { data: task, loading, refresh } = useRequest(() => getUploadTask(taskId!));

  if (loading || !task) return <Spin />;
  if (!isValidStage(stage)) return <Empty description="无此阶段" />;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <StageHeader task={task} currentStage={stage} onRefresh={refresh} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderStage(stage, task, refresh)}
      </div>
    </div>
  );
};
```

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
const ParseReview: React.FC<{ task: UploadTask; onAdvance: () => void }> = ({ task, onAdvance }) => {
  const { data: questions, refresh } = useRequest(() =>
    getStageQuestions(task.id, 'parse-review'));

  return (
    <QuestionAudit
      questions={questions || []}
      mode="parse"
      onUpdate={(q, patch) => updateParsedFields(task.id, q.id, patch).then(refresh)}
      onRegenerate={(q) => regenerateParse(task.id, q.id).then(refresh)}
      onConfirm={(ids) => confirmParseReview(task.id, ids).then(() => { refresh(); onAdvance(); })}
    />
  );
};
```

每个 stage 文件 = 数据取 + service 调用 + 模板组件，逻辑 < 50 行。

---

## §8 工作区模板①：批量审核（`workspaces/BatchReview.tsx`）

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
  onKeep:   (ids: string[]) => Promise<void>;
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

## §9 工作区模板②：逐题精审三栏（`workspaces/QuestionAudit.tsx`）

用于**解析审核** 和**打标审核**两个阶段，通过 `mode` prop 切换右栏字段集。复用
`QuestionTagging` 已建立的三栏布局与键盘流约定。

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
  onUpdate:     (q: TaskQuestion, patch: Partial<TaskQuestion>) => Promise<void>;
  onRegenerate: (q: TaskQuestion) => Promise<void>;
  onConfirm:    (ids: string[]) => Promise<void>;
}
```

**关键点**：

- 复用 `QuestionTagging` 的键盘流：`↑↓` 切题、`Ctrl/Cmd+Enter` 保存当前题并跳下一题。
- mode 切换决定右栏字段集：`parse` 渲染解析字段编辑；`tag` 用现有 `TagManage` 同款
  TreeSelect 拉知识点树。
- 低置信度高亮：`parseConfidence < 0.8` 字段红框；`tagConfidence[k] < 0.7` 标签变橙色。
- HTML 渲染必经 `sanitizeHtml()`，对齐 `QuestionTagging/components/QuestionDetail.tsx`。
- "重新生成"按钮调用 `onRegenerate`，service 端 mock 延时 1.5s 回写新内容；不是整任务
  重跑，是单题重跑。
- "确认通过"支持单题（当前题）/ 批量（左栏勾选多题）两种模式。
- 审完最后一题自动调 `onConfirm` → service 端 `maybeAdvance` → 顶栏步骤条前进。

---

## §10 工作区模板③：分发配置 + 系统态展示卡

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
│  [Progress 进度环 60%]  已处理 30 / 50 题             │
│  预计还需 1 分 20 秒                                 │
│  （演示用）[ ⏵ 模拟立即完成 ]                          │
└───────────────────────────────────────────────────┘

完成态：
│  AI 解析 · ✓ 已完成                                 │
│  解析准确率 96% · 低置信度字段 8 处                    │
│  完成时间 2024-12-25 10:30                          │
│  [ → 进入下一阶段：解析审核 ]                          │
```

**Props**：

```typescript
interface SystemStatusProps {
  stage: 'dedupe' | 'parse' | 'tag' | 'publish';
  stageProgress: StageProgress;
  onAdvance: () => Promise<void>;          // 演示用：触发立即完成
  onNext:    () => void;                   // 跳到下一阶段路由
}
```

- 进度环用 `setInterval` 在前端模拟前进，mock 完成时间一到就跳完成态。
- "模拟立即完成"按钮原型可见，真接后端时移除。
- 完成态"进入下一阶段"按钮；distribute 是终态，按钮变"返回任务列表"。

---

## §11 错误处理与边界情况

**Service 层**

- 所有 `request()` 在 service 内 `try/catch`，捕获后 throw 带中文 message 的 Error；
  组件层 `await` 时用 `message.error(e.message)` 提示。
- 不在 service 层吞错——失败必须冒泡到 UI。

**Mock 层**

- 写操作前校验入参（如 `confirmQualityKeep` 必须提供非空 `questionIds`），不合法返回
  400 + `{ success: false, message }`。
- 状态机非法跳转（如 `advance` 时 stage 已是 `done`）返回错误，不静默通过。

**前端边界情况**

- **任务 ID 无效**：`getUploadTask` 404 → 显示空态 + "返回任务列表"按钮。
- **阶段 URL 不合法**：`renderStage` 的 switch 兜底返回"无此阶段"空态。
- **越级访问**（任务在 `quality`，URL 直打 `tag-review`）：仍渲染该阶段页，但工作区显示
  "该阶段尚未到达"，按 readOnly 模式避免误操作。
- **HTML 内容**：所有 `dangerouslySetInnerHTML` 必经 `sanitizeHtml()`。
- **系统态被刷新**：进度环靠 `stageProgress.state` 重新水合，mock 端 setTimeout 仍在跑。

**原型阶段不做**

- 不做并发冲突处理（多人同时改同一题）。
- 不做权限分科目隔离。
- 不做"已分发后修改"的版本管理。

---

## 与现有项目的对齐点

| 现有约定                                              | 本设计的对齐方式                                          |
|------------------------------------------------------|---------------------------------------------------------|
| Service 层是唯一 API 边界（`tagSystem.ts` 模式）        | 所有 8 阶段写操作收敛到 `src/services/uploadTask.ts`      |
| 响应统一 `{ success, message, data }`                  | mock 与 service 都遵守                                   |
| HTML 渲染必经 `sanitizeHtml()`                         | BatchReview / QuestionAudit 所有 HTML 字段均 sanitize    |
| 全屏沉浸式工作区用 `layout: false`                      | Stage 路由配置 `layout: false`                          |
| 派生状态用纯函数（参考 `tagStatus`）                    | `status` 由 `deriveStatus(currentStage, stageProgress)` 派生 |
| ProTable + actionRef.reload() 跨页面同步               | 列表页通过 reload 反映阶段操作变化                         |
| 知识点 TreeSelect 复用 TagManage 数据源                | QuestionAudit `mode='tag'` 复用现有 service              |

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
