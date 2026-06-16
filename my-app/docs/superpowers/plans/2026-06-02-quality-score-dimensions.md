# 评分维度明细 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将质量检测的"扣分明细"列替换为"评分明细"列，展示每个评分维度的得分/满分及扣分原因。

**Architecture:** 替换 `QualityDeduction` 接口为 `QualityDimension`（含 name/score/maxScore/note），更新 `TaskQuestion` 类型、BatchReview 表格列渲染、LESS 样式和 mock 数据生成。qualityScore 改为由维度得分自动求和。

**Tech Stack:** React 18, Ant Design 5 (Table, Tag, Space), LESS modules, TypeScript

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `src/pages/UploadTask/types.ts` | Modify | 删除 QualityDeduction，新增 QualityDimension，更新 TaskQuestion 字段 |
| `src/pages/UploadTask/Stage/workspaces/BatchReview.less` | Modify | 新增维度行样式（.dimRow / .dimName / .dimFull / .dimPartial / .dimNote） |
| `src/pages/UploadTask/Stage/workspaces/BatchReview.tsx` | Modify | "扣分明细"列 → "评分明细"列，使用 QualityDimension 渲染 |
| `mock/uploadTask.ts` | Modify | qualityDeductions → qualityDimensions，qualityScore 从维度求和 |

---

### Task 1: 更新类型定义

**Files:**

- Modify: `src/pages/UploadTask/types.ts`

- [ ] **Step 1: 删除 QualityDeduction 接口，新增 QualityDimension 接口**

将 `types.ts` 第 74-77 行：

```typescript
export interface QualityDeduction {
  rule: string;
  points: number;
}
```

替换为：

```typescript
export interface QualityDimension {
  name: string;
  score: number;
  maxScore: number;
  note?: string;
}
```

- [ ] **Step 2: 更新 TaskQuestion.qualityDeductions 为 qualityDimensions**

将 `types.ts` 第 89 行：

```typescript
  qualityDeductions?: QualityDeduction[];
```

替换为：

```typescript
  qualityDimensions?: QualityDimension[];
```

- [ ] **Step 3: 验证 lint 通过**

Run: `npx max lint src/pages/UploadTask/types.ts` Expected: 无报错

- [ ] **Step 4: Commit**

```bash
git add src/pages/UploadTask/types.ts
git commit -m "refactor(upload): replace QualityDeduction with QualityDimension type"
```

---

### Task 2: 添加维度行样式

**Files:**

- Modify: `src/pages/UploadTask/Stage/workspaces/BatchReview.less`

- [ ] **Step 1: 在 `.scoreCell` 规则块之后添加维度行样式**

在 `BatchReview.less` 中 `.scoreNone { ... }` 规则之后、`.stemCell { ... }` 规则之前，插入：

```less
// ── 评分维度明细 ──

.dimRow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: @font-size-sm;
}

.dimName {
  color: @color-text-secondary;
}

.dimFull {
  color: @color-success;
  font-weight: @font-weight-semibold;
  font-variant-numeric: tabular-nums;
}

.dimPartial {
  color: @color-text;
  font-variant-numeric: tabular-nums;
}

.dimNote {
  font-size: @font-size-xs;
}
```

- [ ] **Step 2: 验证 LESS 编译通过**

Run: `npx max lint src/pages/UploadTask/Stage/workspaces/BatchReview.less` Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add src/pages/UploadTask/Stage/workspaces/BatchReview.less
git commit -m "style(upload): add dimension row styles for quality score details"
```

---

### Task 3: 改造 BatchReview 表格列

**Files:**

- Modify: `src/pages/UploadTask/Stage/workspaces/BatchReview.tsx`

- [ ] **Step 1: 替换"扣分明细"列为"评分明细"列**

将 `BatchReview.tsx` 第 169-181 行的整个列定义：

```tsx
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
```

替换为：

```tsx
    {
      title: '评分明细',
      dataIndex: 'qualityDimensions',
      render: (_: unknown, q) => (
        <Space direction="vertical" size={[4, 4]}>
          {(q.qualityDimensions ?? []).map((d, i) => {
            const full = d.score === d.maxScore;
            return (
              <span key={i} className={styles.dimRow}>
                <span className={styles.dimName}>{d.name}</span>
                <span className={full ? styles.dimFull : styles.dimPartial}>
                  {d.score}/{d.maxScore}
                </span>
                {!full && d.note && (
                  <Tag color="orange" className={styles.dimNote}>
                    {d.note}
                  </Tag>
                )}
              </span>
            );
          })}
        </Space>
      ),
    },
```

- [ ] **Step 2: 验证 lint 通过**

Run: `npx max lint src/pages/UploadTask/Stage/workspaces/BatchReview.tsx` Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add src/pages/UploadTask/Stage/workspaces/BatchReview.tsx
git commit -m "feat(upload): show per-dimension score details in quality review table"
```

---

### Task 4: 更新 mock 数据生成

**Files:**

- Modify: `mock/uploadTask.ts`

- [ ] **Step 1: 替换质量评分生成逻辑**

将 `mock/uploadTask.ts` 第 362-385 行的整个 `if (hasQualityScore) { ... }` 块：

```typescript
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
```

替换为：

```typescript
// AI 质量评分 + 自动判定：currentStage 在或晚于 quality 时即生成
if (hasQualityScore) {
  if (i <= 5) {
    // 自动通过：85 分左右，个别维度小扣分
    const minorDeduct = i % 2 === 0 ? 2 : 0;
    base.qualityDimensions = [
      { name: '题干完整度', score: 25, maxScore: 25 },
      { name: '公式/图片正确性', score: 20, maxScore: 20 },
      {
        name: '答案规范性',
        score: 20 - minorDeduct,
        maxScore: 20,
        note: minorDeduct ? '缺少单位' : undefined,
      },
      { name: '解析完整性', score: 20, maxScore: 20 },
    ];
    base.qualityScore = base.qualityDimensions.reduce((s, d) => s + d.score, 0);
    base.qualityVerdict = 'auto-pass';
  } else if (i <= 7) {
    // 中段：55-75 分，部分维度明显丢分
    base.qualityDimensions =
      i === 6
        ? [
            { name: '题干完整度', score: 20, maxScore: 25, note: '缺关键条件' },
            {
              name: '公式/图片正确性',
              score: 15,
              maxScore: 20,
              note: '公式格式不规范',
            },
            { name: '答案规范性', score: 18, maxScore: 20 },
            {
              name: '解析完整性',
              score: 12,
              maxScore: 20,
              note: '缺少解题步骤',
            },
          ]
        : [
            { name: '题干完整度', score: 18, maxScore: 25, note: '条件不清晰' },
            { name: '公式/图片正确性', score: 16, maxScore: 20 },
            { name: '答案规范性', score: 12, maxScore: 20, note: '缺少单位' },
            {
              name: '解析完整性',
              score: 12,
              maxScore: 20,
              note: '缺少解题步骤',
            },
          ];
    base.qualityScore = base.qualityDimensions.reduce((s, d) => s + d.score, 0);
    base.qualityVerdict = 'mid-need-review';
  } else {
    // 自动拒绝：30 分，多维度严重丢分
    base.qualityDimensions = [
      { name: '题干完整度', score: 8, maxScore: 25, note: '缺失关键信息' },
      {
        name: '公式/图片正确性',
        score: 10,
        maxScore: 20,
        note: '图片无法识别',
      },
      { name: '答案规范性', score: 2, maxScore: 20, note: '答案格式错误' },
      { name: '解析完整性', score: 10, maxScore: 20, note: '解析不完整' },
    ];
    base.qualityScore = base.qualityDimensions.reduce((s, d) => s + d.score, 0);
    base.qualityVerdict = 'auto-reject';
  }
}
```

**验证得分一致性：**

- auto-pass (i=1): 25+20+18+20 = 83 ≥ 80 ✅
- auto-pass (i=2): 25+20+20+20 = 85 ≥ 80 ✅
- auto-pass (i=3): 25+20+18+20 = 83 ≥ 80 ✅
- auto-pass (i=4): 25+20+20+20 = 85 ≥ 80 ✅
- auto-pass (i=5): 25+20+18+20 = 83 ≥ 80 ✅
- mid-review (i=6): 20+15+18+12 = 65 ∈ [55, 80) ✅
- mid-review (i=7): 18+16+12+12 = 58 ∈ [55, 80) ✅
- auto-reject (i=8): 8+10+2+10 = 30 < 55 ✅

- [ ] **Step 2: 验证 lint 通过**

Run: `npx max lint mock/uploadTask.ts` Expected: 无报错

- [ ] **Step 3: 启动 dev server 验证**

Run: `npm run dev`

访问 http://localhost:8000，进入质量检测阶段页面，验证：

1. "评分明细"列显示每个维度的得分/满分
2. 满分维度（如 "题干完整度 25/25"）文字为绿色
3. 非满分维度（如 "答案规范性 18/20"）后跟橙色 Tag 说明扣分原因
4. 评分列数字与维度得分之和一致
5. auto-pass / mid-review / auto-reject 的判定结果不变
6. 批量选择、保留/删除、统计卡片等功能正常

- [ ] **Step 4: Commit**

```bash
git add mock/uploadTask.ts
git commit -m "feat(mock): replace qualityDeductions with qualityDimensions in seed data"
```
