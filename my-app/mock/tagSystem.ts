import { Request, Response } from 'express';

interface MockAttributeItem {
  id: string;
  name: string;
  color: string;
  value?: string;
  sort?: number;
  status?: AttributeStatus;
  displayName?: string;
  frontVisible?: boolean;
  star?: number;
}

type AttributeStatus = 'enabled' | 'disabled';
type AttributeTarget = 'question' | 'paper' | 'common';
type AttributeValueType = 'text' | 'number' | 'single' | 'multiple' | 'tree';
type AttributeControlType =
  | 'input'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'rate'
  | 'treeSelect';
type AttributeScene = 'contentCompletion' | 'tagging' | 'frontDisplay';
type AttributeSelectionMode = 'single' | 'multiple';

interface AttributeSceneRule {
  scene: AttributeScene;
  enabled: boolean;
  required?: boolean;
}

interface AttributeDisplayRule {
  visible: boolean;
  filterable?: boolean;
  displayName?: string;
}

interface MockTagCategory {
  id: string;
  name: string;
  tags: MockAttributeItem[];
  code?: string;
  description?: string;
  target?: AttributeTarget;
  valueType?: AttributeValueType;
  controlType?: AttributeControlType;
  required?: boolean;
  selectionMode?: AttributeSelectionMode;
  status?: AttributeStatus;
  sceneRules?: AttributeSceneRule[];
  displayRule?: AttributeDisplayRule;
}

interface TagContext {
  grade: string;
  subject: string;
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
  grade: string;
  subject: string;
  description?: string;
  children?: MockKnowledgeNode[];
}

interface QuestionTypeSeedNode {
  title: string;
  key: string;
  description?: string;
  children?: QuestionTypeSeedNode[];
}

interface MockQuestionTypeNode {
  title: string;
  key: string;
  grade: string;
  subject: string;
  description?: string;
  children?: MockQuestionTypeNode[];
}

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

// Mock Data for Tag Categories (Dynamic List) [Refactored]
const defaultTagCategoryTemplates: MockTagCategory[] = [
  {
    id: 'cat-1',
    name: '难度',
    code: 'difficulty',
    description: '用于描述试题解答难易程度',
    target: 'question',
    valueType: 'single',
    controlType: 'rate',
    selectionMode: 'single',
    required: true,
    status: 'enabled',
    sceneRules: [
      { scene: 'contentCompletion', enabled: true, required: true },
      { scene: 'tagging', enabled: true, required: true },
      { scene: 'frontDisplay', enabled: true },
    ],
    displayRule: {
      visible: true,
      filterable: true,
      displayName: '难度',
    },
    tags: [
      {
        id: 'diff-1',
        name: '容易',
        value: 'easy',
        star: 1,
        color: 'green',
        sort: 0,
        status: 'enabled',
        displayName: '容易',
        frontVisible: true,
      },
      {
        id: 'diff-2',
        name: '较易',
        value: 'relatively_easy',
        star: 2,
        color: 'cyan',
        sort: 1,
        status: 'enabled',
        displayName: '较易',
        frontVisible: true,
      },
      {
        id: 'diff-3',
        name: '中等',
        value: 'medium',
        star: 3,
        color: 'blue',
        sort: 2,
        status: 'enabled',
        displayName: '中等',
        frontVisible: true,
      },
      {
        id: 'diff-4',
        name: '较难',
        value: 'relatively_hard',
        star: 4,
        color: 'orange',
        sort: 3,
        status: 'enabled',
        displayName: '较难',
        frontVisible: true,
      },
      {
        id: 'diff-5',
        name: '困难',
        value: 'hard',
        star: 5,
        color: 'red',
        sort: 4,
        status: 'enabled',
        displayName: '困难',
        frontVisible: true,
      },
    ],
  },
  {
    id: 'cat-2',
    name: '考查能力',
    code: 'competency',
    description: '用于标记试题主要考查的学科能力',
    target: 'question',
    valueType: 'multiple',
    controlType: 'checkbox',
    selectionMode: 'multiple',
    required: false,
    status: 'enabled',
    sceneRules: [
      { scene: 'contentCompletion', enabled: true },
      { scene: 'tagging', enabled: true },
      { scene: 'frontDisplay', enabled: true },
    ],
    displayRule: {
      visible: true,
      filterable: true,
      displayName: '考查能力',
    },
    tags: [
      {
        id: 'comp-1',
        name: '运算能力',
        value: 'operation',
        color: 'purple',
        sort: 0,
        status: 'enabled',
        displayName: '运算能力',
        frontVisible: true,
      },
      {
        id: 'comp-2',
        name: '逻辑推理',
        value: 'logical_reasoning',
        color: 'geekblue',
        sort: 1,
        status: 'enabled',
        displayName: '逻辑推理',
        frontVisible: true,
      },
      {
        id: 'comp-3',
        name: '空间观念',
        value: 'spatial_concept',
        color: 'magenta',
        sort: 2,
        status: 'enabled',
        displayName: '空间观念',
        frontVisible: true,
      },
      {
        id: 'comp-4',
        name: '数据分析',
        value: 'data_analysis',
        color: 'gold',
        sort: 3,
        status: 'enabled',
        displayName: '数据分析',
        frontVisible: true,
      },
    ],
  },
  {
    id: 'cat-3',
    name: '题源类型',
    code: 'source_type',
    description: '用于描述试题来源类型',
    target: 'question',
    valueType: 'single',
    controlType: 'select',
    selectionMode: 'single',
    required: false,
    status: 'enabled',
    sceneRules: [
      { scene: 'contentCompletion', enabled: true },
      { scene: 'tagging', enabled: true },
      { scene: 'frontDisplay', enabled: true },
    ],
    displayRule: {
      visible: true,
      filterable: true,
      displayName: '题源',
    },
    tags: [
      {
        id: 'src-1',
        name: '中考真题',
        value: 'entrance_exam',
        color: 'default',
        sort: 0,
        status: 'enabled',
        displayName: '中考真题',
        frontVisible: true,
      },
      {
        id: 'src-2',
        name: '一模/二模',
        value: 'mock_exam',
        color: 'default',
        sort: 1,
        status: 'enabled',
        displayName: '一模/二模',
        frontVisible: true,
      },
      {
        id: 'src-3',
        name: '期中/期末',
        value: 'term_exam',
        color: 'default',
        sort: 2,
        status: 'enabled',
        displayName: '期中/期末',
        frontVisible: true,
      },
      {
        id: 'src-4',
        name: '名校试题',
        value: 'school_exam',
        color: 'default',
        sort: 3,
        status: 'enabled',
        displayName: '名校试题',
        frontVisible: true,
      },
    ],
  },
  {
    id: 'cat-4',
    name: '地区',
    code: 'region',
    description: '用于描述试题或试卷适用地区',
    target: 'common',
    valueType: 'single',
    controlType: 'select',
    selectionMode: 'single',
    required: false,
    status: 'enabled',
    sceneRules: [
      { scene: 'contentCompletion', enabled: true },
      { scene: 'tagging', enabled: true },
      { scene: 'frontDisplay', enabled: true },
    ],
    displayRule: {
      visible: true,
      filterable: true,
      displayName: '地区',
    },
    tags: [
      {
        id: 'prov-1',
        name: '北京',
        value: 'beijing',
        color: 'default',
        sort: 0,
        status: 'enabled',
        displayName: '北京',
        frontVisible: true,
      },
      {
        id: 'prov-2',
        name: '上海',
        value: 'shanghai',
        color: 'default',
        sort: 1,
        status: 'enabled',
        displayName: '上海',
        frontVisible: true,
      },
      {
        id: 'prov-3',
        name: '江苏',
        value: 'jiangsu',
        color: 'default',
        sort: 2,
        status: 'enabled',
        displayName: '江苏',
        frontVisible: true,
      },
      {
        id: 'prov-4',
        name: '浙江',
        value: 'zhejiang',
        color: 'default',
        sort: 3,
        status: 'enabled',
        displayName: '浙江',
        frontVisible: true,
      },
    ],
  },
  {
    id: 'cat-7',
    name: '试题场景',
    code: 'question_scene',
    description: '用于描述试题推荐使用场景',
    target: 'question',
    valueType: 'multiple',
    controlType: 'checkbox',
    selectionMode: 'multiple',
    required: false,
    status: 'enabled',
    sceneRules: [
      { scene: 'contentCompletion', enabled: false },
      { scene: 'tagging', enabled: true },
      { scene: 'frontDisplay', enabled: true },
    ],
    displayRule: {
      visible: true,
      filterable: true,
      displayName: '适用场景',
    },
    tags: [
      {
        id: 'scene-1',
        name: '预习',
        value: 'preview',
        color: 'default',
        sort: 0,
        status: 'enabled',
        displayName: '预习',
        frontVisible: true,
      },
      {
        id: 'scene-2',
        name: '作业',
        value: 'homework',
        color: 'default',
        sort: 1,
        status: 'enabled',
        displayName: '作业',
        frontVisible: true,
      },
      {
        id: 'scene-3',
        name: '单元测',
        value: 'unit_test',
        color: 'default',
        sort: 2,
        status: 'enabled',
        displayName: '单元测',
        frontVisible: true,
      },
      {
        id: 'scene-4',
        name: '月考',
        value: 'monthly_exam',
        color: 'default',
        sort: 3,
        status: 'enabled',
        displayName: '月考',
        frontVisible: true,
      },
      {
        id: 'scene-5',
        name: '期中',
        value: 'midterm_exam',
        color: 'default',
        sort: 4,
        status: 'enabled',
        displayName: '期中',
        frontVisible: true,
      },
      {
        id: 'scene-6',
        name: '期末',
        value: 'final_exam',
        color: 'default',
        sort: 5,
        status: 'enabled',
        displayName: '期末',
        frontVisible: true,
      },
      {
        id: 'scene-7',
        name: '开学考',
        value: 'placement_exam',
        color: 'default',
        sort: 6,
        status: 'enabled',
        displayName: '开学考',
        frontVisible: true,
      },
      {
        id: 'scene-8',
        name: '模拟',
        value: 'mock',
        color: 'default',
        sort: 7,
        status: 'enabled',
        displayName: '模拟',
        frontVisible: true,
      },
      {
        id: 'scene-9',
        name: '真题',
        value: 'real_exam',
        color: 'default',
        sort: 8,
        status: 'enabled',
        displayName: '真题',
        frontVisible: true,
      },
      {
        id: 'scene-10',
        name: '学业考',
        value: 'academic_exam',
        color: 'default',
        sort: 9,
        status: 'enabled',
        displayName: '学业考',
        frontVisible: true,
      },
      {
        id: 'scene-11',
        name: '假期',
        value: 'holiday',
        color: 'default',
        sort: 10,
        status: 'enabled',
        displayName: '假期',
        frontVisible: true,
      },
    ],
  },
];

const DEFAULT_TAG_CONTEXT: TagContext = {
  grade: 'grade-7',
  subject: 'math',
};

const normalizeQueryValue = (value: unknown, fallback: string) => {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0], fallback);
  }
  return typeof value === 'string' && value ? value : fallback;
};

const getTagContext = (req: Request): TagContext => ({
  grade: normalizeQueryValue(
    req.body?.grade ?? req.query.grade,
    DEFAULT_TAG_CONTEXT.grade,
  ),
  subject: normalizeQueryValue(
    req.body?.subject ?? req.query.subject,
    DEFAULT_TAG_CONTEXT.subject,
  ),
});

const getTagContextKey = ({ grade, subject }: TagContext) =>
  `${grade}__${subject}`;

const applyKnowledgeScope = (
  nodes: KnowledgeSeedNode[],
  context: TagContext,
): MockKnowledgeNode[] => {
  const contextKey = getTagContextKey(context);
  return nodes.map((node) => ({
    id: node.id ? `${node.id}-${contextKey}` : undefined,
    title: node.title,
    key: `${node.key}-${contextKey}`,
    value: node.value ? `${node.value}-${contextKey}` : undefined,
    grade: context.grade,
    subject: context.subject,
    description: node.description,
    children: node.children
      ? applyKnowledgeScope(node.children, context)
      : undefined,
  }));
};

const knowledgeTreeStore: Record<string, MockKnowledgeNode[]> = {};

const getKnowledgeTreeByContext = (context: TagContext) => {
  const contextKey = getTagContextKey(context);
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
  context: TagContext,
): MockQuestionTypeNode[] =>
  nodes.map((node) => ({
    title: node.title,
    key: `${context.grade}-${context.subject}-${node.key}`,
    grade: context.grade,
    subject: context.subject,
    description: node.description,
    children: node.children
      ? applyQuestionTypeScope(node.children, context)
      : undefined,
  }));

const createQuestionTypeNodeKey = (context: TagContext) => {
  const contextKey = getTagContextKey(context);
  return `qt-${contextKey}-${Date.now()}`;
};

const questionTypeTreeStore: Record<string, MockQuestionTypeNode[]> = {};

const getQuestionTypeTreeByContext = (context: TagContext) => {
  const contextKey = getTagContextKey(context);
  if (!questionTypeTreeStore[contextKey]) {
    questionTypeTreeStore[contextKey] = applyQuestionTypeScope(
      getQuestionTypeSeed(context.subject),
      context,
    );
  }
  return questionTypeTreeStore[contextKey];
};

const normalizeTagOrder = (category: MockTagCategory) => {
  category.tags = category.tags.map((tag, index) => ({
    ...tag,
    sort: index,
  }));
  return category;
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
  contextKey: string,
  index: number,
): MockAttributeItem => ({
  ...tag,
  id: tag.id || `tag-${contextKey}-${Date.now()}-${index}`,
  name: tag.name || '未命名属性',
  color: tag.color || 'default',
});

const createMockAttributeItems = (tags: unknown, contextKey: string) =>
  Array.isArray(tags)
    ? tags.map((tag, index) =>
        createMockAttributeItem(
          (tag || {}) as Partial<MockAttributeItem>,
          contextKey,
          index,
        ),
      )
    : [];

const createMergedMockAttributeItems = (
  tags: unknown,
  existingTags: MockAttributeItem[],
  contextKey: string,
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
          contextKey,
          index,
        );
      })
    : [];

const cloneTagCategories = (
  source: MockTagCategory[],
  contextKey: string,
): MockTagCategory[] =>
  source.map((category) =>
    normalizeTagOrder({
      ...category,
      id: `${category.id}-${contextKey}`,
      tags: category.tags.map((tag) => ({
        ...tag,
        id: `${tag.id}-${contextKey}`,
      })),
    }),
  );

const tagCategoryStore: Record<string, MockTagCategory[]> = {
  [getTagContextKey(DEFAULT_TAG_CONTEXT)]: cloneTagCategories(
    defaultTagCategoryTemplates,
    getTagContextKey(DEFAULT_TAG_CONTEXT),
  ),
};

const getTagCategoriesByContext = (context: TagContext) => {
  const contextKey = getTagContextKey(context);
  if (!tagCategoryStore[contextKey]) {
    tagCategoryStore[contextKey] = cloneTagCategories(
      defaultTagCategoryTemplates,
      contextKey,
    );
  }
  tagCategoryStore[contextKey].forEach(normalizeTagOrder);
  return tagCategoryStore[contextKey];
};

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
    const context = getTagContext(req);
    res.send({
      success: true,
      data: getKnowledgeTreeByContext(context),
    });
  },
  // Replaced /api/tags/attributes with /api/tags/categories
  'GET /api/tags/categories': (req: Request, res: Response) => {
    const context = getTagContext(req);
    res.send({
      success: true,
      data: getTagCategoriesByContext(context),
    });
  },
  // Category CRUD
  'POST /api/tags/category': (req: Request, res: Response) => {
    const context = getTagContext(req);
    const contextKey = getTagContextKey(context);
    const tagCategories = getTagCategoriesByContext(context);
    const categoryPayload = { ...req.body };
    const tags = categoryPayload.tags;
    delete categoryPayload.grade;
    delete categoryPayload.subject;
    delete categoryPayload.tags;

    const newCat = normalizeTagOrder({
      ...(categoryPayload as Partial<MockTagCategory>),
      id: categoryPayload.id || `cat-${contextKey}-${Date.now()}`,
      name: categoryPayload.name || '未命名属性',
      tags: createMockAttributeItems(tags, contextKey),
    });
    tagCategories.push(newCat);
    res.send({
      success: true,
      message: 'Category created successfully',
      data: newCat,
    });
  },
  'PUT /api/tags/category': (req: Request, res: Response) => {
    const { id } = req.body;
    const context = getTagContext(req);
    const contextKey = getTagContextKey(context);
    const tagCategories = getTagCategoriesByContext(context);
    const category = tagCategories.find((c) => c.id === id);
    if (category) {
      const categoryPayload = { ...req.body };
      const tags = categoryPayload.tags;
      delete categoryPayload.id;
      delete categoryPayload.grade;
      delete categoryPayload.subject;
      delete categoryPayload.tags;

      mergeDefined(category, categoryPayload as Partial<MockTagCategory>);
      if (tags !== undefined) {
        category.tags = createMergedMockAttributeItems(
          tags,
          category.tags,
          contextKey,
        );
      }
      normalizeTagOrder(category);
    }
    res.send({
      success: !!category,
      message: category
        ? 'Category updated successfully'
        : 'Category not found',
      data: category,
    });
  },
  'DELETE /api/tags/category': (req: Request, res: Response) => {
    const { id } = req.query;
    const context = getTagContext(req);
    const contextKey = getTagContextKey(context);
    tagCategoryStore[contextKey] = getTagCategoriesByContext(context).filter(
      (c) => c.id !== id,
    );
    res.send({ success: true, message: 'Category deleted successfully' });
  },

  'POST /api/tags/knowledge-node': (req: Request, res: Response) => {
    const { parentId, title, description } = req.body;
    const context = getTagContext(req);
    const knowledgePoints = getKnowledgeTreeByContext(context);
    const contextKey = getTagContextKey(context);
    const nodeId = `kp-${contextKey}-${Date.now()}`;
    const newNode: MockKnowledgeNode = {
      id: nodeId,
      key: nodeId,
      title,
      value: nodeId,
      grade: context.grade,
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
    const context = getTagContext(req);
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
    const context = getTagContext(req);
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
    const context = getTagContext(req);
    res.send({
      success: true,
      data: getQuestionTypeTreeByContext(context),
    });
  },
  'POST /api/tags/question-type-node': (req: Request, res: Response) => {
    const { parentId, title, description } = req.body;
    const context = getTagContext(req);
    const questionTypeTree = getQuestionTypeTreeByContext(context);
    const nodeId = createQuestionTypeNodeKey(context);
    const newNode: MockQuestionTypeNode = {
      title,
      key: nodeId,
      grade: context.grade,
      subject: context.subject,
      description,
      children: [],
    };

    let added = false;
    if (parentId) {
      const addNode = (nodes: MockQuestionTypeNode[]) => {
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
      added = addNode(questionTypeTree);
    } else {
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
    const { id, title, description } = req.body;
    const context = getTagContext(req);
    const scopedTree = getQuestionTypeTreeByContext(context);
    const updateNode = (nodes: MockQuestionTypeNode[]) => {
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
    const context = getTagContext(req);
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

  // Attribute CRUD (Updated to use categoryId)
  'POST /api/tags/attribute': (req: Request, res: Response) => {
    const { categoryId } = req.body;
    const context = getTagContext(req);
    const contextKey = getTagContextKey(context);
    const tagCategories = getTagCategoriesByContext(context);
    const category = tagCategories.find((c) => c.id === categoryId);
    let newTag: MockAttributeItem | undefined;
    if (category) {
      const tagPayload = { ...req.body };
      delete tagPayload.categoryId;
      delete tagPayload.grade;
      delete tagPayload.subject;

      newTag = createMockAttributeItem(
        tagPayload as Partial<MockAttributeItem>,
        contextKey,
        category.tags.length,
      );
      category.tags.push(newTag);
      normalizeTagOrder(category);
    }
    res.send({
      success: !!newTag,
      message: newTag
        ? 'Attribute created successfully'
        : 'Category not found',
      data: newTag,
    });
  },
  'PUT /api/tags/attribute': (req: Request, res: Response) => {
    const { id, categoryId } = req.body;
    const context = getTagContext(req);
    const tagCategories = getTagCategoriesByContext(context);
    const category = tagCategories.find((c) => c.id === categoryId);
    let updatedTag: MockAttributeItem | undefined;
    if (category) {
      const tag = category.tags.find((t: any) => t.id === id);
      if (tag) {
        const tagPayload = { ...req.body };
        delete tagPayload.id;
        delete tagPayload.categoryId;
        delete tagPayload.grade;
        delete tagPayload.subject;

        mergeDefined(tag, tagPayload as Partial<MockAttributeItem>);
        normalizeTagOrder(category);
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
    const { id, categoryId } = req.query;
    const context = getTagContext(req);
    const tagCategories = getTagCategoriesByContext(context);
    const category = tagCategories.find((c) => c.id === categoryId);
    if (category) {
      category.tags = category.tags.filter((t: any) => t.id !== id);
      normalizeTagOrder(category);
    }
    res.send({ success: true, message: 'Attribute deleted successfully' });
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
