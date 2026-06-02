# 质量检测评分维度明细

**日期：** 2026-06-02
**状态：** 已批准

## 背景

质量检测（Quality）阶段的 `BatchReview` 组件目前只展示扣分明细（`qualityDeductions`），如 "缺解析说明(-15)"。这只能告诉审核人哪里被扣了分，但无法看到每个维度的得分情况和满分是多少。

**痛点：**
- 只看扣分无法判断各维度表现，审核人需要心算反推
- 扣分规则名称（如 "选项格式不规范"）和实际评分维度之间没有对应关系
- 高分题也展示为空（无扣分 = 空列），浪费了信息空间

## 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 数据模型 | 替换 QualityDeduction 为 QualityDimension | 统一维度视角，同时包含得分与扣分 |
| 展示方式 | 合并为单列 "评分明细" | 信息密度高，不增加列数 |
| 列标题 | `扣分明细` → `评分明细` | 反映新的展示内容 |

## 数据模型变更

### 删除

```typescript
export interface QualityDeduction {
  rule: string;
  points: number;
}
```

### 新增

```typescript
export interface QualityDimension {
  name: string;       // 维度名：如 "题干完整度"、"公式正确性"
  score: number;      // 该维度实际得分
  maxScore: number;   // 该维度满分
  note?: string;      // 扣分说明（仅未满分时有）
}
```

### TaskQuestion 变更

```typescript
// 删除
qualityDeductions?: QualityDeduction[];

// 新增
qualityDimensions?: QualityDimension[];
```

**约束：** `qualityDimensions` 中所有 `score` 之和等于 `qualityScore`。

## 改动范围

4 个文件：

1. `src/pages/UploadTask/types.ts` — 类型定义
2. `src/pages/UploadTask/Stage/workspaces/BatchReview.tsx` — 表格列渲染
3. `src/pages/UploadTask/Stage/workspaces/BatchReview.less` — 维度行样式
4. `mock/uploadTask.ts` — mock 数据生成

### types.ts

- 删除 `QualityDeduction` 接口
- 新增 `QualityDimension` 接口
- `TaskQuestion.qualityDeductions` → `TaskQuestion.qualityDimensions`

### BatchReview.tsx

`扣分明细` 列改为 `评分明细` 列：

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
              <Tag color="orange" className={styles.dimNote}>{d.note}</Tag>
            )}
          </span>
        );
      })}
    </Space>
  ),
}
```

展示规则：
- 每个维度一行：`维度名 得分/满分 [扣分说明]`
- 满分维度：得分用绿色文字
- 非满分维度：得分用常规文字 + 橙色 Tag 注明扣分原因
- 无 `qualityDimensions` 时显示空（`?? []`兜底）

### BatchReview.less

新增样式：

```less
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

### mock/uploadTask.ts

替换 `qualityDeductions` 生成逻辑为 `qualityDimensions`。

**4 个评分维度（统一用于所有题目）：**
- 题干完整度（maxScore: 25）
- 公式/图片正确性（maxScore: 20）
- 答案规范性（maxScore: 20）
- 解析完整性（maxScore: 20）

总分满分 = 85（而非 100），qualityScore 直接取各维度 score 之和。

**得分分布：**

| 题目类型 | 题干完整度 | 公式/图片 | 答案规范 | 解析完整 | 总分 |
|----------|-----------|----------|---------|---------|------|
| auto-pass (i≤5) | 25 | 20 | 18-20 | 20 | 83-85 |
| mid-review (i=6) | 20(缺关键条件) | 15(格式不规范) | 18 | 12(缺步骤) | 65 |
| mid-review (i=7) | 18(条件不清晰) | 16 | 12(缺少单位) | 12(缺步骤) | 58 |
| auto-reject (i=8) | 8(缺失关键信息) | 10(无法识别) | 2(格式错误) | 10(不完整) | 30 |

**qualityScore 生成逻辑调整：** `qualityScore` 不再手动赋值，改为从 `qualityDimensions` 各维度 `score` 求和得出。`qualityVerdict` 判定逻辑不变（≥80 pass, ≥55 review, <55 reject）。

## 不变的部分

- `qualityScore` 字段保留，语义不变
- `qualityVerdict` 判定逻辑不变
- `scoreLevel()` 函数和评分列渲染不变
- `BatchReviewProps` 接口不变
- 统计摘要卡片、筛选控件、批量操作栏不变
- `Quality.tsx` 组件不变
- Service 层接口不变
