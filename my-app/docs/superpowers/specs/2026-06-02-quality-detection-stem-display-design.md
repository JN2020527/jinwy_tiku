# 质量检测阶段题干完整展示

**日期：** 2026-06-02
**状态：** 已批准

## 背景

质量检测（Quality）阶段使用 `BatchReview` 组件以表格展示题目列表。当前题干列通过 `stemToPlainText()` 函数将 HTML 转为纯文本并截断为 120 字符，用户需点击"查看全文"按钮弹窗才能看到完整题干内容。

**痛点：**
- 每审一题需额外点击弹窗，审 10 题就是 10 次弹窗操作
- 截断后丢失 HTML 格式——数学公式、图片、表格全部变成纯文本
- 弹窗遮挡表格，无法同时对比题干与扣分明细

## 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 布局方案 | C · 表格行内展示 | 改动最小，保留现有批量操作/分页/排序 |
| 展示范围 | 仅题干（stem） | 满足"一眼看清题目"核心需求，选项/答案/解析不在此阶段关注 |
| 长题干处理 | 不限高度，自然撑高 | 零点击、零信息损失 |

## 改动范围

仅涉及 2 个文件，不影响其他组件或服务层：

1. `src/pages/UploadTask/Stage/workspaces/BatchReview.tsx`
2. `src/pages/UploadTask/Stage/workspaces/BatchReview.less`

### 3.1 BatchReview.tsx 改动

**删除：**
- `stemToPlainText()` 函数（第 26-29 行）——不再需要纯文本转换
- `previewQ` state 及其 setter——不再需要弹窗预览状态
- "题干全文" Modal（第 232-246 行）——题干已在行内完整展示

**修改：**
- 题干列的 render 函数：从 `stemToPlainText(q.stem)` + "查看全文" 按钮，改为直接用 `sanitizeHtml()` + `dangerouslySetInnerHTML` 渲染完整 HTML

```tsx
// 改动前
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
}

// 改动后
{
  title: '题干',
  dataIndex: 'stem',
  render: (_: string, q) => (
    <div
      className={styles.stemCell}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.stem) }}
    />
  ),
}
```

**保留不变：**
- 表格结构、行选择、分页
- 批量保留/删除操作栏
- "删除原因" Modal
- `scoreColor()`、`showAll` 筛选逻辑
- `sanitizeHtml()` 调用（已覆盖 MathML、图片、表格白名单）

**列标题**从"题干预览"改为"题干"，因为不再是截断预览。

### 3.2 BatchReview.less 改动

新增 `.stemCell` 样式类：

```less
.stemCell {
  line-height: 1.7;
  font-size: @font-size-sm;

  img {
    max-width: 100%;
  }

  table {
    max-width: 100%;
    overflow-x: auto;
  }

  math {
    font-size: 1em;
  }
}
```

## 不变的部分

- 表格结构、批量选择、分页、排序——完全不变
- `BatchReviewProps` 接口——不变
- `Quality.tsx` 调用方式——不变
- Mock 数据和 Service 层——不变
- `sanitizeHtml()` 的白名单策略——已够用

## 估算改动量

约 30 行删除，10 行新增/修改。无新增依赖，无新增文件。
