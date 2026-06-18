import type {
  AttributeFilterArea,
  AttributeItem,
  AttributeTarget,
  AttributeUsageRule,
  AttributeUsageScene,
  TagCategory,
} from '@/services/tagSystem';
import {
  SUBJECT_OPTIONS,
  USAGE_SCENE_OPTIONS,
} from './attributeSettingsConstants';

interface GetRulesForSceneOptions {
  enabledOnly?: boolean;
}

export const normalizeOptionOrder = (tags: AttributeItem[]) =>
  tags.map((tag, index) => ({
    ...tag,
    sort: index,
  }));

export const sortBySort = <T extends { sort?: number }>(items: T[]) =>
  items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const sortA = a.item.sort ?? Number.POSITIVE_INFINITY;
      const sortB = b.item.sort ?? Number.POSITIVE_INFINITY;

      if (sortA !== sortB) {
        return sortA - sortB;
      }

      return a.index - b.index;
    })
    .map(({ item }) => item);

export const getOptionList = (category?: TagCategory, subject = 'math') => {
  if (!category) {
    return [];
  }

  if (
    category.target === 'question' &&
    category.optionAddMode === 'bySubject'
  ) {
    return sortBySort(category.subjectTags?.[subject] || []);
  }

  return sortBySort(category.tags || []);
};

export const getApplicableSubjectOptions = (category?: TagCategory) => {
  if (
    !category ||
    category.target !== 'question' ||
    category.optionAddMode !== 'bySubject' ||
    category.subjectScope !== 'specified'
  ) {
    return SUBJECT_OPTIONS;
  }

  const applicableSubjectSet = new Set(category.applicableSubjects || []);
  return SUBJECT_OPTIONS.filter((subject) =>
    applicableSubjectSet.has(subject.value),
  );
};

export const withOptionList = (
  category: TagCategory,
  tags: AttributeItem[],
  subject: string,
): TagCategory => {
  const normalizedTags = normalizeOptionOrder(tags);

  if (
    category.target === 'question' &&
    category.optionAddMode === 'bySubject'
  ) {
    return {
      ...category,
      subjectTags: {
        ...(category.subjectTags || {}),
        [subject]: normalizedTags,
      },
    };
  }

  return {
    ...category,
    tags: normalizedTags,
  };
};

export const getSceneMeta = (scene: AttributeUsageScene) =>
  USAGE_SCENE_OPTIONS.find((item) => item.scene === scene);

export const isTargetAllowedInScene = (
  target: AttributeTarget,
  scene: AttributeUsageScene,
) => getSceneMeta(scene)?.allowedTargets.includes(target) || false;

export const getRulesForScene = (
  rules: AttributeUsageRule[],
  scene: AttributeUsageScene,
  filterArea?: AttributeFilterArea,
  options: GetRulesForSceneOptions = {},
) =>
  sortBySort(
    rules.filter((rule) => {
      const { enabledOnly = true } = options;

      return (
        rule.scene === scene &&
        (!enabledOnly || rule.enabled) &&
        (!filterArea || rule.filterArea === filterArea)
      );
    }),
  );

export const getRulesForAttribute = (
  rules: AttributeUsageRule[],
  attributeId: string,
) => sortBySort(rules.filter((rule) => rule.attributeId === attributeId));

export const makeUsageRuleId = (
  scene: AttributeUsageScene,
  attributeId: string,
  filterArea?: AttributeFilterArea,
) =>
  filterArea
    ? `usage-${scene}-${filterArea}-${attributeId}`
    : `usage-${scene}-${attributeId}`;

export const reorder = <T>(items: T[], fromIndex: number, toIndex: number) => {
  if (fromIndex < 0 || fromIndex >= items.length) {
    return [...items];
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  const nextIndex = Math.max(0, Math.min(toIndex, nextItems.length));
  nextItems.splice(nextIndex, 0, movedItem);

  return nextItems;
};
