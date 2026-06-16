# Attribute Settings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将属性设置重构为“属性定义 / 使用设置”两段式配置，并让试卷上传、试题打标等消费端可以按业务场景读取属性配置。

**Architecture:** 继续沿用前端 mock API，不引入后端依赖。`TagCategory` 只表示属性定义与枚举值，新增 `AttributeUsageRule` 表示属性在业务场景中的使用规则；页面用一级 Tab 分离定义维护和使用配置，消费端通过场景化服务函数读取合并后的可用属性。

**Tech Stack:** Umi Max 4, React 18, TypeScript, Ant Design 5, Ant Design Pro Components, mock API.

---

## Source Spec

- `docs/superpowers/specs/2026-06-16-attribute-settings-redesign.md`

## File Structure

- Modify: `src/services/tagSystem.ts`
  - 收敛属性定义类型：`paper`、`question`、`knowledge`、`topic`。
  - 新增适用范围：`global`、`grade`、`subject`、`gradeSubject`。
  - 新增八类使用场景、筛选区、使用规则类型。
  - 新增使用规则 CRUD 与场景消费接口。

- Modify: `mock/tagSystem.ts`
  - 将属性定义从单一 `grade + subject` store 调整为支持全局、年级、学科、年级+学科命中的 store。
  - 新增使用规则 mock store。
  - 迁移旧的 `sceneRules/displayRule` 种子数据为新的使用场景。
  - 增加知识点属性、专题属性种子数据。

- Modify: `src/pages/ContentCenter/TagManage/Attributes.tsx`
  - 同时加载属性定义和使用规则。
  - 保留 PC 端顶部年级、学科上下文。
  - 将数据传入新的属性设置工作台。

- Replace: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx`
  - 作为属性设置工作台 shell，负责一级 Tab、刷新、上下文透传。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionTab.tsx`
  - 属性定义列表、属性类型切换、属性新增/编辑/删除、选项值管理。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionModal.tsx`
  - 属性定义表单，只包含属性类型、适用范围、年级/学科、名称、状态。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeOptionList.tsx`
  - 枚举值列表、新增、编辑、删除、拖拽排序、启停。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeUsageTab.tsx`
  - 八个使用场景的启用、必填、主筛选区/更多筛选区、拖拽排序配置。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeStatusPill.tsx`
  - 统一启用/停用标识样式，复用在定义、选项、使用规则中。

- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`
  - 调整为 Tab 页面、定义区、选项区、使用设置区的 PC 布局样式。

- Modify: `src/pages/PaperUpload/index.tsx`
  - 试卷录入模式读取 `paperUpload` 使用配置，动态渲染试卷属性字段。

- Modify: `src/pages/QuestionTagging/components/TaggingForm.tsx`
  - 读取 `questionTagging` 使用配置，动态渲染试题打标字段，并支持批量打标开关。

- Modify: `src/pages/QuestionTagging/index.tsx`
  - 从当前试卷/试题派生年级、学科上下文并传给打标表单。

- Modify: `src/pages/QuestionTagging/types.ts`
  - 为试题和试卷补充年级、动态属性字段。

## Constraints

- 不把属性编码、取值字段、字段类型、控件类型暴露为主流程字段。
- 枚举值不使用彩色标签，只使用克制文本列表。
- 排序只做运营手动拖拽排序，保存后的数组顺序就是业务展示顺序。
- `试卷上传` 只面向试卷属性；`试题打标` 只面向试题属性。
- `试题列表筛选` 可使用试题属性和所属试卷属性。
- 知识点属性、专题属性只服务树节点伴随展示，不参与试题/试卷筛选。
- 当前仓库没有 test script，验证以 `npx tsc --noEmit --pretty false`、`npm run build` 和浏览器手工检查为准。

---

### Task 1: Update Attribute Contracts

**Files:**
- Modify: `src/services/tagSystem.ts`

- [ ] **Step 1: Replace old public attribute target model**

Change the public model from `question | paper | common` to the four business-owned attribute types:

```ts
export type AttributeStatus = 'enabled' | 'disabled';
export type AttributeTarget = 'paper' | 'question' | 'knowledge' | 'topic';
export type AttributeScope = 'global' | 'grade' | 'subject' | 'gradeSubject';
export type AttributeFilterArea = 'primary' | 'more';
export type AttributeSelectionMode = 'single' | 'multiple';
```

- [ ] **Step 2: Add usage scene types**

Add the new scene contract:

```ts
export type AttributeUsageScene =
  | 'paperUpload'
  | 'paperCardDisplay'
  | 'paperListFilter'
  | 'questionTagging'
  | 'questionCardDisplay'
  | 'questionListFilter'
  | 'knowledgeTreeNodeDisplay'
  | 'topicTreeNodeDisplay';

export interface AttributeUsageRule {
  id: string;
  attributeId: string;
  scene: AttributeUsageScene;
  scope: AttributeScope;
  grades?: string[];
  subjects?: string[];
  enabled: boolean;
  required?: boolean;
  filterArea?: AttributeFilterArea;
  sort: number;
}
```

- [ ] **Step 3: Simplify attribute definition shape**

Keep legacy fields optional only for migration compatibility. Main UI must not render them.

```ts
export interface AttributeItem {
  id: string;
  name: string;
  color?: string;
  value?: string;
  sort?: number;
  status?: AttributeStatus;
  star?: number;
}

export interface TagCategory {
  id: string;
  name: string;
  tags: AttributeItem[];
  code?: string;
  description?: string;
  target: AttributeTarget;
  scope: AttributeScope;
  grades?: string[];
  subjects?: string[];
  status?: AttributeStatus;
  sort?: number;
  selectionMode?: AttributeSelectionMode;
  sceneRules?: AttributeSceneRule[];
  displayRule?: AttributeDisplayRule;
}
```

- [ ] **Step 4: Add service functions for usage rules**

Add request helpers:

```ts
export async function getAttributeUsageRules(params: TagContextParams) {
  return request<ApiResponse<AttributeUsageRule[]>>(
    '/api/tags/attribute-usage-rules',
    { method: 'GET', params },
  );
}

export async function updateAttributeUsageRules(data: {
  grade: string;
  subject: string;
  rules: AttributeUsageRule[];
}) {
  return request<ApiResponse<AttributeUsageRule[]>>(
    '/api/tags/attribute-usage-rules',
    { method: 'PUT', data },
  );
}

export async function getSceneAttributes(
  params: TagContextParams & { scene: AttributeUsageScene },
) {
  return request<
    ApiResponse<Array<{ attribute: TagCategory; rule: AttributeUsageRule }>>
  >('/api/tags/scene-attributes', { method: 'GET', params });
}
```

- [ ] **Step 5: Verify service types**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: no new type errors from `src/services/tagSystem.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/services/tagSystem.ts
git commit -m "feat(tag-system): define attribute usage contracts"
```

---

### Task 2: Rebuild Mock Attribute Store

**Files:**
- Modify: `mock/tagSystem.ts`

- [ ] **Step 1: Mirror service types in mock**

Update mock-local types to match Task 1:

```ts
type AttributeTarget = 'paper' | 'question' | 'knowledge' | 'topic';
type AttributeScope = 'global' | 'grade' | 'subject' | 'gradeSubject';
type AttributeFilterArea = 'primary' | 'more';
type AttributeUsageScene =
  | 'paperUpload'
  | 'paperCardDisplay'
  | 'paperListFilter'
  | 'questionTagging'
  | 'questionCardDisplay'
  | 'questionListFilter'
  | 'knowledgeTreeNodeDisplay'
  | 'topicTreeNodeDisplay';
```

- [ ] **Step 2: Add scope matching helpers**

Add deterministic scope matching and priority:

```ts
const getScopePriority = (scope?: AttributeScope) => {
  if (scope === 'gradeSubject') return 3;
  if (scope === 'subject') return 2;
  if (scope === 'grade') return 1;
  return 0;
};

const matchesScope = (
  item: { scope?: AttributeScope; grades?: string[]; subjects?: string[] },
  context: TagContext,
) => {
  if (!item.scope || item.scope === 'global') return true;
  if (item.scope === 'grade') return item.grades?.includes(context.grade);
  if (item.scope === 'subject') return item.subjects?.includes(context.subject);
  return (
    item.grades?.includes(context.grade) &&
    item.subjects?.includes(context.subject)
  );
};
```

- [ ] **Step 3: Add dedupe helper**

Use `code` first, then `name`, so more specific scoped attributes override global attributes:

```ts
const getAttributeKey = (category: MockTagCategory) =>
  category.code || category.name;

const mergeScopedCategories = (
  categories: MockTagCategory[],
  context: TagContext,
) => {
  const matched = categories
    .filter((category) => matchesScope(category, context))
    .sort(
      (a, b) =>
        getScopePriority(a.scope) - getScopePriority(b.scope) ||
        (a.sort || 0) - (b.sort || 0),
    );

  const merged = new Map<string, MockTagCategory>();
  matched.forEach((category) => {
    merged.set(getAttributeKey(category), normalizeTagOrder({ ...category }));
  });

  return Array.from(merged.values()).sort(
    (a, b) => (a.sort || 0) - (b.sort || 0),
  );
};
```

- [ ] **Step 4: Replace seed categories**

Seed at least these definitions:

```ts
const defaultTagCategoryTemplates: MockTagCategory[] = [
  {
    id: 'paper-year',
    name: '年份',
    code: 'paper_year',
    target: 'paper',
    scope: 'global',
    status: 'enabled',
    sort: 1,
    tags: [
      { id: 'year-2026', name: '2026', sort: 0, status: 'enabled' },
      { id: 'year-2025', name: '2025', sort: 1, status: 'enabled' },
      { id: 'year-2024', name: '2024', sort: 2, status: 'enabled' },
    ],
  },
  {
    id: 'paper-region',
    name: '地区',
    code: 'paper_region',
    target: 'paper',
    scope: 'global',
    status: 'enabled',
    sort: 2,
    tags: [
      { id: 'region-national', name: '全国', sort: 0, status: 'enabled' },
      { id: 'region-beijing', name: '北京', sort: 1, status: 'enabled' },
      { id: 'region-shanxi', name: '山西', sort: 2, status: 'enabled' },
    ],
  },
  {
    id: 'question-difficulty',
    name: '难度',
    code: 'difficulty',
    target: 'question',
    scope: 'global',
    status: 'enabled',
    sort: 10,
    tags: [
      { id: 'diff-1', name: '容易', sort: 0, status: 'enabled' },
      { id: 'diff-2', name: '较易', sort: 1, status: 'enabled' },
      { id: 'diff-3', name: '中等', sort: 2, status: 'enabled' },
      { id: 'diff-4', name: '较难', sort: 3, status: 'enabled' },
      { id: 'diff-5', name: '困难', sort: 4, status: 'enabled' },
    ],
  },
  {
    id: 'knowledge-first-exam',
    name: '首次考查',
    code: 'knowledge_first_exam',
    target: 'knowledge',
    scope: 'subject',
    subjects: ['chinese'],
    status: 'enabled',
    sort: 30,
    tags: [
      { id: 'first-exam-2025', name: '2025 首次考查', sort: 0, status: 'enabled' },
    ],
  },
  {
    id: 'topic-frequency',
    name: '考频',
    code: 'topic_frequency',
    target: 'topic',
    scope: 'global',
    status: 'enabled',
    sort: 40,
    tags: [
      { id: 'freq-high', name: '高频', sort: 0, status: 'enabled' },
      { id: 'freq-medium', name: '中频', sort: 1, status: 'enabled' },
      { id: 'freq-low', name: '低频', sort: 2, status: 'enabled' },
    ],
  },
];
```

- [ ] **Step 5: Seed default usage rules**

Add rules only for valid business combinations:

```ts
const defaultAttributeUsageRules: MockAttributeUsageRule[] = [
  {
    id: 'usage-paper-upload-year',
    attributeId: 'paper-year',
    scene: 'paperUpload',
    scope: 'global',
    enabled: true,
    required: true,
    sort: 1,
  },
  {
    id: 'usage-question-tagging-difficulty',
    attributeId: 'question-difficulty',
    scene: 'questionTagging',
    scope: 'global',
    enabled: true,
    required: true,
    sort: 1,
  },
  {
    id: 'usage-question-filter-difficulty',
    attributeId: 'question-difficulty',
    scene: 'questionListFilter',
    scope: 'global',
    enabled: true,
    filterArea: 'primary',
    sort: 1,
  },
  {
    id: 'usage-knowledge-node-first-exam',
    attributeId: 'knowledge-first-exam',
    scene: 'knowledgeTreeNodeDisplay',
    scope: 'subject',
    subjects: ['chinese'],
    enabled: true,
    sort: 1,
  },
];
```

- [ ] **Step 6: Add API handlers**

Add these handlers:

```ts
'GET /api/tags/attribute-usage-rules': (req: Request, res: Response) => {
  const context = getTagContext(req);
  res.send({
    success: true,
    data: getUsageRulesByContext(context),
  });
},

'PUT /api/tags/attribute-usage-rules': (req: Request, res: Response) => {
  const context = getTagContext(req);
  const incomingRules = createMergedUsageRules(req.body.rules || [], context);
  attributeUsageRuleStore = replaceRulesForContext(
    attributeUsageRuleStore,
    incomingRules,
    context,
  );
  res.send({ success: true, data: getUsageRulesByContext(context) });
},

'GET /api/tags/scene-attributes': (req: Request, res: Response) => {
  const context = getTagContext(req);
  const scene = req.query.scene as AttributeUsageScene;
  res.send({
    success: true,
    data: getSceneAttributesByContext(context, scene),
  });
},
```

- [ ] **Step 7: Verify mock API compiles**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: no new type errors from `mock/tagSystem.ts`.

- [ ] **Step 8: Commit**

```bash
git add mock/tagSystem.ts
git commit -m "feat(tag-system): separate attribute definitions and usage rules"
```

---

### Task 3: Build Attribute Settings Tab Shell

**Files:**
- Modify: `src/pages/ContentCenter/TagManage/Attributes.tsx`
- Replace: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`

- [ ] **Step 1: Load usage rules with definitions**

In `Attributes.tsx`, add:

```ts
const [usageRules, setUsageRules] = useState<AttributeUsageRule[]>([]);
```

Fetch both APIs in `fetchData`:

```ts
const [categoryRes, usageRes] = await Promise.all([
  getTagCategories({ grade: selectedGrade, subject: selectedSubject }),
  getAttributeUsageRules({ grade: selectedGrade, subject: selectedSubject }),
]);

if (categoryRes.success) setTagCategories(categoryRes.data);
if (usageRes.success) setUsageRules(usageRes.data);
```

- [ ] **Step 2: Pass rules into panel**

Render:

```tsx
<AttributeTagsPanel
  tagCategories={tagCategories}
  usageRules={usageRules}
  selectedGrade={selectedGrade}
  selectedSubject={selectedSubject}
  onRefresh={fetchData}
/>
```

- [ ] **Step 3: Replace panel shell with first-level tabs**

The shell should render only:

```tsx
<Tabs
  className="attribute-settings-tabs"
  items={[
    {
      key: 'definition',
      label: '属性定义',
      children: <AttributeDefinitionTab {...definitionProps} />,
    },
    {
      key: 'usage',
      label: '使用设置',
      children: <AttributeUsageTab {...usageProps} />,
    },
  ]}
/>
```

- [ ] **Step 4: Remove old right-side rule details**

Delete the old in-page `属性规则` region from `AttributeTagsPanel.tsx`. Rule details now belong only to `AttributeUsageTab.tsx`.

- [ ] **Step 5: Verify shell route**

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:8000/tag-system/attributes
```

Expected:
- 页面顶部仍有年级、学科选择。
- 下方出现 `属性定义` / `使用设置` 两个一级 Tab。
- 切换 Tab 不报错。

- [ ] **Step 6: Commit**

```bash
git add src/pages/ContentCenter/TagManage/Attributes.tsx src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less
git commit -m "feat(tag-system): split attribute settings into definition and usage tabs"
```

---

### Task 4: Implement Attribute Definition Tab

**Files:**
- Create: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionTab.tsx`
- Create: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionModal.tsx`
- Create: `src/pages/ContentCenter/TagManage/components/AttributeOptionList.tsx`
- Create: `src/pages/ContentCenter/TagManage/components/AttributeStatusPill.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`

- [ ] **Step 1: Add target labels**

Use exactly these labels:

```ts
const TARGET_OPTIONS = [
  { label: '试卷属性', value: 'paper' },
  { label: '试题属性', value: 'question' },
  { label: '知识点属性', value: 'knowledge' },
  { label: '专题属性', value: 'topic' },
];
```

- [ ] **Step 2: Add scope labels**

Use exactly these labels:

```ts
const SCOPE_OPTIONS = [
  { label: '全局通用', value: 'global' },
  { label: '指定年级', value: 'grade' },
  { label: '指定学科', value: 'subject' },
  { label: '指定年级+学科', value: 'gradeSubject' },
];
```

- [ ] **Step 3: Build definition modal**

Modal fields:
- 属性类型，required。
- 适用范围，required。
- 年级，多选，仅 `grade` / `gradeSubject` 出现。
- 学科，多选，仅 `subject` / `gradeSubject` 出现。
- 属性名称，required。
- 状态，默认 `enabled`。

Do not include code, value field, field type, control type, front display name, required, filterable, or color.

- [ ] **Step 4: Build definition list**

Definition list row must show:
- 属性名称。
- 属性类型。
- 适用范围。
- 枚举值数量。
- 启用/停用 pill。
- 编辑/删除 actions。

Do not show `code` as row subtitle.

- [ ] **Step 5: Build option list**

Option row must show:
- Drag handle.
- Normal number: `1`、`2`、`3`, not `#1`.
- Option name.
- 启用/停用 pill.
- 编辑/删除 actions.

Do not show duplicate display name. Do not show color tags. Do not show internal value in the main list.

- [ ] **Step 6: Put add option entry inside option area**

The add input belongs above the option rows in `AttributeOptionList.tsx`, not in a separate toolbar with search.

Do not render search for option values.

- [ ] **Step 7: Save option ordering**

On drag/drop, call `updateTagCategory` with reordered `tags`:

```ts
const nextTags = reorder(tags, sourceId, targetId).map((tag, index) => ({
  ...tag,
  sort: index,
}));

await updateTagCategory({
  ...tagContext,
  ...activeCategory,
  tags: nextTags,
});
```

- [ ] **Step 8: Verify definition interactions**

Manual check at `/tag-system/attributes`:
- Add a `知识点属性` named `重难点`.
- Scope can be `全局通用`.
- Add option values `一般`、`重要`、`核心`.
- Reorder values by dragging.
- Edit one option to `核心考点`.
- Disable one option.
- Refresh page; order and status are preserved.

- [ ] **Step 9: Commit**

```bash
git add src/pages/ContentCenter/TagManage/components/AttributeDefinitionTab.tsx src/pages/ContentCenter/TagManage/components/AttributeDefinitionModal.tsx src/pages/ContentCenter/TagManage/components/AttributeOptionList.tsx src/pages/ContentCenter/TagManage/components/AttributeStatusPill.tsx src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less
git commit -m "feat(tag-system): implement attribute definition management"
```

---

### Task 5: Implement Usage Settings Tab

**Files:**
- Create: `src/pages/ContentCenter/TagManage/components/AttributeUsageTab.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`

- [ ] **Step 1: Define scene configuration**

Use this configuration in `AttributeUsageTab.tsx`:

```ts
const USAGE_SCENES = [
  {
    scene: 'paperUpload',
    title: '试卷上传',
    targets: ['paper'],
    requiredConfigurable: true,
  },
  {
    scene: 'paperCardDisplay',
    title: '试卷卡片展示',
    targets: ['paper'],
  },
  {
    scene: 'paperListFilter',
    title: '试卷列表筛选',
    targets: ['paper'],
    filterAreaConfigurable: true,
  },
  {
    scene: 'questionTagging',
    title: '试题打标',
    targets: ['question'],
    requiredConfigurable: true,
  },
  {
    scene: 'questionCardDisplay',
    title: '试题卡片展示',
    targets: ['question'],
  },
  {
    scene: 'questionListFilter',
    title: '试题列表筛选',
    targets: ['question', 'paper'],
    filterAreaConfigurable: true,
  },
  {
    scene: 'knowledgeTreeNodeDisplay',
    title: '知识树节点展示',
    targets: ['knowledge'],
  },
  {
    scene: 'topicTreeNodeDisplay',
    title: '专题树节点展示',
    targets: ['topic'],
  },
] as const;
```

- [ ] **Step 2: Filter selectable attributes by scene**

Only show enabled definitions matching the scene targets:

```ts
const selectableAttributes = tagCategories.filter(
  (category) =>
    category.status !== 'disabled' &&
    sceneConfig.targets.includes(category.target),
);
```

- [ ] **Step 3: Render active usage list**

Each active row shows:
- Drag handle.
- Normal number.
- Attribute name.
- Attribute type.
- Required switch only for `paperUpload` and `questionTagging`.
- Filter area segmented control only for `paperListFilter` and `questionListFilter`.
- Remove action.

- [ ] **Step 4: Add attributes to a scene**

Use a Select or Dropdown button labelled `添加属性`. It should contain only allowed, enabled, not-yet-added attributes for the current scene.

When adding a filter scene, default `filterArea` to `more`.

- [ ] **Step 5: Persist usage rules**

On every add/remove/sort/toggle change, save the full context rules:

```ts
await updateAttributeUsageRules({
  grade: selectedGrade,
  subject: selectedSubject,
  rules: nextRules,
});
```

- [ ] **Step 6: Verify business constraints**

Manual check:
- `试卷上传` cannot add `试题属性`.
- `试题打标` cannot add `试卷属性`.
- `试题列表筛选` can add both `试题属性` and `试卷属性`.
- `知识树节点展示` only shows `知识点属性`.
- `专题树节点展示` only shows `专题属性`.
- Filter scenes can switch between `主筛选区` and `更多筛选区`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ContentCenter/TagManage/components/AttributeUsageTab.tsx src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less
git commit -m "feat(tag-system): implement attribute usage settings"
```

---

### Task 6: Wire Paper Upload Consumption

**Files:**
- Modify: `src/pages/PaperUpload/index.tsx`
- Modify: `src/services/paperUpload.ts`

- [ ] **Step 1: Extend upload metadata**

Add dynamic attributes to `PaperMetadata`:

```ts
export interface PaperMetadata {
  name: string;
  subject: string;
  grade?: string;
  year?: string;
  region?: string;
  paperType?: string;
  mode: 'paper' | 'question';
  attributes?: Record<string, string | string[]>;
}
```

- [ ] **Step 2: Add grade as upload context**

Add a required grade select next to subject:

```tsx
<ProFormSelect
  name="grade"
  label="年级"
  colProps={{ span: 6 }}
  options={[
    { label: '七年级', value: 'grade-7' },
    { label: '八年级', value: 'grade-8' },
    { label: '九年级', value: 'grade-9' },
    { label: '高一', value: 'grade-10' },
    { label: '高二', value: 'grade-11' },
    { label: '高三', value: 'grade-12' },
  ]}
  rules={[{ required: true, message: '请选择年级' }]}
/>
```

- [ ] **Step 3: Load paper upload attributes**

In `src/pages/PaperUpload/index.tsx`, add state:

```ts
const [uploadAttributes, setUploadAttributes] = useState<
  Array<{ attribute: TagCategory; rule: AttributeUsageRule }>
>([]);
```

After grade/subject changes, call:

```ts
const res = await getSceneAttributes({
  grade: form.getFieldValue('grade'),
  subject: form.getFieldValue('subject'),
  scene: 'paperUpload',
});
```

- [ ] **Step 4: Render dynamic paper fields in paper mode**

For each `uploadAttributes` item, render:

```tsx
<ProFormSelect
  key={attribute.id}
  name={['attributes', attribute.code || attribute.id]}
  label={attribute.name}
  colProps={{ span: 6 }}
  options={attribute.tags
    .filter((tag) => tag.status !== 'disabled')
    .map((tag) => ({ label: tag.name, value: tag.id }))}
  rules={
    rule.required
      ? [{ required: true, message: `请选择${attribute.name}` }]
      : undefined
  }
  hidden={mode === 'question'}
/>
```

- [ ] **Step 5: Avoid duplicate static fields**

Keep `试卷名称` and `学科` as base fields. Remove static `年份`、`试题来源`、`地区` fields once their matching dynamic attributes are seeded and displayed.

- [ ] **Step 6: Verify upload form**

Manual check:
- Open `/question-bank/word-upload`.
- In `试卷录入模式`, configured `paperUpload` fields appear after subject/grade context is selected.
- Required usage rules show required validation.
- In `试题录入模式`, paper upload attributes are hidden.

- [ ] **Step 7: Commit**

```bash
git add src/pages/PaperUpload/index.tsx src/services/paperUpload.ts
git commit -m "feat(paper-upload): render configured paper upload attributes"
```

---

### Task 7: Wire Question Tagging Consumption

**Files:**
- Modify: `src/pages/QuestionTagging/index.tsx`
- Modify: `src/pages/QuestionTagging/components/TaggingForm.tsx`
- Modify: `src/pages/QuestionTagging/types.ts`
- Modify: `src/pages/QuestionTagging/mockData.ts`

- [ ] **Step 1: Extend question dynamic attributes**

Add grade and a dynamic attribute bag to the question type:

```ts
grade?: string;
attributes?: Record<string, string | string[]>;
```

- [ ] **Step 2: Extend paper context**

Add grade to the paper type:

```ts
grade?: string;
```

When aggregating papers in `src/pages/QuestionTagging/index.tsx`, copy `q.grade`:

```ts
grade: q.grade || 'grade-7',
```

- [ ] **Step 3: Seed mock grade data**

In `src/pages/QuestionTagging/mockData.ts`, add `grade: 'grade-7'` to junior-middle-school math/chinese/english/physics/chemistry mock questions unless an item already has a more specific grade.

- [ ] **Step 4: Pass grade into TaggingForm**

Derive current grade from the selected paper or selected question:

```ts
const currentGrade = useMemo(() => {
  if (currentQuestion?.grade) return currentQuestion.grade;
  if (currentPaperId && papers.length > 0) {
    const currentPaper = papers.find((p) => p.id === currentPaperId);
    return currentPaper?.grade || 'grade-7';
  }
  return 'grade-7';
}, [currentQuestion?.grade, currentPaperId, papers]);
```

Pass it into the form:

```tsx
<TaggingForm
  ref={taggingFormRef}
  question={currentQuestion}
  selectedQuestions={selectedQuestions}
  isBatchMode={isBatchMode}
  grade={currentGrade}
  subject={currentSubject}
  onUpdate={handleUpdate}
  onBatchUpdate={handleBatchUpdate}
  onSaveAndNext={handleSaveAndNext}
  onSkip={handleSkip}
/>
```

- [ ] **Step 5: Load question tagging attributes**

In `TaggingForm.tsx`, load scene attributes:

```ts
interface TaggingFormProps {
  grade: string;
  subject: string;
}

const [taggingAttributes, setTaggingAttributes] = useState<
  Array<{ attribute: TagCategory; rule: AttributeUsageRule }>
>([]);

useEffect(() => {
  getSceneAttributes({
    grade,
    subject,
    scene: 'questionTagging',
  }).then((res) => {
    if (res.success) setTaggingAttributes(res.data);
  });
}, [grade, subject]);
```

- [ ] **Step 6: Render dynamic tagging fields**

For each configured question attribute, render either checkbox or radio based on `attribute.selectionMode`:

```tsx
const fieldName = ['attributes', attribute.code || attribute.id];
const options = attribute.tags
  .filter((tag) => tag.status !== 'disabled')
  .map((tag) => ({ label: tag.name, value: tag.id }));

return attribute.selectionMode === 'multiple' ? (
  <ProFormCheckbox.Group
    key={attribute.id}
    name={fieldName}
    label={attribute.name}
    options={options}
    rules={
      rule.required
        ? [{ required: true, message: `请选择${attribute.name}` }]
        : undefined
    }
  />
) : (
  <ProFormRadio.Group
    key={attribute.id}
    name={fieldName}
    label={attribute.name}
    options={options}
    rules={
      rule.required
        ? [{ required: true, message: `请选择${attribute.name}` }]
        : undefined
    }
  />
);
```

- [ ] **Step 7: Support batch mode switches**

Generate batch switches from configured attribute keys:

```ts
const dynamicBatchSwitches = Object.fromEntries(
  taggingAttributes.map(({ attribute }) => [
    attribute.code || attribute.id,
    false,
  ]),
);
```

When applying batch updates, write selected dynamic fields into `updates.attributes`.

- [ ] **Step 8: Keep knowledge tree fields separate**

Do not remove existing `knowledgePoints` and `chapters` fields in this task. They are not ordinary attribute enum values; they come from knowledge/chapter trees.

- [ ] **Step 9: Verify tagging form**

Manual check:
- Open the existing question tagging route.
- The form renders configured `questionTagging` attributes in saved order.
- Required fields block `保存并下一题`.
- Batch mode can enable and apply a configured dynamic attribute.

- [ ] **Step 10: Commit**

```bash
git add src/pages/QuestionTagging/index.tsx src/pages/QuestionTagging/components/TaggingForm.tsx src/pages/QuestionTagging/types.ts src/pages/QuestionTagging/mockData.ts
git commit -m "feat(question-tagging): render configured tagging attributes"
```

---

### Task 8: Final Verification And Cleanup

**Files:**
- Review all files touched by Tasks 1-7.

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit --pretty false
```

Expected: no new type errors from modified files.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: production build completes.

- [ ] **Step 3: Check formatting-sensitive diff**

```bash
git diff --check
```

Expected: no trailing whitespace or conflict markers.

- [ ] **Step 4: Browser QA**

Use the in-app browser or Playwright to check:

```text
http://localhost:8000/tag-system/attributes
http://localhost:8000/question-bank/word-upload
```

Expected:
- 属性设置页是 PC 端可用布局。
- 属性定义 Tab 不展示旧的上传/打标/前台展示混合规则。
- 使用设置 Tab 只展示合法场景组合。
- 选项值不出现重复名称、不使用彩色标签、不显示 `#1`。
- 试卷上传页读取并展示 `paperUpload` 配置。

- [ ] **Step 5: Review against acceptance criteria**

Walk through the 15 acceptance criteria in the spec and mark any remaining gap in the final handoff.

- [ ] **Step 6: Commit final cleanup**

```bash
git add .
git commit -m "chore(tag-system): verify attribute settings redesign"
```
