import { Request, Response } from 'express';

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
type TreeTargetType = NodeAttributeTargetType | 'review';

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
  children?: KnowledgeSeedNode[];
}

interface MockKnowledgeNode {
  id?: string;
  title: string;
  key: string;
  value?: string;
  subject: string;
  description?: string;
  children?: MockKnowledgeNode[];
}

type AttachmentResourceType = 'courseware' | 'extension';
type ResourceType = AttachmentResourceType | 'studyGuide' | 'homework';
type ResourceCarrierType = 'ppt' | 'pdf' | 'audio' | 'video' | 'online';
type ResourceStatus = 'unlisted' | 'listed' | 'archived';

interface MockResourceVersion {
  id: string;
  resourceId: string;
  versionNumber: number;
  carrierType: ResourceCarrierType;
  originalFileName?: string;
  createdAt: string;
}

interface MockResourceItem {
  id: string;
  name: string;
  type: ResourceType;
  subject: string;
  nodeId: string;
  status: ResourceStatus;
  currentVersionId: string;
  currentVersion: MockResourceVersion;
  updatedAt: string;
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

// Mock Data for Review Tree (复习树：前台平台资源库浏览骨架)
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
  value === 'topic' || value === 'knowledge' || value === 'review'
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

const getKnowledgeContextKey = ({ subject }: KnowledgeContext) => subject;

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
    children: node.children
      ? applyKnowledgeScope(node.children, context)
      : undefined,
  }));
};

const knowledgeTreeStore: Record<string, MockKnowledgeNode[]> = {};

const getKnowledgeTreeByContext = (context: KnowledgeContext) => {
  const storeKey = getKnowledgeStoreKey(context);
  if (!knowledgeTreeStore[storeKey]) {
    const templates =
      context.targetType === 'review'
        ? defaultReviewTreeTemplates
        : defaultKnowledgePointTemplates;
    knowledgeTreeStore[storeKey] = applyKnowledgeScope(templates, context);
  }
  return knowledgeTreeStore[storeKey];
};

// --- Mock Data for Assets (资产中心正式资源) ---

const RESOURCE_NAME_MAX_LENGTH = 40;
const resourceStore: Record<string, MockResourceItem[]> = {};
let resourceSequence = 0;

const isResourceType = (value: unknown): value is ResourceType =>
  value === 'courseware' ||
  value === 'extension' ||
  value === 'studyGuide' ||
  value === 'homework';

const isResourceCarrierType = (value: unknown): value is ResourceCarrierType =>
  value === 'ppt' ||
  value === 'pdf' ||
  value === 'audio' ||
  value === 'video' ||
  value === 'online';

const isResourceStatus = (value: unknown): value is ResourceStatus =>
  value === 'unlisted' || value === 'listed' || value === 'archived';

const isAttachmentResourceType = (
  value: unknown,
): value is AttachmentResourceType =>
  value === 'courseware' || value === 'extension';

const inferAttachmentCarrierType = (
  originalFileName: string,
): Exclude<ResourceCarrierType, 'online'> | null => {
  const extension = originalFileName
    .trim()
    .toLowerCase()
    .match(/\.[^.\\/]+$/)?.[0];
  if (extension === '.ppt' || extension === '.pptx') return 'ppt';
  if (extension === '.pdf') return 'pdf';
  if (extension === '.mp3') return 'audio';
  if (extension === '.mp4') return 'video';
  return null;
};

const isAttachmentFileCompatible = (
  type: AttachmentResourceType,
  carrierType: Exclude<ResourceCarrierType, 'online'>,
) =>
  type === 'courseware'
    ? carrierType === 'ppt'
    : carrierType === 'pdf' ||
      carrierType === 'audio' ||
      carrierType === 'video';

const createSeedResource = (data: {
  id: string;
  name: string;
  type: ResourceType;
  subject: string;
  nodeId: string;
  carrierType: ResourceCarrierType;
  originalFileName?: string;
  status?: ResourceStatus;
}): MockResourceItem => {
  const createdAt = '2026-07-26T08:00:00.000Z';
  const currentVersionId = `${data.id}-v1`;
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    subject: data.subject,
    nodeId: data.nodeId,
    status: data.status || 'unlisted',
    currentVersionId,
    currentVersion: {
      id: currentVersionId,
      resourceId: data.id,
      versionNumber: 1,
      carrierType: data.carrierType,
      originalFileName: data.originalFileName,
      createdAt,
    },
    updatedAt: createdAt,
  };
};

const seedResourcesForSubject = (subject: string): MockResourceItem[] => {
  const scoped = (nodeKey: string) => `${nodeKey}-${subject}`;
  return [
    createSeedResource({
      id: `res-${subject}-1`,
      name: '史前时期精品复习课件',
      type: 'courseware',
      originalFileName: '史前时期复习课件.pptx',
      carrierType: 'ppt',
      subject,
      nodeId: scoped('rv-1-1-1'),
      status: 'listed',
    }),
    createSeedResource({
      id: `res-${subject}-2`,
      name: '夏商周青铜文明拓展包',
      type: 'extension',
      originalFileName: '夏商周拓展素材.pdf',
      carrierType: 'pdf',
      subject,
      nodeId: scoped('rv-1-1-2'),
    }),
    createSeedResource({
      id: `res-${subject}-3`,
      name: '春秋战国单元复习课件',
      type: 'courseware',
      originalFileName: '春秋战国复习课件.pptx',
      carrierType: 'ppt',
      subject,
      nodeId: scoped('rv-1-1-3'),
      status: 'listed',
    }),
    createSeedResource({
      id: `res-${subject}-4`,
      name: '专题·古代政治制度复习学案',
      type: 'studyGuide',
      carrierType: 'online',
      subject,
      nodeId: scoped('rv-2-1'),
    }),
  ];
};

const getResourceStoreKey = (context: KnowledgeContext) =>
  `review-${context.subject}`;

const getRequiredAssetResourceContext = (
  req: Request,
): KnowledgeContext | null => {
  const subject = req.body?.subject ?? req.query.subject;
  if (typeof subject !== 'string' || !subject.trim()) return null;
  return { subject: subject.trim(), targetType: 'review' };
};

const getResourcesByContext = (context: KnowledgeContext) => {
  const storeKey = getResourceStoreKey(context);
  if (!resourceStore[storeKey]) {
    resourceStore[storeKey] = seedResourcesForSubject(context.subject);
  }
  return resourceStore[storeKey];
};

const normalizeOptionalResourceFilter = (value: unknown) => {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  return typeof normalizedValue === 'string' && normalizedValue.trim()
    ? normalizedValue.trim()
    : undefined;
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

const validateResourceListFilters = (
  context: KnowledgeContext,
  query: Request['query'],
):
  | { valid: true; filters: MockResourceListFilters }
  | { valid: false; message: string } => {
  const name = normalizeOptionalResourceFilter(query.name);
  const type = normalizeOptionalResourceFilter(query.type);
  const carrierType = normalizeOptionalResourceFilter(query.carrierType);
  const status = normalizeOptionalResourceFilter(query.status);
  const nodeId = normalizeOptionalResourceFilter(query.nodeId);

  if (type && !isResourceType(type)) {
    return { valid: false, message: '资源类型筛选条件无效' };
  }
  if (carrierType && !isResourceCarrierType(carrierType)) {
    return { valid: false, message: '载体类型筛选条件无效' };
  }
  if (status && !isResourceStatus(status)) {
    return { valid: false, message: '资源状态筛选条件无效' };
  }

  let subtreeNodeIds: Set<string> | undefined;
  if (nodeId) {
    const reviewTree = getKnowledgeTreeByContext(context);
    const selectedNode = findTreeNode(reviewTree, nodeId);
    if (!selectedNode || selectedNode.subject !== context.subject) {
      return { valid: false, message: '复习树节点筛选条件无效' };
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

const validateResourceOwnership = (
  context: KnowledgeContext,
  nodeId: unknown,
) => {
  if (typeof nodeId !== 'string' || !nodeId.trim()) {
    return { valid: false, message: '请选择复习树末级节点' };
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
      message: '请选择当前学科的有效复习树末级节点',
    };
  }
  if (node.children?.length) {
    return { valid: false, message: '资源只能归属复习树末级节点' };
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

const removeResourcesUnderNodes = (
  context: KnowledgeContext,
  nodeIds: Set<string>,
) => {
  const resources = resourceStore[getResourceStoreKey(context)];
  if (!resources) return;
  const next = resources.filter((item) => !nodeIds.has(item.nodeId));
  resources.splice(0, resources.length, ...next);
};

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
      data: { count: countTreeNodes(nextTree) },
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
    const siblingNodes = getTreeSiblingListByParentId(
      knowledgePoints,
      parentId,
    );
    const validation = validateTreeNodeTitle(siblingNodes, title);
    if (!validation.valid) {
      res.send({ success: false, message: validation.message });
      return;
    }

    const contextKey = getKnowledgeStoreKey(context);
    const nodeId = `kp-${contextKey}-${Date.now()}`;
    const newNode: MockKnowledgeNode = {
      id: nodeId,
      key: nodeId,
      title: validation.title,
      value: nodeId,
      subject: context.subject,
      description,
      children: [],
    };

    siblingNodes!.push(newNode);
    res.send({ success: true, message: 'Node created successfully' });
  },
  'PUT /api/tags/knowledge-node': (req: Request, res: Response) => {
    const { id, title, description } = req.body;
    const context = getKnowledgeContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);
    const siblingNodes = findTreeParentList(knowledgePoints, id);
    const validation = validateTreeNodeTitle(siblingNodes, title, id);
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
    const { id } = req.query;
    const context = getKnowledgeContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);
    let deletedNodeKeys = new Set<string>();
    const deleteNode = (nodes: MockKnowledgeNode[]) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node) continue;
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
    const deleted = deleteNode(knowledgePoints);
    if (deleted) {
      removeNodeAttributeRelations(
        (relation) =>
          relation.targetType === context.targetType &&
          relation.subject === context.subject &&
          deletedNodeKeys.has(relation.nodeId),
      );
      if (context.targetType === 'review') {
        removeResourcesUnderNodes(context, deletedNodeKeys);
      }
    }
    res.send({ success: true, message: 'Node deleted successfully' });
  },
  'PUT /api/tags/knowledge-node/move': (req: Request, res: Response) => {
    const { id, targetId, position } = req.body;
    const context = getKnowledgeContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);
    const result = moveTreeNode(
      knowledgePoints,
      String(id),
      String(targetId),
      position as TreeMovePosition,
      'Knowledge node',
    );
    res.send(result);
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
    res.send({
      success: true,
      data: filterResources(
        getResourcesByContext(context),
        filterValidation.filters,
      ),
    });
  },
  'POST /api/resources': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const { name, type, originalFileName, nodeId } = req.body || {};

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
    if (!carrierType || !isAttachmentFileCompatible(type, carrierType)) {
      res.send({
        success: false,
        message:
          type === 'courseware'
            ? '课件仅支持 .ppt 或 .pptx 文件'
            : '拓展包仅支持 .pdf、.mp3 或 .mp4 文件',
      });
      return;
    }

    const resources = getResourcesByContext(context);
    if (
      hasDuplicatedResourceName(resources, {
        name: nameValidation.name,
        type,
        nodeId: ownershipValidation.nodeId,
      })
    ) {
      res.send({
        success: false,
        message: '该末级节点下已存在同类型、同名称的资源',
      });
      return;
    }

    resourceSequence += 1;
    const resourceId = `res-${
      context.subject
    }-${Date.now()}-${resourceSequence}`;
    const versionId = `${resourceId}-v1`;
    const createdAt = new Date().toISOString();
    const item: MockResourceItem = {
      id: resourceId,
      name: nameValidation.name,
      type,
      subject: context.subject,
      nodeId: ownershipValidation.nodeId,
      status: 'unlisted',
      currentVersionId: versionId,
      currentVersion: {
        id: versionId,
        resourceId,
        versionNumber: 1,
        carrierType,
        originalFileName: normalizedOriginalFileName,
        createdAt,
      },
      updatedAt: createdAt,
    };

    // 单次写入完整聚合，Mock 中不存在未归属或无初始版本的中间记录。
    resources.push(item);
    res.send({
      success: true,
      message: '附件资源上传成功',
      data: item,
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
    if (
      body.nodeId !== undefined ||
      body.name !== undefined ||
      body.type !== undefined ||
      body.status !== undefined ||
      body.currentVersion !== undefined
    ) {
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

    // 所有校验通过后一次替换 nodeId；不存在先清空再写入的中间状态。
    item.nodeId = ownershipValidation.nodeId;
    item.updatedAt = new Date().toISOString();
    res.send({ success: true, message: '资源归属调整成功', data: item });
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
      body.currentVersion !== undefined
    ) {
      res.send({ success: false, message: '当前版本不能通过资料编辑修改' });
      return;
    }
    if (body.status !== undefined) {
      res.send({ success: false, message: '资源状态不能通过资料编辑修改' });
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

    item.name = nameValidation.name;
    item.updatedAt = new Date().toISOString();
    res.send({ success: true, message: '资源信息更新成功', data: item });
  },
  'DELETE /api/resources': (req: Request, res: Response) => {
    const context = getRequiredAssetResourceContext(req);
    if (!context) {
      res.send({ success: false, message: '请选择学科上下文' });
      return;
    }
    const { id } = req.query;
    const resources = getResourcesByContext(context);
    const next = resources.filter((item) => item.id !== id);
    resources.splice(0, resources.length, ...next);
    res.send({ success: true, message: '资源删除成功' });
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
