import type {
  ContentBlockKind,
  KnowledgeBlockType,
} from '@/services/resourceAssets';

export const isKnowledgeContentKind = (
  kind: ContentBlockKind,
): kind is KnowledgeBlockType => kind !== 'columnContent';

export const getSelectedKnowledgeNodeIds = (
  kind: ContentBlockKind,
  knowledgeNodeId?: string,
  knowledgeNodeIds: string[] = [],
) => {
  if (!isKnowledgeContentKind(kind)) return [];
  return kind === 'comprehensive'
    ? knowledgeNodeIds
    : knowledgeNodeId
    ? [knowledgeNodeId]
    : [];
};

export const getKnowledgeNodeSelectionError = (
  kind: ContentBlockKind,
  knowledgeNodeIds: string[],
) => {
  if (!isKnowledgeContentKind(kind)) return null;
  if (kind === 'comprehensive') {
    return knowledgeNodeIds.length >= 2
      ? null
      : '综合类知识至少选择两个末级节点';
  }
  return knowledgeNodeIds.length === 1
    ? null
    : '当前知识类型必须选择一个末级节点';
};
