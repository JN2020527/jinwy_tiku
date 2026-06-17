# Node Attribute Relations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `节点关联` tab to attribute settings so knowledge/topic attributes can be assigned to tree nodes, then display enabled relation values on the knowledge and topic trees.

**Architecture:** Keep attribute definitions, usage rules, and node relations as separate layers. Add a small service API and mock store for `NodeAttributeRelation`, a focused `NodeAttributeRelationWorkspace` for the new tab, and a reusable display helper that lets knowledge/topic tree pages render only relations enabled by the corresponding tree-node-display usage scene.

**Tech Stack:** Umi Max 4, React 18, TypeScript, Ant Design, Less, local Umi mock API.

---

## Scope Check

The approved spec is broad but still one coherent feature. Implement it as one vertical feature with four boundaries:

1. Service and helper types for node attribute relations.
2. Mock API and relation cleanup rules.
3. `节点关联` attribute-settings workspace.
4. Knowledge/topic tree relation display.

There is no configured test runner in this repository. Verification uses `npx tsc --noEmit --pretty false`, `npm run build`, and targeted browser checks at `http://localhost:8000/tag-system/attributes`, `/tag-system/knowledge`, and `/tag-system/topic`.

Current workspace note: before implementation, run `git status --short`. There are existing uncommitted attribute-setting edits in this workspace. Do not revert them. For each commit below, stage only the files listed in that task.

## File Structure

- Modify `src/services/tagSystem.ts`  
  Add `NodeAttributeRelation` types and service functions for querying, setting, and deleting node relations.

- Create `src/pages/ContentCenter/TagManage/components/nodeAttributeRelationHelpers.ts`  
  Pure helper functions for relation keys, option counts, checked keys, display rule filtering, and node meta conversion. This keeps UI files small and testable by inspection.

- Modify `mock/tagSystem.ts`  
  Add in-memory `nodeAttributeRelationStore`, REST handlers, validation, and cleanup when attributes, enum values, or tree nodes are deleted.

- Create `src/pages/ContentCenter/TagManage/components/NodeAttributeRelationWorkspace.tsx`  
  The three-column `节点关联` tab: target/attribute selector, enum-value selector, tree selector.

- Modify `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx`  
  Add the third tab and pass required data and refresh callbacks into `NodeAttributeRelationWorkspace`.

- Modify `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`  
  Add layout styles for the node relation workspace, reusing current attribute-panel colors and spacing.

- Modify `src/pages/ContentCenter/TagManage/components/KnowledgeTreePanel.tsx`  
  Load usage rules and relations, derive display tags, and pass `meta` into `TreeNodeTitle`.

- Modify `src/pages/ContentCenter/TagManage/components/TopicTreePanel.tsx`  
  Accept relation display props from `Topic.tsx`, derive node tags, and pass `meta` into `TreeNodeTitle`.

- Modify `src/pages/ContentCenter/TagManage/Topic.tsx`  
  Load usage rules and relations for `targetType=topic`, then pass them into `TopicTreePanel`.

- Modify `src/pages/ContentCenter/TagManage/components/TreeNodeTitle.less`  
  Add compact tag styles for node relation badges.

## Task 1: Add Service Types And Relation Helpers

**Files:**
- Modify: `src/services/tagSystem.ts`
- Create: `src/pages/ContentCenter/TagManage/components/nodeAttributeRelationHelpers.ts`

- [ ] **Step 1: Add relation types and service functions**

In `src/services/tagSystem.ts`, add these exports near the existing attribute types:

```ts
export type NodeAttributeTargetType = 'knowledge' | 'topic';

export interface NodeAttributeRelation {
  id: string;
  targetType: NodeAttributeTargetType;
  subject: string;
  nodeId: string;
  attributeId: string;
  optionId: string;
  updatedAt?: string;
}
```

Then add these service functions after `updateAttributeUsageRules`:

```ts
export async function getNodeAttributeRelations(params: {
  targetType: NodeAttributeTargetType;
  subject: string;
  attributeId?: string;
}) {
  return request<ApiResponse<NodeAttributeRelation[]>>(
    '/api/tags/node-attribute-relations',
    {
      method: 'GET',
      params,
    },
  );
}

export async function setNodeAttributeRelation(data: {
  targetType: NodeAttributeTargetType;
  subject: string;
  nodeId: string;
  attributeId: string;
  optionId: string;
}) {
  return request<ApiResponse<NodeAttributeRelation>>(
    '/api/tags/node-attribute-relation',
    {
      method: 'PUT',
      data,
    },
  );
}

export async function deleteNodeAttributeRelation(params: {
  targetType: NodeAttributeTargetType;
  subject: string;
  nodeId: string;
  attributeId: string;
}) {
  return request<ApiResponse<void>>('/api/tags/node-attribute-relation', {
    method: 'DELETE',
    params,
  });
}
```

- [ ] **Step 2: Create pure relation helpers**

Create `src/pages/ContentCenter/TagManage/components/nodeAttributeRelationHelpers.ts`:

```ts
import type {
  AttributeItem,
  AttributeTarget,
  AttributeUsageRule,
  AttributeUsageScene,
  NodeAttributeRelation,
  NodeAttributeTargetType,
  TagCategory,
} from '@/services/tagSystem';
import { getOptionList, sortBySort } from './attributeSettingsHelpers';

export const NODE_ATTRIBUTE_TARGET_LABELS: Record<
  NodeAttributeTargetType,
  string
> = {
  knowledge: '知识点',
  topic: '专题',
};

export const NODE_ATTRIBUTE_TARGET_OPTIONS = [
  { label: NODE_ATTRIBUTE_TARGET_LABELS.knowledge, value: 'knowledge' },
  { label: NODE_ATTRIBUTE_TARGET_LABELS.topic, value: 'topic' },
] as const;

export const NODE_ATTRIBUTE_CATEGORY_TARGET: Record<
  NodeAttributeTargetType,
  AttributeTarget
> = {
  knowledge: 'knowledge',
  topic: 'topic',
};

export const NODE_ATTRIBUTE_DISPLAY_SCENE: Record<
  NodeAttributeTargetType,
  AttributeUsageScene
> = {
  knowledge: 'knowledgeTreeNodeDisplay',
  topic: 'topicTreeNodeDisplay',
};

export const getRelationUniqueKey = (
  relation: Pick<
    NodeAttributeRelation,
    'targetType' | 'subject' | 'nodeId' | 'attributeId'
  >,
) =>
  [
    relation.targetType,
    relation.subject,
    relation.nodeId,
    relation.attributeId,
  ].join('__');

export const getEnabledNodeAttributeCategories = (
  categories: TagCategory[],
  targetType: NodeAttributeTargetType,
) => {
  const categoryTarget = NODE_ATTRIBUTE_CATEGORY_TARGET[targetType];
  return sortBySort(
    categories.filter(
      (category) =>
        category.target === categoryTarget && category.status !== 'disabled',
    ),
  );
};

export const getEnabledOptions = (
  category: TagCategory | undefined,
  subject: string,
) =>
  getOptionList(category, subject).filter(
    (option) => option.status !== 'disabled',
  );

export const getRelationCountsByAttribute = (
  relations: NodeAttributeRelation[],
) => {
  const counts = new Map<string, number>();
  relations.forEach((relation) => {
    counts.set(
      relation.attributeId,
      (counts.get(relation.attributeId) || 0) + 1,
    );
  });
  return counts;
};

export const getRelationCountsByOption = (
  relations: NodeAttributeRelation[],
  attributeId: string,
) => {
  const counts = new Map<string, number>();
  relations.forEach((relation) => {
    if (relation.attributeId !== attributeId) {
      return;
    }
    counts.set(relation.optionId, (counts.get(relation.optionId) || 0) + 1);
  });
  return counts;
};

export const getCheckedNodeKeysForOption = (
  relations: NodeAttributeRelation[],
  attributeId: string,
  optionId?: string,
) =>
  relations
    .filter(
      (relation) =>
        relation.attributeId === attributeId && relation.optionId === optionId,
    )
    .map((relation) => relation.nodeId);

export const getDisplayAttributeIds = (
  usageRules: AttributeUsageRule[],
  targetType: NodeAttributeTargetType,
) =>
  sortBySort(
    usageRules.filter(
      (rule) =>
        rule.enabled &&
        rule.scene === NODE_ATTRIBUTE_DISPLAY_SCENE[targetType],
    ),
  ).map((rule) => rule.attributeId);

export const getOptionMap = (
  categories: TagCategory[],
  subject: string,
) => {
  const optionMap = new Map<string, AttributeItem>();
  categories.forEach((category) => {
    getOptionList(category, subject).forEach((option) => {
      optionMap.set(option.id, option);
    });
  });
  return optionMap;
};

export const getCategoryMap = (categories: TagCategory[]) =>
  new Map(categories.map((category) => [category.id, category] as const));
```

- [ ] **Step 3: Run TypeScript check**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: `tsc` exits with code 0.

- [ ] **Step 4: Commit Task 1**

Stage only the service and helper files:

```bash
git add src/services/tagSystem.ts \
  src/pages/ContentCenter/TagManage/components/nodeAttributeRelationHelpers.ts
git commit -m "feat(tag-system): add node attribute relation services"
```

## Task 2: Add Mock Relation Store And API Handlers

**Files:**
- Modify: `mock/tagSystem.ts`

- [ ] **Step 1: Add mock relation types and helpers**

In `mock/tagSystem.ts`, add these near the existing attribute type definitions:

```ts
type NodeAttributeTargetType = 'knowledge' | 'topic';

interface MockNodeAttributeRelation {
  id: string;
  targetType: NodeAttributeTargetType;
  subject: string;
  nodeId: string;
  attributeId: string;
  optionId: string;
  updatedAt?: string;
}
```

Add these helper functions near `getTagCategoryById`:

```ts
const NODE_ATTRIBUTE_TARGET_TYPES: NodeAttributeTargetType[] = [
  'knowledge',
  'topic',
];

const isNodeAttributeTargetType = (
  targetType: unknown,
): targetType is NodeAttributeTargetType =>
  typeof targetType === 'string' &&
  NODE_ATTRIBUTE_TARGET_TYPES.includes(targetType as NodeAttributeTargetType);

const getRelationQueryValue = (value: unknown, fallback = '') => {
  if (Array.isArray(value)) {
    return getRelationQueryValue(value[0], fallback);
  }
  return typeof value === 'string' && value ? value : fallback;
};

const findRelationIndex = (
  targetType: NodeAttributeTargetType,
  subject: string,
  nodeId: string,
  attributeId: string,
) =>
  nodeAttributeRelationStore.findIndex(
    (relation) =>
      relation.targetType === targetType &&
      relation.subject === subject &&
      relation.nodeId === nodeId &&
      relation.attributeId === attributeId,
  );

const removeNodeAttributeRelations = (
  predicate: (relation: MockNodeAttributeRelation) => boolean,
) => {
  const nextRelations = nodeAttributeRelationStore.filter(
    (relation) => !predicate(relation),
  );
  nodeAttributeRelationStore.splice(
    0,
    nodeAttributeRelationStore.length,
    ...nextRelations,
  );
};
```

- [ ] **Step 2: Seed relation data**

Add this store after `attributeUsageRules`:

```ts
let nodeAttributeRelationStore: MockNodeAttributeRelation[] = [
  {
    id: 'rel-knowledge-math-rj-7-1-1-emphasis-key',
    targetType: 'knowledge',
    subject: 'math',
    nodeId: 'rj-7-1-1',
    attributeId: 'cat-knowledge-emphasis',
    optionId: 'knowledge-emphasis-1',
    updatedAt: '2026-06-17T00:00:00.000Z',
  },
  {
    id: 'rel-topic-math-kp-1-frequency-high',
    targetType: 'topic',
    subject: 'math',
    nodeId: 'kp-1',
    attributeId: 'cat-topic-frequency',
    optionId: 'topic-frequency-1',
    updatedAt: '2026-06-17T00:00:00.000Z',
  },
];
```

Also add default tree display usage rules so seeded relations are visible during manual verification:

```ts
{
  id: 'rule-knowledge-tree-display-emphasis',
  attributeId: 'cat-knowledge-emphasis',
  scene: 'knowledgeTreeNodeDisplay',
  enabled: true,
  sort: 0,
},
{
  id: 'rule-topic-tree-display-frequency',
  attributeId: 'cat-topic-frequency',
  scene: 'topicTreeNodeDisplay',
  enabled: true,
  sort: 0,
},
```

- [ ] **Step 3: Add API handlers**

Add these handlers before the textbook API handlers:

```ts
'GET /api/tags/node-attribute-relations': (req: Request, res: Response) => {
  const targetType = getRelationQueryValue(req.query.targetType);
  const subject = getRelationQueryValue(req.query.subject, DEFAULT_SUBJECT);
  const attributeId = getRelationQueryValue(req.query.attributeId);

  if (!isNodeAttributeTargetType(targetType)) {
    res.send({
      success: false,
      message: 'Invalid node attribute target type',
      data: [],
    });
    return;
  }

  res.send({
    success: true,
    data: nodeAttributeRelationStore.filter((relation) => {
      if (relation.targetType !== targetType) return false;
      if (relation.subject !== subject) return false;
      if (attributeId && relation.attributeId !== attributeId) return false;
      return true;
    }),
  });
},

'PUT /api/tags/node-attribute-relation': (req: Request, res: Response) => {
  const { targetType, nodeId, attributeId, optionId } = req.body || {};
  const subject = normalizeQueryValue(req.body?.subject, DEFAULT_SUBJECT);
  const category = getTagCategoryById(attributeId);
  const optionExists = Boolean(
    category && getCategoryOptionList(category, subject).some((item) => item.id === optionId),
  );

  if (
    !isNodeAttributeTargetType(targetType) ||
    typeof nodeId !== 'string' ||
    typeof attributeId !== 'string' ||
    typeof optionId !== 'string' ||
    !category ||
    !optionExists
  ) {
    res.send({
      success: false,
      message: 'Invalid node attribute relation',
    });
    return;
  }

  const relationPayload = {
    targetType,
    subject,
    nodeId,
    attributeId,
  };
  const relationIndex = findRelationIndex(
    targetType,
    subject,
    nodeId,
    attributeId,
  );
  const relation: MockNodeAttributeRelation = {
    ...relationPayload,
    id:
      relationIndex >= 0
        ? nodeAttributeRelationStore[relationIndex].id
        : `rel-${Date.now()}`,
    optionId,
    updatedAt: new Date().toISOString(),
  };

  if (relationIndex >= 0) {
    nodeAttributeRelationStore[relationIndex] = relation;
  } else {
    nodeAttributeRelationStore.push(relation);
  }

  res.send({
    success: true,
    message: 'Node attribute relation saved successfully',
    data: relation,
  });
},

'DELETE /api/tags/node-attribute-relation': (req: Request, res: Response) => {
  const targetType = getRelationQueryValue(req.query.targetType);
  const subject = getRelationQueryValue(req.query.subject, DEFAULT_SUBJECT);
  const nodeId = getRelationQueryValue(req.query.nodeId);
  const attributeId = getRelationQueryValue(req.query.attributeId);

  if (!isNodeAttributeTargetType(targetType) || !nodeId || !attributeId) {
    res.send({
      success: false,
      message: 'Invalid node attribute relation',
    });
    return;
  }

  const relationIndex = findRelationIndex(
    targetType,
    subject,
    nodeId,
    attributeId,
  );

  if (relationIndex < 0) {
    res.send({
      success: true,
      message: 'Node attribute relation already removed',
    });
    return;
  }

  nodeAttributeRelationStore.splice(relationIndex, 1);
  res.send({
    success: true,
    message: 'Node attribute relation removed successfully',
  });
},
```

Run Prettier after adding the handlers so long expressions wrap cleanly:

```bash
npx prettier --write mock/tagSystem.ts
```

- [ ] **Step 4: Add cleanup for deletes**

Update existing mock handlers with these cleanup calls:

```ts
// In DELETE /api/tags/category, inside `if (deleted) { ... }`
removeNodeAttributeRelations((relation) => relation.attributeId === id);
```

```ts
// In DELETE /api/tags/attribute, after setCategoryOptionList(...)
removeNodeAttributeRelations((relation) => relation.optionId === id);
```

```ts
// In DELETE /api/tags/knowledge-node after a successful delete
removeNodeAttributeRelations(
  (relation) =>
    relation.targetType === 'topic' &&
    relation.subject === context.subject &&
    relation.nodeId === id,
);
```

```ts
// In DELETE /api/tags/textbook-chapter after a successful delete
removeNodeAttributeRelations(
  (relation) =>
    relation.targetType === 'knowledge' &&
    relation.subject === getSubjectKey(subject) &&
    relation.nodeId === id,
);
```

- [ ] **Step 5: Verify mock types**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: `tsc` exits with code 0.

- [ ] **Step 6: Commit Task 2**

```bash
git add mock/tagSystem.ts
git commit -m "feat(tag-system): mock node attribute relations"
```

## Task 3: Build The Node Relation Workspace Tab

**Files:**
- Create: `src/pages/ContentCenter/TagManage/components/NodeAttributeRelationWorkspace.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`

- [ ] **Step 1: Create the workspace component**

Create `src/pages/ContentCenter/TagManage/components/NodeAttributeRelationWorkspace.tsx`:

```tsx
import type {
  NodeAttributeRelation,
  NodeAttributeTargetType,
  TagCategory,
} from '@/services/tagSystem';
import {
  deleteNodeAttributeRelation,
  getKnowledgeTree,
  getNodeAttributeRelations,
  getTextbookChapters,
  getTextbookVersions,
  setNodeAttributeRelation,
} from '@/services/tagSystem';
import { SearchOutlined, TagsOutlined } from '@ant-design/icons';
import { Empty, Input, message, Segmented, Select, Spin, Tree } from 'antd';
import type { TreeProps } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SUBJECT_OPTIONS } from './attributeSettingsConstants';
import { getOptionList, sortBySort } from './attributeSettingsHelpers';
import {
  getCheckedNodeKeysForOption,
  getEnabledNodeAttributeCategories,
  getRelationCountsByAttribute,
  getRelationCountsByOption,
  NODE_ATTRIBUTE_TARGET_LABELS,
  NODE_ATTRIBUTE_TARGET_OPTIONS,
} from './nodeAttributeRelationHelpers';
import TreeNodeTitle from './TreeNodeTitle';
import type { TreeNodeData } from './treeHelpers';
import { useTreeSearch } from './treeHelpers';

interface NodeAttributeRelationWorkspaceProps {
  tagCategories: TagCategory[];
}

const DEFAULT_SUBJECT = 'math';

const NodeAttributeRelationWorkspace: React.FC<
  NodeAttributeRelationWorkspaceProps
> = ({ tagCategories }) => {
  const [targetType, setTargetType] =
    useState<NodeAttributeTargetType>('knowledge');
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [activeAttributeId, setActiveAttributeId] = useState<string>();
  const [activeOptionId, setActiveOptionId] = useState<string>();
  const [relations, setRelations] = useState<NodeAttributeRelation[]>([]);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [textbookVersion, setTextbookVersion] = useState<string>();
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [savingNodeId, setSavingNodeId] = useState<string>();

  const categories = useMemo(
    () => getEnabledNodeAttributeCategories(tagCategories, targetType),
    [tagCategories, targetType],
  );
  const activeCategory = categories.find(
    (category) => category.id === activeAttributeId,
  );
  const options = useMemo(
    () => sortBySort(getOptionList(activeCategory, subject)),
    [activeCategory, subject],
  );
  const activeOption = options.find((option) => option.id === activeOptionId);
  const relationCountsByAttribute = useMemo(
    () => getRelationCountsByAttribute(relations),
    [relations],
  );
  const relationCountsByOption = useMemo(
    () =>
      activeAttributeId
        ? getRelationCountsByOption(relations, activeAttributeId)
        : new Map<string, number>(),
    [activeAttributeId, relations],
  );
  const checkedKeys = useMemo(
    () =>
      activeAttributeId
        ? getCheckedNodeKeysForOption(
            relations,
            activeAttributeId,
            activeOptionId,
          )
        : [],
    [activeAttributeId, activeOptionId, relations],
  );
  const treeSearch = useTreeSearch(treeData);

  useEffect(() => {
    if (!categories.length) {
      setActiveAttributeId(undefined);
      return;
    }
    if (
      !activeAttributeId ||
      !categories.some((category) => category.id === activeAttributeId)
    ) {
      setActiveAttributeId(categories[0].id);
    }
  }, [activeAttributeId, categories]);

  useEffect(() => {
    if (!options.length) {
      setActiveOptionId(undefined);
      return;
    }
    if (!activeOptionId || !options.some((option) => option.id === activeOptionId)) {
      setActiveOptionId(options[0].id);
    }
  }, [activeOptionId, options]);

  useEffect(() => {
    const fetchTextbookVersion = async () => {
      if (targetType !== 'knowledge' || textbookVersion) {
        return;
      }
      const res = await getTextbookVersions();
      if (res.success && res.data.length) {
        setTextbookVersion(res.data[0].value);
      }
    };
    void fetchTextbookVersion();
  }, [targetType, textbookVersion]);

  const fetchRelations = useCallback(async () => {
    setLoadingRelations(true);
    try {
      const res = await getNodeAttributeRelations({ targetType, subject });
      if (res.success) {
        setRelations(res.data);
      }
    } catch {
      message.error('获取节点关联失败');
    } finally {
      setLoadingRelations(false);
    }
  }, [subject, targetType]);

  const fetchTree = useCallback(async () => {
    setLoadingTree(true);
    try {
      const res =
        targetType === 'knowledge'
          ? await getTextbookChapters(textbookVersion || '', subject)
          : await getKnowledgeTree({ subject });
      if (res.success) {
        setTreeData(res.data as unknown as TreeNodeData[]);
      }
    } catch {
      message.error('获取节点树失败');
    } finally {
      setLoadingTree(false);
    }
  }, [subject, targetType, textbookVersion]);

  useEffect(() => {
    void fetchRelations();
  }, [fetchRelations]);

  useEffect(() => {
    if (targetType === 'knowledge' && !textbookVersion) {
      return;
    }
    void fetchTree();
  }, [fetchTree, targetType, textbookVersion]);

  const handleCheck: TreeProps['onCheck'] = async (nextChecked, info) => {
    if (!activeAttributeId || !activeOptionId) {
      return;
    }

    const nodeId = String(info.node.key);
    const checked = Array.isArray(nextChecked)
      ? nextChecked.includes(nodeId)
      : nextChecked.checked.includes(nodeId);

    setSavingNodeId(nodeId);
    const previousRelations = relations;
    try {
      if (checked) {
        const res = await setNodeAttributeRelation({
          targetType,
          subject,
          nodeId,
          attributeId: activeAttributeId,
          optionId: activeOptionId,
        });
        if (!res.success) {
          message.error(res.message || '节点关联保存失败');
          return;
        }
        setRelations((current) => [
          ...current.filter(
            (relation) =>
              !(
                relation.targetType === targetType &&
                relation.subject === subject &&
                relation.nodeId === nodeId &&
                relation.attributeId === activeAttributeId
              ),
          ),
          res.data,
        ]);
        message.success('节点关联已保存');
        return;
      }

      const res = await deleteNodeAttributeRelation({
        targetType,
        subject,
        nodeId,
        attributeId: activeAttributeId,
      });
      if (!res.success) {
        message.error(res.message || '节点关联取消失败');
        return;
      }
      setRelations((current) =>
        current.filter(
          (relation) =>
            !(
              relation.targetType === targetType &&
              relation.subject === subject &&
              relation.nodeId === nodeId &&
              relation.attributeId === activeAttributeId
            ),
        ),
      );
      message.success('节点关联已取消');
    } catch {
      setRelations(previousRelations);
      message.error('节点关联保存失败');
    } finally {
      setSavingNodeId(undefined);
    }
  };

  const emptyDescription =
    targetType === 'knowledge' ? '暂无知识点属性' : '暂无专题属性';

  return (
    <div className="node-attribute-workbench">
      <aside className="node-attribute-panel node-attribute-category-panel">
        <div className="attribute-panel-header">
          <div className="attribute-panel-title">节点关联</div>
        </div>
        <div className="node-attribute-panel-body">
          <Segmented
            block
            value={targetType}
            options={[...NODE_ATTRIBUTE_TARGET_OPTIONS]}
            onChange={(value) => {
              setTargetType(value as NodeAttributeTargetType);
              setActiveAttributeId(undefined);
              setActiveOptionId(undefined);
            }}
          />
          {categories.length ? (
            <div className="node-attribute-list">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={
                    category.id === activeAttributeId
                      ? 'node-attribute-item active'
                      : 'node-attribute-item'
                  }
                  onClick={() => setActiveAttributeId(category.id)}
                >
                  <span className="attribute-category-icon">
                    <TagsOutlined />
                  </span>
                  <span className="node-attribute-item-main">
                    <span className="node-attribute-item-name">{category.name}</span>
                    <span className="node-attribute-item-meta">
                      {getOptionList(category, subject).length} 个枚举值 /{' '}
                      {relationCountsByAttribute.get(category.id) || 0} 个节点
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="attribute-workspace-empty">
              <Empty description={emptyDescription} />
            </div>
          )}
        </div>
      </aside>

      <main className="node-attribute-panel node-attribute-option-panel">
        <div className="attribute-panel-header">
          <div className="attribute-panel-title">
            {activeCategory?.name || '枚举值'}
          </div>
        </div>
        <div className="node-attribute-panel-body">
          {options.length ? (
            <div className="node-attribute-list">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={option.status === 'disabled'}
                  className={
                    option.id === activeOptionId
                      ? 'node-attribute-item active'
                      : 'node-attribute-item'
                  }
                  onClick={() => setActiveOptionId(option.id)}
                >
                  <span className="node-attribute-item-main">
                    <span className="node-attribute-item-name">{option.name}</span>
                    <span className="node-attribute-item-meta">
                      {relationCountsByOption.get(option.id) || 0} 个节点
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="attribute-workspace-empty">
              <Empty description="暂无枚举值" />
            </div>
          )}
        </div>
      </main>

      <section className="node-attribute-panel node-attribute-tree-panel">
        <div className="node-attribute-tree-toolbar">
          <div className="tag-system-tree-subject-filter">
            <span className="tag-system-tree-subject-label">学科</span>
            <Select
              size="small"
              value={subject}
              className="tag-system-tree-subject-select"
              options={SUBJECT_OPTIONS}
              aria-label="选择学科"
              onChange={setSubject}
            />
          </div>
          <Input
            className="tag-system-tree-search"
            name="nodeAttributeTreeSearch"
            autoComplete="off"
            prefix={<SearchOutlined aria-hidden="true" style={{ color: '#ccc' }} />}
            aria-label="搜索节点"
            allowClear
            placeholder="搜索节点…"
            value={treeSearch.searchValue}
            onChange={treeSearch.onSearch}
          />
        </div>
        <div className="node-attribute-context">
          {activeCategory && activeOption
            ? `正在为 ${NODE_ATTRIBUTE_TARGET_LABELS[targetType]} / ${activeCategory.name} / ${activeOption.name} 选择节点`
            : '请选择属性和枚举值'}
        </div>
        <Spin spinning={loadingTree || loadingRelations}>
          {treeData.length && activeAttributeId && activeOptionId ? (
            <Tree
              checkable
              selectable={false}
              checkStrictly
              blockNode
              showLine
              treeData={treeData}
              checkedKeys={checkedKeys}
              onCheck={handleCheck}
              onExpand={treeSearch.onExpand}
              expandedKeys={treeSearch.expandedKeys}
              autoExpandParent={treeSearch.autoExpandParent}
              titleRender={(node: TreeNodeData) => (
                <TreeNodeTitle
                  nodeData={node}
                  searchValue={treeSearch.searchValue}
                  actionsVisible={false}
                  showAddChild={false}
                  onAddChild={() => undefined}
                  onEdit={() => undefined}
                  onDelete={() => undefined}
                  meta={
                    savingNodeId === String(node.key) ? (
                      <span className="node-attribute-saving">保存中</span>
                    ) : null
                  }
                />
              )}
              fieldNames={{ title: 'title', key: 'key', children: 'children' }}
              height={600}
            />
          ) : (
            <div className="attribute-workspace-empty">
              <Empty description="请选择属性和枚举值" />
            </div>
          )}
        </Spin>
      </section>
    </div>
  );
};

export default NodeAttributeRelationWorkspace;
```

- [ ] **Step 2: Add the third tab**

In `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx`, import the component:

```ts
import NodeAttributeRelationWorkspace from './NodeAttributeRelationWorkspace';
```

Add this tab item after `使用设置`:

```tsx
{
  key: 'nodeRelations',
  label: '节点关联',
  children: (
    <NodeAttributeRelationWorkspace tagCategories={tagCategories} />
  ),
},
```

- [ ] **Step 3: Add workspace styles**

Append to `src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less`:

```less
.node-attribute-workbench {
  display: grid;
  grid-template-columns: 260px 260px minmax(360px, 1fr);
  min-height: 640px;
  overflow: hidden;
  border: 1px solid @attribute-border;
  border-radius: 8px;
  background: #fff;
}

.node-attribute-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.node-attribute-category-panel,
.node-attribute-option-panel {
  border-right: 1px solid @attribute-border;
}

.node-attribute-category-panel {
  background: #fafbfc;
}

.node-attribute-panel-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 10px 14px;
}

.node-attribute-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.node-attribute-item {
  display: flex;
  width: 100%;
  min-height: 58px;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease, border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.node-attribute-item:hover,
.node-attribute-item:focus-visible {
  border-color: @attribute-border;
  background: #fff;
}

.node-attribute-item.active {
  border-color: #b9d4ff;
  background: #fff;
  box-shadow: inset 3px 0 0 @attribute-blue;
}

.node-attribute-item:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.node-attribute-item-main {
  min-width: 0;
}

.node-attribute-item-name,
.node-attribute-item-meta {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-attribute-item-name {
  color: @attribute-text;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
}

.node-attribute-item-meta {
  margin-top: 1px;
  color: @attribute-text-muted;
  font-size: 12px;
  line-height: 18px;
}

.node-attribute-tree-panel {
  padding: 0;
}

.node-attribute-tree-toolbar {
  display: flex;
  min-height: 72px;
  align-items: center;
  gap: 18px;
  padding: 14px 16px;
  border-bottom: 1px solid @attribute-border-soft;
}

.node-attribute-context {
  padding: 10px 16px;
  border-bottom: 1px solid @attribute-border-soft;
  color: @attribute-text-secondary;
  font-size: 13px;
  line-height: 20px;
}

.node-attribute-saving {
  color: @attribute-blue;
}
```

- [ ] **Step 4: Verify TypeScript and build**

Run:

```bash
npx prettier --write \
  src/pages/ContentCenter/TagManage/components/NodeAttributeRelationWorkspace.tsx \
  src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx \
  src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less
npx tsc --noEmit --pretty false
npm run build
```

Expected:

- Prettier rewrites only the three files listed.
- `tsc` exits with code 0.
- `npm run build` exits with code 0. A Browserslist/caniuse warning is acceptable.

- [ ] **Step 5: Commit Task 3**

```bash
git add \
  src/pages/ContentCenter/TagManage/components/NodeAttributeRelationWorkspace.tsx \
  src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx \
  src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less
git commit -m "feat(tag-system): add node relation workspace"
```

## Task 4: Display Relation Tags On Knowledge And Topic Trees

**Files:**
- Modify: `src/pages/ContentCenter/TagManage/components/KnowledgeTreePanel.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/TopicTreePanel.tsx`
- Modify: `src/pages/ContentCenter/TagManage/Topic.tsx`
- Modify: `src/pages/ContentCenter/TagManage/components/TreeNodeTitle.less`

- [ ] **Step 1: Add node tag helper usage to tree panels**

In `KnowledgeTreePanel.tsx`, extend imports:

```ts
import type {
  AttributeUsageRule,
  NodeAttributeRelation,
  TagCategory,
} from '@/services/tagSystem';
import {
  getAttributeUsageRules,
  getNodeAttributeRelations,
  getTagCategories,
  // keep existing imports
} from '@/services/tagSystem';
import { Tag } from 'antd';
import {
  getCategoryMap,
  getDisplayAttributeIds,
  getOptionMap,
} from './nodeAttributeRelationHelpers';
```

Add state:

```ts
const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
const [usageRules, setUsageRules] = useState<AttributeUsageRule[]>([]);
const [nodeRelations, setNodeRelations] = useState<NodeAttributeRelation[]>([]);
```

Add fetch function:

```ts
const fetchNodeRelationMeta = useCallback(async () => {
  try {
    const [categoryRes, usageRuleRes, relationRes] = await Promise.all([
      getTagCategories(),
      getAttributeUsageRules(),
      getNodeAttributeRelations({
        targetType: 'knowledge',
        subject: selectedSubject,
      }),
    ]);
    if (categoryRes.success) {
      setTagCategories(categoryRes.data);
    }
    if (usageRuleRes.success) {
      setUsageRules(usageRuleRes.data);
    }
    if (relationRes.success) {
      setNodeRelations(relationRes.data);
    }
  } catch {
    message.error('获取知识节点属性失败');
  }
}, [selectedSubject]);

useEffect(() => {
  void fetchNodeRelationMeta();
}, [fetchNodeRelationMeta]);
```

Add display derivation:

```ts
const displayAttributeIds = useMemo(
  () => getDisplayAttributeIds(usageRules, 'knowledge'),
  [usageRules],
);
const categoryMap = useMemo(() => getCategoryMap(tagCategories), [tagCategories]);
const optionMap = useMemo(
  () => getOptionMap(tagCategories, selectedSubject),
  [selectedSubject, tagCategories],
);
const relationMapByNode = useMemo(() => {
  const map = new Map<string, NodeAttributeRelation[]>();
  nodeRelations.forEach((relation) => {
    map.set(relation.nodeId, [...(map.get(relation.nodeId) || []), relation]);
  });
  return map;
}, [nodeRelations]);

const renderNodeRelationMeta = (nodeKey: React.Key) => {
  const relationsForNode = relationMapByNode.get(String(nodeKey)) || [];
  const tags = displayAttributeIds.flatMap((attributeId) => {
    const category = categoryMap.get(attributeId);
    const relation = relationsForNode.find(
      (item) => item.attributeId === attributeId,
    );
    const option = relation ? optionMap.get(relation.optionId) : undefined;

    if (!category || category.status === 'disabled') {
      return [];
    }
    if (!option || option.status === 'disabled') {
      return [];
    }

    return [
      <Tag key={`${attributeId}-${option.id}`} className="tag-tree-node-tag">
        {option.name}
      </Tag>,
    ];
  });

  return tags.length ? <span className="tag-tree-node-tags">{tags}</span> : null;
};
```

Pass it into `TreeNodeTitle`:

```tsx
meta={renderNodeRelationMeta(node.key)}
```

- [ ] **Step 2: Pass topic relation data from the page**

In `src/pages/ContentCenter/TagManage/Topic.tsx`, extend imports:

```ts
import type {
  AttributeUsageRule,
  NodeAttributeRelation,
  TagCategory,
} from '@/services/tagSystem';
import {
  getAttributeUsageRules,
  getKnowledgeTree,
  getNodeAttributeRelations,
  getTagCategories,
} from '@/services/tagSystem';
```

Add state:

```ts
const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
const [usageRules, setUsageRules] = useState<AttributeUsageRule[]>([]);
const [nodeRelations, setNodeRelations] = useState<NodeAttributeRelation[]>([]);
```

Update `fetchData` so the current `getKnowledgeTree` call stays, and append:

```ts
const [categoryRes, usageRuleRes, relationRes] = await Promise.all([
  getTagCategories(),
  getAttributeUsageRules(),
  getNodeAttributeRelations({
    targetType: 'topic',
    subject: selectedSubject,
  }),
]);
if (categoryRes.success) setTagCategories(categoryRes.data);
if (usageRuleRes.success) setUsageRules(usageRuleRes.data);
if (relationRes.success) setNodeRelations(relationRes.data);
```

Pass props to `TopicTreePanel`:

```tsx
tagCategories={tagCategories}
usageRules={usageRules}
nodeRelations={nodeRelations}
```

- [ ] **Step 3: Render topic tags**

In `TopicTreePanel.tsx`, add props:

```ts
tagCategories: TagCategory[];
usageRules: AttributeUsageRule[];
nodeRelations: NodeAttributeRelation[];
```

Use the same derivation as `KnowledgeTreePanel`, but call:

```ts
const displayAttributeIds = useMemo(
  () => getDisplayAttributeIds(usageRules, 'topic'),
  [usageRules],
);
```

Pass the rendered meta into `TreeNodeTitle`:

```tsx
meta={renderNodeRelationMeta(node.key)}
```

- [ ] **Step 4: Add compact tag styles**

Append to `src/pages/ContentCenter/TagManage/components/TreeNodeTitle.less`:

```less
.tag-tree-node-tags {
  display: inline-flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.tag-tree-node-tag {
  max-width: 88px;
  margin-inline-end: 0;
  overflow: hidden;
  border-color: #d6e4ff;
  background: #f0f5ff;
  color: #1d4ed8;
  font-size: 12px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 5: Verify display logic**

Run:

```bash
npx prettier --write \
  src/pages/ContentCenter/TagManage/components/KnowledgeTreePanel.tsx \
  src/pages/ContentCenter/TagManage/components/TopicTreePanel.tsx \
  src/pages/ContentCenter/TagManage/Topic.tsx \
  src/pages/ContentCenter/TagManage/components/TreeNodeTitle.less
npx tsc --noEmit --pretty false
npm run build
```

Expected:

- `tsc` exits with code 0.
- `npm run build` exits with code 0.

- [ ] **Step 6: Commit Task 4**

```bash
git add \
  src/pages/ContentCenter/TagManage/components/KnowledgeTreePanel.tsx \
  src/pages/ContentCenter/TagManage/components/TopicTreePanel.tsx \
  src/pages/ContentCenter/TagManage/Topic.tsx \
  src/pages/ContentCenter/TagManage/components/TreeNodeTitle.less
git commit -m "feat(tag-system): display node attribute tags"
```

## Task 5: Manual Browser Verification

**Files:**
- No code files unless verification reveals issues.

- [ ] **Step 1: Start or reuse the dev server**

Run:

```bash
npm run dev
```

Expected:

- Dev server is available at `http://localhost:8000`.
- If port 8000 is already in use and serving this app, reuse it.

- [ ] **Step 2: Verify node relation maintenance**

Open:

```text
http://localhost:8000/tag-system/attributes
```

Manual checks:

1. `属性设置` shows three tabs: `属性定义`、`使用设置`、`节点关联`.
2. Open `节点关联`.
3. Select `知识点`.
4. Select `重难点`.
5. Select `重点`.
6. The right tree loads math knowledge nodes.
7. Check a node.
8. Success message appears.
9. Switch to another enum value under the same attribute.
10. Check the same node.
11. The node is no longer checked under the previous enum value.
12. Uncheck the node.
13. The relation count decreases.

- [ ] **Step 3: Verify knowledge tree display**

Open:

```text
http://localhost:8000/tag-system/knowledge
```

Expected:

- Nodes with `knowledgeTreeNodeDisplay` enabled relations show compact tags after the node title.
- Relations whose attributes are not enabled in `知识点树节点展示` do not show.
- There is no attribute editing control on the knowledge tree.

- [ ] **Step 4: Verify topic tree display**

Open:

```text
http://localhost:8000/tag-system/topic
```

Expected:

- Nodes with `topicTreeNodeDisplay` enabled relations show compact tags after the node title.
- Relations whose attributes are not enabled in `专题树节点展示` do not show.
- There is no attribute editing control on the topic tree.

- [ ] **Step 5: Run final checks**

Run:

```bash
npx tsc --noEmit --pretty false
npm run build
git status --short
```

Expected:

- `tsc` exits with code 0.
- `npm run build` exits with code 0.
- `git status --short` shows only intentional changes from the implementation and any pre-existing unrelated dirty files.

- [ ] **Step 6: Commit verification fixes if any**

If browser verification required fixes, stage only changed implementation files:

```bash
git add \
  src/services/tagSystem.ts \
  mock/tagSystem.ts \
  src/pages/ContentCenter/TagManage/components/nodeAttributeRelationHelpers.ts \
  src/pages/ContentCenter/TagManage/components/NodeAttributeRelationWorkspace.tsx \
  src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.tsx \
  src/pages/ContentCenter/TagManage/components/AttributeTagsPanel.less \
  src/pages/ContentCenter/TagManage/components/KnowledgeTreePanel.tsx \
  src/pages/ContentCenter/TagManage/components/TopicTreePanel.tsx \
  src/pages/ContentCenter/TagManage/Topic.tsx \
  src/pages/ContentCenter/TagManage/components/TreeNodeTitle.less
git commit -m "fix(tag-system): polish node relation behavior"
```

If no fixes were required, skip this commit.

## Self-Review Notes

- Spec coverage: The plan covers the `节点关联` tab, single-choice node relation data model, immediate save, relation cleanup, and knowledge/topic tree display controlled by usage settings.
- Non-goals preserved: No matrix table, no test inheritance, no bulk import, no cross-subject copy, no knowledge/topic tree editing entry for relations.
- Type consistency: The plan consistently uses `NodeAttributeTargetType`, `NodeAttributeRelation`, `targetType`, `subject`, `nodeId`, `attributeId`, and `optionId`.
- Verification: The plan uses the repository's available verification commands because there is no configured test runner.
