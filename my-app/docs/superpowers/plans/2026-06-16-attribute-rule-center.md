# Attribute Rule Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“属性标签设置”升级为可支撑试题/试卷内容完善、标签打标、前台展示的属性规则中心，并将排序简化为运营人员手动拖拽顺序。

**Architecture:** 继续兼容现有 `TagCategory.tags` 数据结构，语义上将 `TagCategory` 视为属性定义、`tags` 视为属性选项，新增可选字段表达字段编码、适用对象、控件类型、场景规则、展示规则和选项顺序。页面改为“左侧分类 / 中间属性定义与选项顺序 / 右侧规则详情”的工作台，下游打标和内容完善本轮只对齐契约，不一次性重构。

**Tech Stack:** Umi Max 4, React 18, TypeScript, Ant Design 5, Ant Design Pro Components, mock API.

---

## File Structure

- Modify: `src/services/tagSystem.ts`
  - 扩展 `AttributeItem`、`TagCategory` 类型。
  - 增加属性状态、内容对象、控件类型、场景规则等联合类型。
  - 保持现有接口路径和函数名不变，避免影响当前页面。

- Modify: `mock/tagSystem.ts`
  - 为默认分类补充属性定义字段。
  - 为选项补充 `value`、`sort`、`status`、前台展示字段。
  - 修复 `POST/PUT` 分类和属性时丢失新增字段的问题。
  - 分类和选项按数组顺序返回；`sort` 字段只作为展示辅助，前台排序以数组顺序为准。

- Modify: `src/pages/ContentCenter/TagManage/Attributes.tsx`
  - 顶部上下文继续保留年级、学科。
  - 补充控件可访问名称。

- Modify: `src/pages/ContentCenter/TagManage/Attributes.less`
  - 顶部上下文工具条样式。

- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx`
  - 改为三栏工作台。
  - 中间展示属性定义下的选项，支持拖拽排序和上移/下移。
  - 右侧展示基础信息、内容完善、打标、前台展示规则。
  - 新增/编辑弹窗补充字段、场景规则和前台展示设置，但保持快速新增选项的低成本入口。

- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`
  - 三栏布局、窄屏降级、焦点态、拖拽态和长文本处理。

## Constraints

- 排序逻辑只支持运营人员手动排序：后台保存的选项数组顺序就是前台展示顺序。
- 不引入复杂权重、算法排序、推荐排序。
- 本轮不重构 `QuestionTagging` 和 `PaperUpload` 的表单生成逻辑，只在属性中心建立后续可接入的配置契约。
- 不引入新依赖。
- 不提交 Git commit。

---

### Task 1: Extend Attribute Contract And Mock Store

**Files:**
- Modify: `src/services/tagSystem.ts`
- Modify: `mock/tagSystem.ts`

- [ ] **Step 1: Extend service types**

Add optional fields while preserving existing `id/name/color/tags` consumers:

```ts
export type AttributeStatus = 'enabled' | 'disabled';
export type AttributeTarget = 'question' | 'paper' | 'common';
export type AttributeValueType = 'text' | 'number' | 'single' | 'multiple' | 'tree';
export type AttributeControlType =
  | 'input'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'rate'
  | 'treeSelect';
export type AttributeScene =
  | 'contentCompletion'
  | 'tagging'
  | 'frontDisplay';

export interface AttributeSceneRule {
  scene: AttributeScene;
  enabled: boolean;
  required?: boolean;
}

export interface AttributeDisplayRule {
  visible: boolean;
  filterable?: boolean;
  displayName?: string;
}

export interface AttributeItem {
  id: string;
  name: string;
  color: string;
  value?: string;
  sort?: number;
  status?: AttributeStatus;
  displayName?: string;
  frontVisible?: boolean;
  star?: number;
}

export interface TagCategory {
  id: string;
  name: string;
  tags: AttributeItem[];
  code?: string;
  description?: string;
  target?: AttributeTarget;
  valueType?: AttributeValueType;
  controlType?: AttributeControlType;
  required?: boolean;
  selectionMode?: 'single' | 'multiple';
  status?: AttributeStatus;
  sceneRules?: AttributeSceneRule[];
  displayRule?: AttributeDisplayRule;
}
```

- [ ] **Step 2: Update mock seed data**

For each default category, add stable `code`, `target`, `valueType`, `controlType`, `selectionMode`, `required`, `status`, `sceneRules`, and `displayRule`.

Examples:

```ts
{
  id: 'cat-1',
  name: '难度',
  code: 'difficulty',
  target: 'question',
  valueType: 'single',
  controlType: 'rate',
  selectionMode: 'single',
  required: true,
  status: 'enabled',
  sceneRules: [
    { scene: 'contentCompletion', enabled: true, required: true },
    { scene: 'tagging', enabled: true, required: true },
    { scene: 'frontDisplay', enabled: true },
  ],
  displayRule: {
    visible: true,
    filterable: true,
    displayName: '难度',
  },
  tags: [
    {
      id: 'diff-1',
      name: '容易',
      value: 'easy',
      star: 1,
      color: 'green',
      sort: 0,
      status: 'enabled',
      frontVisible: true,
    },
  ],
}
```

- [ ] **Step 3: Preserve extended fields in mock CRUD**

Update `POST /api/tags/category`, `PUT /api/tags/category`, `POST /api/tags/attribute`, and `PUT /api/tags/attribute` so they merge known fields instead of rebuilding objects with only `id/name/color`.

- [ ] **Step 4: Normalize option order**

Add a small helper that maps the current array index into `sort` before responses and after category updates:

```ts
const normalizeTagOrder = (category: MockTagCategory) => {
  category.tags = category.tags.map((tag, index) => ({
    ...tag,
    sort: index,
  }));
  return category;
};
```

- [ ] **Step 5: Verify type contract**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: no new type errors from `tagSystem.ts` or `mock/tagSystem.ts`.

---

### Task 2: Redesign Attribute Rule Workspace

**Files:**
- Modify: `src/pages/ContentCenter/TagManage/Attributes.tsx`
- Modify: `src/pages/ContentCenter/TagManage/Attributes.less`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`

- [ ] **Step 1: Keep context controls and add accessible labels**

Add `aria-label` to grade and subject selects:

```tsx
<Select
  aria-label="选择年级"
  value={selectedGrade}
  onChange={setSelectedGrade}
  style={{ width: 120 }}
  options={GRADE_OPTIONS}
/>
```

- [ ] **Step 2: Split panel state**

Use separate state for selected category, selected option, modal editing, quick-add text, search text, and drag sorting.

```ts
const [activeCategoryId, setActiveCategoryId] = useState<string>('');
const [activeOptionId, setActiveOptionId] = useState<string>('');
const [selectedAttr, setSelectedAttr] = useState<AttributeItem | null>(null);
const [draggingOptionId, setDraggingOptionId] = useState<string>('');
```

- [ ] **Step 3: Render three regions**

Use:

- `attribute-category-panel` for left navigation.
- `attribute-option-panel` for the editable option list.
- `attribute-rule-panel` for detail and rule preview.

The right panel must show:

- 属性编码 `category.code`
- 适用对象 `category.target`
- 字段类型 `category.valueType`
- 控件类型 `category.controlType`
- 是否必填 `category.required`
- 内容完善 / 打标 / 前台展示开关状态
- 前台展示名称与是否筛选
- 当前选项的前台展示状态

- [ ] **Step 4: Implement manual ordering**

Use HTML drag events on option rows, plus up/down icon buttons. On order change, call `updateTagCategory` with the same category metadata and the reordered `tags` array.

```ts
const persistOptionOrder = async (nextTags: AttributeItem[]) => {
  if (!activeCategory) return;
  const res = await updateTagCategory({
    ...tagContext,
    ...activeCategory,
    tags: nextTags.map((tag, index) => ({ ...tag, sort: index })),
  });
  if (res.success) {
    message.success('排序已保存');
    onRefresh();
  }
};
```

Important: no weight field, no score field, no algorithm sort UI.

- [ ] **Step 5: Improve modals**

The category modal should allow editing:

- `name`
- `code`
- `target`
- `valueType`
- `controlType`
- `required`
- `description`
- content completion enabled / required
- tagging enabled / required
- front display enabled / visible / filterable / display name

The option modal should allow editing:

- `name`
- `displayName`
- `value`
- `color`
- `status`
- `frontVisible`

- [ ] **Step 6: Add accessibility and responsive styles**

Add:

- `aria-label` to icon-only buttons.
- `aria-current="true"` on selected category and selected option.
- `:focus-visible` styles for custom buttons.
- Three-column desktop grid.
- Tablet/mobile single-column fallback.

- [ ] **Step 7: Verify UI build**

Run:

```bash
npx tsc --noEmit --pretty false
npm run build
```

Expected: both commands complete successfully.

---

### Task 3: Integration Review And Downstream Contract Notes

**Files:**
- Modify: `docs/superpowers/plans/2026-06-16-attribute-rule-center.md`
- Read-only: `src/pages/QuestionTagging/index.tsx`
- Read-only: `src/pages/QuestionTagging/components/TaggingForm.tsx`
- Read-only: `src/pages/PaperUpload/Edit/components/AttributePanel.tsx`

- [ ] **Step 1: Confirm downstream remains untouched**

Check the diff:

```bash
git diff -- src/pages/QuestionTagging src/pages/PaperUpload
```

Expected: no changes for this task unless a type-only compatibility fix is required.

- [ ] **Step 2: Record follow-up integration sequence**

Append a brief follow-up section to this plan:

```md
## Follow-Up Integration

1. Add a configuration query for scene-specific attribute fields.
2. Replace `QuestionTagging` hard-coded fields with config-driven rendering.
3. Replace `PaperUpload/Edit` hard-coded difficulty and knowledge-point controls.
4. Change tag completion status to count fields with `sceneRules.scene = "tagging"` and `required = true`.
```

- [ ] **Step 3: Final verification**

Run:

```bash
npx tsc --noEmit --pretty false
npm run build
```

Expected: both commands pass.

---

## Self-Review

- Spec coverage: Covers attribute definition, option values, usage rules, front display, and manual ordering. Excludes algorithmic sorting by design.
- Placeholder scan: No TBD or unknown implementation sections.
- Type consistency: Existing `TagCategory.tags` remains the compatibility layer; new fields are optional and do not break current consumers.

## Follow-Up Integration

1. Add a scene-specific attribute configuration query for tagging, content completion, and front display.
2. Replace `QuestionTagging` hard-coded fields with config-driven rendering after the attribute center contract stabilizes.
3. Replace `PaperUpload/Edit` hard-coded difficulty and knowledge-point controls with config-driven fields.
4. Change tag completion status to count fields whose `sceneRules.scene = "tagging"` and `required = true`.
5. Keep front-end display order equal to the saved option array order; do not add ranking weights unless a separate product requirement appears.
