import type {
  ContentBlockKind,
  ExampleKnowledgeContent,
  KnowledgeBlockType,
  StudyGuideContentBlock,
} from '@/services/resourceAssets';

export const hasRichTextContent = (value?: string) => {
  const text = (value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return Boolean(text || /<(img|table|math)\b/i.test(value || ''));
};

export const getExampleKnowledgeContent = (
  block: Pick<StudyGuideContentBlock, 'html' | 'exampleContent'>,
): ExampleKnowledgeContent =>
  block.exampleContent || {
    stemHtml: block.html,
    guideHtml: '',
    answerHtml: '',
  };

export const buildExampleKnowledgeHtml = (content: ExampleKnowledgeContent) =>
  [
    ['试题内容', content.stemHtml],
    ['思路点拨', content.guideHtml],
    ['试题答案', content.answerHtml],
  ]
    .map(
      ([label, html]) =>
        `<section data-example-part="${label}"><h4>${label}</h4>${html}</section>`,
    )
    .join('');

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

export const getEffectiveKnowledgeNodeIds = (
  kind: ContentBlockKind,
  inheritedKnowledgeNodeId?: string,
  knowledgeNodeId?: string,
  knowledgeNodeIds: string[] = [],
) => {
  const selectedIds = getSelectedKnowledgeNodeIds(
    kind,
    knowledgeNodeId,
    knowledgeNodeIds,
  );
  if (kind === 'comprehensive') return selectedIds;
  if (!isKnowledgeContentKind(kind) || !inheritedKnowledgeNodeId) {
    return selectedIds;
  }
  return [inheritedKnowledgeNodeId];
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

export const getDraftContentBlocks = (blocks: StudyGuideContentBlock[]) =>
  blocks.map((block) => {
    if (!isKnowledgeContentKind(block.kind)) return block;
    return {
      id: block.id,
      kind: block.kind,
      structureNodeId: block.structureNodeId,
      html: block.html,
      ...(block.exampleContent ? { exampleContent: block.exampleContent } : {}),
      knowledgeNodeIds:
        block.kind === 'comprehensive' ? block.knowledgeNodeIds : [],
    };
  });
