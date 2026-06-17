import type {
  AttributeTarget,
  AttributeUsageScene,
} from '@/services/tagSystem';

export interface AttributeTargetOption {
  label: string;
  value: AttributeTarget;
}

export interface SubjectOption {
  label: string;
  value: string;
}

export type AttributeUsageType = 'form' | 'display' | 'filter';

export interface SceneMeta {
  readonly scene: AttributeUsageScene;
  readonly label: string;
  readonly description: string;
  readonly allowedTargets: readonly AttributeTarget[];
  readonly usageType: AttributeUsageType;
}

export interface UsageSceneGroup {
  readonly title: string;
  readonly scenes: readonly SceneMeta[];
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

const SCENE_META = {
  paperUpload: {
    scene: 'paperUpload',
    label: '试卷上传信息完善',
    description: '配置上传字段和必填',
    allowedTargets: ['paper'],
    usageType: 'form',
  },
  paperCardDisplay: {
    scene: 'paperCardDisplay',
    label: '试卷卡片展示',
    description: '配置试卷卡片属性',
    allowedTargets: ['paper'],
    usageType: 'display',
  },
  paperListFilter: {
    scene: 'paperListFilter',
    label: '试卷列表筛选',
    description: '配置试卷筛选属性',
    allowedTargets: ['paper'],
    usageType: 'filter',
  },
  questionTagging: {
    scene: 'questionTagging',
    label: '试题打标',
    description: '配置打标字段和必填',
    allowedTargets: ['question'],
    usageType: 'form',
  },
  questionCardDisplay: {
    scene: 'questionCardDisplay',
    label: '试题卡片展示',
    description: '配置试题卡片展示属性',
    allowedTargets: ['question'],
    usageType: 'display',
  },
  questionListFilter: {
    scene: 'questionListFilter',
    label: '试题列表筛选',
    description: '配置主筛选区/更多筛选区',
    allowedTargets: ['question', 'paper'],
    usageType: 'filter',
  },
  knowledgeTreeNodeDisplay: {
    scene: 'knowledgeTreeNodeDisplay',
    label: '知识点树节点展示',
    description: '配置知识点树节点伴随展示属性',
    allowedTargets: ['knowledge'],
    usageType: 'display',
  },
  topicTreeNodeDisplay: {
    scene: 'topicTreeNodeDisplay',
    label: '专题树节点展示',
    description: '配置专题树节点伴随展示属性',
    allowedTargets: ['topic'],
    usageType: 'display',
  },
} as const satisfies Record<AttributeUsageScene, SceneMeta>;

const USAGE_SCENE_GROUP_DEFINITIONS = [
  {
    title: '试题场景',
    scenes: [
      'questionTagging',
      'questionCardDisplay',
      'questionListFilter',
    ],
  },
  {
    title: '试卷场景',
    scenes: ['paperUpload', 'paperCardDisplay', 'paperListFilter'],
  },
  {
    title: '树节点展示',
    scenes: ['knowledgeTreeNodeDisplay', 'topicTreeNodeDisplay'],
  },
] as const satisfies ReadonlyArray<{
  title: string;
  scenes: readonly AttributeUsageScene[];
}>;

export const USAGE_SCENE_GROUPS = USAGE_SCENE_GROUP_DEFINITIONS.map(
  (group): UsageSceneGroup => ({
    title: group.title,
    scenes: group.scenes.map((scene) => SCENE_META[scene]),
  }),
);

export const USAGE_SCENE_OPTIONS = USAGE_SCENE_GROUPS.flatMap(
  (group) => group.scenes,
);

export const USAGE_SCENE_LABELS = USAGE_SCENE_OPTIONS.reduce<
  Record<AttributeUsageScene, string>
>((labels, option) => {
  labels[option.scene] = option.label;
  return labels;
}, {} as Record<AttributeUsageScene, string>);
