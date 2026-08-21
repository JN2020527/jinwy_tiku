import type {
  KnowledgeTreeNode,
  PublishedQuestion,
} from '@/services/resourceAssets';

export type SelectionMode = 'single' | 'multiple';

export type SortKey = 'latest' | 'popular';

export type FilterRowKey = 'source' | 'type' | 'difficulty';

export type FilterRowState = {
  values: string[];
  mode: SelectionMode;
};

export type FilterState = Record<FilterRowKey, FilterRowState>;

export const ALL_VALUE = 'all';

export type FilterOption = { value: string; label: string };

/** 难度显示映射，取自数据契约 QuestionDifficulty 枚举（easy/medium/hard）。 */
export const QUESTION_DIFFICULTY_LABELS: Record<string, string> = {
  easy: '容易',
  medium: '中等',
  hard: '困难',
};

export const getDifficultyLabel = (value: string) =>
  QUESTION_DIFFICULTY_LABELS[value] ?? value;

/** 单选：点选即替换；多选：切换勾选，保持至少一项（回退「全部」）。 */
export function toggleFilterSelection(
  current: string[],
  value: string,
  mode: SelectionMode,
): string[] {
  if (mode === 'single' || value === ALL_VALUE) {
    return [value];
  }

  const next = new Set(current.filter((item) => item !== ALL_VALUE));
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next.size > 0 ? Array.from(next) : [ALL_VALUE];
}

export function createDefaultFilterState(): FilterState {
  return {
    source: { values: [ALL_VALUE], mode: 'single' },
    type: { values: [ALL_VALUE], mode: 'single' },
    difficulty: { values: [ALL_VALUE], mode: 'single' },
  };
}

/** 重置筛选：全部行回到「全部」单选。 */
export function resetFilterState(): FilterState {
  return createDefaultFilterState();
}

/** 从题目数据推导筛选项，不预设字段清单（PRD §8）。 */
export function deriveFilterOptions(
  questions: readonly PublishedQuestion[],
): Record<FilterRowKey, FilterOption[]> {
  const uniqueSorted = (values: readonly string[]) =>
    Array.from(new Set(values)).sort((left, right) =>
      left.localeCompare(right, 'zh-Hans-CN'),
    );

  const toOptions = (
    values: string[],
    labelFor?: (value: string) => string,
  ) => [
    { value: ALL_VALUE, label: '全部' },
    ...values.map((value) => ({
      value,
      label: labelFor ? labelFor(value) : value,
    })),
  ];

  return {
    source: toOptions(
      uniqueSorted(questions.map((question) => question.source)),
    ),
    type: toOptions(uniqueSorted(questions.map((question) => question.type))),
    difficulty: toOptions(
      uniqueSorted(questions.map((question) => question.difficulty)),
      getDifficultyLabel,
    ),
  };
}

export function isLeafNode(node: KnowledgeTreeNode): boolean {
  return !node.children || node.children.length === 0;
}

export function findTreeNode(
  nodes: readonly KnowledgeTreeNode[],
  key: string,
): KnowledgeTreeNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node;
    const matched = node.children
      ? findTreeNode(node.children, key)
      : undefined;
    if (matched) return matched;
  }
  return undefined;
}

/** 节点及其全部后代叶子 key；叶子节点自身即叶子。 */
export function getDescendantLeafKeys(
  nodes: readonly KnowledgeTreeNode[],
  key: string,
): string[] {
  const node = findTreeNode(nodes, key);
  if (!node) return [key];
  if (isLeafNode(node)) return [node.key];

  const collect = (current: KnowledgeTreeNode): string[] => {
    if (isLeafNode(current)) return [current.key];
    return (current.children ?? []).flatMap(collect);
  };
  return collect(node);
}

/** 节点祖先链 key（不含自身），用于展开路径。 */
export function getAncestorKeys(
  nodes: readonly KnowledgeTreeNode[],
  key: string,
): string[] {
  const ancestors: string[] = [];
  const walk = (
    current: readonly KnowledgeTreeNode[],
    path: string[],
  ): boolean => {
    for (const node of current) {
      if (node.key === key) {
        ancestors.push(...path);
        return true;
      }
      if (node.children && walk(node.children, [...path, node.key])) {
        return true;
      }
    }
    return false;
  };
  walk(nodes, []);
  return ancestors;
}

/** 子树全部节点 key（含自身与分支），用于选中后展开。 */
export function getSubtreeKeys(
  nodes: readonly KnowledgeTreeNode[],
  key: string,
): string[] {
  const node = findTreeNode(nodes, key);
  if (!node) return [key];

  const keys: string[] = [];
  const walk = (current: KnowledgeTreeNode) => {
    keys.push(current.key);
    (current.children ?? []).forEach(walk);
  };
  walk(node);
  return keys;
}

/** 默认展开第一层。 */
export function getFirstLevelKeys(
  nodes: readonly KnowledgeTreeNode[],
): string[] {
  return nodes.map((node) => node.key);
}

/** 知识点树搜索过滤：命中标题或其子孙命中则保留整条路径。 */
export function filterTreeNodeByQuery(
  nodes: readonly KnowledgeTreeNode[],
  query: string,
): KnowledgeTreeNode[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...nodes];

  const filter = (node: KnowledgeTreeNode): KnowledgeTreeNode | null => {
    const children = (node.children ?? [])
      .map(filter)
      .filter((child): child is KnowledgeTreeNode => child !== null);
    const selfMatched = node.title.toLowerCase().includes(normalized);
    if (selfMatched || children.length > 0) {
      return { ...node, children: children.length > 0 ? children : undefined };
    }
    return null;
  };

  return nodes
    .map(filter)
    .filter((node): node is KnowledgeTreeNode => node !== null);
}

function matchesArrayFilter(selectedValues: string[], value: string): boolean {
  return selectedValues.includes(ALL_VALUE) || selectedValues.includes(value);
}

function matchesSearchQuery(
  question: PublishedQuestion,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) return true;
  return question.stem.toLowerCase().includes(normalizedQuery);
}

/**
 * 筛选 + 结果内搜索 + 排序（最新/最热）。
 * selectedLeafKeys 为空表示不按知识点过滤。
 */
export function filterQuestions(
  questions: readonly PublishedQuestion[],
  selectedLeafKeys: readonly string[],
  filters: FilterState,
  searchQuery: string,
  sortKey: SortKey,
): PublishedQuestion[] {
  const leafKeySet = new Set(selectedLeafKeys);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return questions
    .filter((question) => {
      const matchesKnowledge =
        leafKeySet.size === 0 ||
        question.knowledgeNodeIds.some((id) => leafKeySet.has(id));
      return (
        matchesKnowledge &&
        matchesArrayFilter(filters.source.values, question.source) &&
        matchesArrayFilter(filters.type.values, question.type) &&
        matchesArrayFilter(filters.difficulty.values, question.difficulty) &&
        matchesSearchQuery(question, normalizedQuery)
      );
    })
    .sort((left, right) => {
      if (sortKey === 'popular') {
        return right.popularity - left.popularity;
      }
      return right.updatedAt.localeCompare(left.updatedAt);
    });
}

export function formatQuestionCount(total: number): string {
  return `共 ${total} 道题`;
}
