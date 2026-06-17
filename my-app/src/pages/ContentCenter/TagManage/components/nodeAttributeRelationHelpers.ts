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

export const getOptionMap = (categories: TagCategory[], subject: string) => {
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
