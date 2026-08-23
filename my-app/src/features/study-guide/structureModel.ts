import type {
  KnowledgeLeaf,
  RegisteredColumn,
  StructureLevel,
  StudyGuideStructureNode,
} from '@/services/resourceAssets';

export const STRUCTURE_LEVELS: StructureLevel[] = [
  'level1',
  'level2',
  'level3',
  'level4',
];

export const STRUCTURE_LEVEL_NUMBERS: Record<StructureLevel, 1 | 2 | 3 | 4> = {
  level1: 1,
  level2: 2,
  level3: 3,
  level4: 4,
};

export const getStudyGuideStructureError = (
  structure: StudyGuideStructureNode[],
  columns: RegisteredColumn[],
  knowledgeLeaves: KnowledgeLeaf[],
) => {
  const leafIds = new Set(knowledgeLeaves.map((leaf) => leaf.id));

  const visit = (
    nodes: StudyGuideStructureNode[],
    expectedLevel: StructureLevel,
  ): string | null => {
    const levelNumber = STRUCTURE_LEVEL_NUMBERS[expectedLevel];
    const registeredColumns = columns.filter(
      (column) => column.level === levelNumber,
    );
    for (const node of nodes) {
      if (node.level !== expectedLevel) {
        return '学案结构必须从一级开始逐级建立，不允许跳级';
      }
      if (registeredColumns.length) {
        const selectedColumn = registeredColumns.find(
          (column) => column.id === node.referenceId,
        );
        if (!selectedColumn) {
          return `${levelNumber}级存在注册栏目，只能从注册栏目中选择`;
        }
        if (
          selectedColumn.dataSource === 'knowledgeTree' &&
          (!node.knowledgeNodeId || !leafIds.has(node.knowledgeNodeId))
        ) {
          return `栏目“${selectedColumn.name}”必须选择当前学科知识树末级节点`;
        }
        if (
          selectedColumn.dataSource !== 'knowledgeTree' &&
          node.knowledgeNodeId
        ) {
          return `栏目“${selectedColumn.name}”不是知识树来源栏目`;
        }
      } else {
        if (node.referenceId) {
          return `${levelNumber}级没有注册栏目，只能填写当前学案的临时栏目`;
        }
        if (!(node.temporaryName || node.label).trim()) {
          return `请输入${levelNumber}级临时栏目名称`;
        }
        if (node.knowledgeNodeId) {
          return '临时栏目不能保存知识树节点引用';
        }
      }
      if (node.children.length) {
        const nextLevel = STRUCTURE_LEVELS[levelNumber];
        if (!nextLevel) return '四级栏目下不能继续添加子栏目';
        const childError = visit(node.children, nextLevel);
        if (childError) return childError;
      }
    }
    return null;
  };

  return visit(structure, 'level1');
};

export const hydrateStudyGuideStructureLabels = (
  structure: StudyGuideStructureNode[],
  columns: RegisteredColumn[],
  knowledgeLeaves: KnowledgeLeaf[],
): StudyGuideStructureNode[] => {
  const columnMap = new Map(columns.map((column) => [column.id, column]));
  const leafMap = new Map(knowledgeLeaves.map((leaf) => [leaf.id, leaf]));
  return structure.map((node) => {
    const column = columnMap.get(node.referenceId || '');
    const label =
      column?.dataSource === 'knowledgeTree'
        ? leafMap.get(node.knowledgeNodeId || '')?.title || node.label
        : column?.name || node.temporaryName || node.label;
    return {
      ...node,
      label,
      children: hydrateStudyGuideStructureLabels(
        node.children,
        columns,
        knowledgeLeaves,
      ),
    };
  });
};
