# 重复检测阶段重设计

> 日期：2026-06-02
> 状态：待实现

## 背景

当前重复检测（dedupe）阶段是一个黑盒子：`TaskQuestion.duplicateOf` 只是一个无意义字符串 `'other-task-q-id'`，UI 上只显示 `Q3 → 已关联到 other-task-q-id`。用户无法知道题目和哪个试卷的哪道题重复、相似度多少、为什么被判为重复，也无法修正误判。

## 目标

将重复检测从黑盒子改为透明可交互的阶段：

1. 展示结构化的重复来源信息（来源试卷、原题编号、相似度、判重依据）
2. 提供并排对比视图，用户可直观确认重复
3. 允许用户解除误判的重复标记
4. 保持现有流水线推进逻辑不变

## 不做什么

- 不支持手动补充标记重复（只解除，不新增）
- 不调整归并策略（不选择保留哪道题）
- 不改动其他阶段（quality / parse / tag 等）的组件和逻辑

---

## 数据结构

### 新增类型：`DuplicateMatch`

```typescript
// src/pages/UploadTask/types.ts

export interface DuplicateMatch {
  /** 被重复的原题 ID */
  sourceQuestionId: string;
  /** 来源上传任务/试卷名称，如 "2024年河南省中考数学试卷" */
  sourceTaskName: string;
  /** 原题在来源任务中的序号 */
  sourceQuestionIndex: number;
  /** 相似度分数 0~100 */
  similarity: number;
  /** 判重依据 */
  reason: 'stem-similar' | 'answer-identical' | 'overall-similar';
  /** 原题题干 HTML（用于并排对比） */
  sourceStem: string;
  /** 原题答案（可选，对比时展示） */
  sourceAnswer?: string;
}
```

### 修改 `TaskQuestion.duplicateOf`

```typescript
// 变更前
duplicateOf?: string;

// 变更后
duplicateOf?: DuplicateMatch;
```

已有的 truthy 检查（`!!q.duplicateOf`、`q.duplicateOf` 作为条件）自动兼容。

---

## 组件设计

### 文件结构

```
src/pages/UploadTask/Stage/stages/
├── Dedupe.tsx                 ← 重写：独立组件，不再委托 SystemStatus
├── dedupe/
│   ├── DedupeSummary.tsx      ← 顶部统计摘要
│   ├── DuplicatePairCard.tsx  ← 单对重复卡片（可折叠并排对比）
│   └── dedupe.less            ← 样式
```

### 主组件 Dedupe.tsx

四个状态分支：

| 状态 | 渲染内容 |
|------|---------|
| `pending` | "等待上一阶段完成…"（同 SystemStatus） |
| `processing` | Spinner + "共 N 题待处理" + 模拟立即完成按钮（同 SystemStatus） |
| `done` | 自定义 UI（见下文） |
| `rejected` | Alert 提示（同 SystemStatus） |

**done 状态的 UI 结构**：

```
┌─────────────────────────────────────────────────────┐
│ 重复检测 ✓ 已完成                    完成时间 HH:MM  │
│                                                     │
│  共 8 题 · 6 道独立 · 2 道重复                       │  ← DedupeSummary
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 相似度 96.3% · 题干相似    来源：河南省中考 · Q3  │ │  ← 卡片头部
│ ├────────────────────┬────────────────────────────┤ │
│ │ 当前题 Q3          │ 原题 · 2024河南省中考 Q3    │ │  ← 并排对比
│ │                    │                             │ │
│ │ [题干 HTML]        │ [原题题干 HTML]              │ │
│ │                    │                             │ │
│ │ [答案]             │ [原题答案]                   │ │
│ ├────────────────────┴────────────────────────────┤ │
│ │                              [解除重复] 按钮     │ │  ← 操作区
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 相似度 88.1% · 答案相同   来源：山西省中考 · Q5  │ │  ← 收起态
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│                     [→ 进入下一阶段：AI 解析]        │
└─────────────────────────────────────────────────────┘
```

### DedupeSummary

- Props：`total: number, duplicateCount: number`
- 展示：`共 N 题 · X 道独立 · Y 道重复`
- 重复数为 0 时显示"未发现重复题"

### DuplicatePairCard

- Props：`question: TaskQuestion, onUnlink: (questionId: string) => Promise<void>, readOnly: boolean`
- 默认收起，点击头部展开/收起
- 展开态：左右并排，左为当前题（题干 + 答案），右为原题（sourceStem + sourceAnswer）
- HTML 内容经 `sanitizeHtml()` 过滤后渲染
- 相似度按区间着色：≥95% 红色、80~95% 橙色、<80% 黄色
- 判重依据显示中文：`stem-similar` → "题干相似"、`answer-identical` → "答案相同"、`overall-similar` → "整体相似"
- "解除重复"按钮：Popconfirm 二次确认 → 调用 `onUnlink` → 成功后从列表移除

### 样式

- 使用 LESS module（`dedupe.less`），与项目现有风格一致
- 并排对比区使用 flex 左右各 50%，移动端可考虑上下堆叠（但本原型暂不强制响应式）
- 卡片头部使用 Ant Design Card 的 header 样式，对比区域使用浅色背景区分左右

---

## API 改造

### 新增解除重复接口

**Service**（`src/services/uploadTask.ts`）：

```typescript
export async function unlinkDuplicate(
  taskId: string,
  questionId: string,
): Promise<void> {
  return request<ApiResponse<void>>(
    `/api/upload-task/${taskId}/stage/dedupe/unlink`,
    { method: 'POST', data: { questionId } },
  ).then(unwrap);
}
```

**Mock**（`mock/uploadTask.ts`）：

新增路由 `POST /api/upload-task/:taskId/stage/dedupe/unlink`：
- 从 `questions[taskId]` 中找到对应 questionId
- 将 `duplicateOf` 置为 `undefined`（不可变模式：创建新对象替换）
- 返回 `{ success: true, message: '', data: null }`

### 不动的接口

- `getStageQuestions` — 签名不变，返回的 `TaskQuestion[]` 中 `duplicateOf` 字段类型变更，调用方通过 codegraph 影响分析确认兼容性
- `advanceSystemStage` — 完全不动
- 状态机推进逻辑 — 完全不动

---

## Mock 种子数据改造

### 新增来源任务池

```typescript
const SOURCE_TASKS = [
  { id: 'src-task-1', name: '2024年河南省中考数学试卷' },
  { id: 'src-task-2', name: '2024年山西省中考数学试卷' },
  { id: 'src-task-3', name: '2024年河北省中考数学试卷' },
];
```

### 生成重复对

在 `genQuestionsForTasks` 中，当 `passedDedupe` 时：
- 给 index 3 和 index 5 的题生成 `DuplicateMatch`
- index 3：similarity 96.3，reason `stem-similar`，来源 SOURCE_TASKS[0] 的 Q3
- index 5：similarity 88.1，reason `answer-identical`，来源 SOURCE_TASKS[1] 的 Q5
- `sourceStem` 从 `STEM_TEMPLATES` 中取对应 index 的值
- `sourceAnswer` 提供简短内容

### 删除旧逻辑

移除 `base.duplicateOf = 'other-task-q-id'` 这行，替换为结构化数据生成。

---

## 影响范围

### 需要修改的文件

| 文件 | 改动 |
|------|------|
| `src/pages/UploadTask/types.ts` | 新增 `DuplicateMatch`，改 `duplicateOf` 类型 |
| `src/pages/UploadTask/Stage/stages/Dedupe.tsx` | 重写为独立组件 |
| `src/pages/UploadTask/Stage/stages/dedupe/DedupeSummary.tsx` | 新建 |
| `src/pages/UploadTask/Stage/stages/dedupe/DuplicatePairCard.tsx` | 新建 |
| `src/pages/UploadTask/Stage/stages/dedupe/dedupe.less` | 新建 |
| `src/services/uploadTask.ts` | 新增 `unlinkDuplicate` |
| `mock/uploadTask.ts` | 新增来源任务池、改造种子数据、新增 unlink 路由 |

### 不动的文件

- `SystemStatus.tsx` — 仍服务于 parse / tag / publish 阶段
- `Stage/index.tsx` — 路由分派逻辑不变
- 其他阶段组件（Quality、Parse 等）— 不受影响
- `constants.ts` — STAGE_KEYS、STAGE_LABELS 等不变
