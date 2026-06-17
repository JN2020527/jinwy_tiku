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
  subjectTags?: Partial<Record<string, MockAttributeItem[]>>;
  status?: AttributeStatus;
  sort?: number;
  selectionMode?: AttributeSelectionMode;
}

interface KnowledgeContext {
  subject: string;
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

const MAX_QUESTION_TYPE_LEVEL = 2;
const MIN_QUESTION_TYPE_ANSWER_ROWS = 1;
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
    id: 'cat-question-type',
    name: '题型',
    code: 'question_type',
    description: '用于描述试题呈现与作答类型',
    target: 'question',
    status: 'enabled',
    sort: 1,
    selectionMode: 'single',
    tags: createSeedOptions('question-type', [
      { name: '单选题', value: 'single_choice' },
      { name: '多选题', value: 'multiple_choice' },
      { name: '填空题', value: 'fill_blank' },
      { name: '解答题', value: 'answer' },
    ]),
  },
  {
    id: 'cat-question-ability',
    name: '能力',
    code: 'ability',
    description: '用于标记试题主要考查的学科能力',
    target: 'question',
    optionAddMode: 'bySubject',
    status: 'enabled',
    sort: 2,
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
    status: 'enabled',
    sort: 3,
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
    status: 'enabled',
    sort: 4,
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
    sort: 5,
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
    description: '用于标记题型或专题的考查频率',
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
};

const DEFAULT_SUBJECT = 'math';

const normalizeQueryValue = (value: unknown, fallback: string) => {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0], fallback);
  }
  return typeof value === 'string' && value ? value : fallback;
};

const getKnowledgeContext = (req: Request): KnowledgeContext => ({
  subject: normalizeQueryValue(
    req.body?.subject ?? req.query.subject,
    DEFAULT_KNOWLEDGE_CONTEXT.subject,
  ),
});

const getQuestionTypeContext = (req: Request): QuestionTypeContext => ({
  subject: normalizeQueryValue(
    req.body?.subject ?? req.query.subject,
    DEFAULT_SUBJECT,
  ),
});

const getKnowledgeContextKey = ({ subject }: KnowledgeContext) => subject;

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

const normalizeQuestionTypeTreeSettings = (
  nodes: MockQuestionTypeNode[],
  level = 1,
) => {
  nodes.forEach((node) => {
    if (level === 1) {
      node.answerCardType = normalizeQuestionTypeAnswerCardType(
        node.answerCardType,
        node.title,
        node.key,
      );
      node.answerArea = normalizeQuestionTypeAnswerArea(node.answerArea);
    } else {
      delete node.answerCardType;
      delete node.answerArea;
    }
    if (node.children?.length) {
      normalizeQuestionTypeTreeSettings(node.children, level + 1);
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
  const contextKey = getKnowledgeContextKey(context);
  if (!knowledgeTreeStore[contextKey]) {
    knowledgeTreeStore[contextKey] = applyKnowledgeScope(
      defaultKnowledgePointTemplates,
      context,
    );
  }
  return knowledgeTreeStore[contextKey];
};

const applyQuestionTypeScope = (
  nodes: QuestionTypeSeedNode[],
  context: QuestionTypeContext,
  level = 1,
): MockQuestionTypeNode[] =>
  nodes.map((node) => {
    const key = `${context.subject}-${node.key}`;
    const scopedNode: MockQuestionTypeNode = {
      title: node.title,
      key,
      subject: context.subject,
      description: node.description,
      children: node.children
        ? applyQuestionTypeScope(node.children, context, level + 1)
        : undefined,
    };

    if (level === 1) {
      scopedNode.answerCardType = normalizeQuestionTypeAnswerCardType(
        node.answerCardType,
        node.title,
        key,
      );
      scopedNode.answerArea = normalizeQuestionTypeAnswerArea(node.answerArea);
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
): MockAttributeItem => ({
  ...tag,
  id: tag.id || `tag-${ownerKey}-${Date.now()}-${index}`,
  name: tag.name || '未命名选项',
  color: tag.color || 'default',
});

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

const isAttributeUsageScene = (
  scene: unknown,
): scene is AttributeUsageScene =>
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

export default {
  'GET /api/tags/knowledge-tree': (req: Request, res: Response) => {
    const context = getKnowledgeContext(req);
    res.send({
      success: true,
      data: getKnowledgeTreeByContext(context),
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
    }
    res.send({
      success: deleted,
      message: deleted
        ? 'Category deleted successfully'
        : 'Category not found',
    });
  },

  'POST /api/tags/knowledge-node': (req: Request, res: Response) => {
    const { parentId, title, description } = req.body;
    const context = getKnowledgeContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);
    const contextKey = getKnowledgeContextKey(context);
    const nodeId = `kp-${contextKey}-${Date.now()}`;
    const newNode: MockKnowledgeNode = {
      id: nodeId,
      key: nodeId,
      title,
      value: nodeId,
      subject: context.subject,
      description,
      children: [],
    };

    if (parentId) {
      const addNode = (nodes: MockKnowledgeNode[]) => {
        for (const node of nodes) {
          if (node.key === parentId) {
            if (!node.children) node.children = [];
            node.children.push(newNode);
            return true;
          }
          if (node.children && node.children.length > 0) {
            if (addNode(node.children)) return true;
          }
        }
        return false;
      };
      addNode(knowledgePoints);
    } else {
      knowledgePoints.push(newNode);
    }
    res.send({ success: true, message: 'Node created successfully' });
  },
  'PUT /api/tags/knowledge-node': (req: Request, res: Response) => {
    const { id, title, description } = req.body;
    const context = getKnowledgeContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);
    const updateNode = (nodes: MockKnowledgeNode[]) => {
      for (const node of nodes) {
        if (node.key === id) {
          node.title = title;
          node.description = description;
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (updateNode(node.children)) return true;
        }
      }
      return false;
    };
    updateNode(knowledgePoints);
    res.send({ success: true, message: 'Node updated successfully' });
  },
  'DELETE /api/tags/knowledge-node': (req: Request, res: Response) => {
    const { id } = req.query;
    const context = getKnowledgeContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);
    const deleteNode = (nodes: MockKnowledgeNode[]) => {
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
    deleteNode(knowledgePoints);
    res.send({ success: true, message: 'Node deleted successfully' });
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
      parentNode.children.push(newNode);
      added = true;
    } else {
      newNode.answerCardType = normalizeQuestionTypeAnswerCardType(
        answerCardType,
        title,
        nodeId,
      );
      newNode.answerArea = normalizeQuestionTypeAnswerArea(answerArea);
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
    const updateNode = (nodes: MockQuestionTypeNode[]) => {
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
            node.answerArea = normalizeQuestionTypeAnswerArea(
              answerArea || node.answerArea,
            );
          } else {
            delete node.answerCardType;
            delete node.answerArea;
          }
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (updateNode(node.children)) return true;
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

  // Textbook API
  'GET /api/tags/textbook-versions': (req: Request, res: Response) => {
    res.send({ success: true, data: textbookVersions });
  },
  'GET /api/tags/textbook-chapters': (req: Request, res: Response) => {
    const { version } = req.query;
    const data = textbookChapters[version as string] || [];
    res.send({ success: true, data });
  },
  // Textbook Chapter CRUD
  'POST /api/tags/textbook-chapter': (req: Request, res: Response) => {
    const { version, parentId, title, description } = req.body;
    const chapters = textbookChapters[version];
    const newNode = {
      title,
      key: `ch-${Date.now()}`,
      children: [],
    };

    if (parentId) {
      const addNode = (nodes: any[]) => {
        for (const node of nodes) {
          if (node.key === parentId) {
            if (!node.children) node.children = [];
            node.children.push(newNode);
            return true;
          }
          if (node.children && node.children.length > 0) {
            if (addNode(node.children)) return true;
          }
        }
        return false;
      };
      if (chapters) addNode(chapters);
    } else {
      if (chapters) chapters.push(newNode);
    }
    res.send({ success: true, message: 'Chapter created successfully' });
  },
  'PUT /api/tags/textbook-chapter': (req: Request, res: Response) => {
    const { version, id, title, description } = req.body;
    const chapters = textbookChapters[version];
    const updateNode = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.key === id) {
          node.title = title;
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (updateNode(node.children)) return true;
        }
      }
      return false;
    };
    if (chapters) updateNode(chapters);
    res.send({ success: true, message: 'Chapter updated successfully' });
  },
  'DELETE /api/tags/textbook-chapter': (req: Request, res: Response) => {
    const { id } = req.query; // Note: In real app, we might need version here too if IDs aren't globally unique
    // For mock, we'll search all versions or assume version is passed.
    // Let's iterate all versions for simplicity in mock
    Object.values(textbookChapters).forEach((chapters: any) => {
      const deleteNode = (nodes: any[]) => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].key === id) {
            nodes.splice(i, 1);
            return true;
          }
          if (nodes[i].children && nodes[i].children.length > 0) {
            if (deleteNode(nodes[i].children)) return true;
          }
        }
        return false;
      };
      deleteNode(chapters);
    });
    res.send({ success: true, message: 'Chapter deleted successfully' });
  },
};
