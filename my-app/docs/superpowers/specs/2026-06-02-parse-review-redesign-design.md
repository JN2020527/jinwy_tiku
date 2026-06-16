# 解析审核页重设计

> 日期：2026-06-02 阶段：parse-review（第 4 阶段，8 阶段流水线中第一个人工阶段）

## 背景

解析审核页用于编辑审核 AI 生成的试题答案和解析。一个任务下题目数量不多（通常个位数），因此不需要左侧列表导航。

### 核心业务事实

- **题干和选项**是直接从原始题目提取的（OCR/解析），不是 AI 生成，展示为只读
- **答案和解析**是 AI 生成的，编辑需要审核并直接修改
- 编辑不会将内容打回给 AI 重新生成——直接改
- 逐题审核，保存即等于已审，不需要单独的确认操作

## 布局

采用**左右分区**方案（编辑优先）：

```
┌──────────────────────────────────────────────┐
│ [Q1] [Q2✓] [Q3] [Q4]         2/4 已审        │  ← 题号药丸导航
├─────────────────────┬────────────────────────┤
│                     │                        │
│  题干（只读 HTML）    │  答案（wangEditor）      │
│                     │                        │
│  选项 A/B/C/D       │  解析（wangEditor）      │
│  （只读 HTML）       │                        │
│                     │  [保存并下一题 →]         │
├─────────────────────┴────────────────────────┤
│ ↑↓ 切题 · Ctrl+Enter 保存下一题               │
└──────────────────────────────────────────────┘
```

### 各区域说明

| 区域     | 内容                            | 交互                       |
| -------- | ------------------------------- | -------------------------- |
| 顶部导航 | 题号药丸按钮，已审显示 ✓ 标记   | 点击切换题目，左右箭头翻页 |
| 左栏     | 题干 + 选项（sanitize 后 HTML） | 只读，不可编辑             |
| 右栏     | 答案编辑器 + 解析编辑器         | wangEditor 富文本，可编辑  |
| 底部     | 快捷键提示                      | 无交互                     |
| 操作按钮 | "保存并下一题"                  | 保存 + 标记已审 + 跳下一题 |

## 组件拆分

```
ParseReview.tsx              — 数据层：拉题目、调 API
  └─ ParseReviewWorkspace.tsx    — 交互层：导航、保存、审核状态
       ├─ QuestionRibbon         — 顶部题号药丸导航
       ├─ QuestionContext        — 左栏：题干+选项只读展示
       └─ AnswerEditor           — 右栏：答案+解析富文本编辑 + 保存按钮
```

### 各组件职责

| 组件 | 职责 | Props |
| --- | --- | --- |
| `ParseReview` | 数据获取、API 调用 | 从路由拿 taskId，useRequest 拉题目 |
| `ParseReviewWorkspace` | 状态管理、键盘导航、题目切换 | questions, onSave, readOnly |
| `QuestionRibbon` | 题号导航、已审/未审标记 | questions, currentId, onNavigate |
| `QuestionContext` | 渲染题干+选项 HTML（sanitize 后） | stem, options |
| `AnswerEditor` | 答案/解析编辑、保存触发 | answer, analysis, onSave |

### 与现有代码的关系

- `QuestionAudit` 组件保留不动（`tag-review` 继续使用三栏布局）
- `ParseReview` 不再引用 `QuestionAudit`，改用专用的 `ParseReviewWorkspace`
- 删除之前添加的 `variant` prop（没有其他消费者）

## 数据流

### API 调用

| 操作 | Service 函数 | 说明 |
| --- | --- | --- |
| 加载题目 | `getStageQuestions(taskId, 'parse-review')` | 获取任务下所有题目 |
| 保存 | `updateParsedFields(taskId, questionId, patch)` | 更新 answer + analysis |
| 推进阶段 | `advanceSystemStage(taskId, 'parse-review')` | 全部已审后自动推进 |

### 保存时的数据

```typescript
// patch 内容
{
  answer: '<p>B</p>',           // HTML string
  analysis: '<p>解析内容...</p>', // HTML string
}

// 同时标记已审（通过 mock 层实现）
parseReviewed = true
```

### 移除的 API 调用

- `regenerateParse` — 编辑不会打回 AI
- `confirmParseReview` — 保存即审核，不需要单独确认

## 交互细节

### 键盘操作

| 快捷键       | 动作                 |
| ------------ | -------------------- |
| `↑`          | 上一题               |
| `↓`          | 下一题               |
| `Ctrl+Enter` | 保存当前题并跳下一题 |

### 保存逻辑

1. 编辑修改 answer 或 analysis → 内容与原始值不同 → 标记为"有未保存修改"
2. 点击"保存并下一题"或 Ctrl+Enter：
   - 调用 `updateParsedFields` 保存 answer + analysis
   - 标记 `parseReviewed = true`
3. 保存成功 → toast 提示 → 自动跳到下一道未审题目
4. 当前已是最后一题 → 跳回第一道未审题
5. 全部已审 → 显示"全部审核完成"提示 + 自动调用 `advanceSystemStage` 推进阶段

### 未保存修改保护

切换题目时，如果当前题有未保存的修改 → 弹确认提示：

- "当前题目有未保存的修改，是否保存？"
- 选项：保存 / 不保存 / 取消

### wangEditor 配置

- **答案区域**：较小编辑器（min-height 60px），适合短答案
- **解析区域**：较大编辑器（min-height 200px），适合长解析含公式
- **工具栏精简配置**：保留加粗、公式、图片、列表、表格，去掉全屏等无关功能
- **内容格式**：HTML string

### 只读模式

阶段已过（readOnly=true）时：

- 编辑器不可编辑
- 导航仍可用
- 不显示保存按钮

### 空状态

没有题目时 → 居中显示"暂无题目数据"

## 移除的功能

| 功能 | 原因 |
| --- | --- |
| 左侧题目列表 | 题目少，药丸导航足够 |
| "重新生成"按钮 | 编辑不会打回 AI |
| "确认通过"按钮 | 保存即审核 |
| 置信度显示（parseConfidence） | 答案/解析是 AI 生成但编辑直接改，置信度无参考价值 |
| stem/options 编辑 | 这些是直接提取的，不是 AI 生成 |

## 文件变更清单

| 文件 | 变更 |
| --- | --- |
| `ParseReview.tsx` | 重写：不再用 QuestionAudit，改用 ParseReviewWorkspace |
| `ParseReviewWorkspace.tsx` | 新建：左右分栏审核工作区 |
| `QuestionRibbon.tsx` | 新建：题号药丸导航 |
| `QuestionContext.tsx` | 新建：题干+选项只读展示 |
| `AnswerEditor.tsx` | 新建：答案+解析富文本编辑器 |
| `QuestionAudit.tsx` | 回退 variant prop（无消费者） |
| `ParseReviewWorkspace.less` | 新建：布局样式 |
