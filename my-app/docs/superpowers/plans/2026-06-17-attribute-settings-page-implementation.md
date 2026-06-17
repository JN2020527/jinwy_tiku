# Attribute Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将属性设置页实现为“属性定义 / 使用设置”的三栏工作台，支持试题属性按学科添加选项值，并保持使用设置按场景配置。

**Architecture:** 沿用 Umi Max 前端 mock API，不接入真实后端。`TagCategory` 表示属性定义，`AttributeItem` 表示选项值，新增 `AttributeUsageRule` 表示场景使用规则；页面拆成属性定义工作台和使用设置工作台，二者读写同一份 mock 数据。属性本体不按年级或学科拆分，只有试题属性的选项值可通过 `optionAddMode` 配置为统一添加或按学科添加。

**Tech Stack:** Umi Max 4, React 18, TypeScript, Ant Design 5, Ant Design Pro Components, mock API, Less.

---

## Source Spec

- `docs/superpowers/specs/2026-06-17-attribute-settings-page-design.md`

## Execution Notes

- 当前主工作区存在未提交改动。执行本计划前，先使用 `superpowers:using-git-worktrees` 创建独立 worktree。
- 本计划只实现属性设置页面和 mock/service 契约，不实现上传页、打标页、试题列表、试卷列表、知识树或专题树消费端联动。
- 仓库没有 test script。每个任务至少运行 `npx tsc --noEmit --pretty false`；完成 UI 后运行 `npm run build` 和浏览器手工检查。

## File Structure

- Modify: `src/services/tagSystem.ts`
  - 调整属性类型、选项值添加方式、使用场景和使用规则类型。
  - 属性分类接口不再要求 `grade`、`subject`。
  - 选项值 CRUD 支持可选 `subject`，用于按学科添加的试题属性。
  - 新增使用规则读取和保存接口。

- Modify: `mock/tagSystem.ts`
  - 将属性定义 store 从年级学科上下文中解耦。
  - 增加 `optionAddMode` 与 `subjectTags`。
  - 增加使用规则 mock store。
  - 保留已有题库 mock 数据和其他接口行为。

- Modify: `src/pages/ContentCenter/TagManage/Attributes.tsx`
  - 移除顶部年级、学科选择器。
  - 加载属性定义和使用规则。
  - 将数据传入属性设置工作台。

- Modify: `src/pages/ContentCenter/TagManage/Attributes.less`
  - 删除顶部上下文工具条样式。
  - 保留页面内容区间距。

- Replace: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx`
  - 变为属性设置页 shell。
  - 承载 `属性定义` / `使用设置` 一级 Tab。
  - 管理刷新、当前属性类型、当前属性、当前场景等顶层状态。

- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`
  - 重写为属性设置工作台、三栏布局、选项列表、使用设置列表、抽屉内容样式。

- Create: `src/pages/ContentCenter/TagManage/components/attributeSettingsConstants.ts`
  - 属性类型、学科、使用场景、场景允许属性类型、默认选项值添加方式等常量。

- Create: `src/pages/ContentCenter/TagManage/components/attributeSettingsHelpers.ts`
  - 排序、选项值选择、选项值更新、使用规则过滤、使用规则排序等纯函数。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeStatusPill.tsx`
  - 统一启用 / 停用状态展示。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionWorkspace.tsx`
  - 属性定义 Tab 的三栏布局。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionList.tsx`
  - 左栏属性类型切换和属性列表。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeOptionPanel.tsx`
  - 中栏选项值管理。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeSummaryPanel.tsx`
  - 右栏当前属性摘要和使用规则入口。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionModal.tsx`
  - 新增 / 编辑属性定义。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeOptionModal.tsx`
  - 编辑选项值。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeUsageDrawer.tsx`
  - 从当前属性视角配置使用规则。

- Create: `src/pages/ContentCenter/TagManage/components/AttributeUsageSettingsWorkspace.tsx`
  - 使用设置 Tab，按场景配置属性使用。

---

### Task 1: Update Attribute Contracts And Mock Store

**Files:**
- Modify: `src/services/tagSystem.ts`
- Modify: `mock/tagSystem.ts`

- [ ] **Step 1: Update public service types**

Replace the current attribute type block in `src/services/tagSystem.ts` with:

```ts
export type AttributeStatus = 'enabled' | 'disabled';
export type AttributeTarget = 'paper' | 'question' | 'knowledge' | 'topic';
export type AttributeOptionAddMode = 'unified' | 'bySubject';
export type AttributeFilterArea = 'primary' | 'more';
export type AttributeUsageScene =
  | 'paperUpload'
  | 'paperCardDisplay'
  | 'paperListFilter'
  | 'questionTagging'
  | 'questionCardDisplay'
  | 'questionListFilter'
  | 'knowledgeTreeNodeDisplay'
  | 'topicTreeNodeDisplay';
export type AttributeSelectionMode = 'single' | 'multiple';

export interface AttributeUsageRule {
  id: string;
  attributeId: string;
  scene: AttributeUsageScene;
  enabled: boolean;
  required?: boolean;
  filterArea?: AttributeFilterArea;
  sort: number;
}

export interface AttributeItem {
  id: string;
  name: string;
  color?: string;
  value?: string;
  sort?: number;
  status?: AttributeStatus;
  star?: number;
  displayName?: string;
  frontVisible?: boolean;
}

export interface TagCategory {
  id: string;
  name: string;
  tags: AttributeItem[];
  code?: string;
  description?: string;
  target: AttributeTarget;
  optionAddMode?: AttributeOptionAddMode;
  subjectTags?: Partial<Record<string, AttributeItem[]>>;
  status?: AttributeStatus;
  sort?: number;
  selectionMode?: AttributeSelectionMode;
}
```

- [ ] **Step 2: Relax category service params**

Change category CRUD signatures in `src/services/tagSystem.ts` so they no longer require `grade` and `subject`:

```ts
export async function getTagCategories() {
  return request<ApiResponse<TagCategory[]>>('/api/tags/categories', {
    method: 'GET',
  });
}

export async function addTagCategory(
  data: {
    name: string;
    tags?: AttributeItem[];
  } & Partial<Omit<TagCategory, 'id' | 'name' | 'tags'>>,
) {
  return request<ApiResponse<TagCategory>>('/api/tags/category', {
    method: 'POST',
    data,
  });
}

export async function updateTagCategory(
  data: {
    id: string;
    name: string;
    tags?: AttributeItem[];
  } & Partial<Omit<TagCategory, 'id' | 'name' | 'tags'>>,
) {
  return request<ApiResponse<TagCategory>>('/api/tags/category', {
    method: 'PUT',
    data,
  });
}

export async function deleteTagCategory(id: string) {
  return request<ApiResponse<void>>('/api/tags/category', {
    method: 'DELETE',
    params: { id },
  });
}
```

- [ ] **Step 3: Add subject-aware option params**

Update option CRUD signatures in `src/services/tagSystem.ts`:

```ts
export async function addAttribute(
  data: {
    categoryId: string;
    name: string;
    subject?: string;
    color?: string;
  } & Partial<Omit<AttributeItem, 'id' | 'name' | 'color'>>,
) {
  return request<ApiResponse<AttributeItem>>('/api/tags/attribute', {
    method: 'POST',
    data,
  });
}

export async function updateAttribute(
  data: {
    id: string;
    categoryId: string;
    name?: string;
    subject?: string;
    color?: string;
  } & Partial<Omit<AttributeItem, 'id' | 'name' | 'color'>>,
) {
  return request<ApiResponse<AttributeItem>>('/api/tags/attribute', {
    method: 'PUT',
    data,
  });
}

export async function deleteAttribute(
  id: string,
  categoryId: string,
  params?: { subject?: string },
) {
  return request<ApiResponse<void>>('/api/tags/attribute', {
    method: 'DELETE',
    params: { id, categoryId, ...params },
  });
}
```

- [ ] **Step 4: Add usage rule service functions**

Append to `src/services/tagSystem.ts` after option CRUD:

```ts
export async function getAttributeUsageRules() {
  return request<ApiResponse<AttributeUsageRule[]>>(
    '/api/tags/attribute-usage-rules',
    { method: 'GET' },
  );
}

export async function updateAttributeUsageRules(data: {
  rules: AttributeUsageRule[];
}) {
  return request<ApiResponse<AttributeUsageRule[]>>(
    '/api/tags/attribute-usage-rules',
    { method: 'PUT', data },
  );
}
```

- [ ] **Step 5: Mirror types in mock**

Update the mock-local type block in `mock/tagSystem.ts`:

```ts
type AttributeStatus = 'enabled' | 'disabled';
type AttributeTarget = 'paper' | 'question' | 'knowledge' | 'topic';
type AttributeOptionAddMode = 'unified' | 'bySubject';
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

interface AttributeUsageRule {
  id: string;
  attributeId: string;
  scene: AttributeUsageScene;
  enabled: boolean;
  required?: boolean;
  filterArea?: AttributeFilterArea;
  sort: number;
}
```

Extend `MockTagCategory` with:

```ts
  target: AttributeTarget;
  optionAddMode?: AttributeOptionAddMode;
  subjectTags?: Partial<Record<string, MockAttributeItem[]>>;
  status?: AttributeStatus;
  sort?: number;
```

- [ ] **Step 6: Add mock helpers for option arrays**

Add these helpers near existing attribute item helpers in `mock/tagSystem.ts`:

```ts
const SUBJECT_KEYS = [
  'chinese',
  'math',
  'english',
  'physics',
  'chemistry',
  'biology',
  'history',
  'geography',
  'politics',
];

const normalizeOptionOrder = (tags: MockAttributeItem[] = []) =>
  tags.map((tag, index) => ({
    ...tag,
    sort: index,
  }));

const getCategoryOptionList = (
  category: MockTagCategory,
  subject?: string,
) => {
  if (category.target === 'question' && category.optionAddMode === 'bySubject') {
    const key = subject || 'math';
    category.subjectTags = category.subjectTags || {};
    category.subjectTags[key] = normalizeOptionOrder(
      category.subjectTags[key] || [],
    );
    return category.subjectTags[key]!;
  }

  category.tags = normalizeOptionOrder(category.tags || []);
  return category.tags;
};

const setCategoryOptionList = (
  category: MockTagCategory,
  tags: MockAttributeItem[],
  subject?: string,
) => {
  if (category.target === 'question' && category.optionAddMode === 'bySubject') {
    const key = subject || 'math';
    category.subjectTags = category.subjectTags || {};
    category.subjectTags[key] = normalizeOptionOrder(tags);
    return;
  }

  category.tags = normalizeOptionOrder(tags);
};
```

- [ ] **Step 7: Update mock seed data**

Convert attribute seed categories so they include the four targets:

```ts
{
  id: 'cat-question-difficulty',
  name: '难度',
  code: 'difficulty',
  target: 'question',
  optionAddMode: 'unified',
  status: 'enabled',
  sort: 1,
  tags: [
    { id: 'difficulty-1', name: '容易', status: 'enabled', sort: 0 },
    { id: 'difficulty-2', name: '较易', status: 'enabled', sort: 1 },
    { id: 'difficulty-3', name: '中等', status: 'enabled', sort: 2 },
    { id: 'difficulty-4', name: '较难', status: 'enabled', sort: 3 },
    { id: 'difficulty-5', name: '困难', status: 'enabled', sort: 4 },
  ],
}
```

For subject-specific examples, seed `能力` like this:

```ts
{
  id: 'cat-question-ability',
  name: '能力',
  code: 'ability',
  target: 'question',
  optionAddMode: 'bySubject',
  status: 'enabled',
  sort: 2,
  tags: [],
  subjectTags: {
    math: [
      { id: 'ability-math-1', name: '运算能力', status: 'enabled', sort: 0 },
      { id: 'ability-math-2', name: '推理能力', status: 'enabled', sort: 1 },
      { id: 'ability-math-3', name: '模型观念', status: 'enabled', sort: 2 },
      { id: 'ability-math-4', name: '空间观念', status: 'enabled', sort: 3 },
    ],
    chinese: [
      { id: 'ability-chinese-1', name: '阅读理解', status: 'enabled', sort: 0 },
      { id: 'ability-chinese-2', name: '表达交流', status: 'enabled', sort: 1 },
    ],
  },
}
```

Also add seed categories for:

- Paper: `年份`, `地区`, `试卷类型`
- Question: `题型`, `核心素养`, `学科特色`, `题源类型`
- Knowledge: `目标分类`, `重难点`, `首次考查`
- Topic: `考频`

- [ ] **Step 8: Add usage rule seed store**

Add a top-level mutable array in `mock/tagSystem.ts`:

```ts
let attributeUsageRules: AttributeUsageRule[] = [
  {
    id: 'usage-question-tagging-difficulty',
    attributeId: 'cat-question-difficulty',
    scene: 'questionTagging',
    enabled: true,
    required: true,
    sort: 0,
  },
  {
    id: 'usage-question-list-filter-difficulty',
    attributeId: 'cat-question-difficulty',
    scene: 'questionListFilter',
    enabled: true,
    filterArea: 'primary',
    sort: 0,
  },
  {
    id: 'usage-question-list-filter-year',
    attributeId: 'cat-paper-year',
    scene: 'questionListFilter',
    enabled: true,
    filterArea: 'more',
    sort: 1,
  },
];
```

- [ ] **Step 9: Update mock category and attribute endpoints**

In mock category endpoints:

- `GET /api/tags/categories` returns all categories sorted by `target` then `sort`.
- `POST /api/tags/category` ignores `grade` and `subject`.
- `PUT /api/tags/category` preserves `subjectTags`.
- `DELETE /api/tags/category` also removes matching usage rules.

In option endpoints:

- Read `subject` from body or query.
- Use `getCategoryOptionList(category, subject)`.
- Use `setCategoryOptionList(category, nextTags, subject)`.

The create option branch should follow this shape:

```ts
const category = tagCategories.find((c) => c.id === categoryId);
if (category) {
  const optionList = getCategoryOptionList(category, subject);
  const newTag = createMockAttributeItem(
    tagPayload as Partial<MockAttributeItem>,
    `${categoryId}-${subject || 'unified'}`,
    optionList.length,
  );
  setCategoryOptionList(category, [...optionList, newTag], subject);
}
```

- [ ] **Step 10: Add usage rule endpoints**

Add to the mock export:

```ts
'GET /api/tags/attribute-usage-rules': (_req: Request, res: Response) => {
  res.send({
    success: true,
    data: [...attributeUsageRules].sort((a, b) => a.sort - b.sort),
  });
},
'PUT /api/tags/attribute-usage-rules': (req: Request, res: Response) => {
  const nextRules = Array.isArray(req.body?.rules) ? req.body.rules : [];
  attributeUsageRules = nextRules.map((rule, index) => ({
    ...rule,
    sort: rule.sort ?? index,
  }));
  res.send({
    success: true,
    data: [...attributeUsageRules].sort((a, b) => a.sort - b.sort),
  });
},
```

- [ ] **Step 11: Verify and commit**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: no type errors from `src/services/tagSystem.ts` or `mock/tagSystem.ts`.

Commit:

```bash
git add src/services/tagSystem.ts mock/tagSystem.ts
git commit -m "feat(tag-system): update attribute settings contracts"
```

---

### Task 2: Add Constants, Helpers, And Shared Status Component

**Files:**
- Create: `src/pages/ContentCenter/TagManage/components/attributeSettingsConstants.ts`
- Create: `src/pages/ContentCenter/TagManage/components/attributeSettingsHelpers.ts`
- Create: `src/pages/ContentCenter/TagManage/components/AttributeStatusPill.tsx`

- [ ] **Step 1: Create constants**

Create `attributeSettingsConstants.ts`:

```ts
import type {
  AttributeTarget,
  AttributeUsageScene,
} from '@/services/tagSystem';

export const ATTRIBUTE_TARGET_OPTIONS: Array<{
  label: string;
  value: AttributeTarget;
}> = [
  { label: '试卷', value: 'paper' },
  { label: '试题', value: 'question' },
  { label: '知识点', value: 'knowledge' },
  { label: '专题', value: 'topic' },
];

export const ATTRIBUTE_TARGET_LABELS: Record<AttributeTarget, string> = {
  paper: '试卷属性',
  question: '试题属性',
  knowledge: '知识点属性',
  topic: '专题属性',
};

export const SUBJECT_OPTIONS = [
  { label: '语文', value: 'chinese' },
  { label: '数学', value: 'math' },
  { label: '英语', value: 'english' },
  { label: '物理', value: 'physics' },
  { label: '化学', value: 'chemistry' },
  { label: '生物', value: 'biology' },
  { label: '历史', value: 'history' },
  { label: '地理', value: 'geography' },
  { label: '道德与法治', value: 'politics' },
];

export const SUBJECT_LABELS = SUBJECT_OPTIONS.reduce<Record<string, string>>(
  (map, option) => {
    map[option.value] = option.label;
    return map;
  },
  {},
);

export const USAGE_SCENE_GROUPS: Array<{
  title: string;
  scenes: Array<{
    scene: AttributeUsageScene;
    label: string;
    description: string;
    allowedTargets: AttributeTarget[];
    usageType: 'form' | 'display' | 'filter';
  }>;
}> = [
  {
    title: '试题场景',
    scenes: [
      {
        scene: 'questionTagging',
        label: '试题打标',
        description: '配置打标字段和必填',
        allowedTargets: ['question'],
        usageType: 'form',
      },
      {
        scene: 'questionCardDisplay',
        label: '试题卡片展示',
        description: '配置试题卡片展示属性',
        allowedTargets: ['question'],
        usageType: 'display',
      },
      {
        scene: 'questionListFilter',
        label: '试题列表筛选',
        description: '配置主筛选区/更多筛选区',
        allowedTargets: ['question', 'paper'],
        usageType: 'filter',
      },
    ],
  },
  {
    title: '试卷场景',
    scenes: [
      {
        scene: 'paperUpload',
        label: '试卷上传信息完善',
        description: '配置上传字段和必填',
        allowedTargets: ['paper'],
        usageType: 'form',
      },
      {
        scene: 'paperCardDisplay',
        label: '试卷卡片展示',
        description: '配置试卷卡片属性',
        allowedTargets: ['paper'],
        usageType: 'display',
      },
      {
        scene: 'paperListFilter',
        label: '试卷列表筛选',
        description: '配置试卷筛选属性',
        allowedTargets: ['paper'],
        usageType: 'filter',
      },
    ],
  },
  {
    title: '树节点展示',
    scenes: [
      {
        scene: 'knowledgeTreeNodeDisplay',
        label: '知识点树节点展示',
        description: '配置知识点树节点伴随展示属性',
        allowedTargets: ['knowledge'],
        usageType: 'display',
      },
      {
        scene: 'topicTreeNodeDisplay',
        label: '专题树节点展示',
        description: '配置专题树节点伴随展示属性',
        allowedTargets: ['topic'],
        usageType: 'display',
      },
    ],
  },
];

export const USAGE_SCENE_OPTIONS = USAGE_SCENE_GROUPS.flatMap(
  (group) => group.scenes,
);

export const USAGE_SCENE_LABELS = USAGE_SCENE_OPTIONS.reduce<
  Record<AttributeUsageScene, string>
>((map, option) => {
  map[option.scene] = option.label;
  return map;
}, {} as Record<AttributeUsageScene, string>);
```

- [ ] **Step 2: Create helpers**

Create `attributeSettingsHelpers.ts`:

```ts
import type {
  AttributeFilterArea,
  AttributeItem,
  AttributeTarget,
  AttributeUsageRule,
  AttributeUsageScene,
  TagCategory,
} from '@/services/tagSystem';
import { USAGE_SCENE_OPTIONS } from './attributeSettingsConstants';

export const normalizeOptionOrder = (tags: AttributeItem[]) =>
  tags.map((tag, index) => ({ ...tag, sort: index }));

export const sortBySort = <T extends { sort?: number }>(items: T[]) =>
  [...items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

export const getOptionList = (
  category: TagCategory | undefined,
  subject: string,
) => {
  if (!category) return [];
  if (category.target === 'question' && category.optionAddMode === 'bySubject') {
    return sortBySort(category.subjectTags?.[subject] || []);
  }
  return sortBySort(category.tags || []);
};

export const withOptionList = (
  category: TagCategory,
  tags: AttributeItem[],
  subject: string,
): TagCategory => {
  const nextTags = normalizeOptionOrder(tags);
  if (category.target === 'question' && category.optionAddMode === 'bySubject') {
    return {
      ...category,
      subjectTags: {
        ...(category.subjectTags || {}),
        [subject]: nextTags,
      },
    };
  }
  return { ...category, tags: nextTags };
};

export const getSceneMeta = (scene: AttributeUsageScene) =>
  USAGE_SCENE_OPTIONS.find((item) => item.scene === scene);

export const isTargetAllowedInScene = (
  target: AttributeTarget,
  scene: AttributeUsageScene,
) => getSceneMeta(scene)?.allowedTargets.includes(target) ?? false;

export const getRulesForScene = (
  rules: AttributeUsageRule[],
  scene: AttributeUsageScene,
  filterArea?: AttributeFilterArea,
) =>
  sortBySort(
    rules.filter(
      (rule) =>
        rule.scene === scene &&
        rule.enabled &&
        (filterArea ? rule.filterArea === filterArea : true),
    ),
  );

export const getRulesForAttribute = (
  rules: AttributeUsageRule[],
  attributeId: string,
) => sortBySort(rules.filter((rule) => rule.attributeId === attributeId));

export const makeUsageRuleId = (
  scene: AttributeUsageScene,
  attributeId: string,
) => `usage-${scene}-${attributeId}`;

export const reorder = <T,>(
  items: T[],
  fromIndex: number,
  toIndex: number,
) => {
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
};
```

- [ ] **Step 3: Create status pill**

Create `AttributeStatusPill.tsx`:

```tsx
import type { AttributeStatus } from '@/services/tagSystem';
import React from 'react';

interface AttributeStatusPillProps {
  status?: AttributeStatus;
}

const AttributeStatusPill: React.FC<AttributeStatusPillProps> = ({
  status = 'enabled',
}) => {
  const enabled = status === 'enabled';
  return (
    <span
      className={
        enabled
          ? 'attribute-status-pill enabled'
          : 'attribute-status-pill disabled'
      }
    >
      {enabled ? '启用' : '停用'}
    </span>
  );
};

export default AttributeStatusPill;
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: the new helper files compile.

Commit:

```bash
git add src/pages/ContentCenter/TagManage/components/attributeSettingsConstants.ts src/pages/ContentCenter/TagManage/components/attributeSettingsHelpers.ts src/pages/ContentCenter/TagManage/components/AttributeStatusPill.tsx
git commit -m "feat(tag-system): add attribute settings helpers"
```

---

### Task 3: Replace Page Shell And Load Data

**Files:**
- Modify: `src/pages/ContentCenter/TagManage/Attributes.tsx`
- Modify: `src/pages/ContentCenter/TagManage/Attributes.less`
- Replace: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx`

- [ ] **Step 1: Update page container**

Replace `Attributes.tsx` with:

```tsx
import type {
  AttributeUsageRule,
  TagCategory,
} from '@/services/tagSystem';
import {
  getAttributeUsageRules,
  getTagCategories,
} from '@/services/tagSystem';
import { PageContainer } from '@ant-design/pro-components';
import { message, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import './Attributes.less';
import AttributeTagsPanel from './components/AttributeTagsPanel';

const AttributeTagPage: React.FC = () => {
  const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
  const [usageRules, setUsageRules] = useState<AttributeUsageRule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoryRes, usageRuleRes] = await Promise.all([
        getTagCategories(),
        getAttributeUsageRules(),
      ]);

      setTagCategories(categoryRes.success ? categoryRes.data : []);
      setUsageRules(usageRuleRes.success ? usageRuleRes.data : []);

      if (!categoryRes.success || !usageRuleRes.success) {
        message.error('获取属性设置失败');
      }
    } catch {
      setTagCategories([]);
      setUsageRules([]);
      message.error('获取属性设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageContainer className="attribute-tag-page">
      <Spin spinning={loading}>
        <AttributeTagsPanel
          tagCategories={tagCategories}
          usageRules={usageRules}
          onRefresh={fetchData}
        />
      </Spin>
    </PageContainer>
  );
};

export default AttributeTagPage;
```

- [ ] **Step 2: Simplify page less**

Replace `Attributes.less` with:

```less
.attribute-tag-page {
  .ant-pro-page-container-children-content {
    margin-block-start: 16px;
  }
}
```

- [ ] **Step 3: Replace panel shell**

Replace `AttributeTagsPanel.tsx` with:

```tsx
import type {
  AttributeTarget,
  AttributeUsageRule,
  TagCategory,
} from '@/services/tagSystem';
import { updateAttributeUsageRules } from '@/services/tagSystem';
import { Tabs, message } from 'antd';
import React, { useState } from 'react';
import AttributeDefinitionWorkspace from './AttributeDefinitionWorkspace';
import AttributeUsageSettingsWorkspace from './AttributeUsageSettingsWorkspace';
import './AttributeTagsPanel.less';

interface AttributeTagsPanelProps {
  tagCategories: TagCategory[];
  usageRules: AttributeUsageRule[];
  onRefresh: () => void;
}

const AttributeTagsPanel: React.FC<AttributeTagsPanelProps> = ({
  tagCategories,
  usageRules,
  onRefresh,
}) => {
  const [activeTarget, setActiveTarget] =
    useState<AttributeTarget>('question');

  const handleSaveUsageRules = async (rules: AttributeUsageRule[]) => {
    const res = await updateAttributeUsageRules({ rules });
    if (res.success) {
      message.success('使用设置已保存');
      onRefresh();
      return true;
    }
    message.error(res.message || '使用设置保存失败');
    return false;
  };

  return (
    <div className="attribute-tags-panel">
      <Tabs
        defaultActiveKey="definition"
        items={[
          {
            key: 'definition',
            label: '属性定义',
            children: (
              <AttributeDefinitionWorkspace
                activeTarget={activeTarget}
                tagCategories={tagCategories}
                usageRules={usageRules}
                onActiveTargetChange={setActiveTarget}
                onRefresh={onRefresh}
                onSaveUsageRules={handleSaveUsageRules}
              />
            ),
          },
          {
            key: 'usage',
            label: '使用设置',
            children: (
              <AttributeUsageSettingsWorkspace
                tagCategories={tagCategories}
                usageRules={usageRules}
                onSaveUsageRules={handleSaveUsageRules}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default AttributeTagsPanel;
```

- [ ] **Step 4: Create compile stubs for workspace and option imports**

Create these exact compile stubs so Task 3 and Task 4 can be verified independently. Task 4 replaces the definition workspace, Task 5 replaces the option panel, and Task 7 replaces the usage workspace.

```tsx
// AttributeDefinitionWorkspace.tsx
import React from 'react';

const AttributeDefinitionWorkspace: React.FC = () => <div>属性定义</div>;

export default AttributeDefinitionWorkspace;
```

```tsx
// AttributeUsageSettingsWorkspace.tsx
import React from 'react';

const AttributeUsageSettingsWorkspace: React.FC = () => <div>使用设置</div>;

export default AttributeUsageSettingsWorkspace;
```

```tsx
// AttributeOptionPanel.tsx
import React from 'react';

const AttributeOptionPanel: React.FC = () => <div>选项值</div>;

export default AttributeOptionPanel;
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: compile passes with the three compile stubs.

Commit:

```bash
git add src/pages/ContentCenter/TagManage/Attributes.tsx src/pages/ContentCenter/TagManage/Attributes.less src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx src/pages/ContentCenter/TagManage/components/AttributeDefinitionWorkspace.tsx src/pages/ContentCenter/TagManage/components/AttributeUsageSettingsWorkspace.tsx src/pages/ContentCenter/TagManage/components/AttributeOptionPanel.tsx
git commit -m "feat(tag-system): split attribute settings tabs"
```

---

### Task 4: Implement Attribute Definition Workspace

**Files:**
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionWorkspace.tsx`
- Create: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionList.tsx`
- Create: `src/pages/ContentCenter/TagManage/components/AttributeSummaryPanel.tsx`
- Create: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionModal.tsx`

- [ ] **Step 1: Create definition list component**

Create `AttributeDefinitionList.tsx` with props:

```tsx
import type { AttributeTarget, TagCategory } from '@/services/tagSystem';
import { Button, Empty, Segmented } from 'antd';
import React from 'react';
import AttributeStatusPill from './AttributeStatusPill';
import {
  ATTRIBUTE_TARGET_OPTIONS,
  SUBJECT_LABELS,
} from './attributeSettingsConstants';
import { getOptionList, sortBySort } from './attributeSettingsHelpers';

interface AttributeDefinitionListProps {
  activeTarget: AttributeTarget;
  activeCategoryId?: string;
  categories: TagCategory[];
  selectedSubject: string;
  onActiveTargetChange: (target: AttributeTarget) => void;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory: () => void;
}

const AttributeDefinitionList: React.FC<AttributeDefinitionListProps> = ({
  activeTarget,
  activeCategoryId,
  categories,
  selectedSubject,
  onActiveTargetChange,
  onSelectCategory,
  onAddCategory,
}) => {
  const visibleCategories = sortBySort(
    categories.filter((category) => category.target === activeTarget),
  );

  return (
    <aside className="attribute-definition-list">
      <div className="attribute-panel-header">
        <div>
          <div className="attribute-panel-title">属性定义</div>
          <div className="attribute-panel-meta">
            {ATTRIBUTE_TARGET_OPTIONS.find((item) => item.value === activeTarget)
              ?.label || '属性'} / {visibleCategories.length} 个定义
          </div>
        </div>
        <Button type="primary" onClick={onAddCategory}>
          新增属性
        </Button>
      </div>

      <div className="attribute-target-switch">
        <Segmented
          value={activeTarget}
          options={ATTRIBUTE_TARGET_OPTIONS}
          onChange={(value) => onActiveTargetChange(value as AttributeTarget)}
        />
      </div>

      <div className="attribute-definition-items" role="list">
        {visibleCategories.length ? (
          visibleCategories.map((category) => {
            const active = category.id === activeCategoryId;
            const optionCount = getOptionList(category, selectedSubject).length;
            const optionMeta =
              category.target === 'question' &&
              category.optionAddMode === 'bySubject'
                ? `按学科添加 / ${SUBJECT_LABELS[selectedSubject]} ${optionCount} 个选项`
                : `统一添加 / ${optionCount} 个选项`;

            return (
              <button
                type="button"
                key={category.id}
                className={
                  active
                    ? 'attribute-definition-item active'
                    : 'attribute-definition-item'
                }
                onClick={() => onSelectCategory(category.id)}
              >
                <span>
                  <strong>{category.name}</strong>
                  <small>{optionMeta}</small>
                </span>
                <AttributeStatusPill status={category.status} />
              </button>
            );
          })
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无属性" />
        )}
      </div>
    </aside>
  );
};

export default AttributeDefinitionList;
```

- [ ] **Step 2: Create summary panel**

Create `AttributeSummaryPanel.tsx`:

```tsx
import type {
  AttributeUsageRule,
  TagCategory,
} from '@/services/tagSystem';
import { Button, Empty } from 'antd';
import React from 'react';
import AttributeStatusPill from './AttributeStatusPill';
import {
  ATTRIBUTE_TARGET_LABELS,
  SUBJECT_LABELS,
  USAGE_SCENE_LABELS,
} from './attributeSettingsConstants';
import { getRulesForAttribute } from './attributeSettingsHelpers';

interface AttributeSummaryPanelProps {
  category?: TagCategory;
  selectedSubject: string;
  usageRules: AttributeUsageRule[];
  onOpenUsageDrawer: () => void;
}

const AttributeSummaryPanel: React.FC<AttributeSummaryPanelProps> = ({
  category,
  selectedSubject,
  usageRules,
  onOpenUsageDrawer,
}) => {
  if (!category) {
    return (
      <aside className="attribute-summary-panel">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择属性" />
      </aside>
    );
  }

  const rules = getRulesForAttribute(usageRules, category.id).filter(
    (rule) => rule.enabled,
  );
  const bySubject =
    category.target === 'question' && category.optionAddMode === 'bySubject';

  return (
    <aside className="attribute-summary-panel">
      <div className="attribute-panel-header">
        <div>
          <div className="attribute-panel-title">当前属性</div>
          <div className="attribute-panel-meta">摘要和入口，不承载复杂配置</div>
        </div>
      </div>

      <dl className="attribute-summary-list">
        <dt>属性名称</dt>
        <dd>{category.name}</dd>
        <dt>属性类型</dt>
        <dd>{ATTRIBUTE_TARGET_LABELS[category.target]}</dd>
        <dt>添加方式</dt>
        <dd>{bySubject ? '按学科添加' : '统一添加'}</dd>
        {bySubject ? (
          <>
            <dt>选项范围</dt>
            <dd>{SUBJECT_LABELS[selectedSubject]}</dd>
          </>
        ) : null}
        <dt>状态</dt>
        <dd>
          <AttributeStatusPill status={category.status} />
        </dd>
        <dt>系统编码</dt>
        <dd>{category.code || '-'}</dd>
      </dl>

      <div className="attribute-summary-section">
        <h3>使用规则摘要</h3>
        {rules.length ? (
          rules.map((rule) => (
            <div className="attribute-summary-rule" key={rule.id}>
              <span>{USAGE_SCENE_LABELS[rule.scene]}</span>
              <span>{rule.required ? '启用 / 必填' : '启用'}</span>
            </div>
          ))
        ) : (
          <div className="attribute-rule-empty">暂无启用场景</div>
        )}
        <Button type="primary" block onClick={onOpenUsageDrawer}>
          配置使用规则
        </Button>
      </div>
    </aside>
  );
};

export default AttributeSummaryPanel;
```

- [ ] **Step 3: Create definition modal**

Create `AttributeDefinitionModal.tsx`:

```tsx
import type {
  AttributeOptionAddMode,
  AttributeStatus,
  AttributeTarget,
  TagCategory,
} from '@/services/tagSystem';
import {
  ModalForm,
  ProFormDependency,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import React from 'react';
import { ATTRIBUTE_TARGET_OPTIONS } from './attributeSettingsConstants';

export interface AttributeDefinitionFormValues {
  name: string;
  target: AttributeTarget;
  optionAddMode?: AttributeOptionAddMode;
  status: AttributeStatus;
}

interface AttributeDefinitionModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  category?: TagCategory;
  onOpenChange: (open: boolean) => void;
  onFinish: (values: AttributeDefinitionFormValues) => Promise<boolean>;
}

const AttributeDefinitionModal: React.FC<AttributeDefinitionModalProps> = ({
  open,
  mode,
  category,
  onOpenChange,
  onFinish,
}) => {
  return (
    <ModalForm<AttributeDefinitionFormValues>
      title={mode === 'add' ? '新增属性' : '编辑属性'}
      open={open}
      width={520}
      modalProps={{ destroyOnClose: true }}
      initialValues={{
        name: category?.name,
        target: category?.target || 'question',
        optionAddMode: category?.optionAddMode || 'unified',
        status: category?.status || 'enabled',
      }}
      onOpenChange={onOpenChange}
      onFinish={onFinish}
    >
      <ProFormSelect
        name="target"
        label="属性类型"
        options={ATTRIBUTE_TARGET_OPTIONS}
        disabled={mode === 'edit'}
        rules={[{ required: true, message: '请选择属性类型' }]}
      />
      <ProFormText
        name="name"
        label="属性名称"
        rules={[{ required: true, message: '请输入属性名称' }]}
      />
      <ProFormDependency name={['target']}>
        {({ target }) =>
          target === 'question' ? (
            <ProFormRadio.Group
              name="optionAddMode"
              label="选项值添加方式"
              options={[
                { label: '统一添加', value: 'unified' },
                { label: '按学科添加', value: 'bySubject' },
              ]}
            />
          ) : null
        }
      </ProFormDependency>
      <ProFormRadio.Group
        name="status"
        label="启用状态"
        options={[
          { label: '启用', value: 'enabled' },
          { label: '停用', value: 'disabled' },
        ]}
      />
    </ModalForm>
  );
};

export default AttributeDefinitionModal;
```

- [ ] **Step 4: Implement workspace state and CRUD**

Replace the compile stub in `AttributeDefinitionWorkspace.tsx` with a component that:

- Holds `activeCategoryId`.
- Holds `selectedSubject`, default `math`.
- Opens `AttributeDefinitionModal`.
- Calls `addTagCategory`, `updateTagCategory`, `deleteTagCategory`.
- Renders `AttributeDefinitionList`, `AttributeOptionPanel`, `AttributeSummaryPanel`.

Use these key handlers:

```ts
const handleDefinitionFinish = async (values: AttributeDefinitionFormValues) => {
  const payload = {
    ...values,
    optionAddMode:
      values.target === 'question' ? values.optionAddMode || 'unified' : 'unified',
    tags: currentCategory?.tags || [],
    subjectTags: currentCategory?.subjectTags || {},
  };

  const res =
    modalMode === 'add'
      ? await addTagCategory(payload)
      : await updateTagCategory({
          ...currentCategory,
          ...payload,
          id: currentCategory!.id,
          name: payload.name,
        });

  if (res.success) {
    message.success(modalMode === 'add' ? '属性已新增' : '属性已保存');
    onRefresh();
    return true;
  }
  message.error(res.message || '保存失败');
  return false;
};
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: the definition workspace compiles with the Task 3 option panel compile stub.

Commit:

```bash
git add src/pages/ContentCenter/TagManage/components/AttributeDefinitionWorkspace.tsx src/pages/ContentCenter/TagManage/components/AttributeDefinitionList.tsx src/pages/ContentCenter/TagManage/components/AttributeSummaryPanel.tsx src/pages/ContentCenter/TagManage/components/AttributeDefinitionModal.tsx
git commit -m "feat(tag-system): build attribute definition workspace"
```

---

### Task 5: Implement Option Value Management

**Files:**
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeOptionPanel.tsx`
- Create: `src/pages/ContentCenter/TagManage/components/AttributeOptionModal.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionWorkspace.tsx`

- [ ] **Step 1: Create option modal**

Create `AttributeOptionModal.tsx`:

```tsx
import type { AttributeItem, AttributeStatus } from '@/services/tagSystem';
import { ModalForm, ProFormRadio, ProFormText } from '@ant-design/pro-components';
import React from 'react';

export interface AttributeOptionFormValues {
  name: string;
  status: AttributeStatus;
}

interface AttributeOptionModalProps {
  open: boolean;
  option?: AttributeItem;
  onOpenChange: (open: boolean) => void;
  onFinish: (values: AttributeOptionFormValues) => Promise<boolean>;
}

const AttributeOptionModal: React.FC<AttributeOptionModalProps> = ({
  open,
  option,
  onOpenChange,
  onFinish,
}) => (
  <ModalForm<AttributeOptionFormValues>
    title="编辑选项"
    open={open}
    width={420}
    modalProps={{ destroyOnClose: true }}
    initialValues={{
      name: option?.name,
      status: option?.status || 'enabled',
    }}
    onOpenChange={onOpenChange}
    onFinish={onFinish}
  >
    <ProFormText
      name="name"
      label="选项名称"
      rules={[{ required: true, message: '请输入选项名称' }]}
    />
    <ProFormRadio.Group
      name="status"
      label="启用状态"
      options={[
        { label: '启用', value: 'enabled' },
        { label: '停用', value: 'disabled' },
      ]}
    />
  </ModalForm>
);

export default AttributeOptionModal;
```

- [ ] **Step 2: Replace option panel compile stub**

Replace `AttributeOptionPanel.tsx` with:

- Subject selector shown only when `category.target === 'question' && category.optionAddMode === 'bySubject'`.
- Add input.
- Option rows with number, name, status, up/down/edit/delete.
- Calls provided callbacks; the parent persists changes.

Core props:

```ts
interface AttributeOptionPanelProps {
  category?: TagCategory;
  selectedSubject: string;
  onSelectedSubjectChange: (subject: string) => void;
  onAddOption: (name: string) => Promise<void>;
  onUpdateOption: (option: AttributeItem, values: AttributeOptionFormValues) => Promise<void>;
  onDeleteOption: (option: AttributeItem) => Promise<void>;
  onReorderOptions: (nextOptions: AttributeItem[]) => Promise<void>;
  onEditCategory: () => void;
}
```

Use:

```tsx
const options = getOptionList(category, selectedSubject);
const bySubject =
  category?.target === 'question' && category.optionAddMode === 'bySubject';
```

Subject selector:

```tsx
{bySubject ? (
  <div className="attribute-option-subjects">
    <span className="attribute-option-range-label">选项值范围</span>
    <Segmented
      value={selectedSubject}
      options={SUBJECT_OPTIONS}
      onChange={(value) => onSelectedSubjectChange(String(value))}
    />
    <span className="attribute-option-range-help">
      切换范围只切换选项值，不切换属性定义
    </span>
  </div>
) : null}
```

Option row order controls:

```tsx
const moveOption = (fromIndex: number, toIndex: number) => {
  if (toIndex < 0 || toIndex >= options.length) return;
  onReorderOptions(reorder(options, fromIndex, toIndex));
};
```

- [ ] **Step 3: Wire option CRUD in workspace**

In `AttributeDefinitionWorkspace.tsx`, implement:

```ts
const handleAddOption = async (name: string) => {
  if (!activeCategory) return;
  const bySubject =
    activeCategory.target === 'question' &&
    activeCategory.optionAddMode === 'bySubject';
  const res = await addAttribute({
    categoryId: activeCategory.id,
    name,
    status: 'enabled',
    subject: bySubject ? selectedSubject : undefined,
  });
  if (res.success) {
    message.success('选项已添加');
    onRefresh();
  } else {
    message.error(res.message || '选项添加失败');
  }
};
```

Update:

```ts
const handleUpdateOption = async (
  option: AttributeItem,
  values: AttributeOptionFormValues,
) => {
  if (!activeCategory) return;
  const bySubject =
    activeCategory.target === 'question' &&
    activeCategory.optionAddMode === 'bySubject';
  const res = await updateAttribute({
    ...option,
    ...values,
    id: option.id,
    categoryId: activeCategory.id,
    subject: bySubject ? selectedSubject : undefined,
  });
  if (res.success) {
    message.success('选项已保存');
    onRefresh();
  } else {
    message.error(res.message || '选项保存失败');
  }
};
```

Delete:

```ts
const handleDeleteOption = async (option: AttributeItem) => {
  if (!activeCategory) return;
  const bySubject =
    activeCategory.target === 'question' &&
    activeCategory.optionAddMode === 'bySubject';
  const res = await deleteAttribute(option.id, activeCategory.id, {
    subject: bySubject ? selectedSubject : undefined,
  });
  if (res.success) {
    message.success('选项已删除');
    onRefresh();
  } else {
    message.error(res.message || '选项删除失败');
  }
};
```

Reorder:

```ts
const handleReorderOptions = async (nextOptions: AttributeItem[]) => {
  if (!activeCategory) return;
  const nextCategory = withOptionList(
    activeCategory,
    nextOptions,
    selectedSubject,
  );
  const res = await updateTagCategory(nextCategory);
  if (res.success) {
    message.success('排序已保存');
    onRefresh();
  } else {
    message.error(res.message || '排序保存失败');
  }
};
```

- [ ] **Step 4: Verify option mode behavior manually**

Run:

```bash
npx tsc --noEmit --pretty false
```

Then start dev server:

```bash
npm run dev -- --port 8002
```

Manual checks at `http://localhost:8002/tag-system/attributes`:

- Selecting `难度` shows no subject selector.
- Selecting `能力` shows subject selector.
- Adding a math option to `能力` does not add it to Chinese.
- Option rows use plain numbers, not `#1`.
- Option rows do not show color, English value, or display name.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ContentCenter/TagManage/components/AttributeOptionPanel.tsx src/pages/ContentCenter/TagManage/components/AttributeOptionModal.tsx src/pages/ContentCenter/TagManage/components/AttributeDefinitionWorkspace.tsx
git commit -m "feat(tag-system): manage attribute option values"
```

---

### Task 6: Implement Attribute Usage Drawer

**Files:**
- Create: `src/pages/ContentCenter/TagManage/components/AttributeUsageDrawer.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeDefinitionWorkspace.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeSummaryPanel.tsx`

- [ ] **Step 1: Create drawer component**

Create `AttributeUsageDrawer.tsx`:

```tsx
import type {
  AttributeUsageRule,
  AttributeUsageScene,
  TagCategory,
} from '@/services/tagSystem';
import { Button, Drawer, Select, Space, Switch } from 'antd';
import React, { useMemo, useState } from 'react';
import {
  USAGE_SCENE_OPTIONS,
} from './attributeSettingsConstants';
import {
  isTargetAllowedInScene,
  makeUsageRuleId,
  sortBySort,
} from './attributeSettingsHelpers';

interface AttributeUsageDrawerProps {
  open: boolean;
  category?: TagCategory;
  usageRules: AttributeUsageRule[];
  onClose: () => void;
  onSave: (rules: AttributeUsageRule[]) => Promise<boolean>;
}

const AttributeUsageDrawer: React.FC<AttributeUsageDrawerProps> = ({
  open,
  category,
  usageRules,
  onClose,
  onSave,
}) => {
  const [localRules, setLocalRules] = useState<AttributeUsageRule[]>(usageRules);

  React.useEffect(() => {
    setLocalRules(usageRules);
  }, [usageRules, open]);

  const availableScenes = useMemo(() => {
    if (!category) return [];
    return USAGE_SCENE_OPTIONS.filter((scene) =>
      isTargetAllowedInScene(category.target, scene.scene),
    );
  }, [category]);

  const updateRule = (
    scene: AttributeUsageScene,
    patch: Partial<AttributeUsageRule>,
  ) => {
    if (!category) return;
    setLocalRules((prevRules) => {
      const existing = prevRules.find(
        (rule) => rule.scene === scene && rule.attributeId === category.id,
      );
      if (existing) {
        return prevRules.map((rule) =>
          rule.id === existing.id ? { ...rule, ...patch } : rule,
        );
      }
      return [
        ...prevRules,
        {
          id: makeUsageRuleId(scene, category.id),
          attributeId: category.id,
          scene,
          enabled: true,
          sort: prevRules.filter((rule) => rule.scene === scene).length,
          ...patch,
        },
      ];
    });
  };

  return (
    <Drawer
      title={category ? `${category.name} / 使用规则` : '使用规则'}
      open={open}
      onClose={onClose}
      width={520}
      extra={
        <Button
          type="primary"
          onClick={async () => {
            const saved = await onSave(localRules);
            if (saved) onClose();
          }}
        >
          保存
        </Button>
      }
    >
      {category
        ? availableScenes.map((sceneMeta) => {
            const rule = localRules.find(
              (item) =>
                item.scene === sceneMeta.scene &&
                item.attributeId === category.id,
            );
            const enabled = rule?.enabled ?? false;
            return (
              <div className="attribute-usage-drawer-scene" key={sceneMeta.scene}>
                <div>
                  <strong>{sceneMeta.label}</strong>
                  <p>{sceneMeta.description}</p>
                </div>
                <Space direction="vertical" align="end">
                  <Switch
                    checked={enabled}
                    checkedChildren="启用"
                    unCheckedChildren="停用"
                    onChange={(checked) =>
                      updateRule(sceneMeta.scene, { enabled: checked })
                    }
                  />
                  {sceneMeta.usageType === 'form' ? (
                    <Switch
                      checked={rule?.required ?? false}
                      checkedChildren="必填"
                      unCheckedChildren="非必填"
                      disabled={!enabled}
                      onChange={(checked) =>
                        updateRule(sceneMeta.scene, { required: checked })
                      }
                    />
                  ) : null}
                  {sceneMeta.usageType === 'filter' ? (
                    <Select
                      value={rule?.filterArea || 'more'}
                      style={{ width: 120 }}
                      disabled={!enabled}
                      options={[
                        { label: '主筛选区', value: 'primary' },
                        { label: '更多筛选区', value: 'more' },
                      ]}
                      onChange={(value) =>
                        updateRule(sceneMeta.scene, { filterArea: value })
                      }
                    />
                  ) : null}
                </Space>
              </div>
            );
          })
        : null}
    </Drawer>
  );
};

export default AttributeUsageDrawer;
```

- [ ] **Step 2: Open drawer from definition workspace**

In `AttributeDefinitionWorkspace.tsx`:

- Add `usageDrawerOpen` state.
- Render `AttributeUsageDrawer`.
- Pass `onOpenUsageDrawer={() => setUsageDrawerOpen(true)}` to `AttributeSummaryPanel`.

```tsx
<AttributeUsageDrawer
  open={usageDrawerOpen}
  category={activeCategory}
  usageRules={usageRules}
  onClose={() => setUsageDrawerOpen(false)}
  onSave={onSaveUsageRules}
/>
```

- [ ] **Step 3: Verify and commit**

Run:

```bash
npx tsc --noEmit --pretty false
```

Manual checks:

- `能力` drawer only shows question scenes.
- `年份` drawer shows paper scenes and question list filter.
- Knowledge and topic attributes only show tree node display scenes.
- Form scenes show required switch.
- Filter scenes show primary/more selector.

Commit:

```bash
git add src/pages/ContentCenter/TagManage/components/AttributeUsageDrawer.tsx src/pages/ContentCenter/TagManage/components/AttributeDefinitionWorkspace.tsx src/pages/ContentCenter/TagManage/components/AttributeSummaryPanel.tsx
git commit -m "feat(tag-system): configure usage rules by attribute"
```

---

### Task 7: Implement Usage Settings Workspace

**Files:**
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeUsageSettingsWorkspace.tsx`

- [ ] **Step 1: Replace usage workspace compile stub with scene workspace**

Implement `AttributeUsageSettingsWorkspace.tsx` with:

- `activeScene` state, default `questionListFilter`.
- Left scene list grouped by `USAGE_SCENE_GROUPS`.
- Middle current scene configured attributes.
- Right scene description and addable attributes.

Core state:

```ts
const [activeScene, setActiveScene] =
  useState<AttributeUsageScene>('questionListFilter');
const sceneMeta = getSceneMeta(activeScene)!;
const sceneRules = usageRules.filter((rule) => rule.scene === activeScene);
```

- [ ] **Step 2: Render scene list**

Use:

```tsx
{USAGE_SCENE_GROUPS.map((group) => (
  <div className="attribute-usage-scene-group" key={group.title}>
    <div className="attribute-usage-scene-group-title">{group.title}</div>
    {group.scenes.map((scene) => {
      const count = usageRules.filter(
        (rule) => rule.scene === scene.scene && rule.enabled,
      ).length;
      return (
        <button
          type="button"
          key={scene.scene}
          className={
            activeScene === scene.scene
              ? 'attribute-usage-scene active'
              : 'attribute-usage-scene'
          }
          onClick={() => setActiveScene(scene.scene)}
        >
          <strong>{scene.label}</strong>
          <small>{scene.description}</small>
          <span>{count}</span>
        </button>
      );
    })}
  </div>
))}
```

- [ ] **Step 3: Render current scene attributes**

Build rows by joining usage rules to categories:

```ts
const enabledRules = sceneRules.filter((rule) => rule.enabled);
const rows = sortBySort(enabledRules)
  .map((rule) => ({
    rule,
    category: tagCategories.find((category) => category.id === rule.attributeId),
  }))
  .filter((row) => row.category);
```

For filter scenes, render two sections:

```ts
const primaryRows = rows.filter((row) => row.rule.filterArea === 'primary');
const moreRows = rows.filter((row) => row.rule.filterArea !== 'primary');
```

Actions:

- Move to primary: patch `filterArea: 'primary'`.
- Move to more: patch `filterArea: 'more'`.
- Remove: patch `enabled: false`.
- Reorder: adjust `sort` within current scene and filter area.

- [ ] **Step 4: Render addable attributes**

Use allowed targets and existing rules:

```ts
const addableCategories = tagCategories.filter((category) => {
  const alreadyAdded = usageRules.some(
    (rule) =>
      rule.scene === activeScene &&
      rule.attributeId === category.id &&
      rule.enabled,
  );
  return (
    !alreadyAdded &&
    sceneMeta.allowedTargets.includes(category.target) &&
    category.status !== 'disabled'
  );
});
```

Add handler:

```ts
const handleAddCategoryToScene = async (category: TagCategory) => {
  const nextRules = [
    ...usageRules,
    {
      id: makeUsageRuleId(activeScene, category.id),
      attributeId: category.id,
      scene: activeScene,
      enabled: true,
      required: sceneMeta.usageType === 'form' ? false : undefined,
      filterArea: sceneMeta.usageType === 'filter' ? 'more' : undefined,
      sort: enabledRules.length,
    },
  ];
  await onSaveUsageRules(nextRules);
};
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npx tsc --noEmit --pretty false
```

Manual checks:

- Usage settings opens with scene list on the left.
- Selecting `试题列表筛选` shows main/more filter sections.
- Addable attributes only include question and paper attributes.
- Selecting `试题打标` only allows question attributes and shows required controls.
- Usage settings never shows option value editing controls.

Commit:

```bash
git add src/pages/ContentCenter/TagManage/components/AttributeUsageSettingsWorkspace.tsx
git commit -m "feat(tag-system): configure usage rules by scene"
```

---

### Task 8: Polish Styling And Verify

**Files:**
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`

- [ ] **Step 1: Replace attribute settings less**

Rewrite `AttributeTagsPanel.less` around these selectors:

```less
.attribute-tags-panel {
  min-height: 640px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
}

.attribute-tags-panel .ant-tabs-nav {
  margin: 0;
  padding: 0 24px;
  border-bottom: 1px solid #edf0f5;
}

.attribute-workbench {
  display: grid;
  grid-template-columns: 280px minmax(520px, 1fr) 320px;
  min-height: 600px;
}

.attribute-definition-list,
.attribute-option-panel,
.attribute-summary-panel,
.attribute-usage-scene-panel,
.attribute-usage-main,
.attribute-usage-side {
  min-width: 0;
  background: #fff;
}

.attribute-definition-list,
.attribute-option-panel,
.attribute-usage-scene-panel,
.attribute-usage-main {
  border-right: 1px solid #edf0f5;
}

.attribute-panel-header {
  min-height: 72px;
  padding: 14px 16px;
  border-bottom: 1px solid #edf0f5;
}

.attribute-panel-title {
  color: #202733;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}

.attribute-panel-meta {
  margin-top: 2px;
  color: #7a8594;
  font-size: 12px;
  line-height: 18px;
}

.attribute-target-switch,
.attribute-option-subjects,
.attribute-usage-filter-tabs {
  padding: 12px 16px;
  border-bottom: 1px solid #edf0f5;
  background: #fbfdff;
}

.attribute-definition-items,
.attribute-option-list,
.attribute-usage-scene-list,
.attribute-usage-rule-list {
  padding: 10px;
}

.attribute-definition-item,
.attribute-option-row,
.attribute-usage-scene,
.attribute-usage-rule-row,
.attribute-addable-row {
  width: 100%;
  border: 1px solid #edf0f5;
  border-radius: 6px;
  background: #fff;
}

.attribute-definition-item.active,
.attribute-usage-scene.active {
  border-color: #9cc3ff;
  background: #f7fbff;
}

.attribute-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #16a34a;
  font-size: 13px;
  white-space: nowrap;
}

.attribute-status-pill::before {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #16a34a;
  content: '';
}

.attribute-status-pill.disabled {
  color: #8b95a5;
}

.attribute-status-pill.disabled::before {
  background: #c5ccd6;
}
```

Add row layouts for option and usage rows:

```less
.attribute-option-row,
.attribute-usage-rule-row {
  display: grid;
  grid-template-columns: 32px 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 52px;
  padding: 8px 10px;
}

.attribute-option-actions,
.attribute-usage-rule-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
```

- [ ] **Step 2: Run static verification**

Run:

```bash
npx tsc --noEmit --pretty false
npm run build
```

Expected:

- TypeScript exits 0.
- Build exits 0.

- [ ] **Step 3: Run desktop browser verification**

Start dev server:

```bash
npm run dev -- --port 8002
```

Open:

```text
http://localhost:8002/tag-system/attributes
```

Check at desktop viewport:

- No top-level grade selector.
- No top-level subject selector.
- Attribute definition tab uses three columns.
- Left list has type switch.
- `难度` has no subject selector.
- `能力` has subject selector in option panel only.
- Right panel does not show option detail, color, English value, display name, field type, control type, or citation count.
- Usage settings tab uses scene list / current scene / scene side panel.
- Usage settings does not show option value editing.

- [ ] **Step 4: Stop dev server and commit**

Stop the dev server with `Ctrl-C`.

Commit:

```bash
git add src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less
git commit -m "style(tag-system): polish attribute settings workspace"
```

---

### Task 9: Final Review

**Files:**
- Review all files changed in Tasks 1-8.

- [ ] **Step 1: Review diff against spec**

Run:

```bash
git diff --stat main...HEAD
git diff main...HEAD -- src/pages/ContentCenter/TagManage src/services/tagSystem.ts mock/tagSystem.ts
```

Confirm each spec acceptance item is implemented:

- One menu entry.
- Two tabs.
- Attribute definition three-column workbench.
- Type switch for paper/question/knowledge/topic.
- No top-level grade/subject.
- Subject selector only for by-subject question attributes.
- Usage settings by scene, not matrix.
- Usage settings does not manage option values.
- Filter scenes support primary/more.
- Manual sorting only.

- [ ] **Step 2: Run final verification**

Run:

```bash
npx tsc --noEmit --pretty false
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit any review fixes**

If review fixes were needed:

```bash
git add <changed-files>
git commit -m "fix(tag-system): refine attribute settings workspace"
```

If no fixes were needed, do not create an empty commit.
