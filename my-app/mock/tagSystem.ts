import { Request, Response } from 'express';
import type {
  ResourceOperationAction,
  ResourceOperationChange,
  ResourceOperationRecord,
} from '../src/services/resourceAuditModel';
import { RESOURCE_HAS_REFERENCES_CODE } from '../src/services/resourceAuditModel';
import type {
  AttachmentResourceType,
  ComposedResourceType,
  ResourceCarrierType,
  ResourceStatus,
  ResourceType,
  ResourceVersionState,
} from '../src/services/resourceModel';
import {
  assertValidFormalResourceVersionAggregate,
  inferAttachmentCarrierType,
  isAttachmentFileCompatible,
  isAttachmentResourceType,
  isComposedResourceType,
  isResourceCarrierType,
  isResourceType,
  isResourceVersionCompatible,
} from '../src/services/resourceModel';
import type {
  ResourceReference,
  ResourceReferenceConsumerType,
} from '../src/services/resourceReferenceModel';
import { RESOURCE_REFERENCE_ERROR_CODES } from '../src/services/resourceReferenceModel';

import { countTeacherTeachingTaskReferences } from './teacherTeachingTaskReferenceRegistry';
import { countTeachingPlanTaskReferences } from './teachingPlanReferenceRegistry';

interface MockAttributeItem {
  id: string;
  name: string;
  color?: string;
  value?: string;
  sort?: number;
  status?: AttributeStatus;
  star?: number;
  displayName?: string;
  frontVisible?: boolean;
}

type AttributeStatus = 'enabled' | 'disabled';
type AttributeTarget = 'paper' | 'question' | 'knowledge' | 'topic';
type AttributeOptionAddMode = 'unified' | 'bySubject';
type AttributeSubjectScope = 'all' | 'specified';
type AttributeFilterArea = 'primary' | 'more';
type AttributeUsageScene =
  | 'paperUpload'
  | 'paperCardDisplay'
  | 'paperListFilter'
  | 'questionTagging'
  | 'questionCardDisplay'
  | 'questionListFilter'
  | 'knowledgeTreeNodeDisplay'
  | 'topicTreeNodeDisplay';
type AttributeSelectionMode = 'single' | 'multiple';
type NodeAttributeTargetType = 'knowledge' | 'topic';
type TreeTargetType = NodeAttributeTargetType | 'knowledgeTree' | 'review';

const ATTRIBUTE_USAGE_SCENES: AttributeUsageScene[] = [
  'paperUpload',
  'paperCardDisplay',
  'paperListFilter',
  'questionTagging',
  'questionCardDisplay',
  'questionListFilter',
  'knowledgeTreeNodeDisplay',
  'topicTreeNodeDisplay',
];

interface AttributeUsageRule {
  id: string;
  attributeId: string;
  scene: AttributeUsageScene;
  enabled: boolean;
  required?: boolean;
  filterArea?: AttributeFilterArea;
  sort: number;
}

interface MockTagCategory {
  id: string;
  name: string;
  tags: MockAttributeItem[];
  code?: string;
  description?: string;
  target: AttributeTarget;
  optionAddMode?: AttributeOptionAddMode;
  subjectScope?: AttributeSubjectScope;
  applicableSubjects?: string[];
  subjectTags?: Partial<Record<string, MockAttributeItem[]>>;
  status?: AttributeStatus;
  frontVisible?: boolean;
  sort?: number;
  selectionMode?: AttributeSelectionMode;
}

interface MockNodeAttributeRelation {
  id: string;
  targetType: NodeAttributeTargetType;
  subject: string;
  nodeId: string;
  attributeId: string;
  optionId: string;
  updatedAt?: string;
}

interface KnowledgeContext {
  subject: string;
  targetType: TreeTargetType;
}

interface QuestionTypeContext {
  subject: string;
}

type QuestionTypeAnswerAreaType = 'line' | 'blank';
type QuestionTypeAnswerCardType = 'objective' | 'subjective';

interface MockQuestionTypeAnswerArea {
  type: QuestionTypeAnswerAreaType;
  rows: number;
}

interface KnowledgeSeedNode {
  id?: string;
  title: string;
  key: string;
  value?: string;
  description?: string;
  suggestedHours?: number;
  enabled?: boolean;
  children?: KnowledgeSeedNode[];
}

interface MockKnowledgeNode {
  id?: string;
  title: string;
  key: string;
  value?: string;
  subject: string;
  description?: string;
  suggestedHours?: number;
  enabled?: boolean;
  children?: MockKnowledgeNode[];
}

interface MockResourceTreeLeafNode {
  id: string;
  name: string;
  path: string[];
  subject: string;
  suggestedHours: number;
  enabled: boolean;
}

type ResourceLifecycleAction = 'list' | 'unlist' | 'archive' | 'restore';

interface MockResourceCreator {
  id: string;
  name: string;
}

interface MockResourceVersion {
  id: string;
  resourceId: string;
  versionNumber: number;
  carrierType: ResourceCarrierType;
  originalFileName?: string;
  createdAt: string;
  createdBy: MockResourceCreator;
  state: ResourceVersionState;
  activatedAt?: string;
}

interface MockResourceItem {
  id: string;
  name: string;
  type: ResourceType;
  subject: string;
  nodeId: string;
  status: ResourceStatus;
  isVisible: boolean;
  canCreateReference: boolean;
  referenceCount: number;
  canDelete: boolean;
  hardDeleteBlockedReason: string | null;
  currentVersionId: string;
  currentVersion: MockResourceVersion;
  versions: MockResourceVersion[];
  versionCount: number;
  pendingVersionCount: number;
  updatedAt: string;
  /** 学案（组合资源）的课时数；绑定到资源树末级节点时自动同步为节点课时。 */
  classHours?: number;
}

interface MockResourceListFilters {
  name?: string;
  type?: ResourceType;
  carrierType?: ResourceCarrierType;
  status?: ResourceStatus;
  subtreeNodeIds?: Set<string>;
}

interface QuestionTypeSeedNode {
  title: string;
  key: string;
  description?: string;
  answerCardType?: QuestionTypeAnswerCardType;
  answerArea?: Partial<MockQuestionTypeAnswerArea>;
  children?: QuestionTypeSeedNode[];
}

interface MockQuestionTypeNode {
  title: string;
  key: string;
  subject: string;
  description?: string;
  answerCardType?: QuestionTypeAnswerCardType;
  answerArea?: MockQuestionTypeAnswerArea;
  children?: MockQuestionTypeNode[];
}

type QuestionTypeDropPosition = 'before' | 'after';
type TreeMovePosition = 'before' | 'after' | 'inside';

const MAX_QUESTION_TYPE_LEVEL = 2;
const MIN_QUESTION_TYPE_ANSWER_ROWS = 0;
const MAX_QUESTION_TYPE_ANSWER_ROWS = 20;
const DEFAULT_QUESTION_TYPE_ANSWER_AREA: MockQuestionTypeAnswerArea = {
  type: 'line',
  rows: 1,
};
const DEFAULT_QUESTION_TYPE_ANSWER_CARD_TYPE: QuestionTypeAnswerCardType =
  'subjective';

// Mock Data for Knowledge Points (Tree Structure)
const defaultKnowledgePointTemplates: KnowledgeSeedNode[] = [
  {
    id: 'kp-1',
    title: '数与代数',
    key: 'kp-1',
    value: 'kp-1',
    children: [
      {
        id: 'kp-1-1',
        title: '实数',
        key: 'kp-1-1',
        value: 'kp-1-1',
        children: [
          {
            id: 'kp-1-1-1',
            title: '有理数',
            key: 'kp-1-1-1',
            value: 'kp-1-1-1',
          },
          {
            id: 'kp-1-1-2',
            title: '无理数',
            key: 'kp-1-1-2',
            value: 'kp-1-1-2',
          },
          {
            id: 'kp-1-1-3',
            title: '实数的运算',
            key: 'kp-1-1-3',
            value: 'kp-1-1-3',
          },
        ],
      },
      {
        id: 'kp-1-2',
        title: '代数式',
        key: 'kp-1-2',
        value: 'kp-1-2',
        children: [
          { id: 'kp-1-2-1', title: '整式', key: 'kp-1-2-1', value: 'kp-1-2-1' },
          { id: 'kp-1-2-2', title: '分式', key: 'kp-1-2-2', value: 'kp-1-2-2' },
        ],
      },
    ],
  },
  {
    id: 'kp-2',
    title: '图形与几何',
    key: 'kp-2',
    value: 'kp-2',
    children: [
      {
        id: 'kp-2-1',
        title: '图形的性质',
        key: 'kp-2-1',
        value: 'kp-2-1',
        children: [
          {
            id: 'kp-2-1-1',
            title: '三角形',
            key: 'kp-2-1-1',
            value: 'kp-2-1-1',
          },
          {
            id: 'kp-2-1-2',
            title: '四边形',
            key: 'kp-2-1-2',
            value: 'kp-2-1-2',
          },
        ],
      },
    ],
  },
];

// Mock Data for Resource Tree（内部协议仍使用 review）
const defaultReviewTreeTemplates: KnowledgeSeedNode[] = [
  {
    id: 'rv-1',
    title: '一轮复习',
    key: 'rv-1',
    value: 'rv-1',
    children: [
      {
        id: 'rv-1-1',
        title: '中国古代史',
        key: 'rv-1-1',
        value: 'rv-1-1',
        children: [
          {
            id: 'rv-1-1-1',
            title: '史前时期',
            key: 'rv-1-1-1',
            value: 'rv-1-1-1',
          },
          {
            id: 'rv-1-1-2',
            title: '夏商周时期',
            key: 'rv-1-1-2',
            value: 'rv-1-1-2',
          },
          {
            id: 'rv-1-1-3',
            title: '春秋战国',
            key: 'rv-1-1-3',
            value: 'rv-1-1-3',
          },
        ],
      },
      {
        id: 'rv-1-2',
        title: '中国近现代史',
        key: 'rv-1-2',
        value: 'rv-1-2',
        children: [
          {
            id: 'rv-1-2-1',
            title: '近代史',
            key: 'rv-1-2-1',
            value: 'rv-1-2-1',
          },
          {
            id: 'rv-1-2-2',
            title: '现代史',
            key: 'rv-1-2-2',
            value: 'rv-1-2-2',
          },
        ],
      },
    ],
  },
  {
    id: 'rv-2',
    title: '二轮复习',
    key: 'rv-2',
    value: 'rv-2',
    children: [
      {
        id: 'rv-2-1',
        title: '专题·古代政治制度',
        key: 'rv-2-1',
        value: 'rv-2-1',
      },
      { id: 'rv-2-2', title: '专题·变法改革', key: 'rv-2-2', value: 'rv-2-2' },
    ],
  },
  {
    id: 'rv-3',
    title: '三轮冲刺',
    key: 'rv-3',
    value: 'rv-3',
    children: [
      { id: 'rv-3-1', title: '模拟演练', key: 'rv-3-1', value: 'rv-3-1' },
    ],
  },
];

const mathQuestionTypeSeed: QuestionTypeSeedNode[] = [
  {
    title: '客观题',
    key: 'objective',
    children: [
      { title: '单选题', key: 'single-choice' },
      { title: '多选题', key: 'multiple-choice' },
      { title: '判断题', key: 'true-false' },
    ],
  },
  {
    title: '主观题',
    key: 'subjective',
    children: [
      { title: '填空题', key: 'fill-blank' },
      { title: '解答题', key: 'answer' },
      { title: '计算题', key: 'calculation' },
      { title: '证明题', key: 'proof' },
      { title: '应用题', key: 'application' },
    ],
  },
];

const chineseQuestionTypeSeed: QuestionTypeSeedNode[] = [
  {
    title: '基础运用',
    key: 'basic',
    children: [
      { title: '选择题', key: 'choice' },
      { title: '默写题', key: 'dictation' },
      { title: '语言表达', key: 'expression' },
    ],
  },
  {
    title: '阅读写作',
    key: 'reading-writing',
    children: [
      { title: '现代文阅读', key: 'modern-reading' },
      { title: '文言文阅读', key: 'classical-reading' },
      { title: '作文', key: 'writing' },
    ],
  },
];

const englishQuestionTypeSeed: QuestionTypeSeedNode[] = [
  {
    title: '语言知识',
    key: 'language',
    children: [
      { title: '单项选择', key: 'single-choice' },
      { title: '完形填空', key: 'cloze' },
    ],
  },
  {
    title: '综合应用',
    key: 'application',
    children: [
      { title: '阅读理解', key: 'reading' },
      { title: '任务型阅读', key: 'task-reading' },
      { title: '书面表达', key: 'writing' },
    ],
  },
];

const scienceQuestionTypeSeed: QuestionTypeSeedNode[] = [
  {
    title: '基础题',
    key: 'basic',
    children: [
      { title: '选择题', key: 'choice' },
      { title: '填空题', key: 'fill-blank' },
    ],
  },
  {
    title: '综合题',
    key: 'comprehensive',
    children: [
      { title: '实验探究题', key: 'experiment' },
      { title: '计算题', key: 'calculation' },
      { title: '分析说明题', key: 'analysis' },
    ],
  },
];

const socialScienceQuestionTypeSeed: QuestionTypeSeedNode[] = [
  {
    title: '客观题',
    key: 'objective',
    children: [
      { title: '单选题', key: 'single-choice' },
      { title: '材料判断题', key: 'material-judge' },
    ],
  },
  {
    title: '主观题',
    key: 'subjective',
    children: [
      { title: '材料分析题', key: 'material-analysis' },
      { title: '综合探究题', key: 'inquiry' },
    ],
  },
];

const getQuestionTypeSeed = (subject: string) => {
  if (subject === 'chinese') return chineseQuestionTypeSeed;
  if (subject === 'english') return englishQuestionTypeSeed;
  if (['physics', 'chemistry', 'biology'].includes(subject)) {
    return scienceQuestionTypeSeed;
  }
  if (['history', 'geography', 'politics'].includes(subject)) {
    return socialScienceQuestionTypeSeed;
  }
  return mathQuestionTypeSeed;
};

const createSeedOptions = (
  prefix: string,
  options: Array<{
    name: string;
    value?: string;
    color?: string;
    star?: number;
  }>,
): MockAttributeItem[] =>
  options.map((option, index) => ({
    id: `${prefix}-${index + 1}`,
    name: option.name,
    value: option.value || `${prefix}-${index + 1}`,
    color: option.color || 'default',
    star: option.star,
    sort: index,
    status: 'enabled',
    displayName: option.name,
    frontVisible: true,
  }));

// Mock Data for Attribute Categories
const defaultTagCategoryTemplates: MockTagCategory[] = [
  {
    id: 'cat-paper-year',
    name: '年份',
    code: 'year',
    description: '用于描述试卷所属年份',
    target: 'paper',
    status: 'enabled',
    sort: 0,
    selectionMode: 'single',
    tags: createSeedOptions('paper-year', [
      { name: '2026', value: '2026' },
      { name: '2025', value: '2025' },
      { name: '2024', value: '2024' },
      { name: '2023', value: '2023' },
    ]),
  },
  {
    id: 'cat-paper-region',
    name: '地区',
    code: 'region',
    description: '用于描述试卷适用地区',
    target: 'paper',
    status: 'enabled',
    sort: 1,
    selectionMode: 'single',
    tags: createSeedOptions('paper-region', [
      { name: '北京', value: 'beijing' },
      { name: '上海', value: 'shanghai' },
      { name: '江苏', value: 'jiangsu' },
      { name: '浙江', value: 'zhejiang' },
    ]),
  },
  {
    id: 'cat-paper-type',
    name: '试卷类型',
    code: 'paper_type',
    description: '用于描述试卷业务类型',
    target: 'paper',
    status: 'enabled',
    sort: 2,
    selectionMode: 'single',
    tags: createSeedOptions('paper-type', [
      { name: '中考真题', value: 'entrance_exam' },
      { name: '模拟试卷', value: 'mock_exam' },
      { name: '期中试卷', value: 'midterm_exam' },
      { name: '期末试卷', value: 'final_exam' },
    ]),
  },
  {
    id: 'cat-question-difficulty',
    name: '难度',
    code: 'difficulty',
    description: '用于描述试题解答难易程度',
    target: 'question',
    status: 'enabled',
    sort: 0,
    selectionMode: 'single',
    tags: createSeedOptions('question-difficulty', [
      { name: '容易', value: 'easy', color: 'green', star: 1 },
      { name: '较易', value: 'relatively_easy', color: 'cyan', star: 2 },
      { name: '中等', value: 'medium', color: 'blue', star: 3 },
      { name: '较难', value: 'relatively_hard', color: 'orange', star: 4 },
      { name: '困难', value: 'hard', color: 'red', star: 5 },
    ]),
  },
  {
    id: 'cat-question-ability',
    name: '能力',
    code: 'ability',
    description: '用于标记试题主要考查的学科能力',
    target: 'question',
    optionAddMode: 'bySubject',
    subjectScope: 'specified',
    applicableSubjects: ['math', 'chinese'],
    status: 'enabled',
    sort: 1,
    selectionMode: 'multiple',
    tags: [],
    subjectTags: {
      math: createSeedOptions('ability-math', [
        { name: '运算能力', value: 'operation' },
        { name: '逻辑推理', value: 'logical_reasoning' },
        { name: '空间观念', value: 'spatial_concept' },
        { name: '数据分析', value: 'data_analysis' },
      ]),
      chinese: createSeedOptions('ability-chinese', [
        { name: '语言建构', value: 'language_construction' },
        { name: '阅读理解', value: 'reading_comprehension' },
        { name: '表达交流', value: 'expression' },
      ]),
    },
  },
  {
    id: 'cat-question-core-literacy',
    name: '核心素养',
    code: 'core_literacy',
    description: '用于标记试题对应的学科核心素养',
    target: 'question',
    optionAddMode: 'bySubject',
    subjectScope: 'specified',
    applicableSubjects: ['math', 'chinese'],
    status: 'enabled',
    sort: 2,
    selectionMode: 'multiple',
    tags: [],
    subjectTags: {
      math: createSeedOptions('literacy-math', [
        { name: '数学抽象', value: 'mathematical_abstraction' },
        { name: '数学建模', value: 'mathematical_modeling' },
        { name: '直观想象', value: 'intuitive_imagination' },
      ]),
      chinese: createSeedOptions('literacy-chinese', [
        { name: '文化自信', value: 'cultural_confidence' },
        { name: '语言运用', value: 'language_use' },
        { name: '思维能力', value: 'thinking_ability' },
      ]),
    },
  },
  {
    id: 'cat-question-subject-feature',
    name: '学科特色',
    code: 'subject_feature',
    description: '用于标记不同学科的特色标签',
    target: 'question',
    optionAddMode: 'bySubject',
    subjectScope: 'specified',
    applicableSubjects: ['math', 'chinese'],
    status: 'enabled',
    sort: 3,
    selectionMode: 'multiple',
    tags: [],
    subjectTags: {
      math: createSeedOptions('feature-math', [
        { name: '函数思想', value: 'function_thinking' },
        { name: '方程思想', value: 'equation_thinking' },
        { name: '分类讨论', value: 'case_analysis' },
      ]),
      chinese: createSeedOptions('feature-chinese', [
        { name: '文言实词', value: 'classical_words' },
        { name: '修辞手法', value: 'rhetoric' },
        { name: '立意表达', value: 'theme_expression' },
      ]),
    },
  },
  {
    id: 'cat-question-source-type',
    name: '题源类型',
    code: 'source_type',
    description: '用于描述试题来源类型',
    target: 'question',
    status: 'enabled',
    sort: 4,
    selectionMode: 'single',
    tags: createSeedOptions('source-type', [
      { name: '中考真题', value: 'entrance_exam' },
      { name: '一模/二模', value: 'mock_exam' },
      { name: '期中/期末', value: 'term_exam' },
      { name: '名校试题', value: 'school_exam' },
    ]),
  },
  {
    id: 'cat-knowledge-target',
    name: '目标分类',
    code: 'target_category',
    description: '用于描述知识点目标层级',
    target: 'knowledge',
    status: 'enabled',
    sort: 0,
    selectionMode: 'single',
    tags: createSeedOptions('knowledge-target', [
      { name: '必会', value: 'must_know' },
      { name: '选学', value: 'optional' },
      { name: '拓展', value: 'extension' },
    ]),
  },
  {
    id: 'cat-knowledge-emphasis',
    name: '重难点',
    code: 'emphasis',
    description: '用于标记知识点的教学重难点属性',
    target: 'knowledge',
    status: 'enabled',
    sort: 1,
    selectionMode: 'multiple',
    tags: createSeedOptions('knowledge-emphasis', [
      { name: '重点', value: 'key_point' },
      { name: '难点', value: 'hard_point' },
      { name: '易错点', value: 'error_prone' },
    ]),
  },
  {
    id: 'cat-knowledge-first-test',
    name: '首次考查',
    code: 'first_test',
    description: '用于标记知识点是否首次进入考查范围',
    target: 'knowledge',
    status: 'enabled',
    sort: 2,
    selectionMode: 'single',
    tags: createSeedOptions('knowledge-first-test', [
      { name: '是', value: 'yes' },
      { name: '否', value: 'no' },
    ]),
  },
  {
    id: 'cat-topic-frequency',
    name: '考频',
    code: 'exam_frequency',
    description: '用于标记专题的考查频率',
    target: 'topic',
    status: 'enabled',
    sort: 0,
    selectionMode: 'single',
    tags: createSeedOptions('topic-frequency', [
      { name: '高频', value: 'high' },
      { name: '中频', value: 'medium' },
      { name: '低频', value: 'low' },
    ]),
  },
];

const DEFAULT_KNOWLEDGE_CONTEXT: KnowledgeContext = {
  subject: 'math',
  targetType: 'knowledge',
};

const DEFAULT_SUBJECT = 'math';

const normalizeQueryValue = (value: unknown, fallback: string) => {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0], fallback);
  }
  return typeof value === 'string' && value ? value : fallback;
};

const normalizeNodeAttributeTargetType = (value: unknown): TreeTargetType =>
  value === 'topic' ||
  value === 'knowledge' ||
  value === 'knowledgeTree' ||
  value === 'review'
    ? value
    : 'knowledge';

const getKnowledgeContext = (req: Request): KnowledgeContext => ({
  subject: normalizeQueryValue(
    req.body?.subject ?? req.query.subject,
    DEFAULT_KNOWLEDGE_CONTEXT.subject,
  ),
  targetType: normalizeNodeAttributeTargetType(
    req.body?.targetType ?? req.query.targetType,
  ),
});

const getQuestionTypeContext = (req: Request): QuestionTypeContext => ({
  subject: normalizeQueryValue(
    req.body?.subject ?? req.query.subject,
    DEFAULT_SUBJECT,
  ),
});

const getKnowledgeContextKey = ({ subject, targetType }: KnowledgeContext) =>
  targetType === 'knowledgeTree' ? `knowledge-tree-${subject}` : subject;

const getKnowledgeStoreKey = ({ subject, targetType }: KnowledgeContext) =>
  `${targetType}-${subject}`;

const getQuestionTypeContextKey = ({ subject }: QuestionTypeContext) => subject;

const normalizeQuestionTypeAnswerRows = (rows: unknown) => {
  const parsedRows = Number(rows);
  if (!Number.isFinite(parsedRows))
    return DEFAULT_QUESTION_TYPE_ANSWER_AREA.rows;
  return Math.min(
    Math.max(Math.trunc(parsedRows), MIN_QUESTION_TYPE_ANSWER_ROWS),
    MAX_QUESTION_TYPE_ANSWER_ROWS,
  );
};

const normalizeQuestionTypeAnswerArea = (
  answerArea?: Partial<MockQuestionTypeAnswerArea>,
): MockQuestionTypeAnswerArea => ({
  type: answerArea?.type === 'blank' ? 'blank' : 'line',
  rows: normalizeQuestionTypeAnswerRows(answerArea?.rows),
});

const inferQuestionTypeAnswerCardType = (
  title?: string,
  key?: string,
): QuestionTypeAnswerCardType | undefined => {
  const normalizedText = `${title || ''} ${key || ''}`.toLowerCase();
  if (
    [
      '客观',
      '选择',
      '单选',
      '多选',
      '判断',
      '单项',
      '完形',
      'objective',
      'choice',
      'true-false',
    ].some((keyword) => normalizedText.includes(keyword))
  ) {
    return 'objective';
  }
  if (
    [
      '主观',
      '填空',
      '默写',
      '表达',
      '写作',
      '作文',
      '解答',
      '计算',
      '证明',
      '应用',
      '分析',
      '探究',
      'subjective',
      'blank',
      'writing',
      'answer',
      'calculation',
      'proof',
      'application',
      'analysis',
      'experiment',
      'inquiry',
    ].some((keyword) => normalizedText.includes(keyword))
  ) {
    return 'subjective';
  }
  return undefined;
};

const normalizeQuestionTypeAnswerCardType = (
  answerCardType?: QuestionTypeAnswerCardType,
  title?: string,
  key?: string,
  fallback?: QuestionTypeAnswerCardType,
): QuestionTypeAnswerCardType => {
  if (answerCardType === 'objective' || answerCardType === 'subjective') {
    return answerCardType;
  }
  return (
    inferQuestionTypeAnswerCardType(title, key) ||
    fallback ||
    DEFAULT_QUESTION_TYPE_ANSWER_CARD_TYPE
  );
};

const shouldQuestionTypeNeedAnswerArea = (
  parentAnswerCardType?: QuestionTypeAnswerCardType,
) => parentAnswerCardType !== 'objective';

const normalizeQuestionTypeTreeSettings = (
  nodes: MockQuestionTypeNode[],
  level = 1,
  parentAnswerCardType?: QuestionTypeAnswerCardType,
) => {
  nodes.forEach((node) => {
    if (level === 1) {
      node.answerCardType = normalizeQuestionTypeAnswerCardType(
        node.answerCardType,
        node.title,
        node.key,
      );
      delete node.answerArea;
    } else {
      delete node.answerCardType;
      if (shouldQuestionTypeNeedAnswerArea(parentAnswerCardType)) {
        node.answerArea = normalizeQuestionTypeAnswerArea(node.answerArea);
      } else {
        delete node.answerArea;
      }
    }
    if (node.children?.length) {
      normalizeQuestionTypeTreeSettings(
        node.children,
        level + 1,
        node.answerCardType,
      );
    }
  });
  return nodes;
};

const applyKnowledgeScope = (
  nodes: KnowledgeSeedNode[],
  context: KnowledgeContext,
): MockKnowledgeNode[] => {
  const contextKey = getKnowledgeContextKey(context);
  return nodes.map((node) => ({
    id: node.id ? `${node.id}-${contextKey}` : undefined,
    title: node.title,
    key: `${node.key}-${contextKey}`,
    value: node.value ? `${node.value}-${contextKey}` : undefined,
    subject: context.subject,
    description: node.description,
    ...(context.targetType === 'review' && !node.children?.length
      ? {
          suggestedHours: node.suggestedHours ?? 1,
          enabled: node.enabled ?? true,
        }
      : {}),
    children: node.children
      ? applyKnowledgeScope(node.children, context)
      : undefined,
  }));
};

const knowledgeTreeStore: Record<string, MockKnowledgeNode[]> = {};
let knowledgeNodeSequence = 0;
const EMPTY_REVIEW_TREE_SUBJECTS = new Set(['biology']);
const EMPTY_KNOWLEDGE_TREE_SUBJECTS = new Set(['biology']);

/**
 * 已由知识块新建/编辑功能形成的存量关联，仅供树结构守卫验收。
 * 关联独立按稳定节点 ID 保存，节点改名、排序和移动均不会改变该映射。
 */
const knowledgeBlockRelationCountBySubject: Record<
  string,
  Record<string, number>
> = {
  math: {
    'kp-1-1-1-knowledge-tree-math': 3,
    'kp-2-1-1-knowledge-tree-math': 1,
  },
};

const getKnowledgeBlockRelationCount = (
  context: KnowledgeContext,
  nodeId: string,
) =>
  context.targetType === 'knowledgeTree'
    ? knowledgeBlockRelationCountBySubject[context.subject]?.[nodeId] || 0
    : 0;

const ensureReviewLeafScheduling = (nodes: MockKnowledgeNode[]) => {
  nodes.forEach((node) => {
    if (node.children?.length) {
      ensureReviewLeafScheduling(node.children);
      return;
    }
    node.suggestedHours ??= 1;
    node.enabled ??= true;
  });
};

const getKnowledgeTreeByContext = (context: KnowledgeContext) => {
  const storeKey = getKnowledgeStoreKey(context);
  if (!knowledgeTreeStore[storeKey]) {
    const templates =
      context.targetType === 'review'
        ? EMPTY_REVIEW_TREE_SUBJECTS.has(context.subject)
          ? []
          : defaultReviewTreeTemplates
        : context.targetType === 'knowledgeTree' &&
          EMPTY_KNOWLEDGE_TREE_SUBJECTS.has(context.subject)
        ? []
        : defaultKnowledgePointTemplates;
    knowledgeTreeStore[storeKey] = applyKnowledgeScope(templates, context);
  }
  if (context.targetType === 'review') {
    // 节点移动后，原父节点可能首次成为末级节点，需要补齐可排期默认值。
    ensureReviewLeafScheduling(knowledgeTreeStore[storeKey]);
    // 资源树课时由绑定的学案自动带过来：初始化资产库并同步到节点。
    getResourcesByContext(context);
  }
  return knowledgeTreeStore[storeKey];
};

const collectResourceTreeLeafNodes = (
  nodes: MockKnowledgeNode[],
  parentPath: string[] = [],
): MockResourceTreeLeafNode[] =>
  nodes.flatMap((node) => {
    const path = [...parentPath, node.title];
    if (node.children?.length) {
      return collectResourceTreeLeafNodes(node.children, path);
    }
    return [
      {
        id: node.key,
        name: node.title,
        path,
        subject: node.subject,
        suggestedHours: node.suggestedHours ?? 1,
        enabled: node.enabled ?? true,
      },
    ];
  });

/** 供同一 Mock 进程内的教学计划服务读取资源树当前状态。 */
export const getResourceTreeLeafNodesSnapshot = (
  subject: string,
): MockResourceTreeLeafNode[] =>
  structuredClone(
    collectResourceTreeLeafNodes(
      getKnowledgeTreeByContext({ subject, targetType: 'review' }),
    ),
  );

// --- Mock Data for Assets (资产中心正式资源) ---

const RESOURCE_NAME_MAX_LENGTH = 40;
const RESOURCE_NAME_CONFLICT_CODE = 'RESOURCE_NAME_CONFLICT';
const CURRENT_MOCK_RESOURCE_CREATOR: MockResourceCreator = {
  id: 'operator-current',
  name: '当前运营员',
};
const SEED_MOCK_RESOURCE_CREATOR: MockResourceCreator = {
  id: 'operator-lin',
  name: '林老师',
};
const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  unlisted: '未上架',
  listed: '已上架',
  archived: '已归档',
};
const RESOURCE_LIFECYCLE_ACTION_LABELS: Record<
  ResourceLifecycleAction,
  string
> = {
  list: '上架',
  unlist: '下架',
  archive: '归档',
  restore: '恢复',
};
const RESOURCE_LIFECYCLE_TRANSITIONS: Record<
  ResourceStatus,
  Partial<Record<ResourceLifecycleAction, ResourceStatus>>
> = {
  unlisted: { list: 'listed', archive: 'archived' },
  listed: { unlist: 'unlisted', archive: 'archived' },
  archived: { restore: 'unlisted' },
};
const resourceStore: Record<string, MockResourceItem[]> = {};
const resourceReferenceStore: Record<string, ResourceReference[]> = {};
const resourceOperationStore: Record<string, ResourceOperationRecord[]> = {};
let resourceSequence = 0;
let resourceReferenceSequence = 0;
let resourceOperationSequence = 0;

const freezeResourceReference = (
  reference: ResourceReference,
): ResourceReference =>
  Object.freeze({
    ...reference,
    consumer: Object.freeze({ ...reference.consumer }),
    createdBy: Object.freeze({ ...reference.createdBy }),
  });

const cloneResourceReference = (
  reference: ResourceReference,
): ResourceReference => ({
  ...reference,
  consumer: { ...reference.consumer },
  createdBy: { ...reference.createdBy },
});

const seedResourceReferencesForSubject = (
  subject: string,
): ResourceReference[] => {
  const createSeedReference = (
    id: string,
    resourceNumber: number,
    versionNumber: number,
    consumerType: ResourceReferenceConsumerType,
    consumerId: string,
    consumerName: string,
    createdAt: string,
  ) =>
    freezeResourceReference({
      id: `ref-${subject}-${id}`,
      subject,
      resourceId: `res-${subject}-${resourceNumber}`,
      versionId: `res-${subject}-${resourceNumber}-v${versionNumber}`,
      consumer: {
        type: consumerType,
        id: `${consumerId}-${subject}`,
        name: consumerName,
      },
      createdAt,
      createdBy: { ...SEED_MOCK_RESOURCE_CREATOR },
    });

  return [
    createSeedReference(
      'plan-unit-1',
      1,
      1,
      'teachingPlan',
      'plan-unit-1',
      '七年级上册单元教学计划',
      '2026-07-28T01:20:00.000Z',
    ),
    createSeedReference(
      'task-lesson-1',
      1,
      1,
      'teachingTask',
      'task-lesson-1',
      '第 1 课课前教学任务',
      '2026-07-28T02:10:00.000Z',
    ),
    createSeedReference(
      'task-lesson-2',
      1,
      1,
      'teachingTask',
      'task-lesson-2',
      '第 2 课课堂教学任务',
      '2026-07-29T03:40:00.000Z',
    ),
    createSeedReference(
      'plan-archived',
      4,
      1,
      'teachingPlan',
      'plan-archive-retained',
      '古代政治制度专题教学计划',
      '2026-07-29T05:00:00.000Z',
    ),
    createSeedReference(
      'plan-sprint',
      5,
      1,
      'teachingPlan',
      'plan-sprint',
      '三轮冲刺教学计划',
      '2026-07-29T06:00:00.000Z',
    ),
    createSeedReference(
      'task-sprint',
      5,
      2,
      'teachingTask',
      'task-sprint',
      '三轮冲刺课堂任务',
      '2026-08-01T12:30:00.000Z',
    ),
  ];
};

const getResourceReferencesBySubject = (subject: string) => {
  if (!resourceReferenceStore[subject]) {
    resourceReferenceStore[subject] = seedResourceReferencesForSubject(subject);
  }
  return resourceReferenceStore[subject];
};

const getResourceReferenceCount = (subject: string, resourceId: string) =>
  getResourceReferencesBySubject(subject).filter(
    (reference) => reference.resourceId === resourceId,
  ).length;

const assertResourceReferenceIntegrity = (
  subject: string,
  resources: MockResourceItem[],
) => {
  getResourceReferencesBySubject(subject).forEach((reference) => {
    const resource = resources.find(
      (candidate) => candidate.id === reference.resourceId,
    );
    const version = resource?.versions.find(
      (candidate) => candidate.id === reference.versionId,
    );
    if (
      reference.subject !== subject ||
      !resource ||
      !version ||
      !version.activatedAt ||
      version.resourceId !== reference.resourceId
    ) {
      throw new Error(`Invalid fixed resource reference ${reference.id}`);
    }
  });
};

const getHardDeleteBlockedReason = (referenceCount: number) =>
  referenceCount > 0
    ? `该资源已有 ${referenceCount} 个业务引用，引用固定到具体版本；不能彻底删除，请改为归档`
    : null;

const freezeResourceOperationRecord = (
  record: ResourceOperationRecord,
): ResourceOperationRecord =>
  Object.freeze({
    ...record,
    operator: Object.freeze({ ...record.operator }),
    changes: Object.freeze(
      record.changes.map((change) => Object.freeze({ ...change })),
    ),
  });

const cloneResourceOperationRecord = (
  record: ResourceOperationRecord,
): ResourceOperationRecord => ({
  ...record,
  operator: { ...record.operator },
  changes: record.changes.map((change) => ({ ...change })),
});

const appendResourceOperation = (data: {
  resourceId: string;
  subject: string;
  action: ResourceOperationAction;
  summary: string;
  changes?: ResourceOperationChange[];
  operator?: MockResourceCreator;
  occurredAt?: string;
}) => {
  resourceOperationSequence += 1;
  const record = freezeResourceOperationRecord({
    id: `${data.resourceId}-op-${String(resourceOperationSequence).padStart(
      6,
      '0',
    )}`,
    resourceId: data.resourceId,
    subject: data.subject,
    action: data.action,
    operator: { ...(data.operator || CURRENT_MOCK_RESOURCE_CREATOR) },
    occurredAt: data.occurredAt || new Date().toISOString(),
    summary: data.summary,
    changes: data.changes || [],
  });
  const records = (resourceOperationStore[data.subject] ||= []);
  records.push(record);
  return record;
};

const getResourceOperationRecords = (subject: string, resourceId: string) =>
  (resourceOperationStore[subject] || [])
    .filter((record) => record.resourceId === resourceId)
    .slice()
    .sort(
      (left, right) =>
        right.occurredAt.localeCompare(left.occurredAt) ||
        right.id.localeCompare(left.id),
    )
    .map(cloneResourceOperationRecord);

const seedResourceOperations = (
  subject: string,
  resources: MockResourceItem[],
) => {
  if (resourceOperationStore[subject]) return;
  resourceOperationStore[subject] = [];

  resources.forEach((resource) => {
    const initialVersion = resource.versions.find(
      (version) => version.versionNumber === 1,
    )!;
    const isAttachment = isAttachmentResourceType(resource.type);
    appendResourceOperation({
      resourceId: resource.id,
      subject,
      action: isAttachment ? 'upload' : 'publish',
      operator: initialVersion.createdBy,
      occurredAt: initialVersion.createdAt,
      summary: isAttachment
        ? `上传“${resource.name}”并生成当前版本 V1`
        : `发布“${resource.name}”并生成当前版本 V1`,
      changes: [
        { label: '当前版本', after: 'V1' },
        {
          label: '初始归属',
          after: getReviewNodePathSnapshot(
            { subject, targetType: 'review' },
            resource.nodeId,
          ),
        },
        { label: '资源状态', after: '未上架' },
      ],
    });

    resource.versions
      .filter((version) => version.versionNumber > 1)
      .sort((left, right) => left.versionNumber - right.versionNumber)
      .forEach((version) => {
        appendResourceOperation({
          resourceId: resource.id,
          subject,
          action: isAttachment ? 'uploadVersion' : 'publishVersion',
          operator: version.createdBy,
          occurredAt: version.createdAt,
          summary: isAttachment
            ? `上传新文件并生成待生效版本 V${version.versionNumber}`
            : `发布修订并生成版本 V${version.versionNumber}`,
          changes: [{ label: '新增版本', after: `V${version.versionNumber}` }],
        });
        if (version.activatedAt) {
          appendResourceOperation({
            resourceId: resource.id,
            subject,
            action: 'activateVersion',
            operator: version.createdBy,
            occurredAt: version.activatedAt,
            summary: `V${version.versionNumber} 设为当前生效版本`,
            changes: [
              {
                label: '当前版本',
                before: `V${Math.max(1, version.versionNumber - 1)}`,
                after: `V${version.versionNumber}`,
              },
            ],
          });
        }
      });

    if (resource.status === 'listed') {
      appendResourceOperation({
        resourceId: resource.id,
        subject,
        action: 'list',
        occurredAt: '2026-07-27T08:00:00.000Z',
        summary: '资源上架，平台资源库开始使用当前生效版本',
        changes: [{ label: '资源状态', before: '未上架', after: '已上架' }],
      });
    } else if (resource.status === 'archived') {
      const initialArchiveAt = '2026-07-30T08:00:00.000Z';
      appendResourceOperation({
        resourceId: resource.id,
        subject,
        action: 'archive',
        occurredAt: initialArchiveAt,
        summary: '资源归档，停止平台展示和新增业务引用',
        changes: [{ label: '资源状态', before: '未上架', after: '已归档' }],
      });

      const versionsUploadedAfterArchive = resource.versions
        .filter(
          (version) =>
            version.versionNumber > 1 && version.createdAt > initialArchiveAt,
        )
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      if (versionsUploadedAfterArchive.length) {
        const firstUploadedVersion = versionsUploadedAfterArchive[0]!;
        const latestUploadedVersion = versionsUploadedAfterArchive.at(-1)!;
        appendResourceOperation({
          resourceId: resource.id,
          subject,
          action: 'restore',
          operator: firstUploadedVersion.createdBy,
          occurredAt: new Date(
            Date.parse(firstUploadedVersion.createdAt) + 1,
          ).toISOString(),
          summary: `上传 V${firstUploadedVersion.versionNumber} 时自动恢复为未上架`,
          changes: [{ label: '资源状态', before: '已归档', after: '未上架' }],
        });
        appendResourceOperation({
          resourceId: resource.id,
          subject,
          action: 'archive',
          occurredAt: new Date(
            Date.parse(latestUploadedVersion.createdAt) + 60 * 60 * 1000,
          ).toISOString(),
          summary: '资源再次归档，停止平台展示和新增业务引用',
          changes: [{ label: '资源状态', before: '未上架', after: '已归档' }],
        });
      }
    }
  });
};

const isResourceStatus = (value: unknown): value is ResourceStatus =>
  value === 'unlisted' || value === 'listed' || value === 'archived';

const isResourceLifecycleAction = (
  value: unknown,
): value is ResourceLifecycleAction =>
  value === 'list' ||
  value === 'unlist' ||
  value === 'archive' ||
  value === 'restore';

const synchronizeResourceSemantics = (
  resource: MockResourceItem,
): MockResourceItem => {
  const currentVersion = resource.versions.find(
    (version) => version.id === resource.currentVersionId,
  );
  if (!currentVersion) {
    throw new Error(`Resource ${resource.id} has no current version`);
  }

  resource.versions.forEach((version) => {
    version.state =
      version.id === resource.currentVersionId
        ? 'current'
        : version.activatedAt
        ? 'historical'
        : 'pending';
  });
  resource.currentVersion = currentVersion;
  resource.versionCount = resource.versions.length;
  resource.pendingVersionCount = resource.versions.filter(
    (version) => version.state === 'pending',
  ).length;

  const isListed = resource.status === 'listed';
  const referenceCount = getResourceReferenceCount(
    resource.subject,
    resource.id,
  );
  resource.isVisible = isListed;
  resource.canCreateReference = isListed;
  resource.referenceCount = referenceCount;
  resource.canDelete = referenceCount === 0;
  resource.hardDeleteBlockedReason = getHardDeleteBlockedReason(referenceCount);
  assertValidFormalResourceVersionAggregate(resource);
  return resource;
};

const cloneResourceVersion = (
  version: MockResourceVersion,
): MockResourceVersion => ({
  ...version,
  createdBy: { ...version.createdBy },
});

const toResourceSummary = (resource: MockResourceItem) => {
  const item = synchronizeResourceSemantics(resource);
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    subject: item.subject,
    nodeId: item.nodeId,
    status: item.status,
    isVisible: item.isVisible,
    canCreateReference: item.canCreateReference,
    referenceCount: item.referenceCount,
    canDelete: item.canDelete,
    hardDeleteBlockedReason: item.hardDeleteBlockedReason,
    currentVersionId: item.currentVersionId,
    currentVersion: cloneResourceVersion(item.currentVersion),
    versionCount: item.versionCount,
    pendingVersionCount: item.pendingVersionCount,
    updatedAt: item.updatedAt,
  };
};

const toResourceDetail = (resource: MockResourceItem) => {
  const summary = toResourceSummary(resource);
  return {
    ...summary,
    versions: [...resource.versions]
      .sort((left, right) => right.versionNumber - left.versionNumber)
      .map(cloneResourceVersion),
    operationRecords: getResourceOperationRecords(
      resource.subject,
      resource.id,
    ),
  };
};

const toReferenceResourceIdentity = (resource: MockResourceItem) => {
  const item = synchronizeResourceSemantics(resource);
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    subject: item.subject,
    nodeId: item.nodeId,
    status: item.status,
    currentVersionId: item.currentVersionId,
  };
};

interface SeedResourceBase {
  id: string;
  name: string;
  subject: string;
  nodeId: string;
  status?: ResourceStatus;
  /** 学案（组合资源）课时数；绑定资源树节点时自动同步为节点课时。 */
  classHours?: number;
}

const createSeedResourceAggregate = (
  data: SeedResourceBase & { type: ResourceType },
  currentVersion: MockResourceVersion,
): MockResourceItem =>
  synchronizeResourceSemantics({
    id: data.id,
    name: data.name,
    type: data.type,
    subject: data.subject,
    nodeId: data.nodeId,
    status: data.status || 'unlisted',
    isVisible: false,
    canCreateReference: false,
    referenceCount: 0,
    canDelete: false,
    hardDeleteBlockedReason: null,
    currentVersionId: currentVersion.id,
    currentVersion,
    versions: [currentVersion],
    versionCount: 1,
    pendingVersionCount: 0,
    updatedAt: currentVersion.createdAt,
    classHours: data.classHours,
  });

const createAttachmentSeedResource = (
  data: SeedResourceBase & {
    type: AttachmentResourceType;
    originalFileName: string;
  },
): MockResourceItem => {
  const originalFileName = data.originalFileName.trim();
  const carrierType = inferAttachmentCarrierType(originalFileName);
  if (
    !carrierType ||
    !isAttachmentFileCompatible(data.type, originalFileName)
  ) {
    throw new Error(`Invalid attachment seed ${data.id}`);
  }

  const createdAt = '2026-07-26T08:00:00.000Z';
  return createSeedResourceAggregate(data, {
    id: `${data.id}-v1`,
    resourceId: data.id,
    versionNumber: 1,
    carrierType,
    originalFileName,
    createdAt,
    createdBy: { ...SEED_MOCK_RESOURCE_CREATOR },
    state: 'current',
    activatedAt: createdAt,
  });
};

const createComposedSeedResource = (
  data: SeedResourceBase & { type: ComposedResourceType },
): MockResourceItem => {
  const createdAt = '2026-07-26T08:00:00.000Z';
  return createSeedResourceAggregate(data, {
    id: `${data.id}-v1`,
    resourceId: data.id,
    versionNumber: 1,
    carrierType: 'online',
    createdAt,
    createdBy: { ...SEED_MOCK_RESOURCE_CREATOR },
    state: 'current',
    activatedAt: createdAt,
  });
};

const appendAttachmentSeedVersion = (
  resource: MockResourceItem,
  versionNumber: number,
  originalFileName: string,
  createdAt: string,
) => {
  if (
    !isAttachmentResourceType(resource.type) ||
    !isAttachmentFileCompatible(resource.type, originalFileName)
  ) {
    throw new Error(`Invalid attachment version seed ${resource.id}`);
  }
  const carrierType = inferAttachmentCarrierType(originalFileName);
  if (!carrierType) throw new Error(`Unknown seed carrier ${resource.id}`);

  resource.versions.push({
    id: `${resource.id}-v${versionNumber}`,
    resourceId: resource.id,
    versionNumber,
    carrierType,
    originalFileName,
    createdAt,
    createdBy: { ...CURRENT_MOCK_RESOURCE_CREATOR },
    state: 'pending',
  });
  resource.updatedAt = createdAt;
  synchronizeResourceSemantics(resource);
};

const appendComposedSeedVersion = (
  resource: MockResourceItem,
  versionNumber: number,
  createdAt: string,
  activatedAt?: string,
) => {
  if (!isComposedResourceType(resource.type)) {
    throw new Error(`Invalid online version seed ${resource.id}`);
  }
  resource.versions.push({
    id: `${resource.id}-v${versionNumber}`,
    resourceId: resource.id,
    versionNumber,
    carrierType: 'online',
    createdAt,
    createdBy: { ...CURRENT_MOCK_RESOURCE_CREATOR },
    state: activatedAt ? 'historical' : 'pending',
    activatedAt,
  });
  resource.updatedAt = activatedAt || createdAt;
  synchronizeResourceSemantics(resource);
};

const seedResourcesForSubject = (subject: string): MockResourceItem[] => {
  const scoped = (nodeKey: string) => `${nodeKey}-${subject}`;
  const resources = [
    createAttachmentSeedResource({
      id: `res-${subject}-1`,
      name: '史前时期精品复习课件',
      type: 'courseware',
      originalFileName: '史前时期复习课件.pptx',
      subject,
      nodeId: scoped('rv-1-1-1'),
      status: 'listed',
    }),
    createAttachmentSeedResource({
      id: `res-${subject}-2`,
      name: '夏商周青铜文明拓展素材',
      type: 'extension',
      originalFileName: '夏商周拓展素材.pdf',
      subject,
      nodeId: scoped('rv-1-1-2'),
    }),
    createAttachmentSeedResource({
      id: `res-${subject}-3`,
      name: '春秋战国单元复习课件',
      type: 'courseware',
      originalFileName: '春秋战国复习课件.pptx',
      subject,
      nodeId: scoped('rv-1-1-3'),
      status: 'listed',
    }),
    createComposedSeedResource({
      id: `res-${subject}-4`,
      name: '专题·古代政治制度复习学案',
      type: 'studyGuide',
      subject,
      nodeId: scoped('rv-2-1'),
      status: 'archived',
      classHours: 2,
    }),
    createComposedSeedResource({
      id: `res-${subject}-5`,
      name: '三轮冲刺综合作业',
      type: 'homework',
      subject,
      nodeId: scoped('rv-3-1'),
      status: 'listed',
    }),
  ];

  appendAttachmentSeedVersion(
    resources[0]!,
    2,
    '史前时期复习课件-课堂修订.pptx',
    '2026-08-01T09:20:00.000Z',
  );
  appendAttachmentSeedVersion(
    resources[1]!,
    2,
    '夏商周青铜器讲解.mp3',
    '2026-08-01T10:15:00.000Z',
  );
  appendAttachmentSeedVersion(
    resources[1]!,
    3,
    '夏商周青铜文明短片.mp4',
    '2026-08-02T03:30:00.000Z',
  );
  appendComposedSeedVersion(resources[3]!, 2, '2026-08-01T11:10:00.000Z');
  appendComposedSeedVersion(
    resources[4]!,
    2,
    '2026-08-01T12:00:00.000Z',
    '2026-08-01T12:15:00.000Z',
  );
  resources[4]!.currentVersionId = `${resources[4]!.id}-v2`;
  synchronizeResourceSemantics(resources[4]!);
  appendComposedSeedVersion(resources[4]!, 3, '2026-08-02T05:20:00.000Z');
  return resources;
};

const SUBJECT_KEYS = [
  'math',
  'chinese',
  'english',
  'physics',
  'chemistry',
  'biology',
  'history',
  'geography',
  'politics',
] as const;

/**
 * 学案课时同步到资源树末级节点：节点课时 = 绑定的学案课时；
 * 无学案时恢复默认 1（保持教学计划兼容）。
 */
const syncReviewNodeClassHours = (
  subject: string,
  nodeId: string,
  classHours?: number,
) => {
  const tree = getKnowledgeTreeByContext({ subject, targetType: 'review' });
  const node = findTreeNode(tree, nodeId);
  if (!node) return;
  node.suggestedHours = classHours != null ? classHours : 1;
};

const getResourceStoreKey = (context: KnowledgeContext) =>
  `review-${context.subject}`;

const getRequiredAssetResourceContext = (
  req: Request,
): KnowledgeContext | null => {
  const subject = req.body?.subject ?? req.query.subject;
  const normalizedSubject = typeof subject === 'string' ? subject.trim() : '';
  if (
    !SUBJECT_KEYS.includes(normalizedSubject as (typeof SUBJECT_KEYS)[number])
  ) {
    return null;
  }
  return { subject: normalizedSubject, targetType: 'review' };
};

const getResourcesByContext = (context: KnowledgeContext) => {
  const storeKey = getResourceStoreKey(context);
  if (!resourceStore[storeKey]) {
    const resources = seedResourcesForSubject(context.subject);
    resourceStore[storeKey] = resources;
    assertResourceReferenceIntegrity(context.subject, resources);
    seedResourceOperations(context.subject, resources);
    // 资源树节点课时由绑定的学案自动带过来，不在资源树页面手动设置。
    resources.forEach((resource) => {
      if (resource.type === 'studyGuide') {
        syncReviewNodeClassHours(
          context.subject,
          resource.nodeId,
          resource.classHours,
        );
      }
    });
  }
  return resourceStore[storeKey];
};

const parseOptionalResourceFilter = (
  value: unknown,
  label: string,
):
  | { valid: true; value: string | undefined }
  | { valid: false; message: string } => {
  if (value === undefined) return { valid: true, value: undefined };
  if (typeof value !== 'string' || !value.trim()) {
    return {
      valid: false,
      message: `${label}筛选条件必须是单个非空字符串`,
    };
  }
  return { valid: true, value: value.trim() };
};

const collectResourceSubtreeNodeIds = (
  node: MockKnowledgeNode,
  result = new Set<string>(),
) => {
  result.add(node.key);
  node.children?.forEach((child) =>
    collectResourceSubtreeNodeIds(child, result),
  );
  return result;
};

const countResourcesOwnedByNodes = (
  context: KnowledgeContext,
  nodeIds: Set<string>,
) =>
  getResourcesByContext(context).filter((resource) =>
    nodeIds.has(resource.nodeId),
  ).length;

const getReviewResourceDependency = (
  context: KnowledgeContext,
  node: MockKnowledgeNode,
  includeDescendants: boolean,
) => {
  const nodeIds = includeDescendants
    ? collectResourceSubtreeNodeIds(node)
    : new Set([node.key]);
  return {
    affectedResourceCount: countResourcesOwnedByNodes(context, nodeIds),
    resourceScopeNodeId: node.key,
  };
};

const getReviewReferenceDependency = (nodeIds: Iterable<string>) => {
  const stableNodeIds = [...nodeIds];
  const affectedPlatformTemplateCount =
    countTeachingPlanTaskReferences(stableNodeIds);
  const affectedTeacherTeachingTaskCount =
    countTeacherTeachingTaskReferences(stableNodeIds);
  return {
    affectedPlatformTemplateCount,
    affectedTeacherTeachingTaskCount,
    affectedTeachingTaskCount:
      affectedPlatformTemplateCount + affectedTeacherTeachingTaskCount,
  };
};

const validateResourceListFilters = (
  context: KnowledgeContext,
  query: Request['query'],
):
  | { valid: true; filters: MockResourceListFilters }
  | { valid: false; message: string } => {
  const nameValidation = parseOptionalResourceFilter(query.name, '资源名称');
  if (!nameValidation.valid) return nameValidation;

  const typeValidation = parseOptionalResourceFilter(query.type, '资源类型');
  if (!typeValidation.valid) return typeValidation;

  const carrierTypeValidation = parseOptionalResourceFilter(
    query.carrierType,
    '文件类型',
  );
  if (!carrierTypeValidation.valid) return carrierTypeValidation;

  const statusValidation = parseOptionalResourceFilter(
    query.status,
    '资源状态',
  );
  if (!statusValidation.valid) return statusValidation;

  const nodeIdValidation = parseOptionalResourceFilter(
    query.nodeId,
    '资源树节点',
  );
  if (!nodeIdValidation.valid) return nodeIdValidation;

  const name = nameValidation.value;
  const type = typeValidation.value;
  const carrierType = carrierTypeValidation.value;
  const status = statusValidation.value;
  const nodeId = nodeIdValidation.value;

  if (type && !isResourceType(type)) {
    return { valid: false, message: '资源类型筛选条件无效' };
  }
  if (carrierType && !isResourceCarrierType(carrierType)) {
    return { valid: false, message: '文件类型筛选条件无效' };
  }
  if (status && !isResourceStatus(status)) {
    return { valid: false, message: '资源状态筛选条件无效' };
  }

  let subtreeNodeIds: Set<string> | undefined;
  if (nodeId) {
    const reviewTree = getKnowledgeTreeByContext(context);
    const selectedNode = findTreeNode(reviewTree, nodeId);
    if (!selectedNode || selectedNode.subject !== context.subject) {
      return { valid: false, message: '资源树节点筛选条件无效' };
    }
    subtreeNodeIds = collectResourceSubtreeNodeIds(selectedNode);
  }

  return {
    valid: true,
    filters: {
      name,
      type: isResourceType(type) ? type : undefined,
      carrierType: isResourceCarrierType(carrierType) ? carrierType : undefined,
      status: isResourceStatus(status) ? status : undefined,
      subtreeNodeIds,
    },
  };
};

const filterResources = (
  resources: MockResourceItem[],
  filters: MockResourceListFilters,
) => {
  const normalizedName = filters.name?.toLocaleLowerCase();
  return resources.filter((item) => {
    if (
      normalizedName &&
      !item.name.toLocaleLowerCase().includes(normalizedName) &&
      !item.currentVersion.originalFileName
        ?.toLocaleLowerCase()
        .includes(normalizedName)
    ) {
      return false;
    }
    if (filters.type && item.type !== filters.type) return false;
    if (
      filters.carrierType &&
      item.currentVersion.carrierType !== filters.carrierType
    ) {
      return false;
    }
    if (filters.status && item.status !== filters.status) return false;
    if (filters.subtreeNodeIds && !filters.subtreeNodeIds.has(item.nodeId)) {
      return false;
    }
    return true;
  });
};

const validateResourceName = (value: unknown) => {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) {
    return { valid: false, name, message: '资源名称不能为空' };
  }
  if (name.length > RESOURCE_NAME_MAX_LENGTH) {
    return {
      valid: false,
      name,
      message: `资源名称不能超过 ${RESOURCE_NAME_MAX_LENGTH} 个字符`,
    };
  }
  return { valid: true, name };
};

const getReviewNodePathSnapshot = (
  context: KnowledgeContext,
  nodeId: string,
) => {
  const findPath = (
    nodes: MockKnowledgeNode[],
    parents: string[] = [],
  ): string | null => {
    for (const node of nodes) {
      const path = [...parents, node.title];
      if (node.key === nodeId) return path.join(' / ');
      const childPath = node.children ? findPath(node.children, path) : null;
      if (childPath) return childPath;
    }
    return null;
  };

  return findPath(getKnowledgeTreeByContext(context)) || `节点 ${nodeId}`;
};

const validateResourceOwnership = (
  context: KnowledgeContext,
  nodeId: unknown,
) => {
  if (typeof nodeId !== 'string' || !nodeId.trim()) {
    return { valid: false, message: '请选择资源树末级节点' };
  }

  const normalizedNodeId = nodeId.trim();
  const reviewTree = getKnowledgeTreeByContext({
    subject: context.subject,
    targetType: 'review',
  });
  const node = findTreeNode(reviewTree, normalizedNodeId);
  if (!node || node.subject !== context.subject) {
    return {
      valid: false,
      message: '请选择当前学科的有效资源树末级节点',
    };
  }
  if (node.children?.length) {
    return { valid: false, message: '资源只能归属资源树末级节点' };
  }
  return { valid: true, nodeId: normalizedNodeId };
};

const hasDuplicatedResourceName = (
  resources: MockResourceItem[],
  data: {
    name: string;
    type: ResourceType;
    nodeId: string;
    excludeId?: string;
  },
) =>
  resources.some(
    (item) =>
      item.id !== data.excludeId &&
      item.nodeId === data.nodeId &&
      item.type === data.type &&
      item.name.trim() === data.name,
  );

const applyQuestionTypeScope = (
  nodes: QuestionTypeSeedNode[],
  context: QuestionTypeContext,
  level = 1,
  parentAnswerCardType?: QuestionTypeAnswerCardType,
): MockQuestionTypeNode[] =>
  nodes.map((node) => {
    const key = `${context.subject}-${node.key}`;
    const scopedNode: MockQuestionTypeNode = {
      title: node.title,
      key,
      subject: context.subject,
      description: node.description,
    };

    if (level === 1) {
      scopedNode.answerCardType = normalizeQuestionTypeAnswerCardType(
        node.answerCardType,
        node.title,
        key,
      );
    } else {
      if (shouldQuestionTypeNeedAnswerArea(parentAnswerCardType)) {
        scopedNode.answerArea = normalizeQuestionTypeAnswerArea(
          node.answerArea,
        );
      }
    }

    if (node.children) {
      scopedNode.children = applyQuestionTypeScope(
        node.children,
        context,
        level + 1,
        scopedNode.answerCardType || parentAnswerCardType,
      );
    }

    return scopedNode;
  });

const createQuestionTypeNodeKey = (context: QuestionTypeContext) => {
  const contextKey = getQuestionTypeContextKey(context);
  return `qt-${contextKey}-${Date.now()}`;
};

const questionTypeTreeStore: Record<string, MockQuestionTypeNode[]> = {};

const getQuestionTypeTreeByContext = (context: QuestionTypeContext) => {
  const contextKey = getQuestionTypeContextKey(context);
  if (!questionTypeTreeStore[contextKey]) {
    questionTypeTreeStore[contextKey] = applyQuestionTypeScope(
      getQuestionTypeSeed(context.subject),
      context,
    );
  }
  return normalizeQuestionTypeTreeSettings(questionTypeTreeStore[contextKey]);
};

const findQuestionTypeNode = (
  nodes: MockQuestionTypeNode[],
  id: string,
): MockQuestionTypeNode | null => {
  for (const node of nodes) {
    if (node.key === id) {
      return node;
    }
    if (node.children?.length) {
      const found = findQuestionTypeNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const getQuestionTypeNodeLevel = (
  nodes: MockQuestionTypeNode[],
  id: string,
  level = 1,
): number | null => {
  for (const node of nodes) {
    if (node.key === id) {
      return level;
    }
    if (node.children?.length) {
      const found = getQuestionTypeNodeLevel(node.children, id, level + 1);
      if (found) return found;
    }
  }
  return null;
};

const findQuestionTypeParentList = (
  nodes: MockQuestionTypeNode[],
  id: string,
  parentList: MockQuestionTypeNode[] = nodes,
): MockQuestionTypeNode[] | null => {
  for (const node of nodes) {
    if (node.key === id) {
      return parentList;
    }
    if (node.children?.length) {
      const found = findQuestionTypeParentList(
        node.children,
        id,
        node.children,
      );
      if (found) return found;
    }
  }
  return null;
};

const reorderQuestionTypeNode = (
  siblingNodes: MockQuestionTypeNode[],
  id: string,
  targetId: string,
  position: QuestionTypeDropPosition,
): boolean => {
  const sourceIndex = siblingNodes.findIndex((node) => node.key === id);
  if (sourceIndex < 0) return false;

  const [nodeToMove] = siblingNodes.splice(sourceIndex, 1);
  if (!nodeToMove) return false;

  const targetIndex = siblingNodes.findIndex((node) => node.key === targetId);
  if (targetIndex < 0) {
    siblingNodes.splice(sourceIndex, 0, nodeToMove);
    return false;
  }

  siblingNodes.splice(
    position === 'before' ? targetIndex : targetIndex + 1,
    0,
    nodeToMove,
  );
  return true;
};

const findTreeNode = <T extends { key: string; children?: T[] }>(
  nodes: T[],
  id: string,
): T | null => {
  for (const node of nodes) {
    if (node.key === id) {
      return node;
    }
    if (node.children?.length) {
      const found = findTreeNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const findTreeParentList = <T extends { key: string; children?: T[] }>(
  nodes: T[],
  id: string,
  parentList: T[] = nodes,
): T[] | null => {
  for (const node of nodes) {
    if (node.key === id) {
      return parentList;
    }
    if (node.children?.length) {
      const found = findTreeParentList(node.children, id, node.children);
      if (found) return found;
    }
  }
  return null;
};

const normalizeTreeNodeTitle = (title: unknown) =>
  typeof title === 'string' ? title.trim() : '';

const getTreeSiblingListByParentId = <
  T extends { key: string; title?: string; children?: T[] },
>(
  nodes: T[],
  parentId?: unknown,
): T[] | null => {
  const normalizedParentId =
    typeof parentId === 'string' && parentId ? parentId : null;

  if (!normalizedParentId) {
    return nodes;
  }

  const parentNode = findTreeNode(nodes, normalizedParentId);
  if (!parentNode) {
    return null;
  }

  if (!parentNode.children) parentNode.children = [];
  return parentNode.children;
};

const validateTreeNodeTitle = <
  T extends { key: string; title?: string; children?: T[] },
>(
  siblingNodes: T[] | null,
  title: unknown,
  excludeId?: unknown,
) => {
  const normalizedTitle = normalizeTreeNodeTitle(title);
  const normalizedExcludeId =
    typeof excludeId === 'string' && excludeId ? excludeId : undefined;

  if (!normalizedTitle) {
    return {
      valid: false,
      title: normalizedTitle,
      message: '节点名称不能为空',
    };
  }

  if (!siblingNodes) {
    return { valid: false, title: normalizedTitle, message: '父节点不存在' };
  }

  const duplicated = siblingNodes.some(
    (node) =>
      node.key !== normalizedExcludeId &&
      normalizeTreeNodeTitle(node.title) === normalizedTitle,
  );

  if (duplicated) {
    return {
      valid: false,
      title: normalizedTitle,
      message: '同级已存在同名节点',
    };
  }

  return { valid: true, title: normalizedTitle };
};

const validateGlobalTreeNodeTitle = <
  T extends { key: string; title?: string; children?: T[] },
>(
  nodes: T[],
  title: unknown,
  excludeId?: unknown,
) => {
  const allNodes: T[] = [];
  const collect = (currentNodes: T[]) => {
    currentNodes.forEach((node) => {
      allNodes.push(node);
      if (node.children?.length) collect(node.children);
    });
  };
  collect(nodes);
  const validation = validateTreeNodeTitle(allNodes, title, excludeId);
  return !validation.valid && validation.message === '同级已存在同名节点'
    ? { ...validation, message: '当前学科知识树内已存在同名节点' }
    : validation;
};

const findDuplicateTreeNodeTitle = <
  T extends { title?: string; children?: T[] },
>(
  nodes: T[],
): string | null => {
  const seenTitles = new Set<string>();
  let duplicatedTitle: string | null = null;
  const visit = (currentNodes: T[]) => {
    for (const node of currentNodes) {
      const title = normalizeTreeNodeTitle(node.title);
      if (title && seenTitles.has(title)) {
        duplicatedTitle = title;
        return;
      }
      if (title) seenTitles.add(title);
      if (node.children?.length) visit(node.children);
      if (duplicatedTitle) return;
    }
  };
  visit(nodes);
  return duplicatedTitle;
};

const isTreeDescendant = <T extends { key: string; children?: T[] }>(
  nodes: T[],
  ancestorId: string,
  descendantId: string,
) => {
  const ancestorNode = findTreeNode(nodes, ancestorId);
  if (!ancestorNode?.children?.length) return false;
  return Boolean(findTreeNode(ancestorNode.children, descendantId));
};

const moveTreeNode = <T extends { key: string; children?: T[] }>(
  nodes: T[],
  id: string,
  targetId: string,
  position: TreeMovePosition,
  label: string,
) => {
  if (id === targetId) {
    return { success: false, message: `Cannot move ${label} into itself` };
  }

  if (!['before', 'after', 'inside'].includes(position)) {
    return { success: false, message: `Invalid ${label} move position` };
  }

  if (isTreeDescendant(nodes, id, targetId)) {
    return {
      success: false,
      message: `Cannot move ${label} into its descendant`,
    };
  }

  const sourceParentList = findTreeParentList(nodes, id);
  if (!sourceParentList) {
    return { success: false, message: `${label} not found` };
  }

  const sourceIndex = sourceParentList.findIndex((node) => node.key === id);
  if (sourceIndex < 0) {
    return { success: false, message: `${label} not found` };
  }

  const [nodeToMove] = sourceParentList.splice(sourceIndex, 1);
  if (!nodeToMove) {
    return { success: false, message: `${label} not found` };
  }

  const restoreSourceNode = () => {
    sourceParentList.splice(sourceIndex, 0, nodeToMove);
  };

  if (position === 'inside') {
    const targetNode = findTreeNode(nodes, targetId);
    if (!targetNode) {
      restoreSourceNode();
      return { success: false, message: `Target ${label} not found` };
    }
    if (!targetNode.children) targetNode.children = [];
    targetNode.children.push(nodeToMove);
    return { success: true, message: `${label} moved successfully` };
  }

  const targetParentList = findTreeParentList(nodes, targetId);
  if (!targetParentList) {
    restoreSourceNode();
    return { success: false, message: `Target ${label} not found` };
  }

  const targetIndex = targetParentList.findIndex(
    (node) => node.key === targetId,
  );
  if (targetIndex < 0) {
    restoreSourceNode();
    return { success: false, message: `Target ${label} not found` };
  }

  targetParentList.splice(
    position === 'before' ? targetIndex : targetIndex + 1,
    0,
    nodeToMove,
  );
  return { success: true, message: `${label} moved successfully` };
};

const ATTRIBUTE_TARGET_ORDER: Record<AttributeTarget, number> = {
  paper: 0,
  question: 1,
  knowledge: 2,
  topic: 3,
};

const normalizeOptionOrder = (tags: MockAttributeItem[] = []) =>
  tags.map((tag, index) => ({
    ...tag,
    sort: index,
  }));

const getSubjectKey = (subject?: unknown) => {
  if (Array.isArray(subject)) {
    return getSubjectKey(subject[0]);
  }
  if (
    typeof subject === 'string' &&
    SUBJECT_KEYS.includes(subject as (typeof SUBJECT_KEYS)[number])
  ) {
    return subject;
  }
  return 'math';
};

const shouldUseSubjectOptions = (category: MockTagCategory) =>
  category.target === 'question' && category.optionAddMode === 'bySubject';

const getCategoryOptionList = (
  category: MockTagCategory,
  subject?: unknown,
) => {
  if (shouldUseSubjectOptions(category)) {
    const subjectKey = getSubjectKey(subject);
    if (!category.subjectTags) category.subjectTags = {};
    category.subjectTags[subjectKey] = normalizeOptionOrder(
      category.subjectTags[subjectKey] || [],
    );
    return category.subjectTags[subjectKey] || [];
  }

  category.tags = normalizeOptionOrder(category.tags || []);
  return category.tags;
};

const setCategoryOptionList = (
  category: MockTagCategory,
  tags: MockAttributeItem[],
  subject?: unknown,
) => {
  const nextTags = normalizeOptionOrder(tags);
  if (shouldUseSubjectOptions(category)) {
    const subjectKey = getSubjectKey(subject);
    if (!category.subjectTags) category.subjectTags = {};
    category.subjectTags[subjectKey] = nextTags;
    return nextTags;
  }

  category.tags = nextTags;
  return category.tags;
};

const cloneAttributeItems = (tags: MockAttributeItem[] = []) =>
  (Array.isArray(tags) ? tags : []).map((tag) => ({ ...tag }));

const cloneSubjectTags = (
  subjectTags?: Partial<Record<string, MockAttributeItem[]>>,
) =>
  Object.entries(subjectTags || {}).reduce<
    Partial<Record<string, MockAttributeItem[]>>
  >((result, [subject, tags]) => {
    result[subject] = cloneAttributeItems(tags);
    return result;
  }, {});

const normalizeCategoryOptionLists = (category: MockTagCategory) => {
  category.tags = normalizeOptionOrder(category.tags || []);
  if (category.subjectTags) {
    Object.keys(category.subjectTags).forEach((subject) => {
      category.subjectTags![subject] = normalizeOptionOrder(
        category.subjectTags![subject] || [],
      );
    });
  }
  return category;
};

const cloneTagCategory = (category: MockTagCategory): MockTagCategory =>
  normalizeCategoryOptionLists({
    ...category,
    applicableSubjects: [...(category.applicableSubjects || [])],
    tags: cloneAttributeItems(category.tags),
    subjectTags: cloneSubjectTags(category.subjectTags),
  });

const sortTagCategories = (categories: MockTagCategory[]) =>
  [...categories].sort((a, b) => {
    const targetOrder =
      ATTRIBUTE_TARGET_ORDER[a.target] - ATTRIBUTE_TARGET_ORDER[b.target];
    if (targetOrder !== 0) return targetOrder;
    const sortOrder = (a.sort ?? 0) - (b.sort ?? 0);
    if (sortOrder !== 0) return sortOrder;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });

const toTagCategoryResponse = (
  category: MockTagCategory,
  subject?: unknown,
) => {
  const responseCategory = cloneTagCategory(category);
  responseCategory.tags = cloneAttributeItems(
    getCategoryOptionList(category, subject),
  );
  return responseCategory;
};

const mergeDefined = <T extends object>(target: T, patch: Partial<T>) => {
  Object.entries(patch).forEach(([key, value]) => {
    if (value !== undefined) {
      (target as Record<string, unknown>)[key] = value;
    }
  });
  return target;
};

const createMockAttributeItem = (
  tag: Partial<MockAttributeItem>,
  ownerKey: string,
  index: number,
): MockAttributeItem => {
  const name = tag.name || '未命名枚举值';

  return {
    ...tag,
    id: tag.id || `tag-${ownerKey}-${Date.now()}-${index}`,
    name,
    color: tag.color || 'default',
    status: tag.status || 'enabled',
    displayName: tag.displayName || name,
    frontVisible: tag.frontVisible ?? true,
  };
};

const createMockAttributeItems = (tags: unknown, ownerKey: string) =>
  Array.isArray(tags)
    ? tags.map((tag, index) =>
        createMockAttributeItem(
          (tag || {}) as Partial<MockAttributeItem>,
          ownerKey,
          index,
        ),
      )
    : [];

const createMergedMockAttributeItems = (
  tags: unknown,
  existingTags: MockAttributeItem[],
  ownerKey: string,
) =>
  Array.isArray(tags)
    ? tags.map((tag, index) => {
        const incomingTag = (tag || {}) as Partial<MockAttributeItem>;
        const existingTag = incomingTag.id
          ? existingTags.find((item) => item.id === incomingTag.id)
          : undefined;
        return createMockAttributeItem(
          {
            ...existingTag,
            ...incomingTag,
          },
          ownerKey,
          index,
        );
      })
    : [];

const tagCategoryStore: MockTagCategory[] =
  defaultTagCategoryTemplates.map(cloneTagCategory);

const getTagCategoriesForResponse = (subject?: unknown) =>
  sortTagCategories(tagCategoryStore).map((category) =>
    toTagCategoryResponse(category, subject),
  );

const getTagCategoryById = (categoryId: unknown) =>
  tagCategoryStore.find((category) => category.id === categoryId);

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

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const collectTreeNodeKeys = (
  node: { key?: unknown; children?: unknown },
  keys = new Set<string>(),
) => {
  if (typeof node.key === 'string') {
    keys.add(node.key);
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => {
      if (child && typeof child === 'object') {
        collectTreeNodeKeys(
          child as { key?: unknown; children?: unknown },
          keys,
        );
      }
    });
  }
  return keys;
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

const isAttributeUsageScene = (scene: unknown): scene is AttributeUsageScene =>
  typeof scene === 'string' &&
  ATTRIBUTE_USAGE_SCENES.includes(scene as AttributeUsageScene);

let attributeUsageRules: AttributeUsageRule[] = [
  {
    id: 'rule-question-tagging-difficulty',
    attributeId: 'cat-question-difficulty',
    scene: 'questionTagging',
    enabled: true,
    required: true,
    sort: 0,
  },
  {
    id: 'rule-question-list-filter-difficulty',
    attributeId: 'cat-question-difficulty',
    scene: 'questionListFilter',
    enabled: true,
    filterArea: 'primary',
    sort: 0,
  },
  {
    id: 'rule-question-list-filter-paper-year',
    attributeId: 'cat-paper-year',
    scene: 'questionListFilter',
    enabled: true,
    filterArea: 'more',
    sort: 1,
  },
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
];

let nodeAttributeRelationStore: MockNodeAttributeRelation[] = [
  {
    id: 'rel-knowledge-math-kp-1-emphasis-key',
    targetType: 'knowledge',
    subject: 'math',
    nodeId: 'kp-1-math',
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

// Mock Data for Textbook Versions
let textbookVersions = [
  { label: '人教版', value: 'renjiao' },
  { label: '北师大版', value: 'beishida' },
  { label: '苏科版', value: 'suke' },
];

// Mock Data for Textbook Chapters (Tree Structure)
let textbookChapters: any = {
  renjiao: [
    {
      title: '七年级上册',
      key: 'rj-7-1',
      children: [
        { title: '第一章 有理数', key: 'rj-7-1-1' },
        { title: '第二章 整式的加减', key: 'rj-7-1-2' },
      ],
    },
    {
      title: '七年级下册',
      key: 'rj-7-2',
      children: [{ title: '第五章 相交线与平行线', key: 'rj-7-2-5' }],
    },
  ],
  beishida: [
    {
      title: '七年级上册',
      key: 'bsd-7-1',
      children: [{ title: '第一章 丰富的图形世界', key: 'bsd-7-1-1' }],
    },
  ],
};

const cloneTextbookChapterTree = (nodes: any[] = []): any[] =>
  nodes.map((node) => ({
    ...node,
    children: node.children
      ? cloneTextbookChapterTree(node.children)
      : undefined,
  }));

const getTextbookChapterStoreKey = (version: unknown, subject?: unknown) =>
  `${normalizeQueryValue(version, '')}__${getSubjectKey(subject)}`;

const scopedTextbookChapterStore: Record<string, any[]> = {};

const getTextbookChaptersByContext = (version: unknown, subject?: unknown) => {
  const versionKey = normalizeQueryValue(version, '');
  const storeKey = getTextbookChapterStoreKey(versionKey, subject);
  if (!scopedTextbookChapterStore[storeKey]) {
    scopedTextbookChapterStore[storeKey] = cloneTextbookChapterTree(
      textbookChapters[versionKey] || [],
    );
  }
  return scopedTextbookChapterStore[storeKey];
};

export default {
  'GET /api/tags/knowledge-tree': (req: Request, res: Response) => {
    const context = getKnowledgeContext(req);
    res.send({
      success: true,
      data: getKnowledgeTreeByContext(context),
    });
  },
  'GET /api/tags/resource-tree/leaves': (req: Request, res: Response) => {
    const subject = normalizeQueryValue(req.query.subject, '').trim();
    if (!subject) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }

    res.send({
      success: true,
      message: 'Resource tree leaf nodes loaded successfully',
      // 课时由绑定的学案自动带过来；停用节点仍返回，供草稿识别。
      data: getResourceTreeLeafNodesSnapshot(subject),
    });
  },
  'POST /api/tags/knowledge-tree/import': (req: Request, res: Response) => {
    const context = getKnowledgeContext(req);
    const { nodes } = req.body;
    if (!Array.isArray(nodes) || nodes.length === 0) {
      res.send({ success: false, message: '导入内容为空' });
      return;
    }

    const storeKey = getKnowledgeStoreKey(context);
    const now = Date.now();
    let seq = 0;
    const buildNode = (source: {
      title?: unknown;
      description?: unknown;
      children?: unknown;
    }): MockKnowledgeNode | null => {
      const title = normalizeTreeNodeTitle(source.title);
      if (!title) {
        throw new Error('导入内容包含空节点名称');
      }
      seq += 1;
      const nodeId = `kp-${storeKey}-${now}-${seq}`;
      const children = Array.isArray(source.children)
        ? source.children
            .map((child) =>
              child && typeof child === 'object'
                ? buildNode(child as { title?: unknown })
                : null,
            )
            .filter((node): node is MockKnowledgeNode => node !== null)
        : [];
      return {
        id: nodeId,
        key: nodeId,
        title,
        value: nodeId,
        subject: context.subject,
        description:
          typeof source.description === 'string'
            ? source.description
            : undefined,
        children,
      };
    };

    const countTreeNodes = (tree: MockKnowledgeNode[]): number =>
      tree.reduce(
        (sum, node) =>
          sum + 1 + (node.children?.length ? countTreeNodes(node.children) : 0),
        0,
      );

    const validateSiblingDuplicates = (
      tree: MockKnowledgeNode[],
    ): string | null => {
      const titles = new Set<string>();
      for (const node of tree) {
        const key = normalizeTreeNodeTitle(node.title);
        if (titles.has(key)) {
          return `同级存在重名节点「${node.title}」`;
        }
        titles.add(key);
      }
      for (const node of tree) {
        if (node.children?.length) {
          const childResult = validateSiblingDuplicates(node.children);
          if (childResult) return childResult;
        }
      }
      return null;
    };

    let nextTree: MockKnowledgeNode[];
    try {
      nextTree = nodes
        .map((node) =>
          node && typeof node === 'object'
            ? buildNode(node as { title?: unknown })
            : null,
        )
        .filter((node): node is MockKnowledgeNode => node !== null);
    } catch (error) {
      res.send({
        success: false,
        message: error instanceof Error ? error.message : '导入内容解析失败',
      });
      return;
    }

    if (nextTree.length === 0) {
      res.send({ success: false, message: '导入内容为空' });
      return;
    }

    const duplicateMessage = validateSiblingDuplicates(nextTree);
    if (duplicateMessage) {
      res.send({ success: false, message: duplicateMessage });
      return;
    }

    if (context.targetType === 'review') {
      const affectedResourceCount = getResourcesByContext(context).length;
      if (affectedResourceCount > 0) {
        res.send({
          success: false,
          message: `当前学科资源树下有 ${affectedResourceCount} 份正式资源，不能清空重建。请改用节点编辑或整理来调整结构。`,
          data: { affectedResourceCount },
        });
        return;
      }
      const existingNodeIds = new Set<string>();
      getKnowledgeTreeByContext(context).forEach((node) =>
        collectTreeNodeKeys(node, existingNodeIds),
      );
      const affectedTeachingTaskCount =
        countTeachingPlanTaskReferences(existingNodeIds);
      if (affectedTeachingTaskCount > 0) {
        res.send({
          success: false,
          message: `当前学科资源树有 ${affectedTeachingTaskCount} 个教学任务引用，不能清空重建。请保留节点身份并使用节点编辑或整理。`,
          data: { affectedResourceCount, affectedTeachingTaskCount },
        });
        return;
      }
    }

    // 清空重建：收集旧节点 key，清理其属性挂载关系后整体替换
    const oldKeys = new Set<string>();
    (knowledgeTreeStore[storeKey] || []).forEach((node) => {
      collectTreeNodeKeys(node, oldKeys);
    });
    removeNodeAttributeRelations(
      (relation) =>
        relation.targetType === context.targetType &&
        relation.subject === context.subject &&
        oldKeys.has(relation.nodeId),
    );

    knowledgeTreeStore[storeKey] = nextTree;
    res.send({
      success: true,
      message: '导入成功',
      data: {
        count: countTreeNodes(nextTree),
        affectedResourceCount: 0,
      },
    });
  },
  // Replaced /api/tags/attributes with /api/tags/categories
  'GET /api/tags/categories': (req: Request, res: Response) => {
    res.send({
      success: true,
      data: getTagCategoriesForResponse(req.query.subject),
    });
  },
  // Category CRUD
  'POST /api/tags/category': (req: Request, res: Response) => {
    const categoryPayload = { ...req.body };
    const tags = categoryPayload.tags;
    const subjectTags = categoryPayload.subjectTags;
    delete categoryPayload.grade;
    delete categoryPayload.subject;
    delete categoryPayload.tags;
    delete categoryPayload.subjectTags;

    const categoryId = categoryPayload.id || `cat-${Date.now()}`;
    const newCat = normalizeCategoryOptionLists({
      ...(categoryPayload as Partial<MockTagCategory>),
      id: categoryId,
      name: categoryPayload.name || '未命名属性',
      target: categoryPayload.target || 'question',
      optionAddMode: categoryPayload.optionAddMode || 'unified',
      status: categoryPayload.status || 'enabled',
      frontVisible: categoryPayload.frontVisible ?? true,
      sort: categoryPayload.sort ?? tagCategoryStore.length,
      tags: createMockAttributeItems(tags, categoryId),
      subjectTags: cloneSubjectTags(subjectTags),
    } as MockTagCategory);
    tagCategoryStore.push(newCat);
    res.send({
      success: true,
      message: 'Category created successfully',
      data: toTagCategoryResponse(newCat, req.body?.subject),
    });
  },
  'PUT /api/tags/category': (req: Request, res: Response) => {
    const { id } = req.body;
    const category = getTagCategoryById(id);
    if (category) {
      const categoryPayload = { ...req.body };
      const tags = categoryPayload.tags;
      const subjectTags = categoryPayload.subjectTags;
      delete categoryPayload.id;
      delete categoryPayload.grade;
      delete categoryPayload.subject;
      delete categoryPayload.tags;
      delete categoryPayload.subjectTags;

      mergeDefined(category, categoryPayload as Partial<MockTagCategory>);
      if (subjectTags !== undefined) {
        category.subjectTags = cloneSubjectTags(subjectTags);
      }
      const shouldApplyTagsPayload =
        tags !== undefined &&
        !(shouldUseSubjectOptions(category) && subjectTags !== undefined);

      if (shouldApplyTagsPayload) {
        const currentTags = getCategoryOptionList(category, req.body?.subject);
        const nextTags = createMergedMockAttributeItems(
          tags,
          currentTags,
          `${category.id}-${getSubjectKey(req.body?.subject)}`,
        );
        setCategoryOptionList(category, nextTags, req.body?.subject);
      }
      normalizeCategoryOptionLists(category);
    }
    res.send({
      success: !!category,
      message: category
        ? 'Category updated successfully'
        : 'Category not found',
      data: category
        ? toTagCategoryResponse(category, req.body?.subject)
        : undefined,
    });
  },
  'DELETE /api/tags/category': (req: Request, res: Response) => {
    const { id } = req.query;
    const nextCategories = tagCategoryStore.filter((category) => {
      return category.id !== id;
    });
    const deleted = nextCategories.length !== tagCategoryStore.length;
    tagCategoryStore.splice(0, tagCategoryStore.length, ...nextCategories);
    if (deleted) {
      attributeUsageRules = attributeUsageRules.filter(
        (rule) => rule.attributeId !== id,
      );
      removeNodeAttributeRelations((relation) => relation.attributeId === id);
    }
    res.send({
      success: deleted,
      message: deleted ? 'Category deleted successfully' : 'Category not found',
    });
  },

  'POST /api/tags/knowledge-node': (req: Request, res: Response) => {
    const { parentId, title, description } = req.body;
    const context = getKnowledgeContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);

    if (context.targetType === 'review' && parentId) {
      const parentNode = findTreeNode(knowledgePoints, String(parentId));
      if (parentNode) {
        const dependency = getReviewResourceDependency(
          context,
          parentNode,
          false,
        );
        if (dependency.affectedResourceCount > 0) {
          res.send({
            success: false,
            message: `该末级节点已有 ${dependency.affectedResourceCount} 份正式资源，不能新增子节点。请先在资产中心调整相关资源归属。`,
            data: dependency,
          });
          return;
        }
        const referenceDependency = getReviewReferenceDependency([
          parentNode.key,
        ]);
        if (referenceDependency.affectedPlatformTemplateCount > 0) {
          res.send({
            success: false,
            message: `该末级节点已被 ${referenceDependency.affectedPlatformTemplateCount} 个平台教学计划模板引用，不能新增子节点。请先处理模板引用。`,
            data: { affectedResourceCount: 0, ...referenceDependency },
          });
          return;
        }
        if (referenceDependency.affectedTeacherTeachingTaskCount > 0) {
          res.send({
            success: false,
            message: `该末级节点已被 ${referenceDependency.affectedTeacherTeachingTaskCount} 个教师教学任务引用，不能新增子节点。请先处理教师任务引用。`,
            data: { affectedResourceCount: 0, ...referenceDependency },
          });
          return;
        }
      }
    }

    if (context.targetType === 'knowledgeTree' && parentId) {
      const parentNode = findTreeNode(knowledgePoints, String(parentId));
      if (parentNode) {
        const affectedKnowledgeBlockCount = getKnowledgeBlockRelationCount(
          context,
          parentNode.key,
        );
        if (affectedKnowledgeBlockCount > 0) {
          res.send({
            success: false,
            message: `该末级节点已关联 ${affectedKnowledgeBlockCount} 个知识块，不能新增子节点。请先在知识块新建或编辑功能中调整关联。`,
            data: {
              affectedResourceCount: 0,
              affectedKnowledgeBlockCount,
            },
          });
          return;
        }
      }
    }

    const parentNode = parentId
      ? findTreeNode(knowledgePoints, String(parentId))
      : null;
    const siblingNodes = parentId
      ? parentNode
        ? parentNode.children || []
        : null
      : knowledgePoints;
    const validation =
      context.targetType === 'knowledgeTree'
        ? validateGlobalTreeNodeTitle(knowledgePoints, title)
        : validateTreeNodeTitle(siblingNodes, title);
    if (!validation.valid) {
      res.send({
        success: false,
        message: validation.message,
        data: { affectedResourceCount: 0 },
      });
      return;
    }

    const contextKey = getKnowledgeStoreKey(context);
    knowledgeNodeSequence += 1;
    const nodeId = `kp-${contextKey}-custom-${knowledgeNodeSequence}`;
    const newNode: MockKnowledgeNode = {
      id: nodeId,
      key: nodeId,
      title: validation.title,
      value: nodeId,
      subject: context.subject,
      description,
      children: [],
    };

    if (parentNode) {
      parentNode.children = [...(parentNode.children || []), newNode];
    } else {
      knowledgePoints.push(newNode);
    }
    res.send({
      success: true,
      message: 'Node created successfully',
      data: { affectedResourceCount: 0 },
    });
  },
  'PUT /api/tags/knowledge-node': (req: Request, res: Response) => {
    const { id, title, description } = req.body;
    const context = getKnowledgeContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);
    const siblingNodes = findTreeParentList(knowledgePoints, id);
    const validation =
      context.targetType === 'knowledgeTree'
        ? validateGlobalTreeNodeTitle(knowledgePoints, title, id)
        : validateTreeNodeTitle(siblingNodes, title, id);
    if (!validation.valid) {
      res.send({ success: false, message: validation.message });
      return;
    }

    const updateNode = (nodes: MockKnowledgeNode[]) => {
      for (const node of nodes) {
        if (node.key === id) {
          node.title = validation.title;
          node.description = description;
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (updateNode(node.children)) return true;
        }
      }
      return false;
    };
    const updated = updateNode(knowledgePoints);
    res.send({
      success: updated,
      message: updated ? 'Node updated successfully' : 'Node not found',
    });
  },
  'DELETE /api/tags/knowledge-node': (req: Request, res: Response) => {
    const nodeId = normalizeQueryValue(req.query.id, '');
    const context = getKnowledgeContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);
    const targetNode = findTreeNode(knowledgePoints, nodeId);

    if (!targetNode) {
      res.send({
        success: false,
        message: '节点不存在或不属于当前学科',
        data: { affectedResourceCount: 0 },
      });
      return;
    }

    if (context.targetType === 'review') {
      if (targetNode.children?.length) {
        res.send({
          success: false,
          message: `该节点存在 ${targetNode.children.length} 个直接子节点，不能删除。请先逐个处理子节点。`,
          data: { affectedResourceCount: 0 },
        });
        return;
      }
      const dependency = getReviewResourceDependency(
        context,
        targetNode,
        false,
      );
      if (dependency.affectedResourceCount > 0) {
        res.send({
          success: false,
          message: `该节点已挂载 ${dependency.affectedResourceCount} 份正式资源，不能删除。请先在资产中心调整资源归属。`,
          data: dependency,
        });
        return;
      }
      const referenceDependency = getReviewReferenceDependency([
        targetNode.key,
      ]);
      if (referenceDependency.affectedPlatformTemplateCount > 0) {
        res.send({
          success: false,
          message: `该节点已被 ${referenceDependency.affectedPlatformTemplateCount} 个平台教学计划模板引用，不能删除。请先处理模板引用。`,
          data: { affectedResourceCount: 0, ...referenceDependency },
        });
        return;
      }
      if (referenceDependency.affectedTeacherTeachingTaskCount > 0) {
        res.send({
          success: false,
          message: `该节点已被 ${referenceDependency.affectedTeacherTeachingTaskCount} 个教师教学任务引用，不能删除。请先处理教师任务引用。`,
          data: { affectedResourceCount: 0, ...referenceDependency },
        });
        return;
      }
    }

    if (context.targetType === 'knowledgeTree') {
      if (targetNode.children?.length) {
        res.send({
          success: false,
          message: `该节点存在 ${targetNode.children.length} 个直接子节点，不能删除。请先逐个处理子节点。`,
          data: {
            affectedResourceCount: 0,
            affectedKnowledgeBlockCount: 0,
          },
        });
        return;
      }
      const affectedKnowledgeBlockCount = getKnowledgeBlockRelationCount(
        context,
        targetNode.key,
      );
      if (affectedKnowledgeBlockCount > 0) {
        res.send({
          success: false,
          message: `该节点已关联 ${affectedKnowledgeBlockCount} 个知识块，不能删除。请先在知识块新建或编辑功能中调整关联。`,
          data: {
            affectedResourceCount: 0,
            affectedKnowledgeBlockCount,
          },
        });
        return;
      }
    }

    let deletedNodeKeys = new Set<string>();
    const deleteNode = (nodes: MockKnowledgeNode[]) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node) continue;
        if (node.key === nodeId) {
          deletedNodeKeys = collectTreeNodeKeys(node);
          nodes.splice(i, 1);
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (deleteNode(node.children)) return true;
        }
      }
      return false;
    };
    const deleted = deleteNode(knowledgePoints);
    if (deleted) {
      removeNodeAttributeRelations(
        (relation) =>
          relation.targetType === context.targetType &&
          relation.subject === context.subject &&
          deletedNodeKeys.has(relation.nodeId),
      );
    }
    res.send({
      success: deleted,
      message: deleted ? 'Node deleted successfully' : 'Node not found',
      data: { affectedResourceCount: 0 },
    });
  },
  'PUT /api/tags/knowledge-node/move': (req: Request, res: Response) => {
    const { id, targetId, position } = req.body;
    const context = getKnowledgeContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);
    const sourceNodeId = String(id);
    const targetNodeId = String(targetId);
    let affectedResourceCount = 0;
    let affectedKnowledgeBlockCount = 0;

    if (context.targetType === 'knowledgeTree') {
      if (!['before', 'after', 'inside'].includes(position)) {
        res.send({
          success: false,
          message: '移动位置无效',
          data: { affectedResourceCount: 0, affectedKnowledgeBlockCount: 0 },
        });
        return;
      }
      if (sourceNodeId === targetNodeId) {
        res.send({
          success: false,
          message: '不能将知识树节点移动到自身',
          data: { affectedResourceCount: 0, affectedKnowledgeBlockCount: 0 },
        });
        return;
      }
      if (isTreeDescendant(knowledgePoints, sourceNodeId, targetNodeId)) {
        res.send({
          success: false,
          message: '不能将知识树节点移动到其后代节点',
          data: { affectedResourceCount: 0, affectedKnowledgeBlockCount: 0 },
        });
        return;
      }

      const sourceNode = findTreeNode(knowledgePoints, sourceNodeId);
      const targetNode = findTreeNode(knowledgePoints, targetNodeId);
      if (!sourceNode || !targetNode) {
        res.send({
          success: false,
          message: '源节点或目标节点不存在，不能跨学科移动',
          data: { affectedResourceCount: 0, affectedKnowledgeBlockCount: 0 },
        });
        return;
      }
      if (
        sourceNode.subject !== context.subject ||
        targetNode.subject !== context.subject
      ) {
        res.send({
          success: false,
          message: '知识树节点只能在当前学科树内移动',
          data: { affectedResourceCount: 0, affectedKnowledgeBlockCount: 0 },
        });
        return;
      }

      const duplicatedTitle = findDuplicateTreeNodeTitle(knowledgePoints);
      if (duplicatedTitle) {
        res.send({
          success: false,
          message: `当前学科知识树内存在同名节点「${duplicatedTitle}」，原结构保持不变`,
          data: { affectedResourceCount: 0, affectedKnowledgeBlockCount: 0 },
        });
        return;
      }

      if (position === 'inside') {
        affectedKnowledgeBlockCount = getKnowledgeBlockRelationCount(
          context,
          targetNode.key,
        );
        if (affectedKnowledgeBlockCount > 0) {
          res.send({
            success: false,
            message: `目标末级节点已关联 ${affectedKnowledgeBlockCount} 个知识块，不能接收其他节点。请先在知识块新建或编辑功能中调整关联。`,
            data: {
              affectedResourceCount: 0,
              affectedKnowledgeBlockCount,
            },
          });
          return;
        }
      }

      affectedKnowledgeBlockCount = getKnowledgeBlockRelationCount(
        context,
        sourceNode.key,
      );
    }

    if (context.targetType === 'review') {
      if (!['before', 'after', 'inside'].includes(position)) {
        res.send({
          success: false,
          message: '移动位置无效',
          data: { affectedResourceCount: 0 },
        });
        return;
      }
      if (sourceNodeId === targetNodeId) {
        res.send({
          success: false,
          message: '不能将资源树节点移动到自身',
          data: { affectedResourceCount: 0 },
        });
        return;
      }
      if (isTreeDescendant(knowledgePoints, sourceNodeId, targetNodeId)) {
        res.send({
          success: false,
          message: '不能将资源树节点移动到其后代节点',
          data: { affectedResourceCount: 0 },
        });
        return;
      }

      const sourceNode = findTreeNode(knowledgePoints, sourceNodeId);
      const targetNode = findTreeNode(knowledgePoints, targetNodeId);
      if (!sourceNode || !targetNode) {
        res.send({
          success: false,
          message: '源节点或目标节点不存在，不能跨学科移动',
          data: { affectedResourceCount: 0 },
        });
        return;
      }
      if (
        sourceNode.subject !== context.subject ||
        targetNode.subject !== context.subject
      ) {
        res.send({
          success: false,
          message: '资源树节点只能在当前学科树内移动',
          data: { affectedResourceCount: 0 },
        });
        return;
      }

      const destinationSiblings =
        position === 'inside'
          ? targetNode.children || []
          : findTreeParentList(knowledgePoints, targetNodeId);
      const duplicateValidation = validateTreeNodeTitle(
        destinationSiblings,
        sourceNode.title,
        sourceNodeId,
      );
      if (!duplicateValidation.valid) {
        res.send({
          success: false,
          message:
            duplicateValidation.message === '同级已存在同名节点'
              ? `新父节点下已存在同名节点「${sourceNode.title}」，原结构保持不变`
              : duplicateValidation.message,
          data: { affectedResourceCount: 0 },
        });
        return;
      }

      if (position === 'inside') {
        const referenceDependency = getReviewReferenceDependency([
          targetNode.key,
        ]);
        if (referenceDependency.affectedPlatformTemplateCount > 0) {
          res.send({
            success: false,
            message: `目标末级节点已被 ${referenceDependency.affectedPlatformTemplateCount} 个平台教学计划模板引用，不能接收其他节点。请先处理模板引用。`,
            data: { affectedResourceCount: 0, ...referenceDependency },
          });
          return;
        }
        if (referenceDependency.affectedTeacherTeachingTaskCount > 0) {
          res.send({
            success: false,
            message: `目标末级节点已被 ${referenceDependency.affectedTeacherTeachingTaskCount} 个教师教学任务引用，不能接收其他节点。请先处理教师任务引用。`,
            data: { affectedResourceCount: 0, ...referenceDependency },
          });
          return;
        }
        const targetDependency = getReviewResourceDependency(
          context,
          targetNode,
          false,
        );
        if (targetDependency.affectedResourceCount > 0) {
          res.send({
            success: false,
            message: `目标末级节点已有 ${targetDependency.affectedResourceCount} 份正式资源，不能接收其他节点。请先在资产中心调整相关资源归属。`,
            data: targetDependency,
          });
          return;
        }
      }

      affectedResourceCount = getReviewResourceDependency(
        context,
        sourceNode,
        true,
      ).affectedResourceCount;
    }

    const result = moveTreeNode(
      knowledgePoints,
      sourceNodeId,
      targetNodeId,
      position as TreeMovePosition,
      'Knowledge node',
    );
    res.send({
      ...result,
      data: {
        affectedResourceCount: result.success ? affectedResourceCount : 0,
        affectedKnowledgeBlockCount: result.success
          ? affectedKnowledgeBlockCount
          : 0,
      },
    });
  },

  // Resource references（教学计划/任务固定版本引用契约探针）
  'GET /api/resource-references': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const resourceId =
      typeof req.query.resourceId === 'string'
        ? req.query.resourceId.trim()
        : '';
    const consumerType =
      typeof req.query.consumerType === 'string'
        ? req.query.consumerType.trim()
        : '';
    const consumerId =
      typeof req.query.consumerId === 'string'
        ? req.query.consumerId.trim()
        : '';
    if (
      consumerType &&
      consumerType !== 'teachingPlan' &&
      consumerType !== 'teachingTask'
    ) {
      res.send({ success: false, message: '业务引用消费者类型无效' });
      return;
    }

    const references = getResourceReferencesBySubject(context.subject).filter(
      (reference) =>
        (!resourceId || reference.resourceId === resourceId) &&
        (!consumerType || reference.consumer.type === consumerType) &&
        (!consumerId || reference.consumer.id === consumerId),
    );
    res.send({
      success: true,
      data: references.map(cloneResourceReference),
    });
  },
  'POST /api/resource-references': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const body = req.body || {};
    const acceptedFields = new Set([
      'subject',
      'resourceId',
      'versionId',
      'consumer',
    ]);
    if (Object.keys(body).some((field) => !acceptedFields.has(field))) {
      res.send({
        success: false,
        message: '业务引用只接受消费者、逻辑资源与具体版本身份',
      });
      return;
    }
    const resourceId =
      typeof body.resourceId === 'string' ? body.resourceId.trim() : '';
    const versionId =
      typeof body.versionId === 'string' ? body.versionId.trim() : '';
    const consumer = body.consumer;
    const consumerFieldsValid =
      consumer &&
      typeof consumer === 'object' &&
      !Array.isArray(consumer) &&
      Object.keys(consumer).every((field) =>
        ['type', 'id', 'name'].includes(field),
      );
    const consumerType = consumerFieldsValid ? consumer.type : undefined;
    const consumerId =
      consumerFieldsValid && typeof consumer.id === 'string'
        ? consumer.id.trim()
        : '';
    const consumerName =
      consumerFieldsValid && typeof consumer.name === 'string'
        ? consumer.name.trim()
        : '';
    if (
      !resourceId ||
      !versionId ||
      (consumerType !== 'teachingPlan' && consumerType !== 'teachingTask') ||
      !consumerId ||
      !consumerName
    ) {
      res.send({
        success: false,
        message: '请提供有效的消费者、逻辑资源与具体版本身份',
      });
      return;
    }

    const resource = getResourcesByContext(context).find(
      (item) => item.id === resourceId && item.subject === context.subject,
    );
    if (!resource) {
      res.send({ success: false, message: '资源不存在' });
      return;
    }
    synchronizeResourceSemantics(resource);
    if (!resource.canCreateReference) {
      res.send({
        success: false,
        code:
          resource.status === 'archived'
            ? RESOURCE_REFERENCE_ERROR_CODES.archived
            : RESOURCE_REFERENCE_ERROR_CODES.notListed,
        message:
          resource.status === 'archived'
            ? '已归档资源不能新增业务引用；已有固定版本引用仍可访问'
            : '只有已上架资源可以新增业务引用',
      });
      return;
    }
    const version = resource.versions.find(
      (candidate) =>
        candidate.id === versionId && candidate.resourceId === resource.id,
    );
    if (!version) {
      res.send({ success: false, message: '所选具体版本不属于该资源' });
      return;
    }
    if (!version.activatedAt) {
      res.send({
        success: false,
        message: '待生效版本尚未进入平台浏览语义，不能创建业务引用',
      });
      return;
    }

    const references = getResourceReferencesBySubject(context.subject);
    const duplicatedReference = references.find(
      (reference) =>
        reference.resourceId === resource.id &&
        reference.consumer.type === consumerType &&
        reference.consumer.id === consumerId,
    );
    if (duplicatedReference) {
      res.send({
        success: false,
        code: RESOURCE_REFERENCE_ERROR_CODES.duplicated,
        message: '该业务对象已引用此逻辑资源，不能重复创建',
        data: cloneResourceReference(duplicatedReference),
      });
      return;
    }

    resourceReferenceSequence += 1;
    const createdAt = new Date().toISOString();
    const reference = freezeResourceReference({
      id: `ref-${context.subject}-${Date.now()}-${resourceReferenceSequence}`,
      subject: context.subject,
      resourceId: resource.id,
      versionId: version.id,
      consumer: {
        type: consumerType,
        id: consumerId,
        name: consumerName,
      },
      createdAt,
      createdBy: { ...CURRENT_MOCK_RESOURCE_CREATOR },
    });
    references.push(reference);
    synchronizeResourceSemantics(resource);
    res.send({
      success: true,
      message: `业务引用已固定到 V${version.versionNumber}`,
      data: cloneResourceReference(reference),
    });
  },
  'GET /api/resource-references/resolve': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    if (!id) {
      res.send({ success: false, message: '请选择要解析的业务引用' });
      return;
    }
    const reference = getResourceReferencesBySubject(context.subject).find(
      (candidate) => candidate.id === id,
    );
    if (!reference) {
      res.send({ success: false, message: '业务引用不存在' });
      return;
    }
    const resource = getResourcesByContext(context).find(
      (item) => item.id === reference.resourceId,
    );
    const version = resource?.versions.find(
      (candidate) => candidate.id === reference.versionId,
    );
    if (!resource || !version) {
      res.send({
        success: false,
        message: '固定版本引用数据损坏，无法解析',
      });
      return;
    }

    // 不检查资源当前状态或 currentVersionId：归档与版本切换不能破坏历史引用。
    res.send({
      success: true,
      data: {
        reference: cloneResourceReference(reference),
        resource: toReferenceResourceIdentity(resource),
        version: cloneResourceVersion(version),
      },
    });
  },
  'GET /api/platform-resources/resolve': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const resourceId =
      typeof req.query.resourceId === 'string'
        ? req.query.resourceId.trim()
        : '';
    if (!resourceId) {
      res.send({ success: false, message: '请选择平台资源' });
      return;
    }
    const resource = getResourcesByContext(context).find(
      (item) => item.id === resourceId,
    );
    if (!resource) {
      res.send({ success: false, message: '资源不存在' });
      return;
    }
    synchronizeResourceSemantics(resource);
    if (!resource.isVisible) {
      res.send({
        success: false,
        code: RESOURCE_REFERENCE_ERROR_CODES.notVisible,
        message: '平台资源库只能浏览已上架资源',
      });
      return;
    }

    res.send({
      success: true,
      data: {
        resource: toReferenceResourceIdentity(resource),
        versionId: resource.currentVersionId,
        version: cloneResourceVersion(resource.currentVersion),
      },
    });
  },

  // Asset Center（资产中心正式资源）
  'GET /api/resources': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const filterValidation = validateResourceListFilters(context, req.query);
    if (!filterValidation.valid) {
      res.send({ success: false, message: filterValidation.message });
      return;
    }
    const resources = filterResources(
      getResourcesByContext(context).map(synchronizeResourceSemantics),
      filterValidation.filters,
    );
    res.send({
      success: true,
      data: resources.map(toResourceSummary),
    });
  },
  'GET /api/resources/detail': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    if (!id) {
      res.send({ success: false, message: '请选择要查看的资源' });
      return;
    }

    const item = getResourcesByContext(context).find(
      (resource) => resource.id === id && resource.subject === context.subject,
    );
    if (!item) {
      res.send({ success: false, message: '资源不存在' });
      return;
    }
    res.send({ success: true, data: toResourceDetail(item) });
  },
  'GET /api/resources/operations': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    if (!id) {
      res.send({ success: false, message: '请选择要查询操作记录的资源' });
      return;
    }

    // 初始化种子聚合及其操作账本；删除后的资源无需仍存在于聚合中。
    getResourcesByContext(context);
    const records = getResourceOperationRecords(context.subject, id);
    if (!records.length) {
      res.send({ success: false, message: '资源操作记录不存在' });
      return;
    }
    res.send({ success: true, data: records });
  },
  'POST /api/resources': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const body = req.body || {};
    const { name, type, originalFileName, nodeId } = body;
    if (
      body.status !== undefined ||
      body.isVisible !== undefined ||
      body.canCreateReference !== undefined ||
      body.referenceCount !== undefined ||
      body.canDelete !== undefined ||
      body.hardDeleteBlockedReason !== undefined ||
      body.operationRecords !== undefined ||
      body.currentVersion !== undefined ||
      body.currentVersionId !== undefined ||
      body.versions !== undefined ||
      body.versionCount !== undefined ||
      body.pendingVersionCount !== undefined
    ) {
      res.send({
        success: false,
        message:
          '新资源固定创建为未上架、零引用的 V1，不能指定生命周期或版本字段',
      });
      return;
    }
    const acceptedFields = new Set([
      'name',
      'type',
      'originalFileName',
      'nodeId',
      'subject',
    ]);
    if (Object.keys(body).some((field) => !acceptedFields.has(field))) {
      res.send({
        success: false,
        message: '附件资源载体只能由原始文件名推导，不能指定额外内容或载体字段',
      });
      return;
    }

    const nameValidation = validateResourceName(name);
    if (!nameValidation.valid) {
      res.send({ success: false, message: nameValidation.message });
      return;
    }
    if (!isAttachmentResourceType(type)) {
      res.send({
        success: false,
        message:
          type === 'studyGuide' || type === 'homework'
            ? '学案和作业不能通过附件上传创建'
            : '请选择有效的附件资源类型',
      });
      return;
    }

    const ownershipValidation = validateResourceOwnership(context, nodeId);
    if (!ownershipValidation.valid || !ownershipValidation.nodeId) {
      res.send({ success: false, message: ownershipValidation.message });
      return;
    }

    if (typeof originalFileName !== 'string' || !originalFileName.trim()) {
      res.send({ success: false, message: '请选择一个资源文件' });
      return;
    }
    const normalizedOriginalFileName = originalFileName.trim();
    const carrierType = inferAttachmentCarrierType(normalizedOriginalFileName);
    if (
      !carrierType ||
      !isAttachmentFileCompatible(type, normalizedOriginalFileName)
    ) {
      res.send({
        success: false,
        message:
          type === 'courseware'
            ? '课件仅支持 .ppt 或 .pptx 文件'
            : '其他类型仅支持 .pdf、.mp3 或 .mp4 文件',
      });
      return;
    }

    const resources = getResourcesByContext(context);
    const duplicatedResource = resources.find(
      (resource) =>
        resource.nodeId === ownershipValidation.nodeId &&
        resource.type === type &&
        resource.name.trim() === nameValidation.name,
    );
    if (duplicatedResource) {
      res.send({
        success: false,
        code: RESOURCE_NAME_CONFLICT_CODE,
        message:
          duplicatedResource.status === 'archived'
            ? '该末级节点下已有同类型、同名称的已归档资源，请上传为新版本；成功后将原子恢复为未上架'
            : '该末级节点下已存在同类型、同名称资源，请在已有资源中上传新版本',
        data: toResourceSummary(duplicatedResource),
      });
      return;
    }

    resourceSequence += 1;
    const resourceId = `res-${
      context.subject
    }-${Date.now()}-${resourceSequence}`;
    const versionId = `${resourceId}-v1`;
    const createdAt = new Date().toISOString();
    const currentVersion: MockResourceVersion = {
      id: versionId,
      resourceId,
      versionNumber: 1,
      carrierType,
      originalFileName: normalizedOriginalFileName,
      createdAt,
      createdBy: { ...CURRENT_MOCK_RESOURCE_CREATOR },
      state: 'current',
      activatedAt: createdAt,
    };
    const item: MockResourceItem = {
      id: resourceId,
      name: nameValidation.name,
      type,
      subject: context.subject,
      nodeId: ownershipValidation.nodeId,
      status: 'unlisted',
      isVisible: false,
      canCreateReference: false,
      referenceCount: 0,
      canDelete: true,
      hardDeleteBlockedReason: null,
      currentVersionId: versionId,
      currentVersion,
      versions: [currentVersion],
      versionCount: 1,
      pendingVersionCount: 0,
      updatedAt: createdAt,
    };

    // 单次写入完整聚合，Mock 中不存在未归属或无初始版本的中间记录。
    resources.push(item);
    appendResourceOperation({
      resourceId,
      subject: context.subject,
      action: 'upload',
      occurredAt: createdAt,
      summary: `上传“${item.name}”并生成当前版本 V1`,
      changes: [
        { label: '当前版本', after: 'V1' },
        {
          label: '初始归属',
          after: getReviewNodePathSnapshot(context, item.nodeId),
        },
        { label: '资源状态', after: '未上架' },
      ],
    });
    res.send({
      success: true,
      message: '附件资源上传成功',
      data: toResourceSummary(item),
    });
  },
  'POST /api/resources/versions': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const body = req.body || {};
    const acceptedFields = new Set([
      'resourceId',
      'subject',
      'originalFileName',
    ]);
    if (Object.keys(body).some((field) => !acceptedFields.has(field))) {
      res.send({
        success: false,
        message:
          '新增版本仅接受资源身份和新文件，不能修改资源类型、归属、状态或当前版本',
      });
      return;
    }

    const resourceId =
      typeof body.resourceId === 'string' ? body.resourceId.trim() : '';
    if (!resourceId) {
      res.send({ success: false, message: '请选择要新增版本的资源' });
      return;
    }
    const resources = getResourcesByContext(context);
    const itemIndex = resources.findIndex(
      (resource) =>
        resource.id === resourceId && resource.subject === context.subject,
    );
    if (itemIndex < 0) {
      res.send({ success: false, message: '资源不存在' });
      return;
    }
    const item = resources[itemIndex]!;
    if (!isAttachmentResourceType(item.type)) {
      res.send({
        success: false,
        message: '组合型资源不能通过附件上传新增版本',
      });
      return;
    }

    const originalFileName =
      typeof body.originalFileName === 'string'
        ? body.originalFileName.trim()
        : '';
    if (!originalFileName) {
      res.send({ success: false, message: '请选择一个新版本文件' });
      return;
    }
    const carrierType = inferAttachmentCarrierType(originalFileName);
    if (
      !carrierType ||
      !isAttachmentFileCompatible(item.type, originalFileName)
    ) {
      res.send({
        success: false,
        message:
          item.type === 'courseware'
            ? '课件新版本仅支持 .ppt 或 .pptx 文件'
            : '其他类型新版本仅支持 .pdf、.mp3 或 .mp4 文件',
      });
      return;
    }

    const versionNumber =
      Math.max(...item.versions.map((version) => version.versionNumber)) + 1;
    const createdAt = new Date().toISOString();
    const version: MockResourceVersion = {
      id: `${item.id}-v${versionNumber}`,
      resourceId: item.id,
      versionNumber,
      carrierType,
      originalFileName,
      createdAt,
      createdBy: { ...CURRENT_MOCK_RESOURCE_CREATOR },
      state: 'pending',
    };
    const unchangedCurrentVersionId = item.currentVersionId;
    const restoresArchivedResource = item.status === 'archived';
    const nextItem = synchronizeResourceSemantics({
      ...item,
      status: restoresArchivedResource ? 'unlisted' : item.status,
      versions: [...item.versions.map(cloneResourceVersion), version],
      updatedAt: createdAt,
    });

    if (nextItem.currentVersionId !== unchangedCurrentVersionId) {
      throw new Error('Creating a version changed the current version');
    }

    // 所有校验和聚合派生完成后再替换目标资源：新增版本与归档恢复同次生效，
    // 且不会遍历或改写同一学科下其他资源的生命周期。
    resources[itemIndex] = nextItem;
    appendResourceOperation({
      resourceId: item.id,
      subject: context.subject,
      action: 'uploadVersion',
      occurredAt: createdAt,
      summary: `上传“${originalFileName}”并生成待生效版本 V${versionNumber}`,
      changes: [{ label: '新增版本', after: `V${versionNumber}` }],
    });
    if (restoresArchivedResource) {
      appendResourceOperation({
        resourceId: item.id,
        subject: context.subject,
        action: 'restore',
        occurredAt: createdAt,
        summary: '上传新版本时原子恢复资源；已有固定版本引用保持不变',
        changes: [{ label: '资源状态', before: '已归档', after: '未上架' }],
      });
    }
    res.send({
      success: true,
      message: restoresArchivedResource
        ? `V${versionNumber} 已创建为待生效版本，资源已恢复为未上架，当前版本保持不变`
        : `V${versionNumber} 已创建为待生效版本，当前版本保持不变`,
      data: toResourceDetail(nextItem),
    });
  },
  'PUT /api/resources/versions/activate': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const body = req.body || {};
    const acceptedFields = new Set(['resourceId', 'versionId', 'subject']);
    if (Object.keys(body).some((field) => !acceptedFields.has(field))) {
      res.send({
        success: false,
        message:
          '版本生效仅接受资源与版本身份，不能修改资源资料、归属或生命周期',
      });
      return;
    }

    const resourceId =
      typeof body.resourceId === 'string' ? body.resourceId.trim() : '';
    const versionId =
      typeof body.versionId === 'string' ? body.versionId.trim() : '';
    if (!resourceId || !versionId) {
      res.send({ success: false, message: '请选择要生效的资源版本' });
      return;
    }
    const resources = getResourcesByContext(context);
    const itemIndex = resources.findIndex(
      (resource) =>
        resource.id === resourceId && resource.subject === context.subject,
    );
    if (itemIndex < 0) {
      res.send({ success: false, message: '资源不存在' });
      return;
    }
    const item = synchronizeResourceSemantics(resources[itemIndex]!);
    const version = item.versions.find(
      (candidate) =>
        candidate.id === versionId && candidate.resourceId === item.id,
    );
    if (!version) {
      res.send({ success: false, message: '资源版本不存在' });
      return;
    }
    if (!isResourceVersionCompatible(item.type, version)) {
      res.send({
        success: false,
        message: '资源版本文件类型与资源类型不匹配，不能生效',
      });
      return;
    }
    if (item.currentVersionId === version.id) {
      res.send({
        success: false,
        message: `V${version.versionNumber} 已是当前版本`,
      });
      return;
    }

    const versionCount = item.versions.length;
    const status = item.status;
    const previousCurrentVersion = item.currentVersion;
    const isRollback =
      version.state === 'historical' &&
      version.versionNumber < previousCurrentVersion.versionNumber;
    const activatedAt = new Date().toISOString();
    const nextVersions = item.versions.map(cloneResourceVersion);
    const nextVersion = nextVersions.find(
      (candidate) => candidate.id === version.id,
    )!;
    nextVersion.activatedAt = activatedAt;
    const nextItem = synchronizeResourceSemantics({
      ...item,
      currentVersionId: nextVersion.id,
      versions: nextVersions,
      updatedAt: activatedAt,
    });
    if (
      nextItem.versions.length !== versionCount ||
      nextItem.status !== status
    ) {
      throw new Error('Activating a version changed stable resource data');
    }

    // 附件与在线组合正式版本共用同一切换语义：不复制、不删除版本，
    // 当前版本转历史，待生效或历史版本成为新的 current。
    resources[itemIndex] = nextItem;
    appendResourceOperation({
      resourceId: item.id,
      subject: context.subject,
      action: isRollback ? 'rollbackVersion' : 'activateVersion',
      occurredAt: activatedAt,
      summary: isRollback
        ? `当前版本由 V${previousCurrentVersion.versionNumber} 回退到 V${version.versionNumber}`
        : `V${version.versionNumber} 设为当前生效版本`,
      changes: [
        {
          label: '当前版本',
          before: `V${previousCurrentVersion.versionNumber}`,
          after: `V${version.versionNumber}`,
        },
      ],
    });
    res.send({
      success: true,
      message: `V${version.versionNumber} 已设为当前生效版本`,
      data: toResourceDetail(nextItem),
    });
  },
  'PUT /api/resources/ownership': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const body = req.body || {};
    const { id, targetNodeId } = body;
    const acceptedFields = new Set(['id', 'subject', 'targetNodeId']);
    if (Object.keys(body).some((field) => !acceptedFields.has(field))) {
      res.send({
        success: false,
        message: '归属调整仅接受资源身份和目标末级节点',
      });
      return;
    }
    const resources = getResourcesByContext(context);
    const item = resources.find((resource) => resource.id === id);
    if (!item || item.subject !== context.subject) {
      res.send({
        success: false,
        message: '资源不属于当前学科，不能跨学科调整归属',
      });
      return;
    }

    const ownershipValidation = validateResourceOwnership(
      context,
      targetNodeId,
    );
    if (!ownershipValidation.valid || !ownershipValidation.nodeId) {
      res.send({ success: false, message: ownershipValidation.message });
      return;
    }
    if (
      hasDuplicatedResourceName(resources, {
        name: item.name.trim(),
        type: item.type,
        nodeId: ownershipValidation.nodeId,
        excludeId: item.id,
      })
    ) {
      res.send({
        success: false,
        message: '目标节点下已存在同类型、同名称的资源，无法调整归属',
      });
      return;
    }
    if (
      item.type === 'studyGuide' &&
      resources.some(
        (resource) =>
          resource.type === 'studyGuide' &&
          resource.nodeId === ownershipValidation.nodeId &&
          resource.id !== item.id,
      )
    ) {
      res.send({
        success: false,
        message: '一个资源树末级节点只绑定一份学案，目标节点已有学案',
      });
      return;
    }

    if (item.nodeId === ownershipValidation.nodeId) {
      res.send({
        success: true,
        message: '资源已归属该末级节点，无需调整',
        data: toResourceSummary(item),
      });
      return;
    }

    const previousNodeId = item.nodeId;
    const previousNodePath = getReviewNodePathSnapshot(context, previousNodeId);
    const targetNodePath = getReviewNodePathSnapshot(
      context,
      ownershipValidation.nodeId,
    );
    // 所有校验通过后一次替换 nodeId；不存在先清空再写入的中间状态。
    item.nodeId = ownershipValidation.nodeId;
    item.updatedAt = new Date().toISOString();
    // 学案课时自动同步：新节点取学案课时，原节点恢复默认课时。
    if (item.type === 'studyGuide') {
      syncReviewNodeClassHours(context.subject, previousNodeId);
      syncReviewNodeClassHours(
        context.subject,
        ownershipValidation.nodeId,
        item.classHours,
      );
    }
    appendResourceOperation({
      resourceId: item.id,
      subject: context.subject,
      action: 'adjustOwnership',
      occurredAt: item.updatedAt,
      summary: `资源归属由“${previousNodePath}”调整为“${targetNodePath}”`,
      changes: [
        { label: '归属节点', before: previousNodePath, after: targetNodePath },
      ],
    });
    res.send({
      success: true,
      message: '资源归属调整成功',
      data: toResourceSummary(item),
    });
  },
  'PUT /api/resources/lifecycle': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const body = req.body || {};
    const { id, action } = body;
    const acceptedFields = new Set(['id', 'subject', 'action']);
    if (Object.keys(body).some((field) => !acceptedFields.has(field))) {
      res.send({
        success: false,
        message: '生命周期转换仅接受资源身份和合法动作',
      });
      return;
    }
    if (!isResourceLifecycleAction(action)) {
      res.send({ success: false, message: '资源生命周期动作无效' });
      return;
    }

    const resources = getResourcesByContext(context);
    const item = resources.find((resource) => resource.id === id);
    if (!item || item.subject !== context.subject) {
      res.send({ success: false, message: '资源不存在' });
      return;
    }

    const nextStatus = RESOURCE_LIFECYCLE_TRANSITIONS[item.status][action];
    if (!nextStatus) {
      res.send({
        success: false,
        message: `${RESOURCE_STATUS_LABELS[item.status]}资源不能执行“${
          RESOURCE_LIFECYCLE_ACTION_LABELS[action]
        }”操作`,
      });
      return;
    }

    const previousStatus = item.status;
    item.status = nextStatus;
    item.updatedAt = new Date().toISOString();
    synchronizeResourceSemantics(item);
    appendResourceOperation({
      resourceId: item.id,
      subject: context.subject,
      action,
      occurredAt: item.updatedAt,
      summary:
        action === 'archive'
          ? '资源归档，停止平台展示与新增引用；已有固定版本引用继续可访问'
          : action === 'restore'
          ? '资源恢复为未上架，需重新上架后才可展示和新增引用'
          : action === 'list'
          ? '资源上架，平台资源库开始使用当前生效版本'
          : '资源下架，停止平台展示与新增引用',
      changes: [
        {
          label: '资源状态',
          before: RESOURCE_STATUS_LABELS[previousStatus],
          after: RESOURCE_STATUS_LABELS[nextStatus],
        },
      ],
    });
    res.send({
      success: true,
      message: `资源${RESOURCE_LIFECYCLE_ACTION_LABELS[action]}成功`,
      data: toResourceSummary(item),
    });
  },
  'PUT /api/resources': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const body = req.body || {};
    const { id } = body;
    const resources = getResourcesByContext(context);
    const item = resources.find((resource) => resource.id === id);
    if (!item || item.subject !== context.subject) {
      res.send({ success: false, message: '资源不存在' });
      return;
    }
    if (body.type !== undefined) {
      res.send({ success: false, message: '资源类型创建后不可修改' });
      return;
    }
    if (body.nodeId !== undefined || body.targetNodeId !== undefined) {
      res.send({
        success: false,
        message: '资源归属只能通过原子归属调整操作修改',
      });
      return;
    }
    if (
      body.originalFileName !== undefined ||
      body.fileName !== undefined ||
      body.currentVersion !== undefined ||
      body.currentVersionId !== undefined ||
      body.versions !== undefined ||
      body.versionCount !== undefined ||
      body.pendingVersionCount !== undefined ||
      body.versionId !== undefined
    ) {
      res.send({ success: false, message: '当前版本不能通过资料编辑修改' });
      return;
    }
    if (
      body.status !== undefined ||
      body.isVisible !== undefined ||
      body.canCreateReference !== undefined ||
      body.referenceCount !== undefined ||
      body.canDelete !== undefined ||
      body.hardDeleteBlockedReason !== undefined ||
      body.operationRecords !== undefined
    ) {
      res.send({
        success: false,
        message: '资源状态、可见性与引用信息不能通过资料编辑修改',
      });
      return;
    }
    const acceptedFields = new Set(['id', 'name', 'subject']);
    if (Object.keys(body).some((field) => !acceptedFields.has(field))) {
      res.send({
        success: false,
        message:
          '资源资料编辑仅接受资源身份与名称，正式内容必须通过新增版本与生效流程变更',
      });
      return;
    }

    const currentOwnershipValidation = validateResourceOwnership(
      context,
      item.nodeId,
    );
    if (!currentOwnershipValidation.valid) {
      res.send({ success: false, message: '资源当前归属节点无效，无法更新' });
      return;
    }
    const nameValidation = validateResourceName(body.name);
    if (!nameValidation.valid) {
      res.send({ success: false, message: nameValidation.message });
      return;
    }
    if (
      hasDuplicatedResourceName(resources, {
        name: nameValidation.name,
        type: item.type,
        nodeId: item.nodeId,
        excludeId: item.id,
      })
    ) {
      res.send({
        success: false,
        message: '该末级节点下已存在同类型、同名称的资源',
      });
      return;
    }

    const previousName = item.name;
    item.name = nameValidation.name;
    item.updatedAt = new Date().toISOString();
    if (previousName !== item.name) {
      appendResourceOperation({
        resourceId: item.id,
        subject: context.subject,
        action: 'rename',
        occurredAt: item.updatedAt,
        summary: `资源名称由“${previousName}”修改为“${item.name}”`,
        changes: [
          { label: '资源名称', before: previousName, after: item.name },
        ],
      });
    }
    res.send({
      success: true,
      message: '资源信息更新成功',
      data: toResourceSummary(item),
    });
  },
  'DELETE /api/resources': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    if (!id) {
      res.send({ success: false, message: '请选择要彻底删除的资源' });
      return;
    }

    const resources = getResourcesByContext(context);
    const itemIndex = resources.findIndex(
      (item) => item.id === id && item.subject === context.subject,
    );
    if (itemIndex < 0) {
      res.send({ success: false, message: '资源不存在' });
      return;
    }

    const item = synchronizeResourceSemantics(resources[itemIndex]!);
    if (!item.canDelete) {
      res.send({
        success: false,
        code: RESOURCE_HAS_REFERENCES_CODE,
        message:
          item.hardDeleteBlockedReason ||
          `该资源已有 ${item.referenceCount} 个业务引用，不能彻底删除`,
        data: {
          resourceId: item.id,
          referenceCount: item.referenceCount,
          reason: item.hardDeleteBlockedReason,
        },
      });
      return;
    }

    const deletedAt = new Date().toISOString();
    const deletionRecord = appendResourceOperation({
      resourceId: item.id,
      subject: context.subject,
      action: 'delete',
      occurredAt: deletedAt,
      summary: `“${item.name}”无业务引用，已彻底删除资源身份及全部正式版本`,
      changes: [
        { label: '资源名称', before: item.name },
        {
          label: '当前版本',
          before: `V${item.currentVersion.versionNumber}`,
        },
        {
          label: '删除版本数',
          before: String(item.versions.length),
          after: '0',
        },
      ],
    });
    resources.splice(itemIndex, 1);
    // 学案删除后，原节点的课时恢复默认（资源树课时由学案绑定自动带）。
    if (item.type === 'studyGuide') {
      syncReviewNodeClassHours(context.subject, item.nodeId);
    }
    res.send({
      success: true,
      message: '资源已彻底删除；删除记录已保留',
      data: {
        resourceId: item.id,
        deletedAt,
        operationRecordId: deletionRecord.id,
      },
    });
  },

  // Question Type CRUD
  'GET /api/tags/question-type-tree': (req: Request, res: Response) => {
    const context = getQuestionTypeContext(req);
    res.send({
      success: true,
      data: getQuestionTypeTreeByContext(context),
    });
  },
  'POST /api/tags/question-type-node': (req: Request, res: Response) => {
    const { parentId, title, description, answerCardType, answerArea } =
      req.body;
    const context = getQuestionTypeContext(req);
    const questionTypeTree = getQuestionTypeTreeByContext(context);
    const nodeId = createQuestionTypeNodeKey(context);
    const newNode: MockQuestionTypeNode = {
      title,
      key: nodeId,
      subject: context.subject,
      description,
      children: [],
    };

    let added = false;
    if (parentId) {
      const parentNode = findQuestionTypeNode(questionTypeTree, parentId);
      const parentLevel = getQuestionTypeNodeLevel(questionTypeTree, parentId);

      if (!parentNode || !parentLevel) {
        res.send({ success: false, message: 'Parent question type not found' });
        return;
      }

      if (parentLevel >= MAX_QUESTION_TYPE_LEVEL) {
        res.send({
          success: false,
          message: `题型最多支持 ${MAX_QUESTION_TYPE_LEVEL} 层结构`,
        });
        return;
      }

      if (!parentNode.children) parentNode.children = [];
      if (shouldQuestionTypeNeedAnswerArea(parentNode.answerCardType)) {
        newNode.answerArea = normalizeQuestionTypeAnswerArea(answerArea);
      }
      parentNode.children.push(newNode);
      added = true;
    } else {
      newNode.answerCardType = normalizeQuestionTypeAnswerCardType(
        answerCardType,
        title,
        nodeId,
      );
      questionTypeTree.push(newNode);
      added = true;
    }

    if (!added) {
      res.send({ success: false, message: 'Parent question type not found' });
      return;
    }
    res.send({ success: true, message: 'Question Type created successfully' });
  },
  'PUT /api/tags/question-type-node': (req: Request, res: Response) => {
    const { id, title, description, answerCardType, answerArea } = req.body;
    const context = getQuestionTypeContext(req);
    const scopedTree = getQuestionTypeTreeByContext(context);
    const updateLevel = getQuestionTypeNodeLevel(scopedTree, id);
    const updateNode = (
      nodes: MockQuestionTypeNode[],
      parentNode?: MockQuestionTypeNode,
    ) => {
      for (const node of nodes) {
        if (node.key === id) {
          node.title = title;
          node.description = description;
          if (updateLevel === 1) {
            node.answerCardType = normalizeQuestionTypeAnswerCardType(
              answerCardType || node.answerCardType,
              title,
              id,
            );
            delete node.answerArea;
          } else {
            delete node.answerCardType;
            if (shouldQuestionTypeNeedAnswerArea(parentNode?.answerCardType)) {
              node.answerArea = normalizeQuestionTypeAnswerArea(
                answerArea || node.answerArea,
              );
            } else {
              delete node.answerArea;
            }
          }
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (updateNode(node.children, node)) return true;
        }
      }
      return false;
    };
    const updated = updateNode(scopedTree);
    res.send({
      success: updated,
      message: updated
        ? 'Question Type updated successfully'
        : 'Question Type not found',
    });
  },
  'DELETE /api/tags/question-type-node': (req: Request, res: Response) => {
    const { id } = req.query;
    const context = getQuestionTypeContext(req);
    const scopedTree = getQuestionTypeTreeByContext(context);
    const deleteNode = (nodes: MockQuestionTypeNode[]) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node) continue;
        if (node.key === id) {
          nodes.splice(i, 1);
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (deleteNode(node.children)) return true;
        }
      }
      return false;
    };
    const deleted = deleteNode(scopedTree);
    res.send({
      success: deleted,
      message: deleted
        ? 'Question Type deleted successfully'
        : 'Question Type not found',
    });
  },
  'PUT /api/tags/question-type-node/move': (req: Request, res: Response) => {
    const { id, targetId, position } = req.body;
    const context = getQuestionTypeContext(req);
    const scopedTree = getQuestionTypeTreeByContext(context);
    const nodeToMove = findQuestionTypeNode(scopedTree, id);

    if (!nodeToMove) {
      res.send({ success: false, message: 'Question Type not found' });
      return;
    }

    if (id === targetId) {
      res.send({ success: false, message: 'Cannot move node into itself' });
      return;
    }

    if (position !== 'before' && position !== 'after') {
      res.send({
        success: false,
        message: 'Question types can only be reordered at the same level',
      });
      return;
    }

    const targetNode = findQuestionTypeNode(scopedTree, targetId);
    if (!targetNode) {
      res.send({ success: false, message: 'Target question type not found' });
      return;
    }

    const sourceParentList = findQuestionTypeParentList(scopedTree, id);
    const targetParentList = findQuestionTypeParentList(scopedTree, targetId);

    if (
      !sourceParentList ||
      !targetParentList ||
      sourceParentList !== targetParentList
    ) {
      res.send({
        success: false,
        message: 'Question types can only be reordered at the same level',
      });
      return;
    }

    const moved = reorderQuestionTypeNode(
      sourceParentList,
      id,
      targetId,
      position as QuestionTypeDropPosition,
    );

    res.send({
      success: moved,
      message: moved
        ? 'Question Type moved successfully'
        : 'Question Type move failed',
    });
  },

  // Attribute CRUD (Updated to use categoryId)
  'POST /api/tags/attribute': (req: Request, res: Response) => {
    const { categoryId, subject } = req.body;
    const category = getTagCategoryById(categoryId);
    let newTag: MockAttributeItem | undefined;
    if (category) {
      const currentTags = getCategoryOptionList(category, subject);
      const tagPayload = { ...req.body };
      delete tagPayload.categoryId;
      delete tagPayload.grade;
      delete tagPayload.subject;

      newTag = createMockAttributeItem(
        tagPayload as Partial<MockAttributeItem>,
        `${category.id}-${getSubjectKey(subject)}`,
        currentTags.length,
      );
      setCategoryOptionList(category, [...currentTags, newTag], subject);
    }
    res.send({
      success: !!newTag,
      message: newTag ? 'Attribute created successfully' : 'Category not found',
      data: newTag,
    });
  },
  'PUT /api/tags/attribute': (req: Request, res: Response) => {
    const { id, categoryId, subject } = req.body;
    const category = getTagCategoryById(categoryId);
    let updatedTag: MockAttributeItem | undefined;
    if (category) {
      const currentTags = getCategoryOptionList(category, subject);
      const tag = currentTags.find((item) => item.id === id);
      if (tag) {
        const tagPayload = { ...req.body };
        delete tagPayload.id;
        delete tagPayload.categoryId;
        delete tagPayload.grade;
        delete tagPayload.subject;

        mergeDefined(tag, tagPayload as Partial<MockAttributeItem>);
        setCategoryOptionList(category, currentTags, subject);
        updatedTag = tag;
      }
    }
    res.send({
      success: !!updatedTag,
      message: updatedTag
        ? 'Attribute updated successfully'
        : 'Attribute not found',
      data: updatedTag,
    });
  },
  'DELETE /api/tags/attribute': (req: Request, res: Response) => {
    const { id, categoryId, subject } = req.query;
    const category = getTagCategoryById(categoryId);
    if (!category) {
      res.send({ success: false, message: 'Category not found' });
      return;
    }

    const currentTags = getCategoryOptionList(category, subject);
    const targetIndex = currentTags.findIndex((item) => item.id === id);
    if (targetIndex < 0) {
      res.send({ success: false, message: 'Attribute not found' });
      return;
    }

    setCategoryOptionList(
      category,
      currentTags.filter((_, index) => index !== targetIndex),
      subject,
    );
    const deletedOptionId = currentTags[targetIndex].id;
    removeNodeAttributeRelations(
      (relation) =>
        relation.attributeId === category.id &&
        relation.optionId === deletedOptionId,
    );
    res.send({ success: true, message: 'Attribute deleted successfully' });
  },

  'GET /api/tags/attribute-usage-rules': (req: Request, res: Response) => {
    res.send({
      success: true,
      data: [...attributeUsageRules].sort((a, b) => a.sort - b.sort),
    });
  },
  'PUT /api/tags/attribute-usage-rules': (req: Request, res: Response) => {
    const rulesPayload: unknown = req.body?.rules;
    if (!Array.isArray(rulesPayload)) {
      res.send({
        success: false,
        message: 'Invalid usage rules payload',
      });
      return;
    }

    const hasInvalidRule = rulesPayload.some((rule) => {
      if (!rule || typeof rule !== 'object') return true;

      const item = rule as Partial<AttributeUsageRule>;
      if (!item.attributeId || typeof item.attributeId !== 'string') {
        return true;
      }
      if (!isAttributeUsageScene(item.scene)) return true;
      if (typeof item.enabled !== 'boolean') return true;
      return !getTagCategoryById(item.attributeId);
    });

    if (hasInvalidRule) {
      res.send({
        success: false,
        message: 'Invalid usage rule',
      });
      return;
    }

    attributeUsageRules = rulesPayload.map((rule, index) => {
      const item = rule as AttributeUsageRule;
      return {
        ...item,
        id: item.id || `rule-${Date.now()}-${index}`,
        sort: item.sort ?? index,
      };
    });
    res.send({
      success: true,
      message: 'Attribute usage rules updated successfully',
      data: [...attributeUsageRules].sort((a, b) => a.sort - b.sort),
    });
  },

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

    if (
      !isNodeAttributeTargetType(targetType) ||
      !isNonEmptyString(nodeId) ||
      !isNonEmptyString(attributeId) ||
      !isNonEmptyString(optionId)
    ) {
      res.send({
        success: false,
        message: 'Invalid node attribute relation',
      });
      return;
    }

    const category = getTagCategoryById(attributeId);
    const optionExists = Boolean(
      category &&
        category.target === targetType &&
        getCategoryOptionList(category, subject).some(
          (item) => item.id === optionId,
        ),
    );

    if (!category || category.target !== targetType || !optionExists) {
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

  // Textbook API
  'GET /api/tags/textbook-versions': (req: Request, res: Response) => {
    res.send({ success: true, data: textbookVersions });
  },
  'GET /api/tags/textbook-chapters': (req: Request, res: Response) => {
    const { version, subject } = req.query;
    const data = getTextbookChaptersByContext(version, subject);
    res.send({ success: true, data });
  },
  // Textbook Chapter CRUD
  'POST /api/tags/textbook-chapter': (req: Request, res: Response) => {
    const { version, parentId, title, description, subject } = req.body;
    const chapters = getTextbookChaptersByContext(version, subject);
    const siblingNodes = getTreeSiblingListByParentId(chapters, parentId);
    const validation = validateTreeNodeTitle(siblingNodes, title);
    if (!validation.valid) {
      res.send({ success: false, message: validation.message });
      return;
    }

    const newNode = {
      title: validation.title,
      key: `ch-${Date.now()}`,
      description,
      children: [],
    };

    siblingNodes!.push(newNode);
    res.send({ success: true, message: 'Chapter created successfully' });
  },
  'PUT /api/tags/textbook-chapter': (req: Request, res: Response) => {
    const { version, id, title, description, subject } = req.body;
    const chapters = getTextbookChaptersByContext(version, subject);
    const siblingNodes = findTreeParentList(chapters, id);
    const validation = validateTreeNodeTitle(siblingNodes, title, id);
    if (!validation.valid) {
      res.send({ success: false, message: validation.message });
      return;
    }

    const updateNode = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.key === id) {
          node.title = validation.title;
          node.description = description;
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (updateNode(node.children)) return true;
        }
      }
      return false;
    };
    const updated = updateNode(chapters);
    res.send({
      success: updated,
      message: updated ? 'Chapter updated successfully' : 'Chapter not found',
    });
  },
  'DELETE /api/tags/textbook-chapter': (req: Request, res: Response) => {
    const { id, version, subject } = req.query;
    const chapters = getTextbookChaptersByContext(version, subject);
    let deletedNodeKeys = new Set<string>();
    const deleteNode = (nodes: any[]) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.key === id) {
          deletedNodeKeys = collectTreeNodeKeys(node);
          nodes.splice(i, 1);
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (deleteNode(node.children)) return true;
        }
      }
      return false;
    };
    const deleted = deleteNode(chapters);
    if (deleted) {
      removeNodeAttributeRelations(
        (relation) =>
          relation.targetType === 'knowledge' &&
          relation.subject === getSubjectKey(subject) &&
          deletedNodeKeys.has(relation.nodeId),
      );
    }
    res.send({ success: true, message: 'Chapter deleted successfully' });
  },
  'PUT /api/tags/textbook-chapter/move': (req: Request, res: Response) => {
    const { version, id, targetId, position, subject } = req.body;
    const chapters = getTextbookChaptersByContext(version, subject);
    const result = moveTreeNode(
      chapters,
      String(id),
      String(targetId),
      position as TreeMovePosition,
      'Textbook chapter',
    );
    res.send(result);
  },
};
