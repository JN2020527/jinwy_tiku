# 质量检测题干完整展示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在质量检测阶段的表格中直接渲染完整 HTML 题干，消除"查看全文"弹窗的额外点击。

**Architecture:** 改造现有 `BatchReview` 组件的题干列，将纯文本截断渲染替换为 `sanitizeHtml()` + `dangerouslySetInnerHTML` 行内渲染。移除不再需要的 `stemToPlainText` 函数、`previewQ` 状态和题干预览 Modal。

**Tech Stack:** React 18, Ant Design 5 (Table), LESS modules, DOMPurify (via `sanitizeHtml`)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/UploadTask/Stage/workspaces/BatchReview.tsx` | Modify | 题干列改为 HTML 行内渲染，删除截断函数和预览弹窗 |
| `src/pages/UploadTask/Stage/workspaces/BatchReview.less` | Modify | 新增 `.stemCell` 样式 |

---

### Task 1: 添加 `.stemCell` 样式

**Files:**
- Modify: `src/pages/UploadTask/Stage/workspaces/BatchReview.less`

- [ ] **Step 1: 在 `BatchReview.less` 末尾添加 `.stemCell` 样式**

在文件末尾（`.readOnlyHint` 规则之后）追加：

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

- [ ] **Step 2: 验证 LESS 编译通过**

Run: `cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app && npx max lint src/pages/UploadTask/Stage/workspaces/BatchReview.less`
Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add src/pages/UploadTask/Stage/workspaces/BatchReview.less
git commit -m "style(upload): add stemCell styles for inline HTML rendering"
```

---

### Task 2: 改造题干列渲染，移除弹窗预览

**Files:**
- Modify: `src/pages/UploadTask/Stage/workspaces/BatchReview.tsx`

- [ ] **Step 1: 删除 `stemToPlainText` 函数**

删除 `BatchReview.tsx` 第 26-29 行：

```tsx
// 删除这段
function stemToPlainText(html: string): string {
  const text = html.replace(/<[^>]+>/g, '').trim();
  return text.length > 120 ? text.slice(0, 120) + '…' : text;
}
```

- [ ] **Step 2: 删除 `previewQ` 状态声明**

删除 `BatchReview.tsx` 第 47 行：

```tsx
// 删除这行
const [previewQ, setPreviewQ] = useState<TaskQuestion | null>(null);
```

- [ ] **Step 3: 删除"查看全文" Modal**

删除 `BatchReview.tsx` 第 232-246 行的整个 Modal：

```tsx
// 删除这整段
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
```

- [ ] **Step 4: 改造题干列 render**

将 `columns` 数组中题干列（约第 107-118 行）：

```tsx
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
```

替换为：

```tsx
{
  title: '题干',
  dataIndex: 'stem',
  render: (_: string, q) => (
    <div
      className={styles.stemCell}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.stem) }}
    />
  ),
},
```

注意：列标题从 `'题干预览'` 改为 `'题干'`。

- [ ] **Step 5: 清理不再使用的 import**

检查 import 区域，如果 `Button` 和 `Space` 在文件其他位置仍有使用（批量操作栏、扣分明细列等），则保留。`Modal` 仍在"删除原因"弹窗中使用，保留。`Input` 仍在删除原因输入框中使用，保留。

确认以下 import 仍然需要：
- `Button` — ✅ 操作列、批量操作栏仍在用
- `Space` — ✅ 扣分明细列、操作列仍在用
- `Modal` — ✅ 删除原因弹窗仍在用
- `Input` — ✅ 删除原因输入框仍在用

无需删除任何 import。

- [ ] **Step 6: 验证编译通过**

Run: `cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app && npx max lint src/pages/UploadTask/Stage/workspaces/BatchReview.tsx`
Expected: 无报错（可能有 eslint-disable 注释相关的 warning，可忽略）

- [ ] **Step 7: 启动 dev server 验证页面**

Run: `cd /Users/jinwenyuan/my-repo/jinwy_tiku/my-app && npm run dev`

访问 http://localhost:8000，进入质量检测阶段页面，验证：
1. 题干列直接显示完整 HTML 内容（含公式、图片）
2. 无"查看全文"按钮和弹窗
3. 列标题显示为"题干"
4. 批量选择、保留/删除、扣分明细等其他功能正常
5. "删除原因"弹窗仍正常工作

- [ ] **Step 8: Commit**

```bash
git add src/pages/UploadTask/Stage/workspaces/BatchReview.tsx
git commit -m "feat(upload): render full HTML stem inline in quality detection table

Replace truncated plain-text preview with inline sanitizeHtml rendering.
Remove stemToPlainText function and preview Modal — no more extra clicks."
```
