import type { KnowledgeTreeNode } from '../src/services/resourceAssets';
import { knowledgeTreesBySubject } from './resourceAssetsStore';

/**
 * “备课板块 → 知识树”的唯一 mock 数据源。
 *
 * 栏目维护、知识块和学案编辑都必须通过这里取得同一学科的知识树，
 * 避免维护页已经新增或导入节点，而业务页面仍读取初始化种子数据。
 */
const preparationKnowledgeTreeStore: Record<string, KnowledgeTreeNode[]> = {};

export const getPreparationKnowledgeTree = (subject: string) => {
  if (!preparationKnowledgeTreeStore[subject]) {
    preparationKnowledgeTreeStore[subject] =
      knowledgeTreesBySubject[subject] || [];
  }
  return preparationKnowledgeTreeStore[subject];
};

export const replacePreparationKnowledgeTree = (
  subject: string,
  nodes: KnowledgeTreeNode[],
) => {
  preparationKnowledgeTreeStore[subject] = nodes;
  // 保持仍在使用旧导出的存量 mock 逻辑一致，直至全部迁移完成。
  knowledgeTreesBySubject[subject] = nodes;
};
