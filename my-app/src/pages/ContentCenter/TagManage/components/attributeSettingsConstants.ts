import type {
  AttributeTarget,
  AttributeUsageScene,
} from '@/services/tagSystem';

export type AttributeUsageType = 'form' | 'display' | 'filter';

export interface AttributeTargetOption {
  label: string;
  value: AttributeTarget;
}

export interface SubjectOption {
  label: string;
  value: string;
}

export interface UsageSceneOption {
  label: string;
  value: AttributeUsageScene;
  description: string;
  allowedTargets: AttributeTarget[];
  usageType: AttributeUsageType;
}

export interface UsageSceneGroup {
  label: string;
  options: UsageSceneOption[];
}

export const ATTRIBUTE_TARGET_OPTIONS: AttributeTargetOption[] = [
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

export const SUBJECT_OPTIONS: SubjectOption[] = [
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
  (labels, subject) => {
    labels[subject.value] = subject.label;
    return labels;
  },
  {},
);

export const USAGE_SCENE_GROUPS: UsageSceneGroup[] = [
  {
    label: '试题场景',
    options: [
      {
        label: '试题打标',
        value: 'questionTagging',
        description: '配置打标字段和必填',
        allowedTargets: ['question'],
        usageType: 'form',
      },
      {
        label: '试题卡片展示',
        value: 'questionCardDisplay',
        description: '配置试题卡片展示属性',
        allowedTargets: ['question'],
        usageType: 'display',
      },
      {
        label: '试题列表筛选',
        value: 'questionListFilter',
        description: '配置主筛选区/更多筛选区',
        allowedTargets: ['question', 'paper'],
        usageType: 'filter',
      },
    ],
  },
  {
    label: '试卷场景',
    options: [
      {
        label: '试卷上传信息完善',
        value: 'paperUpload',
        description: '配置上传字段和必填',
        allowedTargets: ['paper'],
        usageType: 'form',
      },
      {
        label: '试卷卡片展示',
        value: 'paperCardDisplay',
        description: '配置试卷卡片属性',
        allowedTargets: ['paper'],
        usageType: 'display',
      },
      {
        label: '试卷列表筛选',
        value: 'paperListFilter',
        description: '配置试卷筛选属性',
        allowedTargets: ['paper'],
        usageType: 'filter',
      },
    ],
  },
  {
    label: '树节点展示',
    options: [
      {
        label: '知识点树节点展示',
        value: 'knowledgeTreeNodeDisplay',
        description: '配置知识点树节点伴随展示属性',
        allowedTargets: ['knowledge'],
        usageType: 'display',
      },
      {
        label: '专题树节点展示',
        value: 'topicTreeNodeDisplay',
        description: '配置专题树节点伴随展示属性',
        allowedTargets: ['topic'],
        usageType: 'display',
      },
    ],
  },
];

export const USAGE_SCENE_OPTIONS = USAGE_SCENE_GROUPS.flatMap(
  (group) => group.options,
);

export const USAGE_SCENE_LABELS = USAGE_SCENE_OPTIONS.reduce<
  Record<AttributeUsageScene, string>
>((labels, scene) => {
  labels[scene.value] = scene.label;
  return labels;
}, {} as Record<AttributeUsageScene, string>);
